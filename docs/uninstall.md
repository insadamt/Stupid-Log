# Uninstall

Uninstalling Stupid Log has two levels. Choose the correct one before running commands.

## Stop and remove containers, keep data

Use this when you want to stop the app but keep the PostgreSQL database and uploaded covers/media for later use.

```bash
cd ~/stupid-log
docker compose --env-file .env.production -f compose.production.yml down
```

This removes containers and the Docker network, but keeps the named volumes.

## Delete the app and all data

Use this only after exporting and verifying a portable backup from **Settings > Data & Recovery**.

```bash
cd ~/stupid-log
docker compose --env-file .env.production -f compose.production.yml down --volumes
rm -rf ~/stupid-log
```

This permanently deletes:

- app containers;
- Docker network;
- PostgreSQL data volume;
- uploaded covers/media volume;
- local installation directory.

## Optional image cleanup

List local Stupid Log images:

```bash
docker image ls | grep stupid-log
```

Remove an unused image tag:

```bash
docker image rm ghcr.io/insadamt/stupid-log:1.0.1
```

If Docker reports that the image is still in use, stop and remove the related containers first.

## Safety checklist

Before destructive removal, confirm:

- a portable backup was exported;
- the backup file exists outside the installation directory;
- you understand that Docker volumes store the database and uploaded media;
- deleting `~/stupid-log` alone does not delete Docker volumes;
- `down --volumes` is intentional.
