<?php

namespace App\Services;

use App\Models\StupidLog\InAppPurchase;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\SubscriptionEntry;

class FinancialSnapshotRefreshService
{
    public function __construct(
        private FinancialPeriodService $periods,
        private StatsService $stats,
    ) {}

    public function refreshForSubscriptionCreated(SubscriptionEntry $entry): void
    {
        $this->refreshYears($entry->user_id, $this->subscriptionYears($entry));
    }

    public function refreshForSubscriptionUpdated(SubscriptionEntry $entry, array $oldValues): void
    {
        $oldYears = $this->periods->yearsOverlappedBySubscription($oldValues['started_at'], $oldValues['finished_at']);
        $newYears = $this->subscriptionYears($entry);

        $this->refreshYears($entry->user_id, [...$oldYears, ...$newYears]);
    }

    public function refreshForSubscriptionDeleted(SubscriptionEntry $entry): void
    {
        $this->refreshYears($entry->user_id, $this->subscriptionYears($entry));
    }

    public function refreshForSubscriptionOwnershipCopiesChanged(SubscriptionEntry $entry): void
    {
        $this->refreshForSubscriptionCreated($entry);
    }

    public function refreshForCollectedSubscriptionPeriods(int $userId, array $periods): void
    {
        $years = [];

        foreach ($periods as $period) {
            $years = [
                ...$years,
                ...$this->periods->yearsOverlappedBySubscription($period['started_at'], $period['finished_at']),
            ];
        }

        $this->refreshYears($userId, $years);
    }

    public function refreshForInAppPurchaseCreated(InAppPurchase $purchase): void
    {
        $this->refreshIapYears($purchase, [$purchase->purchased_at?->year]);
    }

    public function refreshForInAppPurchaseUpdated(InAppPurchase $purchase, array $oldValues): void
    {
        $oldYear = $oldValues['purchased_at'] ? (int) date('Y', strtotime((string) $oldValues['purchased_at'])) : null;

        $this->refreshIapYears($purchase, [$oldYear, $purchase->purchased_at?->year]);
    }

    public function refreshForInAppPurchaseDeleted(InAppPurchase $purchase): void
    {
        $this->refreshIapYears($purchase, [$purchase->purchased_at?->year]);
    }

    private function subscriptionYears(SubscriptionEntry $entry): array
    {
        return $this->periods->yearsOverlappedBySubscription($entry->started_at, $entry->finished_at);
    }

    private function refreshIapYears(InAppPurchase $purchase, array $years): void
    {
        $purchase->loadMissing('libraryGame');
        $this->refreshYears($purchase->libraryGame->user_id, $years);
    }

    private function refreshYears(int $userId, array $years): void
    {
        $years = collect($years)
            ->filter()
            ->map(fn ($year) => (int) $year)
            ->unique()
            ->values();

        if ($years->isEmpty()) {
            return;
        }

        SnapshotRun::where('user_id', $userId)
            ->whereIn('year', $years)
            ->get()
            ->each(fn (SnapshotRun $snapshot) => $this->stats->refreshSnapshotSummary($snapshot->refresh()));
    }
}
