<?php

use App\Http\Controllers\StupidLog\DataPortabilityController;
use App\Http\Controllers\StupidLog\GameDetailsController;
use App\Http\Controllers\StupidLog\HomeController;
use App\Http\Controllers\StupidLog\InAppPurchaseController;
use App\Http\Controllers\StupidLog\LibraryController;
use App\Http\Controllers\StupidLog\LibraryGameMutationController;
use App\Http\Controllers\StupidLog\OwnedDlcController;
use App\Http\Controllers\StupidLog\OwnershipCopyController;
use App\Http\Controllers\StupidLog\ProviderController;
use App\Http\Controllers\StupidLog\SettingsController;
use App\Http\Controllers\StupidLog\SetupController;
use App\Http\Controllers\StupidLog\SnapshotController;
use App\Http\Controllers\StupidLog\StatsController;
use App\Http\Controllers\StupidLog\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::post('/settings/data-portability/preview', [DataPortabilityController::class, 'preview'])->name('settings.data-portability.preview');

Route::middleware('installation.needs-setup')->group(function (): void {
    Route::get('/setup', [SetupController::class, 'setup'])->name('setup');
    Route::post('/setup', [SetupController::class, 'storeSetup'])->name('setup.store');
    Route::post('/setup/igdb/test', [SetupController::class, 'testIgdbCredentials'])->name('setup.igdb.test');
    Route::post('/setup/import/restore', [SetupController::class, 'restoreBackup'])->name('setup.import.restore');
    Route::post('/setup/import/providers', [SetupController::class, 'storeImportedCredentials'])->name('setup.import.providers');
});

