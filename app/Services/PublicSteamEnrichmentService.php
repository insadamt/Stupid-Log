<?php

namespace App\Services;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class PublicSteamEnrichmentService
{
    private const CACHE_SECONDS = 300;
    private const DLC_CONFIRMATION_THRESHOLD = 25;
    private const DLC_CONCURRENCY = 5;
    private const REQUEST_ATTEMPTS = 3;

    public function metadata(string $steamAppId): array
    {
        $data = $this->appDetail($steamAppId);

        if ($data === null) {
            return $this->response($this->emptyMetadata(), ['Steam store metadata is unavailable after retrying.']);
        }

        $price = $this->price($data);

        return $this->response([
            'title' => $data['name'] ?? null,
            'publisher' => $data['publishers'][0] ?? null,
            'release_date' => $this->releaseDate($data),
            'description' => $data['short_description'] ?? null,
            'base_price_default' => $price,
            'base_price_source' => $price === null ? null : 'steam',
        ]);
    }

    public function achievements(string $steamAppId): array
    {
        $globalRequestFailed = false;

        try {
            $response = Http::retry(self::REQUEST_ATTEMPTS, 300, throw: false)
                ->connectTimeout(3)
                ->timeout(10)
                ->get(
                    'https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/',
                    ['gameid' => $steamAppId],
                );

            if ($response->successful()) {
                $achievements = $response->json('achievementpercentages.achievements');

                if (is_array($achievements) && $achievements !== []) {
                    return $this->response([
                        'total_achievements' => count($achievements),
                        'total_achievements_source' => 'steam',
                        'source' => 'global_percentages',
                    ]);
                }

                if (is_array($achievements)) {
                    return $this->response($this->emptyAchievements());
                }
            }

            $globalRequestFailed = true;
        } catch (Throwable) {
            $globalRequestFailed = true;
        }

        $storeData = $this->appDetail($steamAppId);
        $storeTotal = $storeData['achievements']['total'] ?? null;

        if (is_numeric($storeTotal) && (int) $storeTotal > 0) {
            return $this->response([
                'total_achievements' => (int) $storeTotal,
                'total_achievements_source' => 'steam',
                'source' => 'store_details',
            ]);
        }

        if ($storeData !== null) {
            return $this->response($this->emptyAchievements());
        }

        return $this->response(
            $this->emptyAchievements(),
            $globalRequestFailed ? ['Steam achievement totals are unavailable after retrying.'] : [],
        );
    }

    public function dlcs(string $steamAppId, bool $loadLargeCatalog = false): array
    {
        $game = $this->appDetail($steamAppId);

        if ($game === null) {
            return $this->dlcResponse([], 0, [], false, ['Steam DLC data is unavailable after retrying.']);
        }

        $dlcIds = $this->dlcIds($game);
        $total = count($dlcIds);
        $requiresConfirmation = $total > self::DLC_CONFIRMATION_THRESHOLD && ! $loadLargeCatalog;

        if ($total === 0 || $requiresConfirmation) {
            return $this->dlcResponse([], $total, [], $requiresConfirmation);
        }

        $details = $this->appDetails($dlcIds);
        $catalog = [];
        $missingAppIds = [];

        foreach ($dlcIds as $dlcId) {
            $data = $details[$dlcId] ?? null;

            if (! is_array($data)) {
                $missingAppIds[] = $dlcId;
                continue;
            }

            $catalog[] = [
                'steam_app_id' => $dlcId,
                'title' => $data['name'] ?? 'Untitled DLC',
                'base_price' => $this->price($data),
            ];
        }

        $loaded = count($catalog);
        $warnings = $missingAppIds === []
            ? []
            : ["{$loaded} of {$total} DLCs loaded; ".count($missingAppIds).' are unavailable from Steam.'];

        return $this->dlcResponse($catalog, $total, $missingAppIds, false, $warnings);
    }

    public function appDetail(string $steamAppId): ?array
    {
        return $this->appDetails([$steamAppId])[$steamAppId] ?? null;
    }

