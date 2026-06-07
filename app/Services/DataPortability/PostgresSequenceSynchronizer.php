<?php

namespace App\Services\DataPortability;

use Illuminate\Support\Facades\DB;

final class PostgresSequenceSynchronizer
{
    /**
     * @param  list<BackupTableDefinition>  $definitions
     */
    public function synchronize(array $definitions): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($definitions as $definition) {
            if (! in_array('id', $definition->columns, true)) {
                continue;
            }

            $sequence = DB::selectOne(
                'SELECT pg_get_serial_sequence(?, ?) AS sequence_name',
                [$definition->table, 'id'],
            )?->sequence_name;

            if (! is_string($sequence) || $sequence === '') {
                continue;
            }

            $maximumId = DB::table($definition->table)->max('id');
            $sequenceValue = $maximumId === null ? 1 : (int) $maximumId;

            DB::select(
                'SELECT setval(CAST(? AS regclass), ?, ?)',
                [$sequence, $sequenceValue, $maximumId !== null],
            );
        }
    }
}
