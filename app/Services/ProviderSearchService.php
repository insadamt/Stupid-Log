<?php

namespace App\Services;

use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
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

    public function __construct(private readonly PublicSteamEnrichmentService $steam) {}

    public function search(User $user, string $query, string $provider = 'igdb', bool $enrich = false, ?string $steamAppId = null): array
    {
        $query = trim($query);
        $warnings = [];
        $provider = in_array($provider, ['igdb', 'steam'], true) ? $provider : 'igdb';
        $shouldEnrich = $enrich && ($provider !== 'steam' || $steamAppId !== null);
        $cacheKey = $this->searchCacheKey($user, $query, $provider, $shouldEnrich, $steamAppId);

        if ($cached = Cache::get($cacheKey)) {
            return $cached;
        }

        try {
            $results = $provider === 'steam'
                ? $this->steamResults($query, $steamAppId)
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
            $results = $this->withSteamMetadata($results, $warnings, $steamAppId !== null);
        }

        $response = [
            'query' => $query,
            'source_order' => self::SOURCE_ORDER,
            'results' => collect($results)->map(fn (array $result) => $this->result($result))->values()->all(),
            'manual_available' => true,
            'warnings' => array_values(array_unique($warnings)),
            'notice' => $provider === 'igdb'
                ? 'IGDB search is metadata-first. If IGDB does not provide a Steam App ID, Steam enrichment is skipped.'
                : 'Steam search and enrichment use public Steam endpoints. No Steam API key is required.',
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

    private function steamResults(string $query, ?string $steamAppId): array
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

        $items = $this->steamStoreSearch($query);

        return collect($items)
            ->take(self::RESULT_LIMIT)
            ->map(fn (array $item) => $this->steamSearchResult($item))
            ->all();
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

        return $this->result([
            'source' => 'steam',
            'external_id' => is_scalar($appId) ? (string) $appId : '',
            'title' => $item['name'] ?? 'Untitled',
            'cover_url_original' => $item['tiny_image'] ?? null,
            'publisher' => null,
            'release_date' => null,
            'description' => null,
            'steam_app_id' => is_scalar($appId) ? (string) $appId : null,
        ]);
    }

    private function withSteamMetadata(array $results, array &$warnings, bool $includeDlcCatalog = false): array
    {
        return collect($results)->map(function (array $result) use (&$warnings, $includeDlcCatalog) {
            $steamAppId = isset($result['steam_app_id'])
                ? (string) $result['steam_app_id']
                : null;

            if (! $steamAppId) {
                return $result;
            }

            $metadata = $this->steam->metadata($steamAppId);
            $achievements = $this->steam->achievements($steamAppId);
            $dlcs = $includeDlcCatalog
                ? $this->steam->dlcs($steamAppId, true)
                : ['data' => ['dlcs' => []], 'warnings' => []];
            $warnings = array_merge($warnings, $metadata['warnings'], $achievements['warnings'], $dlcs['warnings']);
            $source = $result['source'] ?? null;

            return array_merge($result, [
                'title' => $source === 'steam' && $includeDlcCatalog && $metadata['data']['title']
                    ? $metadata['data']['title']
                    : ($result['title'] ?: 'Untitled'),
                'cover_url_original' => $source === 'steam'
                    ? ($this->steamPortraitCoverUrl($steamAppId) ?? $result['cover_url_original'] ?? null)
                    : ($result['cover_url_original'] ?? null),
                'publisher' => $result['publisher'] ?? $metadata['data']['publisher'],
                'release_date' => $result['release_date'] ?? $metadata['data']['release_date'],
                'description' => $result['description'] ?? $metadata['data']['description'],
                'base_price_default' => $metadata['data']['base_price_default'],
                'base_price_source' => $metadata['data']['base_price_source'],
                'total_achievements' => $achievements['data']['total_achievements'],
                'total_achievements_source' => $achievements['data']['total_achievements_source'],
                'dlcs' => $dlcs['data']['dlcs'],
            ]);
        })->all();
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

    private function steamPortraitCoverUrl(?string $steamAppId): ?string
    {
        if (! $steamAppId) {
            return null;
        }

        return 'https://cdn.cloudflare.steamstatic.com/steam/apps/'.$steamAppId.'/library_600x900.jpg';
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
