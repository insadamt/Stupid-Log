# Production Install

## Requirements

- Docker Engine with Docker Compose v2
- A trusted LAN or private VPN
- Persistent local storage for PostgreSQL and uploaded media

Stupid Log v1.0.0 must not be exposed directly to the public internet.

## Configure

```bash
cp .env.production.example .env.production
docker build -t stupid-log:1.0.0 .
docker run --rm --entrypoint php stupid-log:1.0.0 artisan key:generate --show
```

Edit `.env.production`:

1. Set `APP_KEY` to the generated value.
2. Set `APP_URL` to the trusted-network URL used to access the app.
3. Set `APP_PORT` if port `8080` is unavailable.
4. Replace `DB_PASSWORD` and `POSTGRES_PASSWORD` with the same strong password.

Never rotate `APP_KEY` on an existing installation unless encrypted provider credentials can be discarded and sessions invalidated.

## Start

```bash
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
```

Startup waits for PostgreSQL, runs migrations, seeds idempotent reference data, creates the public media link, caches Laravel configuration, and starts Apache. The scheduler starts after the application health check succeeds.

Open the configured `APP_URL` and complete setup. IGDB credentials are optional. Steam requires no API key.

## Verify

```bash
docker compose --env-file .env.production -f compose.production.yml exec app curl --fail http://localhost/up
docker compose --env-file .env.production -f compose.production.yml exec app php artisan migrate:status
docker compose --env-file .env.production -f compose.production.yml exec scheduler php artisan schedule:list
```

Manually create a game, restart the stack, and confirm the game and any uploaded cover remain available:

```bash
docker compose --env-file .env.production -f compose.production.yml restart
```

## Persistent Data

- `stupid-log_postgres-data`: PostgreSQL data
- `stupid-log_app-storage`: uploaded covers and application media

Do not run `docker compose down --volumes` on an installation containing data unless a verified backup exists and deletion is intentional.
