#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
PREFIX=${ECHO_PREFIX:-"$HOME/.local"}
CONFIG_HOME=${XDG_CONFIG_HOME:-"$HOME/.config"}
DATA_HOME=${XDG_DATA_HOME:-"$HOME/.local/share"}
STATE_HOME=${XDG_STATE_HOME:-"$HOME/.local/state"}
CONFIG_DIR="$CONFIG_HOME/echo-agent-panel"
DATA_DIR="$DATA_HOME/echo-agent-panel"
STATE_DIR="$STATE_HOME/echo-agent-panel"
SOURCE_DIR="$DATA_DIR/source"
LIBEXEC_DIR="$PREFIX/libexec/echo-agent-panel"
BIN_DIR="$PREFIX/bin"
SYSTEMD_DIR="$CONFIG_HOME/systemd/user"
PANEL_CONFIG="$CONFIG_DIR/panel.toml"
STATIC_DIR="$LIBEXEC_DIR/web"
STATUS_FILE="$STATE_DIR/update-status"
REPOSITORY_URL=${ECHO_REPOSITORY_URL:-}
START_SERVICE=1
DRY_RUN=0

usage() {
    cat <<'EOF'
Usage: scripts/install.sh [options]

Install EchoAgentPanel for the current user and run it as a systemd service
(Rust backend + React frontend). The backend relays a browser WebSocket to the
EchoAgentCore management WS and serves the built frontend.

Prerequisites: the Rust toolchain, Node.js (npm) and a systemd user manager
must be available. The EchoAgentCore service must be running for the panel to
be useful.

Options:
  --repository <url>  Upstream Git repository stored in the managed checkout
  --no-start          Install and enable units without starting the Panel
  --dry-run           Print resolved paths without changing the system
  -h, --help          Show this help
EOF
}

while (($#)); do
    case "$1" in
        --repository)
            if (($# < 2)) || [[ -z "$2" ]]; then
                echo "error: --repository requires a URL" >&2
                exit 2
            fi
            REPOSITORY_URL=$2
            shift 2
            ;;
        --no-start)
            START_SERVICE=0
            shift
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "error: unknown option: $1" >&2
            usage >&2
            exit 2
            ;;
    esac
done

if [[ -z "$REPOSITORY_URL" ]]; then
    REPOSITORY_URL=$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || true)
fi
if [[ "$REPOSITORY_URL" =~ ^git@([^:]+):(.+)$ ]]; then
    REPOSITORY_URL="https://${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
fi
if [[ -z "$REPOSITORY_URL" ]]; then
    REPOSITORY_URL="https://github.com/EchoLab-Auto/EchoAgentPanel.git"
fi

BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || true)
BRANCH=${BRANCH:-main}

if ((DRY_RUN)); then
    cat <<EOF
EchoAgentPanel install plan
  project:    $PROJECT_ROOT
  source:     $SOURCE_DIR
  binary:     $LIBEXEC_DIR/echo-agent-panel-bin
  frontend:   $STATIC_DIR
  launcher:   $BIN_DIR/echo-agent-panel
  config:     $PANEL_CONFIG
  state:      $STATE_DIR
  systemd:    $SYSTEMD_DIR
  repository: $REPOSITORY_URL
  branch:     $BRANCH
  start:      $START_SERVICE
EOF
    exit 0
fi

for command in cargo git install sed systemctl flock cp stat npm node; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "error: required command not found: $command" >&2
        exit 1
    fi
done

if [[ "$(uname -s)" != "Linux" ]]; then
    echo "error: the service installer currently supports Linux/systemd only" >&2
    exit 1
fi
if ! systemctl --user show-environment >/dev/null 2>&1; then
    echo "error: systemd user manager is unavailable for this user" >&2
    exit 1
fi

install -d -m 755 "$BIN_DIR" "$LIBEXEC_DIR" "$CONFIG_DIR" "$DATA_DIR" "$STATE_DIR" "$SYSTEMD_DIR"

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
    if [[ -e "$SOURCE_DIR" ]]; then
        echo "error: managed source path exists but is not a Git checkout: $SOURCE_DIR" >&2
        exit 1
    fi
    echo "==> Creating managed source checkout"
    git clone --local --no-hardlinks --branch "$BRANCH" "$PROJECT_ROOT" "$SOURCE_DIR"
    git -C "$SOURCE_DIR" remote set-url origin "$REPOSITORY_URL"
else
    echo "==> Reusing managed source checkout: $SOURCE_DIR"
    if ! git -C "$SOURCE_DIR" diff --quiet || ! git -C "$SOURCE_DIR" diff --cached --quiet; then
        echo "error: managed source has tracked local changes: $SOURCE_DIR" >&2
        exit 1
    fi
    managed_revision=$(git -C "$SOURCE_DIR" rev-parse HEAD)
    project_revision=$(git -C "$PROJECT_ROOT" rev-parse HEAD)
    if git -C "$PROJECT_ROOT" merge-base --is-ancestor "$managed_revision" "$project_revision"; then
        git -C "$SOURCE_DIR" fetch "$PROJECT_ROOT" "$BRANCH"
        git -C "$SOURCE_DIR" merge --ff-only FETCH_HEAD
    elif [[ "$managed_revision" != "$project_revision" ]]; then
        echo "warning: managed source diverged from this checkout; preserving $managed_revision" >&2
    fi
    git -C "$SOURCE_DIR" remote set-url origin "$REPOSITORY_URL"
