<?php

namespace App\Services\DataPortability;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use ZipArchive;

final class BackupRestorer
{
    private const INSERT_BATCH_SIZE = 500;

    /** @var array<string, int> */
    private array $nextIds = [];

    public function __construct(
        private readonly BackupArchiveValidator $validator,
        private readonly BackupTableRegistry $registry,
        private readonly NdjsonReader $ndjson,
        private readonly RestoreIdMap $ids,
        private readonly BackupMediaStager $media,
    ) {}

    public function restore(string $archivePath, User $user): void
    {
        $validated = $this->validator->validate($archivePath);
        $stagedMedia = $this->media->stage($archivePath);
        $createdMedia = [];
        $oldMediaJournal = $stagedMedia['directory'].'/old-media.ndjson';

        try {
            $this->writeOldMediaJournal($oldMediaJournal);

            DB::transaction(function () use ($archivePath, $validated, $user, $stagedMedia, &$createdMedia) {
                $this->ids->create();

                try {
                    $this->prepareNextIds();
                    $this->deleteCurrentData($user);
                    $this->restoreReferenceTables($archivePath, $validated->manifest);

                    foreach ($this->dataRestoreOrder() as $tableName) {
                        $this->restoreTable($archivePath, $validated->manifest, $tableName, $user);
                    }

                    $this->restoreCurrency($user, $validated->manifest['currency_code']);
                    $this->promoteMedia($stagedMedia['files'], $createdMedia);
                } finally {
                    $this->ids->drop();
                }
            });

            $this->deleteOldMedia($oldMediaJournal, $createdMedia);
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($createdMedia);
            throw $exception;
        } finally {
            $this->media->delete($stagedMedia['directory']);
        }
    }

    private function restoreReferenceTables(string $archivePath, array $manifest): void
    {
        foreach ($this->referenceKeys() as $tableName => $naturalKey) {
            $definition = $this->definition($tableName);

            $this->streamTable($archivePath, $manifest, $definition, function (array $rows) use ($definition, $naturalKey) {
                foreach ($rows as $row) {
                    $oldId = $this->oldId($row, $definition->name);
                    unset($row['old_id']);
                    $existingId = DB::table($definition->table)->where($naturalKey, $row[$naturalKey])->value('id');

                    if ($existingId !== null) {
                        DB::table($definition->table)->where('id', $existingId)->update($row);
                        $newId = (int) $existingId;
                    } else {
                        $newId = (int) DB::table($definition->table)->insertGetId($row);
                    }

                    $this->ids->put($definition->name, $oldId, $newId);
                }
            });
        }
    }

    private function restoreTable(string $archivePath, array $manifest, string $tableName, User $user): void
    {
        $definition = $this->definition($tableName);
        $foreignKeys = $this->foreignKeys()[$tableName] ?? [];
        $nextId = $this->nextIds[$tableName];

        $this->streamTable($archivePath, $manifest, $definition, function (array $rows) use ($definition, $foreignKeys, $user, &$nextId) {
            $maps = [];

            foreach ($foreignKeys as $column => $entity) {
                $maps[$column] = $this->ids->resolveMany($entity, array_column($rows, $column));
            }

            $insertRows = [];
            $idMappings = [];

            foreach ($rows as $row) {
                $oldId = $this->oldId($row, $definition->name);
                unset($row['old_id']);

                foreach ($foreignKeys as $column => $entity) {
                    if ($row[$column] !== null) {
                        $row[$column] = $maps[$column][(int) $row[$column]];
                    }
                }

                if (array_key_exists('user_id', $row)) {
                    $row['user_id'] = $user->id;
                }

                $newId = $nextId++;
                $row['id'] = $newId;
                $insertRows[] = $row;
                $idMappings[] = ['old_id' => $oldId, 'new_id' => $newId];
            }

            DB::table($definition->table)->insert($insertRows);
            $this->ids->putMany($definition->name, $idMappings);
            $this->nextIds[$definition->name] = $nextId;
        });
    }

