<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StatsService
{
    private const VALUE_OWNERSHIP_TYPES = ['Digital', 'Physical'];

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
            'archive' => $this->liveArchive($libraryGames),
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
        $copyBaseValue = $this->snapshotEligibleCopyValue($snapshot, 'base_price');
        $copyPurchasedValue = $this->snapshotEligibleCopyValue($snapshot, 'purchased_price');
        $dlcBaseValue = $this->snapshotOwnedDlcValue($snapshot, 'base_price');
        $dlcPurchasedValue = $this->snapshotOwnedDlcValue($snapshot, 'purchased_price');

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
            'base_value' => round($copyBaseValue + $dlcBaseValue, 2),
            'purchased_value' => round($copyPurchasedValue + $dlcPurchasedValue, 2),
            'breakdowns' => $this->snapshotBreakdowns($snapshot),
            'archive' => $this->snapshotArchive($snapshot),
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
                    'base_value' => in_array($label, self::VALUE_OWNERSHIP_TYPES, true) ? round((float) $copies->sum('base_price'), 2) : 0,
                    'purchased_value' => in_array($label, self::VALUE_OWNERSHIP_TYPES, true) ? round((float) $copies->sum('purchased_price'), 2) : 0,
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
        $baseWithoutDlcs = $games->sum(fn (LibraryGame $libraryGame) => $this->liveCopyBaseValue($libraryGame));
        $purchasedWithoutDlcs = $games->sum(fn (LibraryGame $libraryGame) => $this->liveCopyPurchasedValue($libraryGame));
        $dlcBaseValue = $games->sum(fn (LibraryGame $libraryGame) => $this->liveDlcBaseValue($libraryGame));
        $dlcPurchasedValue = $games->sum(fn (LibraryGame $libraryGame) => $this->liveDlcPurchasedValue($libraryGame));

        return [
            'label' => $label,
            'library_games' => $games->count(),
            'completed' => $games->filter(fn (LibraryGame $libraryGame) => in_array($libraryGame->status->name, ['Completed', '100%'], true))->count(),
            'playtime_hours' => round((float) $games->sum('playtime_hours'), 1),
            'earned_achievements' => $earnedAchievements,
            'total_achievements' => $totalAchievements,
            'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
            'base_value_without_dlcs' => round((float) $baseWithoutDlcs, 2),
            'purchased_value_without_dlcs' => round((float) $purchasedWithoutDlcs, 2),
            'dlc_base_value' => round((float) $dlcBaseValue, 2),
            'dlc_purchased_value' => round((float) $dlcPurchasedValue, 2),
            'base_value' => round((float) $baseWithoutDlcs + (float) $dlcBaseValue, 2),
            'purchased_value' => round((float) $purchasedWithoutDlcs + (float) $dlcPurchasedValue, 2),
            'statuses' => $games
                ->groupBy(fn (LibraryGame $libraryGame) => $libraryGame->status->name)
                ->map(fn (Collection $statusGames, string $statusLabel) => [
                    'label' => $statusLabel,
                    'library_games' => $statusGames->count(),
                    'playtime_hours' => round((float) $statusGames->sum('playtime_hours'), 1),
                ])
                ->sortByDesc('library_games')
                ->values()
                ->all(),
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
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copy_snapshots.ownership_type_id')
            ->join('library_game_snapshots', function ($join) {
                $join->on('library_game_snapshots.snapshot_run_id', '=', 'ownership_copy_snapshots.snapshot_run_id')
                    ->on('library_game_snapshots.library_game_id', '=', 'ownership_copy_snapshots.library_game_id');
            })
            ->where('ownership_copy_snapshots.snapshot_run_id', $snapshot->id)
            ->whereIn('ownership_types.name', self::VALUE_OWNERSHIP_TYPES)
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
            ->where('owned_dlc_snapshots.acquisition_type', 'Owned')
            ->groupBy('library_game_snapshots.platform_id')
            ->selectRaw('library_game_snapshots.platform_id, sum(owned_dlc_snapshots.base_price) as base_value, sum(owned_dlc_snapshots.purchased_price) as purchased_value')
            ->get()
            ->keyBy('platform_id');

        $statusesByPlatform = DB::table('library_game_snapshots')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->groupBy('library_game_snapshots.platform_id', 'statuses.name')
            ->selectRaw('library_game_snapshots.platform_id, statuses.name as label, count(*) as library_games, sum(playtime_hours) as playtime_hours')
            ->get()
            ->groupBy('platform_id');

        return $platforms
            ->map(function ($row) use ($copyValues, $dlcValues, $statusesByPlatform) {
                $copy = $copyValues->get($row->id);
                $dlc = $dlcValues->get($row->id);
                $earnedAchievements = (int) $row->earned_achievements;
                $totalAchievements = (int) $row->total_achievements;
                $copyBase = (float) ($copy?->base_value ?? 0);
                $copyPaid = (float) ($copy?->purchased_value ?? 0);
                $dlcBase = (float) ($dlc?->base_value ?? 0);
                $dlcPaid = (float) ($dlc?->purchased_value ?? 0);

                return [
                    'label' => $row->label,
                    'library_games' => (int) $row->library_games,
                    'completed' => (int) $row->completed,
                    'playtime_hours' => round((float) $row->playtime_hours, 1),
                    'earned_achievements' => $earnedAchievements,
                    'total_achievements' => $totalAchievements,
                    'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
                    'base_value_without_dlcs' => round($copyBase, 2),
                    'purchased_value_without_dlcs' => round($copyPaid, 2),
                    'dlc_base_value' => round($dlcBase, 2),
                    'dlc_purchased_value' => round($dlcPaid, 2),
                    'base_value' => round($copyBase + $dlcBase, 2),
                    'purchased_value' => round($copyPaid + $dlcPaid, 2),
                    'statuses' => ($statusesByPlatform->get($row->id) ?? collect())
                        ->map(fn ($statusRow) => [
                            'label' => $statusRow->label,
                            'library_games' => (int) $statusRow->library_games,
                            'playtime_hours' => round((float) $statusRow->playtime_hours, 1),
                        ])
                        ->sortByDesc('library_games')
                        ->values()
                        ->all(),
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
                'base_value' => in_array($row->label, self::VALUE_OWNERSHIP_TYPES, true) ? round((float) $row->base_value, 2) : 0,
                'purchased_value' => in_array($row->label, self::VALUE_OWNERSHIP_TYPES, true) ? round((float) $row->purchased_value, 2) : 0,
            ])
            ->sortByDesc('ownership_copies')
            ->values()
            ->all();
    }

    private function liveArchive(Collection $libraryGames): array
    {
        $items = $libraryGames->map(fn (LibraryGame $libraryGame) => $this->archiveItemFromLive($libraryGame));

        return [
            'most_played' => $items->sortByDesc('playtime_hours')->take(8)->values()->all(),
            'biggest_base_price' => $items->filter(fn ($item) => $item['base_value'] > 0)->sortByDesc('base_value')->take(8)->values()->all(),
            'biggest_paid_price' => $items->filter(fn ($item) => $item['purchased_value'] > 0)->sortByDesc('purchased_value')->take(8)->values()->all(),
        ];
    }

    private function archiveItemFromLive(LibraryGame $libraryGame): array
    {
        return [
            'library_game_id' => $libraryGame->id,
            'game_id' => $libraryGame->game_id,
            'title' => $libraryGame->game->title,
            'cover_url' => $libraryGame->game->cover_path ? asset('storage/'.$libraryGame->game->cover_path) : $libraryGame->game->cover_url_original,
            'platform' => $libraryGame->platform->name,
            'status' => $libraryGame->status->name,
            'playtime_hours' => (float) $libraryGame->playtime_hours,
            'base_value' => round($this->liveBaseValue($libraryGame), 2),
            'purchased_value' => round($this->livePurchasedValue($libraryGame), 2),
        ];
    }

    private function snapshotArchive(SnapshotRun $snapshot): array
    {
        $rows = DB::table('library_game_snapshots')
            ->join('games', 'games.id', '=', 'library_game_snapshots.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->select([
                'library_game_snapshots.library_game_id',
                'library_game_snapshots.game_id',
                'games.title',
                'games.cover_url_original',
                'games.cover_path',
                'platforms.name as platform',
                'statuses.name as status',
                'library_game_snapshots.playtime_hours',
            ])
            ->get();

        $copyValues = DB::table('ownership_copy_snapshots')
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copy_snapshots.ownership_type_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->whereIn('ownership_types.name', self::VALUE_OWNERSHIP_TYPES)
            ->groupBy('library_game_id')
            ->selectRaw('library_game_id, sum(base_price) as base_value, sum(purchased_price) as purchased_value')
            ->get()
            ->keyBy('library_game_id');

        $dlcValues = DB::table('owned_dlc_snapshots')
            ->where('snapshot_run_id', $snapshot->id)
            ->where('acquisition_type', 'Owned')
            ->groupBy('library_game_id')
            ->selectRaw('library_game_id, sum(base_price) as base_value, sum(purchased_price) as purchased_value')
            ->get()
            ->keyBy('library_game_id');

        $items = $rows->map(function ($row) use ($copyValues, $dlcValues) {
            $copy = $copyValues->get($row->library_game_id);
            $dlc = $dlcValues->get($row->library_game_id);

            return [
                'library_game_id' => (int) $row->library_game_id,
                'game_id' => (int) $row->game_id,
                'title' => $row->title,
                'cover_url' => $row->cover_path ? asset('storage/'.$row->cover_path) : $row->cover_url_original,
                'platform' => $row->platform,
                'status' => $row->status,
                'playtime_hours' => (float) $row->playtime_hours,
                'base_value' => round((float) ($copy?->base_value ?? 0) + (float) ($dlc?->base_value ?? 0), 2),
                'purchased_value' => round((float) ($copy?->purchased_value ?? 0) + (float) ($dlc?->purchased_value ?? 0), 2),
            ];
        });

        return [
            'most_played' => $items->sortByDesc('playtime_hours')->take(8)->values()->all(),
            'biggest_base_price' => $items->filter(fn ($item) => $item['base_value'] > 0)->sortByDesc('base_value')->take(8)->values()->all(),
            'biggest_paid_price' => $items->filter(fn ($item) => $item['purchased_value'] > 0)->sortByDesc('purchased_value')->take(8)->values()->all(),
        ];
    }

    private function liveEligibleCopies(LibraryGame $libraryGame): Collection
    {
        return $libraryGame->ownershipCopies->filter(fn ($copy) => in_array($copy->ownershipType?->name, self::VALUE_OWNERSHIP_TYPES, true));
    }

    private function liveOwnedDlcs(LibraryGame $libraryGame): Collection
    {
        return $libraryGame->ownedDlcs->filter(fn ($ownedDlc) => $ownedDlc->acquisition_type === 'Owned');
    }

    private function liveCopyBaseValue(LibraryGame $libraryGame): float
    {
        return (float) $this->liveEligibleCopies($libraryGame)->sum('base_price');
    }

    private function liveCopyPurchasedValue(LibraryGame $libraryGame): float
    {
        return (float) $this->liveEligibleCopies($libraryGame)->sum('purchased_price');
    }

    private function liveDlcBaseValue(LibraryGame $libraryGame): float
    {
        return (float) $this->liveOwnedDlcs($libraryGame)->sum(fn ($ownedDlc) => $ownedDlc->dlc?->base_price ?? 0);
    }

    private function liveDlcPurchasedValue(LibraryGame $libraryGame): float
    {
        return (float) $this->liveOwnedDlcs($libraryGame)->sum('purchased_price');
    }

    private function liveBaseValue(LibraryGame $libraryGame): float
    {
        return $this->liveCopyBaseValue($libraryGame) + $this->liveDlcBaseValue($libraryGame);
    }

    private function livePurchasedValue(LibraryGame $libraryGame): float
    {
        return $this->liveCopyPurchasedValue($libraryGame) + $this->liveDlcPurchasedValue($libraryGame);
    }

    private function snapshotEligibleCopyValue(SnapshotRun $snapshot, string $column): float
    {
        return (float) DB::table('ownership_copy_snapshots')
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copy_snapshots.ownership_type_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->whereIn('ownership_types.name', self::VALUE_OWNERSHIP_TYPES)
            ->sum($column);
    }

    private function snapshotOwnedDlcValue(SnapshotRun $snapshot, string $column): float
    {
        return (float) DB::table('owned_dlc_snapshots')
            ->where('snapshot_run_id', $snapshot->id)
            ->where('acquisition_type', 'Owned')
            ->sum($column);
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
