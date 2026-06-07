<?php

namespace App\Http\Middleware;

use App\Services\InstallationState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureInstallationIsComplete
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! app(InstallationState::class)->isComplete()) {
            return redirect()->route('setup');
        }

        return $next($request);
    }
}
