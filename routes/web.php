<?php

use App\Http\Controllers\StupidLog\LibraryController;
use App\Http\Controllers\StupidLog\StupidLogController;
use Illuminate\Support\Facades\Route;

Route::get('/setup', [StupidLogController::class, 'setup'])->name('setup');
Route::post('/setup', [StupidLogController::class, 'storeSetup'])->name('setup.store');

Route::get('/', [StupidLogController::class, 'home'])->name('home');
Route::get('/library', [LibraryController::class, 'library'])->name('library');
Route::get('/library-games', [LibraryController::class, 'libraryGames'])->name('library-games.index');
Route::post('/library-games', [StupidLogController::class, 'storeLibraryGame'])->name('library-games.store');
Route::post('/library-games/cover', [StupidLogController::class, 'uploadGameCover'])->name('library-games.cover.store');
Route::get('/library-games/manual-duplicates', [StupidLogController::class, 'manualDuplicates'])->name('library-games.manual-duplicates');
Route::get('/provider-search', [StupidLogController::class, 'providerSearch'])->name('provider-search');
Route::post('/provider-import-drafts', [StupidLogController::class, 'storeProviderImportDraft'])->name('provider-import-drafts.store');
Route::delete('/provider-import-drafts/{providerImportDraft}', [StupidLogController::class, 'cancelProviderImportDraft'])->name('provider-import-drafts.destroy');
Route::get('/games/{libraryGame}', [StupidLogController::class, 'gameDetails'])->name('games.show');
Route::patch('/games/{libraryGame}', [StupidLogController::class, 'updateLibraryGame'])->name('games.update');
Route::delete('/games/{libraryGame}', [StupidLogController::class, 'destroyLibraryGame'])->name('games.destroy');
Route::patch('/games/{libraryGame}/platform-devices', [StupidLogController::class, 'updatePlatformDevices'])->name('games.platform-devices.update');
Route::post('/games/{libraryGame}/ownership-copies', [StupidLogController::class, 'storeOwnershipCopy'])->name('games.ownership-copies.store');
Route::patch('/ownership-copies/{ownershipCopy}', [StupidLogController::class, 'updateOwnershipCopy'])->name('ownership-copies.update');
Route::delete('/ownership-copies/{ownershipCopy}', [StupidLogController::class, 'destroyOwnershipCopy'])->name('ownership-copies.destroy');
Route::post('/games/{libraryGame}/dlcs/refresh', [StupidLogController::class, 'refreshDlcs'])->name('games.dlcs.refresh');
Route::post('/games/{libraryGame}/owned-dlcs', [StupidLogController::class, 'storeOwnedDlc'])->name('games.owned-dlcs.store');
Route::patch('/owned-dlcs/{ownedDlc}', [StupidLogController::class, 'updateOwnedDlc'])->name('owned-dlcs.update');
Route::delete('/owned-dlcs/{ownedDlc}', [StupidLogController::class, 'destroyOwnedDlc'])->name('owned-dlcs.destroy');
Route::get('/stats', [StupidLogController::class, 'stats'])->name('stats');
Route::get('/snapshots', [StupidLogController::class, 'snapshots'])->name('snapshots');
Route::get('/snapshots-feed', [StupidLogController::class, 'snapshotFeed'])->name('snapshots.feed');
Route::post('/snapshots', [StupidLogController::class, 'createSnapshot'])->name('snapshots.store');
Route::get('/snapshots/{snapshotRun}', [StupidLogController::class, 'snapshotDetails'])->name('snapshots.show');
Route::get('/snapshots/{snapshotRun}/games', [StupidLogController::class, 'snapshotGames'])->name('snapshots.games');
Route::get('/snapshots/{snapshotRun}/eligible-best-games', [StupidLogController::class, 'snapshotEligibleBestGames'])->name('snapshots.eligible-best-games');
Route::patch('/snapshots/{snapshotRun}/resnap', [StupidLogController::class, 'resnapSnapshot'])->name('snapshots.resnap');
Route::patch('/snapshots/{snapshotRun}/confirm', [StupidLogController::class, 'confirmSnapshot'])->name('snapshots.confirm');
Route::patch('/snapshots/{snapshotRun}/best-games', [StupidLogController::class, 'updateSnapshotBestGames'])->name('snapshots.best-games.update');
Route::delete('/snapshots/{snapshotRun}', [StupidLogController::class, 'destroySnapshot'])->name('snapshots.destroy');
Route::get('/settings', [StupidLogController::class, 'settings'])->name('settings');
Route::patch('/settings', [StupidLogController::class, 'updateSettings'])->name('settings.update');
Route::post('/settings/reset', [StupidLogController::class, 'resetApp'])->name('settings.reset');
Route::post('/settings/igdb/test', [StupidLogController::class, 'testIgdbCredentials'])->name('settings.igdb.test');
Route::post('/settings/steam/test', [StupidLogController::class, 'testSteamCredentials'])->name('settings.steam.test');
