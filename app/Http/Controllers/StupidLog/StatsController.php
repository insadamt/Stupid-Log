<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\StatsService;
use Inertia\Inertia;
use Inertia\Response;

class StatsController extends Controller
{
    public function stats(StatsService $stats): Response
    {
        $user = $this->localUser();

        return Inertia::render('Stats', [
            'stats' => $stats->live($user),
            'confirmedYears' => $stats->confirmedYears($user),
        ]);
    }

    private function localUser(): User
    {
        return User::first() ?? User::create(['username' => 'Player One', 'avatar_path' => null]);
    }
}
