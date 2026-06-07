# Stupid Log

Stupid Log is a self-hosted game library and play-history tracker. It records ownership, progress, achievements, DLCs, subscriptions, in-app purchases, yearly snapshots, and financial totals without requiring a cloud account.

## v1.0.0 Scope

- Local single-user setup
- Manual, IGDB, and public Steam metadata workflows
- Game ownership, devices, progress, achievements, DLCs, and purchases
- Subscription tracking and yearly snapshots
- Portable backup export and restore, including uploaded cover media
- PostgreSQL-backed production Docker deployment

Steam search and enrichment use public endpoints and do not require a Steam API key. IGDB credentials are optional and remain stored locally in encrypted form.

## Security Boundary

Stupid Log v1.0.0 is intended for trusted LAN or VPN access only. Do not expose it directly to the public internet. See [SECURITY.md](SECURITY.md) for the supported deployment boundary and vulnerability reporting process.

## Install

The production deployment uses `compose.production.yml`. The existing `docker-compose.yml` remains the development Compose path.

```bash
cp .env.production.example .env.production
docker build -t stupid-log:1.0.0 .
docker run --rm --entrypoint php stupid-log:1.0.0 artisan key:generate --show
```

Put the generated key in `.env.production`, replace both database password placeholders with the same strong value, then start the stack:

```bash
docker compose --env-file .env.production -f compose.production.yml up -d --build
```

Open `http://localhost:8080` unless `APP_PORT` was changed. Full instructions are in [docs/install.md](docs/install.md).

## Operations

- [Install](docs/install.md)
- [Upgrade](docs/upgrade.md)
- [Rollback](docs/rollback.md)
- [Backup and restore](docs/backup-and-restore.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)

Before tagging `v1.0.0`, manually verify a fresh install, upgrade, backup export, backup restore, restart persistence, and creation of new data after restore.

## Development

```bash
composer install
npm install
docker compose up -d
composer test
npm run build
```

The development Compose stack bind-mounts the repository and exposes the application on port `8080`.

## License

Stupid Log is licensed under GPL-3.0. See [LICENSE](LICENSE). Composer metadata uses the SPDX identifier `GPL-3.0-only`.
