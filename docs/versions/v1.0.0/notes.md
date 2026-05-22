# Stupid Log v1.0.0 Notes

## Documentation Initialization

Created the required documentation structure and documented the current Laravel/Inertia implementation.

## Backend Notes

- V1 is a single-user local app with a persistent `users` table.
- The backend uses the first user as the V1 local profile, creating `Player One` only when no user exists.
- Provider credentials are encrypted with Laravel encryption.
- Provider search returns warnings instead of blocking manual fallback.
- Official yearly stats depend on confirmed snapshots.
- Snapshot draft creation is idempotent per user/year.
- Snapshot confirmation rejects a second confirmed snapshot for the same user/year.

## Backend Audit Checkpoint

Implemented:

- V1 schema, reference seeders, local-user baseline, library creation, duplicate detection, provider search, settings credential storage, stats, snapshots, and frontend contract docs.
- Provider search now has a stable JSON response shape in success, missing-credential, and provider-failure cases.
- Settings updates preserve existing encrypted credentials when credential fields are blank.
- `POST /library-games` now has structured request-level validation before service business rules run.
- Steam enrichment now stores total achievements, default/base price, Steam external ID, and DLC catalog when a Steam App ID is available.

Partial:

- Provider search covers IGDB metadata lookup and Steam store-search fallback.
- Library creation validates create payloads, but edit/update library-game flows are not yet part of V1 backend contracts.

Intentionally deferred:

- full Steam library import
- authentication and multi-user UI
- explicit clear credentials control
- provider selection UI

## Frontend Notes

- Existing React pages consume Inertia props from `StupidLogController`.
- `resources/js/types.ts` contains the current shared frontend shapes.
- Major UI/UX decisions should be handled by ChatGPT/frontend lead.
