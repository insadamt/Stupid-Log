<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\Device;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\PhysicalStatus;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\LibraryGameListService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LibraryController extends Controller
{
    public function library(LibraryGameListService $libraryGames): Response
    {
        $user = $this->localUser();

        return Inertia::render('Library', [
            'libraryGames' => $libraryGames->payload($user, request())->get('items'),
            'libraryMeta' => $libraryGames->meta($user),
            'references' => $this->references(),
        ]);
    }

    public function libraryGames(Request $request, LibraryGameListService $libraryGames): JsonResponse
    {
        return response()->json($libraryGames->payload($this->localUser(), $request));
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
