<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SnapshotService
{
    public function createDraft(User $user, int $year): SnapshotRun
    {
        return DB::transaction(function () use ($user, $year) {
            if (SnapshotRun::where('user_id', $user->id)
                ->where('year', $year)
                ->where('status', 'confirmed')
                ->exists()) {
                throw ValidationException::withMessages([
                    'year' => 'This year already has a confirmed snapshot. Delete it before drafting a replacement.',
                ]);
            }

            $run = SnapshotRun::create([
                'user_id' => $user->id,
                'year' => $year,
                'status' => 'draft',
            ]);

            $this->captureCurrentLibrary($run, $user);

            return $run;
        });
    }

    public function resnapDraft(SnapshotRun $snapshot): SnapshotRun
    {
        if ($snapshot->status !== 'draft') {
            throw ValidationException::withMessages([
                'snapshot' => 'Only draft snapshots can be resnapped.',
            ]);
        }

        return DB::transaction(function () use ($snapshot) {
            DB::table('snapshot_best_games')->where('snapshot_run_id', $snapshot->id)->delete();
            DB::table('owned_dlc_snapshots')->where('snapshot_run_id', $snapshot->id)->delete();
            DB::table('ownership_copy_snapshots')->where('snapshot_run_id', $snapshot->id)->delete();
            DB::table('library_game_snapshots')->where('snapshot_run_id', $snapshot->id)->delete();

            $this->captureCurrentLibrary($snapshot, User::findOrFail($snapshot->user_id));
            $snapshot->touch();

            return $snapshot;
        });
    }

    public function confirm(SnapshotRun $snapshot): SnapshotRun
    {
        if ($snapshot->status === 'confirmed') {
            return $snapshot;
        }

        $alreadyConfirmed = SnapshotRun::where('user_id', $snapshot->user_id)
            ->where('year', $snapshot->year)
            ->where('status', 'confirmed')
            ->exists();

        if ($alreadyConfirmed) {
            throw ValidationException::withMessages([
                'year' => 'This year already has a confirmed snapshot.',
            ]);
        }

        $snapshot->update([
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        return $snapshot;
    }

    public function updateBestGames(SnapshotRun $snapshot, array $libraryGameIds): SnapshotRun
    {
        if ($snapshot->status !== 'draft') {
            throw ValidationException::withMessages([
                'best_games' => 'Best games are locked after a snapshot is confirmed.',
            ]);
        }

        $libraryGameIds = collect($libraryGameIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($libraryGameIds->count() > 5) {
            throw ValidationException::withMessages([
                'best_games' => 'Choose up to 5 best games.',
            ]);
        }

        $eligible = collect($this->eligibleBestGames($snapshot))
            ->keyBy('library_game_id');
        $invalid = $libraryGameIds->reject(fn (int $id) => $eligible->has($id));

        if ($invalid->isNotEmpty()) {
            throw ValidationException::withMessages([
                'best_games' => 'Best games must be completed or 100% in this snapshot year and not already selected in another year.',
            ]);
        }

        $selectedGameIds = $libraryGameIds
            ->map(fn (int $libraryGameId) => $eligible->get($libraryGameId)['game_id']);

        if ($selectedGameIds->unique()->count() !== $selectedGameIds->count()) {
            throw ValidationException::withMessages([
                'best_games' => 'The same game title can only be selected once.',
            ]);
        }

        DB::transaction(function () use ($snapshot, $libraryGameIds, $eligible) {
            DB::table('snapshot_best_games')
                ->where('snapshot_run_id', $snapshot->id)
                ->delete();

            foreach ($libraryGameIds as $index => $libraryGameId) {
                $row = $eligible->get($libraryGameId);

                DB::table('snapshot_best_games')->insert([
                    'snapshot_run_id' => $snapshot->id,
                    'library_game_id' => $libraryGameId,
                    'game_id' => $row['game_id'],
                    'rank' => $index + 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        return $snapshot->refresh();
    }

    private function captureCurrentLibrary(SnapshotRun $run, User $user): void
    {
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
    }

    public function eligibleBestGames(SnapshotRun $snapshot): array
    {
        $usedGameIds = DB::table('snapshot_best_games')
            ->where('snapshot_run_id', '!=', $snapshot->id)
            ->pluck('game_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return DB::table('library_game_snapshots')
            ->join('games', 'games.id', '=', 'library_game_snapshots.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('library_game_snapshots.snapshot_run_id', $snapshot->id)
            ->whereIn('statuses.name', ['Completed', '100%'])
            ->whereYear('library_game_snapshots.completed_at', $snapshot->year)
            ->whereNotIn('library_game_snapshots.game_id', $usedGameIds)
            ->orderBy('games.title')
            ->select([
                'library_game_snapshots.library_game_id',
                'library_game_snapshots.game_id',
                'games.title',
                'games.cover_url_original',
                'games.cover_path',
                'platforms.name as platform',
                'statuses.name as status',
                'library_game_snapshots.playtime_hours',
                'library_game_snapshots.earned_achievements',
                'library_game_snapshots.total_achievements',
            ])
            ->get()
            ->map(fn ($row) => [
                'library_game_id' => (int) $row->library_game_id,
                'game_id' => (int) $row->game_id,
                'title' => $row->title,
                'cover_url' => $row->cover_path ? asset('storage/'.$row->cover_path) : $row->cover_url_original,
                'platform' => $row->platform,
                'status' => $row->status,
                'playtime_hours' => (float) $row->playtime_hours,
                'earned_achievements' => (int) $row->earned_achievements,
                'total_achievements' => (int) $row->total_achievements,
            ])
            ->values()
            ->all();
    }
}
