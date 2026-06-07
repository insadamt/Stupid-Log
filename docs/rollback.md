# Rollback

Rollback is an infrastructure recovery operation. Application migrations may not be reversible by switching images alone.

## Prepare

Before every upgrade, record the current commit or image and create:

- A portable Stupid Log backup
- A PostgreSQL dump
- An uploaded-media archive
- A copy of `.env.production`

Keep `APP_KEY` unchanged.

## Roll Back Code Only

Use this only when the newer version did not apply incompatible migrations:

```bash
git switch --detach <previous-tag-or-commit>
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml up -d
```

Verify `/up`, existing data, uploaded covers, and creation of new data.

## Restore the Full Pre-Upgrade State

If database migrations or stored data changed, stop the application and restore both the PostgreSQL dump and media archive from the same backup point. Follow [backup-and-restore.md](backup-and-restore.md).

Do not combine a database snapshot and media archive from different times. Do not run `migrate:rollback` unless the exact migration behavior has been reviewed and tested for that release.

## Failure Handling

If rollback verification fails:

1. Stop the app and scheduler.
2. Preserve logs and the failed database state.
3. Restore the last known-good database and media pair.
4. Start the previous image or source revision.
