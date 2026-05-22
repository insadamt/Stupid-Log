# Frontend Integration Notes

## Add Game

The add-game flow posts to `POST /library-games`.

Backend validation is authoritative. The frontend should use reference data to prevent invalid platform/device/ownership combinations where possible, but must still handle validation errors from the backend.

## Provider Search

Provider search is available at `GET /provider-search?query=...`.

The backend search order is IGDB, Steam fallback, Manual. The frontend should not ask the user to choose a provider in V1.

## Stats

Dashboard and stats pages use live stats. Official yearly history must use confirmed snapshots.

## Snapshot Statuses

Known statuses:

- `draft`
- `confirmed`

