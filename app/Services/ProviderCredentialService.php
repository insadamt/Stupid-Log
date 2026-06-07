<?php

namespace App\Services;

use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;

class ProviderCredentialService
{
    public function store(
        User $user,
        string $providerKey,
        ?string $clientId,
        ?string $clientSecret,
        ?string $apiKey,
        bool $preserveBlankFields = false,
    ): void {
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
