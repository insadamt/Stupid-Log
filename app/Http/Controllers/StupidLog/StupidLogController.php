<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\AppSetting;
use App\Models\User;
use App\Services\LibraryGameListService;
use App\Services\LibraryGamePresenter;
use App\Services\LocalUserService;
use App\Services\ReferenceDataService;
use App\Services\StatsService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class StupidLogController extends Controller
{
    public function home(StatsService $stats, LibraryGameListService $libraryGames, LibraryGamePresenter $presenter, LocalUserService $users, ReferenceDataService $references): Response|RedirectResponse
    {
        if (! User::query()->exists() || ! AppSetting::query()->exists()) {
            return redirect()->route('setup');
        }

        $user = $users->get();
        $recentLibraryGames = $libraryGames->query($user)->latest()->take(6)->get();

        return Inertia::render('Home', [
            'user' => $user,
            'stats' => $stats->live($user),
            'recentGames' => $presenter->cards($recentLibraryGames),
            'references' => $references->all(),
        ]);
    }
}
