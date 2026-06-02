<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\SubscriptionEntry;
use App\Services\FinancialSnapshotRefreshService;
use App\Services\LocalUserService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(LocalUserService $localUser): Response
    {
        $user = $localUser->get();

        return Inertia::render('Subscriptions', [
            'subscriptionEntries' => $this->subscriptionEntriesForUser($user->id),
            'subscriptionOwnershipTypes' => OwnershipType::where('is_subscription', true)
                ->orderBy('name')
                ->get(['id', 'name', 'is_subscription']),
            'ownershipCopies' => $this->ownershipCopiesForUser($user->id),
        ]);
    }

    public function store(Request $request, LocalUserService $localUser, FinancialSnapshotRefreshService $refresh): RedirectResponse
    {
        $validated = $this->validateSubscription($request);

        $entry = SubscriptionEntry::create([
            ...$validated,
            'user_id' => $localUser->get()->id,
        ]);

        $refresh->refreshForSubscriptionCreated($entry);

        return back();
    }

    public function update(Request $request, SubscriptionEntry $subscriptionEntry, LocalUserService $localUser, FinancialSnapshotRefreshService $refresh): RedirectResponse
    {
        $this->assertSubscriptionBelongsToLocalUser($subscriptionEntry, $localUser);
        $validated = $this->validateSubscription($request);
        $oldValues = $subscriptionEntry->only(['started_at', 'finished_at']);
        $ownershipTypeChanged = (int) $subscriptionEntry->ownership_type_id !== (int) $validated['ownership_type_id'];

        DB::transaction(function () use ($subscriptionEntry, $validated, $ownershipTypeChanged) {
            $subscriptionEntry->update($validated);

            if ($ownershipTypeChanged) {
                $subscriptionEntry->ownershipCopies()->sync([]);
            }
        });

        $refresh->refreshForSubscriptionUpdated($subscriptionEntry->refresh(), $oldValues);

        return back();
    }

    public function destroy(SubscriptionEntry $subscriptionEntry, LocalUserService $localUser, FinancialSnapshotRefreshService $refresh): RedirectResponse
    {
        $this->assertSubscriptionBelongsToLocalUser($subscriptionEntry, $localUser);
        $oldEntry = clone $subscriptionEntry;
        $subscriptionEntry->delete();
        $refresh->refreshForSubscriptionDeleted($oldEntry);

        return back();
    }

    public function updateOwnershipCopies(Request $request, SubscriptionEntry $subscriptionEntry, LocalUserService $localUser, FinancialSnapshotRefreshService $refresh): RedirectResponse
    {
        $userId = $this->assertSubscriptionBelongsToLocalUser($subscriptionEntry, $localUser)->id;
        $validated = $request->validate([
            'ownership_copy_ids' => ['array'],
            'ownership_copy_ids.*' => ['integer', 'exists:ownership_copies,id'],
        ]);
        $copyIds = collect($validated['ownership_copy_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
        $copies = OwnershipCopy::with('libraryGame')
            ->whereIn('id', $copyIds)
            ->get();

        if ($copies->count() !== $copyIds->count()) {
            throw ValidationException::withMessages(['ownership_copy_ids' => 'Selected ownership copies are invalid.']);
        }

        foreach ($copies as $copy) {
            if ((int) $copy->libraryGame->user_id !== (int) $userId) {
                throw ValidationException::withMessages(['ownership_copy_ids' => 'Selected ownership copies must belong to the local user.']);
            }

            if ((int) $copy->ownership_type_id !== (int) $subscriptionEntry->ownership_type_id) {
                throw ValidationException::withMessages(['ownership_copy_ids' => 'Selected ownership copies must match the subscription ownership type.']);
            }
        }

        $subscriptionEntry->ownershipCopies()->sync($copyIds->all());
        $refresh->refreshForSubscriptionOwnershipCopiesChanged($subscriptionEntry->refresh());

        return back();
    }

    private function validateSubscription(Request $request): array
    {
        return $request->validate([
            'ownership_type_id' => [
                'required',
                'integer',
                Rule::exists('ownership_types', 'id')->where('is_subscription', true),
            ],
            'amount_paid' => ['required', 'numeric', 'min:0.01'],
            'started_at' => ['required', 'date'],
            'finished_at' => ['required', 'date', 'after_or_equal:started_at'],
        ]);
    }

    private function assertSubscriptionBelongsToLocalUser(SubscriptionEntry $subscriptionEntry, LocalUserService $localUser)
    {
        $user = $localUser->get();

        if ((int) $subscriptionEntry->user_id !== (int) $user->id) {
            abort(403);
        }

        return $user;
    }

    private function subscriptionEntriesForUser(int $userId)
    {
        return SubscriptionEntry::with(['ownershipType', 'ownershipCopies'])
            ->where('user_id', $userId)
            ->latest('started_at')
            ->get()
            ->map(fn (SubscriptionEntry $entry) => [
                'id' => $entry->id,
                'ownership_type_id' => $entry->ownership_type_id,
                'ownership_type' => $entry->ownershipType?->name,
                'amount_paid' => $entry->amount_paid,
                'started_at' => $entry->started_at?->format('Y-m-d'),
                'finished_at' => $entry->finished_at?->format('Y-m-d'),
                'selected_ownership_copy_ids' => $entry->ownershipCopies->pluck('id')->values(),
                'selected_count' => $entry->ownershipCopies->count(),
            ])
            ->values();
    }

    private function ownershipCopiesForUser(int $userId)
    {
        return OwnershipCopy::with(['ownershipType', 'libraryGame.game', 'libraryGame.platform'])
            ->whereHas('libraryGame', fn ($query) => $query->where('user_id', $userId))
            ->orderBy('id')
            ->get()
            ->map(fn (OwnershipCopy $copy) => [
                'id' => $copy->id,
                'ownership_type_id' => $copy->ownership_type_id,
                'ownership_type' => $copy->ownershipType?->name,
                'library_game_id' => $copy->library_game_id,
                'game_title' => $copy->libraryGame->game->title,
                'platform' => $copy->libraryGame->platform->name,
                'cover_url' => $copy->libraryGame->game->cover_path ? asset('storage/'.$copy->libraryGame->game->cover_path) : $copy->libraryGame->game->cover_url_original,
            ])
            ->values();
    }
}
