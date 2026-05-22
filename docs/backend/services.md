# Backend Services

## `LibraryGameCreator`

Creates a `LibraryGame` inside a transaction.

Rules enforced:

- no duplicate `user_id + game_id + platform_id`
- devices must be allowed for selected platform
- ownership types must be allowed for selected platform
- ownership type cannot repeat within one library game
- physical-like ownership requires physical status
- earned achievements cannot exceed total achievements
- `100%` requires a game with achievements and all achievements earned

## `DuplicateDetectionService`

Finds existing games by external provider ID and possible manual duplicates by normalized title and optional release date.

## `ProviderSearchService`

Search order:

1. IGDB if enabled credentials exist.
2. Steam fallback if IGDB has no results or fails.
3. Manual entry remains available.

The service returns a stable frontend JSON shape for success, missing credentials, and provider failures. Provider credentials are never returned to the frontend.

Every result is normalized with these keys:

- `source`
- `external_id`
- `title`
- `cover_url_original`
- `publisher`
- `release_date`
- `description`
- `steam_app_id`

The service returns warnings for provider failures instead of blocking manual entry.

## Settings Credential Storage

Settings updates preserve existing encrypted credential fields when incoming credential fields are blank. Non-blank values replace the existing encrypted value. Explicit credential clearing is deferred for a future control.

## `StatsService`

`live(User $user)` computes current library totals.

`confirmedYear(User $user, int $year)` reads the latest confirmed yearly snapshot for official yearly stats.

## `SnapshotService`

`createDraft(User $user, int $year)` copies current library game, ownership copy, and owned DLC state into snapshot tables.

Draft creation is idempotent per user/year: an existing draft for the same user and year is deleted before the new draft is created. Confirmed snapshots are not deleted by draft creation.

`confirm(SnapshotRun $snapshot)` marks a snapshot as `confirmed` and stores `confirmed_at`.

Confirmation rules:

- confirming an already confirmed snapshot is idempotent.
- confirming a second snapshot for a user/year that already has a confirmed snapshot is rejected.
