# Backend Validation

## Setup And Settings

Settings updates are validated by `UpdateSettingsRequest`.

```text
username: required string max:255
currency_code: required exists:currencies,code
igdb_client_id: nullable string
igdb_client_secret: nullable string
steam_api_key: nullable string
```

Settings credential behavior:

- blank credential fields preserve existing encrypted credentials.
- non-blank credential fields replace the existing encrypted value.
- blank fields do not create new credential records.
- explicit credential clearing is deferred for a future UI/control.

Setup uses the same field rules, but blank setup credentials simply mean no credential is stored.

## Provider Search

```text
query: required string min:2
```

## Snapshots

```text
year: required integer min:1970 max:2100
```

Snapshot integrity rules:

- creating a draft for a user/year replaces any existing draft for the same user/year.
- a user/year can have only one confirmed snapshot.
- attempting to confirm a second snapshot for the same user/year returns a validation error on `year`.

## Library Game Creation

Request-level shape validation is handled by `StoreLibraryGameRequest`.

Required payload sections:

```text
game
platform_id
device_ids
ownership_copies
progress
```

Request rules:

- `device_ids` cannot be empty.
- `ownership_copies` cannot be empty.
- `platform_id`, device IDs, ownership type IDs, physical status IDs, status IDs, and DLC IDs must be valid database IDs.
- `progress.playtime_hours` must be numeric, at least `0`, and at most `999999.9`.
- `progress.earned_achievements` must be an integer at least `0`.
- date fields must be valid dates.
- price fields must be numeric and at least `0`.
- `game.source`, when present, must be `manual`, `igdb`, or `steam`.
- `game.steam_app_id`, `game.external_id`, and provider-specific `game.external_ids.*` values are nullable strings.

Service-level business rules remain in `LibraryGameCreator`:

- selected devices must be valid for selected platform.
- selected ownership types must be valid for selected platform.
- ownership type cannot repeat for the same library game.
- Physical, Pre-owned, and Borrowed require `physical_status_id`.
- same user/game/platform combination cannot be created twice.
- manual duplicate candidates block creation unless `create_duplicate_anyway` is true.
- earned achievements cannot exceed total achievements.
- `100%` status requires total achievements and earned achievements equal to total achievements.