fi

echo "==> Building Rust backend"
cargo build --release --locked -p echo-web-server --manifest-path "$SOURCE_DIR/Cargo.toml"

echo "==> Building web frontend"
(
    cd "$SOURCE_DIR/web"
    if [[ -f package-lock.json ]]; then
        npm ci
    else
        npm install
    fi
    npm run build
)

# Keep every file that can affect a running installation until the new service
# has been reloaded and passes its health check. This makes re-running the
# installer recoverable even when activation fails after a successful build.
ROLLBACK_DIR="$STATE_DIR/install-rollback"
install -d -m 700 "$ROLLBACK_DIR"
for rollback_file in binary updater launcher panel_unit update_unit panel_config revision status; do
    rm -f "$ROLLBACK_DIR/$rollback_file"
done
rm -rf "$ROLLBACK_DIR/web"

snapshot_file() {
    local source=$1 destination=$2
    if [[ -e "$source" ]]; then
        cp -p -- "$source" "$destination"
    fi
}

restore_file() {
    local source=$1 backup=$2
    if [[ -e "$backup" ]]; then
        cp -p -- "$backup" "$source"
    else
        rm -f -- "$source"
    fi
}

snapshot_file "$LIBEXEC_DIR/echo-agent-panel-bin" "$ROLLBACK_DIR/binary"
snapshot_file "$LIBEXEC_DIR/update.sh" "$ROLLBACK_DIR/updater"
snapshot_file "$BIN_DIR/echo-agent-panel" "$ROLLBACK_DIR/launcher"
snapshot_file "$SYSTEMD_DIR/echo-agent-panel.service" "$ROLLBACK_DIR/panel_unit"
snapshot_file "$SYSTEMD_DIR/echo-agent-panel-update.service" "$ROLLBACK_DIR/update_unit"
snapshot_file "$PANEL_CONFIG" "$ROLLBACK_DIR/panel_config"
snapshot_file "$STATE_DIR/installed-revision" "$ROLLBACK_DIR/revision"
snapshot_file "$STATUS_FILE" "$ROLLBACK_DIR/status"
if [[ -d "$STATIC_DIR" ]]; then
    cp -a "$STATIC_DIR" "$ROLLBACK_DIR/web"
fi

