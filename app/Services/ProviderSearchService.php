<?php

namespace App\Services;

use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Throwable;

class ProviderSearchService
{
    private const SOURCE_ORDER = ['igdb', 'steam', 'manual'];
    private const RESULT_LIMIT = 8;
    private const ENRICHMENT_LIMIT = 5;

    public function search(User $user, string $query): array
    {
        $warnings = [];
        $results = [];

        try {
            $results = $this->searchIgdb($user, $query);
        } catch (Throwable $exception) {
            $warnings[] = 'IGDB search unavailable.';
        }

        if (! $results) {
            try {
                $results = $this->searchSteam($query);
            } catch (Throwable $exception) {
                $warnings[] = 'Steam fallback unavailable.';
            }
        } else {
            $results = $this->attachSteamAppIdsToIgdbResults($results, $query, $warnings);
        }

        $results = $this->withSteamMetadata($results, $user, $warnings);

        return [
            'query' => $query,
            'source_order' => self::SOURCE_ORDER,
            'results' => collect($results)->map(fn (array $result) => $this->result($result))->values()->all(),
            'manual_available' => true,
            'warnings' => array_values(array_unique($warnings)),
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

        $safeQuery = str_replace(['"', "\n", "\r"], ' ', $query);

        $body = 'search "'.$safeQuery.'"; fields name,cover.url,summary,first_release_date,involved_companies.company.name,external_games.uid,external_games.category; limit '.self::RESULT_LIMIT.';';

        $games = Http::withHeaders([
            'Client-ID' => $clientId,
            'Authorization' => 'Bearer '.$token,
        ])
            ->withBody($body, 'text/plain')
            ->post('https://api.igdb.com/v4/games')
            ->throw()
            ->json();

        return collect($games)->map(function (array $game) {
            $steamExternal = collect($game['external_games'] ?? [])->firstWhere('category', 1);

            return $this->result([
                'source' => 'igdb',
                'external_id' => (string) $game['id'],
                'title' => $game['name'] ?? 'Untitled',
                'cover_url_original' => isset($game['cover']['url'])
                    ? 'https:'.str_replace('t_thumb', 't_cover_big', $game['cover']['url'])
                    : null,
                'publisher' => $game['involved_companies'][0]['company']['name'] ?? null,
                'release_date' => isset($game['first_release_date'])
                    ? date('Y-m-d', $game['first_release_date'])
                    : null,
                'description' => $game['summary'] ?? null,
                'steam_app_id' => isset($steamExternal['uid']) && is_scalar($steamExternal['uid'])
                    ? (string) $steamExternal['uid']
                    : null,
            ]);
        })->all();
    }

    private function searchSteam(string $query): array
    {
        return collect($this->steamStoreSearch($query))
            ->take(self::RESULT_LIMIT)
            ->map(fn (array $item) => $this->steamSearchResult($item))
            ->all();
    }

    private function attachSteamAppIdsToIgdbResults(array $results, string $query, array &$warnings): array
    {
        $hasMissingSteamIds = collect($results)->contains(function (array $result) {
            return ($result['source'] ?? null) === 'igdb' && empty($result['steam_app_id']);
        });

        if (! $hasMissingSteamIds) {
            return $results;
        }

        try {
            $sharedCandidates = $this->steamStoreSearch($query);
        } catch (Throwable) {
            $warnings[] = 'Steam resolver unavailable. Some IGDB results may not have Steam enrichment.';

            return $results;
        }

        return collect($results)->map(function (array $result) use ($sharedCandidates) {
            if (($result['source'] ?? null) !== 'igdb' || ! empty($result['steam_app_id'])) {
                return $result;
            }

            $match = $this->bestSteamMatch($result['title'] ?? '', $sharedCandidates);

            if (! $match || empty($match['id'])) {
                return $result;
            }

            return array_merge($result, [
                'steam_app_id' => (string) $match['id'],
                'steam_resolved_from' => 'steam_store_search',
            ]);
        })->all();
    }

    private function steamStoreSearch(string $query): array
    {
        $query = trim($query);

        if (strlen($query) < 2) {
            return [];
        }

        return Http::get('https://store.steampowered.com/api/storesearch', [
            'term' => $query,
            'l' => 'english',
            'cc' => 'US',
        ])
            ->throw()
            ->json('items', []);
    }

    private function steamSearchResult(array $item): array
    {
        return $this->result([
            'source' => 'steam',
            'external_id' => (string) ($item['id'] ?? ''),
            'title' => $item['name'] ?? 'Untitled',
            'cover_url_original' => $item['tiny_image'] ?? null,
            'publisher' => null,
            'release_date' => null,
            'description' => null,
            'steam_app_id' => isset($item['id']) ? (string) $item['id'] : null,
        ]);
    }

    private function bestSteamMatch(string $title, array $candidates): ?array
    {
        $normalizedTitle = $this->normalizeTitle($title);

        if ($normalizedTitle === '') {
            return null;
        }

        $validCandidates = collect($candidates)
            ->filter(fn (array $candidate) => ! empty($candidate['id']) && ! empty($candidate['name']))
            ->values();

        $exact = $validCandidates->first(function (array $candidate) use ($normalizedTitle) {
            return $this->normalizeTitle((string) $candidate['name']) === $normalizedTitle;
        });

        if ($exact) {
            return $exact;
        }

        return $validCandidates->first(function (array $candidate) use ($normalizedTitle) {
            $candidateTitle = $this->normalizeTitle((string) $candidate['name']);

            return str_contains($candidateTitle, $normalizedTitle)
                || str_contains($normalizedTitle, $candidateTitle);
        });
    }

    private function withSteamMetadata(array $results, User $user, array &$warnings): array
    {
        $steamAppIds = collect($results)
            ->pluck('steam_app_id')
            ->filter(fn ($appId) => is_scalar($appId) && (string) $appId !== '')
            ->map(fn ($appId) => (string) $appId)
            ->unique()
            ->take(self::ENRICHMENT_LIMIT)
            ->values()
            ->all();

        if ($steamAppIds === []) {
            return $results;
        }

        $details = $this->steamAppDetails($steamAppIds, $warnings);
        $achievementCounts = $this->steamAchievementCounts($steamAppIds, $user, $warnings);

        return collect($results)->map(function (array $result) use ($details, $achievementCounts) {
            $steamAppId = isset($result['steam_app_id'])
                ? (string) $result['steam_app_id']
                : null;

            $data = $steamAppId ? ($details[$steamAppId] ?? null) : null;
            $price = is_array($data) ? $this->price($data) : null;
            $totalAchievements = $steamAppId
                ? ($achievementCounts[$steamAppId] ?? null)
                : null;

            return array_merge($result, [
                'cover_url_original' => $result['cover_url_original'] ?? ($data['header_image'] ?? null),
                'publisher' => $result['publisher'] ?? ($data['publishers'][0] ?? null),
                'description' => $result['description'] ?? ($data['short_description'] ?? null),
                'base_price_default' => $price,
                'base_price_source' => $price === null ? null : 'steam',
                'total_achievements' => $totalAchievements,
                'total_achievements_source' => $totalAchievements === null ? null : 'steam',
            ]);
        })->all();
    }

    private function steamAppDetails(array $steamAppIds, array &$warnings): array
    {
        $responses = Http::pool(function (Pool $pool) use ($steamAppIds) {
            return collect($steamAppIds)->map(function (string $steamAppId) use ($pool) {
                return $pool->as($steamAppId)->get('https://store.steampowered.com/api/appdetails', [
                    'appids' => $steamAppId,
                    'cc' => 'US',
                    'l' => 'english',
                ]);
            })->all();
        });

        $details = [];
        $failed = 0;

        foreach ($steamAppIds as $steamAppId) {
            $response = $responses[$steamAppId] ?? null;

            if (! $response || ! $response->successful()) {
                $failed++;
                continue;
            }

            $data = $response->json($steamAppId.'.data');

            if (is_array($data)) {
                $details[$steamAppId] = $data;
            }
        }

        if ($failed > 0) {
            $warnings[] = 'Steam price auto-fill unavailable for '.$failed.' result(s).';
        }

        return $details;
    }

    private function steamAchievementCounts(array $steamAppIds, User $user, array &$warnings): array
    {
        $apiKey = $this->steamApiKey($user);

        if (! $apiKey) {
            $warnings[] = 'Steam API key missing. Achievements were not auto-filled.';

            return collect($steamAppIds)
                ->mapWithKeys(fn (string $steamAppId) => [$steamAppId => null])
                ->all();
        }

        $responses = Http::pool(function (Pool $pool) use ($steamAppIds, $apiKey) {
            return collect($steamAppIds)->map(function (string $steamAppId) use ($pool, $apiKey) {
                return $pool->as($steamAppId)->get(
                    'https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/',
                    [
                        'appid' => $steamAppId,
                        'key' => $apiKey,
                    ],
                );
            })->all();
        });

        $counts = [];
        $failed = 0;

        foreach ($steamAppIds as $steamAppId) {
            $response = $responses[$steamAppId] ?? null;

            if (! $response || ! $response->successful()) {
                $counts[$steamAppId] = null;
                $failed++;
                continue;
            }

            $schema = $response->json('game.availableGameStats.achievements');

            $counts[$steamAppId] = is_array($schema)
                ? count($schema)
                : null;
        }

        if ($failed > 0) {
            $warnings[] = 'Steam achievement auto-fill unavailable for '.$failed.' result(s).';
        }

        return $counts;
    }

    private function result(array $result): array
    {
        $source = in_array($result['source'] ?? null, ['igdb', 'steam'], true)
            ? $result['source']
            : 'steam';

        return [
            'source' => $source,
            'external_id' => (string) ($result['external_id'] ?? ''),
            'title' => (string) ($result['title'] ?? 'Untitled'),
            'cover_url_original' => $result['cover_url_original'] ?? null,
            'publisher' => $result['publisher'] ?? null,
            'release_date' => $result['release_date'] ?? null,
            'description' => $result['description'] ?? null,
            'steam_app_id' => isset($result['steam_app_id']) && $result['steam_app_id'] !== ''
                ? (string) $result['steam_app_id']
                : null,
            'base_price_default' => $result['base_price_default'] ?? null,
            'base_price_source' => $result['base_price_source'] ?? null,
            'total_achievements' => $result['total_achievements'] ?? null,
            'total_achievements_source' => $result['total_achievements_source'] ?? null,
        ];
    }

    private function price(array $data): ?float
    {
        if (($data['is_free'] ?? false) === true) {
            return 0.0;
        }

        $price = $data['price_overview']['initial'] ?? null;

        return is_numeric($price)
            ? round(((float) $price) / 100, 2)
            : null;
    }

    private function normalizeTitle(string $title): string
    {
        $title = strtolower($title);
        $title = preg_replace('/[^a-z0-9]+/i', ' ', $title) ?? '';
        $title = preg_replace('/\s+/', ' ', $title) ?? '';

        return trim($title);
    }

    private function steamApiKey(User $user): ?string
    {
        $credential = $this->credential($user, 'steam');

        if (! $credential?->encrypted_api_key) {
            return null;
        }

        return Crypt::decryptString($credential->encrypted_api_key);
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