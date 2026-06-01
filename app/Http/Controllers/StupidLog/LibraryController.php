<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Services\LibraryGameListService;
use App\Services\LocalUserService;
use App\Services\ReferenceDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LibraryController extends Controller
{
    public function library(LibraryGameListService $libraryGames, LocalUserService $users, ReferenceDataService $references): Response
    {
        $user = $users->get();

        return Inertia::render('Library', [
            'libraryGames' => $libraryGames->payload($user, request())->get('items'),
            'libraryMeta' => $libraryGames->meta($user),
            'references' => $references->all(),
        ]);
    }

    public function libraryGames(Request $request, LibraryGameListService $libraryGames, LocalUserService $users): JsonResponse
    {
        return response()->json($libraryGames->payload($users->get(), $request));
    }
}
