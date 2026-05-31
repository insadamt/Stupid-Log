<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Inertia\Inertia;
use Inertia\Response;

class SetupController extends Controller
{
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

    private function localUser(): User
    {
        return User::first() ?? User::create(['username' => 'Player One', 'avatar_path' => null]);
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
}
