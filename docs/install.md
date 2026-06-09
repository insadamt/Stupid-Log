# Production Install

Stupid Log is designed for a self-hosted Docker deployment on a trusted machine. The production path uses PostgreSQL, persistent Docker volumes, a scheduler container, startup migrations, and health checks.

## Requirements

- Docker Engine with Docker Compose v2
- `curl`
- Persistent local storage for PostgreSQL and uploaded media
- Localhost, trusted LAN, or private VPN access

Stupid Log v1 must not be exposed directly to the public internet.

## Install

The installer uses the published container image. It does not require Git, local image building, or manual environment-file creation.

Download and review the installer before running it:

```bash
curl -fsSLO https://raw.githubusercontent.com/insadamt/Stupid-Log/v1.0.2/scripts/install.sh
less install.sh
bash install.sh
```

By default, it:

- installs into `~/stupid-log`;
- binds the app to `127.0.0.1`;
- exposes the app on port `8080`;
- generates the application key and database password;
- starts the app, scheduler, and PostgreSQL containers;
- waits for the health check;
- opens `http://127.0.0.1:8080`.

The installer is idempotent. Running it again reuses the installation directory and preserves the existing `APP_KEY`, database password, data volumes, and Compose project identity.

## Installer options

Use another port:

```bash
bash install.sh --port 8081
```

Use another directory or image version:

```bash
bash install.sh --dir /srv/stupid-log --version 1.0.2
```

Bind to a trusted LAN address:

```bash
bash install.sh --bind 192.168.1.20
```

Binding to `0.0.0.0` or a LAN address makes the application reachable by other devices. Only do this on a trusted LAN or private VPN with firewall controls. Never forward the port from the public internet.

Use `--no-open` to suppress browser opening and `--yes` to skip the interactive confirmation.

## Manage the installation

Run lifecycle commands from the installation directory:

```bash
cd ~/stupid-log
```

Show containers:

```bash
docker compose --env-file .env.production -f compose.production.yml ps
```

Follow app logs:

```bash
docker compose --env-file .env.production -f compose.production.yml logs -f app
```

Stop containers without deleting them:

```bash
docker compose --env-file .env.production -f compose.production.yml stop
```

Start stopped containers:

```bash
docker compose --env-file .env.production -f compose.production.yml start
```

Remove containers and the network while preserving data volumes:

```bash
docker compose --env-file .env.production -f compose.production.yml down
```

## Auto-start after reboot

The production containers use Docker restart policies. If Docker starts on boot and the containers were not removed with `docker compose down`, Stupid Log should start automatically after the device powers on.

Check Docker boot status:

```bash
systemctl is-enabled docker
```

Enable Docker auto-start:

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

If you ran `docker compose down`, start the stack again with:

```bash
cd ~/stupid-log
docker compose --env-file .env.production -f compose.production.yml up -d
```

## Update

Export a portable backup from **Settings > Data & Recovery** before updating. Then download the installer for the intended release and run it with the target version:

```bash
curl -fsSLO https://raw.githubusercontent.com/insadamt/Stupid-Log/v1.0.2/scripts/install.sh
less install.sh
bash install.sh --dir "$HOME/stupid-log" --version 1.0.2
```

The installer preserves existing secrets, data, and Compose project identity while updating the image version. A v1.0.0 installation keeps the legacy `stupid-log` project name so its existing volumes remain attached. Do not replace or regenerate `.env.production` during an update.

See [upgrade.md](upgrade.md) for the full checklist.

## Uninstall

Read [uninstall.md](uninstall.md) before deleting an installation.

`docker compose down` removes containers and the network, but preserves named data volumes. `docker compose down --volumes` permanently deletes the database and uploaded media.

## Manual Docker Compose install

The repository's production Compose file provides a source-build fallback.

### Configure

```bash
cp .env.production.example .env.production
docker build -t stupid-log:1.0.2 .
docker run --rm --entrypoint php stupid-log:1.0.2 artisan key:generate --show
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

## Persistent data

Persistent data is stored in Docker volumes, not only in the installation directory.

- `<project>_postgres-data`: PostgreSQL data
- `<project>_app-storage`: uploaded covers and application media

New installer deployments use `stupid-log-<port>` as the project name. Upgraded v1.0.0 installations retain `stupid-log`.

Do not run `docker compose down --volumes` on an installation containing data unless a verified backup exists and deletion is intentional.
