<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Http\Requests\StupidLog\StoreLibraryGameRequest;
use App\Http\Requests\StupidLog\UpdateSettingsRequest;
use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\Device;
use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\OwnedDlc;
use App\Models\StupidLog\PhysicalStatus;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\LibraryGameCreator;
use App\Services\DuplicateDetectionService;
use App\Services\ProviderSearchService;
use App\Services\SnapshotService;
use App\Services\StatsService;
use App\Services\SteamEnrichmentService;
use App\Services\TitleNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class StupidLogController extends Controller
{
    private const PHYSICAL_LIKE = ['Physical', 'Pre-owned', 'Borrowed'];
    private const DLC_ACQUISITION_TYPES = ['Owned', 'Edition Included', 'Free'];

    public function home(StatsService $stats): Response|RedirectResponse
    {
        if (! User::query()->exists() || ! AppSetting::query()->exists()) {
            return redirect()->route('setup');
        }

        $user = $this->localUser();
        $libraryGames = $this->libraryQuery($user)->latest()->take(6)->get();

        return Inertia::render('Home', [
            'user' => $user,
            'stats' => $stats->live($user),
            'recentGames' => $this->cards($libraryGames),
            'references' => $this->references(),
        ]);
    }

    public function library(): Response
    {
        $user = $this->localUser();

        return Inertia::render('Library', [
            'libraryGames' => $this->libraryGamesPayload($user, request())->get('items'),
            'libraryMeta' => $this->libraryMeta($user),
            'references' => $this->references(),
        ]);
    }

    public function libraryGames(Request $request): JsonResponse
    {
        return response()->json($this->libraryGamesPayload($this->localUser(), $request));
    }

    public function gameDetails(LibraryGame $libraryGame): Response
    {
        $libraryGame->load(['game.dlcs', 'platform.ownershipTypes', 'status', 'devices', 'ownershipCopies.ownershipType', 'ownershipCopies.physicalStatus', 'ownedDlcs.dlc']);

        return Inertia::render('GameDetails', [
            'libraryGame' => $this->card($libraryGame),
            'details' => $this->details($libraryGame),
            'references' => $this->references(),
            'dlcs' => $this->dlcs($libraryGame),
        ]);
    }

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
        $this->assertOwnershipCopyAllowed($ownershipCopy->libraryGame, $validated, $ownershipCopy->id);

        $ownershipCopy->update($this->ownershipCopyAttributes($validated));

        return back();
    }

    public function destroyOwnershipCopy(OwnershipCopy $ownershipCopy): RedirectResponse
    {
        if ($ownershipCopy->libraryGame->ownershipCopies()->count() <= 1) {
            return back()->withErrors(['ownership_copy' => 'At least one ownership copy is required.']);
        }

        $ownershipCopy->delete();

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
            'game.base_price_default' => ['nullable', 'numeric', 'min:0'],
            'game.total_achievements' => ['nullable', 'integer', 'min:0'],

            'progress' => ['required', 'array'],
            'progress.status_id' => ['required', 'integer', 'exists:statuses,id'],
            'progress.playtime_hours' => ['nullable', 'numeric', 'min:0', 'max:999999.9'],
            'progress.earned_achievements' => ['nullable', 'integer', 'min:0'],
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

        $libraryGame->game->update([
            'title' => $validated['game']['title'],
            'normalized_title' => $normalizer->normalize($validated['game']['title']),
            'publisher' => $validated['game']['publisher'] ?? null,
            'description' => $validated['game']['description'] ?? null,
            'base_price_default' => $validated['game']['base_price_default'] ?? null,
            'total_achievements' => $totalAchievements,
        ]);

        $libraryGame->update([
            'status_id' => $status->id,
            'playtime_hours' => $validated['progress']['playtime_hours'] ?? 0,
            'earned_achievements' => $earnedAchievements,
            'completed_at' => in_array($status->name, ['Completed', '100%'], true)
                ? $validated['progress']['completed_at']
                : null,
        ]);

        return back();
    }

    public function destroyLibraryGame(LibraryGame $libraryGame): RedirectResponse
    {
        $libraryGame->delete();

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

    public function stats(StatsService $stats): Response
    {
        $user = $this->localUser();

        return Inertia::render('Stats', [
            'stats' => $stats->live($user),
            'confirmedYears' => $stats->confirmedYears($user),
        ]);
    }

    public function snapshots(StatsService $stats): Response
    {
        $user = $this->localUser();
        $snapshotPage = $this->snapshotFeedPayload($user, request(), $stats);

        return Inertia::render('Snapshots', [
            'snapshots' => $snapshotPage['items'],
            'snapshotsNextCursor' => $snapshotPage['next_cursor'],
            'liveStats' => $stats->live($user),
            'currentYear' => (int) now()->format('Y'),
            'confirmedCurrentYear' => $stats->confirmedYear($user, (int) now()->format('Y')),
        ]);
    }

    public function snapshotFeed(Request $request, StatsService $stats): JsonResponse
    {
        return response()->json($this->snapshotFeedPayload($this->localUser(), $request, $stats));
    }

    public function snapshotDetails(SnapshotRun $snapshotRun, StatsService $stats, SnapshotService $snapshotService): Response
    {
        $user = $this->localUser();
        $snapshotPage = $this->snapshotFeedPayload($user, request(), $stats);
        $gameRows = $stats->snapshotRows($snapshotRun, request());
        $eligibleRows = $snapshotService->eligibleBestGames($snapshotRun, request());

        return Inertia::render('Snapshots', [
            'snapshots' => $snapshotPage['items'],
            'snapshotsNextCursor' => $snapshotPage['next_cursor'],
            'selectedSnapshot' => [
                ...$stats->snapshotSummary($snapshotRun),
                'games' => $gameRows['items'],
                'games_next_cursor' => $gameRows['next_cursor'],
                'eligible_best_games' => $eligibleRows['items'],
                'eligible_best_games_next_cursor' => $eligibleRows['next_cursor'],
            ],
            'liveStats' => $stats->live($user),
            'currentYear' => (int) now()->format('Y'),
            'confirmedCurrentYear' => $stats->confirmedYear($user, (int) now()->format('Y')),
        ]);
    }

    public function snapshotGames(Request $request, SnapshotRun $snapshotRun, StatsService $stats): JsonResponse
    {
        return response()->json($stats->snapshotRows($snapshotRun, $request));
    }

    public function snapshotEligibleBestGames(Request $request, SnapshotRun $snapshotRun, SnapshotService $snapshots): JsonResponse
    {
        return response()->json($snapshots->eligibleBestGames($snapshotRun, $request));
    }

    public function createSnapshot(Request $request, SnapshotService $snapshots): RedirectResponse
    {
        $validated = $request->validate(['year' => ['required', 'integer', 'min:1970', 'max:2100']]);
        $snapshots->createDraft($this->localUser(), (int) $validated['year']);

        return back();
    }

    public function confirmSnapshot(SnapshotRun $snapshotRun, SnapshotService $snapshots): RedirectResponse
    {
        $snapshots->confirm($snapshotRun);

        return back();
    }

    public function resnapSnapshot(SnapshotRun $snapshotRun, SnapshotService $snapshots): RedirectResponse
    {
        $snapshots->resnapDraft($snapshotRun);

        return back();
    }

    public function updateSnapshotBestGames(Request $request, SnapshotRun $snapshotRun, SnapshotService $snapshots): RedirectResponse
    {
        $validated = $request->validate([
            'library_game_ids' => ['nullable', 'array', 'max:5'],
            'library_game_ids.*' => ['integer', 'exists:library_games,id'],
        ]);

        $snapshots->updateBestGames($snapshotRun, $validated['library_game_ids'] ?? []);

        return back();
    }

    public function destroySnapshot(SnapshotRun $snapshotRun): RedirectResponse
    {
        $snapshotRun->delete();

        return redirect()->route('snapshots');
    }

    public function setup(): Response
    {
        return Inertia::render('Setup');
    }

    public function storeSetup(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'igdb_client_id' => ['nullable', 'string'],
            'igdb_client_secret' => ['nullable', 'string'],
            'steam_api_key' => ['nullable', 'string'],
        ]);

        $user = User::updateOrCreate(['id' => $this->localUser()->id], ['username' => $validated['username']]);
        AppSetting::updateOrCreate(['user_id' => $user->id], ['currency_code' => 'USD']);
        $this->storeCredential($user, 'igdb', $validated['igdb_client_id'] ?? null, $validated['igdb_client_secret'] ?? null, null);
        $this->storeCredential($user, 'steam', null, null, $validated['steam_api_key'] ?? null);

        return redirect()->route('home');
    }

    public function settings(): Response
    {
        $user = $this->localUser();
        $igdb = $this->credential($user, 'igdb');
        $steam = $this->credential($user, 'steam');

        return Inertia::render('Settings', [
            'user' => $user->load('settings'),
            'providers' => Provider::orderBy('name')->get(),
            'igdbCredential' => [
                'has_client_id' => (bool) $igdb?->encrypted_client_id,
                'has_client_secret' => (bool) $igdb?->encrypted_client_secret,
                'last_tested_at' => $igdb?->last_tested_at?->toIso8601String(),
                'last_test_status' => $igdb?->last_test_status,
            ],
            'steamCredential' => [
                'has_api_key' => (bool) $steam?->encrypted_api_key,
                'last_tested_at' => $steam?->last_tested_at?->toIso8601String(),
                'last_test_status' => $steam?->last_test_status,
            ],
        ]);
    }

    public function updateSettings(UpdateSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $this->localUser();

        $user->update(['username' => $validated['username']]);

        AppSetting::updateOrCreate(
            ['user_id' => $user->id],
            ['currency_code' => $user->settings?->currency_code ?? 'USD']
        );

        $this->storeCredential(
            $user,
            'igdb',
            $validated['igdb_client_id'] ?? null,
            $validated['igdb_client_secret'] ?? null,
            null,
            preserveBlankFields: true,
        );

        $this->storeCredential(
            $user,
            'steam',
            null,
            null,
            $validated['steam_api_key'] ?? null,
            preserveBlankFields: true,
        );

        return back();
    }

    public function resetApp(): RedirectResponse
    {
        $coverPaths = [];

        DB::transaction(function () use (&$coverPaths) {
            $coverPaths = Game::query()
                ->whereNotNull('cover_path')
                ->pluck('cover_path')
                ->merge(Dlc::query()->whereNotNull('cover_path')->pluck('cover_path'))
                ->filter()
                ->unique()
                ->values()
                ->all();

            User::query()->delete();
            Game::query()->delete();
        });

        if ($coverPaths !== []) {
            Storage::disk('public')->delete($coverPaths);
        }

        return redirect()->route('setup');
    }

    public function testIgdbCredentials(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'igdb_client_id' => ['nullable', 'string'],
            'igdb_client_secret' => ['nullable', 'string'],
        ]);

        $user = $this->localUser();
        $credential = $this->credential($user, 'igdb');
        $clientId = ($validated['igdb_client_id'] ?? null) ?: ($credential?->encrypted_client_id ? Crypt::decryptString($credential->encrypted_client_id) : null);
        $clientSecret = ($validated['igdb_client_secret'] ?? null) ?: ($credential?->encrypted_client_secret ? Crypt::decryptString($credential->encrypted_client_secret) : null);

        if (! $clientId || ! $clientSecret) {
            return response()->json([
                'ok' => false,
                'message' => 'Add both IGDB Client ID and Client Secret before testing.',
            ], 422);
        }

        try {
            $token = Http::asForm()
                ->post('https://id.twitch.tv/oauth2/token', [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'grant_type' => 'client_credentials',
                ])
                ->throw()
                ->json('access_token');

            Http::withHeaders([
                'Client-ID' => $clientId,
                'Authorization' => 'Bearer '.$token,
            ])->withBody('fields name; limit 1;', 'text/plain')
                ->post('https://api.igdb.com/v4/games')
                ->throw();

            $this->markCredentialTest($credential, 'ok');

            return response()->json([
                'ok' => true,
                'message' => 'IGDB credentials work.',
            ]);
        } catch (Throwable $exception) {
            $this->markCredentialTest($credential, 'failed');

            return response()->json([
                'ok' => false,
                'message' => 'IGDB test failed: '.$exception->getMessage(),
            ], 422);
        }
    }

    public function testSteamCredentials(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'steam_api_key' => ['nullable', 'string'],
        ]);

        $user = $this->localUser();
        $credential = $this->credential($user, 'steam');
        $apiKey = ($validated['steam_api_key'] ?? null) ?: ($credential?->encrypted_api_key ? Crypt::decryptString($credential->encrypted_api_key) : null);

        if (! $apiKey) {
            return response()->json([
                'ok' => false,
                'message' => 'Add a Steam API key before testing.',
            ], 422);
        }

        try {
            Http::get('https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/', [
                'key' => $apiKey,
            ])->throw();

            $this->markCredentialTest($credential, 'ok');

            return response()->json([
                'ok' => true,
                'message' => 'Steam API key works.',
            ]);
        } catch (Throwable $exception) {
            $this->markCredentialTest($credential, 'failed');

            return response()->json([
                'ok' => false,
                'message' => 'Steam test failed: '.$exception->getMessage(),
            ], 422);
        }
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

    public function storeLibraryGame(StoreLibraryGameRequest $request, LibraryGameCreator $creator): RedirectResponse
    {
        $libraryGame = $creator->create($this->localUser(), $request->validated());

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

    public function providerSearch(Request $request, ProviderSearchService $providers): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'min:2'],
            'provider' => ['nullable', 'string', Rule::in(['igdb', 'steam'])],
            'enrich' => ['nullable', 'boolean'],
            'steam_app_id' => ['nullable', 'string', 'max:255'],
        ]);

        return response()->json($providers->search(
            $this->localUser(),
            $validated['query'],
            $validated['provider'] ?? 'igdb',
            (bool) ($validated['enrich'] ?? false),
            $validated['steam_app_id'] ?? null,
        ));
    }

    private function libraryGamesPayload(User $user, Request $request)
    {
        $limit = $this->boundedLimit($request, 40, 120);
        $offset = $this->decodeOffsetCursor($request->string('cursor')->toString());
        $sort = $request->string('sort')->toString() ?: 'title';
        $query = trim($request->string('query')->toString());
        $status = $request->string('status')->toString();
        $platform = $request->string('platform')->toString();

        $builder = $this->libraryQuery($user);

        if ($query !== '') {
            $builder->where(function ($scope) use ($query) {
                $scope->whereHas('game', function ($gameQuery) use ($query) {
                    $gameQuery->where('title', 'like', "%{$query}%")
                        ->orWhere('publisher', 'like', "%{$query}%");
                })->orWhereHas('platform', fn ($platformQuery) => $platformQuery->where('name', 'like', "%{$query}%"))
                    ->orWhereHas('devices', fn ($deviceQuery) => $deviceQuery->where('name', 'like', "%{$query}%"))
                    ->orWhereHas('ownershipCopies.ownershipType', fn ($ownershipQuery) => $ownershipQuery->where('name', 'like', "%{$query}%"));
            });
        }

        if ($status !== '' && strcasecmp($status, 'All') !== 0) {
            $builder->whereHas('status', fn ($statusQuery) => $statusQuery->where('name', $status));
        }

        if ($platform !== '' && strcasecmp($platform, 'All') !== 0) {
            $builder->whereHas('platform', fn ($platformQuery) => $platformQuery->where('name', $platform));
        }

        match ($sort) {
            'playtime' => $builder->orderByDesc('playtime_hours')->orderBy('id'),
            'progress' => $builder
                ->leftJoin('games as sort_games', 'sort_games.id', '=', 'library_games.game_id')
                ->select('library_games.*')
                ->orderByRaw('case when sort_games.total_achievements > 0 then coalesce(library_games.earned_achievements, 0) * 1.0 / sort_games.total_achievements else 0 end desc')
                ->orderBy('library_games.id'),
            default => $builder
                ->join('games as sort_games', 'sort_games.id', '=', 'library_games.game_id')
                ->select('library_games.*')
                ->orderBy('sort_games.title')
                ->orderBy('library_games.id'),
        };

        $rows = $builder->skip($offset)->take($limit + 1)->get();
        $items = $rows->take($limit)->values();

        return collect([
            'items' => $this->cards($items),
            'next_cursor' => $rows->count() > $limit ? $this->encodeOffsetCursor($offset + $limit) : null,
            'has_more' => $rows->count() > $limit,
        ]);
    }

    private function libraryMeta(User $user): array
    {
        $totals = LibraryGame::query()
            ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
            ->where('library_games.user_id', $user->id)
            ->selectRaw('count(*) as library_games')
            ->selectRaw("sum(case when statuses.name in ('Completed', '100%') then 1 else 0 end) as completed")
            ->selectRaw('sum(library_games.playtime_hours) as playtime_hours')
            ->first();

        return [
            'total' => (int) ($totals?->library_games ?? 0),
            'completed' => (int) ($totals?->completed ?? 0),
            'playtime_hours' => (float) ($totals?->playtime_hours ?? 0),
            'statuses' => LibraryGame::query()
                ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
                ->where('library_games.user_id', $user->id)
                ->groupBy('statuses.name')
                ->orderBy('statuses.name')
                ->selectRaw('statuses.name, count(*) as count')
                ->get()
                ->mapWithKeys(fn ($row) => [$row->name => (int) $row->count])
                ->all(),
            'platforms' => LibraryGame::query()
                ->join('platforms', 'platforms.id', '=', 'library_games.platform_id')
                ->where('library_games.user_id', $user->id)
                ->groupBy('platforms.name')
                ->orderBy('platforms.name')
                ->selectRaw('platforms.name, count(*) as count')
                ->get()
                ->mapWithKeys(fn ($row) => [$row->name => (int) $row->count])
                ->all(),
        ];
    }

    private function snapshotFeedPayload(User $user, Request $request, StatsService $stats): array
    {
        $limit = $this->boundedLimit($request, 30, 100);
        $offset = $this->decodeOffsetCursor($request->string('cursor')->toString());
        $rows = SnapshotRun::where('user_id', $user->id)
            ->latest()
            ->skip($offset)
            ->take($limit + 1)
            ->get();

        return [
            'items' => $rows->take($limit)->map(fn (SnapshotRun $snapshot) => $stats->snapshotSummary($snapshot))->values(),
            'next_cursor' => $rows->count() > $limit ? $this->encodeOffsetCursor($offset + $limit) : null,
            'has_more' => $rows->count() > $limit,
        ];
    }

    private function boundedLimit(Request $request, int $default, int $max): int
    {
        $limit = (int) $request->integer('limit', $default);

        return max(1, min($limit, $max));
    }

    private function encodeOffsetCursor(int $offset): string
    {
        return rtrim(strtr(base64_encode((string) $offset), '+/', '-_'), '=');
    }

    private function decodeOffsetCursor(?string $cursor): int
    {
        if (! $cursor) {
            return 0;
        }

        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);

        return is_numeric($decoded) ? max(0, (int) $decoded) : 0;
    }

    private function references(): array
    {
        return [
            'platforms' => Platform::with(['devices', 'ownershipTypes'])->orderBy('name')->get(),
            'devices' => Device::orderBy('name')->get(),
            'ownershipTypes' => OwnershipType::orderBy('name')->get(),
            'physicalStatuses' => PhysicalStatus::orderBy('name')->get(),
            'statuses' => Status::orderBy('name')->get(),
        ];
    }

    private function localUser(): User
    {
        return User::first() ?? User::create(['username' => 'Player One', 'avatar_path' => null]);
    }

    private function libraryQuery(User $user)
    {
        return LibraryGame::where('user_id', $user->id)
            ->with(['game', 'platform', 'status', 'devices', 'ownershipCopies.ownershipType']);
    }

    private function cards($libraryGames)
    {
        return $libraryGames->map(fn (LibraryGame $libraryGame) => $this->card($libraryGame))->values();
    }

    private function card(LibraryGame $libraryGame): array
    {
        $game = $libraryGame->game;

        return [
            'id' => $libraryGame->id,
            'title' => $game->title,
            'publisher' => $game->publisher,
            'description' => $game->description,
            'cover_url' => $game->cover_path ? asset('storage/'.$game->cover_path) : $game->cover_url_original,
            'platform' => $libraryGame->platform->name,
            'status' => $libraryGame->status->name,
            'status_color_key' => $libraryGame->status->color_key,
            'status_color_hex' => $libraryGame->status->color_hex,
            'playtime_hours' => (float) $libraryGame->playtime_hours,
            'earned_achievements' => $libraryGame->earned_achievements ?? 0,
            'total_achievements' => $game->total_achievements ?? 0,
            'completed_at' => $libraryGame->completed_at?->format('Y-m-d'),
            'progress' => $game->total_achievements ? round((($libraryGame->earned_achievements ?? 0) / $game->total_achievements) * 100) : 0,
            'ownership' => $libraryGame->ownershipCopies->map(fn ($copy) => $copy->ownershipType?->name ?? OwnershipType::find($copy->ownership_type_id)?->name)->filter()->values(),
            'devices' => $libraryGame->devices->pluck('name')->values(),
            'base_price_default' => $game->base_price_default,
        ];
    }

    private function details(LibraryGame $libraryGame): array
    {
        return [
            'platform_id' => $libraryGame->platform_id,
            'device_ids' => $libraryGame->devices->pluck('id')->values(),
            'ownership_copies' => $libraryGame->ownershipCopies->map(fn (OwnershipCopy $copy) => [
                'id' => $copy->id,
                'ownership_type_id' => $copy->ownership_type_id,
                'ownership_type' => $copy->ownershipType?->name,
                'physical_status_id' => $copy->physical_status_id,
                'physical_status' => $copy->physicalStatus?->name,
                'edition_name' => $copy->edition_name,
                'base_price' => $copy->base_price,
                'purchased_price' => $copy->purchased_price,
                'purchased_at' => $copy->purchased_at?->format('Y-m-d'),
            ])->values(),
            'platform_ownership_types' => $libraryGame->platform->ownershipTypes->map(fn (OwnershipType $type) => [
                'id' => $type->id,
                'name' => $type->name,
            ])->values(),
        ];
    }

    private function dlcs(LibraryGame $libraryGame)
    {
        return $libraryGame->game->dlcs->map(function (Dlc $dlc) use ($libraryGame) {
            $ownedDlc = $libraryGame->ownedDlcs->firstWhere('dlc_id', $dlc->id);

            return [
                'id' => $dlc->id,
                'owned_dlc_id' => $ownedDlc?->id,
                'title' => $dlc->title,
                'base_price' => $dlc->base_price,
                'cover_url' => $dlc->cover_path ? asset('storage/'.$dlc->cover_path) : $dlc->cover_url_original,
                'state' => $ownedDlc?->acquisition_type ?? 'Not Owned',
                'purchased_price' => $ownedDlc?->purchased_price,
                'purchased_at' => $ownedDlc?->purchased_at?->format('Y-m-d'),
            ];
        })->values();
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

    private function storeCredential(User $user, string $providerKey, ?string $clientId, ?string $clientSecret, ?string $apiKey, bool $preserveBlankFields = false): void
    {
        $provider = Provider::where('key', $providerKey)->first();
        if (! $provider || (! $clientId && ! $clientSecret && ! $apiKey)) {
            return;
        }

        $existing = ProviderCredential::where('user_id', $user->id)
            ->where('provider_id', $provider->id)
            ->first();

        ProviderCredential::updateOrCreate(
            ['user_id' => $user->id, 'provider_id' => $provider->id],
            [
                'encrypted_client_id' => $clientId ? Crypt::encryptString($clientId) : ($preserveBlankFields ? $existing?->encrypted_client_id : null),
                'encrypted_client_secret' => $clientSecret ? Crypt::encryptString($clientSecret) : ($preserveBlankFields ? $existing?->encrypted_client_secret : null),
                'encrypted_api_key' => $apiKey ? Crypt::encryptString($apiKey) : ($preserveBlankFields ? $existing?->encrypted_api_key : null),
                'is_enabled' => true,
                'last_tested_at' => now(),
                'last_test_status' => 'stored',
            ],
        );
    }

    private function credential(User $user, string $providerKey): ?ProviderCredential
    {
        $provider = Provider::where('key', $providerKey)->first();
        if (! $provider) {
            return null;
        }

        return ProviderCredential::where('user_id', $user->id)
            ->where('provider_id', $provider->id)
            ->first();
    }

    private function markCredentialTest(?ProviderCredential $credential, string $status): void
    {
        if (! $credential) {
            return;
        }

        $credential->update([
            'last_tested_at' => now(),
            'last_test_status' => $status,
        ]);
    }
}
