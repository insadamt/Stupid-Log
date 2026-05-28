<?php

namespace App\Services;

use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProviderSearchService
{
    private const SOURCE_ORDER = ['igdb', 'steam', 'manual'];
    private const RESULT_LIMIT = 10;
    private const SEARCH_CACHE_SECONDS = 300;
    private const STEAM_APP_CATALOG_CACHE_SECONDS = 86400;
    private const STEAM_APP_CATALOG_LIMIT = 50000;

    public function search(User $user, string $query, string $provider = 'igdb', bool $enrich = false, ?string $steamAppId = null): array
    {
        $query = trim($query);
        $warnings = [];
        $provider = in_array($provider, ['igdb', 'steam'], true) ? $provider : 'igdb';
        $shouldEnrich = $enrich;
        $cacheKey = $this->searchCacheKey($user, $query, $provider, $shouldEnrich, $steamAppId);

        if ($cached = Cache::get($cacheKey)) {
            return $cached;
        }

        try {
            $results = $provider === 'steam'
                ? $this->steamResults($user, $query, $steamAppId)
                : $this->searchIgdb($user, $query);
        } catch (Throwable $exception) {
            Log::warning('Provider search failed.', [
                'provider' => $provider,
                'query' => $query,
                'class' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            $results = [];
            $warnings[] = $provider === 'steam'
                ? 'Steam search unavailable.'
                : 'IGDB search unavailable.';
        }

        if ($shouldEnrich) {
            $results = $this->withSteamMetadata(
                results: $results,
                user: $user,
                warnings: $warnings,
                includeDlcCatalog: $steamAppId !== null,
                includeAchievementCounts: $provider !== 'steam' || $steamAppId !== null,
            );
        }

        $response = [
            'query' => $query,
            'source_order' => self::SOURCE_ORDER,
            'results' => collect($results)->map(fn (array $result) => $this->result($result))->values()->all(),
            'manual_available' => true,
            'warnings' => array_values(array_unique($warnings)),
            'notice' => $provider === 'igdb'
                ? 'IGDB search is metadata-first. If IGDB does not provide a Steam App ID, Steam enrichment is skipped.'
                : 'Steam search uses the fast public Steam Store search first, then falls back to your Steam Web API key catalog.',
        ];

        if ($response['warnings'] === []) {
            Cache::put($cacheKey, $response, self::SEARCH_CACHE_SECONDS);
        }

        return $response;
    }

    private function searchIgdb(User $user, string $query): array
    {
        $credential = $this->credential($user, 'igdb');

        if (! $credential?->encrypted_client_id || ! $credential?->encrypted_client_secret) {
            return [];
        }

        $clientId = Crypt::decryptString($credential->encrypted_client_id);
        $clientSecret = Crypt::decryptString($credential->encrypted_client_secret);

        $token = Cache::remember(
            'igdb-token:'.$credential->id.':'.$credential->updated_at?->timestamp,
            now()->addMinutes(50),
            fn () => Http::asForm()
                ->connectTimeout(1)
                ->timeout(4)
                ->post('https://id.twitch.tv/oauth2/token', [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'grant_type' => 'client_credentials',
                ])
                ->throw()
                ->json('access_token')
        );

        if (! is_string($token) || $token === '') {
            return [];
        }

        $safeQuery = str_replace(['"', "\n", "\r"], ' ', $query);
        $body = 'search "'.$safeQuery.'"; fields name,cover.url,summary,first_release_date,involved_companies.company.name,external_games.uid,external_games.category; limit '.self::RESULT_LIMIT.';';

        $games = Http::withHeaders([
            'Client-ID' => $clientId,
            'Authorization' => 'Bearer '.$token,
        ])
            ->connectTimeout(1)
            ->timeout(5)
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

    private function steamResults(User $user, string $query, ?string $steamAppId): array
    {
        if ($steamAppId) {
            return [$this->result([
                'source' => 'steam',
                'external_id' => $steamAppId,
                'title' => $query ?: 'Steam App '.$steamAppId,
                'cover_url_original' => $this->steamPortraitCoverUrl($steamAppId),
                'publisher' => null,
                'release_date' => null,
                'description' => null,
                'steam_app_id' => $steamAppId,
            ])];
        }

        $items = [];
        $lastException = null;

        try {
            $items = $this->steamStoreSearch($query);
        } catch (Throwable $exception) {
            $lastException = $exception;
            Log::warning('Steam public store search failed; falling back to keyed app catalog.', [
                'query' => $query,
                'class' => $exception::class,
                'message' => $exception->getMessage(),
            ]);
        }

        if ($items === []) {
            try {
                $items = $this->steamKeyedSearch($user, $query);
            } catch (Throwable $exception) {
                $lastException ??= $exception;
                Log::warning('Steam keyed catalog fallback failed.', [
                    'query' => $query,
                    'class' => $exception::class,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        if ($items === [] && $lastException) {
            throw $lastException;
        }

        return collect($items)
            ->take(self::RESULT_LIMIT)
            ->map(fn (array $item) => $this->steamSearchResult($item))
            ->all();
    }

    private function steamKeyedSearch(User $user, string $query): array
    {
        $apiKey = $this->steamApiKey($user);

        if (! $apiKey) {
            return [];
        }

        $needle = $this->normalizedSteamTerm($query);

        if ($needle === '') {
            return [];
        }

        return collect($this->steamAppCatalog($user, $apiKey))
            ->filter(fn ($app) => is_array($app)
                && isset($app['appid'], $app['name'])
                && is_scalar($app['appid'])
                && is_string($app['name']))
            ->map(function (array $app) use ($needle) {
                return [
                    'id' => (string) $app['appid'],
                    'name' => $app['name'],
                    'tiny_image' => null,
                    '_score' => $this->steamSearchScore($needle, $app['name']),
                ];
            })
            ->filter(fn (array $app) => $app['_score'] > 0)
            ->sort(function (array $a, array $b) {
                $score = $b['_score'] <=> $a['_score'];

                return $score !== 0 ? $score : strnatcasecmp($a['name'], $b['name']);
            })
            ->take(self::RESULT_LIMIT)
            ->map(fn (array $app) => [
                'id' => $app['id'],
                'name' => $app['name'],
                'tiny_image' => $app['tiny_image'],
            ])
            ->values()
            ->all();
    }

    private function steamAppCatalog(User $user, string $apiKey): array
    {
        $cacheKey = 'steam-app-catalog:'.$user->id.':'.$this->credentialCachePart($user, 'steam');

        return Cache::remember($cacheKey, self::STEAM_APP_CATALOG_CACHE_SECONDS, function () use ($apiKey) {
            $response = Http::retry(2, 300)
                ->connectTimeout(3)
                ->timeout(20)
                ->acceptJson()
                ->get('https://api.steampowered.com/IStoreService/GetAppList/v1/', [
                    'key' => $apiKey,
                    'include_games' => 'true',
                    'include_dlc' => 'false',
                    'include_software' => 'false',
                    'include_videos' => 'false',
                    'include_hardware' => 'false',
                    'max_results' => self::STEAM_APP_CATALOG_LIMIT,
                ])
                ->throw();

            $apps = $response->json('response.apps');

            if (! is_array($apps)) {
                $apps = $response->json('apps', []);
            }

            return is_array($apps) ? $apps : [];
        });
    }

    private function steamStoreSearch(string $query): array
    {
        $query = trim($query);

        if (strlen($query) < 2) {
            return [];
        }

        return Http::retry(2, 300)
            ->connectTimeout(3)
            ->timeout(10)
            ->acceptJson()
            ->withHeaders([
                'User-Agent' => 'Stupid Log/1.0',
            ])
            ->get('https://store.steampowered.com/api/storesearch', [
                'term' => $query,
                'l' => 'english',
                'cc' => 'US',
            ])
            ->throw()
            ->json('items', []);
    }

    private function steamSearchResult(array $item): array
    {
        $appId = $item['id'] ?? $item['appid'] ?? null;
        $steamAppId = is_scalar($appId) ? (string) $appId : null;

        return $this->result([
            'source' => 'steam',
            'external_id' => $steamAppId ?? '',
            'title' => $item['name'] ?? 'Untitled',
            'cover_url_original' => $this->steamPortraitCoverUrl($steamAppId),
            'publisher' => null,
            'release_date' => null,
            'description' => null,
            'steam_app_id' => $steamAppId,
        ]);
    }

    private function withSteamMetadata(
        array $results,
        User $user,
        array &$warnings,
        bool $includeDlcCatalog = false,
        bool $includeAchievementCounts = true,
    ): array {
        $steamAppIds = collect($results)
            ->pluck('steam_app_id')
            ->filter(fn ($appId) => is_scalar($appId) && (string) $appId !== '')
            ->map(fn ($appId) => (string) $appId)
            ->unique()
            ->values()
            ->all();

        if ($steamAppIds === []) {
            return $results;
        }

        $details = $this->steamAppDetails($steamAppIds, $warnings);
        $achievementCounts = $includeAchievementCounts
            ? ($details === []
                ? collect($steamAppIds)->mapWithKeys(fn (string $steamAppId) => [$steamAppId => null])->all()
                : $this->steamAchievementCounts($steamAppIds, $user, $warnings))
            : collect($steamAppIds)->mapWithKeys(fn (string $steamAppId) => [$steamAppId => null])->all();
        $dlcCatalogs = $includeDlcCatalog
            ? collect($steamAppIds)
                ->mapWithKeys(fn (string $steamAppId) => [$steamAppId => $this->steamDlcCatalog($details[$steamAppId]['dlc'] ?? [], $warnings)])
                ->all()
            : [];

        return collect($results)->map(function (array $result) use ($details, $achievementCounts, $dlcCatalogs, $includeDlcCatalog, $includeAchievementCounts) {
            $steamAppId = isset($result['steam_app_id'])
                ? (string) $result['steam_app_id']
                : null;

            $data = $steamAppId ? ($details[$steamAppId] ?? null) : null;
            $price = is_array($data) ? $this->price($data) : null;
            $totalAchievements = $includeAchievementCounts && $steamAppId
                ? ($achievementCounts[$steamAppId] ?? null)
                : null;

            return array_merge($result, [
                'title' => $result['title'] ?: ($data['name'] ?? 'Untitled'),
                'cover_url_original' => $this->steamPortraitCoverUrl($steamAppId)
                    ?? $result['cover_url_original']
                    ?? ($data['header_image'] ?? null),
                'publisher' => $result['publisher'] ?? ($data['publishers'][0] ?? null),
                'release_date' => $result['release_date'] ?? (is_array($data) ? $this->steamReleaseDate($data) : null),
                'description' => $result['description'] ?? ($data['short_description'] ?? null),
                'base_price_default' => $price,
                'base_price_source' => $price === null ? null : 'steam',
                'total_achievements' => $totalAchievements,
                'total_achievements_source' => $totalAchievements === null ? null : 'steam',
                'dlcs' => $includeDlcCatalog && $steamAppId ? ($dlcCatalogs[$steamAppId] ?? []) : [],
            ]);
        })->all();
    }

    private function steamAppDetails(array $steamAppIds, array &$warnings): array
    {
        $responses = Http::pool(function (Pool $pool) use ($steamAppIds) {
            return collect($steamAppIds)->map(function (string $steamAppId) use ($pool) {
                return $pool->as($steamAppId)->connectTimeout(1)->timeout(4)->get('https://store.steampowered.com/api/appdetails', [
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

            if (! $response instanceof Response || ! $response->successful()) {
                $failed++;
                continue;
            }

            $data = $response->json($steamAppId.'.data');

            if (is_array($data)) {
                $details[$steamAppId] = $data;
            }
        }

        if ($failed > 0) {
            $warnings[] = 'Steam metadata auto-fill unavailable for '.$failed.' result(s).';
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
                return $pool->as($steamAppId)->connectTimeout(1)->timeout(4)->get(
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

            if (! $response instanceof Response || ! $response->successful()) {
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

    private function steamDlcCatalog(array $dlcIds, array &$warnings): array
    {
        $dlcIds = collect($dlcIds)
            ->filter(fn ($id) => is_scalar($id))
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values()
            ->all();

        if ($dlcIds === []) {
            return [];
        }

        $catalog = [];
        $failed = 0;

        foreach (array_chunk($dlcIds, 25) as $chunk) {
            $details = $this->steamAppDetails($chunk, $warnings);

            foreach ($chunk as $dlcId) {
                $data = $details[$dlcId] ?? null;

                if (! is_array($data)) {
                    $failed++;
                    continue;
                }

                $catalog[] = [
                    'steam_app_id' => $dlcId,
                    'title' => $data['name'] ?? 'Untitled DLC',
                    'base_price' => $this->price($data),
                ];
            }
        }

        if ($failed > 0) {
            $warnings[] = 'Steam DLC auto-fill unavailable for '.$failed.' DLC(s).';
        }

        return $catalog;
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
            'dlcs' => $result['dlcs'] ?? [],
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

    private function steamReleaseDate(array $data): ?string
    {
        $date = $data['release_date']['date'] ?? null;

        if (! is_string($date) || trim($date) === '') {
            return null;
        }

        try {
            return Carbon::parse($date)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    private function steamPortraitCoverUrl(?string $steamAppId): ?string
    {
        if (! $steamAppId) {
            return null;
        }

        return 'https://cdn.cloudflare.steamstatic.com/steam/apps/'.$steamAppId.'/library_600x900.jpg';
    }

    private function steamSearchScore(string $needle, string $title): int
    {
        $haystack = $this->normalizedSteamTerm($title);

        if ($haystack === '') {
            return 0;
        }

        if ($haystack === $needle) {
            return 10000;
        }

        if (str_starts_with($haystack, $needle)) {
            return 9000 - min(strlen($haystack) - strlen($needle), 2000);
        }

        $position = strpos($haystack, $needle);

        if ($position !== false) {
            return 7000 - min($position, 2000);
        }

        $words = array_values(array_filter(explode(' ', $needle)));

        if ($words === []) {
            return 0;
        }

        $matchedWords = 0;

        foreach ($words as $word) {
            if (str_contains($haystack, $word)) {
                $matchedWords++;
            }
        }

        if ($matchedWords === count($words)) {
            return 5000 + ($matchedWords * 100);
        }

        return $matchedWords > 0 ? $matchedWords * 100 : 0;
    }

    private function normalizedSteamTerm(string $value): string
    {
        $normalized = preg_replace('/[^a-z0-9]+/', ' ', strtolower($value));
        $normalized = preg_replace('/\s+/', ' ', $normalized ?? '');

        return trim($normalized ?? '');
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

    private function searchCacheKey(User $user, string $query, string $provider, bool $enrich, ?string $steamAppId): string
    {
        return 'provider-search:'.sha1(implode('|', [
            $user->id,
            $provider,
            $enrich ? '1' : '0',
            strtolower($query),
            (string) $steamAppId,
            $this->credentialCachePart($user, 'igdb'),
            $this->credentialCachePart($user, 'steam'),
        ]));
    }

    private function credentialCachePart(User $user, string $providerKey): string
    {
        $credential = $this->credential($user, $providerKey);

        if (! $credential) {
            return 'none';
        }

        return $credential->id.':'.$credential->updated_at?->timestamp;
    }
}
