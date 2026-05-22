# Frontend Components

## `AppLayout`

Shared shell/navigation wrapper for Inertia pages.

## `GameCard`

Displays `GameCardData` from the backend. Cover art can use stored cover paths or provider original cover URLs.

## `AddGameWizard`

Creates library game payloads from reference data and posts to `POST /library-games`.

Important backend dependencies:

- platform devices from `ReferenceData.platforms[].devices`
- platform ownership types from `ReferenceData.platforms[].ownership_types`
- status values from `ReferenceData.statuses`
- physical status values from `ReferenceData.physicalStatuses`

