<?php

use App\Http\Controllers\StupidLog\StupidLogController;
use Illuminate\Support\Facades\Route;

Route::get('/setup', [StupidLogController::class, 'setup'])->name('setup');
Route::post('/setup', [StupidLogController::class, 'storeSetup'])->name('setup.store');

Route::get('/', [StupidLogController::class, 'home'])->name('home');
Route::get('/library', [StupidLogController::class, 'library'])->name('library');
Route::post('/library-games', [StupidLogController::class, 'storeLibraryGame'])->name('library-games.store');
Route::post('/library-games/cover', [StupidLogController::class, 'uploadGameCover'])->name('library-games.cover.store');
Route::get('/provider-search', [StupidLogController::class, 'providerSearch'])->name('provider-search');
Route::get('/games/{libraryGame}', [StupidLogController::class, 'gameDetails'])->name('games.show');
Route::get('/stats', [StupidLogController::class, 'stats'])->name('stats');
Route::get('/snapshots', [StupidLogController::class, 'snapshots'])->name('snapshots');
Route::post('/snapshots', [StupidLogController::class, 'createSnapshot'])->name('snapshots.store');
Route::patch('/snapshots/{snapshotRun}/confirm', [StupidLogController::class, 'confirmSnapshot'])->name('snapshots.confirm');
Route::get('/settings', [StupidLogController::class, 'settings'])->name('settings');
Route::patch('/settings', [StupidLogController::class, 'updateSettings'])->name('settings.update');
Route::post('/settings/igdb/test', [StupidLogController::class, 'testIgdbCredentials'])->name('settings.igdb.test');
