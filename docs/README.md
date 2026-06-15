<p align="center">
  <img src="../public/images/stupid-log/stupid-log.png" alt="Stupid Log logo" width="150">
</p>

<h1 align="center">Stupid Log</h1>

<p align="center">
  A self-hosted game library, backlog, achievement, DLC, subscription, and financial tracker.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/release-1.1.0-B7FF63?style=for-the-badge&labelColor=000000" alt="Release 1.1.0">
  <img src="https://img.shields.io/badge/self--hosted-Docker-B7FF63?style=for-the-badge&labelColor=000000" alt="Self-hosted Docker">
  <img src="https://img.shields.io/badge/license-GPL--3.0--only-B7FF63?style=for-the-badge&labelColor=000000" alt="GPL-3.0-only license">
</p>

## What is Stupid Log?

Stupid Log is a local-first game tracking app for players who want to own their library data. It records what you own, where you own it, how far you progressed, what you completed, what you spent, and how your library changes year by year.

It is built as a single-user, self-hosted application. No cloud account is required.

## Features

| Area | What it tracks |
| --- | --- |
| Library | Games, covers, publishers, release dates, descriptions, platforms, and devices |
| Ownership | Digital, physical, subscription, free, and edition-based ownership copies |
| Progress | Status, playtime, first played date, last played date, completion date, and achievement progress |
| DLCs | Steam DLC import, owned DLCs, and paid DLC value |
| Money | Base value, paid value, subscriptions, in-app purchases, and yearly/all-time totals |
| Snapshots | Manual yearly snapshots, historical stats, and best-of-year selection |
| Providers | Manual entry, IGDB metadata search, and public Steam enrichment |
| Portability | Portable backup export and destructive restore with uploaded cover media |

Steam search and enrichment use public endpoints and do not require a Steam API key. IGDB credentials are optional and remain stored locally in encrypted form.

## Security boundary

Stupid Log v1 is intended for trusted LAN or private VPN access only.

Do not expose it directly to the public internet. v1 does not provide a public-internet authentication boundary. Use private networking, firewall rules, or a VPN.

See [SECURITY.md](SECURITY.md) for the supported deployment boundary and vulnerability reporting process.

## Quick install

Requirements:

- Docker Engine
- Docker Compose v2
- `curl`
- trusted LAN, localhost, or private VPN access

Install the published release:

```bash
curl -fsSL https://raw.githubusercontent.com/insadamt/Stupid-Log/v1.1.0/scripts/install.sh | bash
```

By default, the installer creates `~/stupid-log`, binds the app to `127.0.0.1:8080`, starts the published Docker image, waits for the health check, and opens the app.

Review the installer before running it:

```bash
curl -fsSLO https://raw.githubusercontent.com/insadamt/Stupid-Log/v1.1.0/scripts/install.sh
less install.sh
bash install.sh
```

Custom port example:

```bash
bash install.sh --port 8081
```

See [install.md](install.md) for custom directories, LAN binding, lifecycle commands, auto-start behavior, and persistent data notes.

## Update

Export a portable backup from **Settings > Data & Recovery** before updating.

```bash
cd ~/stupid-log
curl -fsSLO https://raw.githubusercontent.com/insadamt/Stupid-Log/v1.1.0/scripts/install.sh
bash install.sh --dir "$HOME/stupid-log" --version 1.1.0
```

Do not delete or regenerate `.env.production` during an update. See [upgrade.md](upgrade.md) for the full upgrade checklist.

## Backup and restore

Portable backups are exported from **Settings > Data & Recovery** as `.stupidlog.zip` archives. They include application data, snapshots, financial history, and uploaded cover media. Provider credentials are intentionally excluded and must be re-entered after restoring into a fresh installation.

See [backup-and-restore.md](backup-and-restore.md).

## Uninstall

Stopping the app is different from deleting its data.

```bash
cd ~/stupid-log
docker compose --env-file .env.production -f compose.production.yml down
```

The command above removes containers and the network while preserving Docker volumes. To permanently delete the database and uploaded media, read [uninstall.md](uninstall.md) first.

## Operations

- [Install](install.md)
- [Upgrade](upgrade.md)
- [Rollback](rollback.md)
- [Backup and restore](backup-and-restore.md)
- [Uninstall](uninstall.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)

## Development

```bash
composer install
npm install
docker compose up -d
composer test
npm run build
```

The development Compose stack bind-mounts the repository and exposes the application on port `8080`.

## Release discipline

Major or risky releases should be published as a pre-release or release candidate first, then promoted to stable only after fresh install, upgrade, backup, restore, restart persistence, and side-by-side install checks pass.

## License

Stupid Log is licensed under GPL-3.0. See [LICENSE](../LICENSE). Composer metadata uses the SPDX identifier `GPL-3.0-only`.
