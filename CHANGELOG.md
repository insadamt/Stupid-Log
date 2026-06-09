# Changelog

All notable changes to Stupid Log are documented here. The project follows semantic versioning.

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

[1.0.2]: https://github.com/insadamt/Stupid-Log/releases/tag/v1.0.2
[1.0.1]: https://github.com/insadamt/Stupid-Log/releases/tag/v1.0.1
[1.0.0]: https://github.com/insadamt/Stupid-Log/releases/tag/v1.0.0
