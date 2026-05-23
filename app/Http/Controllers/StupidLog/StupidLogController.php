<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Http\Requests\StupidLog\StoreLibraryGameRequest;
use App\Http\Requests\StupidLog\UpdateSettingsRequest;
use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\Currency;
use App\Models\StupidLog\Device;
use App\Models\StupidLog\Dlc;
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
use App\Services\ProviderSearchService;
use App\Services\SnapshotService;
use App\Services\StatsService;
use App\Services\SteamEnrichmentService;
use App\Services\TitleNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class StupidLogController extends Controller
{
    private const PHYSICAL_LIKE = ['Physical', 'Pre-owned', 'Borrowed'];
    private const DLC_ACQUISITION_TYPES = ['Owned', 'Edition Included', 'Free'];

    public function home(StatsService $stats): Response
    {
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
            'libraryGames' => $this->cards($this->libraryQuery($user)->latest()->get()),
            'references' => $this->references(),
        ]);
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
        return Inertia::render('Stats', ['stats' => $stats->live($this->localUser())]);
    }

    public function snapshots(StatsService $stats): Response
    {
        $user = $this->localUser();
        $snapshots = SnapshotRun::where('user_id', $user->id)->latest()->get();

        return Inertia::render('Snapshots', [
            'snapshots' => $snapshots,
            'currentYear' => (int) now()->format('Y'),
            'confirmedCurrentYear' => $stats->confirmedYear($user, (int) now()->format('Y')),
        ]);
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

    public function setup(): Response
    {
        return Inertia::render('Setup', [
            'currencies' => Currency::orderBy('code')->pluck('code'),
        ]);
    }

    public function storeSetup(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'currency_code' => ['required', 'exists:currencies,code'],
            'igdb_client_id' => ['nullable', 'string'],
            'igdb_client_secret' => ['nullable', 'string'],
        ]);

        $user = User::updateOrCreate(['id' => $this->localUser()->id], ['username' => $validated['username']]);
        AppSetting::updateOrCreate(['user_id' => $user->id], ['currency_code' => $validated['currency_code']]);
        $this->storeCredential($user, 'igdb', $validated['igdb_client_id'] ?? null, $validated['igdb_client_secret'] ?? null, null);

        return redirect()->route('home');
    }

    public function settings(): Response
    {
        $user = $this->localUser();
        $igdb = $this->credential($user, 'igdb');
        $steam = $this->credential($user, 'steam');

        return Inertia::render('Settings', [
            'user' => $user->load('settings'),
            'currencies' => Currency::orderBy('code')->pluck('code'),
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
            ['currency_code' => $validated['currency_code']]
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
            'playtime_hours' => (float) $libraryGame->playtime_hours,
            'earned_achievements' => $libraryGame->earned_achievements ?? 0,
            'total_achievements' => $game->total_achievements ?? 0,
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
