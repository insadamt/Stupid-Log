# Backend Validation

## Setup And Settings

Validated in `StupidLogController`.

```text
username: required string max:255
currency_code: required exists:currencies,code
igdb_client_id: nullable string
igdb_client_secret: nullable string
steam_api_key: nullable string
```

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

Validated in `LibraryGameCreator`.

Required payload sections:

```text
game
platform_id
device_ids
ownership_copies
progress
```

Rules:

- `device_ids` cannot be empty.
- `ownership_copies` cannot be empty.
- selected devices must be valid for selected platform.
- selected ownership types must be valid for selected platform.
- ownership type cannot repeat for the same library game.
- Physical, Pre-owned, and Borrowed require `physical_status_id`.
- same user/game/platform combination cannot be created twice.
- manual duplicate candidates block creation unless `create_duplicate_anyway` is true.
- earned achievements cannot exceed total achievements.
- `100%` status requires total achievements and earned achievements equal to total achievements.
