<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SnapshotService
{
    public function __construct(
        private ClosedFinancialYearService $closedYears,
        private CumulativeFinancialLockService $financialLocks,
    ) {}

    public function createDraft(User $user, int $year): SnapshotRun
    {
        $this->assertSnapshotYearIsOpen($user, $year);

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
            $this->refreshSummary($run);

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

        $this->assertSnapshotYearIsOpen(
            User::findOrFail($snapshot->user_id),
            (int) $snapshot->year,
        );

        return DB::transaction(function () use ($snapshot) {
            DB::table('snapshot_best_games')->where('snapshot_run_id', $snapshot->id)->delete();
            DB::table('owned_dlc_snapshots')->where('snapshot_run_id', $snapshot->id)->delete();
            DB::table('ownership_copy_snapshots')->where('snapshot_run_id', $snapshot->id)->delete();
            DB::table('library_game_snapshots')->where('snapshot_run_id', $snapshot->id)->delete();

            $this->captureCurrentLibrary($snapshot, User::findOrFail($snapshot->user_id));
            $snapshot->touch();
            $this->refreshSummary($snapshot);

            return $snapshot;
        });
    }

    public function confirm(SnapshotRun $snapshot): SnapshotRun
    {
        if ($snapshot->status === 'confirmed') {
            return $snapshot;
        }

        $user = User::findOrFail($snapshot->user_id);
        $this->assertSnapshotYearIsOpen($user, (int) $snapshot->year);

        DB::transaction(function () use ($snapshot) {
            SnapshotRun::where('user_id', $snapshot->user_id)
                ->where('status', 'draft')
                ->where('year', '<=', $snapshot->year)
                ->whereKeyNot($snapshot->id)
                ->delete();

            $snapshot->update([
                'status' => 'confirmed',
                'confirmed_at' => now(),
            ]);
            $this->financialLocks->lockThroughSnapshot($snapshot->refresh());
            $this->refreshSummary($snapshot);
        });

        return $snapshot->refresh();
    }

    public function delete(SnapshotRun $snapshot): void
    {
        DB::transaction(function () use ($snapshot) {
            $nextSnapshot = $snapshot->status === 'confirmed'
                ? $this->financialLocks->reassignOrUnlockRowsForDeletedSnapshot($snapshot)
                : null;

            $snapshot->delete();

            if ($nextSnapshot) {
                $this->refreshSummary($nextSnapshot->refresh());
            }
        });
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

        $eligible = collect($this->eligibleBestGames($snapshot, null, all: true)['items'])
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

        $snapshot->refresh();
        $this->refreshSummary($snapshot);

        return $snapshot;
    }

    private function captureCurrentLibrary(SnapshotRun $run, User $user): void
    {
        LibraryGame::where('user_id', $user->id)
            ->with(['game', 'ownershipCopies', 'ownedDlcs.dlc'])
            ->orderBy('id')
            ->chunkById(250, function ($libraryGames) use ($run) {
                $timestamp = now();
                $gameRows = [];
                $copyRows = [];
                $dlcRows = [];

                foreach ($libraryGames as $libraryGame) {
                    $gameRows[] = [
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
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ];

                    foreach ($libraryGame->ownershipCopies as $copy) {
                        $copyRows[] = [
                            'snapshot_run_id' => $run->id,
                            'ownership_copy_id' => $copy->id,
                            'library_game_id' => $libraryGame->id,
                            'ownership_type_id' => $copy->ownership_type_id,
                            'edition_name' => $copy->edition_name,
                            'base_price' => $copy->base_price,
                            'purchased_price' => $copy->purchased_price,
                            'purchased_at' => $copy->purchased_at,
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }

                    foreach ($libraryGame->ownedDlcs as $ownedDlc) {
                        $dlcRows[] = [
                            'snapshot_run_id' => $run->id,
                            'owned_dlc_id' => $ownedDlc->id,
                            'library_game_id' => $libraryGame->id,
                            'dlc_id' => $ownedDlc->dlc_id,
                            'acquisition_type' => $ownedDlc->acquisition_type,
                            'base_price' => $ownedDlc->dlc?->base_price,
                            'purchased_price' => $ownedDlc->purchased_price,
                            'purchased_at' => $ownedDlc->purchased_at,
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }
                }

                if ($gameRows) {
                    DB::table('library_game_snapshots')->insert($gameRows);
                }

                if ($copyRows) {
                    DB::table('ownership_copy_snapshots')->insert($copyRows);
                }

                if ($dlcRows) {
                    DB::table('owned_dlc_snapshots')->insert($dlcRows);
                }
            });
    }

    private function refreshSummary(SnapshotRun $snapshot): void
    {
        app(StatsService::class)->refreshSnapshotSummary($snapshot->refresh());
    }

    private function assertSnapshotYearIsOpen(User $user, int $year): void
    {
        if (! $this->closedYears->isYearClosed($user, $year)) {
            return;
        }

        $closedYear = $this->closedYears->closedFinancialYear($user);

        throw ValidationException::withMessages([
            'year' => "{$closedYear} and earlier are locked by confirmed snapshots.",
        ]);
    }

    public function eligibleBestGames(SnapshotRun $snapshot, ?Request $request = null, bool $all = false): array
    {
        $limit = $all ? 10000 : $this->boundedLimit($request, 80, 200);
        $offset = $all ? 0 : $this->decodeOffsetCursor($request?->string('cursor')->toString());
        $search = trim((string) $request?->string('query')->toString());
        $usedGameIds = DB::table('snapshot_best_games')
            ->where('snapshot_run_id', '!=', $snapshot->id)
            ->pluck('game_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $builder = DB::table('library_game_snapshots')
            ->join('games', 'games.id', '=', 'library_game_snapshots.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('library_game_snapshots.snapshot_run_id', $snapshot->id)
            ->whereIn('statuses.name', ['Completed', '100%'])
            ->whereYear('library_game_snapshots.completed_at', $snapshot->year)
            ->whereNotIn('library_game_snapshots.game_id', $usedGameIds);

        if ($search !== '') {
            $builder->where(function ($scope) use ($search) {
                $scope->where('games.title', 'like', "%{$search}%")
                    ->orWhere('platforms.name', 'like', "%{$search}%")
                    ->orWhere('statuses.name', 'like', "%{$search}%");
            });
        }

        $rows = $builder
            ->orderBy('games.title')
            ->orderBy('library_game_snapshots.library_game_id')
            ->skip($offset)
            ->take($limit + 1)
            ->select([
                'library_game_snapshots.library_game_id',
                'library_game_snapshots.game_id',
                'games.title',
                'games.cover_url_original',
                'games.cover_path',
                'platforms.name as platform',
                'statuses.name as status',
                'statuses.color_key as status_color_key',
                'statuses.color_hex as status_color_hex',
                'library_game_snapshots.playtime_hours',
                'library_game_snapshots.earned_achievements',
                'library_game_snapshots.total_achievements',
            ])
            ->get();

        $payload = [
            'items' => $rows->take($limit)->map(fn ($row) => [
                'library_game_id' => (int) $row->library_game_id,
                'game_id' => (int) $row->game_id,
                'title' => $row->title,
                'cover_url' => $row->cover_path ? asset('storage/'.$row->cover_path) : $row->cover_url_original,
                'platform' => $row->platform,
                'status' => $row->status,
                'status_color_key' => $row->status_color_key,
                'status_color_hex' => $row->status_color_hex,
                'playtime_hours' => (float) $row->playtime_hours,
                'earned_achievements' => (int) $row->earned_achievements,
                'total_achievements' => (int) $row->total_achievements,
            ])
            ->values()
            ->all(),
            'next_cursor' => (! $all && $rows->count() > $limit) ? $this->encodeOffsetCursor($offset + $limit) : null,
            'has_more' => ! $all && $rows->count() > $limit,
        ];

        return $request || $all ? $payload : $payload['items'];
    }

    private function boundedLimit(?Request $request, int $default, int $max): int
    {
        $limit = (int) ($request?->integer('limit', $default) ?? $default);

        return max(1, min($limit, $max));
    }

    private function encodeOffsetCursor(int $offset): string
    {
        return rtrim(strtr(base64_encode((string) $offset), '+/', '-_'), '=');
    }

    private function decodeOffsetCursor(?string $cursor): int
    {
        if (! $cursor) {
            return 0;
        }

        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);

        return is_numeric($decoded) ? max(0, (int) $decoded) : 0;
    }
}
