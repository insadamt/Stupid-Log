#!/usr/bin/env sh

set -eu

cd /var/www/html

require_app_key() {
    if [ -z "${APP_KEY:-}" ]; then
        echo "APP_KEY is required. Generate one with: php artisan key:generate --show" >&2
        exit 1
    fi
}

prepare_writable_directories() {
    rm -f bootstrap/cache/*.php

    mkdir -p \
        bootstrap/cache \
        storage/app/private \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs

    chown -R www-data:www-data bootstrap/cache storage
    php artisan storage:link --force --no-interaction
}

wait_for_database() {
    attempts=0

    until php artisan db:show --no-interaction >/dev/null 2>&1; do
        attempts=$((attempts + 1))

        if [ "$attempts" -ge 30 ]; then
            echo "Database did not become ready within 60 seconds." >&2
            exit 1
        fi

        sleep 2
    done
}

prepare_application() {
    require_app_key
    prepare_writable_directories
    wait_for_database

    if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
        php artisan migrate --force --no-interaction
        php artisan db:seed --class=Database\\Seeders\\StupidLogReferenceSeeder --force --no-interaction
    fi

    php artisan package:discover --no-interaction
    php artisan config:cache
    php artisan view:cache
}

prepare_application

if [ "$1" = "apache2-foreground" ]; then
    exec "$@"
fi

if [ "$(id -u)" = "0" ]; then
    exec runuser -u www-data -- "$@"
fi

exec "$@"
