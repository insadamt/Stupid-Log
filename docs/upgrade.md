# Upgrade

## Before Upgrading

1. Read [CHANGELOG.md](../CHANGELOG.md).
2. Export a portable backup from **Settings > Data & Recovery**.
3. Create infrastructure snapshots using [backup-and-restore.md](backup-and-restore.md).
4. Preserve the current source revision or image identifier for rollback.
5. Keep the existing `.env.production` and `APP_KEY`.

## Upgrade the Source Deployment

Fetch the intended release and inspect the exact version before rebuilding:

```bash
git fetch --tags
git switch --detach v1.0.2
docker compose --env-file .env.production -f compose.production.yml build --pull
docker compose --env-file .env.production -f compose.production.yml up -d
```

The application service runs pending migrations and idempotent reference seeding before Apache starts. The scheduler waits for application health.

## Verify

```bash
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml exec app curl --fail http://localhost/up
docker compose --env-file .env.production -f compose.production.yml exec app php artisan migrate:status
```

Manually verify:

- Existing library data and uploaded covers
- Provider search
- Backup export
- Restart persistence
- Creation of a new game after the upgrade

Do not delete pre-upgrade backups until the upgraded installation has been used successfully.