    private function prepareNextIds(): void
    {
        $this->nextIds = [];

        foreach ($this->dataRestoreOrder() as $tableName) {
            $definition = $this->definition($tableName);
            $this->nextIds[$tableName] = ((int) DB::table($definition->table)->max('id')) + 1;
        }
    }

    private function streamTable(string $archivePath, array $manifest, BackupTableDefinition $definition, callable $consume): void
    {
        $zip = new ZipArchive;

        if ($zip->open($archivePath) !== true) {
            throw new RuntimeException('Unable to open the backup during restore.');
        }

        $count = 0;
        $batch = [];

        try {
            foreach ($manifest['tables'][$definition->name]['files'] as $file) {
                $stream = $zip->getStream($file);

                if ($stream === false) {
                    throw new RuntimeException("Missing backup data file: {$file}");
                }

                foreach ($this->ndjson->rows($stream) as $row) {
                    $this->assertFullRowShape($definition, $row);
                    $batch[] = $row;
                    $count++;

                    if (count($batch) === self::INSERT_BATCH_SIZE) {
                        $consume($batch);
                        $batch = [];
                    }
                }

                fclose($stream);
            }

            if ($batch !== []) {
                $consume($batch);
            }
        } finally {
            $zip->close();
        }

        if ($count !== $manifest['tables'][$definition->name]['count']) {
            throw new RuntimeException("Backup row count does not match for {$definition->name}.");
        }
    }

    private function deleteCurrentData(User $user): void
    {
        DB::table('snapshot_runs')->where('user_id', $user->id)->delete();
        DB::table('subscription_entries')->where('user_id', $user->id)->delete();
        DB::table('library_games')->where('user_id', $user->id)->delete();
        DB::table('games')->delete();
        DB::table('platform_device')->delete();
        DB::table('platform_ownership_type')->delete();
    }

    private function restoreCurrency(User $user, string $currencyCode): void
    {
        DB::table('app_settings')->updateOrInsert(
            ['user_id' => $user->id],
            ['currency_code' => $currencyCode, 'updated_at' => now(), 'created_at' => now()],
        );
    }

    private function promoteMedia(array $files, array &$createdMedia): void
    {
        foreach ($files as $file) {
            $entity = $file['entity'] === 'game' ? 'games' : 'dlcs';
            $map = $this->ids->resolveMany($entity, [$file['old_id']]);
            $destination = 'covers/restored/'.now()->format('Y/m').'/'.Str::uuid().'.'.$file['extension'];
            $source = fopen($file['path'], 'rb');

            if ($source === false || ! Storage::disk('public')->put($destination, $source)) {
                is_resource($source) && fclose($source);
                throw new RuntimeException('Unable to restore backup media.');
            }

            fclose($source);
            $createdMedia[] = $destination;
            DB::table($entity)->where('id', $map[$file['old_id']])->update(['cover_path' => $destination]);
        }
    }

    private function writeOldMediaJournal(string $path): void
    {
        $writer = new NdjsonWriter($path);

        foreach (['games', 'dlcs'] as $table) {
            DB::table($table)->whereNotNull('cover_path')->orderBy('id')->select('id', 'cover_path')
                ->chunkById(500, function ($rows) use ($writer) {
                    foreach ($rows as $row) {
                        $writer->write(['path' => $row->cover_path]);
                    }
                });
        }

        $writer->close();
    }

    private function deleteOldMedia(string $journal, array $createdMedia): void
    {
        $stream = fopen($journal, 'rb');

        if ($stream === false) {
            return;
        }

        foreach ($this->ndjson->rows($stream) as $row) {
            if (is_string($row['path'] ?? null) && ! in_array($row['path'], $createdMedia, true)) {
                Storage::disk('public')->delete($row['path']);
            }
        }

        fclose($stream);
    }

    private function assertFullRowShape(BackupTableDefinition $definition, array $row): void
    {
        $expected = [...array_diff($definition->columns, ['id']), 'old_id'];
        $actual = array_keys($row);
        sort($expected);
        sort($actual);

        if ($actual !== $expected || ! is_int($row['old_id'])) {
            throw new RuntimeException("Malformed {$definition->name} backup row.");
        }
    }

