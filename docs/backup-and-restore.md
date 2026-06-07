# Backup and Restore

Stupid Log supports portable application backups and infrastructure snapshots. Use both before upgrades.

## Portable Backup

In **Settings > Data & Recovery**, export a `.stupidlog.zip` archive. It includes application tables, snapshots, financial data, and uploaded cover media with checksums.

Portable backups exclude provider credentials. After restoring into a fresh installation, re-enter IGDB credentials. Steam requires no credentials.

Store backups outside the Docker host and test restoration periodically.

## Portable Restore

From an initialized installation:

1. Export a current backup.
2. Open **Settings > Data & Recovery**.
3. Upload and preview the archive.
4. Confirm the destructive restore with `RESTORE`.
5. Verify counts, covers, snapshots, and financial data.
6. Create a new game and confirm its identifier does not collide with restored data.

From a fresh installation, choose backup import on the setup screen. Provider credentials can be entered after the restore.

## PostgreSQL Snapshot

Create a backup directory and dump PostgreSQL:

```bash
mkdir -p backups
docker compose --env-file .env.production -f compose.production.yml exec -T database \
  sh -c 'pg_dump -U "$POSTGRES_USER" --format=custom "$POSTGRES_DB"' \
  > backups/stupid-log-postgres.dump
```

Restore into an empty database:

```bash
docker compose --env-file .env.production -f compose.production.yml stop app scheduler
docker compose --env-file .env.production -f compose.production.yml exec -T database \
  sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file .env.production -f compose.production.yml exec -T database \
  sh -c 'pg_restore -U "$POSTGRES_USER" --clean --if-exists --no-owner --dbname="$POSTGRES_DB"' \
  < backups/stupid-log-postgres.dump
```

## Media Snapshot

Back up the named media volume:

```bash
docker run --rm \
  -v stupid-log_app-storage:/data:ro \
  -v "$PWD/backups":/backup \
  alpine tar -czf /backup/stupid-log-media.tar.gz -C /data .
```

Restore it only while the app and scheduler are stopped:

```bash
docker compose --env-file .env.production -f compose.production.yml stop app scheduler
docker run --rm \
  -v stupid-log_app-storage:/data \
  -v "$PWD/backups":/backup:ro \
  alpine sh -c 'find /data -mindepth 1 -delete && tar -xzf /backup/stupid-log-media.tar.gz -C /data'
```

Start and verify:

```bash
docker compose --env-file .env.production -f compose.production.yml up -d
docker compose --env-file .env.production -f compose.production.yml exec app curl --fail http://localhost/up
```

Confirm restart persistence and create new data after every restore.
