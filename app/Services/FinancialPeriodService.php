<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class FinancialPeriodService
{
    public function periodBoundsForYear(int $year): array
    {
        return [
            CarbonImmutable::create($year, 1, 1)->startOfDay(),
            CarbonImmutable::create($year, 12, 31)->startOfDay(),
        ];
    }

    public function inclusiveDays(CarbonInterface $start, CarbonInterface $end): int
    {
        return $start->startOfDay()->diffInDays($end->startOfDay()) + 1;
    }

    public function overlapDays(CarbonInterface $entryStart, CarbonInterface $entryEnd, CarbonInterface $periodStart, CarbonInterface $periodEnd): int
    {
        $overlapStart = $entryStart->greaterThan($periodStart) ? $entryStart : $periodStart;
        $overlapEnd = $entryEnd->lessThan($periodEnd) ? $entryEnd : $periodEnd;

        if ($overlapStart->greaterThan($overlapEnd)) {
            return 0;
        }

        return $this->inclusiveDays($overlapStart, $overlapEnd);
    }

    public function proratedAmount(float|string $amount, CarbonInterface|string $entryStart, CarbonInterface|string $entryEnd, CarbonInterface|string $periodStart, CarbonInterface|string $periodEnd): float
    {
        $entryStart = $this->date($entryStart);
        $entryEnd = $this->date($entryEnd);
        $periodStart = $this->date($periodStart);
        $periodEnd = $this->date($periodEnd);
        $totalDays = $this->inclusiveDays($entryStart, $entryEnd);

        if ($totalDays <= 0) {
            return 0.0;
        }

        return ((float) $amount) * ($this->overlapDays($entryStart, $entryEnd, $periodStart, $periodEnd) / $totalDays);
    }

    public function yearsOverlappedBySubscription(CarbonInterface|string $startedAt, CarbonInterface|string $finishedAt): array
    {
        $start = $this->date($startedAt);
        $end = $this->date($finishedAt);

        if ($start->greaterThan($end)) {
            return [];
        }

        return range((int) $start->format('Y'), (int) $end->format('Y'));
    }

    private function date(CarbonInterface|string $date): CarbonImmutable
    {
        if ($date instanceof CarbonInterface) {
            return CarbonImmutable::instance($date)->startOfDay();
        }

        return CarbonImmutable::parse($date)->startOfDay();
    }
}
