# Frontend Integration Notes

## Add Game

The add-game flow posts to `POST /library-games`.

Backend validation is authoritative. The frontend should use reference data to prevent invalid platform/device/ownership combinations where possible, but must still handle validation errors from the backend.

The frontend can rely on request-level validation for required payload sections and basic field typing before backend service-level business rules run.

## Provider Search

Provider search is available at `GET /provider-search?query=...`.

The backend search order is IGDB, Steam fallback, Manual. The frontend should not ask the user to choose a provider in V1.

The response shape is stable even when credentials are missing or providers fail. `manual_available` remains `true`; provider failures are surfaced in `warnings`.

Provider credentials are never returned to the frontend.

## Settings Credentials

Blank credential fields in Settings preserve existing credentials. The current V1 contract does not provide an explicit clear credentials action.

## Stats

Dashboard and stats pages use live stats. Official yearly history must use confirmed snapshots.

## Snapshot Statuses

Known statuses:

- `draft`
- `confirmed`
