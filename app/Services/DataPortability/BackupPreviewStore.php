<?php

namespace App\Services\DataPortability;

use App\DataTransferObjects\DataPortability\BackupPreview;
use App\DataTransferObjects\DataPortability\ValidatedBackup;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use RuntimeException;

final class BackupPreviewStore
{
    private const EXPIRY_MINUTES = 60;

    public function __construct(private readonly BackupArchiveValidator $validator) {}

    public function create(UploadedFile $upload): BackupPreview
    {
        $token = Str::random(64);
        $directory = $this->directory($token);

        if (! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to create private backup storage.');
        }

        $archivePath = $directory.'/backup.stupidlog.zip';

        try {
            $upload->move($directory, 'backup.stupidlog.zip');
            $validated = $this->validator->validate($archivePath);
            $expiresAt = now()->addMinutes(self::EXPIRY_MINUTES);
            $this->writeMetadata($directory, $validated, $expiresAt);

            return $this->preview($token, $validated, $expiresAt);
        } catch (\Throwable $exception) {
            $this->delete($token);
            throw $exception;
        }
    }

    public function archivePath(string $token): string
    {
        $this->assertToken($token);
        $metadata = $this->metadata($token);

        if (Carbon::parse($metadata['expires_at'])->isPast()) {
            $this->delete($token);
            throw new RuntimeException('The backup preview has expired.');
        }

        return $this->directory($token).'/backup.stupidlog.zip';
    }

    public function delete(string $token): void
    {
        if (preg_match('/^[A-Za-z0-9]{64}$/', $token) !== 1) {
            return;
        }

        $directory = $this->directory($token);

        if (! is_dir($directory)) {
            return;
        }

        foreach (glob($directory.'/*') ?: [] as $path) {
            is_file($path) && unlink($path);
        }

        rmdir($directory);
    }

    private function preview(string $token, ValidatedBackup $backup, Carbon $expiresAt): BackupPreview
    {
        $counts = [];

        foreach ($backup->manifest['tables'] as $name => $metadata) {
            $counts[$name] = $metadata['count'];
        }

        return new BackupPreview(
            $token,
            $backup->manifest['created_at'],
            $backup->manifest['currency_code'],
            $counts,
            $backup->manifest['media']['count'],
            $expiresAt->toIso8601String(),
        );
    }

    private function writeMetadata(string $directory, ValidatedBackup $backup, Carbon $expiresAt): void
    {
        $metadata = [
            'expires_at' => $expiresAt->toIso8601String(),
            'manifest' => $backup->manifest,
        ];

        if (file_put_contents($directory.'/preview.json', json_encode($metadata, JSON_THROW_ON_ERROR)) === false) {
            throw new RuntimeException('Unable to store backup preview metadata.');
        }
    }

    private function metadata(string $token): array
    {
        $path = $this->directory($token).'/preview.json';

        if (! is_file($path)) {
            throw new RuntimeException('The backup preview token is invalid.');
        }

        $metadata = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

        if (! is_array($metadata) || ! isset($metadata['expires_at'])) {
            throw new RuntimeException('The backup preview metadata is invalid.');
        }

        return $metadata;
    }

    private function assertToken(string $token): void
    {
        if (preg_match('/^[A-Za-z0-9]{64}$/', $token) !== 1) {
            throw new RuntimeException('The backup preview token is invalid.');
        }
    }

    private function directory(string $token): string
    {
        return storage_path('app/private/data-portability/imports/'.$token);
    }
}
