<?php

namespace App\Services;

use App\Models\StupidLog\InAppPurchase;
use App\Models\StupidLog\LibraryGame;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class InAppPurchaseMutationService
{
    public function __construct(private ClosedFinancialYearService $closedYears) {}

    public function assertCreationAllowed(LibraryGame $libraryGame, string $purchasedAt): void
    {
        $this->assertPurchaseYearIsOpen($libraryGame->user_id, $purchasedAt);
    }

    public function assertUpdateAllowed(InAppPurchase $purchase, array $attributes): void
    {
        if ($purchase->is_locked) {
            throw ValidationException::withMessages([
                'in_app_purchase' => 'This in-app purchase is locked by a confirmed snapshot and cannot be changed.',
            ]);
        }

        $purchase->loadMissing('libraryGame');
        $this->assertPurchaseYearIsOpen(
            $purchase->libraryGame->user_id,
            $attributes['purchased_at'],
        );
    }

    public function assertDeletionAllowed(InAppPurchase $purchase): void
    {
        if ($purchase->is_locked) {
            throw ValidationException::withMessages([
                'in_app_purchase' => 'This in-app purchase is locked by a confirmed snapshot and cannot be deleted.',
            ]);
        }
    }

    private function assertPurchaseYearIsOpen(int $userId, string $purchasedAt): void
    {
        $year = (int) CarbonImmutable::parse($purchasedAt)->format('Y');

        if (! $this->closedYears->isYearClosed($userId, $year)) {
            return;
        }

        $closedYear = $this->closedYears->closedFinancialYear($userId);

        throw ValidationException::withMessages([
            'purchased_at' => "{$closedYear} and earlier are locked by confirmed snapshots.",
        ]);
    }
}
