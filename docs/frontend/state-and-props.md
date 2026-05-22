# Frontend State And Props

## Backend Props

Typed shared shapes are in `resources/js/types.ts`.

Backend-generated props:

- `GameCardData`
- `StatsData`
- `ReferenceData`

## Local Component State

`AddGameWizard` owns draft game state before submitting to the backend.

`Library` owns local search query state and filters already-loaded library games.

## Error Handling

Laravel/Inertia validation errors are expected for failed form submissions. Provider search returns warnings in JSON when provider calls fail and manual entry remains available.

