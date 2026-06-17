<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StatsService
{
    private ?array $platformColors = null;

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

    private const SUMMARY_FLOAT_KEYS = [
        'playtime_hours',
        'achievement_progress',
        'copy_base_value',
        'copy_purchased_value',
        'dlc_base_value',
        'dlc_purchased_value',
        'subscription_allocated_value',
        'subscription_unallocated_value',
        'subscription_total_value',
        'in_app_purchase_allocated_value',
        'in_app_purchase_unallocated_value',
        'in_app_purchase_total_value',
        'in_app_purchase_value',
        'base_value',
        'purchased_value',
    ];

    private const BREAKDOWN_FLOAT_KEYS = [
        'playtime_hours',
        'achievement_progress',
        'copy_base_value',
        'copy_purchased_value',
        'base_value',
        'purchased_value',
        'base_value_without_dlcs',
        'purchased_value_without_dlcs',
        'dlc_base_value',
        'dlc_purchased_value',
        'subscription_allocated_value',
        'subscription_unallocated_value',
        'subscription_total_value',
        'in_app_purchase_allocated_value',
        'in_app_purchase_unallocated_value',
        'in_app_purchase_total_value',
        'in_app_purchase_value',
    ];

    public function __construct(private FinancialValueService $financialValues) {}

    public function live(User $user): array
    {
        $libraryQuery = DB::table('library_games')
            ->join('games', 'games.id', '=', 'library_games.game_id')
            ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
            ->where('library_games.user_id', $user->id);

        $totals = (clone $libraryQuery)
            ->selectRaw('count(*) as library_games')
            ->selectRaw('count(distinct library_games.game_id) as unique_titles')
            ->selectRaw("sum(case when statuses.name in ('Completed', '100%') then 1 else 0 end) as completed")
            ->selectRaw("sum(case when statuses.name = '100%' then 1 else 0 end) as hundred_percent")
            ->selectRaw('sum(library_games.playtime_hours) as playtime_hours')
            ->selectRaw('sum(coalesce(library_games.earned_achievements, 0)) as earned_achievements')
            ->selectRaw('sum(coalesce(games.total_achievements, 0)) as total_achievements')
            ->first();

        $totalAchievements = (int) ($totals?->total_achievements ?? 0);
        $earnedAchievements = (int) ($totals?->earned_achievements ?? 0);
        $copyBaseValue = $this->liveEligibleCopyValue($user, 'base_price');
        $copyPurchasedValue = $this->liveEligibleCopyValue($user, 'purchased_price');
        $dlcBaseValue = $this->liveOwnedDlcValue($user, 'base_price');
        $dlcPurchasedValue = $this->liveOwnedDlcValue($user, 'purchased_price');
        $financialExtras = $this->financialValues->calculateLiveFinancialValuesForUser($user);
        $subscriptionValue = (float) $financialExtras['subscription_total_value'];
        $iapValue = (float) $financialExtras['in_app_purchase_total_value'];

        return [
            'unique_titles' => (int) ($totals?->unique_titles ?? 0),
            'library_games' => (int) ($totals?->library_games ?? 0),
            'ownership_copies' => (int) DB::table('ownership_copies')
                ->join('library_games', 'library_games.id', '=', 'ownership_copies.library_game_id')
                ->where('library_games.user_id', $user->id)
                ->count(),
            'completed' => (int) ($totals?->completed ?? 0),
            'hundred_percent' => (int) ($totals?->hundred_percent ?? 0),
            'playtime_hours' => round((float) ($totals?->playtime_hours ?? 0), 1),
            'earned_achievements' => $earnedAchievements,
            'total_achievements' => $totalAchievements,
            'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
            'copy_base_value' => round($copyBaseValue, 2),
            'copy_purchased_value' => round($copyPurchasedValue, 2),
            'dlc_base_value' => round($dlcBaseValue, 2),
            'dlc_purchased_value' => round($dlcPurchasedValue, 2),
            ...$financialExtras,
            'base_value' => round($copyBaseValue + $dlcBaseValue, 2),
            'purchased_value' => round($copyPurchasedValue + $dlcPurchasedValue + $subscriptionValue + $iapValue, 2),
            'breakdowns' => $this->liveBreakdownsSql($user),
            'archive' => $this->liveArchiveSql($user),
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

    public function snapshotSummary(SnapshotRun $snapshot, bool $refresh = false): array
    {
        if (! $refresh && is_array($snapshot->summary_json)) {
            $summary = $snapshot->summary_json;
            $summary['archive']['playtime_rankings'] = $this->snapshotPlaytimeRankingRows($snapshot);

            return $this->withSnapshotMetadata($summary, $snapshot);
        }

        return $this->refreshSnapshotSummary($snapshot);
    }

    public function refreshSnapshotSummary(SnapshotRun $snapshot): array
    {
        $summary = $this->buildSnapshotSummary($snapshot);
        $snapshot->summary_json = $summary;
        SnapshotRun::withoutTimestamps(fn () => $snapshot->saveQuietly());

        return $summary;
    }

    private function withSnapshotMetadata(array $summary, SnapshotRun $snapshot): array
    {
        return $this->normalizeSnapshotSummaryTypes([
            ...$summary,
            'snapshot_id' => $snapshot->id,
            'year' => $snapshot->year,
            'status' => $snapshot->status,
            'created_at' => $snapshot->created_at?->toIso8601String(),
            'confirmed_at' => $snapshot->confirmed_at?->toIso8601String(),
        ]);
    }

    private function normalizeSnapshotSummaryTypes(array $summary): array
    {
        $summary = $this->castFloatKeys($summary, self::SUMMARY_FLOAT_KEYS);
        $platformColors = $this->platformColors();

        $summary['breakdowns']['platforms'] = collect($summary['breakdowns']['platforms'] ?? [])
            ->map(function (array $platform) use ($platformColors) {
                $platform = $this->castFloatKeys($platform, self::BREAKDOWN_FLOAT_KEYS);
                $platformId = $platform['platform_id'] ?? null;
                $savedColors = ($platformId !== null ? $platformColors['by_id'][$platformId] ?? null : null)
                    ?? $platformColors['by_name'][$platform['label'] ?? '']
                    ?? null;
                $platform['color_key'] ??= $savedColors['color_key'] ?? null;
                $platform['color_hex'] ??= $savedColors['color_hex'] ?? null;
                $platform['statuses'] = collect($platform['statuses'] ?? [])
                    ->map(fn (array $status) => $this->castFloatKeys($status, ['playtime_hours']))
                    ->values()
                    ->all();

                return $platform;
            })
            ->values()
            ->all();

        $summary['breakdowns']['statuses'] = collect($summary['breakdowns']['statuses'] ?? [])
            ->map(fn (array $status) => $this->castFloatKeys($status, ['playtime_hours']))
            ->values()
            ->all();

        $summary['breakdowns']['ownership_types'] = collect($summary['breakdowns']['ownership_types'] ?? [])
            ->map(fn (array $ownership) => $this->castFloatKeys($ownership, [
                'copy_base_value',
                'copy_purchased_value',
                'subscription_allocated_value',
                'subscription_unallocated_value',
                'subscription_total_value',
                'base_value',
                'purchased_value',
            ]))
            ->values()
            ->all();

        foreach (['most_played', 'biggest_base_price', 'biggest_paid_price'] as $archiveKey) {
            $summary['archive'][$archiveKey] = collect($summary['archive'][$archiveKey] ?? [])
                ->map(fn (array $item) => $this->castFloatKeys($item, [
                    'playtime_hours',
                    'copy_purchased_value',
                    'dlc_purchased_value',
                    'subscription_allocated_value',
                    'in_app_purchase_allocated_value',
                    'in_app_purchase_value',
                    'base_value',
                    'purchased_value',
                ]))
                ->values()
                ->all();
        }

        $summary['best_games'] = collect($summary['best_games'] ?? [])
            ->map(fn (array $item) => $this->castFloatKeys($item, ['playtime_hours']))
            ->values()
            ->all();

        $summary['archive']['unallocated_financial'] = $this->castFloatKeys(
            $summary['archive']['unallocated_financial'] ?? [],
            [
                'subscription_unallocated_value',
                'in_app_purchase_unallocated_value',
                'total_unallocated_value',
            ],
        );

        $summary['growth'] = $summary['growth'] ?? [];

        return $summary;
    }

    private function platformColors(): array
    {
        if ($this->platformColors !== null) {
            return $this->platformColors;
        }

        $platforms = DB::table('platforms')
            ->get(['id', 'name', 'color_key', 'color_hex'])
            ->map(fn ($platform) => [
                'id' => (int) $platform->id,
                'name' => $platform->name,
                'color_key' => $platform->color_key,
                'color_hex' => $platform->color_hex,
            ]);

        return $this->platformColors = [
            'by_id' => $platforms->keyBy('id')->all(),
            'by_name' => $platforms->keyBy('name')->all(),
        ];
    }

    private function castFloatKeys(array $item, array $keys): array
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $item)) {
                $item[$key] = (float) $item[$key];
            }
        }

        return $item;
    }

    private function buildSnapshotSummary(SnapshotRun $snapshot): array
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
        $financialExtras = $this->financialValues->calculateSnapshotFinancialValuesForRun($snapshot);
        $subscriptionValue = (float) $financialExtras['subscription_total_value'];
        $iapValue = (float) $financialExtras['in_app_purchase_total_value'];

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
            'copy_base_value' => round($copyBaseValue, 2),
            'copy_purchased_value' => round($copyPurchasedValue, 2),
            'dlc_base_value' => round($dlcBaseValue, 2),
            'dlc_purchased_value' => round($dlcPurchasedValue, 2),
            ...$financialExtras,
            'base_value' => round($copyBaseValue + $dlcBaseValue, 2),
            'purchased_value' => round($copyPurchasedValue + $dlcPurchasedValue + $subscriptionValue + $iapValue, 2),
            'breakdowns' => $this->snapshotBreakdowns($snapshot),
            'archive' => $this->snapshotArchive($snapshot),
            'best_games' => $this->snapshotBestGames($snapshot),
            'growth' => [],
        ];
    }

    public function snapshotRows(SnapshotRun $snapshot, ?Request $request = null): array
    {
        $limit = $this->boundedLimit($request, 80, 200);
        $offset = $this->decodeOffsetCursor($request?->string('cursor')->toString());
        $query = trim((string) $request?->string('query')->toString());
        $status = (string) $request?->string('status')->toString();
        $platform = (string) $request?->string('platform')->toString();

        $builder = DB::table('library_game_snapshots')
            ->join('games', 'games.id', '=', 'library_game_snapshots.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id);

        if ($query !== '') {
            $builder->where(function ($scope) use ($query) {
                $scope->where('games.title', 'like', "%{$query}%")
                    ->orWhere('platforms.name', 'like', "%{$query}%")
                    ->orWhere('statuses.name', 'like', "%{$query}%");
            });
        }

        if ($status !== '' && strcasecmp($status, 'All') !== 0) {
            $builder->where('statuses.name', $status);
        }

        if ($platform !== '' && strcasecmp($platform, 'All') !== 0) {
            $builder->where('platforms.name', $platform);
        }

        $rows = $builder
            ->orderBy('games.title')
            ->orderBy('library_game_snapshots.library_game_id')
            ->skip($offset)
            ->take($limit + 1)
            ->select([
            'library_game_snapshots.library_game_id',
            'games.title',
            'platforms.name as platform',
            'statuses.name as status',
            'statuses.color_key as status_color_key',
            'statuses.color_hex as status_color_hex',
            'library_game_snapshots.playtime_hours',
            'library_game_snapshots.earned_achievements',
            'library_game_snapshots.total_achievements',
        ])
            ->get();

        return [
            'items' => $rows->take($limit)->map(fn ($row) => [
                'library_game_id' => $row->library_game_id,
                'title' => $row->title,
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
            'next_cursor' => $rows->count() > $limit ? $this->encodeOffsetCursor($offset + $limit) : null,
            'has_more' => $rows->count() > $limit,
        ];
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
                'statuses.color_key as status_color_key',
                'statuses.color_hex as status_color_hex',
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
                'status_color_key' => $row->status_color_key,
                'status_color_hex' => $row->status_color_hex,
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
                ->map(fn (Collection $games, string $label) => $this->statusBreakdownFromLive($label, $games))
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
                ->map(fn (Collection $statusGames, string $statusLabel) => $this->statusBreakdownFromLive($statusLabel, $statusGames))
                ->sortByDesc('library_games')
                ->values()
            ->all(),
        ];
    }

    private function statusBreakdownFromLive(string $label, Collection $games): array
    {
        $status = $games->first()?->status;

        return [
            'label' => $label,
            'color_key' => $status?->color_key,
            'color_hex' => $status?->color_hex,
            'library_games' => $games->count(),
            'playtime_hours' => round((float) $games->sum('playtime_hours'), 1),
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

    private function liveBreakdownsSql(User $user): array
    {
        return [
            'platforms' => $this->livePlatformBreakdownsSql($user),
            'statuses' => $this->liveStatusBreakdownsSql($user),
            'ownership_types' => $this->liveOwnershipBreakdownsSql($user),
        ];
    }

    private function livePlatformBreakdownsSql(User $user): array
    {
        $financialByPlatform = $this->financialValues->calculateLiveFinancialValuesByPlatform($user);
        $platforms = DB::table('library_games')
            ->join('games', 'games.id', '=', 'library_games.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_games.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
            ->where('library_games.user_id', $user->id)
            ->groupBy('platforms.id', 'platforms.name', 'platforms.color_key', 'platforms.color_hex')
            ->selectRaw('platforms.id, platforms.name as label, platforms.color_key, platforms.color_hex, count(*) as library_games, sum(library_games.playtime_hours) as playtime_hours, sum(coalesce(library_games.earned_achievements, 0)) as earned_achievements, sum(coalesce(games.total_achievements, 0)) as total_achievements')
            ->selectRaw("sum(case when statuses.name in ('Completed', '100%') then 1 else 0 end) as completed")
            ->get()
            ->keyBy('id');

        $copyValues = DB::table('ownership_copies')
            ->join('library_games', 'library_games.id', '=', 'ownership_copies.library_game_id')
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copies.ownership_type_id')
            ->where('library_games.user_id', $user->id)
            ->whereIn('ownership_types.name', self::VALUE_OWNERSHIP_TYPES)
            ->groupBy('library_games.platform_id')
            ->selectRaw('library_games.platform_id, sum(ownership_copies.base_price) as base_value, sum(ownership_copies.purchased_price) as purchased_value')
            ->get()
            ->keyBy('platform_id');

        $dlcValues = DB::table('owned_dlcs')
            ->join('library_games', 'library_games.id', '=', 'owned_dlcs.library_game_id')
            ->join('dlcs', 'dlcs.id', '=', 'owned_dlcs.dlc_id')
            ->where('library_games.user_id', $user->id)
            ->where('owned_dlcs.acquisition_type', 'Owned')
            ->groupBy('library_games.platform_id')
            ->selectRaw('library_games.platform_id, sum(dlcs.base_price) as base_value, sum(owned_dlcs.purchased_price) as purchased_value')
            ->get()
            ->keyBy('platform_id');

        $statusesByPlatform = DB::table('library_games')
            ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
            ->where('library_games.user_id', $user->id)
            ->groupBy('library_games.platform_id', 'statuses.name', 'statuses.color_key', 'statuses.color_hex')
            ->selectRaw('library_games.platform_id, statuses.name as label, statuses.color_key, statuses.color_hex, count(*) as library_games, sum(library_games.playtime_hours) as playtime_hours')
            ->get()
            ->groupBy('platform_id');

        $breakdowns = $platforms
            ->map(function ($row) use ($copyValues, $dlcValues, $statusesByPlatform, $financialByPlatform) {
                $copy = $copyValues->get($row->id);
                $dlc = $dlcValues->get($row->id);
                $financial = $financialByPlatform[$row->id] ?? $this->emptyFinancialComponents();
                $earnedAchievements = (int) $row->earned_achievements;
                $totalAchievements = (int) $row->total_achievements;
                $copyBase = (float) ($copy?->base_value ?? 0);
                $copyPaid = (float) ($copy?->purchased_value ?? 0);
                $dlcBase = (float) ($dlc?->base_value ?? 0);
                $dlcPaid = (float) ($dlc?->purchased_value ?? 0);
                return [
                    'platform_id' => (int) $row->id,
                    'label' => $row->label,
                    'color_key' => $row->color_key,
                    'color_hex' => $row->color_hex,
                    'library_games' => (int) $row->library_games,
                    'completed' => (int) $row->completed,
                    'playtime_hours' => round((float) $row->playtime_hours, 1),
                    'earned_achievements' => $earnedAchievements,
                    'total_achievements' => $totalAchievements,
                    'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
                    'base_value_without_dlcs' => round($copyBase, 2),
                    'purchased_value_without_dlcs' => round($copyPaid, 2),
                    'copy_base_value' => round($copyBase, 2),
                    'copy_purchased_value' => round($copyPaid, 2),
                    'dlc_base_value' => round($dlcBase, 2),
                    'dlc_purchased_value' => round($dlcPaid, 2),
                    ...$financial,
                    'base_value' => round($copyBase + $dlcBase, 2),
                    'purchased_value' => round(
                        $copyPaid
                        + $dlcPaid
                        + (float) $financial['subscription_total_value']
                        + (float) $financial['in_app_purchase_total_value'],
                        2,
                    ),
                    'statuses' => ($statusesByPlatform->get($row->id) ?? collect())
                        ->map(fn ($statusRow) => [
                            'label' => $statusRow->label,
                            'color_key' => $statusRow->color_key,
                            'color_hex' => $statusRow->color_hex,
                            'library_games' => (int) $statusRow->library_games,
                            'playtime_hours' => round((float) $statusRow->playtime_hours, 1),
                        ])
                        ->sortByDesc('library_games')
                        ->values()
                        ->all(),
                ];
            })
            ->sortByDesc('library_games')
            ->values();

        return $this->appendUnallocatedFinancialPlatform(
            $breakdowns,
            $financialByPlatform[$this->financialValues->unallocatedPlatformKey()] ?? null,
        );
    }

    private function liveStatusBreakdownsSql(User $user): array
    {
        return DB::table('library_games')
            ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
            ->where('library_games.user_id', $user->id)
            ->groupBy('statuses.name', 'statuses.color_key', 'statuses.color_hex')
            ->selectRaw('statuses.name as label, statuses.color_key, statuses.color_hex, count(*) as library_games, sum(library_games.playtime_hours) as playtime_hours')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'color_key' => $row->color_key,
                'color_hex' => $row->color_hex,
                'library_games' => (int) $row->library_games,
                'playtime_hours' => round((float) $row->playtime_hours, 1),
            ])
            ->sortByDesc('library_games')
            ->values()
            ->all();
    }

    private function liveOwnershipBreakdownsSql(User $user): array
    {
        $financialByOwnershipType = $this->financialValues->calculateLiveFinancialValuesByOwnershipType($user);

        $breakdowns = DB::table('ownership_copies')
            ->join('library_games', 'library_games.id', '=', 'ownership_copies.library_game_id')
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copies.ownership_type_id')
            ->where('library_games.user_id', $user->id)
            ->groupBy('ownership_types.name')
            ->selectRaw('ownership_types.name as label, count(*) as ownership_copies, sum(ownership_copies.base_price) as base_value, sum(ownership_copies.purchased_price) as purchased_value')
            ->get()
            ->mapWithKeys(function ($row) use ($financialByOwnershipType) {
                $copyBase = in_array($row->label, self::VALUE_OWNERSHIP_TYPES, true) ? (float) $row->base_value : 0.0;
                $copyPaid = in_array($row->label, self::VALUE_OWNERSHIP_TYPES, true) ? (float) $row->purchased_value : 0.0;
                $financial = $financialByOwnershipType[$row->label] ?? $this->emptySubscriptionComponents();

                return [$row->label => [
                    'label' => $row->label,
                    'ownership_copies' => (int) $row->ownership_copies,
                    'copy_base_value' => round($copyBase, 2),
                    'copy_purchased_value' => round($copyPaid, 2),
                    ...$financial,
                    'base_value' => round($copyBase, 2),
                    'purchased_value' => round($copyPaid + (float) $financial['subscription_total_value'], 2),
                ]];
            });

        foreach ($financialByOwnershipType as $label => $financial) {
            if ($breakdowns->has($label)) {
                continue;
            }

            $breakdowns->put($label, [
                'label' => $label,
                'ownership_copies' => 0,
                'copy_base_value' => 0.0,
                'copy_purchased_value' => 0.0,
                ...$financial,
                'base_value' => 0.0,
                'purchased_value' => round((float) $financial['subscription_total_value'], 2),
            ]);
        }

        return $breakdowns
            ->sortByDesc('ownership_copies')
            ->values()
            ->all();
    }

    private function snapshotPlatformBreakdowns(SnapshotRun $snapshot): array
    {
        $financialByPlatform = $this->financialValues->calculateSnapshotFinancialValuesByPlatform($snapshot);
        $platforms = DB::table('library_game_snapshots')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->groupBy('platforms.id', 'platforms.name', 'platforms.color_key', 'platforms.color_hex')
            ->selectRaw('platforms.id, platforms.name as label, platforms.color_key, platforms.color_hex, count(*) as library_games, sum(playtime_hours) as playtime_hours, sum(earned_achievements) as earned_achievements, sum(total_achievements) as total_achievements')
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
            ->groupBy('library_game_snapshots.platform_id', 'statuses.name', 'statuses.color_key', 'statuses.color_hex')
            ->selectRaw('library_game_snapshots.platform_id, statuses.name as label, statuses.color_key, statuses.color_hex, count(*) as library_games, sum(playtime_hours) as playtime_hours')
            ->get()
            ->groupBy('platform_id');

        $breakdowns = $platforms
            ->map(function ($row) use ($copyValues, $dlcValues, $statusesByPlatform, $financialByPlatform) {
                $copy = $copyValues->get($row->id);
                $dlc = $dlcValues->get($row->id);
                $financial = $financialByPlatform[$row->id] ?? $this->emptyFinancialComponents();
                $earnedAchievements = (int) $row->earned_achievements;
                $totalAchievements = (int) $row->total_achievements;
                $copyBase = (float) ($copy?->base_value ?? 0);
                $copyPaid = (float) ($copy?->purchased_value ?? 0);
                $dlcBase = (float) ($dlc?->base_value ?? 0);
                $dlcPaid = (float) ($dlc?->purchased_value ?? 0);
                return [
                    'platform_id' => (int) $row->id,
                    'label' => $row->label,
                    'color_key' => $row->color_key,
                    'color_hex' => $row->color_hex,
                    'library_games' => (int) $row->library_games,
                    'completed' => (int) $row->completed,
                    'playtime_hours' => round((float) $row->playtime_hours, 1),
                    'earned_achievements' => $earnedAchievements,
                    'total_achievements' => $totalAchievements,
                    'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
                    'base_value_without_dlcs' => round($copyBase, 2),
                    'purchased_value_without_dlcs' => round($copyPaid, 2),
                    'copy_base_value' => round($copyBase, 2),
                    'copy_purchased_value' => round($copyPaid, 2),
                    'dlc_base_value' => round($dlcBase, 2),
                    'dlc_purchased_value' => round($dlcPaid, 2),
                    ...$financial,
                    'base_value' => round($copyBase + $dlcBase, 2),
                    'purchased_value' => round(
                        $copyPaid
                        + $dlcPaid
                        + (float) $financial['subscription_total_value']
                        + (float) $financial['in_app_purchase_total_value'],
                        2,
                    ),
                    'statuses' => ($statusesByPlatform->get($row->id) ?? collect())
                        ->map(fn ($statusRow) => [
                            'label' => $statusRow->label,
                            'color_key' => $statusRow->color_key,
                            'color_hex' => $statusRow->color_hex,
                            'library_games' => (int) $statusRow->library_games,
                            'playtime_hours' => round((float) $statusRow->playtime_hours, 1),
                        ])
                        ->sortByDesc('library_games')
                        ->values()
                        ->all(),
                ];
            })
            ->sortByDesc('library_games')
            ->values();

        return $this->appendUnallocatedFinancialPlatform(
            $breakdowns,
            $financialByPlatform[$this->financialValues->unallocatedPlatformKey()] ?? null,
        );
    }

    private function snapshotStatusBreakdowns(SnapshotRun $snapshot): array
    {
        return DB::table('library_game_snapshots')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->groupBy('statuses.name', 'statuses.color_key', 'statuses.color_hex')
            ->selectRaw('statuses.name as label, statuses.color_key, statuses.color_hex, count(*) as library_games, sum(playtime_hours) as playtime_hours')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'color_key' => $row->color_key,
                'color_hex' => $row->color_hex,
                'library_games' => (int) $row->library_games,
                'playtime_hours' => round((float) $row->playtime_hours, 1),
            ])
            ->sortByDesc('library_games')
            ->values()
            ->all();
    }

    private function snapshotOwnershipBreakdowns(SnapshotRun $snapshot): array
    {
        $financialByOwnershipType = $this->financialValues->calculateSnapshotFinancialValuesByOwnershipType($snapshot);

        $breakdowns = DB::table('ownership_copy_snapshots')
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copy_snapshots.ownership_type_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->groupBy('ownership_types.name')
            ->selectRaw('ownership_types.name as label, count(*) as ownership_copies, sum(base_price) as base_value, sum(purchased_price) as purchased_value')
            ->get()
            ->mapWithKeys(function ($row) use ($financialByOwnershipType) {
                $copyBase = in_array($row->label, self::VALUE_OWNERSHIP_TYPES, true) ? (float) $row->base_value : 0.0;
                $copyPaid = in_array($row->label, self::VALUE_OWNERSHIP_TYPES, true) ? (float) $row->purchased_value : 0.0;
                $financial = $financialByOwnershipType[$row->label] ?? $this->emptySubscriptionComponents();

                return [$row->label => [
                    'label' => $row->label,
                    'ownership_copies' => (int) $row->ownership_copies,
                    'copy_base_value' => round($copyBase, 2),
                    'copy_purchased_value' => round($copyPaid, 2),
                    ...$financial,
                    'base_value' => round($copyBase, 2),
                    'purchased_value' => round($copyPaid + (float) $financial['subscription_total_value'], 2),
                ]];
            });

        foreach ($financialByOwnershipType as $label => $financial) {
            if ($breakdowns->has($label)) {
                continue;
            }

            $breakdowns->put($label, [
                'label' => $label,
                'ownership_copies' => 0,
                'copy_base_value' => 0,
                'copy_purchased_value' => 0,
                ...$financial,
                'base_value' => 0,
                'purchased_value' => round((float) $financial['subscription_total_value'], 2),
            ]);
        }

        return $breakdowns
            ->sortByDesc('ownership_copies')
            ->values()
            ->all();
    }

    private function liveArchive(Collection $libraryGames): array
    {
        $items = $libraryGames->map(fn (LibraryGame $libraryGame) => $this->archiveItemFromLive($libraryGame));
        $playtimeRankings = $items->sortByDesc('playtime_hours')->values();

        return [
            'most_played' => $playtimeRankings->take(8)->all(),
            'playtime_rankings' => $playtimeRankings->all(),
            'biggest_base_price' => $items->filter(fn ($item) => $item['base_value'] > 0)->sortByDesc('base_value')->take(8)->values()->all(),
            'biggest_paid_price' => $items->filter(fn ($item) => $item['purchased_value'] > 0)->sortByDesc('purchased_value')->take(8)->values()->all(),
        ];
    }

    private function liveArchiveSql(User $user): array
    {
        $totals = $this->financialValues->calculateLiveFinancialValuesForUser($user);
        $playtimeRankings = $this->liveArchiveRows($user, 'library_games.playtime_hours', false, null);

        return [
            'most_played' => array_slice($playtimeRankings, 0, 8),
            'playtime_rankings' => $playtimeRankings,
            'biggest_base_price' => $this->liveArchiveRows($user, 'base_value', true),
            'biggest_paid_price' => $this->liveArchiveRows($user, 'purchased_value', true),
            'unallocated_financial' => $this->unallocatedArchiveSummary($totals),
        ];
    }

    private function liveArchiveRows(User $user, string $sortColumn, bool $positiveOnly, ?int $limit = 8): array
    {
        $copyValues = DB::table('ownership_copies')
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copies.ownership_type_id')
            ->whereIn('ownership_types.name', self::VALUE_OWNERSHIP_TYPES)
            ->groupBy('ownership_copies.library_game_id')
            ->selectRaw('ownership_copies.library_game_id, sum(ownership_copies.base_price) as base_value, sum(ownership_copies.purchased_price) as purchased_value');

        $dlcValues = DB::table('owned_dlcs')
            ->join('dlcs', 'dlcs.id', '=', 'owned_dlcs.dlc_id')
            ->where('owned_dlcs.acquisition_type', 'Owned')
            ->groupBy('owned_dlcs.library_game_id')
            ->selectRaw('owned_dlcs.library_game_id, sum(dlcs.base_price) as base_value, sum(owned_dlcs.purchased_price) as purchased_value');

        $subscriptionValues = DB::table('subscription_entry_year_ownership_copies')
            ->join('subscription_entry_years', 'subscription_entry_years.id', '=', 'subscription_entry_year_ownership_copies.subscription_entry_year_id')
            ->join('subscription_entries', 'subscription_entries.id', '=', 'subscription_entry_years.subscription_entry_id')
            ->join('ownership_copies', 'ownership_copies.id', '=', 'subscription_entry_year_ownership_copies.ownership_copy_id')
            ->where('subscription_entries.user_id', $user->id)
            ->groupBy('ownership_copies.library_game_id')
            ->selectRaw('ownership_copies.library_game_id, sum(subscription_entry_year_ownership_copies.allocated_amount) as allocated_value');

        $iapValues = DB::table('in_app_purchases')
            ->join('library_games', 'library_games.id', '=', 'in_app_purchases.library_game_id')
            ->where('library_games.user_id', $user->id)
            ->groupBy('in_app_purchases.library_game_id')
            ->selectRaw('in_app_purchases.library_game_id, sum(in_app_purchases.amount_paid) as allocated_value');

        $baseValueSql = '(coalesce(copy_values.base_value, 0) + coalesce(dlc_values.base_value, 0))';
        $purchasedValueSql = '(coalesce(copy_values.purchased_value, 0) + coalesce(dlc_values.purchased_value, 0) + coalesce(subscription_values.allocated_value, 0) + coalesce(iap_values.allocated_value, 0))';

        $builder = DB::table('library_games')
            ->join('games', 'games.id', '=', 'library_games.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_games.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
            ->leftJoinSub($copyValues, 'copy_values', fn ($join) => $join->on('copy_values.library_game_id', '=', 'library_games.id'))
            ->leftJoinSub($dlcValues, 'dlc_values', fn ($join) => $join->on('dlc_values.library_game_id', '=', 'library_games.id'))
            ->leftJoinSub($subscriptionValues, 'subscription_values', fn ($join) => $join->on('subscription_values.library_game_id', '=', 'library_games.id'))
            ->leftJoinSub($iapValues, 'iap_values', fn ($join) => $join->on('iap_values.library_game_id', '=', 'library_games.id'))
            ->where('library_games.user_id', $user->id)
            ->select([
                'library_games.id as library_game_id',
                'library_games.game_id',
                'games.title',
                'games.cover_url_original',
                'games.cover_path',
                'platforms.name as platform',
                'statuses.name as status',
                'statuses.color_key as status_color_key',
                'statuses.color_hex as status_color_hex',
                'library_games.playtime_hours',
            ])
            ->selectRaw('coalesce(copy_values.base_value, 0) as copy_base_value')
            ->selectRaw('coalesce(copy_values.purchased_value, 0) as copy_purchased_value')
            ->selectRaw('coalesce(dlc_values.base_value, 0) as dlc_base_value')
            ->selectRaw('coalesce(dlc_values.purchased_value, 0) as dlc_purchased_value')
            ->selectRaw('coalesce(subscription_values.allocated_value, 0) as subscription_allocated_value')
            ->selectRaw('coalesce(iap_values.allocated_value, 0) as in_app_purchase_allocated_value')
            ->selectRaw("{$baseValueSql} as base_value")
            ->selectRaw("{$purchasedValueSql} as purchased_value");

        if ($positiveOnly) {
            $valueSql = $sortColumn === 'base_value' ? $baseValueSql : $purchasedValueSql;
            $builder->whereRaw("{$valueSql} > 0");
        }

        $builder
            ->orderByDesc($sortColumn)
            ->orderBy('library_games.id');

        if ($limit !== null) {
            $builder->limit($limit);
        }

        return $builder
            ->get()
            ->map(function ($row) {
                $copyBase = (float) $row->copy_base_value;
                $copyPaid = (float) $row->copy_purchased_value;
                $dlcBase = (float) $row->dlc_base_value;
                $dlcPaid = (float) $row->dlc_purchased_value;

                return [
                    'library_game_id' => (int) $row->library_game_id,
                    'game_id' => (int) $row->game_id,
                    'title' => $row->title,
                    'cover_url' => $row->cover_path ? asset('storage/'.$row->cover_path) : $row->cover_url_original,
                    'platform' => $row->platform,
                    'status' => $row->status,
                    'status_color_key' => $row->status_color_key,
                    'status_color_hex' => $row->status_color_hex,
                    'playtime_hours' => (float) $row->playtime_hours,
                    'copy_purchased_value' => round($copyPaid, 2),
                    'dlc_purchased_value' => round($dlcPaid, 2),
                    'subscription_allocated_value' => (float) $row->subscription_allocated_value,
                    'in_app_purchase_allocated_value' => (float) $row->in_app_purchase_allocated_value,
                    'in_app_purchase_value' => (float) $row->in_app_purchase_allocated_value,
                    'base_value' => round((float) $row->base_value, 2),
                    'purchased_value' => round((float) $row->purchased_value, 2),
                ];
            })
            ->values()
            ->all();
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
            'status_color_key' => $libraryGame->status->color_key,
            'status_color_hex' => $libraryGame->status->color_hex,
            'playtime_hours' => (float) $libraryGame->playtime_hours,
            'base_value' => round($this->liveBaseValue($libraryGame), 2),
            'purchased_value' => round($this->livePurchasedValue($libraryGame), 2),
        ];
    }

    private function snapshotArchive(SnapshotRun $snapshot): array
    {
        $financialByGame = $this->financialValues->calculateSnapshotFinancialValuesByLibraryGame($snapshot);
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
                'statuses.color_key as status_color_key',
                'statuses.color_hex as status_color_hex',
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

        $items = $rows->map(function ($row) use ($copyValues, $dlcValues, $financialByGame) {
            $copy = $copyValues->get($row->library_game_id);
            $dlc = $dlcValues->get($row->library_game_id);
            $financial = $financialByGame[$row->library_game_id] ?? $this->emptyFinancialComponents();
            $copyBase = (float) ($copy?->base_value ?? 0);
            $copyPaid = (float) ($copy?->purchased_value ?? 0);
            $dlcBase = (float) ($dlc?->base_value ?? 0);
            $dlcPaid = (float) ($dlc?->purchased_value ?? 0);
            return [
                'library_game_id' => (int) $row->library_game_id,
                'game_id' => (int) $row->game_id,
                'title' => $row->title,
                'cover_url' => $row->cover_path ? asset('storage/'.$row->cover_path) : $row->cover_url_original,
                'platform' => $row->platform,
                'status' => $row->status,
                'status_color_key' => $row->status_color_key,
                'status_color_hex' => $row->status_color_hex,
                'playtime_hours' => (float) $row->playtime_hours,
                'copy_purchased_value' => round($copyPaid, 2),
                'dlc_purchased_value' => round($dlcPaid, 2),
                'subscription_allocated_value' => (float) $financial['subscription_allocated_value'],
                'in_app_purchase_allocated_value' => (float) $financial['in_app_purchase_allocated_value'],
                'in_app_purchase_value' => (float) $financial['in_app_purchase_allocated_value'],
                'base_value' => round($copyBase + $dlcBase, 2),
                'purchased_value' => round(
                    $copyPaid
                    + $dlcPaid
                    + (float) $financial['subscription_allocated_value']
                    + (float) $financial['in_app_purchase_allocated_value'],
                    2,
                ),
            ];
        });

        $totals = $this->financialValues->calculateSnapshotFinancialValuesForRun($snapshot);

        $playtimeRankings = $items->sortByDesc('playtime_hours')->values();

        return [
            'most_played' => $playtimeRankings->take(8)->all(),
            'playtime_rankings' => $playtimeRankings->all(),
            'biggest_base_price' => $items->filter(fn ($item) => $item['base_value'] > 0)->sortByDesc('base_value')->take(8)->values()->all(),
            'biggest_paid_price' => $items->filter(fn ($item) => $item['purchased_value'] > 0)->sortByDesc('purchased_value')->take(8)->values()->all(),
            'unallocated_financial' => $this->unallocatedArchiveSummary($totals),
        ];
    }

    private function snapshotPlaytimeRankingRows(SnapshotRun $snapshot): array
    {
        return DB::table('library_game_snapshots')
            ->join('games', 'games.id', '=', 'library_game_snapshots.game_id')
            ->join('platforms', 'platforms.id', '=', 'library_game_snapshots.platform_id')
            ->join('statuses', 'statuses.id', '=', 'library_game_snapshots.status_id')
            ->where('snapshot_run_id', $snapshot->id)
            ->orderByDesc('library_game_snapshots.playtime_hours')
            ->orderBy('library_game_snapshots.library_game_id')
            ->get([
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
            ])
            ->map(fn ($row) => [
                'library_game_id' => (int) $row->library_game_id,
                'game_id' => (int) $row->game_id,
                'title' => $row->title,
                'cover_url' => $row->cover_path ? asset('storage/'.$row->cover_path) : $row->cover_url_original,
                'platform' => $row->platform,
                'status' => $row->status,
                'status_color_key' => $row->status_color_key,
                'status_color_hex' => $row->status_color_hex,
                'playtime_hours' => (float) $row->playtime_hours,
                'base_value' => 0.0,
                'purchased_value' => 0.0,
            ])
            ->all();
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

    private function liveEligibleCopyValue(User $user, string $column): float
    {
        return (float) DB::table('ownership_copies')
            ->join('library_games', 'library_games.id', '=', 'ownership_copies.library_game_id')
            ->join('ownership_types', 'ownership_types.id', '=', 'ownership_copies.ownership_type_id')
            ->where('library_games.user_id', $user->id)
            ->whereIn('ownership_types.name', self::VALUE_OWNERSHIP_TYPES)
            ->sum("ownership_copies.{$column}");
    }

    private function liveOwnedDlcValue(User $user, string $column): float
    {
        $valueColumn = $column === 'base_price' ? 'dlcs.base_price' : 'owned_dlcs.purchased_price';

        return (float) DB::table('owned_dlcs')
            ->join('library_games', 'library_games.id', '=', 'owned_dlcs.library_game_id')
            ->join('dlcs', 'dlcs.id', '=', 'owned_dlcs.dlc_id')
            ->where('library_games.user_id', $user->id)
            ->where('owned_dlcs.acquisition_type', 'Owned')
            ->sum($valueColumn);
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

    private function appendUnallocatedFinancialPlatform(Collection $breakdowns, ?array $financial): array
    {
        if (! $financial) {
            return $breakdowns->all();
        }

        $subscriptionTotal = (float) $financial['subscription_total_value'];
        $iapTotal = (float) $financial['in_app_purchase_total_value'];

        $breakdowns->push([
            'platform_id' => null,
            'label' => 'Unallocated financial',
            'library_games' => 0,
            'completed' => 0,
            'playtime_hours' => 0.0,
            'earned_achievements' => 0,
            'total_achievements' => 0,
            'achievement_progress' => 0.0,
            'base_value_without_dlcs' => 0.0,
            'purchased_value_without_dlcs' => round($subscriptionTotal + $iapTotal, 2),
            'copy_base_value' => 0.0,
            'copy_purchased_value' => 0.0,
            'dlc_base_value' => 0.0,
            'dlc_purchased_value' => 0.0,
            ...$financial,
            'base_value' => 0.0,
            'purchased_value' => round($subscriptionTotal + $iapTotal, 2),
            'statuses' => [],
        ]);

        return $breakdowns->values()->all();
    }

    private function unallocatedArchiveSummary(array $totals): array
    {
        $subscription = (float) $totals['subscription_unallocated_value'];
        $iap = (float) $totals['in_app_purchase_unallocated_value'];

        return [
            'subscription_unallocated_value' => $subscription,
            'in_app_purchase_unallocated_value' => $iap,
            'total_unallocated_value' => round($subscription + $iap, 2),
        ];
    }

    private function emptyFinancialComponents(): array
    {
        return [
            'subscription_allocated_value' => 0.0,
            'subscription_unallocated_value' => 0.0,
            'subscription_total_value' => 0.0,
            'in_app_purchase_allocated_value' => 0.0,
            'in_app_purchase_unallocated_value' => 0.0,
            'in_app_purchase_total_value' => 0.0,
            'in_app_purchase_value' => 0.0,
        ];
    }

    private function emptySubscriptionComponents(): array
    {
        return [
            'subscription_allocated_value' => 0.0,
            'subscription_unallocated_value' => 0.0,
            'subscription_total_value' => 0.0,
        ];
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
                $delta = round((float) $current[$key] - (float) $previous[$key], $this->growthDeltaPrecision($key));
                $base = (float) $previous[$key];

                return [$key => [
                    'delta' => $delta,
                    'percentage' => $base > 0 ? round(($delta / $base) * 100, 1) : null,
                ]];
            })
            ->all();
    }

    private function growthDeltaPrecision(string $key): int
    {
        if (str_contains($key, 'value')) {
            return 2;
        }

        return in_array($key, ['playtime_hours', 'achievement_progress'], true) ? 1 : 0;
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
