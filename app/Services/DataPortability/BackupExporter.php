<?php

namespace App\Services\DataPortability;

use App\DataTransferObjects\DataPortability\BackupArtifact;
use App\Models\StupidLog\AppSetting;
use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use ZipArchive;

final class BackupExporter
{
    private const QUERY_CHUNK_SIZE = 500;

    public function __construct(
        private readonly BackupTableRegistry $tables,
        private readonly ArchivePathGuard $paths,
    ) {}

    public function export(User $user, int $snapshotPartSize = 10000): BackupArtifact
    {
        $workspace = storage_path('app/private/data-portability/export-'.Str::uuid());
        $zipPath = $workspace.'/backup.stupidlog.zip';

        if (! mkdir($workspace, 0700, true) && ! is_dir($workspace)) {
            throw new RuntimeException('Unable to create the backup workspace.');
        }

        try {
            [$tableMetadata, $checksums] = $this->exportTables($workspace, $snapshotPartSize);
            [$mediaMetadata, $mediaChecksums] = $this->exportMedia($workspace);
            $checksums = [...$checksums, ...$mediaChecksums];

            $manifest = [
                'format' => 'stupid-log-backup',
                'format_version' => 1,
                'created_at' => now()->toIso8601String(),
                'app_version' => config('app.version'),
                'currency_code' => AppSetting::where('user_id', $user->id)->value('currency_code') ?? 'USD',
                'tables' => $tableMetadata,
                'media' => $mediaMetadata,
            ];

            $this->writeJson($workspace.'/manifest.json', $manifest);
            $this->writeJson($workspace.'/checksums.json', ['algorithm' => 'sha256', 'files' => $checksums]);
            $this->createArchive($workspace, $zipPath, array_keys($checksums));

            return new BackupArtifact(
                $zipPath,
                'stupid-log-backup-'.now()->format('Y-m-d').'.stupidlog.zip',
            );
        } catch (Throwable $exception) {
            $this->deleteDirectory($workspace);
            throw $exception;
        }
    }

    private function exportTables(string $workspace, int $snapshotPartSize): array
    {
        $metadata = [];
        $checksums = [];

        foreach ($this->tables->tables() as $definition) {
            [$count, $files] = $definition->partitioned
                ? $this->exportPartitionedTable($workspace, $definition, $snapshotPartSize)
                : $this->exportSingleTable($workspace, $definition);

            $metadata[$definition->name] = ['count' => $count, 'files' => $files];

            foreach ($files as $file) {
                $checksums[$file] = hash_file('sha256', $workspace.'/'.$file);
            }
        }

        return [$metadata, $checksums];
    }

    private function exportSingleTable(string $workspace, BackupTableDefinition $definition): array
    {
        $writer = new NdjsonWriter($workspace.'/'.$definition->path);
        $count = $this->writeQuery($this->query($definition), $writer);
        $writer->close();

        return [$count, [$definition->path]];
    }

    private function exportPartitionedTable(string $workspace, BackupTableDefinition $definition, int $partSize): array
    {
        $partSize = max(1, $partSize);
        $files = [];
        $count = 0;
        $part = 0;
        $writer = null;

        $this->query($definition)->chunkById(self::QUERY_CHUNK_SIZE, function ($rows) use (&$writer, &$count, &$part, &$files, $workspace, $definition, $partSize) {
            foreach ($rows as $row) {
                if ($count % $partSize === 0) {
                    $writer?->close();
                    $part++;
                    $path = sprintf('%s.part-%06d.ndjson', $definition->path, $part);
                    $files[] = $path;
                    $writer = new NdjsonWriter($workspace.'/'.$path);
                }

                $writer->write($this->backupRow($row));
                $count++;
            }
        }, 'id');

        if ($writer === null) {
            $path = sprintf('%s.part-%06d.ndjson', $definition->path, 1);
            $files[] = $path;
            $writer = new NdjsonWriter($workspace.'/'.$path);
        }

        $writer->close();

        return [$count, $files];
    }

    private function writeQuery(Builder $query, NdjsonWriter $writer): int
    {
        $count = 0;

        $query->chunkById(self::QUERY_CHUNK_SIZE, function ($rows) use ($writer, &$count) {
            foreach ($rows as $row) {
                $writer->write($this->backupRow($row));
                $count++;
            }
        }, 'id');

        return $count;
    }

    private function query(BackupTableDefinition $definition): Builder
    {
        return DB::table($definition->table)
            ->select($definition->columns)
            ->orderBy('id');
    }

    private function backupRow(object $row): array
    {
        $data = (array) $row;
        $data['old_id'] = $data['id'];
        unset($data['id']);

        return $data;
    }

    private function exportMedia(string $workspace): array
    {
        $indexPath = 'media-index.ndjson';
        $writer = new NdjsonWriter($workspace.'/'.$indexPath);
        $checksums = [];
        $count = 0;

        foreach (['games', 'dlcs'] as $table) {
            DB::table($table)
                ->whereNotNull('cover_path')
                ->select(['id', 'cover_path'])
                ->orderBy('id')
                ->chunkById(self::QUERY_CHUNK_SIZE, function ($rows) use ($table, $workspace, $writer, &$checksums, &$count) {
                    foreach ($rows as $row) {
                        $sourcePath = (string) $row->cover_path;

                        if (! Storage::disk('public')->exists($sourcePath)) {
                            continue;
                        }

                        $this->paths->assertSupportedMedia($sourcePath);
                        $archivePath = 'media/covers/'.$table.'/'.$row->id.'.'.strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
                        $destination = $workspace.'/'.$archivePath;

                        if (! is_dir(dirname($destination)) && ! mkdir(dirname($destination), 0700, true) && ! is_dir(dirname($destination))) {
                            throw new RuntimeException('Unable to create the media backup directory.');
                        }

                        $source = Storage::disk('public')->readStream($sourcePath);
                        $target = fopen($destination, 'wb');

                        if ($source === null || $target === false) {
                            throw new RuntimeException("Unable to export cover: {$sourcePath}");
                        }

                        stream_copy_to_stream($source, $target);
                        fclose($source);
                        fclose($target);

                        $writer->write([
                            'entity_type' => $table === 'games' ? 'game' : 'dlc',
                            'old_id' => $row->id,
                            'original_path' => $sourcePath,
                            'archive_path' => $archivePath,
                        ]);
                        $checksums[$archivePath] = hash_file('sha256', $destination);
                        $count++;
                    }
                }, 'id');
        }

        $writer->close();
        $checksums[$indexPath] = hash_file('sha256', $workspace.'/'.$indexPath);

        return [['count' => $count, 'index_file' => $indexPath], $checksums];
    }

    private function createArchive(string $workspace, string $zipPath, array $contentFiles): void
    {
        $zip = new ZipArchive;

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Unable to create the backup archive.');
        }

        foreach (['manifest.json', 'checksums.json', ...$contentFiles] as $path) {
            $this->paths->assertSafe($path);

            if (! $zip->addFile($workspace.'/'.$path, $path)) {
                $zip->close();
                throw new RuntimeException("Unable to add {$path} to the backup archive.");
            }
        }

        if (! $zip->close()) {
            throw new RuntimeException('Unable to finalize the backup archive.');
        }
    }

    private function writeJson(string $path, array $value): void
    {
        $json = json_encode($value, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if (file_put_contents($path, $json."\n") === false) {
            throw new RuntimeException("Unable to write backup file: {$path}");
        }
    }

    public function deleteArtifact(BackupArtifact $artifact): void
    {
        $this->deleteDirectory(dirname($artifact->path));
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
