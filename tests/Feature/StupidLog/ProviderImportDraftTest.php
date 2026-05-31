<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Device;
use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\ProviderImportDraft;
use App\Models\StupidLog\Status;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProviderImportDraftTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
        Storage::fake('public');
    }

    public function test_draft_creation_stores_provider_payload_without_final_rows(): void
    {
        Http::fake(['cdn.example.test/*' => Http::response('cover', 200, ['Content-Type' => 'image/jpeg'])]);

        $this->postJson('/provider-import-drafts', ['result' => $this->providerResult()])
            ->assertCreated()
            ->assertJsonPath('id', 1);

        $draft = ProviderImportDraft::firstOrFail();

        $this->assertSame('100', $draft->steam_app_id);
        $this->assertCount(2, $draft->dlcs);
        $this->assertArrayNotHasKey('cover_url_original', $draft->dlcs[0]);
        $this->assertSame(0, Dlc::count());
        Storage::disk('public')->assertExists($draft->cover_path);
    }

    public function test_final_save_promotes_draft_catalog_and_owned_dlcs_without_refetching_steam(): void
    {
        Http::fake(['cdn.example.test/*' => Http::response('cover', 200, ['Content-Type' => 'image/jpeg'])]);
        $draftId = $this->postJson('/provider-import-drafts', ['result' => $this->providerResult()])->json('id');

        Http::fake(function ($request) {
            $this->fail('Final save must not perform provider HTTP requests: '.$request->url());
        });

        $this->post('/library-games', $this->payload([
            'import_draft_id' => $draftId,
            'game' => [
                'title' => 'Steam Game',
                'source' => 'steam',
                'external_id' => '100',
                'steam_app_id' => '100',
                'create_duplicate_anyway' => true,
            ],
            'owned_dlcs' => [[
                'steam_app_id' => '200',
                'acquisition_type' => 'Owned',
                'purchased_price' => 7.5,
                'purchased_at' => '2026-05-23',
            ]],
        ]))->assertRedirect();

        $libraryGame = $this->user->libraryGames()->latest()->firstOrFail();

        $this->assertSame(2, Dlc::where('game_id', $libraryGame->game_id)->count());
        $this->assertNull(Dlc::where('steam_app_id', '200')->value('cover_url_original'));
        $this->assertNull(Dlc::where('steam_app_id', '200')->value('cover_path'));
        $this->assertDatabaseHas('owned_dlcs', [
            'library_game_id' => $libraryGame->id,
            'dlc_id' => Dlc::where('steam_app_id', '200')->value('id'),
            'acquisition_type' => 'Owned',
        ]);
        $this->assertNotNull(ProviderImportDraft::find($draftId)->consumed_at);
    }

    public function test_submitted_cover_path_wins_over_provider_import_draft_cover(): void
    {
        Http::fake(['cdn.example.test/*' => Http::response('provider cover', 200, ['Content-Type' => 'image/jpeg'])]);
        $draftId = $this->postJson('/provider-import-drafts', ['result' => $this->providerResult()])->json('id');
        $providerCoverPath = ProviderImportDraft::findOrFail($draftId)->cover_path;
        $submittedCoverPath = 'covers/games/custom-upload.jpg';
        Storage::disk('public')->put($submittedCoverPath, 'custom cover');

        $this->post('/library-games', $this->payload([
            'import_draft_id' => $draftId,
            'game' => [
                'title' => 'Custom Covered Steam Game',
                'source' => 'steam',
                'external_id' => '100',
                'steam_app_id' => '100',
                'cover_url_original' => null,
                'cover_path' => $submittedCoverPath,
                'create_duplicate_anyway' => true,
            ],
        ]))->assertRedirect();

        $game = $this->user->libraryGames()->latest()->firstOrFail()->game;

        $this->assertSame('Custom Covered Steam Game', $game->title);
        $this->assertSame($submittedCoverPath, $game->cover_path);
        $this->assertNull($game->cover_url_original);
        Storage::disk('public')->assertMissing($providerCoverPath);
        Storage::disk('public')->assertExists($submittedCoverPath);
    }

    public function test_cancel_removes_unconsumed_draft_and_temporary_cover(): void
    {
        Http::fake(['cdn.example.test/*' => Http::response('cover', 200, ['Content-Type' => 'image/jpeg'])]);
        $draftId = $this->postJson('/provider-import-drafts', ['result' => $this->providerResult()])->json('id');
        $path = ProviderImportDraft::findOrFail($draftId)->cover_path;

        $this->deleteJson("/provider-import-drafts/{$draftId}")->assertOk();

        $this->assertDatabaseMissing('provider_import_drafts', ['id' => $draftId]);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_cleanup_command_deletes_expired_unconsumed_drafts(): void
    {
        $draft = ProviderImportDraft::create([
            'user_id' => $this->user->id,
            'provider_key' => 'steam',
            'external_id' => 'expired',
            'game_payload' => ['title' => 'Expired'],
            'dlcs' => [],
            'cover_path' => 'covers/provider-drafts/test.jpg',
            'expires_at' => now()->subMinute(),
        ]);
        Storage::disk('public')->put($draft->cover_path, 'cover');

        Artisan::call('stupid-log:cleanup-provider-import-drafts');

        $this->assertDatabaseMissing('provider_import_drafts', ['id' => $draft->id]);
        Storage::disk('public')->assertMissing($draft->cover_path);
    }

    public function test_game_details_show_imported_unowned_dlcs_without_covers(): void
    {
        Http::fake();
        $draft = ProviderImportDraft::create([
            'user_id' => $this->user->id,
            'provider_key' => 'steam',
            'external_id' => '100',
            'steam_app_id' => '100',
            'game_payload' => $this->providerResult(),
            'dlcs' => [
                ['steam_app_id' => '200', 'title' => 'Expansion One', 'base_price' => 19.99],
                ['steam_app_id' => '201', 'title' => 'Expansion Two', 'base_price' => 0],
            ],
            'expires_at' => now()->addHour(),
        ]);

        $this->post('/library-games', $this->payload([
            'import_draft_id' => $draft->id,
            'game' => [
                'title' => 'Steam Game',
                'source' => 'steam',
                'external_id' => '100',
                'steam_app_id' => '100',
                'create_duplicate_anyway' => true,
            ],
        ]))->assertRedirect();

        $libraryGame = $this->user->libraryGames()->latest()->firstOrFail();

        $this->get("/games/{$libraryGame->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->component('GameDetails', false)
                ->where('dlcs.0.title', 'Expansion One')
                ->where('dlcs.0.state', 'Not Owned')
                ->missing('dlcs.0.cover_url')
                ->where('dlcs.1.title', 'Expansion Two')
                ->where('dlcs.1.state', 'Not Owned'));
    }

    private function providerResult(): array
    {
        return [
            'source' => 'steam',
            'external_id' => '100',
            'title' => 'Steam Game',
            'cover_url_original' => 'https://cdn.example.test/cover.jpg',
            'publisher' => 'Valve',
            'release_date' => '2026-05-01',
            'description' => 'Imported from Steam.',
            'steam_app_id' => '100',
            'base_price_default' => 59.99,
            'base_price_source' => 'steam',
            'total_achievements' => 3,
            'total_achievements_source' => 'steam',
            'dlcs' => [
                ['steam_app_id' => '200', 'title' => 'Expansion One', 'cover_url_original' => 'https://cdn.example.test/200.jpg', 'base_price' => 19.99],
                ['steam_app_id' => '201', 'title' => 'Expansion Two', 'cover_url_original' => 'https://cdn.example.test/201.jpg', 'base_price' => 0],
            ],
        ];
    }

    private function payload(array $overrides = []): array
    {
        $platform = Platform::where('name', 'Steam')->firstOrFail();
        $device = Device::where('name', 'PC')->firstOrFail();
        $ownership = OwnershipType::where('name', 'Digital')->firstOrFail();
        $status = Status::where('name', 'Not Played')->firstOrFail();

        return array_replace_recursive([
            'game' => [
                'title' => 'Steam Game',
                'source' => 'manual',
                'total_achievements' => 0,
                'create_duplicate_anyway' => true,
            ],
            'platform_id' => $platform->id,
            'device_ids' => [$device->id],
            'ownership_copies' => [[
                'ownership_type_id' => $ownership->id,
                'base_price' => 20,
                'purchased_price' => 10,
            ]],
            'progress' => [
                'status_id' => $status->id,
                'playtime_hours' => 0,
                'earned_achievements' => 0,
            ],
        ], $overrides);
    }
}
