<?php

namespace App\Services;

use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\Provider;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class SteamEnrichmentService
{
    public function __construct(private readonly PublicSteamEnrichmentService $steam) {}

    public function enrich(Game $game, ?string $steamAppId): array
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
            $metadata = $this->steam->metadata($steamAppId);
            $this->applyMetadata($game, $metadata['data']);
            $warnings = array_merge($warnings, $metadata['warnings']);

            $dlcs = $this->steam->dlcs($steamAppId, true);
            $this->storeDlcCatalog($game, $provider, $dlcs['data']['dlcs']);
            $warnings = array_merge($warnings, $dlcs['warnings']);
        } catch (Throwable $exception) {
            $warnings[] = 'Steam store enrichment unavailable: '.$exception->getMessage();
            Log::warning('Steam store enrichment failed.', ['game_id' => $game->id, 'steam_app_id' => $steamAppId, 'exception' => $exception]);
        }

        try {
            $achievements = $this->steam->achievements($steamAppId);
            $this->applyAchievements($game, $achievements['data']);
            $warnings = array_merge($warnings, $achievements['warnings']);
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

        $dlcs = $this->steam->dlcs($steamAppId, true);
        $this->storeDlcCatalog($game, $provider, $dlcs['data']['dlcs']);
        $game->forceFill(['provider_synced_at' => now()])->save();

        if ($dlcs['warnings'] !== []) {
            throw new RuntimeException($dlcs['warnings'][0]);
        }
    }

    private function applyMetadata(Game $game, array $data): void
    {
        $updates = [];
        $price = $data['base_price_default'] ?? null;

        if ($price !== null) {
            $updates['base_price_default'] = $price;
            $updates['base_price_source'] = $data['base_price_source'] ?? 'steam';
        }

        if ($updates) {
            $game->forceFill($updates)->save();
        }
    }

    private function applyAchievements(Game $game, array $data): void
    {
        $total = $data['total_achievements'] ?? null;
        if ($total === null) {
            return;
        }

        $game->forceFill([
            'total_achievements' => $total,
            'total_achievements_source' => $data['total_achievements_source'] ?? 'steam',
        ])->save();
    }

    private function storeDlcCatalog(Game $game, ?Provider $provider, array $catalog): void
    {
        foreach ($catalog as $item) {
            Dlc::updateOrCreate(
                ['steam_app_id' => $item['steam_app_id']],
                [
                    'game_id' => $game->id,
                    'title' => $item['title'] ?? 'Untitled DLC',
                    'cover_url_original' => null,
                    'cover_path' => null,
                    'base_price' => $item['base_price'] ?? null,
                    'source_provider_id' => $provider?->id,
                    'synced_at' => now(),
                ],
            );
        }
    }
}