INSTALL_TRANSACTION=1
INSTALL_PHASE=installing
install_rollback() {
    local code=$?
    trap - ERR
    set +e
    if [[ "${INSTALL_TRANSACTION:-0}" == 1 ]]; then
        restore_file "$LIBEXEC_DIR/echo-agent-panel-bin" "$ROLLBACK_DIR/binary"
        restore_file "$LIBEXEC_DIR/update.sh" "$ROLLBACK_DIR/updater"
        restore_file "$BIN_DIR/echo-agent-panel" "$ROLLBACK_DIR/launcher"
        restore_file "$SYSTEMD_DIR/echo-agent-panel.service" "$ROLLBACK_DIR/panel_unit"
        restore_file "$SYSTEMD_DIR/echo-agent-panel-update.service" "$ROLLBACK_DIR/update_unit"
        restore_file "$PANEL_CONFIG" "$ROLLBACK_DIR/panel_config"
        restore_file "$STATE_DIR/installed-revision" "$ROLLBACK_DIR/revision"
        if [[ -d "$ROLLBACK_DIR/web" ]]; then
            rm -rf "$STATIC_DIR"
            cp -a "$ROLLBACK_DIR/web" "$STATIC_DIR"
        fi
        systemctl --user daemon-reload >/dev/null 2>&1 || true
        if [[ "${panel_was_enabled:-0}" == 1 ]]; then
            systemctl --user enable echo-agent-panel.service >/dev/null 2>&1 || true
        else
            systemctl --user disable echo-agent-panel.service >/dev/null 2>&1 || true
        fi
        if [[ "${panel_was_active:-0}" == 1 ]]; then
            systemctl --user restart echo-agent-panel.service >/dev/null 2>&1 || true
        fi
        local temporary="$STATUS_FILE.tmp"
        {
            printf 'state=rolled_back\n'
            printf 'revision=%s\n' "$(cat "$STATE_DIR/installed-revision" 2>/dev/null || echo unknown)"
            printf 'message=installation failed during %s; restored previous installation\n' "${INSTALL_PHASE:-unknown}"
            printf 'updated_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        } >"$temporary"
        mv -f "$temporary" "$STATUS_FILE" || true
        INSTALL_TRANSACTION=0
    fi
    exit "$code"
}
trap install_rollback ERR

binary_temporary=$(mktemp "$LIBEXEC_DIR/echo-agent-panel-bin.new.XXXXXX")
install -m 755 "$SOURCE_DIR/target/release/echo-agent-panel" "$binary_temporary"
mv -f "$binary_temporary" "$LIBEXEC_DIR/echo-agent-panel-bin"
updater_temporary=$(mktemp "$LIBEXEC_DIR/update.sh.new.XXXXXX")
install -m 755 "$PROJECT_ROOT/scripts/update.sh" "$updater_temporary"
mv -f "$updater_temporary" "$LIBEXEC_DIR/update.sh"

if [[ ! -f "$PANEL_CONFIG" ]]; then
    install -m 600 "$PROJECT_ROOT/config/echo-agent-panel.toml" "$PANEL_CONFIG"
    echo "==> Installed Panel config: $PANEL_CONFIG"
else
    echo "==> Preserved existing Panel config: $PANEL_CONFIG"
fi

INSTALL_PHASE=launcher
launcher_temporary=$(mktemp "$BIN_DIR/echo-agent-panel.new.XXXXXX")
cat >"$launcher_temporary" <<EOF
#!/usr/bin/env sh
exec "$LIBEXEC_DIR/echo-agent-panel-bin" --config "$PANEL_CONFIG" --static-dir "$STATIC_DIR" "\$@"
EOF
chmod 755 "$launcher_temporary"
mv -f "$launcher_temporary" "$BIN_DIR/echo-agent-panel"

rm -rf "$STATIC_DIR"
cp -a "$SOURCE_DIR/web/dist" "$STATIC_DIR"

SERVICE_PATH=$(printf '%s\n' \
    "$(dirname -- "$(command -v cargo)")" \
    "$(dirname -- "$(command -v git)")" \
    "$(dirname -- "$(command -v install)")" \
    "$(dirname -- "$(command -v flock)")" \
    "$BIN_DIR" /usr/local/bin /usr/bin /bin | awk '!seen[$0]++' | paste -sd: -)

render_unit() {
    local source=$1 destination=$2
    sed \
        -e "s|@BINARY@|$LIBEXEC_DIR/echo-agent-panel-bin|g" \
        -e "s|@UPDATE_SCRIPT@|$LIBEXEC_DIR/update.sh|g" \
        -e "s|@SOURCE_DIR@|$SOURCE_DIR|g" \
        -e "s|@PANEL_CONFIG@|$PANEL_CONFIG|g" \
        -e "s|@STATIC_DIR@|$STATIC_DIR|g" \
        -e "s|@STATUS_FILE@|$STATUS_FILE|g" \
        -e "s|@SERVICE_PATH@|$SERVICE_PATH|g" \
        "$source" >"$destination"
    chmod 644 "$destination"
}

INSTALL_PHASE=units
render_unit "$PROJECT_ROOT/packaging/systemd/echo-agent-panel.service.in" \
    "$SYSTEMD_DIR/echo-agent-panel.service"
render_unit "$PROJECT_ROOT/packaging/systemd/echo-agent-panel-update.service.in" \
    "$SYSTEMD_DIR/echo-agent-panel-update.service"

INSTALL_PHASE=state
revision=$(git -C "$SOURCE_DIR" rev-parse HEAD)
revision_temporary=$(mktemp "$STATE_DIR/installed-revision.new.XXXXXX")
printf '%s\n' "$revision" >"$revision_temporary"
mv -f "$revision_temporary" "$STATE_DIR/installed-revision"
status_temporary=$(mktemp "$STATUS_FILE.new.XXXXXX")
cat >"$status_temporary" <<EOF
state=installed
revision=$revision
message=installation completed
EOF
mv -f "$status_temporary" "$STATUS_FILE"

INSTALL_PHASE=activating
systemctl --user daemon-reload
systemctl --user enable echo-agent-panel.service >/dev/null
if ((START_SERVICE)); then
    systemctl --user restart echo-agent-panel.service
    panel_healthy=0
    healthy_checks=0
    for _ in {1..15}; do
        sleep 1
        if systemctl --user is-active --quiet echo-agent-panel.service; then
            ((healthy_checks += 1))
            if ((healthy_checks >= 3)); then
                panel_healthy=1
                break
            fi
        else
            healthy_checks=0
        fi
    done
    if ((panel_healthy == 0)); then
        echo "error: Panel did not become active after installation" >&2
        false
    fi
fi

INSTALL_TRANSACTION=0
for rollback_file in "$ROLLBACK_DIR"/*; do
    if [[ -e "$rollback_file" ]]; then
        rm -f -- "$rollback_file"
    fi
done
rm -rf "$ROLLBACK_DIR/web"
rmdir "$ROLLBACK_DIR" 2>/dev/null || true

cat <<EOF

Installation complete.
  Launcher: $BIN_DIR/echo-agent-panel
  Config:   $PANEL_CONFIG
  Service:  systemctl --user status echo-agent-panel.service
  Logs:     journalctl --user -u echo-agent-panel.service -f
  Update:   systemctl --user start echo-agent-panel-update.service
  Web:      http://<你的服务器IP>:8080  (地址取决于 [server] bind_address)
EOF
