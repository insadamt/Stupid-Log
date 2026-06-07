<?php

namespace App\Http\Middleware;

use App\Services\InstallationState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureInstallationNeedsSetup
{
    public function handle(Request $request, Closure $next): Response
    {
        $isImportedProviderSetup = $request->routeIs('setup.import.providers')
            && $request->session()->has('setup_backup_imported');

        if (app(InstallationState::class)->isComplete() && ! $isImportedProviderSetup) {
            return redirect()->route('home');
        }

        return $next($request);
    }
}
