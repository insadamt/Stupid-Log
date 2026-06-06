<?php

namespace App\Services;

use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class ClosedFinancialYearService
{
    public function closedFinancialYear(User|int $user): ?int
    {
        $year = SnapshotRun::where('user_id', $this->userId($user))
            ->where('status', 'confirmed')
            ->max('year');

        return $year === null ? null : (int) $year;
    }

    public function isYearClosed(User|int $user, int $year): bool
    {
        $closedYear = $this->closedFinancialYear($user);

        return $closedYear !== null && $year <= $closedYear;
    }

    public function dateRangeOverlapsClosedYear(
        User|int $user,
        CarbonInterface|string $startedAt,
        CarbonInterface|string $finishedAt,
    ): bool {
        $closedYear = $this->closedFinancialYear($user);

        if ($closedYear === null) {
            return false;
        }

        $start = $startedAt instanceof CarbonInterface
            ? CarbonImmutable::instance($startedAt)
            : CarbonImmutable::parse($startedAt);
        $end = $finishedAt instanceof CarbonInterface
            ? CarbonImmutable::instance($finishedAt)
            : CarbonImmutable::parse($finishedAt);

        return (int) min($start->format('Y'), $end->format('Y')) <= $closedYear;
    }

    public function firstEditableDate(User|int $user): ?CarbonImmutable
    {
        $closedYear = $this->closedFinancialYear($user);

        return $closedYear === null
            ? null
            : CarbonImmutable::create($closedYear + 1, 1, 1)->startOfDay();
    }

    private function userId(User|int $user): int
    {
        return $user instanceof User ? (int) $user->id : $user;
    }
}
