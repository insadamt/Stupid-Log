<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Platform;
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

        $this->assertSame('1.1.0', config('app.version'));
        $this->get('/setup')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Setup', false)
                ->where('appVersion', '1.1.0'));
    }

    public function test_reference_seeder_assigns_stable_platform_colors_without_duplicates(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);
        $this->seed(StupidLogReferenceSeeder::class);

        $this->assertSame(14, Platform::count());
        $this->assertDatabaseHas('platforms', [
            'name' => 'Steam',
            'color_key' => 'steam_blue',
            'color_hex' => '#61C7DF',
        ]);
        $this->assertDatabaseHas('platforms', [
            'name' => 'Xbox',
            'color_key' => 'xbox_green',
            'color_hex' => '#9BE44D',
        ]);
        $this->assertDatabaseHas('platforms', [
            'name' => 'Google Play Games',
            'color_key' => 'google_play_green',
            'color_hex' => '#B7D85C',
        ]);
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
        $this->postJson('/settings/igdb/test')->assertRedirect('/setup');
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

    public function test_setup_igdb_test_validates_missing_and_invalid_values(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);

        $this->postJson('/setup/igdb/test')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Add both IGDB Client ID and Client Secret before testing.');

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => ['invalid'],
            'igdb_client_secret' => ['invalid'],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['igdb_client_id', 'igdb_client_secret']);
    }

    public function test_setup_igdb_test_translates_provider_failures_into_human_messages(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);

        Http::fake([
            'id.twitch.tv/*' => Http::sequence()
                ->push(['status' => 400, 'message' => 'invalid client'], 400)
                ->push(['status' => 403, 'message' => 'invalid client secret'], 403)
                ->push(['internal' => 'sensitive detail'], 503),
        ]);

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => 'bad-client',
            'igdb_client_secret' => 'bad-secret',
        ])->assertUnprocessable()->assertJsonPath('message', 'The IGDB Client ID is invalid.');

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => 'client-id',
            'igdb_client_secret' => 'bad-secret',
        ])->assertUnprocessable()->assertJsonPath('message', 'The IGDB Client Secret is invalid.');

        $this->postJson('/setup/igdb/test', [
            'igdb_client_id' => 'client-id',
            'igdb_client_secret' => 'client-secret',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'IGDB is unavailable right now. Try again later.')
            ->assertJsonMissing(['internal' => 'sensitive detail']);
    }

    public function test_steam_credential_test_routes_and_frontend_references_are_removed(): void
    {
        $this->seed(StupidLogReferenceSeeder::class);

        $this->postJson('/setup/steam/test')->assertNotFound();

        $this->seed(DatabaseSeeder::class);
        $this->postJson('/settings/steam/test')->assertNotFound();

        foreach ([
            resource_path('js/Pages/Setup/index.tsx'),
            resource_path('js/Pages/Setup/types.ts'),
            resource_path('js/Pages/Setup/components/SetupWizard.tsx'),
            resource_path('js/Pages/Setup/components/SetupImportedProviders.tsx'),
            resource_path('js/Pages/Settings.tsx'),
            resource_path('js/Pages/Settings/IntegrationsPanel.tsx'),
        ] as $path) {
            $source = file_get_contents($path);
            $this->assertStringNotContainsString('steam_api_key', $source);
            $this->assertStringNotContainsString('/steam/test', $source);
        }
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
