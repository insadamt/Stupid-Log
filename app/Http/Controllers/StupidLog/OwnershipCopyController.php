<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Services\FinancialSnapshotRefreshService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OwnershipCopyController extends Controller
{
    private const PHYSICAL_LIKE = ['Physical', 'Pre-owned', 'Borrowed'];

    public function storeOwnershipCopy(Request $request, LibraryGame $libraryGame): RedirectResponse
    {
        $validated = $this->validateOwnershipCopyRequest($request);
        $this->assertOwnershipCopyAllowed($libraryGame, $validated);

        $libraryGame->ownershipCopies()->create($this->ownershipCopyAttributes($validated));

        return back();
    }

    public function updateOwnershipCopy(Request $request, OwnershipCopy $ownershipCopy): RedirectResponse
    {
        $ownershipCopy->load('libraryGame.platform.ownershipTypes');
        $validated = $this->validateOwnershipCopyRequest($request);
        $this->assertSubscriptionOwnershipTypeChangeAllowed($ownershipCopy, $validated);
        $this->assertOwnershipCopyAllowed($ownershipCopy->libraryGame, $validated, $ownershipCopy->id);

        $ownershipCopy->update($this->ownershipCopyAttributes($validated));

        return back();
    }

    public function destroyOwnershipCopy(OwnershipCopy $ownershipCopy, FinancialSnapshotRefreshService $refresh): RedirectResponse
    {
        if ($ownershipCopy->libraryGame->ownershipCopies()->count() <= 1) {
            return back()->withErrors(['ownership_copy' => 'At least one ownership copy is required.']);
        }

        $ownershipCopy->load(['libraryGame', 'subscriptionEntries']);
        $subscriptionPeriods = $ownershipCopy->subscriptionEntries
            ->map(fn ($entry) => [
                'started_at' => $entry->started_at,
                'finished_at' => $entry->finished_at,
            ])
            ->all();
        $userId = $ownershipCopy->libraryGame->user_id;

        $ownershipCopy->delete();
        $refresh->refreshForCollectedSubscriptionPeriods($userId, $subscriptionPeriods);

        return back();
    }

    private function validateOwnershipCopyRequest(Request $request): array
    {
        return $request->validate([
            'ownership_type_id' => ['required', 'integer', 'exists:ownership_types,id'],
            'physical_status_id' => ['nullable', 'integer', 'exists:physical_statuses,id'],
            'edition_name' => ['nullable', 'string', 'max:255'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'purchased_price' => ['nullable', 'numeric', 'min:0'],
            'purchased_at' => ['nullable', 'date'],
        ]);
    }

    private function assertOwnershipCopyAllowed(LibraryGame $libraryGame, array $payload, ?int $ignoreCopyId = null): void
    {
        $libraryGame->loadMissing('platform.ownershipTypes');
        $ownershipType = OwnershipType::findOrFail($payload['ownership_type_id']);
        $allowedIds = $libraryGame->platform->ownershipTypes->pluck('id')->all();

        if (! in_array($ownershipType->id, $allowedIds, true)) {
            throw ValidationException::withMessages(['ownership_type_id' => 'Ownership type is not allowed for this platform.']);
        }

        $duplicateQuery = $libraryGame->ownershipCopies()
            ->where('ownership_type_id', $ownershipType->id);

        if ($ignoreCopyId) {
            $duplicateQuery->whereKeyNot($ignoreCopyId);
        }

        if ($duplicateQuery->exists()) {
            throw ValidationException::withMessages(['ownership_type_id' => 'This ownership type already exists for this library game.']);
        }

        if (in_array($ownershipType->name, self::PHYSICAL_LIKE, true) && empty($payload['physical_status_id'])) {
            throw ValidationException::withMessages(['physical_status_id' => 'Physical-like ownership requires physical status.']);
        }
    }

    private function assertSubscriptionOwnershipTypeChangeAllowed(OwnershipCopy $ownershipCopy, array $payload): void
    {
        if ((int) $ownershipCopy->ownership_type_id === (int) $payload['ownership_type_id']) {
            return;
        }

        if ($ownershipCopy->subscriptionEntries()->exists()) {
            throw ValidationException::withMessages([
                'ownership_type_id' => 'This ownership copy is used by subscription entries. Remove it from those subscriptions before changing ownership type.',
            ]);
        }
    }

    private function ownershipCopyAttributes(array $payload): array
    {
        $ownershipType = OwnershipType::findOrFail($payload['ownership_type_id']);

        return [
            'ownership_type_id' => $ownershipType->id,
            'physical_status_id' => in_array($ownershipType->name, self::PHYSICAL_LIKE, true)
                ? ($payload['physical_status_id'] ?? null)
                : null,
            'edition_name' => $payload['edition_name'] ?? null,
            'base_price' => $payload['base_price'] ?? null,
            'purchased_price' => $payload['purchased_price'] ?? null,
            'purchased_at' => $payload['purchased_at'] ?? null,
        ];
    }
}
