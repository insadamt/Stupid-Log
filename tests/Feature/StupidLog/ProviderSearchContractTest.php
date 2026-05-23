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

    public function test_provider_search_returns_stable_shape_when_credentials_are_missing(): void
    {
        Http::fake([
            'store.steampowered.com/*' => Http::response(['items' => []]),
        ]);

        $this->getJson('/provider-search?query=halo')
            ->assertOk()
            ->assertJsonStructure($this->emptySearchShape())
            ->assertJson([
                'query' => 'halo',
                'source_order' => ['igdb', 'steam', 'manual'],
                'results' => [],
                'manual_available' => true,
            ])
            ->assertJsonMissingPath('encrypted_api_key')
            ->assertJsonMissingPath('encrypted_client_secret');
    }

    public function test_provider_search_falls_back_to_steam_when_igdb_fails(): void
    {
        $user = User::firstOrFail();
        ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => Provider::where('key', 'igdb')->firstOrFail()->id,
            'encrypted_client_id' => Crypt::encryptString('client-id'),
            'encrypted_client_secret' => Crypt::encryptString('client-secret'),
            'is_enabled' => true,
        ]);

        Http::fake([
            'id.twitch.tv/*' => Http::response(['error' => 'unavailable'], 500),
            'store.steampowered.com/api/storesearch*' => Http::response([
                'items' => [[
                    'id' => 620,
                    'name' => 'Portal 2',
                    'tiny_image' => 'https://cdn.example.test/portal.jpg',
                ]],
            ]),
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => [
                    'success' => true,
                    'data' => [
                        'name' => 'Portal 2',
                        'header_image' => 'https://cdn.example.test/portal-header.jpg',
                        'publishers' => ['Valve'],
                        'short_description' => 'A test chamber puzzle game.',
                        'price_overview' => ['initial' => 999],
                    ],
                ],
            ]),
            'api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/*' => Http::response([
                'game' => [
                    'availableGameStats' => [
                        'achievements' => [
                            ['name' => 'A'],
                            ['name' => 'B'],
                        ],
                    ],
                ],
            ]),
        ]);

        $this->getJson('/provider-search?query=portal')
            ->assertOk()
            ->assertJsonStructure($this->searchShape())
            ->assertJsonPath('results.0.source', 'steam')
            ->assertJsonPath('results.0.external_id', '620')
            ->assertJsonPath('results.0.title', 'Portal 2')
            ->assertJsonPath('results.0.publisher', 'Valve')
            ->assertJsonPath('results.0.release_date', null)
            ->assertJsonPath('results.0.description', 'A test chamber puzzle game.')
            ->assertJsonPath('results.0.steam_app_id', '620')
            ->assertJsonPath('results.0.base_price_default', 9.99)
            ->assertJsonPath('results.0.base_price_source', 'steam')
            ->assertJsonPath('results.0.total_achievements', 2)
            ->assertJsonPath('results.0.total_achievements_source', 'steam')
            ->assertJsonPath('manual_available', true)
            ->assertJsonCount(1, 'warnings');
    }

    public function test_igdb_results_with_steam_app_ids_are_auto_filled_from_steam(): void
    {
        $user = User::firstOrFail();
        ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => Provider::where('key', 'igdb')->firstOrFail()->id,
            'encrypted_client_id' => Crypt::encryptString('client-id'),
            'encrypted_client_secret' => Crypt::encryptString('client-secret'),
            'is_enabled' => true,
        ]);

        Http::fake([
            'id.twitch.tv/*' => Http::response(['access_token' => 'token']),
            'api.igdb.com/v4/games' => Http::response([[
                'id' => 1,
                'name' => 'Portal 2',
                'summary' => 'IGDB summary.',
                'external_games' => [[
                    'category' => 1,
                    'uid' => '620',
                ]],
            ]]),
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => [
                    'success' => true,
                    'data' => [
                        'price_overview' => ['initial' => 999],
                    ],
                ],
            ]),
            'api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/*' => Http::response([
                'game' => [
                    'availableGameStats' => [
                        'achievements' => [
                            ['name' => 'A'],
                            ['name' => 'B'],
                            ['name' => 'C'],
                        ],
                    ],
                ],
            ]),
        ]);

        $this->getJson('/provider-search?query=portal')
            ->assertOk()
            ->assertJsonPath('results.0.source', 'igdb')
            ->assertJsonPath('results.0.steam_app_id', '620')
            ->assertJsonPath('results.0.base_price_default', 9.99)
            ->assertJsonPath('results.0.base_price_source', 'steam')
            ->assertJsonPath('results.0.total_achievements', 3)
            ->assertJsonPath('results.0.total_achievements_source', 'steam');
    }

    public function test_steam_price_auto_fill_survives_achievement_schema_failures(): void
    {
        Http::fake([
            'store.steampowered.com/api/storesearch*' => Http::response([
                'items' => [[
                    'id' => 620,
                    'name' => 'Portal 2',
                    'tiny_image' => 'https://cdn.example.test/portal.jpg',
                ]],
            ]),
            'store.steampowered.com/api/appdetails*' => Http::response([
                '620' => [
                    'success' => true,
                    'data' => [
                        'price_overview' => ['initial' => 999],
                    ],
                ],
            ]),
            'api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/*' => Http::response(['error' => 'unavailable'], 500),
        ]);

        $this->getJson('/provider-search?query=portal')
            ->assertOk()
            ->assertJsonPath('results.0.source', 'steam')
            ->assertJsonPath('results.0.steam_app_id', '620')
            ->assertJsonPath('results.0.base_price_default', 9.99)
            ->assertJsonPath('results.0.base_price_source', 'steam')
            ->assertJsonPath('results.0.total_achievements', null)
            ->assertJsonPath('results.0.total_achievements_source', null)
            ->assertJsonCount(1, 'warnings');
    }

    public function test_provider_search_survives_steam_metadata_failures_after_results_are_found(): void
    {
        Http::fake([
            'store.steampowered.com/api/storesearch*' => Http::response([
                'items' => [[
                    'id' => 620,
                    'name' => 'Portal 2',
                    'tiny_image' => 'https://cdn.example.test/portal.jpg',
                ]],
            ]),
            'store.steampowered.com/api/appdetails*' => Http::response(['error' => 'unavailable'], 500),
        ]);

        $this->getJson('/provider-search?query=portal')
            ->assertOk()
            ->assertJsonPath('results.0.source', 'steam')
            ->assertJsonPath('results.0.steam_app_id', '620')
            ->assertJsonPath('results.0.base_price_default', null)
            ->assertJsonPath('results.0.base_price_source', null)
            ->assertJsonPath('results.0.total_achievements', null)
            ->assertJsonPath('results.0.total_achievements_source', null)
            ->assertJsonCount(1, 'warnings');
    }

    public function test_provider_search_returns_warnings_and_manual_entry_when_all_providers_fail(): void
    {
        $user = User::firstOrFail();
        ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => Provider::where('key', 'igdb')->firstOrFail()->id,
            'encrypted_client_id' => Crypt::encryptString('client-id'),
            'encrypted_client_secret' => Crypt::encryptString('client-secret'),
            'is_enabled' => true,
        ]);

        Http::fake([
            'id.twitch.tv/*' => Http::response(['error' => 'unavailable'], 500),
            'store.steampowered.com/*' => Http::response(['error' => 'unavailable'], 500),
        ]);

        $this->getJson('/provider-search?query=zelda')
            ->assertOk()
            ->assertJsonStructure($this->emptySearchShape())
            ->assertJsonPath('results', [])
            ->assertJsonPath('manual_available', true)
            ->assertJsonCount(2, 'warnings');
    }

    private function searchShape(): array
    {
        return [
            'query',
            'source_order',
            'results' => [[
                'source',
                'external_id',
                'title',
                'cover_url_original',
                'publisher',
                'release_date',
                'description',
                'steam_app_id',
                'base_price_default',
                'base_price_source',
                'total_achievements',
                'total_achievements_source',
            ]],
            'manual_available',
            'warnings',
            'notice',
        ];
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
