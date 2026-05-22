<?php

namespace App\Services;

use App\Models\StupidLog\ExternalGameId;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\Provider;
use Illuminate\Support\Collection;

class DuplicateDetectionService
{
    public function __construct(private readonly TitleNormalizer $normalizer) {}

    public function findByExternalId(string $providerKey, string $externalId): ?Game
    {
        $provider = Provider::where('key', $providerKey)->first();

        if (! $provider) {
            return null;
        }

        return ExternalGameId::query()
            ->where('provider_id', $provider->id)
            ->where('external_id', $externalId)
            ->with('game')
            ->first()
            ?->game;
    }

    public function possibleManualDuplicates(string $title, ?string $releaseDate): Collection
    {
        $year = $releaseDate ? substr($releaseDate, 0, 4) : null;

        return Game::query()
            ->where('normalized_title', $this->normalizer->normalize($title))
            ->when($year, fn ($query) => $query->whereYear('release_date', $year))
            ->get();
    }
}
