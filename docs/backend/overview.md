# Backend Overview

The backend is a Laravel app that serves Inertia pages and one JSON provider-search endpoint.

## Responsibilities

- maintain V1 product rules
- persist library, ownership, DLC, provider, and snapshot data
- validate platform/device/ownership/progress relationships
- encrypt provider credentials
- compute live and confirmed yearly stats
- document all frontend-facing response contracts

## Main Entry Points

- `routes/web.php`
- `app/Http/Controllers/StupidLog/StupidLogController.php`
- `app/Services/LibraryGameCreator.php`
- `app/Services/ProviderSearchService.php`
- `app/Services/StatsService.php`
- `app/Services/SnapshotService.php`

## Local User

V1 uses a single local user. `StupidLogController::localUser()` creates or returns `Player One`.

