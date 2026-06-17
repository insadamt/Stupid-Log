#!/usr/bin/env bash
set -euo pipefail

host="${STUPID_LOG_HOST:-127.0.0.1}"
port="${STUPID_LOG_PORT:-8000}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$root/public"

exec php \
    -d upload_max_filesize=512M \
    -d post_max_size=512M \
    -d memory_limit=512M \
    -d max_execution_time=300 \
    -d max_input_time=300 \
    -S "$host:$port" \
    ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
