<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\InAppPurchase;
use App\Models\StupidLog\LibraryGame;
use App\Services\LocalUserService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InAppPurchaseController extends Controller
{
    public function store(Request $request, LibraryGame $libraryGame, LocalUserService $localUser): RedirectResponse
    {
        $this->assertLibraryGameBelongsToLocalUser($libraryGame, $localUser);

        $libraryGame->inAppPurchases()->create($this->validatePurchase($request));

        return back();
    }

    public function update(Request $request, InAppPurchase $inAppPurchase, LocalUserService $localUser): RedirectResponse
    {
        $this->assertPurchaseBelongsToLocalUser($inAppPurchase, $localUser);

        $inAppPurchase->update($this->validatePurchase($request));

        return back();
    }

    public function destroy(InAppPurchase $inAppPurchase, LocalUserService $localUser): RedirectResponse
    {
        $this->assertPurchaseBelongsToLocalUser($inAppPurchase, $localUser);

        $inAppPurchase->delete();

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
