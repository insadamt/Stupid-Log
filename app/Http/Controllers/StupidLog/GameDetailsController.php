<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\LibraryGame;
use App\Services\ClosedFinancialYearService;
use App\Services\FinancialValueService;
use App\Services\LibraryGamePresenter;
use App\Services\LocalUserService;
use App\Services\ReferenceDataService;
use Inertia\Inertia;
use Inertia\Response;

class GameDetailsController extends Controller
{
    public function gameDetails(
        LibraryGame $libraryGame,
        LibraryGamePresenter $presenter,
        ReferenceDataService $references,
        FinancialValueService $financialValues,
        LocalUserService $localUser,
        ClosedFinancialYearService $closedYears,
    ): Response {
        $user = $localUser->get();
        $libraryGame->load([
            'game.dlcs',
            'platform.ownershipTypes',
            'status',
            'devices',
            'ownershipCopies.ownershipType',
            'ownershipCopies.physicalStatus',
            'ownedDlcs.dlc',
            'inAppPurchases.lockedBySnapshotRun',
            'progressLink.sourceLibraryGame.game',
            'progressLink.sourceLibraryGame.platform',
            'progressLink.sourceLibraryGame.status',
        ]);

        return Inertia::render('GameDetails', [
            'libraryGame' => $presenter->card($libraryGame),
            'details' => $presenter->details($libraryGame),
            'references' => $references->all(),
            'dlcs' => $presenter->dlcs($libraryGame),
            'paidBreakdown' => $financialValues->calculateGamePaidBreakdown($libraryGame),
            'closedFinancialYear' => $closedYears->closedFinancialYear($user),
            'firstEditableFinancialDate' => $closedYears->firstEditableDate($user)?->format('Y-m-d'),
        ]);
    }
}
