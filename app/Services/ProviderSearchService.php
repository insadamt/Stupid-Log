<?php

namespace App\Services;

use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Throwable;

class ProviderSearchService
{
    public function search(User $user, string $query): array
    {
        $warnings = [];
        $results = [];

        try {
            $results = $this->searchIgdb($user, $query);
        } catch (Throwable $exception) {
            $warnings[] = 'IGDB search unavailable: '.$exception->getMessage();
        }

        if (! $results) {
            try {
                $results = $this->searchSteam($query);
            } catch (Throwable $exception) {
                $warnings[] = 'Steam fallback unavailable: '.$exception->getMessage();
            }
        }

        return [
            'query' => $query,
            'source_order' => ['igdb', 'steam', 'manual'],
            'results' => $results,
            'manual_available' => true,
            'warnings' => $warnings,
            'notice' => 'Manual entry remains available because saved user data is the source of truth.',
        ];
    }

    private function searchIgdb(User $user, string $query): array
    {
        $credential = $this->credential($user, 'igdb');

        if (! $credential?->encrypted_client_id || ! $credential?->encrypted_client_secret) {
            return [];
        }

        $clientId = Crypt::decryptString($credential->encrypted_client_id);
        $clientSecret = Crypt::decryptString($credential->encrypted_client_secret);
        $token = Http::asForm()
            ->post('https://id.twitch.tv/oauth2/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'grant_type' => 'client_credentials',
            ])
            ->throw()
            ->json('access_token');

        $body = 'search "'.str_replace('"', '', $query).'"; fields name,cover.url,summary,first_release_date,involved_companies.company.name,external_games.uid,external_games.category; limit 10;';
        $games = Http::withHeaders([
            'Client-ID' => $clientId,
            'Authorization' => 'Bearer '.$token,
        ])->withBody($body, 'text/plain')->post('https://api.igdb.com/v4/games')->throw()->json();

        return collect($games)->map(function (array $game) {
            $steamExternal = collect($game['external_games'] ?? [])->firstWhere('category', 1);

            return [
                'source' => 'igdb',
                'external_id' => (string) $game['id'],
                'title' => $game['name'] ?? 'Untitled',
                'cover_url_original' => isset($game['cover']['url']) ? 'https:'.str_replace('t_thumb', 't_cover_big', $game['cover']['url']) : null,
                'publisher' => $game['involved_companies'][0]['company']['name'] ?? null,
                'release_date' => isset($game['first_release_date']) ? date('Y-m-d', $game['first_release_date']) : null,
                'description' => $game['summary'] ?? null,
                'steam_app_id' => $steamExternal['uid'] ?? null,
            ];
        })->all();
    }

    private function searchSteam(string $query): array
    {
        $response = Http::get('https://store.steampowered.com/api/storesearch', [
            'term' => $query,
            'l' => 'english',
            'cc' => 'US',
        ])->throw()->json('items', []);

        return collect($response)->take(10)->map(fn (array $item) => [
            'source' => 'steam',
            'external_id' => (string) $item['id'],
            'title' => $item['name'] ?? 'Untitled',
            'cover_url_original' => $item['tiny_image'] ?? null,
            'publisher' => null,
            'release_date' => null,
            'description' => null,
            'steam_app_id' => (string) $item['id'],
        ])->all();
    }

    private function credential(User $user, string $providerKey): ?ProviderCredential
    {
        $provider = Provider::where('key', $providerKey)->first();

        if (! $provider) {
            return null;
        }

        return ProviderCredential::where('user_id', $user->id)
            ->where('provider_id', $provider->id)
            ->where('is_enabled', true)
            ->first();
    }
}
