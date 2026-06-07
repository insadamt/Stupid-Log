<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProviderSearchContractTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    public function test_provider_search_returns_stable_shape_when_igdb_credentials_are_missing(): void
    {
        $this->getJson('/provider-search?query=halo')
            ->assertOk()
            ->assertJsonStructure($this->emptySearchShape())
            ->assertJson([
                'query' => 'halo',
                'source_order' => ['igdb', 'steam', 'manual'],
                'results' => [],
                'manual_available' => true,
            ]);
    }

    public function test_provider_search_does_not_fall_back_to_steam_when_igdb_fails(): void
    {
        $this->storeIgdbCredential();

        Http::fake([
            'id.twitch.tv/*' => Http::response(['error' => 'unavailable'], 500),
            'store.steampowered.com/*' => Http::response(['items' => [['id' => 620, 'name' => 'Portal 2']]]),
        ]);

        $this->getJson('/provider-search?query=portal')
            ->assertOk()
            ->assertJsonPath('results', [])
            ->assertJsonPath('manual_available', true)
            ->assertJsonCount(1, 'warnings');
    }

    public function test_igdb_results_are_enriched_from_public_steam_endpoints_without_a_steam_credential(): void
    {
        $this->storeIgdbCredential();
        Http::fake([
            'id.twitch.tv/*' => Http::response(['access_token' => 'token']),
            'api.igdb.com/v4/games' => Http::response([[
                'id' => 1,
                'name' => 'Portal 2',
                'summary' => 'IGDB summary.',
                'external_games' => [['category' => 1, 'uid' => '620']],
            ]]),
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => ['price_overview' => ['initial' => 999]]],
            ]),
            'api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/*' => Http::response([
                'achievementpercentages' => [
                    'achievements' => [
                        ['name' => 'A', 'percent' => 80],
                        ['name' => 'B', 'percent' => 40],
                        ['name' => 'C', 'percent' => 10],
                    ],
                ],
            ]),
        ]);

        $this->getJson('/provider-search?query=portal&enrich=1')
            ->assertOk()
            ->assertJsonPath('results.0.source', 'igdb')
            ->assertJsonPath('results.0.steam_app_id', '620')
            ->assertJsonPath('results.0.base_price_default', 9.99)
            ->assertJsonPath('results.0.total_achievements', 3)
            ->assertJsonPath('results.0.total_achievements_source', 'steam')
            ->assertJsonCount(0, 'warnings');

        $this->assertSame(0, ProviderCredential::where('provider_id', Provider::where('key', 'steam')->value('id'))->count());
        $this->assertNoKeyedSteamRequestWasSent();
    }

    public function test_missing_steam_api_key_does_not_block_public_search(): void
    {
        Http::fake([
            'store.steampowered.com/api/storesearch*' => Http::response([
                'items' => [[
                    'id' => 620,
                    'name' => 'Portal 2',
                    'tiny_image' => 'https://cdn.example.test/portal.jpg',
                ]],
            ]),
        ]);

        $this->getJson('/provider-search?query=portal&provider=steam')
            ->assertOk()
            ->assertJsonPath('results.0.source', 'steam')
            ->assertJsonPath('results.0.title', 'Portal 2')
            ->assertJsonPath('results.0.steam_app_id', '620')
            ->assertJsonCount(0, 'warnings');

        $this->assertNoKeyedSteamRequestWasSent();
    }

    public function test_steam_list_search_skips_enrichment_even_when_requested(): void
    {
        Http::fake([
            'store.steampowered.com/api/storesearch*' => Http::response([
                'items' => [['id' => 620, 'name' => 'Portal 2']],
            ]),
        ]);

        $this->getJson('/provider-search?query=portal&provider=steam&enrich=1')
            ->assertOk()
            ->assertJsonPath('results.0.steam_app_id', '620')
            ->assertJsonPath('results.0.base_price_default', null)
            ->assertJsonPath('results.0.total_achievements', null)
            ->assertJsonCount(0, 'warnings');

        Http::assertSentCount(1);
    }

    public function test_public_store_search_failure_returns_a_non_blocking_warning(): void
    {
        Http::fake([
            'store.steampowered.com/api/storesearch*' => Http::failedConnection('Steam Store timed out.'),
        ]);

        $this->getJson('/provider-search?query=portal&provider=steam')
            ->assertOk()
            ->assertJsonPath('results', [])
            ->assertJsonPath('manual_available', true)
            ->assertJsonCount(1, 'warnings');

        $this->assertNoKeyedSteamRequestWasSent();
    }

    public function test_public_achievement_failure_keeps_total_null_without_blocking_metadata(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => ['price_overview' => ['initial' => 999]]],
            ]),
            'api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/*' => Http::response(['error' => 'unavailable'], 500),
        ]);

        $this->getJson('/provider-search?query=portal&provider=steam&enrich=1&steam_app_id=620')
            ->assertOk()
            ->assertJsonPath('results.0.base_price_default', 9.99)
            ->assertJsonPath('results.0.total_achievements', null)
            ->assertJsonPath('results.0.total_achievements_source', null)
            ->assertJsonCount(1, 'warnings');

        $this->assertNoKeyedSteamRequestWasSent();
    }

    public function test_empty_public_achievement_data_keeps_total_null_and_returns_a_warning(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => ['success' => true, 'data' => ['name' => 'Portal 2']],
            ]),
            'api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/*' => Http::response([
                'achievementpercentages' => ['achievements' => []],
            ]),
        ]);

        $this->getJson('/provider-search?query=portal&provider=steam&enrich=1&steam_app_id=620')
            ->assertOk()
            ->assertJsonPath('results.0.total_achievements', null)
            ->assertJsonCount(1, 'warnings');
    }

    public function test_public_achievement_enrichment_continues_when_store_metadata_fails(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => Http::response(['error' => 'unavailable'], 500),
            'api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/*' => Http::response([
                'achievementpercentages' => [
                    'achievements' => [
                        ['name' => 'A', 'percent' => 80],
                        ['name' => 'B', 'percent' => 40],
                    ],
                ],
            ]),
        ]);

        $this->getJson('/provider-search?query=portal&provider=steam&enrich=1&steam_app_id=620')
            ->assertOk()
            ->assertJsonPath('results.0.base_price_default', null)
            ->assertJsonPath('results.0.total_achievements', 2)
            ->assertJsonPath('results.0.total_achievements_source', 'steam')
            ->assertJsonCount(1, 'warnings');
    }

    private function storeIgdbCredential(): void
    {
        ProviderCredential::create([
            'user_id' => User::firstOrFail()->id,
            'provider_id' => Provider::where('key', 'igdb')->firstOrFail()->id,
            'encrypted_client_id' => Crypt::encryptString('client-id'),
            'encrypted_client_secret' => Crypt::encryptString('client-secret'),
            'is_enabled' => true,
        ]);
    }

    private function assertNoKeyedSteamRequestWasSent(): void
    {
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'GetSchemaForGame'));
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'IStoreService/GetAppList'));
        Http::assertNotSent(function ($request) {
            parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);

            return array_key_exists('key', $query);
        });
    }

    private function emptySearchShape(): array
    {
        return [
            'query',
            'source_order',
            'results',
            'manual_available',
            'warnings',
            'notice',
        ];
    }
}
