<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\ProviderCredential;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\StupidLogReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RuntimeFoundationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_application_version_is_configured_and_shared_with_inertia(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);

        $this->assertSame('1.0.0', config('app.version'));
        $this->get('/setup')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Setup', false)
                ->where('appVersion', '1.0.0'));
    }

    public function test_completed_installation_cannot_reopen_or_submit_setup(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->get('/setup')->assertRedirect('/');
        $this->post('/setup', ['username' => 'Replacement'])->assertRedirect('/');
        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => 'client-id',
            'igdb_client_secret' => 'client-secret',
        ])->assertRedirect('/');

        $this->assertSame('Player One', User::firstOrFail()->username);
    }

    public function test_incomplete_installation_cannot_access_application_or_settings_actions(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);

        $this->get('/')->assertRedirect('/setup');
        $this->get('/library')->assertRedirect('/setup');
        $this->get('/settings')->assertRedirect('/setup');
        $this->post('/settings/reset')->assertRedirect('/setup');
        $this->postJson('/settings/steam/test', [
            'steam_api_key' => 'key',
        ])->assertRedirect('/setup');
    }

    public function test_setup_igdb_credentials_can_be_tested_without_persisting_them(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);
        Http::fake([
            'id.twitch.tv/*' => Http::response(['access_token' => 'token']),
            'api.igdb.com/*' => Http::response([['name' => 'Portal 2']]),
        ]);

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => 'client-id',
            'igdb_client_secret' => 'client-secret',
        ])->assertOk()->assertJson([
            'ok' => true,
            'message' => 'IGDB credentials work.',
        ]);

        $this->assertSame(0, User::count());
        $this->assertSame(0, ProviderCredential::count());
    }

    public function test_setup_steam_credentials_can_be_tested_without_persisting_them(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);
        Http::fake([
            'api.steampowered.com/*' => Http::response(['apilist' => ['interfaces' => []]]),
        ]);

        $this->postJson('/setup/steam/test', [
            'steam_api_key' => 'steam-key',
        ])->assertOk()->assertJson([
            'ok' => true,
            'message' => 'Steam API key works.',
        ]);

        $this->assertSame(0, User::count());
        $this->assertSame(0, ProviderCredential::count());
    }

    public function test_setup_credential_tests_validate_missing_values(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);

        $this->postJson('/setup/igdb/test')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Add both IGDB Client ID and Client Secret before testing.');

        $this->postJson('/setup/steam/test')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Add a Steam API key before testing.');

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => ['invalid'],
            'igdb_client_secret' => ['invalid'],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['igdb_client_id', 'igdb_client_secret']);

        $this->postJson('/setup/steam/test', [
            'steam_api_key' => ['invalid'],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['steam_api_key']);
    }

    public function test_setup_credential_tests_translate_invalid_credentials_into_human_messages(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);

        Http::fake([
            'id.twitch.tv/*' => Http::sequence()
                ->push(['status' => 400, 'message' => 'invalid client'], 400)
                ->push(['status' => 403, 'message' => 'invalid client secret'], 403),
            'api.steampowered.com/*' => Http::response(['apilist' => ['interfaces' => []]], 403),
        ]);

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => 'bad-client',
            'igdb_client_secret' => 'bad-secret',
        ])->assertUnprocessable()
            ->assertJsonPath('ok', false)
            ->assertJsonPath('message', 'The IGDB Client ID is invalid.');

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => 'client-id',
            'igdb_client_secret' => 'bad-secret',
        ])->assertUnprocessable()
            ->assertJsonPath('ok', false)
            ->assertJsonPath('message', 'The IGDB Client Secret is invalid.');

        $this->postJson('/setup/steam/test', [
            'steam_api_key' => 'bad-key',
        ])->assertUnprocessable()
            ->assertJsonPath('ok', false)
            ->assertJsonPath('message', 'The Steam API key is invalid.');
    }

    public function test_setup_credential_tests_hide_unexpected_provider_responses(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);

        Http::fake([
            'id.twitch.tv/*' => Http::response(['internal' => 'sensitive IGDB detail'], 503),
            'api.steampowered.com/*' => Http::response(['internal' => 'sensitive Steam detail'], 503),
        ]);

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => 'client-id',
            'igdb_client_secret' => 'client-secret',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'IGDB is unavailable right now. Try again later.')
            ->assertJsonMissing(['internal' => 'sensitive IGDB detail']);

        $this->postJson('/setup/steam/test', [
            'steam_api_key' => 'steam-key',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Steam is unavailable right now. Try again later.')
            ->assertJsonMissing(['internal' => 'sensitive Steam detail']);
    }

    public function test_provider_import_cleanup_is_scheduled_daily(): void
    {
        Artisan::call('schedule:list');
        $scheduleOutput = preg_replace('/\e\[[0-9;]*m/', '', Artisan::output());
        $scheduleOutput = preg_replace('/\s+/', ' ', $scheduleOutput);

        $this->assertStringContainsString(
            '0 0 * * * php artisan stupid-log:cleanup-provider-import-drafts',
            $scheduleOutput,
        );
    }
}
