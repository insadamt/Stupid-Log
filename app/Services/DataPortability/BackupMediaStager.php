<?php

namespace App\Services\DataPortability;

use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

final class BackupMediaStager
{
    public function __construct(
        private readonly NdjsonReader $ndjson,
        private readonly ArchivePathGuard $paths,
    ) {}

    public function stage(string $archivePath): array
    {
        $directory = storage_path('app/private/data-portability/staging/'.Str::uuid());

        if (! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to create media staging storage.');
        }

        $zip = new ZipArchive;

        if ($zip->open($archivePath) !== true) {
            $this->delete($directory);
            throw new RuntimeException('Unable to open backup media.');
        }

        try {
            $index = $zip->getStream('media-index.ndjson');

            if ($index === false) {
                throw new RuntimeException('Unable to read the backup media index.');
            }

            $staged = [];

            foreach ($this->ndjson->rows($index) as $row) {
                $this->assertMediaRow($row);
                $archiveMediaPath = (string) $row['archive_path'];
                $this->paths->assertSupportedMedia($archiveMediaPath);
                $source = $zip->getStream($archiveMediaPath);

                if ($source === false) {
                    throw new RuntimeException("Missing indexed media file: {$archiveMediaPath}");
                }

                $extension = strtolower(pathinfo($archiveMediaPath, PATHINFO_EXTENSION));
                $stagedPath = $directory.'/'.Str::uuid().'.'.$extension;
                $target = fopen($stagedPath, 'wb');

                if ($target === false) {
                    fclose($source);
                    throw new RuntimeException('Unable to stage backup media.');
                }

                stream_copy_to_stream($source, $target);
                fclose($source);
                fclose($target);

                $staged[] = [
                    'entity' => $row['entity_type'],
                    'old_id' => (int) $row['old_id'],
                    'path' => $stagedPath,
                    'extension' => $extension,
                ];
            }

            fclose($index);

            return ['directory' => $directory, 'files' => $staged];
        } catch (\Throwable $exception) {
            $this->delete($directory);
            throw $exception;
        } finally {
            $zip->close();
        }
    }

    public function delete(string $directory): void
    {
        if (! is_dir($directory)) {
            return;
        }

        foreach (glob($directory.'/*') ?: [] as $path) {
            is_file($path) && unlink($path);
        }

        rmdir($directory);
    }

    private function assertMediaRow(array $row): void
    {
        if (! in_array($row['entity_type'] ?? null, ['game', 'dlc'], true)
            || ! is_int($row['old_id'] ?? null)
            || ! is_string($row['archive_path'] ?? null)) {
            throw new RuntimeException('The backup media index contains an invalid row.');
        }
    }
}
