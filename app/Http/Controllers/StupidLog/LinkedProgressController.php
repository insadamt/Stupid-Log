<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Http\Requests\StupidLog\StoreLinkedProgressRequest;
use App\Http\Requests\StupidLog\UpdateLinkedProgressRequest;
use App\Models\StupidLog\LibraryGame;
use App\Services\LinkedProgressService;
use App\Services\LocalUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LinkedProgressController extends Controller
{
    public function candidates(
        Request $request,
        LibraryGame $libraryGame,
        LinkedProgressService $linkedProgress,
        LocalUserService $users,
    ): JsonResponse {
        $candidates = $linkedProgress
            ->candidates($users->get(), $libraryGame, $request->string('query')->toString())
            ->map(fn (LibraryGame $candidate) => [
                'id' => $candidate->id,
                'title' => $candidate->game?->title,
                'platform' => $candidate->platform?->name,
                'status' => $candidate->status?->name,
                'status_color_key' => $candidate->status?->color_key,
                'status_color_hex' => $candidate->status?->color_hex,
                'playtime_hours' => (float) $candidate->playtime_hours,
                'earned_achievements' => (int) ($candidate->earned_achievements ?? 0),
                'total_achievements' => (int) ($candidate->game?->total_achievements ?? 0),
                'first_played_at' => $candidate->first_played_at?->format('Y-m-d'),
                'last_played_at' => $candidate->last_played_at?->format('Y-m-d'),
                'completed_at' => $candidate->completed_at?->format('Y-m-d'),
            ])
            ->values();

        return response()->json(['candidates' => $candidates]);
    }

    public function store(
        StoreLinkedProgressRequest $request,
        LibraryGame $libraryGame,
        LinkedProgressService $linkedProgress,
    ): RedirectResponse {
        $linkedProgress->create($libraryGame, $request->validated());

        return back();
    }

    public function update(
        UpdateLinkedProgressRequest $request,
        LibraryGame $libraryGame,
        LinkedProgressService $linkedProgress,
    ): RedirectResponse {
        $linkedProgress->update($libraryGame, $request->validated());

        return back();
    }

    public function destroy(LibraryGame $libraryGame, LinkedProgressService $linkedProgress): RedirectResponse
    {
        $linkedProgress->delete($libraryGame);

        return back();
    }
}
