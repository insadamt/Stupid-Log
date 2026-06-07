<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\AppSetting;
use App\Models\User;
use App\Services\DataPortability\BackupPreviewStore;
use App\Services\DataPortability\BackupRestorer;
use App\Services\LocalUserService;
use App\Services\ProviderCredentialService;
use App\Services\ProviderCredentialTestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;

class SetupController extends Controller
{
    public function setup(): Response
    {
        return Inertia::render('Setup');
    }

    public function storeSetup(
        Request $request,
        LocalUserService $users,
        ProviderCredentialService $credentials,
    ): RedirectResponse {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'igdb_client_id' => ['nullable', 'string'],
            'igdb_client_secret' => ['nullable', 'string'],
            'steam_api_key' => ['nullable', 'string'],
        ]);

        $user = User::updateOrCreate(['id' => $users->get()->id], ['username' => $validated['username']]);
        AppSetting::updateOrCreate(['user_id' => $user->id], ['currency_code' => 'USD']);
        $credentials->store($user, 'igdb', $validated['igdb_client_id'] ?? null, $validated['igdb_client_secret'] ?? null, null);
        $credentials->store($user, 'steam', null, null, $validated['steam_api_key'] ?? null);

        return redirect()->route('home');
    }

    public function testIgdbCredentials(Request $request, ProviderCredentialTestService $credentialTests): JsonResponse
    {
        $validated = $request->validate([
            'igdb_client_id' => ['nullable', 'string'],
            'igdb_client_secret' => ['nullable', 'string'],
        ]);

        $result = $credentialTests->testIgdb(
            $validated['igdb_client_id'] ?? null,
            $validated['igdb_client_secret'] ?? null,
        );

        return response()->json([
            'ok' => $result->ok,
            'message' => $result->message,
        ], $result->ok ? 200 : 422);
    }

    public function testSteamCredentials(Request $request, ProviderCredentialTestService $credentialTests): JsonResponse
    {
        $validated = $request->validate([
            'steam_api_key' => ['nullable', 'string'],
        ]);

        $result = $credentialTests->testSteam($validated['steam_api_key'] ?? null);

        return response()->json([
            'ok' => $result->ok,
            'message' => $result->message,
        ], $result->ok ? 200 : 422);
    }

    public function restoreBackup(
        Request $request,
        BackupPreviewStore $previews,
        BackupRestorer $restorer,
        LocalUserService $users,
    ): JsonResponse {
        $validated = $request->validate([
            'token' => ['required', 'string', 'size:64'],
        ]);

        if (User::query()->exists() && AppSetting::query()->exists()) {
            return response()->json(['message' => 'Setup import is only available before setup is complete.'], 409);
        }

        try {
            $restorer->restore($previews->archivePath($validated['token']), $users->get());
            $previews->delete($validated['token']);
            $request->session()->put('setup_backup_imported', true);
        } catch (InvalidArgumentException|RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['restored' => true]);
    }

    public function storeImportedCredentials(
        Request $request,
        LocalUserService $users,
        ProviderCredentialService $credentials,
    ): JsonResponse {
        if (! $request->session()->pull('setup_backup_imported', false)) {
            return response()->json(['message' => 'Import provider setup is no longer available.'], 409);
        }

        $validated = $request->validate([
            'igdb_client_id' => ['nullable', 'string'],
            'igdb_client_secret' => ['nullable', 'string'],
            'steam_api_key' => ['nullable', 'string'],
        ]);

        $user = $users->get();
        $credentials->store($user, 'igdb', $validated['igdb_client_id'] ?? null, $validated['igdb_client_secret'] ?? null, null, true);
        $credentials->store($user, 'steam', null, null, $validated['steam_api_key'] ?? null, true);

        return response()->json(['saved' => true]);
    }
}
