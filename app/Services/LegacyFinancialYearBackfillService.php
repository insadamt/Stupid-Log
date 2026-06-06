<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LegacyFinancialYearBackfillService
{
    public function __construct(private SubscriptionYearAllocationService $allocations) {}

    public function run(): void
    {
        DB::transaction(function () {
            $confirmedSnapshots = $this->confirmedSnapshotsByUser();

            $this->backfillSubscriptionYears($confirmedSnapshots);
            $this->lockLegacyInAppPurchases($confirmedSnapshots);
            $this->deleteObsoleteDraftSnapshots($confirmedSnapshots);
            $this->invalidateSnapshotSummaries();
        });
    }

    private function backfillSubscriptionYears(Collection $confirmedSnapshots): void
    {
        DB::table('subscription_entries')
            ->orderBy('id')
            ->get()
            ->each(function ($entry) use ($confirmedSnapshots) {
                $selectedCopyIds = DB::table('subscription_entry_ownership_copies')
                    ->where('subscription_entry_id', $entry->id)
                    ->orderBy('ownership_copy_id')
                    ->pluck('ownership_copy_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();

                foreach ($this->allocations->calculateYearlyAmounts(
                    $entry->amount_paid,
                    $entry->started_at,
                    $entry->finished_at,
                ) as $year => $amountAllocated) {
                    $snapshot = $this->coveringSnapshot(
                        $confirmedSnapshots->get((int) $entry->user_id, collect()),
                        $year,
                    );
                    $timestamp = now();

                    DB::table('subscription_entry_years')->updateOrInsert(
                        [
                            'subscription_entry_id' => $entry->id,
                            'year' => $year,
                        ],
                        [
                            'amount_allocated' => $amountAllocated,
                            'is_locked' => $snapshot !== null,
                            'locked_at' => $snapshot?->confirmed_at ?? ($snapshot ? $timestamp : null),
                            'locked_by_snapshot_run_id' => $snapshot?->id,
                            'locked_reason' => $snapshot ? 'cumulative_snapshot' : null,
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ],
                    );

                    $subscriptionEntryYearId = DB::table('subscription_entry_years')
                        ->where('subscription_entry_id', $entry->id)
                        ->where('year', $year)
                        ->value('id');

                    DB::table('subscription_entry_year_ownership_copies')
                        ->where('subscription_entry_year_id', $subscriptionEntryYearId)
                        ->delete();

                    foreach ($this->allocations->calculateCopyAmounts(
                        $amountAllocated,
                        $selectedCopyIds,
                    ) as $copyId => $copyAmount) {
                        DB::table('subscription_entry_year_ownership_copies')->insert([
                            'subscription_entry_year_id' => $subscriptionEntryYearId,
                            'ownership_copy_id' => $copyId,
                            'allocated_amount' => $copyAmount,
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ]);
                    }
                }
            });
    }

    private function lockLegacyInAppPurchases(Collection $confirmedSnapshots): void
    {
        DB::table('in_app_purchases')
            ->join('library_games', 'library_games.id', '=', 'in_app_purchases.library_game_id')
            ->orderBy('in_app_purchases.id')
            ->select([
                'in_app_purchases.id',
                'in_app_purchases.purchased_at',
                'library_games.user_id',
            ])
            ->get()
            ->each(function ($purchase) use ($confirmedSnapshots) {
                $year = (int) CarbonImmutable::parse($purchase->purchased_at)->format('Y');
                $snapshot = $this->coveringSnapshot(
                    $confirmedSnapshots->get((int) $purchase->user_id, collect()),
                    $year,
                );

                if (! $snapshot) {
                    return;
                }

                DB::table('in_app_purchases')
                    ->where('id', $purchase->id)
                    ->update([
                        'is_locked' => true,
                        'locked_at' => $snapshot->confirmed_at ?? now(),
                        'locked_by_snapshot_run_id' => $snapshot->id,
                        'locked_reason' => 'cumulative_snapshot',
                        'updated_at' => now(),
                    ]);
            });
    }

    private function deleteObsoleteDraftSnapshots(Collection $confirmedSnapshots): void
    {
        foreach ($confirmedSnapshots as $userId => $snapshots) {
            $closedYear = (int) $snapshots->max('year');

            DB::table('snapshot_runs')
                ->where('user_id', $userId)
                ->where('status', 'draft')
                ->where('year', '<=', $closedYear)
                ->delete();
        }
    }

    private function invalidateSnapshotSummaries(): void
    {
        DB::table('snapshot_runs')->update(['summary_json' => null]);
    }

    private function confirmedSnapshotsByUser(): Collection
    {
        return DB::table('snapshot_runs')
            ->where('status', 'confirmed')
            ->orderBy('year')
            ->orderBy('id')
            ->get(['id', 'user_id', 'year', 'confirmed_at'])
            ->groupBy('user_id');
    }

    private function coveringSnapshot(Collection $snapshots, int $year): ?object
    {
        return $snapshots->first(fn ($snapshot) => (int) $snapshot->year >= $year);
    }
}
