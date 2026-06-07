<?php

namespace Tests\Feature\StupidLog;

use App\DataTransferObjects\DataPortability\BackupArtifact;
use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\Dlc;
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
use App\Models\StupidLog\SubscriptionEntryYear;
use App\Models\User;
use App\Services\DataPortability\BackupExporter;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class DataPortabilityRestoreTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        Storage::fake('public');
    }

    protected function tearDown(): void
    {
        $this->deleteDirectory(storage_path('app/private/data-portability'));

        parent::tearDown();
    }

    public function test_restore_replaces_data_maps_relationships_and_preserves_current_user_and_credentials(): void
    {
        $user = User::firstOrFail();
        $user->update(['username' => 'Backup Username']);
        AppSetting::where('user_id', $user->id)->update(['currency_code' => 'MAD']);
        $provider = Provider::where('key', 'igdb')->firstOrFail();
        $credential = ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => $provider->id,
            'encrypted_client_id' => Crypt::encryptString('preserved-secret'),
            'is_enabled' => true,
        ]);

        $source = $this->createPortableGraph($user);
        $artifact = app(BackupExporter::class)->export($user);

        $user->update(['username' => 'Current Username']);
        AppSetting::where('user_id', $user->id)->update(['currency_code' => 'USD']);
        Storage::disk('public')->put('covers/games/current.webp', 'current cover');
        Game::create([
            'title' => 'Current Only Game',
            'normalized_title' => 'current only game',
            'cover_path' => 'covers/games/current.webp',
        ]);

        $preview = $this->preview($artifact);

        $this->postJson('/settings/data-portability/restore', [
            'token' => $preview['token'],
            'confirmation' => 'RESTORE',
        ])->assertOk()->assertJson(['restored' => true]);

        $restoredGame = Game::where('title', 'Portable Graph')->firstOrFail();
        $restoredLibraryGame = LibraryGame::where('game_id', $restoredGame->id)->firstOrFail();
        $restoredCopy = OwnershipCopy::where('library_game_id', $restoredLibraryGame->id)->firstOrFail();
        $restoredDlc = Dlc::where('game_id', $restoredGame->id)->firstOrFail();
        $restoredOwnedDlc = OwnedDlc::where('dlc_id', $restoredDlc->id)->firstOrFail();
        $restoredSnapshot = SnapshotRun::where('user_id', $user->id)->firstOrFail();
        $restoredSubscription = SubscriptionEntry::where('user_id', $user->id)->firstOrFail();
        $restoredYear = SubscriptionEntryYear::where('subscription_entry_id', $restoredSubscription->id)->firstOrFail();
        $restoredPurchase = InAppPurchase::where('library_game_id', $restoredLibraryGame->id)->firstOrFail();

        $this->assertSame($user->id, $user->refresh()->id);
        $this->assertSame('Current Username', $user->username);
        $this->assertSame('MAD', AppSetting::where('user_id', $user->id)->value('currency_code'));
        $this->assertSame('preserved-secret', Crypt::decryptString($credential->refresh()->encrypted_client_id));
        $this->assertSame(1, ProviderCredential::count());
        $this->assertDatabaseMissing('games', ['title' => 'Current Only Game']);

        $this->assertGreaterThan($source['game_id'], $restoredGame->id);
        $this->assertGreaterThan($source['library_game_id'], $restoredLibraryGame->id);
        $this->assertSame($restoredCopy->id, DB::table('subscription_entry_ownership_copies')->value('ownership_copy_id'));
        $this->assertSame($restoredCopy->id, DB::table('subscription_entry_year_ownership_copies')->value('ownership_copy_id'));
        $this->assertSame($restoredSnapshot->id, $restoredYear->locked_by_snapshot_run_id);
        $this->assertSame($restoredSnapshot->id, $restoredPurchase->locked_by_snapshot_run_id);
        $this->assertDatabaseHas('library_game_snapshots', [
            'snapshot_run_id' => $restoredSnapshot->id,
            'library_game_id' => $restoredLibraryGame->id,
        ]);
        $this->assertDatabaseHas('ownership_copy_snapshots', [
            'snapshot_run_id' => $restoredSnapshot->id,
            'ownership_copy_id' => $restoredCopy->id,
        ]);
        $this->assertDatabaseHas('owned_dlc_snapshots', [
            'snapshot_run_id' => $restoredSnapshot->id,
            'owned_dlc_id' => $restoredOwnedDlc->id,
        ]);
        $this->assertDatabaseHas('snapshot_best_games', [
            'snapshot_run_id' => $restoredSnapshot->id,
            'game_id' => $restoredGame->id,
        ]);
        $this->assertStringStartsWith('covers/restored/', $restoredGame->cover_path);
        Storage::disk('public')->assertExists($restoredGame->cover_path);
        Storage::disk('public')->assertMissing('covers/games/current.webp');
        $this->assertDirectoryDoesNotExist(storage_path('app/private/data-portability/imports/'.$preview['token']));

        $maximumRestoredGameId = (int) Game::query()->max('id');
        $createdAfterRestore = Game::create([
            'title' => 'Created After Restore',
            'normalized_title' => 'created after restore',
        ]);

        $this->assertGreaterThan($maximumRestoredGameId, $createdAfterRestore->id);
    }

    public function test_failed_restore_rolls_back_database_and_keeps_existing_media(): void
    {
        $user = User::firstOrFail();
        $this->createPortableGraph($user);
        $artifact = app(BackupExporter::class)->export($user);
        $this->replaceFirstRow($artifact, 'data/core/library_games.ndjson', function (array $row) {
            $row['platform_id'] = 999999;

            return $row;
        });

        $preview = $this->preview($artifact);
        Storage::disk('public')->put('covers/games/rollback.webp', 'rollback cover');
        $existing = Game::create([
            'title' => 'Rollback Survivor',
            'normalized_title' => 'rollback survivor',
            'cover_path' => 'covers/games/rollback.webp',
        ]);

        $this->postJson('/settings/data-portability/restore', [
            'token' => $preview['token'],
            'confirmation' => 'RESTORE',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('games', ['id' => $existing->id, 'title' => 'Rollback Survivor']);
        Storage::disk('public')->assertExists('covers/games/rollback.webp');
        $this->assertSame([], glob(storage_path('app/private/data-portability/staging/*'), GLOB_ONLYDIR) ?: []);
    }

    public function test_restore_requires_literal_confirmation(): void
    {
        $artifact = app(BackupExporter::class)->export(User::firstOrFail());
        $preview = $this->preview($artifact);

        $this->postJson('/settings/data-portability/restore', [
            'token' => $preview['token'],
            'confirmation' => 'yes',
        ])->assertUnprocessable();
    }

    public function test_restore_can_bootstrap_a_reset_installation_from_setup(): void
    {
        $user = User::firstOrFail();
        AppSetting::where('user_id', $user->id)->update(['currency_code' => 'MAD']);
        $this->createPortableGraph($user);
        $artifact = app(BackupExporter::class)->export($user);

        User::query()->delete();
        Game::query()->delete();

        $this->assertSame(0, User::count());
        $this->assertSame(0, AppSetting::count());

        $preview = $this->preview($artifact);

        $this->postJson('/setup/import/restore', [
            'token' => $preview['token'],
        ])->assertOk();

        $restoredUser = User::firstOrFail();

        $this->assertSame('Player One', $restoredUser->username);
        $this->assertSame('MAD', AppSetting::where('user_id', $restoredUser->id)->value('currency_code'));
        $this->assertDatabaseHas('games', ['title' => 'Portable Graph']);
        $this->get('/')->assertOk();
    }

    public function test_setup_import_restores_without_destructive_confirmation_and_accepts_new_credentials(): void
    {
        $sourceUser = User::firstOrFail();
        AppSetting::where('user_id', $sourceUser->id)->update(['currency_code' => 'MAD']);
        $this->createPortableGraph($sourceUser);
        $artifact = app(BackupExporter::class)->export($sourceUser);

        User::query()->delete();
        Game::query()->delete();
        $preview = $this->preview($artifact);

        $this->postJson('/setup/import/restore', [
            'token' => $preview['token'],
        ])->assertOk()->assertJson(['restored' => true]);

        $this->postJson('/setup/import/providers', [
            'igdb_client_id' => 'restored-client',
            'igdb_client_secret' => 'restored-secret',
            'steam_api_key' => 'restored-steam',
        ])->assertOk()->assertJson(['saved' => true]);

        $user = User::firstOrFail();
        $igdb = ProviderCredential::where('user_id', $user->id)
            ->where('provider_id', Provider::where('key', 'igdb')->value('id'))
            ->firstOrFail();
        $steam = ProviderCredential::where('user_id', $user->id)
            ->where('provider_id', Provider::where('key', 'steam')->value('id'))
            ->firstOrFail();

        $this->assertSame('MAD', AppSetting::where('user_id', $user->id)->value('currency_code'));
        $this->assertSame('restored-client', Crypt::decryptString($igdb->encrypted_client_id));
        $this->assertSame('restored-secret', Crypt::decryptString($igdb->encrypted_client_secret));
        $this->assertSame('restored-steam', Crypt::decryptString($steam->encrypted_api_key));
    }

    public function test_setup_import_bypass_is_rejected_after_setup_is_complete(): void
    {
        $artifact = app(BackupExporter::class)->export(User::firstOrFail());
        $preview = $this->preview($artifact);

        $this->postJson('/setup/import/restore', [
            'token' => $preview['token'],
        ])->assertRedirect('/');
    }

    private function createPortableGraph(User $user): array
    {
        $provider = Provider::where('key', 'manual')->firstOrFail();
        $platform = Platform::where('name', 'Steam')->firstOrFail();
        $status = Status::where('name', 'Completed')->firstOrFail();
        $ownershipType = OwnershipType::where('name', 'Game Pass')->firstOrFail();
        Storage::disk('public')->put('covers/games/portable-graph.webp', 'portable cover');

        $game = Game::create([
            'title' => 'Portable Graph',
            'normalized_title' => 'portable graph',
            'cover_path' => 'covers/games/portable-graph.webp',
            'source_provider_id' => $provider->id,
        ]);
        $libraryGame = LibraryGame::create([
            'user_id' => $user->id,
            'game_id' => $game->id,
            'platform_id' => $platform->id,
            'status_id' => $status->id,
            'playtime_hours' => 12.5,
        ]);
        $copy = OwnershipCopy::create([
            'library_game_id' => $libraryGame->id,
            'ownership_type_id' => $ownershipType->id,
            'base_price' => 50,
            'purchased_price' => 0,
        ]);
        $dlc = Dlc::create([
            'game_id' => $game->id,
            'title' => 'Portable DLC',
            'source_provider_id' => $provider->id,
        ]);
        $ownedDlc = OwnedDlc::create([
            'library_game_id' => $libraryGame->id,
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
            'purchased_price' => 5,
        ]);
        $snapshot = SnapshotRun::create([
            'user_id' => $user->id,
            'year' => 2026,
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);
        $subscription = SubscriptionEntry::create([
            'user_id' => $user->id,
            'ownership_type_id' => $ownershipType->id,
            'amount_paid' => 120,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-12-31',
        ]);
        DB::table('subscription_entry_ownership_copies')->insert([
            'subscription_entry_id' => $subscription->id,
            'ownership_copy_id' => $copy->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $year = SubscriptionEntryYear::create([
            'subscription_entry_id' => $subscription->id,
            'year' => 2026,
            'amount_allocated' => 120,
            'is_locked' => true,
            'locked_at' => now(),
            'locked_by_snapshot_run_id' => $snapshot->id,
            'locked_reason' => 'cumulative_snapshot',
        ]);
        DB::table('subscription_entry_year_ownership_copies')->insert([
            'subscription_entry_year_id' => $year->id,
            'ownership_copy_id' => $copy->id,
            'allocated_amount' => 120,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        InAppPurchase::create([
            'library_game_id' => $libraryGame->id,
            'title' => 'Portable Coins',
            'amount_paid' => 2,
            'purchased_at' => '2026-04-01',
            'is_locked' => true,
            'locked_at' => now(),
            'locked_by_snapshot_run_id' => $snapshot->id,
            'locked_reason' => 'cumulative_snapshot',
        ]);

        DB::table('library_game_snapshots')->insert([
            'snapshot_run_id' => $snapshot->id,
            'library_game_id' => $libraryGame->id,
            'game_id' => $game->id,
            'platform_id' => $platform->id,
            'status_id' => $status->id,
            'playtime_hours' => 12.5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('ownership_copy_snapshots')->insert([
            'snapshot_run_id' => $snapshot->id,
            'ownership_copy_id' => $copy->id,
            'library_game_id' => $libraryGame->id,
            'ownership_type_id' => $ownershipType->id,
            'base_price' => 50,
            'purchased_price' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('owned_dlc_snapshots')->insert([
            'snapshot_run_id' => $snapshot->id,
            'owned_dlc_id' => $ownedDlc->id,
            'library_game_id' => $libraryGame->id,
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
            'base_price' => 10,
            'purchased_price' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('snapshot_best_games')->insert([
            'snapshot_run_id' => $snapshot->id,
            'library_game_id' => $libraryGame->id,
            'game_id' => $game->id,
            'rank' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['game_id' => $game->id, 'library_game_id' => $libraryGame->id];
    }

    private function preview(BackupArtifact $artifact): array
    {
        return $this->postJson('/settings/data-portability/preview', [
            'backup' => UploadedFile::fake()->createWithContent(
                $artifact->downloadName,
                (string) file_get_contents($artifact->path),
            ),
        ])->assertOk()->json();
    }

    private function replaceFirstRow(BackupArtifact $artifact, string $path, callable $mutate): void
    {
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($artifact->path) === true);
        $lines = explode("\n", trim($zip->getFromName($path)));
        $lines[0] = json_encode($mutate(json_decode($lines[0], true, flags: JSON_THROW_ON_ERROR)), JSON_THROW_ON_ERROR);
        $contents = implode("\n", $lines)."\n";
        $checksums = json_decode($zip->getFromName('checksums.json'), true, flags: JSON_THROW_ON_ERROR);
        $checksums['files'][$path] = hash('sha256', $contents);
        $zip->deleteName($path);
        $zip->addFromString($path, $contents);
        $zip->deleteName('checksums.json');
        $zip->addFromString('checksums.json', json_encode($checksums, JSON_THROW_ON_ERROR));
        $zip->close();
    }

    private function deleteDirectory(string $directory): void
    {
        if (! is_dir($directory)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($directory, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );

        foreach ($iterator as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }

        rmdir($directory);
    }
}
