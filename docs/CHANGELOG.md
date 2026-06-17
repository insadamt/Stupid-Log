# Changelog

All notable changes to Stupid Log are documented here. The project follows semantic versioning.

## [1.2.0] - 2026-06-17

### Added

- Added Home widgets for recently added, recently completed, and random library picks.
- Added the Library controls drawer for denser sorting, filtering, and display controls.
- Added advanced Library filters for ownership, devices, status, value, achievements, and playtime.

### Changed

- Made Library search case-insensitive and kept the Library grid refresh stable during filter changes.
- Fixed Stats progression to use a consistent status order across summaries and platform rows.
- Tightened compact UI copy, empty states, loading feedback, and final interaction polish.
- Hardened backup restore and upload handling for safer archive validation and recovery flows.

### Fixed

- Fixed value inheritance so copy and DLC value totals carry through Stats correctly.
- Preserved cents in currency value rows and value/base/paid delta badges, including `$2.98` and `+2.98` deltas.

## [1.1.0] - 2026-06-15

### Added

- Added Game Details Quick Edit for progress, achievement, and played-date updates.
- Added archive rank movement plus cumulative and period playtime rankings.

### Changed

- Standardized stats comparison context, stable platform chart colors, and breakdown chart state transitions.
- Standardized interface animation timing and shared motion presets.

### Fixed

- Kept Library hover cards above neighboring cards.
- Fixed donut transitions for empty data, changing data, and single-slice charts.

## [1.0.2] - 2026-06-09

### Added

- Added game cover replacement from the game details editor with an immediate uploaded-cover preview.
- Added first played and last played date editing and display on the game details page.

### Fixed

- Preserved an existing game cover when an update request omits the cover path.
- Rejected game updates where the last played date is earlier than the first played date.

## [1.0.1] - 2026-06-08

### Fixed

- Isolated new installer deployments with a persistent Compose project name derived from the selected port.
- Preserved the legacy `stupid-log` project name when upgrading v1.0.0 installations so existing database and media volumes remain attached.

## [1.0.0] - 2026-06-08

### Added

- Local game library, ownership, device, progress, achievement, and DLC tracking.
- Subscription, in-app purchase, financial summary, and yearly snapshot workflows.
- IGDB metadata search with setup and settings credential tests.
- Public Steam search, store metadata, DLC, pricing, and achievement-count enrichment without an API key.
- Portable backup export and destructive restore with media integrity validation.
- Production Docker image, PostgreSQL Compose stack, scheduler service, startup migrations, health checks, and persistent volumes.
- Setup guards, trusted-network warning, configured application version, and scheduled provider-import cleanup.

### Security

- v1.0.0 supports trusted LAN or VPN access only and must not be exposed directly to the public internet.
- Provider secrets are excluded from portable backups.

### License

- Stupid Log v1.0.0 is licensed under GPL-3.0.

[1.2.0]: https://github.com/insadamt/Stupid-Log/releases/tag/v1.2.0
[1.1.0]: https://github.com/insadamt/Stupid-Log/releases/tag/v1.1.0
[1.0.2]: https://github.com/insadamt/Stupid-Log/releases/tag/v1.0.2
[1.0.1]: https://github.com/insadamt/Stupid-Log/releases/tag/v1.0.1
[1.0.0]: https://github.com/insadamt/Stupid-Log/releases/tag/v1.0.0
