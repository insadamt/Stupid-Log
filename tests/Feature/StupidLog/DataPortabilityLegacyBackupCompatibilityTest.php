<?php

namespace Tests\Feature\StupidLog;

use App\DataTransferObjects\DataPortability\BackupArtifact;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\DataPortability\BackupExporter;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use ZipArchive;

class DataPortabilityLegacyBackupCompatibilityTest extends TestCase
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

    #[DataProvider('releasedBackupVersions')]
    public function test_preview_accepts_backups_shaped_like_each_released_export(string $version): void
    {
        $artifact = app(BackupExporter::class)->export(User::firstOrFail());
        $this->shapeLikeReleasedBackup($artifact, $version);

        $this->postJson('/settings/data-portability/preview', [
            'backup' => $this->upload($artifact),
        ])->assertOk()
            ->assertJsonPath('counts.library_game_progress_links', 0)
            ->assertJsonPath('counts.library_game_progress_link_snapshots', 0);
    }

    public function test_restore_accepts_released_backup_without_linked_progress_tables(): void
    {
        $user = User::firstOrFail();
        $this->createPortableLibraryGame($user);
        $artifact = app(BackupExporter::class)->export($user);
        $this->shapeLikeReleasedBackup($artifact, '1.2.0');

        Game::create([
            'title' => 'Current Only Game',
            'normalized_title' => 'current only game',
        ]);

        $preview = $this->postJson('/settings/data-portability/preview', [
            'backup' => $this->upload($artifact),
        ])->assertOk()->json();

        $this->postJson('/settings/data-portability/restore', [
            'token' => $preview['token'],
            'confirmation' => 'RESTORE',
        ])->assertOk()->assertJson(['restored' => true]);

        $this->assertDatabaseHas('games', ['title' => 'Legacy Portable Game']);
        $this->assertDatabaseMissing('games', ['title' => 'Current Only Game']);
        $this->assertSame(0, DB::table('library_game_progress_links')->count());
        $this->assertSame(0, DB::table('library_game_progress_link_snapshots')->count());

        $maximumRestoredGameId = (int) Game::query()->max('id');
        $createdAfterRestore = Game::create([
            'title' => 'Created After Legacy Restore',
            'normalized_title' => 'created after legacy restore',
        ]);

        $this->assertGreaterThan($maximumRestoredGameId, $createdAfterRestore->id);
    }

    public function test_preview_rejects_released_backup_missing_required_table_metadata(): void
    {
        $artifact = app(BackupExporter::class)->export(User::firstOrFail());
        $this->removeManifestTable($artifact, 'library_games');

        $this->postJson('/settings/data-portability/preview', [
            'backup' => $this->upload($artifact),
        ])->assertUnprocessable()
            ->assertJson(['message' => 'Manifest count is invalid for library_games.']);
    }

    public static function releasedBackupVersions(): array
    {
        return [
            'v1.0.0' => ['1.0.0'],
            'v1.0.1' => ['1.0.1'],
            'v1.0.2' => ['1.0.2'],
            'v1.1.0' => ['1.1.0'],
            'v1.2.0' => ['1.2.0'],
        ];
    }

    private function createPortableLibraryGame(User $user): void
    {
        $game = Game::create([
            'title' => 'Legacy Portable Game',
            'normalized_title' => 'legacy portable game',
        ]);

        LibraryGame::create([
            'user_id' => $user->id,
            'game_id' => $game->id,
            'platform_id' => Platform::where('name', 'Steam')->value('id'),
            'status_id' => Status::firstOrFail()->id,
        ]);
    }

    private function shapeLikeReleasedBackup(BackupArtifact $artifact, string $version): void
    {
        $zip = $this->openZip($artifact->path);
        $manifest = json_decode($zip->getFromName('manifest.json'), true, flags: JSON_THROW_ON_ERROR);
        $checksums = json_decode($zip->getFromName('checksums.json'), true, flags: JSON_THROW_ON_ERROR);
        $manifest['app_version'] = $version;

        foreach ([
            'library_game_progress_links',
            'library_game_progress_link_snapshots',
        ] as $table) {
            foreach ($manifest['tables'][$table]['files'] ?? [] as $file) {
                unset($checksums['files'][$file]);
                $zip->deleteName($file);
            }

            unset($manifest['tables'][$table]);
        }

        $this->replaceJson($zip, 'manifest.json', $manifest);
        $this->replaceJson($zip, 'checksums.json', $checksums);
        $zip->close();
    }

    private function removeManifestTable(BackupArtifact $artifact, string $table): void
    {
        $zip = $this->openZip($artifact->path);
        $manifest = json_decode($zip->getFromName('manifest.json'), true, flags: JSON_THROW_ON_ERROR);
        unset($manifest['tables'][$table]);
        $this->replaceJson($zip, 'manifest.json', $manifest);
        $zip->close();
    }

    private function replaceJson(ZipArchive $zip, string $path, array $data): void
    {
        $zip->deleteName($path);
        $zip->addFromString($path, json_encode($data, JSON_THROW_ON_ERROR));
    }

    private function upload(BackupArtifact $artifact): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $artifact->downloadName,
            (string) file_get_contents($artifact->path),
        );
    }

    private function openZip(string $path): ZipArchive
    {
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path) === true);

        return $zip;
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
