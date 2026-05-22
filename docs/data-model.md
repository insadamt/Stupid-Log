# Data Model

## Core Tables

### `users`

Single local profile in V1. Keeps `username` and nullable `avatar_path`.

### `app_settings`

Stores per-user settings such as `currency_code`.

### `providers` and `provider_credentials`

`providers` stores `manual`, `igdb`, and `steam`.

`provider_credentials` stores encrypted IGDB and Steam credentials per user/provider:

- `encrypted_client_id`
- `encrypted_client_secret`
- `encrypted_api_key`
- `is_enabled`
- `last_tested_at`
- `last_test_status`

## Game Identity

### `games`

Canonical game metadata:

- title and normalized title
- cover fields
- publisher/release/description
- source provider
- default base price
- total achievements
- provider sync timestamp

### `external_game_ids`

Maps a `game` to provider IDs. Unique by `provider_id` and `external_id`.

## Library Ownership

### `library_games`

The central tracked record: one `game_id` on one `platform_id` for one `user_id`.

Unique rule:

```text
user_id + game_id + platform_id
```

Gameplay/progress fields live here:

- `status_id`
- `playtime_hours`
- `earned_achievements`
- `first_played_at`
- `last_played_at`
- `completed_at`

### `ownership_copies`

Represents ways the user owns the `LibraryGame`, such as Digital, Physical, Game Pass, or PS Plus.

Value/acquisition fields live here:

- `edition_name`
- `base_price`
- `purchased_price`
- `purchased_at`
- `physical_status_id` for physical-like ownership

Unique rule:

```text
library_game_id + ownership_type_id
```

### `dlcs` and `owned_dlcs`

`dlcs` belongs to canonical `games`.

`owned_dlcs` attaches DLC ownership to a `LibraryGame`. DLC ownership is not scoped to a specific ownership copy.

## Reference Tables

- `currencies`
- `platforms`
- `devices`
- `statuses`
- `ownership_types`
- `physical_statuses`
- `platform_device`
- `platform_ownership_type`

Seeded reference values are defined in `docs/stupid_log_v_1_seeders_only.md` and implemented in `database/seeders/StupidLogReferenceSeeder.php`.

## Snapshots

### `snapshot_runs`

Represents a yearly snapshot run with status `draft` or `confirmed`.

Backend integrity rules:

- draft runs are idempotent per user/year.
- confirmed runs are unique in practice per user/year through `SnapshotService`.

### Snapshot Item Tables

- `library_game_snapshots`
- `ownership_copy_snapshots`
- `owned_dlc_snapshots`

Confirmed snapshots are the only source for official yearly history. Live stats are useful for current dashboard views, not historical truth.
