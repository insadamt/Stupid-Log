<?php

namespace App\Services;

use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SteamEnrichmentService
{
    public function enrich(Game $game, ?string $steamAppId, ?User $user = null): array
    {
        if (! $steamAppId) {
            return [];
        }

        $warnings = [];
        $steamAppId = (string) $steamAppId;
        $provider = Provider::where('key', 'steam')->first();

        if ($provider) {
            $game->externalIds()->firstOrCreate(
                ['provider_id' => $provider->id, 'external_id' => $steamAppId],
                ['url' => "https://store.steampowered.com/app/{$steamAppId}"],
            );
        }

        try {
            $this->enrichStoreData($game, $steamAppId, $provider);
        } catch (Throwable $exception) {
            $warnings[] = 'Steam store enrichment unavailable: '.$exception->getMessage();
            Log::warning('Steam store enrichment failed.', ['game_id' => $game->id, 'steam_app_id' => $steamAppId, 'exception' => $exception]);
        }

        try {
            $this->enrichAchievements($game, $steamAppId, $user);
        } catch (Throwable $exception) {
            $warnings[] = 'Steam achievement enrichment unavailable: '.$exception->getMessage();
            Log::warning('Steam achievement enrichment failed.', ['game_id' => $game->id, 'steam_app_id' => $steamAppId, 'exception' => $exception]);
        }

        if ($warnings === []) {
            $game->forceFill(['provider_synced_at' => now()])->save();
        }

        return $warnings;
    }

    public function refreshDlcCatalog(Game $game, string $steamAppId): void
    {
        $provider = Provider::where('key', 'steam')->first();

        if ($provider) {
            $game->externalIds()->firstOrCreate(
                ['provider_id' => $provider->id, 'external_id' => $steamAppId],
                ['url' => "https://store.steampowered.com/app/{$steamAppId}"],
            );
        }

        $this->enrichStoreData($game, $steamAppId, $provider);
        $game->forceFill(['provider_synced_at' => now()])->save();
    }

    private function enrichStoreData(Game $game, string $steamAppId, ?Provider $provider): void
    {
        $data = $this->appDetails([$steamAppId])[$steamAppId]['data'] ?? null;

        if (! is_array($data)) {
            return;
        }

        $updates = [];
        $price = $this->price($data);

        if ($price !== null) {
            $updates['base_price_default'] = $price;
            $updates['base_price_source'] = 'steam';
        }

        if ($updates) {
            $game->forceFill($updates)->save();
        }

        $dlcIds = collect($data['dlc'] ?? [])
            ->filter(fn ($id) => is_scalar($id))
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values();

        if ($dlcIds->isEmpty()) {
            return;
        }

        foreach ($dlcIds->chunk(25) as $chunk) {
            try {
                $details = $this->appDetails($chunk->all());
            } catch (Throwable $exception) {
                Log::warning('Steam DLC detail enrichment failed.', [
                    'game_id' => $game->id,
                    'steam_app_id' => $steamAppId,
                    'dlc_app_ids' => $chunk->all(),
                    'exception' => $exception,
                ]);

                continue;
            }

            foreach ($chunk as $dlcId) {
                $dlcData = $details[$dlcId]['data'] ?? null;
                if (! is_array($dlcData)) {
                    continue;
                }

                Dlc::updateOrCreate(
                    ['steam_app_id' => $dlcId],
                    [
                        'game_id' => $game->id,
                        'title' => $dlcData['name'] ?? 'Untitled DLC',
                        'cover_url_original' => null,
                        'cover_path' => null,
                        'base_price' => $this->price($dlcData),
                        'source_provider_id' => $provider?->id,
                        'synced_at' => now(),
                    ],
                );
            }
        }
    }

    private function enrichAchievements(Game $game, string $steamAppId, ?User $user): void
    {
        $query = ['appid' => $steamAppId];

        if ($apiKey = $user ? $this->steamApiKey($user) : null) {
            $query['key'] = $apiKey;
        }

        $schema = Http::get('https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/', $query)
            ->throw()
            ->json('game.availableGameStats.achievements', []);

        if (! is_array($schema)) {
            return;
        }

        $game->forceFill([
            'total_achievements' => count($schema),
            'total_achievements_source' => 'steam',
        ])->save();
    }

    private function appDetails(array $appIds): array
    {
        $appIds = collect($appIds)
            ->filter(fn ($appId) => is_scalar($appId) && (string) $appId !== '')
            ->map(fn ($appId) => (string) $appId)
            ->unique()
            ->values()
            ->all();

        if ($appIds === []) {
            return [];
        }

        $responses = Http::pool(function (Pool $pool) use ($appIds) {
            return collect($appIds)->map(function (string $appId) use ($pool) {
                return $pool->as($appId)->connectTimeout(1)->timeout(4)->get('https://store.steampowered.com/api/appdetails', [
                    'appids' => $appId,
                    'cc' => 'US',
                    'l' => 'english',
                ]);
            })->all();
        });

        $details = [];

        foreach ($appIds as $appId) {
            $response = $responses[$appId] ?? null;
            if ($response instanceof Response && $response->successful()) {
                $json = $response->json();
                if (is_array($json)) {
                    $details += $json;
                }
            }
        }

        return $details;
    }

    private function price(array $data): ?float
    {
        if (($data['is_free'] ?? false) === true) {
            return 0.0;
        }

        $price = $data['price_overview']['initial'] ?? null;

        return is_numeric($price) ? round(((float) $price) / 100, 2) : null;
    }

    private function steamApiKey(User $user): ?string
    {
        $provider = Provider::where('key', 'steam')->first();

        if (! $provider) {
            return null;
        }

        $credential = ProviderCredential::where('user_id', $user->id)
            ->where('provider_id', $provider->id)
            ->where('is_enabled', true)
            ->first();

        return $credential?->encrypted_api_key ? Crypt::decryptString($credential->encrypted_api_key) : null;
    }
}
