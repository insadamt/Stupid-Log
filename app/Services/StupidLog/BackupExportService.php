<?php

namespace App\Services\StupidLog;

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class BackupExportService
{
    public function __construct(private BackupDataBuilder $dataBuilder) {}

    public function download(User $user): BinaryFileResponse
    {
        $built = $this->dataBuilder->build($user->loadMissing('settings'));
        $dataJson = json_encode(
            $built['data'],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
        );
        $manifest = [
            'format' => config('stupid-log.backup.format'),
            'format_version' => config('stupid-log.backup.format_version'),
            'app_version' => config('stupid-log.version'),
            'exported_at' => now()->toIso8601String(),
            'username' => $user->username,
            'counts' => $this->counts($built['data']),
            'data_sha256' => hash('sha256', $dataJson),
        ];

        $directory = storage_path('app/private/backups/exports');
        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to prepare backup export storage.');
        }

        $path = $directory.'/'.Str::uuid().'.stupidlog.zip';
        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Unable to create backup archive.');
        }

        try {
            $zip->addFromString(
                'manifest.json',
                json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            );
            $zip->addFromString('data.json', $dataJson);
            $zip->addEmptyDir('covers');

            foreach ($built['covers'] as $cover) {
                $source = Storage::disk('public')->path($cover['source_path']);
                if (! $zip->addFile($source, $cover['archive_path'])) {
                    throw new RuntimeException('Unable to add a cover to the backup archive.');
                }
            }
        } finally {
            $zip->close();
        }

        $filename = 'stupid-log-'.now()->format('Y-m-d-His').'.stupidlog.zip';

        return response()->download($path, $filename, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend();
    }

    private function counts(array $data): array
    {
        return collect($data)
            ->except('profile')
            ->map(fn (array $section) => count($section))
            ->all();
    }
}
