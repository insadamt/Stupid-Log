<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StatsService
{
    public function live(User $user): array
    {
        $libraryGames = LibraryGame::query()
            ->where('user_id', $user->id)
            ->with(['game', 'status', 'ownershipCopies', 'ownedDlcs'])
            ->get();

        $baseValue = $libraryGames->sum(fn ($libraryGame) => $libraryGame->ownershipCopies->sum('base_price'))
            + DB::table('owned_dlcs')
                ->join('dlcs', 'dlcs.id', '=', 'owned_dlcs.dlc_id')
                ->join('library_games', 'library_games.id', '=', 'owned_dlcs.library_game_id')
                ->where('library_games.user_id', $user->id)
                ->where('owned_dlcs.acquisition_type', '!=', 'Edition Included')
                ->sum('dlcs.base_price');

        $purchasedValue = $libraryGames->sum(fn ($libraryGame) => $libraryGame->ownershipCopies->sum('purchased_price') + $libraryGame->ownedDlcs->sum('purchased_price'));
        $totalAchievements = $libraryGames->sum(fn ($libraryGame) => $libraryGame->game->total_achievements ?? 0);
        $earnedAchievements = $libraryGames->sum('earned_achievements');

        return [
            'unique_titles' => $libraryGames->pluck('game_id')->unique()->count(),
            'library_games' => $libraryGames->count(),
            'ownership_copies' => $libraryGames->sum(fn ($libraryGame) => $libraryGame->ownershipCopies->count()),
            'completed' => $libraryGames->filter(fn ($libraryGame) => in_array($libraryGame->status->name, ['Completed', '100%'], true))->count(),
            'hundred_percent' => $libraryGames->filter(fn ($libraryGame) => $libraryGame->status->name === '100%')->count(),
            'playtime_hours' => (float) $libraryGames->sum('playtime_hours'),
            'earned_achievements' => $earnedAchievements,
            'total_achievements' => $totalAchievements,
            'achievement_progress' => $totalAchievements > 0 ? round(($earnedAchievements / $totalAchievements) * 100, 1) : 0,
            'base_value' => round((float) $baseValue, 2),
            'purchased_value' => round((float) $purchasedValue, 2),
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

        return [
            'year' => $year,
            'library_games' => DB::table('library_game_snapshots')->where('snapshot_run_id', $snapshot->id)->count(),
            'playtime_hours' => (float) DB::table('library_game_snapshots')->where('snapshot_run_id', $snapshot->id)->sum('playtime_hours'),
            'earned_achievements' => (int) DB::table('library_game_snapshots')->where('snapshot_run_id', $snapshot->id)->sum('earned_achievements'),
            'snapshot_id' => $snapshot->id,
        ];
    }
}
