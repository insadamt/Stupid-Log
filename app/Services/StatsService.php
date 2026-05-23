<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StatsService
{
    private const GROWTH_KEYS = [
        'unique_titles',
        'library_games',
        'ownership_copies',
        'completed',
        'hundred_percent',
        'playtime_hours',
        'earned_achievements',
        'total_achievements',
        'achievement_progress',
        'base_value',
        'purchased_value',
    ];

    public function live(User $user): array
    {
        $libraryGames = LibraryGame::query()
            ->where('user_id', $user->id)
            ->with(['game', 'platform', 'status', 'ownershipCopies.ownershipType', 'ownedDlcs.dlc'])
            ->get();

        $totalAchievements = (int) $libraryGames->sum(fn (LibraryGame $libraryGame) => $libraryGame->game->total_achievements ?? 0);
        $earnedAchievements = (int) $libraryGames->sum('earned_achievements');
        $baseValue = $libraryGames->sum(fn (LibraryGame $libraryGame) => $this->liveBaseValue($libraryGame));
        $purchasedValue = $libraryGames->sum(fn (LibraryGame $libraryGame) => $this->livePurchasedValue($libraryGame));

        return [
            'unique_titles' => $libraryGames->pluck('game_id')->unique()->count(),
            'library_games' => $libraryGames->count(),
            'ownership_copies' => $libraryGames->sum(fn (LibraryGame $libraryGame) => $libraryGame->ownershipCopies->count()),
            'completed' => $libraryGames->filter(fn (LibraryGame $libraryGame) => in_array($libraryGame->status->name, ['Completed', '100%'], true))->count(),
            'hundred_percent' => $libraryGames->filter(fn (LibraryGame $libraryGame) => $libraryGame->status->name === '100%')->count(),
            'playtime_hours' => round((float) $libraryGames->sum('playtime_hours'), 1),
            'earned_achievements' => $earnedAchievements,
            'total_achievements' => $totalAchievements,
            'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
            'base_value' => round((float) $baseValue, 2),
            'purchased_value' => round((float) $purchasedValue, 2),
            'breakdowns' => $this->liveBreakdowns($libraryGames),
        ];
    }

    public function confirmedYear(User $user, int $year): ?array
    {
        $snapshot = SnapshotRun::where('user_id', $user->id)
            ->where('year', $year)
            ->where('status', 'confirmed')
            ->latest('confirmed_at')
            ->first();

        if (! $snapshot) {
            return null;
        }

        return $this->snapshotSummary($snapshot);
    }

    public function confirmedYears(User $user): array
    {
        $summaries = SnapshotRun::where('user_id', $user->id)
            ->where('status', 'confirmed')
            ->orderBy('year')
            ->get()
            ->map(fn (SnapshotRun $snapshot) => $this->snapshotSummary($snapshot))
            ->values();

        return $this->withGrowth($summaries)->reverse()->values()->all();
    }

    public function snapshotSummary(SnapshotRun $snapshot): array
    {
        $libraryQuery = DB::table('library_game_snapshots')->where('snapshot_run_id', $snapshot->id);
        $copyQuery = DB::table('ownership_copy_snapshots')->where('snapshot_run_id', $snapshot->id);
        $dlcQuery = DB::table('owned_dlc_snapshots')->where('snapshot_run_id', $snapshot->id);
        $totalAchievements = (int) (clone $libraryQuery)->sum('total_achievements');
        $earnedAchievements = (int) (clone $libraryQuery)->sum('earned_achievements');

        return [
            'snapshot_id' => $snapshot->id,
            'year' => $snapshot->year,
            'status' => $snapshot->status,
            'created_at' => $snapshot->created_at?->toIso8601String(),
            'confirmed_at' => $snapshot->confirmed_at?->toIso8601String(),
            'unique_titles' => (clone $libraryQuery)->distinct('game_id')->count('game_id'),
            'library_games' => (clone $libraryQuery)->count(),
            'ownership_copies' => (clone $copyQuery)->count(),
            'owned_dlcs' => (clone $dlcQuery)->count(),
            'completed' => (clone $libraryQuery)
                ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
                ->whereIn('statuses.name', ['Completed', '100%'])
                ->count(),
            'hundred_percent' => (clone $libraryQuery)
                ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
                ->where('statuses.name', '100%')
                ->count(),
            'playtime_hours' => round((float) (clone $libraryQuery)->sum('playtime_hours'), 1),
            'earned_achievements' => $earnedAchievements,
            'total_achievements' => $totalAchievements,
            'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
            'base_value' => round((float) (clone $copyQuery)->sum('base_price') + (float) (clone $dlcQuery)->where('acquisition_type', '!=', 'Edition Included')->sum('base_price'), 2),
            'purchased_value' => round((float) (clone $copyQuery)->sum('purchased_price') + (float) (clone $dlcQuery)->sum('purchased_price'), 2),
            'breakdowns' => $this->snapshotBreakdowns($snapshot),
            'best_games' => $this->snapshotBestGames($snapshot),
            'growth' => [],
        ];
    }

    public function snapshotRows(SnapshotRun $snapshot): array
    {
        return DB::table('library_game_snapshots')
            ->join('games', 'games.id', '=', 'library_game_snapshots.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->orderBy('games.title')
            ->select([
                'library_game_snapshots.library_game_id',
                'games.title',
                'platforms.name as platform',
                'statuses.name as status',
                'library_game_snapshots.playtime_hours',
                'library_game_snapshots.earned_achievements',
                'library_game_snapshots.total_achievements',
            ])
            ->get()
            ->map(fn ($row) => [
                'library_game_id' => $row->library_game_id,
                'title' => $row->title,
                'platform' => $row->platform,
                'status' => $row->status,
                'playtime_hours' => (float) $row->playtime_hours,
                'earned_achievements' => (int) $row->earned_achievements,
                'total_achievements' => (int) $row->total_achievements,
            ])
            ->values()
            ->all();
    }

    private function snapshotBestGames(SnapshotRun $snapshot): array
    {
        return DB::table('snapshot_best_games')
            ->join('library_game_snapshots', function ($join) {
                $join->on('library_game_snapshots.snapshot_run_id', '=', 'snapshot_best_games.snapshot_run_id')
                    ->on('library_game_snapshots.library_game_id', '=', 'snapshot_best_games.library_game_id');
            })
            ->join('games', 'games.id', '=', 'library_game_snapshots.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_best_games.snapshot_run_id', $snapshot->id)
            ->orderBy('snapshot_best_games.rank')
            ->select([
                'snapshot_best_games.rank',
                'snapshot_best_games.note',
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
                'rank' => (int) $row->rank,
                'note' => $row->note,
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

    private function liveBreakdowns(Collection $libraryGames): array
    {
        return [
            'platforms' => $libraryGames
                ->groupBy(fn (LibraryGame $libraryGame) => $libraryGame->platform->name)
                ->map(fn (Collection $games, string $label) => $this->livePlatformBreakdown($label, $games))
                ->sortByDesc('library_games')
                ->values()
                ->all(),
            'statuses' => $libraryGames
                ->groupBy(fn (LibraryGame $libraryGame) => $libraryGame->status->name)
                ->map(fn (Collection $games, string $label) => [
                    'label' => $label,
                    'library_games' => $games->count(),
                    'playtime_hours' => round((float) $games->sum('playtime_hours'), 1),
                ])
                ->sortByDesc('library_games')
                ->values()
                ->all(),
            'ownership_types' => $libraryGames
                ->flatMap(fn (LibraryGame $libraryGame) => $libraryGame->ownershipCopies)
                ->groupBy(fn ($copy) => $copy->ownershipType?->name ?? 'Unknown')
                ->map(fn (Collection $copies, string $label) => [
                    'label' => $label,
                    'ownership_copies' => $copies->count(),
                    'base_value' => round((float) $copies->sum('base_price'), 2),
                    'purchased_value' => round((float) $copies->sum('purchased_price'), 2),
                ])
                ->sortByDesc('ownership_copies')
                ->values()
                ->all(),
        ];
    }

    private function livePlatformBreakdown(string $label, Collection $games): array
    {
        $earnedAchievements = (int) $games->sum('earned_achievements');
        $totalAchievements = (int) $games->sum(fn (LibraryGame $libraryGame) => $libraryGame->game->total_achievements ?? 0);

        return [
            'label' => $label,
            'library_games' => $games->count(),
            'completed' => $games->filter(fn (LibraryGame $libraryGame) => in_array($libraryGame->status->name, ['Completed', '100%'], true))->count(),
            'playtime_hours' => round((float) $games->sum('playtime_hours'), 1),
            'earned_achievements' => $earnedAchievements,
            'total_achievements' => $totalAchievements,
            'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
            'base_value' => round((float) $games->sum(fn (LibraryGame $libraryGame) => $this->liveBaseValue($libraryGame)), 2),
            'purchased_value' => round((float) $games->sum(fn (LibraryGame $libraryGame) => $this->livePurchasedValue($libraryGame)), 2),
        ];
    }

    private function snapshotBreakdowns(SnapshotRun $snapshot): array
    {
        return [
            'platforms' => $this->snapshotPlatformBreakdowns($snapshot),
            'statuses' => $this->snapshotStatusBreakdowns($snapshot),
            'ownership_types' => $this->snapshotOwnershipBreakdowns($snapshot),
        ];
    }

    private function snapshotPlatformBreakdowns(SnapshotRun $snapshot): array
    {
        $platforms = DB::table('library_game_snapshots')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->groupBy('platforms.id', 'platforms.name')
            ->selectRaw('platforms.id, platforms.name as label, count(*) as library_games, sum(playtime_hours) as playtime_hours, sum(earned_achievements) as earned_achievements, sum(total_achievements) as total_achievements')
            ->selectRaw("sum(case when statuses.name in ('Completed', '100%') then 1 else 0 end) as completed")
            ->get()
            ->keyBy('id');

        $copyValues = DB::table('ownership_copy_snapshots')
            ->join('library_game_snapshots', function ($join) {
                $join->on('library_game_snapshots.snapshot_run_id', '=', 'ownership_copy_snapshots.snapshot_run_id')
                    ->on('library_game_snapshots.library_game_id', '=', 'ownership_copy_snapshots.library_game_id');
            })
            ->where('ownership_copy_snapshots.snapshot_run_id', $snapshot->id)
            ->groupBy('library_game_snapshots.platform_id')
            ->selectRaw('library_game_snapshots.platform_id, sum(ownership_copy_snapshots.base_price) as base_value, sum(ownership_copy_snapshots.purchased_price) as purchased_value')
            ->get()
            ->keyBy('platform_id');

        $dlcValues = DB::table('owned_dlc_snapshots')
            ->join('library_game_snapshots', function ($join) {
                $join->on('library_game_snapshots.snapshot_run_id', '=', 'owned_dlc_snapshots.snapshot_run_id')
                    ->on('library_game_snapshots.library_game_id', '=', 'owned_dlc_snapshots.library_game_id');
            })
            ->where('owned_dlc_snapshots.snapshot_run_id', $snapshot->id)
            ->groupBy('library_game_snapshots.platform_id')
            ->selectRaw("library_game_snapshots.platform_id, sum(case when owned_dlc_snapshots.acquisition_type != 'Edition Included' then owned_dlc_snapshots.base_price else 0 end) as base_value, sum(owned_dlc_snapshots.purchased_price) as purchased_value")
            ->get()
            ->keyBy('platform_id');

        return $platforms
            ->map(function ($row) use ($copyValues, $dlcValues) {
                $copy = $copyValues->get($row->id);
                $dlc = $dlcValues->get($row->id);
                $earnedAchievements = (int) $row->earned_achievements;
                $totalAchievements = (int) $row->total_achievements;

                return [
                    'label' => $row->label,
                    'library_games' => (int) $row->library_games,
                    'completed' => (int) $row->completed,
                    'playtime_hours' => round((float) $row->playtime_hours, 1),
                    'earned_achievements' => $earnedAchievements,
                    'total_achievements' => $totalAchievements,
                    'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
                    'base_value' => round((float) ($copy?->base_value ?? 0) + (float) ($dlc?->base_value ?? 0), 2),
                    'purchased_value' => round((float) ($copy?->purchased_value ?? 0) + (float) ($dlc?->purchased_value ?? 0), 2),
                ];
            })
            ->sortByDesc('library_games')
            ->values()
            ->all();
    }

    private function snapshotStatusBreakdowns(SnapshotRun $snapshot): array
    {
        return DB::table('library_game_snapshots')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->groupBy('statuses.name')
            ->selectRaw('statuses.name as label, count(*) as library_games, sum(playtime_hours) as playtime_hours')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'library_games' => (int) $row->library_games,
                'playtime_hours' => round((float) $row->playtime_hours, 1),
            ])
            ->sortByDesc('library_games')
            ->values()
            ->all();
    }

    private function snapshotOwnershipBreakdowns(SnapshotRun $snapshot): array
    {
        return DB::table('ownership_copy_snapshots')
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copy_snapshots.ownership_type_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->groupBy('ownership_types.name')
            ->selectRaw('ownership_types.name as label, count(*) as ownership_copies, sum(base_price) as base_value, sum(purchased_price) as purchased_value')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'ownership_copies' => (int) $row->ownership_copies,
                'base_value' => round((float) $row->base_value, 2),
                'purchased_value' => round((float) $row->purchased_value, 2),
            ])
            ->sortByDesc('ownership_copies')
            ->values()
            ->all();
    }

    private function liveBaseValue(LibraryGame $libraryGame): float
    {
        return (float) $libraryGame->ownershipCopies->sum('base_price')
            + (float) $libraryGame->ownedDlcs
                ->filter(fn ($ownedDlc) => $ownedDlc->acquisition_type !== 'Edition Included')
                ->sum(fn ($ownedDlc) => $ownedDlc->dlc?->base_price ?? 0);
    }

    private function livePurchasedValue(LibraryGame $libraryGame): float
    {
        return (float) $libraryGame->ownershipCopies->sum('purchased_price')
            + (float) $libraryGame->ownedDlcs->sum('purchased_price');
    }

    private function withGrowth(Collection $summaries): Collection
    {
        $previous = null;

        return $summaries->map(function (array $summary) use (&$previous) {
            $summary['growth'] = $previous ? $this->growthAgainst($summary, $previous) : [];
            $previous = $summary;

            return $summary;
        });
    }

    private function growthAgainst(array $current, array $previous): array
    {
        return collect(self::GROWTH_KEYS)
            ->mapWithKeys(function (string $key) use ($current, $previous) {
                $delta = round((float) $current[$key] - (float) $previous[$key], str_contains($key, 'value') || $key === 'playtime_hours' ? 1 : 0);
                $base = (float) $previous[$key];

                return [$key => [
                    'delta' => $delta,
                    'percentage' => $base > 0 ? round(($delta / $base) * 100, 1) : null,
                ]];
            })
            ->all();
    }
}
