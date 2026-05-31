<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnedDlc;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OwnedDlcController extends Controller
{
    private const DLC_ACQUISITION_TYPES = ['Owned', 'Edition Included', 'Free'];

    public function storeOwnedDlc(Request $request, LibraryGame $libraryGame): RedirectResponse
    {
        $validated = $this->validateOwnedDlcRequest($request);
        $dlc = Dlc::findOrFail($validated['dlc_id']);

        if ((int) $dlc->game_id !== (int) $libraryGame->game_id) {
            throw ValidationException::withMessages(['dlc_id' => 'DLC does not belong to this game.']);
        }

        if ($libraryGame->ownedDlcs()->where('dlc_id', $dlc->id)->exists()) {
            throw ValidationException::withMessages(['dlc_id' => 'This DLC is already tracked for this library game.']);
        }

        $libraryGame->ownedDlcs()->create($this->ownedDlcAttributes($validated));

        return back();
    }

    public function updateOwnedDlc(Request $request, OwnedDlc $ownedDlc): RedirectResponse
    {
        $validated = $this->validateOwnedDlcRequest($request, requireDlc: false);

        $ownedDlc->update($this->ownedDlcAttributes([
            ...$validated,
            'dlc_id' => $ownedDlc->dlc_id,
        ]));

        return back();
    }

    public function destroyOwnedDlc(OwnedDlc $ownedDlc): RedirectResponse
    {
        $ownedDlc->delete();

        return back();
    }

    private function validateOwnedDlcRequest(Request $request, bool $requireDlc = true): array
    {
        return $request->validate([
            'dlc_id' => [$requireDlc ? 'required' : 'nullable', 'integer', 'exists:dlcs,id'],
            'acquisition_type' => ['required', 'string', Rule::in(self::DLC_ACQUISITION_TYPES)],
            'purchased_price' => ['nullable', 'numeric', 'min:0'],
            'purchased_at' => ['nullable', 'date'],
        ]);
    }

    private function ownedDlcAttributes(array $payload): array
    {
        $acquisitionType = $payload['acquisition_type'];

        return [
            'dlc_id' => Dlc::findOrFail($payload['dlc_id'])->id,
            'acquisition_type' => $acquisitionType,
            'purchased_price' => in_array($acquisitionType, ['Edition Included', 'Free'], true)
                ? 0
                : ($payload['purchased_price'] ?? null),
            'purchased_at' => $payload['purchased_at'] ?? null,
        ];
    }
}
