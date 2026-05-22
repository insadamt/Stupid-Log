<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SnapshotService
{
    public function createDraft(User $user, int $year): SnapshotRun
    {
        return DB::transaction(function () use ($user, $year) {
            $run = SnapshotRun::create([
                'user_id' => $user->id,
                'year' => $year,
                'status' => 'draft',
            ]);

            LibraryGame::where('user_id', $user->id)
                ->with(['game', 'ownershipCopies', 'ownedDlcs.dlc'])
                ->get()
                ->each(function (LibraryGame $libraryGame) use ($run) {
                    DB::table('library_game_snapshots')->insert([
                        'snapshot_run_id' => $run->id,
                        'library_game_id' => $libraryGame->id,
                        'game_id' => $libraryGame->game_id,
                        'platform_id' => $libraryGame->platform_id,
                        'status_id' => $libraryGame->status_id,
                        'playtime_hours' => $libraryGame->playtime_hours,
                        'earned_achievements' => $libraryGame->earned_achievements,
                        'total_achievements' => $libraryGame->game->total_achievements,
                        'first_played_at' => $libraryGame->first_played_at,
                        'last_played_at' => $libraryGame->last_played_at,
                        'completed_at' => $libraryGame->completed_at,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    foreach ($libraryGame->ownershipCopies as $copy) {
                        DB::table('ownership_copy_snapshots')->insert([
                            'snapshot_run_id' => $run->id,
                            'ownership_copy_id' => $copy->id,
                            'library_game_id' => $libraryGame->id,
                            'ownership_type_id' => $copy->ownership_type_id,
                            'edition_name' => $copy->edition_name,
                            'base_price' => $copy->base_price,
                            'purchased_price' => $copy->purchased_price,
                            'purchased_at' => $copy->purchased_at,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    foreach ($libraryGame->ownedDlcs as $ownedDlc) {
                        DB::table('owned_dlc_snapshots')->insert([
                            'snapshot_run_id' => $run->id,
                            'owned_dlc_id' => $ownedDlc->id,
                            'library_game_id' => $libraryGame->id,
                            'dlc_id' => $ownedDlc->dlc_id,
                            'acquisition_type' => $ownedDlc->acquisition_type,
                            'base_price' => $ownedDlc->dlc?->base_price,
                            'purchased_price' => $ownedDlc->purchased_price,
                            'purchased_at' => $ownedDlc->purchased_at,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                });

            return $run;
        });
    }

    public function confirm(SnapshotRun $snapshot): SnapshotRun
    {
        $snapshot->update([
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        return $snapshot;
    }
}
