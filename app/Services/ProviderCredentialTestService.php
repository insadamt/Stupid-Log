<?php

namespace App\Services;

use App\DataTransferObjects\ProviderCredentialTestResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
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
            return new ProviderCredentialTestResult(false, $this->igdbFailureMessage($exception));
        }
    }

    private function igdbFailureMessage(Throwable $exception): string
    {
        if ($exception instanceof ConnectionException) {
            return 'Could not reach IGDB. Check your connection and try again.';
        }

        if ($exception instanceof RequestException) {
            $providerMessage = strtolower((string) $exception->response->json('message'));

            if ($exception->response->status() === 400 && str_contains($providerMessage, 'invalid client')) {
                return 'The IGDB Client ID is invalid.';
            }

            if ($exception->response->status() === 403 && str_contains($providerMessage, 'invalid client secret')) {
                return 'The IGDB Client Secret is invalid.';
            }

            if (in_array($exception->response->status(), [400, 401, 403], true)) {
                return 'IGDB rejected these credentials. Check the Client ID and Client Secret.';
            }
        }

        return 'IGDB is unavailable right now. Try again later.';
    }

}
