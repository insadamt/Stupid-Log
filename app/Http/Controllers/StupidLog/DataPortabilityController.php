<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Services\DataPortability\BackupExporter;
use App\Services\DataPortability\BackupPreviewStore;
use App\Services\DataPortability\BackupRestorer;
use App\Services\LocalUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DataPortabilityController extends Controller
{
    public function export(LocalUserService $users, BackupExporter $exporter): BinaryFileResponse
    {
        $artifact = $exporter->export($users->get());
        app()->terminating(fn () => $exporter->deleteArtifact($artifact));

        return response()
            ->download($artifact->path, $artifact->downloadName, ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend();
    }

    public function preview(Request $request, BackupPreviewStore $previews): JsonResponse
    {
        $validated = $request->validate([
            'backup' => ['required', 'file', 'max:2097152'],
        ]);

        try {
            return response()->json(
                $previews->create($validated['backup'])->toArray(),
            );
        } catch (InvalidArgumentException|RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function restore(
        Request $request,
        BackupPreviewStore $previews,
        BackupRestorer $restorer,
        LocalUserService $users,
    ): JsonResponse {
        $validated = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'confirmation' => ['required', 'in:RESTORE'],
        ]);

        try {
            $restorer->restore($previews->archivePath($validated['token']), $users->get());
            $previews->delete($validated['token']);
        } catch (InvalidArgumentException|RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['restored' => true]);
    }
}
