# Stupid Log v1.0.0 Plan

## Goal

Build and document the V1 foundation for a single-user personal gaming archive with correct library, ownership, provider, stats, and snapshot behavior.

## Scope

- Laravel/Inertia app foundation
- V1 schema and Eloquent models
- reference seeders and demo library seeder
- library game creation rules
- provider credential storage and provider search
- live stats and yearly snapshots
- documented frontend-facing backend contracts
- project documentation structure

## Non-Goals

- public registration/login
- multi-user UI
- Electron/Tauri packaging
- major frontend redesign without frontend lead direction
- official yearly stats from live data

## Phases

1. Schema and seed data
2. Models and relationships
3. Backend services and validation
4. Inertia routes and page contracts
5. Tests
6. Documentation

## Tasks

### Baseline Completed

- [x] Create V1 database schema.
- [x] Add Stupid Log Eloquent models.
- [x] Add reference seeders.
- [x] Add demo library seeder.
- [x] Implement library game creation service.
- [x] Implement duplicate detection.
- [x] Implement provider credential storage.
- [x] Implement provider search flow.
- [x] Implement live stats service.
- [x] Implement yearly snapshot service.
- [x] Add feature tests for V1 rules.
- [x] Create required documentation structure.
- [x] Document architecture, data model, backend services, validation, routes, and frontend contracts.
- [x] Verify documentation with full test/build commands.

### Remaining Backend Work

- [x] Enforce one official confirmed snapshot per user/year.
- [x] Make draft snapshot creation idempotent per user/year.
- [x] Add snapshot integrity feature tests.
- [x] Document snapshot integrity validation and service behavior.
- [x] Audit provider enrichment gaps against the detailed V1 spec.
- [x] Harden provider search response contract.
- [x] Add provider search contract tests.
- [x] Audit settings credential update/clear behavior.
- [x] Preserve existing credentials when Settings credential fields are blank.
- [x] Add settings credential preservation tests.
- [x] Replace ad hoc library-game request shape validation with stricter structured validation.
- [x] Add library-game request shape validation tests.

### Remaining Backend Gaps

- [x] Deeper Steam enrichment for achievements, base prices, and DLC catalog beyond current fallback search.
- [x] Add Steam enrichment idempotence tests.
- [ ] Explicit clear credentials control and backend endpoint/intent, once product/UI direction is defined.
- [ ] Edit/update flows for existing library games, if V1 scope requires them.

## Affected Areas/Files

- `routes/web.php`
- `app/Http/Controllers/StupidLog/StupidLogController.php`
- `app/Http/Requests/StupidLog/*`
- `app/Models/StupidLog/*`
- `app/Services/SnapshotService.php`
- `app/Services/*`
- `database/migrations/2026_05_22_000000_create_stupid_log_schema.php`
- `database/seeders/*`
- `resources/js/types.ts`
- `resources/js/Pages/*`
- `resources/js/Components/*`
- `tests/Feature/StupidLog/LibraryGameRulesTest.php`
- `docs/**`

## Acceptance Criteria

- Documentation tree exists in the required structure.
- `docs/specification.md`, `docs/architecture.md`, and `docs/data-model.md` describe the current app.
- Backend docs cover routes, services, validation, and frontend contracts.
- Frontend docs summarize pages, components, state, and integration notes.
- Version plan tracks goal, scope, non-goals, phases, tasks, affected files, acceptance criteria, commands, status, next step, and blockers.
- Snapshot draft creation for the same user/year does not accumulate stale duplicate draft runs.
- Confirming a second snapshot for an already confirmed user/year is rejected.
- Provider search returns the documented JSON shape for success, missing credentials, and provider failures.
- Manual entry remains available when provider search fails.
- Settings updates preserve existing credentials when credential fields are blank.
- `POST /library-games` has structured request-level validation plus service-level business validation.
- `resources/js/types.ts` includes the backend contract types frontend can import.
- Relevant tests/build commands are run or clearly reported as not run.

## Commands To Run

```bash
composer test
npm run build
```

Optional after schema/seed changes:

```bash
php artisan migrate:fresh --seed
```

## Current Status

Steam enrichment has been added and verified. Game creation can now enrich existing game/DLC fields from Steam App IDs without changing frontend page/component contracts.

## Next Step

Frontend can continue against the documented contracts. Remaining backend work should focus only on explicitly scoped V1 needs such as edit/update flows or an explicit clear-credentials control.

## Blockers

None known.
