#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
WORK_DIR="$(mktemp -d)"
BIN_DIR="${WORK_DIR}/bin"

cleanup()
{
    rm -rf "$WORK_DIR"
}

trap cleanup EXIT
mkdir -p "$BIN_DIR"

cat >"${BIN_DIR}/docker" <<'EOF'
#!/bin/sh
exit 0
EOF

cat >"${BIN_DIR}/curl" <<'EOF'
#!/bin/sh
exit 0
EOF

chmod +x "${BIN_DIR}/docker" "${BIN_DIR}/curl"
export PATH="${BIN_DIR}:${PATH}"

run_installer()
{
    install_dir="$1"
    port="$2"

    sh "${ROOT_DIR}/scripts/install.sh" \
        --dir "$install_dir" \
        --port "$port" \
        --version 1.0.2 \
        --no-open \
        --yes >/dev/null
}

assert_environment_value()
{
    env_file="$1"
    expected="$2"

    grep -Fx "$expected" "$env_file" >/dev/null
}

fresh_install="${WORK_DIR}/fresh"
run_installer "$fresh_install" 18082
assert_environment_value "${fresh_install}/.env.production" "COMPOSE_PROJECT_NAME=stupid-log-18082"
! grep -Eq '^name:' "${fresh_install}/compose.production.yml"

legacy_install="${WORK_DIR}/legacy"
mkdir -p "$legacy_install"
printf 'APP_KEY=legacy-key\nDB_PASSWORD=legacy-password\nPOSTGRES_PASSWORD=legacy-password\n' >"${legacy_install}/.env.production"
run_installer "$legacy_install" 18083
assert_environment_value "${legacy_install}/.env.production" "COMPOSE_PROJECT_NAME=stupid-log"

isolated_install="${WORK_DIR}/isolated"
mkdir -p "$isolated_install"
printf 'COMPOSE_PROJECT_NAME=custom-project\n' >"${isolated_install}/.env.production"
run_installer "$isolated_install" 18084
assert_environment_value "${isolated_install}/.env.production" "COMPOSE_PROJECT_NAME=custom-project"

printf 'Installer project isolation tests passed.\n'
