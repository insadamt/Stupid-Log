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
            'store.steampowered.com/*' => Http::response([
                'items' => [[
                    'id' => 620,
                    'name' => 'Portal 2',
                    'tiny_image' => 'https://cdn.example.test/portal.jpg',
                ]],
            ]),
        ]);

        $this->getJson('/provider-search?query=portal')
            ->assertOk()
            ->assertJsonStructure($this->searchShape())
            ->assertJsonPath('results.0.source', 'steam')
            ->assertJsonPath('results.0.external_id', '620')
            ->assertJsonPath('results.0.title', 'Portal 2')
            ->assertJsonPath('results.0.publisher', null)
            ->assertJsonPath('results.0.release_date', null)
            ->assertJsonPath('results.0.description', null)
            ->assertJsonPath('results.0.steam_app_id', '620')
            ->assertJsonPath('manual_available', true)
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
