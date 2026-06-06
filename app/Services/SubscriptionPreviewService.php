<?php

namespace App\Services;

use App\Models\StupidLog\SubscriptionEntry;
use Illuminate\Support\Collection;

class SubscriptionPreviewService
{
    public function __construct(
        private SubscriptionYearAllocationService $allocations,
    ) {}

    public function preview(
        array $attributes,
        Collection $selectedCopies,
        ?SubscriptionEntry $subscription = null,
    ): array {
        $selectedCopyIds = $selectedCopies
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $lockedYears = $subscription?->years()
            ->with(['ownershipCopyAllocations.ownershipCopy.libraryGame.game', 'ownershipCopyAllocations.ownershipCopy.libraryGame.platform', 'lockedBySnapshotRun'])
            ->where('is_locked', true)
            ->get()
            ->keyBy('year') ?? collect();
        $yearlyAmounts = $this->allocations->calculateYearlyAmounts(
            $attributes['amount_paid'],
            $attributes['started_at'],
            $attributes['finished_at'],
        );

        return collect($yearlyAmounts)
            ->map(function ($amount, $year) use ($lockedYears, $selectedCopies, $selectedCopyIds) {
                $lockedYear = $lockedYears->get((int) $year);

                if ($lockedYear) {
                    return $this->lockedYearPreview($lockedYear);
                }

                $copyAmounts = $this->allocations->calculateCopyAmounts($amount, $selectedCopyIds);

                return [
                    'year' => (int) $year,
                    'amount_allocated' => $amount,
                    'is_locked' => false,
                    'locked_by_snapshot_year' => null,
                    'selected_copy_count' => count($selectedCopyIds),
                    'unallocated_amount' => $selectedCopyIds === [] ? $amount : '0.000000',
                    'allocations' => collect($copyAmounts)
                        ->map(fn ($copyAmount, $copyId) => $this->copyPreview(
                            $selectedCopies->firstWhere('id', (int) $copyId),
                            $copyAmount,
                        ))
                        ->values()
                        ->all(),
                ];
            })
            ->values()
            ->all();
    }

    private function lockedYearPreview($year): array
    {
        return [
            'year' => (int) $year->year,
            'amount_allocated' => $year->amount_allocated,
            'is_locked' => true,
            'locked_by_snapshot_year' => $year->lockedBySnapshotRun?->year,
            'selected_copy_count' => $year->ownershipCopyAllocations->count(),
            'unallocated_amount' => $year->ownershipCopyAllocations->isEmpty()
                ? $year->amount_allocated
                : '0.000000',
            'allocations' => $year->ownershipCopyAllocations
                ->map(fn ($allocation) => $this->copyPreview(
                    $allocation->ownershipCopy,
                    $allocation->allocated_amount,
                ))
                ->values()
                ->all(),
        ];
    }

    private function copyPreview($copy, float|int|string $amount): array
    {
        return [
            'ownership_copy_id' => (int) $copy->id,
            'allocated_amount' => $amount,
            'game_title' => $copy->libraryGame->game->title,
            'platform' => $copy->libraryGame->platform->name,
        ];
    }
}