Route::middleware('installation.complete')->group(function (): void {
    Route::get('/', [HomeController::class, 'home'])->name('home');
    Route::get('/library', [LibraryController::class, 'library'])->name('library');
    Route::get('/library-games', [LibraryController::class, 'libraryGames'])->name('library-games.index');
    Route::post('/library-games', [LibraryGameMutationController::class, 'storeLibraryGame'])->name('library-games.store');
    Route::post('/library-games/cover', [LibraryGameMutationController::class, 'uploadGameCover'])->name('library-games.cover.store');
    Route::get('/library-games/manual-duplicates', [LibraryGameMutationController::class, 'manualDuplicates'])->name('library-games.manual-duplicates');
    Route::get('/provider-search', [ProviderController::class, 'providerSearch'])->name('provider-search');
    Route::get('/steam-enrichment/{appId}/metadata', [ProviderController::class, 'steamMetadata'])->name('steam-enrichment.metadata');
    Route::get('/steam-enrichment/{appId}/achievements', [ProviderController::class, 'steamAchievements'])->name('steam-enrichment.achievements');
    Route::get('/steam-enrichment/{appId}/dlcs', [ProviderController::class, 'steamDlcs'])->name('steam-enrichment.dlcs');
    Route::post('/provider-import-drafts', [ProviderController::class, 'storeProviderImportDraft'])->name('provider-import-drafts.store');
    Route::delete('/provider-import-drafts/{providerImportDraft}', [ProviderController::class, 'cancelProviderImportDraft'])->name('provider-import-drafts.destroy');
    Route::get('/games/{libraryGame}', [GameDetailsController::class, 'gameDetails'])->name('games.show');
    Route::patch('/games/{libraryGame}', [LibraryGameMutationController::class, 'updateLibraryGame'])->name('games.update');
    Route::delete('/games/{libraryGame}', [LibraryGameMutationController::class, 'destroyLibraryGame'])->name('games.destroy');
    Route::patch('/games/{libraryGame}/platform-devices', [LibraryGameMutationController::class, 'updatePlatformDevices'])->name('games.platform-devices.update');
    Route::post('/games/{libraryGame}/ownership-copies', [OwnershipCopyController::class, 'storeOwnershipCopy'])->name('games.ownership-copies.store');
    Route::patch('/ownership-copies/{ownershipCopy}', [OwnershipCopyController::class, 'updateOwnershipCopy'])->name('ownership-copies.update');
    Route::delete('/ownership-copies/{ownershipCopy}', [OwnershipCopyController::class, 'destroyOwnershipCopy'])->name('ownership-copies.destroy');
    Route::post('/games/{libraryGame}/dlcs/refresh', [LibraryGameMutationController::class, 'refreshDlcs'])->name('games.dlcs.refresh');
    Route::post('/games/{libraryGame}/owned-dlcs', [OwnedDlcController::class, 'storeOwnedDlc'])->name('games.owned-dlcs.store');
    Route::patch('/owned-dlcs/{ownedDlc}', [OwnedDlcController::class, 'updateOwnedDlc'])->name('owned-dlcs.update');
    Route::delete('/owned-dlcs/{ownedDlc}', [OwnedDlcController::class, 'destroyOwnedDlc'])->name('owned-dlcs.destroy');
    Route::get('/stats', [StatsController::class, 'stats'])->name('stats');
    Route::get('/subscriptions', [SubscriptionController::class, 'index'])->name('subscriptions.index');
    Route::post('/subscriptions/preview', [SubscriptionController::class, 'preview'])->name('subscriptions.preview');
    Route::post('/subscriptions', [SubscriptionController::class, 'store'])->name('subscriptions.store');
    Route::patch('/subscriptions/{subscriptionEntry}', [SubscriptionController::class, 'update'])->name('subscriptions.update');
    Route::delete('/subscriptions/{subscriptionEntry}', [SubscriptionController::class, 'destroy'])->name('subscriptions.destroy');
    Route::patch('/subscriptions/{subscriptionEntry}/ownership-copies', [SubscriptionController::class, 'updateOwnershipCopies'])->name('subscriptions.ownership-copies.update');
    Route::post('/games/{libraryGame}/in-app-purchases', [InAppPurchaseController::class, 'store'])->name('games.in-app-purchases.store');
    Route::patch('/in-app-purchases/{inAppPurchase}', [InAppPurchaseController::class, 'update'])->name('in-app-purchases.update');
    Route::delete('/in-app-purchases/{inAppPurchase}', [InAppPurchaseController::class, 'destroy'])->name('in-app-purchases.destroy');
    Route::get('/snapshots', [SnapshotController::class, 'snapshots'])->name('snapshots');
    Route::get('/snapshots-feed', [SnapshotController::class, 'snapshotFeed'])->name('snapshots.feed');
    Route::post('/snapshots', [SnapshotController::class, 'createSnapshot'])->name('snapshots.store');
    Route::get('/snapshots/{snapshotRun}', [SnapshotController::class, 'snapshotDetails'])->name('snapshots.show');
    Route::get('/snapshots/{snapshotRun}/games', [SnapshotController::class, 'snapshotGames'])->name('snapshots.games');
    Route::get('/snapshots/{snapshotRun}/eligible-best-games', [SnapshotController::class, 'snapshotEligibleBestGames'])->name('snapshots.eligible-best-games');
    Route::patch('/snapshots/{snapshotRun}/resnap', [SnapshotController::class, 'resnapSnapshot'])->name('snapshots.resnap');
    Route::patch('/snapshots/{snapshotRun}/confirm', [SnapshotController::class, 'confirmSnapshot'])->name('snapshots.confirm');
    Route::patch('/snapshots/{snapshotRun}/best-games', [SnapshotController::class, 'updateSnapshotBestGames'])->name('snapshots.best-games.update');
    Route::delete('/snapshots/{snapshotRun}', [SnapshotController::class, 'destroySnapshot'])->name('snapshots.destroy');
    Route::get('/settings', [SettingsController::class, 'settings'])->name('settings');
    Route::patch('/settings', [SettingsController::class, 'updateSettings'])->name('settings.update');
    Route::post('/settings/reset', [SettingsController::class, 'resetApp'])->name('settings.reset');
    Route::post('/settings/igdb/test', [SettingsController::class, 'testIgdbCredentials'])->name('settings.igdb.test');
    Route::get('/settings/data-portability/export', [DataPortabilityController::class, 'export'])->name('settings.data-portability.export');
    Route::post('/settings/data-portability/restore', [DataPortabilityController::class, 'restore'])->name('settings.data-portability.restore');
});
