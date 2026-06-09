#!/bin/sh

set -eu

DEFAULT_VERSION="1.0.2"
DEFAULT_PORT="8080"
DEFAULT_BIND_ADDRESS="127.0.0.1"
DEFAULT_INSTALL_DIR="${HOME}/stupid-log"
HEALTH_TIMEOUT_SECONDS=180

INSTALL_DIR="$DEFAULT_INSTALL_DIR"
VERSION="$DEFAULT_VERSION"
PORT="$DEFAULT_PORT"
BIND_ADDRESS="$DEFAULT_BIND_ADDRESS"
OPEN_BROWSER=true
ASSUME_YES=false

print_usage()
{
    cat <<'EOF'
Install Stupid Log using its published Docker image.

Usage:
  install.sh [options]

Options:
  --dir <path>       Install directory (default: $HOME/stupid-log)
  --version <value>  Image and application version (default: 1.0.2)
  --port <port>      Host port (default: 8080)
  --bind <address>   Host bind address (default: 127.0.0.1)
  --no-open          Do not open a browser
  --yes              Skip the interactive confirmation
  --help             Show this help
EOF
}

fail()
{
    printf 'Error: %s\n' "$1" >&2
    exit 1
}

require_value()
{
    option="$1"
    value="${2:-}"

    [ -n "$value" ] || fail "$option requires a value."
}

parse_arguments()
{
    while [ "$#" -gt 0 ]; do
        case "$1" in
            --dir)
                require_value "$1" "${2:-}"
                INSTALL_DIR="$2"
                shift 2
                ;;
            --version)
                require_value "$1" "${2:-}"
                VERSION="$2"
                shift 2
                ;;
            --port)
                require_value "$1" "${2:-}"
                PORT="$2"
                shift 2
                ;;
            --bind)
                require_value "$1" "${2:-}"
                BIND_ADDRESS="$2"
                shift 2
                ;;
            --no-open)
                OPEN_BROWSER=false
                shift
                ;;
            --yes)
                ASSUME_YES=true
                shift
                ;;
            --help|-h)
                print_usage
                exit 0
                ;;
            *)
                fail "Unknown option: $1"
                ;;
        esac
    done
}

expand_install_directory()
{
    case "$INSTALL_DIR" in
        "~")
            INSTALL_DIR="$HOME"
            ;;
        "~/"*)
            INSTALL_DIR="${HOME}/${INSTALL_DIR#~/}"
            ;;
    esac
}

validate_configuration()
{
    printf '%s\n' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' \
        || fail "Version must use MAJOR.MINOR.PATCH format."

    case "$PORT" in
        ''|*[!0-9]*)
            fail "Port must be a number between 1 and 65535."
            ;;
    esac

    [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] \
        || fail "Port must be a number between 1 and 65535."

    [ -n "$BIND_ADDRESS" ] || fail "Bind address cannot be empty."
    case "$BIND_ADDRESS" in
        *[[:space:]]*)
            fail "Bind address cannot contain whitespace."
            ;;
    esac
}

require_command()
{
    command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

verify_requirements()
{
    require_command docker
    require_command curl
    require_command base64
    require_command dd
    require_command od

    docker compose version >/dev/null 2>&1 \
        || fail "Docker Compose v2 is required. Install the docker compose plugin."
    docker info >/dev/null 2>&1 \
        || fail "Docker is installed, but the Docker daemon is unavailable."
}

print_security_warning()
{
    cat <<'EOF'

WARNING:
Stupid Log v1 is single-user and trusted LAN/VPN only.
It must not be exposed directly to the public internet.
EOF

    if [ "$BIND_ADDRESS" != "127.0.0.1" ]; then
        printf 'The requested bind address (%s) may make Stupid Log reachable by other devices.\n' "$BIND_ADDRESS"
    fi

    printf '\nInstall directory: %s\n' "$INSTALL_DIR"
    printf 'Application URL: %s\n\n' "$(application_url)"
}

confirm_installation()
{
    [ "$ASSUME_YES" = true ] && return

    if [ -r /dev/tty ] && [ -w /dev/tty ]; then
        printf 'Continue? [y/N] ' >/dev/tty
        read -r answer </dev/tty || answer=""
        case "$answer" in
            y|Y|yes|YES)
                return
                ;;
            *)
                printf 'Installation cancelled.\n'
                exit 0
                ;;
        esac
    fi
}

