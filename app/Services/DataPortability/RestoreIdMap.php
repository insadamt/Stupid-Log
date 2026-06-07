<?php

namespace App\Services\DataPortability;

use Illuminate\Support\Facades\DB;
use RuntimeException;

final class RestoreIdMap
{
    private const TABLE = 'data_portability_id_maps';

    public function create(): void
    {
        DB::statement('DROP TABLE IF EXISTS '.self::TABLE);
        DB::statement(
            'CREATE TEMPORARY TABLE '.self::TABLE.' ('.
            'entity VARCHAR(100) NOT NULL, old_id BIGINT NOT NULL, new_id BIGINT NOT NULL, '.
            'PRIMARY KEY (entity, old_id))'
        );
    }

    public function drop(): void
    {
        DB::statement('DROP TABLE IF EXISTS '.self::TABLE);
    }

    public function put(string $entity, int $oldId, int $newId): void
    {
        $this->putMany($entity, [['old_id' => $oldId, 'new_id' => $newId]]);
    }

    public function putMany(string $entity, array $mappings): void
    {
        if ($mappings === []) {
            return;
        }

        DB::table(self::TABLE)->insert(array_map(
            fn (array $mapping) => [
                'entity' => $entity,
                'old_id' => $mapping['old_id'],
                'new_id' => $mapping['new_id'],
            ],
            $mappings,
        ));
    }

    /**
     * @return array<int, int>
     */
    public function resolveMany(string $entity, array $oldIds): array
    {
        $ids = array_values(array_unique(array_filter($oldIds, fn ($id) => $id !== null)));

        if ($ids === []) {
            return [];
        }

        $resolved = DB::table(self::TABLE)
            ->where('entity', $entity)
            ->whereIn('old_id', $ids)
            ->pluck('new_id', 'old_id')
            ->mapWithKeys(fn ($newId, $oldId) => [(int) $oldId => (int) $newId])
            ->all();

        if (count($resolved) !== count($ids)) {
            throw new RuntimeException("Backup relationship references an unknown {$entity} ID.");
        }

        return $resolved;
    }
}
