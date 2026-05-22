# Stupid Log v1.0.0 Notes

## Documentation Initialization

Created the required documentation structure and documented the current Laravel/Inertia implementation.

## Backend Notes

- V1 is a single-user local app with a persistent `users` table.
- The backend currently creates or returns `Player One` as the local profile.
- Provider credentials are encrypted with Laravel encryption.
- Provider search returns warnings instead of blocking manual fallback.
- Official yearly stats depend on confirmed snapshots.
- Snapshot draft creation is idempotent per user/year.
- Snapshot confirmation rejects a second confirmed snapshot for the same user/year.

## Frontend Notes

- Existing React pages consume Inertia props from `StupidLogController`.
- `resources/js/types.ts` contains the current shared frontend shapes.
- Major UI/UX decisions should be handled by ChatGPT/frontend lead.
