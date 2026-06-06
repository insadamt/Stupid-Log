<?php

namespace App\Services;

use App\Models\StupidLog\SnapshotRun;
use Illuminate\Support\Facades\DB;

class CumulativeFinancialLockService
{
    public function lockThroughSnapshot(SnapshotRun $snapshot): void
    {
        $lockedAt = $snapshot->confirmed_at ?? now();

        DB::table('subscription_entry_years')
            ->where('is_locked', false)
            ->where('year', '<=', $snapshot->year)
            ->whereIn(
                'subscription_entry_id',
                DB::table('subscription_entries')
                    ->where('user_id', $snapshot->user_id)
                    ->select('id'),
            )
            ->update([
                'is_locked' => true,
                'locked_at' => $lockedAt,
                'locked_by_snapshot_run_id' => $snapshot->id,
                'locked_reason' => 'cumulative_snapshot',
                'updated_at' => now(),
            ]);

        DB::table('in_app_purchases')
            ->where('is_locked', false)
            ->whereYear('purchased_at', '<=', $snapshot->year)
            ->whereIn(
                'library_game_id',
                DB::table('library_games')
                    ->where('user_id', $snapshot->user_id)
                    ->select('id'),
            )
            ->update([
                'is_locked' => true,
                'locked_at' => $lockedAt,
                'locked_by_snapshot_run_id' => $snapshot->id,
                'locked_reason' => 'cumulative_snapshot',
                'updated_at' => now(),
            ]);
    }

    public function reassignOrUnlockRowsForDeletedSnapshot(SnapshotRun $snapshot): ?SnapshotRun
    {
        $nextSnapshot = SnapshotRun::where('user_id', $snapshot->user_id)
            ->where('status', 'confirmed')
            ->where('year', '>', $snapshot->year)
            ->whereKeyNot($snapshot->id)
            ->orderBy('year')
            ->orderBy('id')
            ->first();

        if ($nextSnapshot) {
            $this->reassignRows($snapshot, $nextSnapshot);

            return $nextSnapshot;
        }

        $this->unlockRows($snapshot);

        return null;
    }

    private function reassignRows(SnapshotRun $from, SnapshotRun $to): void
    {
        $attributes = [
            'is_locked' => true,
            'locked_at' => $to->confirmed_at ?? now(),
            'locked_by_snapshot_run_id' => $to->id,
            'locked_reason' => 'cumulative_snapshot',
            'updated_at' => now(),
        ];

        DB::table('subscription_entry_years')
            ->where('locked_by_snapshot_run_id', $from->id)
            ->update($attributes);
        DB::table('in_app_purchases')
            ->where('locked_by_snapshot_run_id', $from->id)
            ->update($attributes);
    }

    private function unlockRows(SnapshotRun $snapshot): void
    {
        $attributes = [
            'is_locked' => false,
            'locked_at' => null,
            'locked_by_snapshot_run_id' => null,
            'locked_reason' => null,
            'updated_at' => now(),
        ];

        DB::table('subscription_entry_years')
            ->where('locked_by_snapshot_run_id', $snapshot->id)
            ->update($attributes);
        DB::table('in_app_purchases')
            ->where('locked_by_snapshot_run_id', $snapshot->id)
            ->update($attributes);
    }
}