application_host()
{
    case "$BIND_ADDRESS" in
        0.0.0.0)
            printf '127.0.0.1'
            ;;
        *)
            printf '%s' "$BIND_ADDRESS"
            ;;
    esac
}

application_url()
{
    printf 'http://%s:%s' "$(application_host)" "$PORT"
}

generate_app_key()
{
    random_value="$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d '\r\n')"
    [ -n "$random_value" ] || fail "Could not generate APP_KEY."
    printf 'base64:%s' "$random_value"
}

generate_database_password()
{
    random_value="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \r\n')"
    [ "${#random_value}" -eq 64 ] || fail "Could not generate the database password."
    printf '%s' "$random_value"
}

read_environment_value()
{
    key="$1"
    awk -v key="$key" '
        index($0, key "=") == 1 {
            sub(/^[^=]*=/, "")
            sub(/\r$/, "")
            print
            exit
        }
    ' "$ENV_FILE"
}

set_environment_value()
{
    key="$1"
    value="$2"
    temporary_file="${ENV_FILE}.tmp.$$"

    awk -v key="$key" -v value="$value" '
        BEGIN { found = 0 }
        index($0, key "=") == 1 {
            if (!found) {
                print key "=" value
                found = 1
            }
            next
        }
        { print }
        END {
            if (!found) {
                print key "=" value
            }
        }
    ' "$ENV_FILE" >"$temporary_file"

    mv "$temporary_file" "$ENV_FILE"
}

resolve_database_password()
{
    existing_database_password="$(read_environment_value DB_PASSWORD)"
    existing_postgres_password="$(read_environment_value POSTGRES_PASSWORD)"

    if [ -n "$existing_database_password" ] && [ -n "$existing_postgres_password" ] \
        && [ "$existing_database_password" != "$existing_postgres_password" ]; then
        fail "DB_PASSWORD and POSTGRES_PASSWORD differ in $ENV_FILE. Make them identical before continuing."
    fi

    if [ -n "$existing_database_password" ]; then
        DATABASE_PASSWORD="$existing_database_password"
    elif [ -n "$existing_postgres_password" ]; then
        DATABASE_PASSWORD="$existing_postgres_password"
    else
        DATABASE_PASSWORD="$(generate_database_password)"
    fi
}

write_environment_file()
{
    ENV_FILE="${INSTALL_DIR}/.env.production"
    existing_install=true
    [ -f "$ENV_FILE" ] || [ -f "${INSTALL_DIR}/compose.production.yml" ] || existing_install=false
    umask 077

    if [ ! -f "$ENV_FILE" ]; then
        : >"$ENV_FILE"
    fi

    existing_app_key="$(read_environment_value APP_KEY)"
    if [ -n "$existing_app_key" ]; then
        APP_KEY="$existing_app_key"
    else
        APP_KEY="$(generate_app_key)"
    fi

    resolve_database_password
    COMPOSE_PROJECT_NAME="$(read_environment_value COMPOSE_PROJECT_NAME)"
    if [ -z "$COMPOSE_PROJECT_NAME" ]; then
        [ "$existing_install" = true ] && COMPOSE_PROJECT_NAME=stupid-log || COMPOSE_PROJECT_NAME="stupid-log-${PORT}"
    fi

    set_environment_value APP_NAME '"Stupid Log"'
    set_environment_value APP_VERSION "$VERSION"
    set_environment_value STUPID_LOG_IMAGE_VERSION "$VERSION"
    set_environment_value COMPOSE_PROJECT_NAME "$COMPOSE_PROJECT_NAME"
    set_environment_value APP_KEY "$APP_KEY"
    set_environment_value APP_URL "$(application_url)"
    set_environment_value APP_PORT "$PORT"
    set_environment_value STUPID_LOG_BIND_ADDRESS "$BIND_ADDRESS"
    set_environment_value APP_LOCALE en
    set_environment_value APP_FALLBACK_LOCALE en
    set_environment_value LOG_CHANNEL stderr
    set_environment_value LOG_LEVEL info
    set_environment_value DB_CONNECTION pgsql
    set_environment_value DB_HOST database
    set_environment_value DB_PORT 5432
    set_environment_value DB_DATABASE stupid_log
    set_environment_value DB_USERNAME stupid_log
    set_environment_value DB_PASSWORD "$DATABASE_PASSWORD"
    set_environment_value POSTGRES_DB stupid_log
    set_environment_value POSTGRES_USER stupid_log
    set_environment_value POSTGRES_PASSWORD "$DATABASE_PASSWORD"
    set_environment_value SESSION_DRIVER database
    set_environment_value SESSION_LIFETIME 120
    set_environment_value SESSION_ENCRYPT false
    set_environment_value CACHE_STORE database
    set_environment_value QUEUE_CONNECTION database
    set_environment_value FILESYSTEM_DISK local
    set_environment_value MAIL_MAILER log
}

