<?php

namespace App\Services;

use App\Models\StupidLog\SubscriptionEntry;
use App\Models\StupidLog\SubscriptionEntryYear;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class SubscriptionYearAllocationService
{
    public function __construct(private FinancialAmountService $amounts) {}

    public function synchronizeUnlockedYears(SubscriptionEntry $subscription): void
    {
        DB::transaction(function () use ($subscription) {
            $yearlyAmounts = $this->calculateYearlyAmounts(
                $subscription->amount_paid,
                $subscription->started_at,
                $subscription->finished_at,
            );
            $selectedCopyIds = $this->selectedCopyIds($subscription);
            $desiredYears = array_keys($yearlyAmounts);

            $obsoleteYears = $subscription->years()->where('is_locked', false);

            if ($desiredYears !== []) {
                $obsoleteYears->whereNotIn('year', $desiredYears);
            }

            $obsoleteYears->delete();

            foreach ($yearlyAmounts as $year => $amountAllocated) {
                if ($subscription->years()->where('year', $year)->where('is_locked', true)->exists()) {
                    continue;
                }

                $subscriptionYear = $subscription->years()->updateOrCreate(
                    ['year' => $year],
                    ['amount_allocated' => $amountAllocated],
                );

                $this->replaceCopyAllocations($subscriptionYear, $selectedCopyIds);
            }
        });
    }

    public function recalculateUnlockedCopyAllocations(SubscriptionEntry $subscription): void
    {
        DB::transaction(function () use ($subscription) {
            $selectedCopyIds = $this->selectedCopyIds($subscription);

            $subscription->years()
                ->where('is_locked', false)
                ->orderBy('year')
                ->get()
                ->each(fn (SubscriptionEntryYear $year) => $this->replaceCopyAllocations(
                    $year,
                    $selectedCopyIds,
                ));
        });
    }

    public function calculateYearlyAmounts(
        float|int|string $amountPaid,
        CarbonInterface|string $startedAt,
        CarbonInterface|string $finishedAt,
    ): array {
        $start = $this->date($startedAt);
        $end = $this->date($finishedAt);

        if ($start->greaterThan($end)) {
            return [];
        }

        $totalAmount = $this->amounts->toMillionths($amountPaid);
        $totalDays = $start->diffInDays($end) + 1;
        $remaining = $totalAmount;
        $years = range((int) $start->format('Y'), (int) $end->format('Y'));
        $yearlyAmounts = [];

        foreach ($years as $index => $year) {
            if ($index === array_key_last($years)) {
                $yearlyAmounts[$year] = $this->amounts->fromMillionths($remaining);
                break;
            }

            $yearStart = CarbonImmutable::create($year, 1, 1)->startOfDay();
            $yearEnd = CarbonImmutable::create($year, 12, 31)->startOfDay();
            $overlapStart = $start->greaterThan($yearStart) ? $start : $yearStart;
            $overlapEnd = $end->lessThan($yearEnd) ? $end : $yearEnd;
            $overlapDays = $overlapStart->diffInDays($overlapEnd) + 1;
            $allocated = $this->amounts->proportionalAmount(
                $totalAmount,
                $overlapDays,
                $totalDays,
            );
            $yearlyAmounts[$year] = $this->amounts->fromMillionths($allocated);
            $remaining -= $allocated;
        }

        return $yearlyAmounts;
    }

    public function calculateCopyAmounts(float|int|string $amountAllocated, array $selectedCopyIds): array
    {
        sort($selectedCopyIds, SORT_NUMERIC);
        $amounts = $this->amounts->splitEvenly(
            $this->amounts->toMillionths($amountAllocated),
            $selectedCopyIds,
        );

        return array_map(
            fn (int $amount) => $this->amounts->fromMillionths($amount),
            $amounts,
        );
    }

    private function replaceCopyAllocations(SubscriptionEntryYear $year, array $selectedCopyIds): void
    {
        $year->ownershipCopyAllocations()->delete();

        $timestamp = now();
        $rows = [];

        foreach ($this->calculateCopyAmounts($year->amount_allocated, $selectedCopyIds) as $copyId => $amount) {
            $rows[] = [
                'subscription_entry_year_id' => $year->id,
                'ownership_copy_id' => $copyId,
                'allocated_amount' => $amount,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];
        }

        if ($rows !== []) {
            DB::table('subscription_entry_year_ownership_copies')->insert($rows);
        }
    }

    private function selectedCopyIds(SubscriptionEntry $subscription): array
    {
        return $subscription->ownershipCopies()
            ->orderBy('ownership_copies.id')
            ->pluck('ownership_copies.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function date(CarbonInterface|string $date): CarbonImmutable
    {
        if ($date instanceof CarbonInterface) {
            return CarbonImmutable::instance($date)->startOfDay();
        }

        return CarbonImmutable::parse($date)->startOfDay();
    }
}
