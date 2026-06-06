<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancialValueService
{
    private const UNALLOCATED_KEY = '__unallocated__';

    public function __construct(private FinancialAmountService $amounts) {}

    public function calculateLiveFinancialValuesForUser(User $user): array
    {
        return $this->totals(
            $this->liveSubscriptionYears($user),
            $this->liveSubscriptionAllocations($user),
            $this->liveIaps($user),
        );
    }

    public function calculateLiveFinancialValuesByPlatform(User $user): array
    {
        return $this->platformValues(
            $this->liveSubscriptionYears($user),
            $this->liveSubscriptionAllocations($user),
            $this->liveIaps($user),
        );
    }

    public function calculateLiveFinancialValuesByOwnershipType(User $user): array
    {
        return $this->ownershipTypeValues(
            $this->liveSubscriptionYears($user),
            $this->liveSubscriptionAllocations($user),
        );
    }

    public function calculateLiveFinancialValuesByLibraryGame(User $user): array
    {
        return $this->gameValues(
            $this->liveSubscriptionAllocations($user),
            $this->liveIaps($user),
        );
    }

    public function calculateSnapshotFinancialValuesForRun(SnapshotRun $snapshot): array
    {
        return $this->totals(
            $this->snapshotSubscriptionYears($snapshot),
            $this->snapshotSubscriptionAllocations($snapshot),
            $this->snapshotIaps($snapshot),
        );
    }

    public function calculateSnapshotFinancialValuesByPlatform(SnapshotRun $snapshot): array
    {
        return $this->platformValues(
            $this->snapshotSubscriptionYears($snapshot),
            $this->snapshotSubscriptionAllocations($snapshot),
            $this->snapshotIaps($snapshot),
        );
    }

    public function calculateSnapshotFinancialValuesByLibraryGame(SnapshotRun $snapshot): array
    {
        return $this->gameValues(
            $this->snapshotSubscriptionAllocations($snapshot),
            $this->snapshotIaps($snapshot),
        );
    }

    public function calculateSnapshotFinancialValuesByOwnershipType(SnapshotRun $snapshot): array
    {
        return $this->ownershipTypeValues(
            $this->snapshotSubscriptionYears($snapshot),
            $this->snapshotSubscriptionAllocations($snapshot),
        );
    }

    public function calculateGamePaidBreakdown(LibraryGame $libraryGame): array
    {
        $libraryGame->loadMissing(['ownershipCopies.ownershipType', 'ownedDlcs.dlc', 'inAppPurchases']);
        $copyPaid = (float) $libraryGame->ownershipCopies
            ->filter(fn ($copy) => in_array($copy->ownershipType?->name, ['Digital', 'Physical'], true))
            ->sum('purchased_price');
        $dlcPaid = (float) $libraryGame->ownedDlcs
            ->filter(fn ($ownedDlc) => $ownedDlc->acquisition_type === 'Owned')
            ->sum('purchased_price');
        $subscriptionAllocations = $this->gameSubscriptionAllocations($libraryGame);
        $subscriptionPaid = collect($subscriptionAllocations)->sum('allocated_amount');
        $iapPaid = (float) $libraryGame->inAppPurchases->sum('amount_paid');

        return [
            ...$this->roundValues([
                'copy_purchased_value' => $copyPaid,
                'dlc_purchased_value' => $dlcPaid,
                'subscription_allocated_value' => $subscriptionPaid,
                'subscription_unallocated_value' => 0,
                'subscription_total_value' => $subscriptionPaid,
                'in_app_purchase_allocated_value' => $iapPaid,
                'in_app_purchase_unallocated_value' => 0,
                'in_app_purchase_total_value' => $iapPaid,
                'in_app_purchase_value' => $iapPaid,
                'total_purchased_value' => $copyPaid + $dlcPaid + $subscriptionPaid + $iapPaid,
            ]),
            'subscription_allocations' => $subscriptionAllocations,
            'in_app_purchases' => $libraryGame->inAppPurchases
                ->sortByDesc('purchased_at')
                ->map(fn ($purchase) => [
                    'id' => $purchase->id,
                    'title' => $purchase->title,
                    'amount_paid' => $purchase->amount_paid,
                    'purchased_at' => $purchase->purchased_at?->format('Y-m-d'),
                    'is_locked' => $purchase->is_locked,
                    'locked_by_snapshot_run_id' => $purchase->locked_by_snapshot_run_id,
                ])
                ->values()
                ->all(),
        ];
    }

    public function unallocatedPlatformKey(): string
    {
        return self::UNALLOCATED_KEY;
    }

    private function totals(Collection $subscriptionYears, Collection $subscriptionAllocations, Collection $iaps): array
    {
        $subscriptionTotal = $this->sumMillionths($subscriptionYears, 'amount_allocated');
        $subscriptionAllocated = $this->sumMillionths($subscriptionAllocations, 'allocated_amount');
        $iapTotal = $this->sumMillionths($iaps, 'amount_paid');
        $iapAllocated = $this->sumMillionths($iaps->whereNotNull('platform_id'), 'amount_paid');

        return $this->financialComponents(
            $subscriptionAllocated,
            $subscriptionTotal,
            $iapAllocated,
            $iapTotal,
        );
    }

    private function platformValues(Collection $subscriptionYears, Collection $subscriptionAllocations, Collection $iaps): array
    {
        $values = [];

        foreach ($subscriptionAllocations as $allocation) {
            $key = (int) $allocation->platform_id;
            $values[$key] ??= $this->emptyMillionthComponents();
            $values[$key]['subscription_allocated_value'] += $this->amounts->toMillionths($allocation->allocated_amount);
            $values[$key]['subscription_total_value'] += $this->amounts->toMillionths($allocation->allocated_amount);
        }

        foreach ($iaps->whereNotNull('platform_id') as $iap) {
            $key = (int) $iap->platform_id;
            $values[$key] ??= $this->emptyMillionthComponents();
            $amount = $this->amounts->toMillionths($iap->amount_paid);
            $values[$key]['in_app_purchase_allocated_value'] += $amount;
            $values[$key]['in_app_purchase_total_value'] += $amount;
        }

        $totals = $this->totals($subscriptionYears, $subscriptionAllocations, $iaps);
        $unallocatedSubscription = $this->amounts->toMillionths($totals['subscription_unallocated_value']);
        $unallocatedIap = $this->amounts->toMillionths($totals['in_app_purchase_unallocated_value']);

        if ($unallocatedSubscription > 0 || $unallocatedIap > 0) {
            $values[self::UNALLOCATED_KEY] = [
                'subscription_allocated_value' => 0,
                'subscription_unallocated_value' => $unallocatedSubscription,
                'subscription_total_value' => $unallocatedSubscription,
                'in_app_purchase_allocated_value' => 0,
                'in_app_purchase_unallocated_value' => $unallocatedIap,
                'in_app_purchase_total_value' => $unallocatedIap,
            ];
        }

        return $this->convertComponentMap($values);
    }

    private function ownershipTypeValues(Collection $subscriptionYears, Collection $subscriptionAllocations): array
    {
        $values = [];

        foreach ($subscriptionYears->groupBy('ownership_type') as $label => $years) {
            $total = $this->sumMillionths($years, 'amount_allocated');
            $allocated = $this->sumMillionths(
                $subscriptionAllocations->where('ownership_type', $label),
                'allocated_amount',
            );
            $values[$label] = $this->subscriptionComponents($allocated, $total);
        }

        return $values;
    }

    private function gameValues(Collection $subscriptionAllocations, Collection $iaps): array
    {
        $values = [];

        foreach ($subscriptionAllocations as $allocation) {
            $key = (int) $allocation->library_game_id;
            $values[$key] ??= $this->emptyGameComponents();
            $amount = $this->amounts->toMillionths($allocation->allocated_amount);
            $values[$key]['subscription_allocated_value'] += $amount;
            $values[$key]['subscription_total_value'] += $amount;
        }

        foreach ($iaps->whereNotNull('platform_id') as $iap) {
            $key = (int) $iap->library_game_id;
            $values[$key] ??= $this->emptyGameComponents();
            $amount = $this->amounts->toMillionths($iap->amount_paid);
            $values[$key]['in_app_purchase_allocated_value'] += $amount;
            $values[$key]['in_app_purchase_total_value'] += $amount;
        }

        return $this->convertComponentMap($values);
    }

    private function liveSubscriptionYears(User $user): Collection
    {
        return $this->subscriptionYearQuery($user->id)->get();
    }

    private function snapshotSubscriptionYears(SnapshotRun $snapshot): Collection
    {
        return $this->subscriptionYearQuery($snapshot->user_id)
            ->where('subscription_entry_years.year', '<=', $snapshot->year)
            ->get();
    }

    private function subscriptionYearQuery(int $userId)
    {
        return DB::table('subscription_entry_years')
            ->join('subscription_entries', 'subscription_entries.id', '=', 'subscription_entry_years.subscription_entry_id')
            ->join('ownership_types', 'ownership_types.id', '=', 'subscription_entries.ownership_type_id')
            ->where('subscription_entries.user_id', $userId)
            ->select([
                'subscription_entry_years.id',
                'subscription_entry_years.year',
                'subscription_entry_years.amount_allocated',
                'ownership_types.name as ownership_type',
            ]);
    }

    private function liveSubscriptionAllocations(User $user): Collection
    {
        return $this->subscriptionAllocationQuery($user->id)
            ->join('library_games', 'library_games.id', '=', 'ownership_copies.library_game_id')
            ->selectRaw('library_games.id as library_game_id, library_games.platform_id')
            ->addSelect([
                'subscription_entry_year_ownership_copies.allocated_amount',
                'ownership_types.name as ownership_type',
            ])
            ->get();
    }

    private function snapshotSubscriptionAllocations(SnapshotRun $snapshot): Collection
    {
        return $this->subscriptionAllocationQuery($snapshot->user_id)
            ->join('library_game_snapshots', function ($join) use ($snapshot) {
                $join->on('library_game_snapshots.library_game_id', '=', 'ownership_copies.library_game_id')
                    ->where('library_game_snapshots.snapshot_run_id', $snapshot->id);
            })
            ->where('subscription_entry_years.year', '<=', $snapshot->year)
            ->selectRaw('library_game_snapshots.library_game_id, library_game_snapshots.platform_id')
            ->addSelect([
                'subscription_entry_year_ownership_copies.allocated_amount',
                'ownership_types.name as ownership_type',
            ])
            ->get();
    }

    private function subscriptionAllocationQuery(int $userId)
    {
        return DB::table('subscription_entry_year_ownership_copies')
            ->join('subscription_entry_years', 'subscription_entry_years.id', '=', 'subscription_entry_year_ownership_copies.subscription_entry_year_id')
            ->join('subscription_entries', 'subscription_entries.id', '=', 'subscription_entry_years.subscription_entry_id')
            ->join('ownership_types', 'ownership_types.id', '=', 'subscription_entries.ownership_type_id')
            ->join('ownership_copies', 'ownership_copies.id', '=', 'subscription_entry_year_ownership_copies.ownership_copy_id')
            ->where('subscription_entries.user_id', $userId);
    }

    private function liveIaps(User $user): Collection
    {
        return DB::table('in_app_purchases')
            ->join('library_games', 'library_games.id', '=', 'in_app_purchases.library_game_id')
            ->where('library_games.user_id', $user->id)
            ->select([
                'in_app_purchases.library_game_id',
                'library_games.platform_id',
                'in_app_purchases.amount_paid',
            ])
            ->get();
    }

    private function snapshotIaps(SnapshotRun $snapshot): Collection
    {
        return DB::table('in_app_purchases')
            ->join('library_games', 'library_games.id', '=', 'in_app_purchases.library_game_id')
            ->leftJoin('library_game_snapshots', function ($join) use ($snapshot) {
                $join->on('library_game_snapshots.library_game_id', '=', 'in_app_purchases.library_game_id')
                    ->where('library_game_snapshots.snapshot_run_id', $snapshot->id);
            })
            ->where('library_games.user_id', $snapshot->user_id)
            ->whereYear('in_app_purchases.purchased_at', '<=', $snapshot->year)
            ->select([
                'in_app_purchases.library_game_id',
                'library_game_snapshots.platform_id',
                'in_app_purchases.amount_paid',
            ])
            ->get();
    }

    private function gameSubscriptionAllocations(LibraryGame $libraryGame): array
    {
        return DB::table('subscription_entry_year_ownership_copies')
            ->join('subscription_entry_years', 'subscription_entry_years.id', '=', 'subscription_entry_year_ownership_copies.subscription_entry_year_id')
            ->join('subscription_entries', 'subscription_entries.id', '=', 'subscription_entry_years.subscription_entry_id')
            ->join('ownership_types', 'ownership_types.id', '=', 'subscription_entries.ownership_type_id')
            ->join('ownership_copies', 'ownership_copies.id', '=', 'subscription_entry_year_ownership_copies.ownership_copy_id')
            ->where('ownership_copies.library_game_id', $libraryGame->id)
            ->orderBy('subscription_entry_years.year')
            ->get([
                'subscription_entries.id as subscription_entry_id',
                'subscription_entry_years.year',
                'subscription_entry_years.amount_allocated as yearly_amount',
                'subscription_entry_year_ownership_copies.allocated_amount',
                'subscription_entry_years.is_locked',
                'subscription_entry_years.locked_by_snapshot_run_id',
                'ownership_types.name as ownership_type',
            ])
            ->map(fn ($row) => [
                'subscription_entry_id' => (int) $row->subscription_entry_id,
                'year' => (int) $row->year,
                'ownership_type' => $row->ownership_type,
                'yearly_amount' => $row->yearly_amount,
                'allocated_amount' => round((float) $row->allocated_amount, 2),
                'is_locked' => (bool) $row->is_locked,
                'locked_by_snapshot_run_id' => $row->locked_by_snapshot_run_id,
            ])
            ->all();
    }

    private function financialComponents(int $subscriptionAllocated, int $subscriptionTotal, int $iapAllocated, int $iapTotal): array
    {
        return $this->convertComponents([
            'subscription_allocated_value' => $subscriptionAllocated,
            'subscription_unallocated_value' => max(0, $subscriptionTotal - $subscriptionAllocated),
            'subscription_total_value' => $subscriptionTotal,
            'in_app_purchase_allocated_value' => $iapAllocated,
            'in_app_purchase_unallocated_value' => max(0, $iapTotal - $iapAllocated),
            'in_app_purchase_total_value' => $iapTotal,
        ]);
    }

    private function subscriptionComponents(int $allocated, int $total): array
    {
        return $this->convertComponents([
            'subscription_allocated_value' => $allocated,
            'subscription_unallocated_value' => max(0, $total - $allocated),
            'subscription_total_value' => $total,
        ]);
    }

    private function convertComponentMap(array $values): array
    {
        return array_map(fn (array $components) => $this->convertComponents($components), $values);
    }

    private function convertComponents(array $components): array
    {
        $converted = array_map(
            fn (int $value) => round((float) $this->amounts->fromMillionths($value), 2),
            $components,
        );

        $converted['in_app_purchase_value'] = $converted['in_app_purchase_total_value'] ?? 0.0;

        return $converted;
    }

    private function sumMillionths(Collection $rows, string $field): int
    {
        return $rows->sum(fn ($row) => $this->amounts->toMillionths($row->{$field}));
    }

    private function emptyMillionthComponents(): array
    {
        return [
            'subscription_allocated_value' => 0,
            'subscription_unallocated_value' => 0,
            'subscription_total_value' => 0,
            'in_app_purchase_allocated_value' => 0,
            'in_app_purchase_unallocated_value' => 0,
            'in_app_purchase_total_value' => 0,
        ];
    }

    private function emptyGameComponents(): array
    {
        return $this->emptyMillionthComponents();
    }

    private function roundValues(array $values): array
    {
        return array_map(fn ($value) => round((float) $value, 2), $values);
    }
}
