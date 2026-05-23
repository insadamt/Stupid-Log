<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Http\Requests\StupidLog\StoreLibraryGameRequest;
use App\Http\Requests\StupidLog\UpdateSettingsRequest;
use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\Currency;
use App\Models\StupidLog\Device;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipType;
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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class StupidLogController extends Controller
{
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
        $libraryGame->load(['game.dlcs', 'platform', 'status', 'devices', 'ownershipCopies', 'ownedDlcs.dlc']);

        return Inertia::render('GameDetails', [
            'libraryGame' => $this->card($libraryGame),
            'dlcs' => $libraryGame->game->dlcs->map(fn ($dlc) => [
                'id' => $dlc->id,
                'title' => $dlc->title,
                'base_price' => $dlc->base_price,
                'state' => $libraryGame->ownedDlcs->firstWhere('dlc_id', $dlc->id)?->acquisition_type ?? 'Not Owned',
            ])->values(),
        ]);
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
            'url' => Storage::disk('public')->url($path),
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
