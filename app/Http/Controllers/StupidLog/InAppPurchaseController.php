<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\InAppPurchase;
use App\Models\StupidLog\LibraryGame;
use App\Services\FinancialSnapshotRefreshService;
use App\Services\InAppPurchaseMutationService;
use App\Services\LocalUserService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InAppPurchaseController extends Controller
{
    public function store(
        Request $request,
        LibraryGame $libraryGame,
        LocalUserService $localUser,
        FinancialSnapshotRefreshService $refresh,
        InAppPurchaseMutationService $mutations,
    ): RedirectResponse {
        $this->assertLibraryGameBelongsToLocalUser($libraryGame, $localUser);
        $validated = $this->validatePurchase($request);
        $mutations->assertCreationAllowed($libraryGame, $validated['purchased_at']);

        $purchase = $libraryGame->inAppPurchases()->create($validated);
        $refresh->refreshForInAppPurchaseCreated($purchase);

        return back();
    }

    public function update(
        Request $request,
        InAppPurchase $inAppPurchase,
        LocalUserService $localUser,
        FinancialSnapshotRefreshService $refresh,
        InAppPurchaseMutationService $mutations,
    ): RedirectResponse {
        $this->assertPurchaseBelongsToLocalUser($inAppPurchase, $localUser);
        $validated = $this->validatePurchase($request);
        $mutations->assertUpdateAllowed($inAppPurchase, $validated);
        $oldValues = $inAppPurchase->only(['purchased_at']);

        $inAppPurchase->update($validated);
        $refresh->refreshForInAppPurchaseUpdated($inAppPurchase->refresh(), $oldValues);

        return back();
    }

    public function destroy(
        InAppPurchase $inAppPurchase,
        LocalUserService $localUser,
        FinancialSnapshotRefreshService $refresh,
        InAppPurchaseMutationService $mutations,
    ): RedirectResponse {
        $this->assertPurchaseBelongsToLocalUser($inAppPurchase, $localUser);
        $mutations->assertDeletionAllowed($inAppPurchase);
        $oldPurchase = clone $inAppPurchase;

        $inAppPurchase->delete();
        $refresh->refreshForInAppPurchaseDeleted($oldPurchase);

        return back();
    }

    private function validatePurchase(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'amount_paid' => ['required', 'numeric', 'min:0.01'],
            'purchased_at' => ['required', 'date'],
        ]);
    }

    private function assertLibraryGameBelongsToLocalUser(LibraryGame $libraryGame, LocalUserService $localUser): void
    {
        if ((int) $libraryGame->user_id !== (int) $localUser->get()->id) {
            abort(403);
        }
    }

    private function assertPurchaseBelongsToLocalUser(InAppPurchase $purchase, LocalUserService $localUser): void
    {
        $purchase->loadMissing('libraryGame');
        $this->assertLibraryGameBelongsToLocalUser($purchase->libraryGame, $localUser);
    }
}
