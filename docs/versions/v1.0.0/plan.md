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
- [ ] Audit provider enrichment gaps against the detailed V1 spec.
- [ ] Audit settings credential update/clear behavior.
- [ ] Replace ad hoc library-game payload validation with stricter structured validation.

## Affected Areas/Files

- `routes/web.php`
- `app/Http/Controllers/StupidLog/StupidLogController.php`
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

Snapshot integrity gap has been fixed and verified. Draft creation is idempotent per user/year, and a second confirmed snapshot for the same user/year is rejected.

## Next Step

Audit provider enrichment gaps against the detailed V1 spec.

## Blockers

None known.
