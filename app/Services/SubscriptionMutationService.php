<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\SubscriptionEntry;
use Illuminate\Validation\ValidationException;

class SubscriptionMutationService
{
    public function __construct(
        private ClosedFinancialYearService $closedYears,
        private SubscriptionYearAllocationService $allocations,
    ) {}

    public function createYearlyAllocations(SubscriptionEntry $subscription): void
    {
        $this->assertDateRangeIsOpen(
            $subscription,
            $subscription->started_at,
            $subscription->finished_at,
        );
        $this->allocations->synchronizeUnlockedYears($subscription);
    }

    public function assertCoreChangesAllowed(SubscriptionEntry $subscription, array $attributes): void
    {
        if (! $this->hasCoreChanges($subscription, $attributes)) {
            return;
        }

        if ($subscription->years()->where('is_locked', true)->exists()) {
            throw ValidationException::withMessages([
                'subscription' => 'This subscription has locked yearly financial records and cannot be changed.',
            ]);
        }

        $this->assertDateRangeIsOpen(
            $subscription,
            $attributes['started_at'],
            $attributes['finished_at'],
        );
    }

    public function synchronizeAfterCoreUpdate(
        SubscriptionEntry $subscription,
        bool $ownershipTypeChanged,
    ): void {
        if ($ownershipTypeChanged) {
            $subscription->ownershipCopies()->sync([]);
        }

        $this->allocations->synchronizeUnlockedYears($subscription);
    }

    public function assertDeletionAllowed(SubscriptionEntry $subscription): void
    {
        if ($subscription->years()->where('is_locked', true)->exists()) {
            throw ValidationException::withMessages([
                'subscription' => 'This subscription has locked yearly financial records and cannot be deleted.',
            ]);
        }
    }

    public function assertCopiesCanBeRemoved(
        SubscriptionEntry $subscription,
        array $removedCopyIds,
    ): void {
        if ($removedCopyIds === []) {
            return;
        }

        $hasLockedAllocation = $subscription->years()
            ->where('is_locked', true)
            ->whereHas(
                'ownershipCopyAllocations',
                fn ($query) => $query->whereIn('ownership_copy_id', $removedCopyIds),
            )
            ->exists();

        if ($hasLockedAllocation) {
            throw ValidationException::withMessages([
                'ownership_copy_ids' => 'A selected ownership copy has a locked yearly allocation and cannot be removed.',
            ]);
        }
    }

    public function recalculateUnlockedYears(SubscriptionEntry $subscription): void
    {
        $this->allocations->synchronizeUnlockedYears($subscription);
    }

    public function assertOwnershipCopyDeletionAllowed(OwnershipCopy $ownershipCopy): void
    {
        if ($ownershipCopy->subscriptionEntryYears()->where('is_locked', true)->exists()) {
            throw ValidationException::withMessages([
                'ownership_copy' => 'This ownership copy has locked subscription allocations and cannot be deleted.',
            ]);
        }
    }

    public function assertLibraryGameDeletionAllowed(LibraryGame $libraryGame): void
    {
        if ($libraryGame->inAppPurchases()->where('is_locked', true)->exists()) {
            throw ValidationException::withMessages([
                'library_game' => 'This game has locked in-app purchases and cannot be deleted.',
            ]);
        }

        $hasLockedSubscriptionAllocation = $libraryGame->ownershipCopies()
            ->whereHas(
                'subscriptionEntryYears',
                fn ($query) => $query->where('is_locked', true),
            )
            ->exists();

        if ($hasLockedSubscriptionAllocation) {
            throw ValidationException::withMessages([
                'library_game' => 'This game has locked subscription allocations and cannot be deleted.',
            ]);
        }
    }

    private function assertDateRangeIsOpen(
        SubscriptionEntry $subscription,
        mixed $startedAt,
        mixed $finishedAt,
    ): void {
        if (! $this->closedYears->dateRangeOverlapsClosedYear(
            $subscription->user_id,
            $startedAt,
            $finishedAt,
        )) {
            return;
        }

        $closedYear = $this->closedYears->closedFinancialYear($subscription->user_id);

        throw ValidationException::withMessages([
            'started_at' => "{$closedYear} and earlier are locked by confirmed snapshots.",
        ]);
    }

    private function hasCoreChanges(SubscriptionEntry $subscription, array $attributes): bool
    {
        return (int) $subscription->ownership_type_id !== (int) $attributes['ownership_type_id']
            || (string) $subscription->amount_paid !== number_format((float) $attributes['amount_paid'], 2, '.', '')
            || $subscription->started_at?->format('Y-m-d') !== (string) $attributes['started_at']
            || $subscription->finished_at?->format('Y-m-d') !== (string) $attributes['finished_at'];
    }
}
