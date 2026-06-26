<?php

namespace Tests\Feature\StupidLog;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProgressiveSteamEnrichmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        Cache::flush();
    }

    public function test_metadata_endpoint_returns_public_store_fields_without_credentials(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => [
                    'success' => true,
                    'data' => [
                        'publishers' => ['Valve'],
                        'name' => 'Portal 2',
                        'release_date' => ['date' => 'Apr 18, 2011'],
                        'short_description' => 'A cooperative puzzle game.',
                        'price_overview' => ['initial' => 999],
                    ],
                ],
            ]),
        ]);

        $this->getJson('/steam-enrichment/620/metadata')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'title' => 'Portal 2',
                    'publisher' => 'Valve',
                    'release_date' => '2011-04-18',
                    'description' => 'A cooperative puzzle game.',
                    'base_price_default' => 9.99,
                    'base_price_source' => 'steam',
                ],
                'warnings' => [],
            ]);

        $this->assertNoSteamApiKeyWasSent();
    }

    public function test_achievement_endpoint_returns_public_total_without_credentials(): void
    {
        Http::fake([
            'api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/*' => Http::response([
                'achievementpercentages' => [
                    'achievements' => [
                        ['name' => 'A', 'percent' => 90],
                        ['name' => 'B', 'percent' => 50],
                    ],
                ],
            ]),
        ]);

        $this->getJson('/steam-enrichment/620/achievements')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'total_achievements' => 2,
                    'total_achievements_source' => 'steam',
                    'source' => 'global_percentages',
                ],
                'warnings' => [],
            ]);

        $this->assertNoSteamApiKeyWasSent();
    }

    public function test_dlc_endpoint_returns_catalog_in_batches_without_credentials(): void
    {
        $dlcIds = range(1000, 1054);

        Http::fake([
            'store.steampowered.com/api/appdetails*' => function ($request) use ($dlcIds) {
                parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);
                $appId = (string) ($query['appids'] ?? '');

                if ($appId === '620') {
                    return Http::response([
                        '620' => ['success' => true, 'data' => ['dlc' => $dlcIds]],
                    ]);
                }

                $this->assertNotSame('', $appId);

                return Http::response([
                    $appId => [
                        'success' => true,
                        'data' => [
                            'name' => "Expansion {$appId}",
                            'price_overview' => ['initial' => 499],
                        ],
                    ],
                ]);
            },
        ]);

        $this->getJson('/steam-enrichment/620/dlcs?load=1')
            ->assertOk()
            ->assertJsonCount(count($dlcIds), 'data.dlcs')
            ->assertJsonPath('data.dlcs.0.title', 'Expansion 1000')
            ->assertJsonPath('data.dlcs.0.base_price', 4.99)
            ->assertJsonPath('warnings', []);

        $detailRequests = collect(Http::recorded())
            ->map(fn (array $record) => $record[0])
            ->filter(function ($request) {
                parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);

                return ($query['appids'] ?? null) !== '620';
            });

        $this->assertCount(count($dlcIds), $detailRequests);
        $this->assertNoSteamApiKeyWasSent();
    }

    public function test_successful_metadata_is_cached_for_five_minutes(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => ['publishers' => ['Valve']]],
            ]),
        ]);

        $this->getJson('/steam-enrichment/620/metadata')->assertOk();
        $this->getJson('/steam-enrichment/620/metadata')->assertOk();

        Http::assertSentCount(1);
    }

    public function test_metadata_retries_transient_failures_before_returning_data(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::sequence()
                ->push(['error' => 'temporary'], 503)
                ->push([
                    '620' => ['success' => true, 'data' => ['publishers' => ['Valve']]],
                ]),
        ]);

        $this->getJson('/steam-enrichment/620/metadata')
            ->assertOk()
            ->assertJsonPath('data.publisher', 'Valve')
            ->assertJsonPath('warnings', []);

        Http::assertSentCount(2);
    }

    public function test_achievement_endpoint_falls_back_to_public_store_total(): void
    {
        Http::fake([
            'api.steampowered.com/*' => Http::response(['error' => 'temporary'], 503),
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => ['achievements' => ['total' => 51]]],
            ]),
        ]);

        $this->getJson('/steam-enrichment/620/achievements')
            ->assertOk()
            ->assertJsonPath('data.total_achievements', 51)
            ->assertJsonPath('data.source', 'store_details')
            ->assertJsonPath('warnings', []);
    }

    public function test_achievement_endpoint_retries_before_using_fallback(): void
    {
        Http::fake([
            'api.steampowered.com/*' => Http::sequence()
                ->push(['error' => 'temporary'], 503)
                ->push([
                    'achievementpercentages' => [
                        'achievements' => [
                            ['name' => 'A', 'percent' => 90],
                            ['name' => 'B', 'percent' => 50],
                        ],
                    ],
                ]),
        ]);

        $this->getJson('/steam-enrichment/620/achievements')
            ->assertOk()
            ->assertJsonPath('data.total_achievements', 2)
            ->assertJsonPath('data.source', 'global_percentages')
            ->assertJsonPath('warnings', []);

        Http::assertSentCount(2);
    }

    public function test_large_dlc_catalog_requires_confirmation_before_loading_details(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => ['dlc' => range(1000, 1025)]],
            ]),
        ]);

        $this->getJson('/steam-enrichment/620/dlcs')
            ->assertOk()
            ->assertJsonPath('data.total', 26)
            ->assertJsonPath('data.loaded', 0)
            ->assertJsonPath('data.requires_confirmation', true)
            ->assertJsonPath('data.dlcs', [])
            ->assertJsonPath('warnings', []);

        Http::assertSentCount(1);
    }

    public function test_small_dlc_catalog_loads_without_confirmation(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => function ($request) {
                parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);
                $appId = (string) ($query['appids'] ?? '');

                if ($appId === '620') {
                    return Http::response([
                        '620' => ['success' => true, 'data' => ['dlc' => [700, 701]]],
                    ]);
                }

                return Http::response([
                    $appId => ['success' => true, 'data' => ['name' => "Expansion {$appId}"]],
                ]);
            },
        ]);

        $this->getJson('/steam-enrichment/620/dlcs')
            ->assertOk()
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.loaded', 2)
            ->assertJsonPath('data.requires_confirmation', false)
            ->assertJsonCount(2, 'data.dlcs');
    }

    public function test_dlc_retries_only_unresolved_app_ids(): void
    {
        $requests = ['620' => 0, '700' => 0, '701' => 0];

        Http::fake([
            'store.steampowered.com/api/appdetails*' => function ($request) use (&$requests) {
                parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);
                $appId = (string) ($query['appids'] ?? '');
                $requests[$appId]++;

                if ($appId === '620') {
                    return Http::response([
                        '620' => ['success' => true, 'data' => ['dlc' => [700, 701]]],
                    ]);
                }

                if ($appId === '701' && $requests[$appId] === 1) {
                    return Http::response(['error' => 'temporary'], 503);
                }

                return Http::response([
                    $appId => ['success' => true, 'data' => ['name' => "Expansion {$appId}"]],
                ]);
            },
        ]);

        $this->getJson('/steam-enrichment/620/dlcs')
            ->assertOk()
            ->assertJsonPath('data.loaded', 2)
            ->assertJsonPath('warnings', []);

        $this->assertSame(1, $requests['700']);
        $this->assertSame(2, $requests['701']);
    }

    public function test_invalid_app_ids_receive_validation_errors(): void
    {
        $this->getJson('/steam-enrichment/not-an-id/metadata')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('app_id');

        $this->getJson('/steam-enrichment/0/achievements')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('app_id');

        Http::assertNothingSent();
    }

    public function test_metadata_http_failure_returns_empty_data_and_warning(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response(['error' => 'unavailable'], 503),
        ]);

        $this->getJson('/steam-enrichment/620/metadata')
            ->assertOk()
            ->assertJsonPath('data.publisher', null)
            ->assertJsonPath('data.base_price_default', null)
            ->assertJsonCount(1, 'warnings');
    }

    public function test_metadata_malformed_and_empty_data_return_non_blocking_warnings(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => 'invalid'],
            ]),
        ]);

        $this->getJson('/steam-enrichment/620/metadata')
            ->assertOk()
            ->assertJsonPath('data.description', null)
            ->assertJsonCount(1, 'warnings');

        Cache::flush();
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => []],
            ]),
        ]);

        $this->getJson('/steam-enrichment/620/metadata')
            ->assertOk()
            ->assertJsonCount(1, 'warnings');
    }

    public function test_achievement_timeout_and_invalid_data_return_null_with_warnings(): void
    {
        Http::fake([
            'api.steampowered.com/*' => Http::failedConnection('timed out'),
            'store.steampowered.com/api/appdetails*' => Http::response(['error' => 'unavailable'], 503),
        ]);

        $this->getJson('/steam-enrichment/621/achievements')
            ->assertOk()
            ->assertJsonPath('data.total_achievements', null)
            ->assertJsonCount(1, 'warnings');

        Cache::flush();
        Http::fake([
            'api.steampowered.com/*' => Http::response([
                'achievementpercentages' => ['achievements' => 'invalid'],
            ]),
            'store.steampowered.com/api/appdetails*' => Http::response(['error' => 'unavailable'], 503),
        ]);

        $this->getJson('/steam-enrichment/622/achievements')
            ->assertOk()
            ->assertJsonPath('data.total_achievements', null)
            ->assertJsonCount(1, 'warnings');
    }

    public function test_empty_achievement_and_dlc_data_are_non_blocking(): void
    {
        Http::fake([
            'api.steampowered.com/*' => Http::response([
                'achievementpercentages' => ['achievements' => []],
            ]),
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => ['dlc' => []]],
            ]),
        ]);

        $this->getJson('/steam-enrichment/620/achievements')
            ->assertOk()
            ->assertJsonPath('data.total_achievements', null)
            ->assertJsonPath('warnings', []);

        $this->getJson('/steam-enrichment/620/dlcs')
            ->assertOk()
            ->assertJsonPath('data.dlcs', [])
            ->assertJsonPath('warnings', []);
    }

    public function test_dlc_detail_failures_return_partial_catalog_and_warning(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => function ($request) {
                parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);
                $appId = (string) ($query['appids'] ?? '');

                if ($appId === '620') {
                    return Http::response([
                        '620' => ['success' => true, 'data' => ['dlc' => [700, 701]]],
                    ]);
                }

                return $appId === '700'
                    ? Http::response(['700' => ['success' => true, 'data' => ['name' => 'Loaded DLC']]])
                    : Http::response(['error' => 'unavailable'], 500);
            },
        ]);

        $this->getJson('/steam-enrichment/620/dlcs?load=1')
            ->assertOk()
            ->assertJsonCount(1, 'data.dlcs')
            ->assertJsonPath('data.dlcs.0.title', 'Loaded DLC')
            ->assertJsonCount(1, 'warnings');
    }

    private function assertNoSteamApiKeyWasSent(): void
    {
        Http::assertNotSent(function ($request) {
            parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);

            return array_key_exists('key', $query);
        });
    }
}
