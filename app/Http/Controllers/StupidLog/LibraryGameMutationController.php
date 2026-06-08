<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Http\Requests\StupidLog\StoreLibraryGameRequest;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Status;
use App\Services\DuplicateDetectionService;
use App\Services\FinancialSnapshotRefreshService;
use App\Services\LibraryGameCreator;
use App\Services\LocalUserService;
use App\Services\SteamEnrichmentService;
use App\Services\SubscriptionMutationService;
use App\Services\TitleNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class LibraryGameMutationController extends Controller
{
    public function refreshDlcs(LibraryGame $libraryGame, SteamEnrichmentService $steam): RedirectResponse
    {
        $libraryGame->load('game.externalIds.provider');
        $steamAppId = $libraryGame->game->externalIds
            ->first(fn ($externalId) => $externalId->provider?->key === 'steam')
            ?->external_id;

        if (! $steamAppId) {
            throw ValidationException::withMessages(['dlcs' => 'Add a Steam App ID before refreshing DLCs.']);
        }

        try {
            $steam->refreshDlcCatalog($libraryGame->game, (string) $steamAppId);
        } catch (Throwable $exception) {
            throw ValidationException::withMessages(['dlcs' => 'Steam DLC refresh failed: '.$exception->getMessage()]);
        }

        return back();
    }

    public function updateLibraryGame(Request $request, LibraryGame $libraryGame, TitleNormalizer $normalizer): RedirectResponse
    {
        $libraryGame->load('game');

        $validated = $request->validate([
            'game' => ['required', 'array'],
            'game.title' => ['required', 'string', 'max:255'],
            'game.publisher' => ['nullable', 'string', 'max:255'],
            'game.description' => ['nullable', 'string'],
            'game.cover_path' => ['nullable', 'string', 'max:2048'],
            'game.base_price_default' => ['nullable', 'numeric', 'min:0'],
            'game.total_achievements' => ['nullable', 'integer', 'min:0'],

            'progress' => ['required', 'array'],
            'progress.status_id' => ['required', 'integer', 'exists:statuses,id'],
            'progress.playtime_hours' => ['nullable', 'numeric', 'min:0', 'max:999999.9'],
            'progress.earned_achievements' => ['nullable', 'integer', 'min:0'],
            'progress.first_played_at' => ['nullable', 'date'],
            'progress.last_played_at' => ['nullable', 'date', 'after_or_equal:progress.first_played_at'],
            'progress.completed_at' => ['nullable', 'date'],
        ]);

        $status = Status::findOrFail($validated['progress']['status_id']);
        $totalAchievements = $validated['game']['total_achievements'] ?? null;
        $earnedAchievements = $validated['progress']['earned_achievements'] ?? null;

        if ($totalAchievements !== null && $earnedAchievements !== null && $earnedAchievements > $totalAchievements) {
            throw ValidationException::withMessages(['progress.earned_achievements' => 'Earned achievements cannot exceed total achievements.']);
        }

        if ($status->name === '100%' && (! $totalAchievements || (int) $earnedAchievements !== (int) $totalAchievements)) {
            throw ValidationException::withMessages(['progress.status_id' => '100% requires earned achievements to equal total achievements.']);
        }

        if (in_array($status->name, ['Completed', '100%'], true) && empty($validated['progress']['completed_at'])) {
            throw ValidationException::withMessages(['progress.completed_at' => 'Completed date is required for Completed and 100%.']);
        }

        $gameUpdates = [
            'title' => $validated['game']['title'],
            'normalized_title' => $normalizer->normalize($validated['game']['title']),
            'publisher' => $validated['game']['publisher'] ?? null,
            'description' => $validated['game']['description'] ?? null,
            'base_price_default' => $validated['game']['base_price_default'] ?? null,
            'total_achievements' => $totalAchievements,
        ];

        if (array_key_exists('cover_path', $validated['game'])) {
            $gameUpdates['cover_path'] = $validated['game']['cover_path'];
        }

        $libraryGame->game->update($gameUpdates);

        $libraryGame->update([
            'status_id' => $status->id,
            'playtime_hours' => $validated['progress']['playtime_hours'] ?? 0,
            'earned_achievements' => $earnedAchievements,
            'first_played_at' => $validated['progress']['first_played_at'] ?? null,
            'last_played_at' => $validated['progress']['last_played_at'] ?? null,
            'completed_at' => in_array($status->name, ['Completed', '100%'], true)
                ? $validated['progress']['completed_at']
                : null,
        ]);

        return back();
    }

    public function destroyLibraryGame(
        LibraryGame $libraryGame,
        SubscriptionMutationService $mutations,
        FinancialSnapshotRefreshService $refresh,
    ): RedirectResponse
    {
        $mutations->assertLibraryGameDeletionAllowed($libraryGame);
        $libraryGame->load('ownershipCopies.subscriptionEntries');
        $subscriptions = $libraryGame->ownershipCopies
            ->flatMap->subscriptionEntries
            ->unique('id')
            ->values();
        $subscriptionPeriods = $subscriptions
            ->map(fn ($subscription) => [
                'started_at' => $subscription->started_at,
                'finished_at' => $subscription->finished_at,
            ])
            ->all();
        $userId = $libraryGame->user_id;

        DB::transaction(function () use ($libraryGame, $subscriptions, $mutations) {
            $libraryGame->delete();
            $subscriptions->each(
                fn ($subscription) => $mutations->recalculateUnlockedYears($subscription->refresh()),
            );
        });

        $refresh->refreshForCollectedSubscriptionPeriods($userId, $subscriptionPeriods);

        return redirect()->route('library');
    }

    public function updatePlatformDevices(Request $request, LibraryGame $libraryGame): RedirectResponse
    {
        $validated = $request->validate([
            'platform_id' => ['required', 'integer', 'exists:platforms,id'],
            'device_ids' => ['required', 'array', 'min:1'],
            'device_ids.*' => ['required', 'integer', 'exists:devices,id'],
        ]);

        $platform = Platform::with(['devices', 'ownershipTypes'])->findOrFail($validated['platform_id']);
        $allowedDeviceIds = $platform->devices->pluck('id')->all();
        $invalidDevices = array_diff($validated['device_ids'], $allowedDeviceIds);

        if ($invalidDevices) {
            throw ValidationException::withMessages(['device_ids' => 'Selected device is not allowed for this platform.']);
        }

        $duplicate = LibraryGame::where('user_id', $libraryGame->user_id)
            ->where('game_id', $libraryGame->game_id)
            ->where('platform_id', $platform->id)
            ->whereKeyNot($libraryGame->id)
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages(['platform_id' => 'This game already exists on the selected platform.']);
        }

        $allowedOwnershipIds = $platform->ownershipTypes->pluck('id')->all();
        $invalidOwnership = $libraryGame->ownershipCopies()
            ->whereNotIn('ownership_type_id', $allowedOwnershipIds)
            ->with('ownershipType')
            ->first();

        if ($invalidOwnership) {
            throw ValidationException::withMessages([
                'platform_id' => 'Current ownership type "'.$invalidOwnership->ownershipType?->name.'" is not allowed for this platform.',
            ]);
        }

        $libraryGame->update(['platform_id' => $platform->id]);
        $libraryGame->devices()->sync($validated['device_ids']);

        return back();
    }

    public function manualDuplicates(Request $request, DuplicateDetectionService $duplicates): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:255'],
            'release_date' => ['nullable', 'date'],
        ]);

        return response()->json([
            'duplicates' => $duplicates
                ->possibleManualDuplicates($validated['title'], $validated['release_date'] ?? null)
                ->map(fn ($game) => [
                    'id' => $game->id,
                    'title' => $game->title,
                    'release_year' => $game->release_date?->format('Y'),
                    'publisher' => $game->publisher,
                    'cover_url' => $game->cover_path ? asset('storage/'.$game->cover_path) : $game->cover_url_original,
                ])
                ->values(),
        ]);
    }

    public function storeLibraryGame(StoreLibraryGameRequest $request, LibraryGameCreator $creator, LocalUserService $users): RedirectResponse
    {
        $libraryGame = $creator->create($users->get(), $request->validated());

        return redirect()->route('games.show', $libraryGame);
    }

    public function uploadGameCover(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cover' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $path = $validated['cover']->store('covers/games', 'public');

        return response()->json([
            'path' => $path,
            'url' => asset('storage/'.$path),
        ], 201);
    }

}