    private function oldId(array $row, string $entity): int
    {
        if (! is_int($row['old_id'] ?? null)) {
            throw new RuntimeException("Invalid old ID for {$entity}.");
        }

        return $row['old_id'];
    }

    private function definition(string $name): BackupTableDefinition
    {
        foreach ($this->registry->tables() as $definition) {
            if ($definition->name === $name) {
                return $definition;
            }
        }

        throw new RuntimeException("Unknown backup table: {$name}");
    }

    private function referenceKeys(): array
    {
        return [
            'currencies' => 'code',
            'providers' => 'key',
            'platforms' => 'name',
            'devices' => 'name',
            'statuses' => 'name',
            'ownership_types' => 'name',
            'physical_statuses' => 'name',
        ];
    }

    private function dataRestoreOrder(): array
    {
        return [
            'platform_devices', 'platform_ownership_types', 'games', 'external_game_ids',
            'library_games', 'library_game_devices', 'ownership_copies', 'dlcs', 'owned_dlcs',
            'snapshot_runs', 'subscription_entries', 'subscription_entry_ownership_copies',
            'subscription_entry_years', 'subscription_entry_year_ownership_copies',
            'in_app_purchases', 'library_game_snapshots', 'ownership_copy_snapshots',
            'owned_dlc_snapshots', 'snapshot_best_games',
        ];
    }

    private function foreignKeys(): array
    {
        return [
            'platform_devices' => ['platform_id' => 'platforms', 'device_id' => 'devices'],
            'platform_ownership_types' => ['platform_id' => 'platforms', 'ownership_type_id' => 'ownership_types'],
            'games' => ['source_provider_id' => 'providers'],
            'external_game_ids' => ['game_id' => 'games', 'provider_id' => 'providers'],
            'library_games' => ['game_id' => 'games', 'platform_id' => 'platforms', 'status_id' => 'statuses'],
            'library_game_devices' => ['library_game_id' => 'library_games', 'device_id' => 'devices'],
            'ownership_copies' => ['library_game_id' => 'library_games', 'ownership_type_id' => 'ownership_types', 'physical_status_id' => 'physical_statuses'],
            'dlcs' => ['game_id' => 'games', 'source_provider_id' => 'providers'],
            'owned_dlcs' => ['library_game_id' => 'library_games', 'dlc_id' => 'dlcs'],
            'snapshot_runs' => [],
            'subscription_entries' => ['ownership_type_id' => 'ownership_types'],
            'subscription_entry_ownership_copies' => ['subscription_entry_id' => 'subscription_entries', 'ownership_copy_id' => 'ownership_copies'],
            'subscription_entry_years' => ['subscription_entry_id' => 'subscription_entries', 'locked_by_snapshot_run_id' => 'snapshot_runs'],
            'subscription_entry_year_ownership_copies' => ['subscription_entry_year_id' => 'subscription_entry_years', 'ownership_copy_id' => 'ownership_copies'],
            'in_app_purchases' => ['library_game_id' => 'library_games', 'locked_by_snapshot_run_id' => 'snapshot_runs'],
            'library_game_snapshots' => ['snapshot_run_id' => 'snapshot_runs', 'library_game_id' => 'library_games', 'game_id' => 'games', 'platform_id' => 'platforms', 'status_id' => 'statuses'],
            'ownership_copy_snapshots' => ['snapshot_run_id' => 'snapshot_runs', 'ownership_copy_id' => 'ownership_copies', 'library_game_id' => 'library_games', 'ownership_type_id' => 'ownership_types'],
            'owned_dlc_snapshots' => ['snapshot_run_id' => 'snapshot_runs', 'owned_dlc_id' => 'owned_dlcs', 'library_game_id' => 'library_games', 'dlc_id' => 'dlcs'],
            'snapshot_best_games' => ['snapshot_run_id' => 'snapshot_runs', 'library_game_id' => 'library_games', 'game_id' => 'games'],
        ];
    }
}
