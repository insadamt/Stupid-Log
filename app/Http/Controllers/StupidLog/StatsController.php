<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Services\LocalUserService;
use App\Services\StatsService;
use Inertia\Inertia;
use Inertia\Response;

class StatsController extends Controller
{
    public function stats(StatsService $stats, LocalUserService $users): Response
    {
        $user = $users->get();

        return Inertia::render('Stats', [
            'stats' => $stats->live($user),
            'confirmedYears' => $stats->confirmedYears($user),
        ]);
    }

}
