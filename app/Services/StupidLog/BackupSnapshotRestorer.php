<?php

namespace App\Services\StupidLog;

use Illuminate\Support\Facades\DB;
use RuntimeException;

class BackupSnapshotRestorer
{
    public function restore(
        array $data,
        array $snapshotIds,
        array $libraryGameIds,
        array $gameIds,
        array $ownershipCopyIds,
        array $ownedDlcIds,
        array $dlcIds,
    ): void {
        foreach ($data['library_game_snapshots'] as $row) {
            DB::table('library_game_snapshots')->insert([
                'snapshot_run_id' => $snapshotIds[$row['snapshot_ref']],
                'library_game_id' => $libraryGameIds[$row['library_game_ref']],
                'game_id' => $gameIds[$row['game_ref']],
                'platform_id' => $this->namedId('platforms', $row['platform']),
                'status_id' => $this->namedId('statuses', $row['status']),
                'playtime_hours' => $row['playtime_hours'],
                'earned_achievements' => $row['earned_achievements'],
                'total_achievements' => $row['total_achievements'],
                'first_played_at' => $row['first_played_at'],
                'last_played_at' => $row['last_played_at'],
                'completed_at' => $row['completed_at'],
                ...$this->timestamps($row),
            ]);
        }

        foreach ($data['ownership_copy_snapshots'] as $row) {
            DB::table('ownership_copy_snapshots')->insert([
                'snapshot_run_id' => $snapshotIds[$row['snapshot_ref']],
                'ownership_copy_id' => $ownershipCopyIds[$row['ownership_copy_ref']],
                'library_game_id' => $libraryGameIds[$row['library_game_ref']],
                'ownership_type_id' => $this->namedId('ownership_types', $row['ownership_type']),
                'edition_name' => $row['edition_name'],
                'base_price' => $row['base_price'],
                'purchased_price' => $row['purchased_price'],
                'purchased_at' => $row['purchased_at'],
                ...$this->timestamps($row),
            ]);
        }

        foreach ($data['owned_dlc_snapshots'] as $row) {
            DB::table('owned_dlc_snapshots')->insert([
                'snapshot_run_id' => $snapshotIds[$row['snapshot_ref']],
                'owned_dlc_id' => $ownedDlcIds[$row['owned_dlc_ref']],
                'library_game_id' => $libraryGameIds[$row['library_game_ref']],
                'dlc_id' => $dlcIds[$row['dlc_ref']],
                'acquisition_type' => $row['acquisition_type'],
                'base_price' => $row['base_price'],
                'purchased_price' => $row['purchased_price'],
                'purchased_at' => $row['purchased_at'],
                ...$this->timestamps($row),
            ]);
        }

        foreach ($data['snapshot_best_games'] as $row) {
            DB::table('snapshot_best_games')->insert([
                'snapshot_run_id' => $snapshotIds[$row['snapshot_ref']],
                'library_game_id' => $libraryGameIds[$row['library_game_ref']],
                'game_id' => $gameIds[$row['game_ref']],
                'rank' => $row['rank'],
                'note' => $row['note'],
                ...$this->timestamps($row),
            ]);
        }
    }

    private function namedId(string $table, string $name): int
    {
        $id = DB::table($table)->where('name', $name)->value('id');
        if (! $id) {
            throw new RuntimeException("Missing reference value {$name} in {$table}.");
        }

        return (int) $id;
    }

    private function timestamps(array $row): array
    {
        return [
            'created_at' => $row['created_at'] ?? now(),
            'updated_at' => $row['updated_at'] ?? now(),
        ];
    }
}
