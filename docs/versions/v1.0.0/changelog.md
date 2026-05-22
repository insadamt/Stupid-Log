# Stupid Log v1.0.0 Changelog

## Documentation

- Added required project documentation structure.
- Added project README, specification, architecture, data model, and design system docs.
- Added backend overview, routes, services, validation, and frontend contract docs.
- Added frontend overview, pages, components, state/props, and integration notes.
- Added initial architecture ADR.
- Added v1.0.0 plan, notes, and changelog.

## Backend

- Made snapshot draft creation idempotent per user/year.
- Rejected confirmation of a second snapshot for an already confirmed user/year.
- Added feature coverage for snapshot integrity rules.
- Added structured request validation for `POST /library-games`.
- Hardened provider search to return a stable documented JSON contract.
- Added tests for missing provider credentials, provider failure fallback, and all-provider failure behavior.
- Preserved existing encrypted credentials when Settings credential fields are submitted blank.
- Fixed V1 local user lookup so renaming the local profile does not create a second user.
- Added Steam enrichment for achievements, base/default price, Steam external IDs, and DLC catalog.
- Added idempotent DLC/external-ID enrichment tests.
