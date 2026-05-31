<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\Device;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\PhysicalStatus;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Status;
use App\Services\LibraryGamePresenter;
use Inertia\Inertia;
use Inertia\Response;

class GameDetailsController extends Controller
{
    public function gameDetails(LibraryGame $libraryGame, LibraryGamePresenter $presenter): Response
    {
        $libraryGame->load(['game.dlcs', 'platform.ownershipTypes', 'status', 'devices', 'ownershipCopies.ownershipType', 'ownershipCopies.physicalStatus', 'ownedDlcs.dlc']);

        return Inertia::render('GameDetails', [
            'libraryGame' => $presenter->card($libraryGame),
            'details' => $presenter->details($libraryGame),
            'references' => $this->references(),
            'dlcs' => $presenter->dlcs($libraryGame),
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
}
