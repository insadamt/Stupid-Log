<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancialValueService
{
    public function __construct(private FinancialPeriodService $periods) {}

    public function calculateLiveFinancialValuesForUser(User $user): array
    {
        $byGame = collect($this->calculateLiveFinancialValuesByLibraryGame($user));

        return $this->roundComponents([
            'subscription_allocated_value' => $byGame->sum('subscription_allocated_value'),
            'in_app_purchase_value' => $byGame->sum('in_app_purchase_value'),
        ]);
    }

    public function calculateLiveFinancialValuesByPlatform(User $user): array
    {
        $values = [];

        foreach ($this->liveSubscriptionShares($user) as $share) {
            $this->addComponents($values, (int) $share['platform_id'], (float) $share['amount'], 0.0);
        }

        foreach ($this->liveIapRows($user) as $row) {
            $this->addComponents($values, (int) $row->platform_id, 0.0, (float) $row->amount_paid);
        }

        return $this->roundComponentMap($values);
    }

    public function calculateLiveFinancialValuesByOwnershipType(User $user): array
    {
        $values = [];

        foreach ($this->liveSubscriptionShares($user) as $share) {
            $this->addComponents($values, (string) $share['ownership_type'], (float) $share['amount'], 0.0);
        }

        return $this->roundComponentMap($values);
    }

    public function calculateLiveFinancialValuesByLibraryGame(User $user): array
    {
        $values = [];

        foreach ($this->liveSubscriptionShares($user) as $share) {
            $this->addComponents($values, (int) $share['library_game_id'], (float) $share['amount'], 0.0);
        }

        foreach ($this->liveIapRows($user) as $row) {
            $this->addComponents($values, (int) $row->library_game_id, 0.0, (float) $row->amount_paid);
        }

        return $this->roundComponentMap($values);
    }

    public function calculateSnapshotFinancialValuesForRun(SnapshotRun $snapshot): array
    {
        $byGame = collect($this->calculateSnapshotFinancialValuesByLibraryGame($snapshot));

        return $this->roundComponents([
            'subscription_allocated_value' => $byGame->sum('subscription_allocated_value'),
            'in_app_purchase_value' => $byGame->sum('in_app_purchase_value'),
        ]);
    }

    public function calculateSnapshotFinancialValuesByPlatform(SnapshotRun $snapshot): array
    {
        $values = [];

        foreach ($this->snapshotSubscriptionShares($snapshot) as $share) {
            $this->addComponents($values, (int) $share['platform_id'], (float) $share['amount'], 0.0);
        }

        foreach ($this->snapshotIapRows($snapshot) as $row) {
            $this->addComponents($values, (int) $row->platform_id, 0.0, (float) $row->amount_paid);
        }

        return $this->roundComponentMap($values);
    }

    public function calculateSnapshotFinancialValuesByLibraryGame(SnapshotRun $snapshot): array
    {
        $values = [];

        foreach ($this->snapshotSubscriptionShares($snapshot) as $share) {
            $this->addComponents($values, (int) $share['library_game_id'], (float) $share['amount'], 0.0);
        }

        foreach ($this->snapshotIapRows($snapshot) as $row) {
            $this->addComponents($values, (int) $row->library_game_id, 0.0, (float) $row->amount_paid);
        }

        return $this->roundComponentMap($values);
    }

    public function calculateSnapshotFinancialValuesByOwnershipType(SnapshotRun $snapshot): array
    {
        $values = [];

        foreach ($this->snapshotSubscriptionShares($snapshot) as $share) {
            $this->addComponents($values, (string) $share['ownership_type'], (float) $share['amount'], 0.0);
        }

        return $this->roundComponentMap($values);
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
            ...$this->roundComponents([
                'copy_purchased_value' => $copyPaid,
                'dlc_purchased_value' => $dlcPaid,
                'subscription_allocated_value' => $subscriptionPaid,
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
                ])
                ->values()
                ->all(),
        ];
    }

    private function calculateSubscriptionPerCopyAllocation($amountPaid, int $selectedCopyCount): string|float
    {
        if ($selectedCopyCount === 0) {
            return 0.0;
        }

        return (float) $amountPaid / $selectedCopyCount;
    }

    private function liveSubscriptionShares(User $user): array
    {
        $entries = DB::table('subscription_entries')
            ->join('ownership_types', 'ownership_types.id', '=', 'subscription_entries.ownership_type_id')
            ->where('subscription_entries.user_id', $user->id)
            ->select([
                'subscription_entries.id',
                'subscription_entries.amount_paid',
                'ownership_types.name as ownership_type',
            ])
            ->get();

        return $this->subscriptionShares($entries, fn ($entry) => (float) $entry->amount_paid, $user, null);
    }

    private function snapshotSubscriptionShares(SnapshotRun $snapshot): array
    {
        [$yearStart, $yearEnd] = $this->periods->periodBoundsForYear((int) $snapshot->year);
        $entries = DB::table('subscription_entries')
            ->join('ownership_types', 'ownership_types.id', '=', 'subscription_entries.ownership_type_id')
            ->where('subscription_entries.user_id', $snapshot->user_id)
            ->whereDate('subscription_entries.started_at', '<=', $yearEnd->toDateString())
            ->whereDate('subscription_entries.finished_at', '>=', $yearStart->toDateString())
            ->select([
                'subscription_entries.id',
                'subscription_entries.amount_paid',
                'subscription_entries.started_at',
                'subscription_entries.finished_at',
                'ownership_types.name as ownership_type',
            ])
            ->get();

        return $this->subscriptionShares(
            $entries,
            fn ($entry) => $this->periods->proratedAmount($entry->amount_paid, $entry->started_at, $entry->finished_at, $yearStart, $yearEnd),
            null,
            $snapshot,
        );
    }

    private function subscriptionShares(Collection $entries, callable $amountForEntry, ?User $user, ?SnapshotRun $snapshot): array
    {
        $shares = [];

        foreach ($entries as $entry) {
            $selectedCopies = DB::table('subscription_entry_ownership_copies')
                ->join('ownership_copies', 'ownership_copies.id', '=', 'subscription_entry_ownership_copies.ownership_copy_id')
                ->join('library_games', 'library_games.id', '=', 'ownership_copies.library_game_id')
                ->where('subscription_entry_ownership_copies.subscription_entry_id', $entry->id)
                ->when($user, fn ($query) => $query->where('library_games.user_id', $user->id))
                ->select(['ownership_copies.id', 'ownership_copies.library_game_id', 'library_games.platform_id'])
                ->get();
            $selected_copy_count = $selectedCopies->count();

            if ($selected_copy_count === 0) {
                continue;
            }

            $perCopyAllocation = $this->calculateSubscriptionPerCopyAllocation($amountForEntry($entry), $selected_copy_count);

            if ($snapshot) {
                $snapshotGames = DB::table('library_game_snapshots')
                    ->where('snapshot_run_id', $snapshot->id)
                    ->whereIn('library_game_id', $selectedCopies->pluck('library_game_id')->all())
                    ->get(['library_game_id', 'platform_id'])
                    ->keyBy('library_game_id');

                foreach ($selectedCopies as $copy) {
                    $snapshotGame = $snapshotGames->get($copy->library_game_id);

                    if (! $snapshotGame) {
                        continue;
                    }

                    $shares[] = [
                        'library_game_id' => (int) $copy->library_game_id,
                        'platform_id' => (int) $snapshotGame->platform_id,
                        'ownership_type' => (string) $entry->ownership_type,
                        'amount' => $perCopyAllocation,
                    ];
                }

                continue;
            }

            foreach ($selectedCopies as $copy) {
                $shares[] = [
                    'library_game_id' => (int) $copy->library_game_id,
                    'platform_id' => (int) $copy->platform_id,
                    'ownership_type' => (string) $entry->ownership_type,
                    'amount' => $perCopyAllocation,
                ];
            }
        }

        return $shares;
    }

    private function liveIapRows(User $user): Collection
    {
        return DB::table('in_app_purchases')
            ->join('library_games', 'library_games.id', '=', 'in_app_purchases.library_game_id')
            ->where('library_games.user_id', $user->id)
            ->select(['in_app_purchases.library_game_id', 'library_games.platform_id', 'in_app_purchases.amount_paid'])
            ->get();
    }

    private function snapshotIapRows(SnapshotRun $snapshot): Collection
    {
        [$yearStart, $yearEnd] = $this->periods->periodBoundsForYear((int) $snapshot->year);

        return DB::table('in_app_purchases')
            ->join('library_game_snapshots', function ($join) use ($snapshot) {
                $join->on('library_game_snapshots.library_game_id', '=', 'in_app_purchases.library_game_id')
                    ->where('library_game_snapshots.snapshot_run_id', '=', $snapshot->id);
            })
            ->whereBetween('in_app_purchases.purchased_at', [$yearStart->toDateString(), $yearEnd->toDateString()])
            ->select(['in_app_purchases.library_game_id', 'library_game_snapshots.platform_id', 'in_app_purchases.amount_paid'])
            ->get();
    }

    private function gameSubscriptionAllocations(LibraryGame $libraryGame): array
    {
        $entries = DB::table('subscription_entries')
            ->join('ownership_types', 'ownership_types.id', '=', 'subscription_entries.ownership_type_id')
            ->join('subscription_entry_ownership_copies', 'subscription_entry_ownership_copies.subscription_entry_id', '=', 'subscription_entries.id')
            ->join('ownership_copies', 'ownership_copies.id', '=', 'subscription_entry_ownership_copies.ownership_copy_id')
            ->where('ownership_copies.library_game_id', $libraryGame->id)
            ->select([
                'subscription_entries.id',
                'subscription_entries.amount_paid',
                'subscription_entries.started_at',
                'subscription_entries.finished_at',
                'ownership_types.name as ownership_type',
            ])
            ->distinct()
            ->get();

        return $entries
            ->map(function ($entry) {
                $selected_copy_count = DB::table('subscription_entry_ownership_copies')
                    ->where('subscription_entry_id', $entry->id)
                    ->count();
                $allocatedAmount = $this->calculateSubscriptionPerCopyAllocation($entry->amount_paid, $selected_copy_count);

                return [
                    'subscription_entry_id' => (int) $entry->id,
                    'ownership_type' => $entry->ownership_type,
                    'amount_paid' => $entry->amount_paid,
                    'selected_count' => $selected_copy_count,
                    'allocated_amount' => round((float) $allocatedAmount, 2),
                    'started_at' => $entry->started_at,
                    'finished_at' => $entry->finished_at,
                ];
            })
            ->values()
            ->all();
    }

    private function addComponents(array &$values, int|string $key, float $subscriptionAmount, float $iapAmount): void
    {
        $values[$key] ??= ['subscription_allocated_value' => 0.0, 'in_app_purchase_value' => 0.0];
        $values[$key]['subscription_allocated_value'] += $subscriptionAmount;
        $values[$key]['in_app_purchase_value'] += $iapAmount;
    }

    private function roundComponentMap(array $values): array
    {
        foreach ($values as $key => $components) {
            $values[$key] = $this->roundComponents($components);
        }

        return $values;
    }

    private function roundComponents(array $components): array
    {
        foreach ($components as $key => $value) {
            $components[$key] = round((float) $value, 2);
        }

        return $components;
    }
}