    public function appDetails(array $steamAppIds): array
    {
        $requestedIds = collect($steamAppIds)
            ->filter(fn ($id) => is_scalar($id) && (string) $id !== '')
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values()
            ->all();

        $details = [];
        $pendingIds = [];

        foreach ($requestedIds as $steamAppId) {
            $cached = Cache::get($this->appDetailCacheKey($steamAppId));

            if (is_array($cached)) {
                $details[$steamAppId] = $cached;
            } else {
                $pendingIds[] = $steamAppId;
            }
        }

        for ($attempt = 1; $attempt <= self::REQUEST_ATTEMPTS && $pendingIds !== []; $attempt++) {
            $nextPendingIds = [];

            foreach (array_chunk($pendingIds, self::DLC_CONCURRENCY) as $group) {
                $responses = $this->requestAppDetailGroup($group);

                foreach ($group as $steamAppId) {
                    $data = $this->responseAppData($responses[$steamAppId] ?? null, $steamAppId);

                    if ($data === null) {
                        $nextPendingIds[] = $steamAppId;
                        continue;
                    }

                    $details[$steamAppId] = $data;
                    Cache::put($this->appDetailCacheKey($steamAppId), $data, self::CACHE_SECONDS);
                }
            }

            $pendingIds = array_values(array_unique($nextPendingIds));

            if ($pendingIds !== [] && $attempt < self::REQUEST_ATTEMPTS) {
                usleep(300000 * $attempt);
            }
        }

        return $details;
    }

    private function requestAppDetailGroup(array $steamAppIds): array
    {
        try {
            return Http::pool(function (Pool $pool) use ($steamAppIds) {
                return collect($steamAppIds)->map(function (string $steamAppId) use ($pool) {
                    return $pool->as($steamAppId)
                        ->connectTimeout(3)
                        ->timeout(10)
                        ->get('https://store.steampowered.com/api/appdetails', [
                            'appids' => $steamAppId,
                            'cc' => 'US',
                            'l' => 'english',
                        ]);
                })->all();
            });
        } catch (Throwable) {
            return [];
        }
    }

    private function responseAppData(mixed $response, string $steamAppId): ?array
    {
        if (! $response instanceof Response || ! $response->successful()) {
            return null;
        }

        $data = $response->json($steamAppId.'.data');

        return is_array($data) && $data !== [] ? $data : null;
    }

    private function dlcIds(array $game): array
    {
        return collect($game['dlc'] ?? [])
            ->filter(fn ($id) => is_scalar($id))
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function response(array $data, array $warnings = []): array
    {
        return [
            'data' => $data,
            'warnings' => array_values(array_unique($warnings)),
        ];
    }

    private function dlcResponse(
        array $catalog,
        int $total,
        array $missingAppIds,
        bool $requiresConfirmation,
        array $warnings = [],
    ): array {
        return $this->response([
            'dlcs' => $catalog,
            'total' => $total,
            'loaded' => count($catalog),
            'missing_app_ids' => array_values($missingAppIds),
            'requires_confirmation' => $requiresConfirmation,
        ], $warnings);
    }

    private function emptyMetadata(): array
    {
        return [
            'title' => null,
            'publisher' => null,
            'release_date' => null,
            'description' => null,
            'base_price_default' => null,
            'base_price_source' => null,
        ];
    }

    private function emptyAchievements(): array
    {
        return [
            'total_achievements' => null,
            'total_achievements_source' => null,
            'source' => null,
        ];
    }

    private function appDetailCacheKey(string $steamAppId): string
    {
        return "public-steam-app-detail:{$steamAppId}";
    }

    private function price(array $data): ?float
    {
        if (($data['is_free'] ?? false) === true) {
            return 0.0;
        }

        $price = $data['price_overview']['initial'] ?? null;

        return is_numeric($price) ? round(((float) $price) / 100, 2) : null;
    }

    private function releaseDate(array $data): ?string
    {
        $date = $data['release_date']['date'] ?? null;

        if (! is_string($date) || trim($date) === '') {
            return null;
        }

        $timestamp = strtotime($date);

        return $timestamp === false ? null : date('Y-m-d', $timestamp);
    }
}
