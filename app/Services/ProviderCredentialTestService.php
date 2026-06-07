<?php

namespace App\Services;

use App\DataTransferObjects\ProviderCredentialTestResult;
use Illuminate\Support\Facades\Http;
use Throwable;

final class ProviderCredentialTestService
{
    public function testIgdb(?string $clientId, ?string $clientSecret): ProviderCredentialTestResult
    {
        if (! $clientId || ! $clientSecret) {
            return new ProviderCredentialTestResult(false, 'Add both IGDB Client ID and Client Secret before testing.');
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

            return new ProviderCredentialTestResult(true, 'IGDB credentials work.');
        } catch (Throwable $exception) {
            return new ProviderCredentialTestResult(false, 'IGDB test failed: '.$exception->getMessage());
        }
    }

    public function testSteam(?string $apiKey): ProviderCredentialTestResult
    {
        if (! $apiKey) {
            return new ProviderCredentialTestResult(false, 'Add a Steam API key before testing.');
        }

        try {
            Http::get('https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/', [
                'key' => $apiKey,
            ])->throw();

            return new ProviderCredentialTestResult(true, 'Steam API key works.');
        } catch (Throwable $exception) {
            return new ProviderCredentialTestResult(false, 'Steam test failed: '.$exception->getMessage());
        }
    }
}
