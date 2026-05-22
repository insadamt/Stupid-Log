# Stupid Log Specification

## Product

Stupid Log is a personal gaming archive and collection manager. The user tracks games across platforms, devices, ownership types, DLCs, progress, achievements, prices, and yearly library growth.

The app is a self-hosted/local web app for one local profile in V1. The database still keeps `users` and `user_id` fields so future multi-user support remains possible.

## Locked V1 Rules

1. The central tracked object is a `LibraryGame`: one game title on one platform in the user's library.
2. The same game on the same platform must not be duplicated. Multiple ways of owning that game are represented by `OwnershipCopy` records.
3. Gameplay/progress data belongs to `LibraryGame`.
4. Price, value, edition, and acquisition data belongs to `OwnershipCopy`.
5. A `LibraryGame` has one platform and can have multiple devices.
6. DLC ownership is attached to the `LibraryGame`, not to a specific ownership copy.
7. Official yearly stats come only from confirmed yearly snapshots.
8. Provider data helps with metadata and enrichment, but saved user data is the final truth.

## Providers

Provider search is automatic:

- IGDB is the primary metadata source.
- Steam is fallback and enrichment.
- Manual entry is always available.

Provider credentials are stored per user and encrypted with Laravel encryption.

## Current Implementation Status

The current codebase implements the V1 schema, reference seeders, demo library seeding, Inertia pages, library creation, provider search, live stats, snapshot creation/confirmation, and settings/setup credential storage.

The original detailed input specs remain available:

- `docs/stupid_log_product_spec_v_0.md`
- `docs/stupid_log_v_1_seeders_only.md`

