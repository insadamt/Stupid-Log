# Production Install

## Requirements

- Docker Engine with Docker Compose v2
- `curl`
- A trusted LAN or private VPN
- Persistent local storage for PostgreSQL and uploaded media

Stupid Log v1 must not be exposed directly to the public internet.

## One-command Install

The installer uses the published container image and does not require Git, a local image build, or manual environment-file creation:

```bash
curl -fsSL https://raw.githubusercontent.com/insadamt/Stupid-Log/v1.0.1/scripts/install.sh | bash
```

By default, it installs into `~/stupid-log`, binds only to `127.0.0.1`, and opens `http://127.0.0.1:8080` after the health check succeeds.

Review the script first when installing on a machine you administer:

```bash
curl -fsSLO https://raw.githubusercontent.com/insadamt/Stupid-Log/v1.0.1/scripts/install.sh
less install.sh
bash install.sh
```

The installer is idempotent. Running it again reuses the installation directory and preserves the existing `APP_KEY` and database password.

### Installer Options

Use another port:

```bash
bash install.sh --port 8081
```

Use another directory or image version:

```bash
bash install.sh --dir /srv/stupid-log --version 1.0.1
```

Bind to a trusted LAN address:

```bash
bash install.sh --bind 192.168.1.20
```

Binding to `0.0.0.0` or a LAN address makes the application reachable by other devices. Only do this on a trusted LAN or private VPN with firewall controls. Never forward the port from the public internet.

Use `--no-open` to suppress browser opening and `--yes` to skip the interactive confirmation.

## Manage the Installation

Run commands from the installation directory:

```bash
cd ~/stupid-log
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs -f app
docker compose --env-file .env.production -f compose.production.yml stop
docker compose --env-file .env.production -f compose.production.yml start
docker compose --env-file .env.production -f compose.production.yml down
```

`down` removes containers and the network, but preserves the named data volumes.

## Update

Export a portable backup from **Settings > Data & Recovery** before updating. Then download the installer for the intended release and run it with the new version:

```bash
curl -fsSLO https://raw.githubusercontent.com/insadamt/Stupid-Log/v1.0.1/scripts/install.sh
less install.sh
bash install.sh --dir "$HOME/stupid-log" --version 1.0.1
```

The installer preserves existing secrets, data, and Compose project identity while updating the image version. A v1.0.0 installation keeps the legacy `stupid-log` project name so its existing volumes remain attached. Do not replace or regenerate `.env.production` during an update.

## Uninstall

Create and verify a portable backup before uninstalling. Uploaded media and PostgreSQL data are stored in Docker volumes, not only in `~/stupid-log`.

Stop the installation without deleting data:

```bash
cd ~/stupid-log
docker compose --env-file .env.production -f compose.production.yml down
```

Deleting the install directory does not delete the Docker volumes. The following command permanently deletes the database and uploaded media and must only be used after verifying a backup:

```bash
docker compose --env-file .env.production -f compose.production.yml down --volumes
```

## Manual Docker Compose Install

The repository's production Compose file provides a source-build fallback.

### Configure

```bash
cp .env.production.example .env.production
docker build -t stupid-log:1.0.1 .
docker run --rm --entrypoint php stupid-log:1.0.1 artisan key:generate --show
```

Edit `.env.production`:

1. Set `APP_KEY` to the generated value.
2. Set `APP_URL` to the trusted-network URL used to access the app.
3. Set `APP_PORT` if port `8080` is unavailable.
4. Replace `DB_PASSWORD` and `POSTGRES_PASSWORD` with the same strong password.

Never rotate `APP_KEY` on an existing installation unless encrypted provider credentials can be discarded and sessions invalidated.

### Start

```bash
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
```

Startup waits for PostgreSQL, runs migrations, seeds idempotent reference data, creates the public media link, caches Laravel configuration, and starts Apache. The scheduler starts after the application health check succeeds.

Open the configured `APP_URL` and complete setup. IGDB credentials are optional. Steam requires no API key.

### Verify

```bash
docker compose --env-file .env.production -f compose.production.yml exec app curl --fail http://localhost/up
docker compose --env-file .env.production -f compose.production.yml exec app php artisan migrate:status
docker compose --env-file .env.production -f compose.production.yml exec scheduler php artisan schedule:list
```

Manually create a game, restart the stack, and confirm the game and any uploaded cover remain available:

```bash
docker compose --env-file .env.production -f compose.production.yml restart
```

### Persistent Data

- `<project>_postgres-data`: PostgreSQL data
- `<project>_app-storage`: uploaded covers and application media

New installer deployments use `stupid-log-<port>` as the project name. Upgraded v1.0.0 installations retain `stupid-log`.

Do not run `docker compose down --volumes` on an installation containing data unless a verified backup exists and deletion is intentional.
