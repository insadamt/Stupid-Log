<?php

use App\Http\Middleware\EnsureInstallationIsComplete;
use App\Http\Middleware\EnsureInstallationNeedsSetup;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'installation.complete' => EnsureInstallationIsComplete::class,
            'installation.needs-setup' => EnsureInstallationNeedsSetup::class,
        ]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('stupid-log:cleanup-provider-import-drafts')->daily();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isBackupRequest = fn (Request $request): bool => $request->is(
            'settings/data-portability/preview',
            'settings/data-portability/restore',
            'setup/import/restore',
        );

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => $isBackupRequest($request) || $request->expectsJson(),
        );

        $exceptions->render(function (PostTooLargeException $exception, Request $request) use ($isBackupRequest) {
            if (! $isBackupRequest($request)) {
                return null;
            }

            return response()->json([
                'message' => 'Backup upload rejected. The file is larger than the server upload limit.',
            ], 413);
        });

        $exceptions->render(function (TokenMismatchException $exception, Request $request) use ($isBackupRequest) {
            if (! $isBackupRequest($request)) {
                return null;
            }

            return response()->json([
                'message' => 'Backup request expired. Refresh the page and try again.',
            ], 419);
        });
    })->create();
