<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\Device;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\PhysicalStatus;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\LibraryGameListService;
use App\Services\LibraryGamePresenter;
use App\Services\StatsService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class StupidLogController extends Controller
{
    public function home(StatsService $stats, LibraryGameListService $libraryGames, LibraryGamePresenter $presenter): Response|RedirectResponse
    {
        if (! User::query()->exists() || ! AppSetting::query()->exists()) {
            return redirect()->route('setup');
        }

        $user = $this->localUser();
        $recentLibraryGames = $libraryGames->query($user)->latest()->take(6)->get();

        return Inertia::render('Home', [
            'user' => $user,
            'stats' => $stats->live($user),
            'recentGames' => $presenter->cards($recentLibraryGames),
            'references' => $this->references(),
        ]);
    }

    private function references(): array
    {
        return [
            'platforms' => Platform::with(['devices', 'ownershipTypes'])->orderBy('name')->get(),
            'devices' => Device::orderBy('name')->get(),
            'ownershipTypes' => OwnershipType::orderBy('name')->get(),
            'physicalStatuses' => PhysicalStatus::orderBy('name')->get(),
            'statuses' => Status::orderBy('name')->get(),
        ];
    }

    private function localUser(): User
    {
        return User::first() ?? User::create(['username' => 'Player One', 'avatar_path' => null]);
    }

}
