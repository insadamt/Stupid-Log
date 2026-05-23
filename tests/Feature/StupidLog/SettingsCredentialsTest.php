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

class SettingsCredentialsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    public function test_blank_settings_credential_fields_preserve_existing_encrypted_credentials(): void
    {
        $user = User::firstOrFail();
        $igdb = Provider::where('key', 'igdb')->firstOrFail();
        $steam = Provider::where('key', 'steam')->firstOrFail();

        ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => $igdb->id,
            'encrypted_client_id' => Crypt::encryptString('existing-client-id'),
            'encrypted_client_secret' => Crypt::encryptString('existing-client-secret'),
            'is_enabled' => true,
        ]);

        ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => $steam->id,
            'encrypted_api_key' => Crypt::encryptString('existing-steam-key'),
            'is_enabled' => true,
        ]);

        $this->from('/settings')->patch('/settings', [
            'username' => 'Player Two',
            'currency_code' => 'USD',
            'igdb_client_id' => '',
            'igdb_client_secret' => '',
            'steam_api_key' => '',
        ])->assertRedirect('/settings');

        $igdbCredential = ProviderCredential::where('user_id', $user->id)->where('provider_id', $igdb->id)->firstOrFail();
        $steamCredential = ProviderCredential::where('user_id', $user->id)->where('provider_id', $steam->id)->firstOrFail();

        $this->assertSame('existing-client-id', Crypt::decryptString($igdbCredential->encrypted_client_id));
        $this->assertSame('existing-client-secret', Crypt::decryptString($igdbCredential->encrypted_client_secret));
        $this->assertSame('existing-steam-key', Crypt::decryptString($steamCredential->encrypted_api_key));
        $this->assertSame(1, User::count());
        $this->assertSame('Player Two', $user->refresh()->username);
    }

    public function test_non_blank_settings_credentials_replace_existing_encrypted_igdb_credentials(): void
    {
        $user = User::firstOrFail();
        $igdb = Provider::where('key', 'igdb')->firstOrFail();

        ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => $igdb->id,
            'encrypted_client_id' => Crypt::encryptString('old-client-id'),
            'encrypted_client_secret' => Crypt::encryptString('old-client-secret'),
            'is_enabled' => true,
        ]);

        $this->from('/settings')->patch('/settings', [
            'username' => 'Player One',
            'currency_code' => 'USD',
            'igdb_client_id' => 'new-client-id',
            'igdb_client_secret' => 'new-client-secret',
        ])->assertRedirect('/settings');

        $igdbCredential = ProviderCredential::where('user_id', $user->id)->where('provider_id', $igdb->id)->firstOrFail();

        $this->assertSame('new-client-id', Crypt::decryptString($igdbCredential->encrypted_client_id));
        $this->assertSame('new-client-secret', Crypt::decryptString($igdbCredential->encrypted_client_secret));
    }

    public function test_igdb_credentials_can_be_tested_from_settings(): void
    {
        Http::fake([
            'id.twitch.tv/*' => Http::response(['access_token' => 'token']),
            'api.igdb.com/*' => Http::response([['name' => 'Portal 2']]),
        ]);

        $this->postJson('/settings/igdb/test', [
            'igdb_client_id' => 'client-id',
            'igdb_client_secret' => 'client-secret',
        ])->assertOk()
            ->assertJson([
                'ok' => true,
                'message' => 'IGDB credentials work.',
            ]);
    }

    public function test_igdb_test_requires_saved_or_typed_credentials(): void
    {
        $this->postJson('/settings/igdb/test')
            ->assertUnprocessable()
            ->assertJson([
                'ok' => false,
                'message' => 'Add both IGDB Client ID and Client Secret before testing.',
            ]);
    }

    public function test_igdb_test_can_use_saved_credentials(): void
    {
        Http::fake([
            'id.twitch.tv/*' => Http::response(['access_token' => 'token']),
            'api.igdb.com/*' => Http::response([['name' => 'Portal 2']]),
        ]);

        $user = User::firstOrFail();
        $igdb = Provider::where('key', 'igdb')->firstOrFail();

        $credential = ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => $igdb->id,
            'encrypted_client_id' => Crypt::encryptString('saved-client-id'),
            'encrypted_client_secret' => Crypt::encryptString('saved-client-secret'),
            'is_enabled' => true,
        ]);

        $this->postJson('/settings/igdb/test')
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertSame('ok', $credential->refresh()->last_test_status);
        $this->assertNotNull($credential->last_tested_at);
    }
}
