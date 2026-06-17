<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\LibraryGame;
use App\Models\User;
use App\Services\LibraryGameListService;
use App\Services\LibraryGamePresenter;
use App\Services\LocalUserService;
use App\Services\StatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function home(StatsService $stats, LibraryGameListService $libraryGames, LibraryGamePresenter $presenter, LocalUserService $users): Response|RedirectResponse
    {
        if (! User::query()->exists() || ! AppSetting::query()->exists()) {
            return redirect()->route('setup');
        }

        $user = $users->get();

        return Inertia::render('Home', [
            'user' => $user,
            'stats' => $stats->live($user),
            'homeWidgets' => [
                'lastAddedGame' => $this->presentGame($this->lastAddedGame($libraryGames, $user), $presenter),
                'randomGame' => $this->presentGame($this->randomUnfinishedGame($libraryGames, $user), $presenter),
                'lastCompletedGame' => $this->presentGame($this->lastCompletedGame($libraryGames, $user), $presenter),
            ],
        ]);
    }

    public function randomGame(LibraryGameListService $libraryGames, LibraryGamePresenter $presenter, LocalUserService $users): JsonResponse
    {
        return response()->json([
            'game' => $this->presentGame($this->randomUnfinishedGame($libraryGames, $users->get()), $presenter),
        ]);
    }

    private function lastAddedGame(LibraryGameListService $libraryGames, User $user): ?LibraryGame
    {
        return $libraryGames->query($user)
            ->latest('library_games.created_at')
            ->latest('library_games.id')
            ->first();
    }

    private function randomUnfinishedGame(LibraryGameListService $libraryGames, User $user): ?LibraryGame
    {
        return $libraryGames->query($user)
            ->whereHas('status', fn ($query) => $query->whereIn('name', ['Not Played', 'In Progress', 'Dropped']))
            ->inRandomOrder()
            ->first();
    }

    private function lastCompletedGame(LibraryGameListService $libraryGames, User $user): ?LibraryGame
    {
        return $libraryGames->query($user)
            ->whereHas('status', fn ($query) => $query->whereIn('name', ['Completed', '100%']))
            ->latest('library_games.completed_at')
            ->latest('library_games.id')
            ->first();
    }

    private function presentGame(?LibraryGame $libraryGame, LibraryGamePresenter $presenter): ?array
    {
        return $libraryGame ? $presenter->card($libraryGame) : null;
    }
}