write_compose_file()
{
    COMPOSE_FILE="${INSTALL_DIR}/compose.production.yml"

    cat >"$COMPOSE_FILE" <<'COMPOSE'
x-app: &app
  image: ghcr.io/insadamt/stupid-log:${STUPID_LOG_IMAGE_VERSION:-1.0.2}
  restart: unless-stopped
  env_file:
    - .env.production
  environment:
    APP_ENV: production
    APP_DEBUG: "false"
    DB_CONNECTION: pgsql
    DB_HOST: database
    DB_PORT: "5432"
    LOG_CHANNEL: stderr
    LOG_LEVEL: info
  volumes:
    - app-storage:/var/www/html/storage/app

services:
  app:
    <<: *app
    environment:
      APP_ENV: production
      APP_DEBUG: "false"
      DB_CONNECTION: pgsql
      DB_HOST: database
      DB_PORT: "5432"
      LOG_CHANNEL: stderr
      LOG_LEVEL: info
      RUN_MIGRATIONS: "true"
    ports:
      - "${STUPID_LOG_BIND_ADDRESS:-127.0.0.1}:${APP_PORT:-8080}:80"
    depends_on:
      database:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "--fail", "--silent", "http://localhost/up"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  scheduler:
    <<: *app
    command: ["php", "artisan", "schedule:work"]
    depends_on:
      app:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "php", "artisan", "schedule:list"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 30s

  database:
    image: postgres:17-alpine
    restart: unless-stopped
    env_file:
      - .env.production
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \"$${POSTGRES_USER}\" -d \"$${POSTGRES_DB}\""]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 10s
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  app-storage:
  postgres-data:
COMPOSE

    chmod 600 "$COMPOSE_FILE"
}

start_stack()
{
    printf 'Starting Stupid Log %s...\n' "$VERSION"
    (
        cd "$INSTALL_DIR"
        docker compose --env-file .env.production -f compose.production.yml up -d
    )
}

wait_for_application()
{
    url="$(application_url)/up"
    elapsed=0

    printf 'Waiting for %s' "$url"
    while [ "$elapsed" -lt "$HEALTH_TIMEOUT_SECONDS" ]; do
        if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1; then
            printf ' ready.\n'
            return
        fi

        printf '.'
        sleep 3
        elapsed=$((elapsed + 3))
    done

    printf '\n'
    (
        cd "$INSTALL_DIR"
        docker compose --env-file .env.production -f compose.production.yml ps
        docker compose --env-file .env.production -f compose.production.yml logs --tail 100 app
    ) >&2
    fail "Stupid Log did not become healthy within ${HEALTH_TIMEOUT_SECONDS} seconds."
}

open_application()
{
    [ "$OPEN_BROWSER" = true ] || return 1

    url="$(application_url)"
    system_name="$(uname -s 2>/dev/null || printf unknown)"

    case "$system_name" in
        Darwin*)
            command -v open >/dev/null 2>&1 || return 1
            open "$url" >/dev/null 2>&1 &
            ;;
        MINGW*|MSYS*|CYGWIN*)
            command -v cmd.exe >/dev/null 2>&1 || return 1
            cmd.exe /c start "" "$url" >/dev/null 2>&1
            ;;
        *)
            command -v xdg-open >/dev/null 2>&1 || return 1
            xdg-open "$url" >/dev/null 2>&1 &
            ;;
    esac
}

print_completion()
{
    url="$(application_url)"

    printf '\nStupid Log is running at:\n%s\n\n' "$url"
    printf 'Useful commands:\n'
    printf "  cd '%s'\n" "$INSTALL_DIR"
    printf '  docker compose --env-file .env.production -f compose.production.yml ps\n'
    printf '  docker compose --env-file .env.production -f compose.production.yml logs -f app\n'
    printf '  docker compose --env-file .env.production -f compose.production.yml down\n'
}

main()
{
    parse_arguments "$@"
    expand_install_directory
    validate_configuration
    verify_requirements
    print_security_warning
    confirm_installation

    mkdir -p "$INSTALL_DIR"
    write_environment_file
    write_compose_file
    start_stack
    wait_for_application

    open_application || true
    print_completion
}

main "$@"
