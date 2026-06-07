<?php

use App\Http\Middleware\EnsureInstallationIsComplete;
use App\Http\Middleware\EnsureInstallationNeedsSetup;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

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
        //
    })->create();
