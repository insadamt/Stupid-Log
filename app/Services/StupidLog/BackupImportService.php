<?php

namespace App\Services\StupidLog;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use ZipArchive;

class BackupImportService
{
    public function __construct(
        private BackupArchiveValidator $validator,
        private BackupDatabaseRestorer $restorer,
    ) {}

    public function preview(UploadedFile $upload): array
    {
        $this->purgeExpiredPreviews();
        $token = hash('sha256', Str::random(80).microtime(true));
        $directory = "backups/imports/{$token}";
        $archivePath = $upload->storeAs($directory, 'backup.stupidlog.zip', 'local');

        if (! $archivePath) {
            throw new RuntimeException('Unable to store the uploaded backup.');
        }

        try {
            $validated = $this->validator->validate(Storage::disk('local')->path($archivePath));
            $this->stageCovers($archivePath, $directory, $validated->coverPaths);
            $expiresAt = now()->addMinutes(config('stupid-log.backup.preview_ttl_minutes'));
            Storage::disk('local')->put(
                "{$directory}/preview.json",
                json_encode([
                    'expires_at' => $expiresAt->toIso8601String(),
                    'manifest' => $validated->manifest,
                ], JSON_THROW_ON_ERROR),
            );

            return [
                'restore_token' => $token,
                'expires_at' => $expiresAt->toIso8601String(),
                'metadata' => [
                    'username' => $validated->data['profile']['username'],
                    'currency_code' => $validated->data['profile']['currency_code'],
                    'exported_at' => $validated->manifest['exported_at'],
                    'app_version' => $validated->manifest['app_version'],
                    'format_version' => $validated->manifest['format_version'],
                ],
                'counts' => $validated->manifest['counts'],
            ];
        } catch (\Throwable $exception) {
            Storage::disk('local')->deleteDirectory($directory);
            throw $exception;
        }
    }

    public function restore(User $user, string $token): void
    {
        if (preg_match('/\A[a-f0-9]{64}\z/', $token) !== 1) {
            $this->rejectToken();
        }

        $directory = "backups/imports/{$token}";
        $previewPath = "{$directory}/preview.json";
        $archivePath = "{$directory}/backup.stupidlog.zip";

        if (! Storage::disk('local')->exists($previewPath)
            || ! Storage::disk('local')->exists($archivePath)) {
            $this->rejectToken();
        }

        $preview = json_decode(Storage::disk('local')->get($previewPath), true);
        if (! is_array($preview) || now()->isAfter($preview['expires_at'] ?? null)) {
            Storage::disk('local')->deleteDirectory($directory);
            $this->rejectToken();
        }

        $lockPath = Storage::disk('local')->path("{$directory}/restore.lock");
        $lock = @fopen($lockPath, 'x');
        if (! is_resource($lock)) {
            $this->rejectToken();
        }

        try {
            $validated = $this->validator->validate(Storage::disk('local')->path($archivePath));
            $this->restorer->restore($user, $validated->data, $directory);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete("{$directory}/restore.lock");
            throw $exception;
        } finally {
            fclose($lock);
        }

        Storage::disk('local')->deleteDirectory($directory);
    }

    private function stageCovers(string $archivePath, string $directory, array $coverPaths): void
    {
        $zip = new ZipArchive;
        if ($zip->open(Storage::disk('local')->path($archivePath)) !== true) {
            throw new RuntimeException('Unable to reopen the backup archive.');
        }

        try {
            foreach ($coverPaths as $coverPath) {
                $source = $zip->getStream($coverPath);
                if (! is_resource($source)) {
                    throw new RuntimeException("Unable to stage {$coverPath}.");
                }

                try {
                    if (! Storage::disk('local')->writeStream("{$directory}/staged/{$coverPath}", $source)) {
                        throw new RuntimeException("Unable to stage {$coverPath}.");
                    }
                } finally {
                    fclose($source);
                }
            }
        } finally {
            $zip->close();
        }
    }

    private function purgeExpiredPreviews(): void
    {
        foreach (Storage::disk('local')->directories('backups/imports') as $directory) {
            $previewPath = "{$directory}/preview.json";
            if (! Storage::disk('local')->exists($previewPath)) {
                Storage::disk('local')->deleteDirectory($directory);

                continue;
            }

            $preview = json_decode(Storage::disk('local')->get($previewPath), true);
            if (! is_array($preview) || now()->isAfter($preview['expires_at'] ?? null)) {
                Storage::disk('local')->deleteDirectory($directory);
            }
        }
    }

    private function rejectToken(): never
    {
        throw ValidationException::withMessages([
            'restore_token' => 'The import preview has expired or was already used.',
        ]);
    }
}
