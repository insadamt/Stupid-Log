<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\ExternalGameId;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\InAppPurchase;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnedDlc;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\StupidLog\SubscriptionEntry;
use App\Models\User;
use App\Services\StupidLog\BackupExportService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class DataPortabilityTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');
        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_export_contains_manifest_data_covers_and_no_credentials(): void
    {
        $this->createPortableGraph();
        $igdb = Provider::where('key', 'igdb')->firstOrFail();
        ProviderCredential::create([
            'user_id' => $this->user->id,
            'provider_id' => $igdb->id,
            'encrypted_client_id' => Crypt::encryptString('portable-client-id'),
            'encrypted_client_secret' => Crypt::encryptString('portable-secret'),
            'is_enabled' => true,
        ]);

        $response = $this->get('/settings/data/export')->assertOk();
        $response->assertDownload();
        $zip = $this->openZip($response->baseResponse->getFile()->getPathname());
        $manifest = json_decode($zip->getFromName('manifest.json'), true);
        $dataJson = $zip->getFromName('data.json');

        $this->assertSame('stupid-log-backup', $manifest['format']);
        $this->assertSame(1, $manifest['format_version']);
        $this->assertSame(hash('sha256', $dataJson), $manifest['data_sha256']);
        $this->assertNotFalse($zip->locateName('covers/games/1.jpg'));
        $this->assertNotFalse($zip->locateName('covers/dlcs/1.jpg'));
        $this->assertStringNotContainsString('portable-client-id', $dataJson);
        $this->assertStringNotContainsString('portable-secret', $dataJson);
        $this->assertStringNotContainsString('provider_credentials', $dataJson);
        $zip->close();
    }

    public function test_import_preview_returns_backup_metadata_and_counts(): void
    {
        $this->createPortableGraph();
        $archive = $this->exportArchive();

        $this->postJson('/settings/data/import/preview', [
            'backup' => $this->uploadedArchive($archive),
        ])->assertOk()
            ->assertJsonPath('metadata.username', 'Player One')
            ->assertJsonPath('metadata.format_version', 1)
            ->assertJsonPath('counts.games', 1)
            ->assertJsonPath('counts.library_games', 1)
            ->assertJsonPath('counts.subscriptions', 1)
            ->assertJsonPath('counts.in_app_purchases', 1)
            ->assertJsonPath('counts.snapshots', 1);
    }

    public function test_invalid_zip_and_unsupported_version_are_rejected(): void
    {
        $invalid = UploadedFile::fake()->createWithContent('invalid.stupidlog.zip', 'not a zip');
        $this->postJson('/settings/data/import/preview', ['backup' => $invalid])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('backup');

        $this->createPortableGraph();
        $archive = $this->exportArchive();
        $zip = $this->openZip($archive);
        $manifest = json_decode($zip->getFromName('manifest.json'), true);
        $manifest['format_version'] = 999;
        $zip->addFromString('manifest.json', json_encode($manifest, JSON_THROW_ON_ERROR));
        $zip->close();

        $this->postJson('/settings/data/import/preview', [
            'backup' => $this->uploadedArchive($archive),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('backup');
    }

    public function test_missing_cover_and_path_traversal_are_rejected(): void
    {
        $this->createPortableGraph();
        $missingCoverArchive = $this->exportArchive();
        $zip = $this->openZip($missingCoverArchive);
        $data = json_decode($zip->getFromName('data.json'), true);
        $coverPath = $data['games'][0]['archive_cover_path'];
        $zip->deleteName($coverPath);
        $zip->close();

        $this->postJson('/settings/data/import/preview', [
            'backup' => $this->uploadedArchive($missingCoverArchive),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('backup');

        $traversalArchive = $this->exportArchive();
        $zip = $this->openZip($traversalArchive);
        $zip->addFromString('../escape.txt', 'bad');
        $zip->close();

        $this->postJson('/settings/data/import/preview', [
            'backup' => $this->uploadedArchive($traversalArchive),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('backup');
    }

    public function test_restore_replaces_current_data_and_preserves_complete_graph(): void
    {
        $source = $this->createPortableGraph();
        $archive = $this->exportArchive();
        $steam = Provider::where('key', 'steam')->firstOrFail();
        ProviderCredential::create([
            'user_id' => $this->user->id,
            'provider_id' => $steam->id,
            'encrypted_api_key' => Crypt::encryptString('destination-steam-key'),
            'is_enabled' => true,
        ]);
        $destinationOnly = $this->createLibraryGame('Destination Only');
        $destinationOnlyTitle = $destinationOnly->game->title;
        $this->user->update(['username' => 'Destination User']);
        $this->user->settings()->update(['currency_code' => 'EUR']);

        $preview = $this->postJson('/settings/data/import/preview', [
            'backup' => $this->uploadedArchive($archive),
        ])->assertOk()->json();

        $this->postJson('/settings/data/import/restore', [
            'restore_token' => $preview['restore_token'],
            'confirmation' => 'RESTORE',
        ])->assertOk();

        $this->assertSame('Player One', $this->user->refresh()->username);
        $this->assertSame('USD', $this->user->settings->currency_code);
        $this->assertDatabaseMissing('games', ['title' => $destinationOnlyTitle]);
        $this->assertDatabaseHas('games', ['title' => $source['game']->title]);
        $this->assertDatabaseHas('external_game_ids', ['external_id' => 'portable-100']);
        $this->assertDatabaseHas('library_games', [
            'playtime_hours' => 42.5,
            'earned_achievements' => 8,
        ]);
        $this->assertDatabaseHas('subscription_entry_ownership_copies', []);
        $this->assertDatabaseHas('subscription_entry_year_ownership_copies', [
            'allocated_amount' => 12,
        ]);
        $this->assertDatabaseHas('in_app_purchases', [
            'title' => 'Coin Pack',
            'is_locked' => true,
        ]);
        $this->assertDatabaseHas('snapshot_best_games', ['rank' => 1]);
        $this->assertDatabaseHas('library_game_snapshots', ['playtime_hours' => 42.5]);
        $this->assertDatabaseHas('ownership_copy_snapshots', ['purchased_price' => 19.99]);
        $this->assertDatabaseHas('owned_dlc_snapshots', ['purchased_price' => 4.99]);
        $this->assertSame(
            'destination-steam-key',
            Crypt::decryptString(ProviderCredential::where('provider_id', $steam->id)->firstOrFail()->encrypted_api_key),
        );
        $this->assertTrue(Storage::disk('public')->exists(Game::firstWhere('title', 'Portable Game')->cover_path));
    }

    public function test_restore_token_is_one_time_and_confirmation_is_required(): void
    {
        $this->createPortableGraph();
        $preview = $this->postJson('/settings/data/import/preview', [
            'backup' => $this->uploadedArchive($this->exportArchive()),
        ])->assertOk()->json();

        $this->postJson('/settings/data/import/restore', [
            'restore_token' => $preview['restore_token'],
            'confirmation' => 'wrong',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('confirmation');

        $payload = [
            'restore_token' => $preview['restore_token'],
            'confirmation' => 'RESTORE',
        ];
        $this->postJson('/settings/data/import/restore', $payload)->assertOk();
        $this->postJson('/settings/data/import/restore', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('restore_token');
    }

    public function test_expired_restore_token_is_rejected(): void
    {
        $this->createPortableGraph();
        $preview = $this->postJson('/settings/data/import/preview', [
            'backup' => $this->uploadedArchive($this->exportArchive()),
        ])->assertOk()->json();
        $previewPath = "backups/imports/{$preview['restore_token']}/preview.json";
        $metadata = json_decode(Storage::disk('local')->get($previewPath), true);
        $metadata['expires_at'] = now()->subMinute()->toIso8601String();
        Storage::disk('local')->put($previewPath, json_encode($metadata, JSON_THROW_ON_ERROR));

        $this->postJson('/settings/data/import/restore', [
            'restore_token' => $preview['restore_token'],
            'confirmation' => 'RESTORE',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('restore_token');
    }

    public function test_failed_media_restore_does_not_replace_current_data_or_cover(): void
    {
        $this->createPortableGraph();
        $archive = $this->exportArchive();
        $existingGameId = Game::firstOrFail()->id;
        $existingCoverPath = Game::firstOrFail()->cover_path;

        $preview = $this->postJson('/settings/data/import/preview', [
            'backup' => $this->uploadedArchive($archive),
        ])->assertOk()->json();
        Storage::disk('local')->delete(
            "backups/imports/{$preview['restore_token']}/staged/covers/games/{$existingGameId}.jpg",
        );

        $this->postJson('/settings/data/import/restore', [
            'restore_token' => $preview['restore_token'],
            'confirmation' => 'RESTORE',
        ])->assertServerError();

        $this->assertDatabaseHas('games', ['id' => $existingGameId, 'title' => 'Portable Game']);
        $this->assertDatabaseCount('library_games', 1);
        Storage::disk('public')->assertExists($existingCoverPath);
        $this->assertSame(
            [],
            Storage::disk('public')->allFiles('covers/imports'),
        );
    }

    private function createPortableGraph(): array
    {
        Storage::disk('public')->put('covers/games/portable.jpg', 'game cover');
        Storage::disk('public')->put('covers/dlcs/portable-dlc.jpg', 'dlc cover');
        $provider = Provider::where('key', 'steam')->firstOrFail();
        $platform = Platform::where('name', 'Steam')->firstOrFail();
        $status = Status::where('name', 'Completed')->firstOrFail();
        $game = Game::create([
            'title' => 'Portable Game',
            'normalized_title' => 'portable game',
            'cover_url_original' => 'https://example.test/portable.jpg',
            'cover_path' => 'covers/games/portable.jpg',
            'source_provider_id' => $provider->id,
            'total_achievements' => 10,
        ]);
        ExternalGameId::create([
            'game_id' => $game->id,
            'provider_id' => $provider->id,
            'external_id' => 'portable-100',
        ]);
        $libraryGame = LibraryGame::create([
            'user_id' => $this->user->id,
            'game_id' => $game->id,
            'platform_id' => $platform->id,
            'status_id' => $status->id,
            'playtime_hours' => 42.5,
            'earned_achievements' => 8,
            'completed_at' => '2026-05-01',
        ]);
        $libraryGame->devices()->attach(
            DB::table('devices')->where('name', 'PC')->value('id'),
        );
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();
        $copy = OwnershipCopy::create([
            'library_game_id' => $libraryGame->id,
            'ownership_type_id' => $gamePass->id,
            'base_price' => 29.99,
            'purchased_price' => 19.99,
            'purchased_at' => '2026-01-01',
        ]);
        $dlc = Dlc::create([
            'game_id' => $game->id,
            'steam_app_id' => '200',
            'title' => 'Portable DLC',
            'cover_path' => 'covers/dlcs/portable-dlc.jpg',
            'source_provider_id' => $provider->id,
            'base_price' => 9.99,
        ]);
        $ownedDlc = OwnedDlc::create([
            'library_game_id' => $libraryGame->id,
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
            'purchased_price' => 4.99,
            'purchased_at' => '2026-02-01',
        ]);
        $snapshot = SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => 2026,
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'summary_json' => ['library_games' => 1],
        ]);
        $this->createSnapshotRows($snapshot, $libraryGame, $game, $copy, $ownedDlc, $dlc);
        $subscription = SubscriptionEntry::create([
            'user_id' => $this->user->id,
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 12,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-01-31',
        ]);
        $subscription->ownershipCopies()->attach($copy->id);
        $year = $subscription->years()->create([
            'year' => 2026,
            'amount_allocated' => 12,
            'is_locked' => true,
            'locked_at' => now(),
            'locked_by_snapshot_run_id' => $snapshot->id,
            'locked_reason' => 'snapshot',
        ]);
        $year->ownershipCopies()->attach($copy->id, ['allocated_amount' => 12]);
        InAppPurchase::create([
            'library_game_id' => $libraryGame->id,
            'title' => 'Coin Pack',
            'amount_paid' => 3.99,
            'purchased_at' => '2026-03-01',
            'is_locked' => true,
            'locked_at' => now(),
            'locked_by_snapshot_run_id' => $snapshot->id,
            'locked_reason' => 'snapshot',
        ]);

        return compact('game', 'libraryGame', 'copy', 'dlc', 'ownedDlc', 'snapshot');
    }

    private function createSnapshotRows(
        SnapshotRun $snapshot,
        LibraryGame $libraryGame,
        Game $game,
        OwnershipCopy $copy,
        OwnedDlc $ownedDlc,
        Dlc $dlc,
    ): void {
        $timestamps = ['created_at' => now(), 'updated_at' => now()];
        DB::table('library_game_snapshots')->insert([
            'snapshot_run_id' => $snapshot->id,
            'library_game_id' => $libraryGame->id,
            'game_id' => $game->id,
            'platform_id' => $libraryGame->platform_id,
            'status_id' => $libraryGame->status_id,
            'playtime_hours' => 42.5,
            'earned_achievements' => 8,
            'total_achievements' => 10,
            'completed_at' => '2026-05-01',
            ...$timestamps,
        ]);
        DB::table('ownership_copy_snapshots')->insert([
            'snapshot_run_id' => $snapshot->id,
            'ownership_copy_id' => $copy->id,
            'library_game_id' => $libraryGame->id,
            'ownership_type_id' => $copy->ownership_type_id,
            'base_price' => 29.99,
            'purchased_price' => 19.99,
            'purchased_at' => '2026-01-01',
            ...$timestamps,
        ]);
        DB::table('owned_dlc_snapshots')->insert([
            'snapshot_run_id' => $snapshot->id,
            'owned_dlc_id' => $ownedDlc->id,
            'library_game_id' => $libraryGame->id,
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
            'base_price' => 9.99,
            'purchased_price' => 4.99,
            'purchased_at' => '2026-02-01',
            ...$timestamps,
        ]);
        DB::table('snapshot_best_games')->insert([
            'snapshot_run_id' => $snapshot->id,
            'library_game_id' => $libraryGame->id,
            'game_id' => $game->id,
            'rank' => 1,
            ...$timestamps,
        ]);
    }

    private function createLibraryGame(string $title): LibraryGame
    {
        $game = Game::create(['title' => $title, 'normalized_title' => strtolower($title)]);

        return LibraryGame::create([
            'user_id' => $this->user->id,
            'game_id' => $game->id,
            'platform_id' => Platform::where('name', 'Steam')->firstOrFail()->id,
            'status_id' => Status::where('name', 'Not Played')->firstOrFail()->id,
        ]);
    }

    private function exportArchive(): string
    {
        return app(BackupExportService::class)
            ->download($this->user->refresh())
            ->getFile()
            ->getPathname();
    }

    private function uploadedArchive(string $path): UploadedFile
    {
        return new UploadedFile($path, 'backup.stupidlog.zip', 'application/zip', null, true);
    }

    private function openZip(string $path): ZipArchive
    {
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path) === true);

        return $zip;
    }
}
