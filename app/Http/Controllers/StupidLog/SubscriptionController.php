<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\SubscriptionEntry;
use App\Services\ClosedFinancialYearService;
use App\Services\FinancialSnapshotRefreshService;
use App\Services\LocalUserService;
use App\Services\SubscriptionMutationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(
        LocalUserService $localUser,
        ClosedFinancialYearService $closedYears,
    ): Response
    {
        $user = $localUser->get();
        $closedFinancialYear = $closedYears->closedFinancialYear($user);

        return Inertia::render('Subscriptions', [
            'subscriptionEntries' => $this->subscriptionEntriesForUser($user->id),
            'subscriptionOwnershipTypes' => OwnershipType::where('is_subscription', true)
                ->orderBy('name')
                ->get(['id', 'name', 'is_subscription']),
            'ownershipCopies' => $this->ownershipCopiesForUser($user->id),
            'closedFinancialYear' => $closedFinancialYear,
            'firstEditableDate' => $closedYears->firstEditableDate($user)?->format('Y-m-d'),
        ]);
    }

    public function store(
        Request $request,
        LocalUserService $localUser,
        FinancialSnapshotRefreshService $refresh,
        SubscriptionMutationService $mutations,
    ): RedirectResponse
    {
        $validated = $this->validateSubscription($request);
        $user = $localUser->get();

        $entry = DB::transaction(function () use ($validated, $user, $mutations) {
            $entry = SubscriptionEntry::create([
                ...$validated,
                'user_id' => $user->id,
            ]);
            $mutations->createYearlyAllocations($entry);

            return $entry;
        });

        $refresh->refreshForSubscriptionCreated($entry);

        return back();
    }

    public function update(
        Request $request,
        SubscriptionEntry $subscriptionEntry,
        LocalUserService $localUser,
        FinancialSnapshotRefreshService $refresh,
        SubscriptionMutationService $mutations,
    ): RedirectResponse
    {
        $this->assertSubscriptionBelongsToLocalUser($subscriptionEntry, $localUser);
        $validated = $this->validateSubscription($request);
        $mutations->assertCoreChangesAllowed($subscriptionEntry, $validated);
        $oldValues = $subscriptionEntry->only(['started_at', 'finished_at']);
        $ownershipTypeChanged = (int) $subscriptionEntry->ownership_type_id !== (int) $validated['ownership_type_id'];

        DB::transaction(function () use ($subscriptionEntry, $validated, $ownershipTypeChanged, $mutations) {
            $subscriptionEntry->update($validated);
            $mutations->synchronizeAfterCoreUpdate(
                $subscriptionEntry->refresh(),
                $ownershipTypeChanged,
            );
        });

        $refresh->refreshForSubscriptionUpdated($subscriptionEntry->refresh(), $oldValues);

        return back();
    }

    public function destroy(
        SubscriptionEntry $subscriptionEntry,
        LocalUserService $localUser,
        FinancialSnapshotRefreshService $refresh,
        SubscriptionMutationService $mutations,
    ): RedirectResponse
    {
        $this->assertSubscriptionBelongsToLocalUser($subscriptionEntry, $localUser);
        $mutations->assertDeletionAllowed($subscriptionEntry);
        $oldEntry = clone $subscriptionEntry;
        $subscriptionEntry->delete();
        $refresh->refreshForSubscriptionDeleted($oldEntry);

        return back();
    }

    public function updateOwnershipCopies(
        Request $request,
        SubscriptionEntry $subscriptionEntry,
        LocalUserService $localUser,
        FinancialSnapshotRefreshService $refresh,
        SubscriptionMutationService $mutations,
    ): RedirectResponse
    {
        $userId = $this->assertSubscriptionBelongsToLocalUser($subscriptionEntry, $localUser)->id;
        $validated = $request->validate([
            'ownership_copy_ids' => ['array'],
            'ownership_copy_ids.*' => ['integer', 'distinct', 'exists:ownership_copies,id'],
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

        $currentCopyIds = $subscriptionEntry->ownershipCopies()
            ->pluck('ownership_copies.id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $removedCopyIds = array_values(array_diff($currentCopyIds, $copyIds->all()));
        $mutations->assertCopiesCanBeRemoved($subscriptionEntry, $removedCopyIds);

        DB::transaction(function () use ($subscriptionEntry, $copyIds, $mutations) {
            $subscriptionEntry->ownershipCopies()->sync($copyIds->all());
            $mutations->recalculateUnlockedYears($subscriptionEntry->refresh());
        });

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
        return SubscriptionEntry::with([
            'ownershipType',
            'ownershipCopies',
            'years.lockedBySnapshotRun',
            'years.ownershipCopyAllocations',
        ])
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
                'has_locked_years' => $entry->years->contains('is_locked', true),
                'locked_ownership_copy_ids' => $entry->years
                    ->where('is_locked', true)
                    ->flatMap(fn ($year) => $year->ownershipCopyAllocations->pluck('ownership_copy_id'))
                    ->unique()
                    ->values(),
                'years' => $entry->years
                    ->sortBy('year')
                    ->map(fn ($year) => [
                        'id' => $year->id,
                        'year' => $year->year,
                        'amount_allocated' => $year->amount_allocated,
                        'is_locked' => $year->is_locked,
                        'locked_by_snapshot_year' => $year->lockedBySnapshotRun?->year,
                        'allocations' => $year->ownershipCopyAllocations
                            ->sortBy('ownership_copy_id')
                            ->map(fn ($allocation) => [
                                'ownership_copy_id' => $allocation->ownership_copy_id,
                                'allocated_amount' => $allocation->allocated_amount,
                            ])
                            ->values(),
                    ])
                    ->values(),
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
