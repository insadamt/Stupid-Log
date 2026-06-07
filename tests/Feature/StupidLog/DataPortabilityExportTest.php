<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderCredential;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\DataPortability\BackupExporter;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class DataPortabilityExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        Storage::fake('public');
    }

    public function test_export_contains_streamable_layout_counts_checksums_and_media(): void
    {
        $user = User::firstOrFail();
        $provider = Provider::where('key', 'igdb')->firstOrFail();
        $platform = Platform::where('name', 'Steam')->firstOrFail();
        $status = Status::firstOrFail();

        Storage::disk('public')->put('covers/games/portable.webp', 'cover bytes');

        $game = Game::create([
            'title' => 'Portable Game',
            'normalized_title' => 'portable game',
            'cover_path' => 'covers/games/portable.webp',
            'source_provider_id' => $provider->id,
        ]);

        LibraryGame::create([
            'user_id' => $user->id,
            'game_id' => $game->id,
            'platform_id' => $platform->id,
            'status_id' => $status->id,
        ]);

        ProviderCredential::create([
            'user_id' => $user->id,
            'provider_id' => $provider->id,
            'encrypted_client_id' => Crypt::encryptString('must-not-leak'),
            'is_enabled' => true,
        ]);

        $artifact = app(BackupExporter::class)->export($user);
        $zip = $this->openZip($artifact->path);
        $entries = $this->entryNames($zip);

        $this->assertContains('manifest.json', $entries);
        $this->assertContains('checksums.json', $entries);
        $this->assertContains('media-index.ndjson', $entries);
        $this->assertContains('data/core/games.ndjson', $entries);
        $this->assertContains('data/finance/subscription_entry_years.ndjson', $entries);
        $this->assertContains('data/reference/platform_devices.ndjson', $entries);
        $this->assertNotContains('data.json', $entries);
        $this->assertFalse(collect($entries)->contains(fn (string $entry) => str_contains($entry, 'credential')));

        $manifest = json_decode($zip->getFromName('manifest.json'), true, flags: JSON_THROW_ON_ERROR);
        $checksums = json_decode($zip->getFromName('checksums.json'), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame('stupid-log-backup', $manifest['format']);
        $this->assertSame(1, $manifest['format_version']);
        $this->assertSame(config('app.version'), $manifest['app_version']);
        $this->assertSame(1, $manifest['tables']['games']['count']);
        $this->assertSame(1, $manifest['tables']['library_games']['count']);
        $this->assertSame(1, $manifest['media']['count']);
        $this->assertArrayHasKey('data/core/games.ndjson', $checksums['files']);
        $this->assertArrayHasKey('media-index.ndjson', $checksums['files']);

        foreach ($checksums['files'] as $path => $checksum) {
            $this->assertSame($checksum, hash('sha256', $zip->getFromName($path)));
        }

        $games = $zip->getFromName('data/core/games.ndjson');
        $this->assertStringContainsString('"old_id"', $games);
        $this->assertStringNotContainsString('"id"', $games);
        $this->assertStringNotContainsString('must-not-leak', implode('', array_map(
            fn (string $entry) => (string) $zip->getFromName($entry),
            $entries,
        )));

        $zip->close();
        app(BackupExporter::class)->deleteArtifact($artifact);
    }

    public function test_large_snapshot_tables_are_split_into_numbered_parts(): void
    {
        $user = User::firstOrFail();
        $platform = Platform::firstOrFail();
        $status = Status::firstOrFail();
        $snapshot = SnapshotRun::create([
            'user_id' => $user->id,
            'year' => 2026,
            'status' => 'draft',
        ]);

        foreach (range(1, 3) as $index) {
            $game = Game::create([
                'title' => "Snapshot Game {$index}",
                'normalized_title' => "snapshot game {$index}",
            ]);
            $libraryGame = LibraryGame::create([
                'user_id' => $user->id,
                'game_id' => $game->id,
                'platform_id' => $platform->id,
                'status_id' => $status->id,
            ]);

            DB::table('library_game_snapshots')->insert([
                'snapshot_run_id' => $snapshot->id,
                'library_game_id' => $libraryGame->id,
                'game_id' => $game->id,
                'platform_id' => $platform->id,
                'status_id' => $status->id,
                'playtime_hours' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $artifact = app(BackupExporter::class)->export($user, snapshotPartSize: 2);
        $zip = $this->openZip($artifact->path);
        $manifest = json_decode($zip->getFromName('manifest.json'), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame(3, $manifest['tables']['library_game_snapshots']['count']);
        $this->assertSame([
            'data/snapshots/library_game_snapshots.part-000001.ndjson',
            'data/snapshots/library_game_snapshots.part-000002.ndjson',
        ], $manifest['tables']['library_game_snapshots']['files']);

        $zip->close();
        app(BackupExporter::class)->deleteArtifact($artifact);
    }

    private function openZip(string $path): ZipArchive
    {
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path) === true);

        return $zip;
    }

    /**
     * @return list<string>
     */
    private function entryNames(ZipArchive $zip): array
    {
        $entries = [];

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $entries[] = $zip->getNameIndex($index);
        }

        return $entries;
    }
}
