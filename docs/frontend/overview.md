# Frontend Overview

The frontend is a React 19 + TypeScript Inertia app compiled by Vite.

## Entry Points

- `resources/js/app.tsx`
- `resources/views/app.blade.php`
- `resources/css/app.css`

## Pages

- `Home`
- `Library`
- `GameDetails`
- `Stats`
- `Snapshots`
- `Setup`
- `Settings`

## Shared Components

- `AppLayout`
- `GameCard`
- `AddGameWizard`

## Contract Rule

Backend response shapes must be reflected in `resources/js/types.ts` and `docs/backend/frontend-contracts.md`.

