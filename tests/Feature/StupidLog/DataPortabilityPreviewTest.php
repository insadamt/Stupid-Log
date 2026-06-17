<?php

namespace Tests\Feature\StupidLog;

use App\DataTransferObjects\DataPortability\BackupArtifact;
use App\Models\User;
use App\Services\DataPortability\BackupExporter;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;
use ZipArchive;

class DataPortabilityPreviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    protected function tearDown(): void
    {
        $this->deleteDirectory(storage_path('app/private/data-portability'));

        parent::tearDown();
    }

    public function test_preview_validates_archive_and_returns_metadata_without_restoring(): void
    {
        $artifact = $this->exportBackup();
        $response = $this->postJson('/settings/data-portability/preview', [
            'backup' => $this->upload($artifact),
        ]);

        $response->assertOk()
            ->assertJsonPath('currency_code', 'USD')
            ->assertJsonPath('counts.games', 0)
            ->assertJsonPath('media_count', 0);

        $token = $response->json('token');
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9]{64}$/', $token);
        $this->assertFileExists(storage_path("app/private/data-portability/imports/{$token}/backup.stupidlog.zip"));
        $this->assertSame(1, User::count());
    }

    public function test_preview_rejects_unsupported_manifest_version(): void
    {
        $artifact = $this->exportBackup();
        $this->replaceJson($artifact, 'manifest.json', function (array $manifest) {
            $manifest['format_version'] = 99;

            return $manifest;
        });

        $this->postJson('/settings/data-portability/preview', [
            'backup' => $this->upload($artifact),
        ])->assertUnprocessable();

        $this->assertSame([], glob(storage_path('app/private/data-portability/imports/*'), GLOB_ONLYDIR) ?: []);
    }

    public function test_preview_rejects_invalid_checksum(): void
    {
        $artifact = $this->exportBackup();
        $this->replaceJson($artifact, 'checksums.json', function (array $checksums) {
            $checksums['files']['data/core/games.ndjson'] = str_repeat('0', 64);

            return $checksums;
        });

        $this->postJson('/settings/data-portability/preview', [
            'backup' => $this->upload($artifact),
        ])->assertUnprocessable();
    }

    public function test_preview_rejects_malformed_sampled_ndjson_row(): void
    {
        $artifact = $this->exportBackup();
        $zip = $this->openZip($artifact->path);
        $zip->deleteName('data/reference/providers.ndjson');
        $zip->addFromString('data/reference/providers.ndjson', "{\"old_id\":\n");
        $zip->close();
        $this->refreshChecksum($artifact, 'data/reference/providers.ndjson');

        $this->postJson('/settings/data-portability/preview', [
            'backup' => $this->upload($artifact),
        ])->assertUnprocessable();
    }

    public function test_preview_rejects_malicious_zip_path(): void
    {
        $artifact = $this->exportBackup();
        $zip = $this->openZip($artifact->path);
        $zip->addFromString('../escape.webp', 'malicious');
        $zip->close();

        $this->postJson('/settings/data-portability/preview', [
            'backup' => $this->upload($artifact),
        ])->assertUnprocessable();
    }

    public function test_preview_post_too_large_exception_renders_json(): void
    {
        $request = Request::create('/settings/data-portability/preview', 'POST');
        $response = app(ExceptionHandler::class)->render($request, new PostTooLargeException('The POST data is too large.'));

        $this->assertSame(413, $response->getStatusCode());
        $this->assertSame('application/json', $response->headers->get('content-type'));
        $this->assertSame(
            '{"message":"Backup upload rejected. The file is larger than the server upload limit."}',
            $response->getContent(),
        );
    }

    private function exportBackup(): BackupArtifact
    {
        return app(BackupExporter::class)->export(User::firstOrFail());
    }

    private function upload(BackupArtifact $artifact): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $artifact->downloadName,
            (string) file_get_contents($artifact->path),
        );
    }

    private function replaceJson(BackupArtifact $artifact, string $path, callable $mutate): void
    {
        $zip = $this->openZip($artifact->path);
        $data = json_decode($zip->getFromName($path), true, flags: JSON_THROW_ON_ERROR);
        $zip->deleteName($path);
        $zip->addFromString($path, json_encode($mutate($data), JSON_THROW_ON_ERROR));
        $zip->close();
    }

    private function refreshChecksum(BackupArtifact $artifact, string $path): void
    {
        $zip = $this->openZip($artifact->path);
        $checksums = json_decode($zip->getFromName('checksums.json'), true, flags: JSON_THROW_ON_ERROR);
        $checksums['files'][$path] = hash('sha256', $zip->getFromName($path));
        $zip->deleteName('checksums.json');
        $zip->addFromString('checksums.json', json_encode($checksums, JSON_THROW_ON_ERROR));
        $zip->close();
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
