<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Http\Requests\StupidLog\UpdateSettingsRequest;
use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\StupidLog\ProviderImportDraft;
use App\Models\User;
use App\Services\LocalUserService;
use App\Services\ProviderCredentialService;
use App\Services\ProviderCredentialTestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function settings(LocalUserService $users): Response
    {
        $user = $users->get();
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

    public function updateSettings(
        UpdateSettingsRequest $request,
        LocalUserService $users,
        ProviderCredentialService $credentials,
    ): RedirectResponse {
        $validated = $request->validated();
        $user = $users->get();

        $user->update(['username' => $validated['username']]);

        AppSetting::updateOrCreate(
            ['user_id' => $user->id],
            ['currency_code' => $user->settings?->currency_code ?? 'USD']
        );

        $credentials->store(
            $user,
            'igdb',
            $validated['igdb_client_id'] ?? null,
            $validated['igdb_client_secret'] ?? null,
            null,
            preserveBlankFields: true,
        );

        $credentials->store(
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
                ->merge(ProviderImportDraft::query()->whereNotNull('cover_path')->pluck('cover_path'))
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

    public function testIgdbCredentials(
        Request $request,
        LocalUserService $users,
        ProviderCredentialTestService $credentialTests,
    ): JsonResponse {
        $validated = $request->validate([
            'igdb_client_id' => ['nullable', 'string'],
            'igdb_client_secret' => ['nullable', 'string'],
        ]);

        $user = $users->get();
        $credential = $this->credential($user, 'igdb');
        $clientId = ($validated['igdb_client_id'] ?? null) ?: ($credential?->encrypted_client_id ? Crypt::decryptString($credential->encrypted_client_id) : null);
        $clientSecret = ($validated['igdb_client_secret'] ?? null) ?: ($credential?->encrypted_client_secret ? Crypt::decryptString($credential->encrypted_client_secret) : null);

        $result = $credentialTests->testIgdb($clientId, $clientSecret);
        $this->markCredentialTest($credential, $result->ok ? 'ok' : 'failed');

        return response()->json([
            'ok' => $result->ok,
            'message' => $result->message,
        ], $result->ok ? 200 : 422);
    }

    public function testSteamCredentials(
        Request $request,
        LocalUserService $users,
        ProviderCredentialTestService $credentialTests,
    ): JsonResponse {
        $validated = $request->validate([
            'steam_api_key' => ['nullable', 'string'],
        ]);

        $user = $users->get();
        $credential = $this->credential($user, 'steam');
        $apiKey = ($validated['steam_api_key'] ?? null) ?: ($credential?->encrypted_api_key ? Crypt::decryptString($credential->encrypted_api_key) : null);

        $result = $credentialTests->testSteam($apiKey);
        $this->markCredentialTest($credential, $result->ok ? 'ok' : 'failed');

        return response()->json([
            'ok' => $result->ok,
            'message' => $result->message,
        ], $result->ok ? 200 : 422);
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
