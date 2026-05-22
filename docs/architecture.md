# Architecture

## Stack

- Backend: Laravel 13, PHP 8.3
- Frontend bridge: Inertia Laravel
- Frontend: React 19, TypeScript, Vite
- Styling: Tailwind CSS 4
- Database: Laravel-supported relational database; Docker Compose is present for local services
- Tests: PHPUnit through `php artisan test` and `composer test`

## Request Flow

1. Browser requests a route from `routes/web.php`.
2. `App\Http\Controllers\StupidLog\StupidLogController` handles the request.
3. Controllers delegate business logic to services where appropriate.
4. Controllers return Inertia page props or JSON for provider search.
5. React pages consume typed props from `resources/js/types.ts`.

## Backend Structure

- Controllers: `app/Http/Controllers/StupidLog`
- Models: `app/Models/StupidLog`
- Services: `app/Services`
- Migrations: `database/migrations`
- Seeders: `database/seeders`
- Feature tests: `tests/Feature/StupidLog`

## Primary Services

- `LibraryGameCreator`: creates library games, resolves or creates games, validates platform/device/ownership/progress rules, and creates ownership copies/DLC links.
- `DuplicateDetectionService`: finds existing games by provider external IDs and possible manual duplicates.
- `ProviderSearchService`: searches IGDB first, then Steam fallback, with manual entry always available.
- `StatsService`: computes live stats and confirmed yearly snapshot stats.
- `SnapshotService`: creates draft snapshot records and confirms snapshot runs.
- `TitleNormalizer`: normalizes titles for duplicate detection.
- `CoverStorageService`: placeholder service for cover storage from URL.

## Boundaries

Backend owns:

- schema and relationships
- validation and business rules
- provider search/enrichment
- Inertia response shape
- yearly snapshot integrity
- tests and backend documentation

Frontend owns:

- page layout
- component composition
- visual polish
- client interaction details

Codex should make backend-first changes and only mechanical frontend changes when the desired UI behavior is clear.

