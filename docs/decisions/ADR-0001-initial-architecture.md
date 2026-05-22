# ADR-0001: Initial Architecture

## Status

Accepted

## Decision

Stupid Log V1 uses Laravel, Inertia, React, TypeScript, Tailwind CSS, and a relational database.

The app is single-user in V1 but keeps `users` and `user_id` relationships across owned data.

## Rationale

Laravel provides migrations, validation, encryption, HTTP clients, database transactions, seeders, and tests in one backend stack.

Inertia allows the app to serve React pages without building a separate API for every page, while still documenting page props as frontend contracts.

The data model preserves the central V1 rule that `Game + Platform = LibraryGame` and separates gameplay data from ownership/value data.

## Consequences

- Backend response props are part of the product contract and must be documented.
- Frontend work should consume Inertia props instead of inventing parallel state sources.
- Official yearly stats require confirmed snapshots, not live database totals.

