<?php

namespace App\Services;

class FinancialAmountService
{
    private const SCALE = 1_000_000;

    public function toMillionths(float|int|string $amount): int
    {
        $value = trim((string) $amount);
        $negative = str_starts_with($value, '-');
        $value = ltrim($value, '+-');
        [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '');
        $fraction = substr(str_pad($fraction, 6, '0'), 0, 6);
        $millionths = ((int) $whole * self::SCALE) + (int) $fraction;

        return $negative ? -$millionths : $millionths;
    }

    public function fromMillionths(int $amount): string
    {
        $negative = $amount < 0;
        $absolute = abs($amount);
        $whole = intdiv($absolute, self::SCALE);
        $fraction = str_pad((string) ($absolute % self::SCALE), 6, '0', STR_PAD_LEFT);

        return ($negative ? '-' : '').$whole.'.'.$fraction;
    }

    public function proportionalAmount(int $amount, int $part, int $whole): int
    {
        $quotient = intdiv($amount, $whole);
        $remainder = $amount % $whole;

        return ($quotient * $part) + intdiv($remainder * $part, $whole);
    }

    public function splitEvenly(int $amount, array $orderedKeys): array
    {
        $count = count($orderedKeys);

        if ($count === 0) {
            return [];
        }

        $baseAmount = intdiv($amount, $count);
        $remaining = $amount;
        $amounts = [];

        foreach ($orderedKeys as $index => $key) {
            $allocated = $index === array_key_last($orderedKeys) ? $remaining : $baseAmount;
            $amounts[$key] = $allocated;
            $remaining -= $allocated;
        }

        return $amounts;
    }
}
