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
CORE_CONFIG="$CONFIG_DIR/core.toml"
PANEL_CONFIG="$CONFIG_DIR/panel.toml"
STATUS_FILE="$STATE_DIR/update-status"
REPOSITORY_URL=${ECHO_REPOSITORY_URL:-}
OWNER_QQ=""
START_SERVICE=1
DRY_RUN=0

usage() {
    cat <<'EOF'
Usage: scripts/install.sh [options]

Install EchoAgentPanel for the current user and run Core as a systemd service.

Options:
  --owner-qq <number>   Set the QQ owner and authorize it for self-update
  --repository <url>    Upstream Git repository used by self-update
  --no-start            Install and enable units without starting Core
  --dry-run             Print resolved paths without changing the system
  -h, --help            Show this help
EOF
}

while (($#)); do
    case "$1" in
        --owner-qq)
            OWNER_QQ=${2:-}
            shift 2
            ;;
        --repository)
            REPOSITORY_URL=${2:-}
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

if [[ -n "$OWNER_QQ" && ! "$OWNER_QQ" =~ ^[0-9]+$ ]]; then
    echo "error: --owner-qq must be a numeric QQ ID" >&2
    exit 2
fi

if [[ -z "$REPOSITORY_URL" ]]; then
    REPOSITORY_URL=$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || true)
fi
if [[ "$REPOSITORY_URL" =~ ^git@github.com:(.+)$ ]]; then
    REPOSITORY_URL="https://github.com/${BASH_REMATCH[1]}"
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
  config:     $CONFIG_DIR
  state:      $STATE_DIR
  systemd:    $SYSTEMD_DIR
  repository: $REPOSITORY_URL
  branch:     $BRANCH
  start Core: $START_SERVICE
EOF
    exit 0
fi

for command in cargo git install sed systemctl flock; do
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

echo "==> Building release binary"
cargo build --release --locked -p echo --manifest-path "$SOURCE_DIR/Cargo.toml"
install -m 755 "$SOURCE_DIR/target/release/echo-agent-panel" \
    "$LIBEXEC_DIR/echo-agent-panel-bin.new"
mv -f "$LIBEXEC_DIR/echo-agent-panel-bin.new" "$LIBEXEC_DIR/echo-agent-panel-bin"
install -m 755 "$PROJECT_ROOT/scripts/update.sh" "$LIBEXEC_DIR/update.sh"

if [[ ! -f "$CORE_CONFIG" ]]; then
    install -m 600 "$PROJECT_ROOT/config/echo-agent-core.toml" "$CORE_CONFIG"
    escaped_source=${SOURCE_DIR//&/\\&}
    sed -i "s|^skills_dir = .*|skills_dir = \"$escaped_source/skills\"|" "$CORE_CONFIG"
    echo "==> Installed Core config: $CORE_CONFIG"
else
    echo "==> Preserved existing Core config: $CORE_CONFIG"
fi

if ! grep -q '^\[agent\.self_update\]$' "$CORE_CONFIG"; then
    cat >>"$CORE_CONFIG" <<'EOF'

[agent.self_update]
enabled = true
allow_local = true
allowed_qq_users = []
EOF
else
    sed -i '/^\[agent\.self_update\]$/,/^\[.*\]$/{s/^enabled = false$/enabled = true/;}' "$CORE_CONFIG"
fi
if [[ -n "$OWNER_QQ" ]]; then
    sed -i "s/^owner_qq = [0-9][0-9]*$/owner_qq = $OWNER_QQ/" "$CORE_CONFIG"
fi
if [[ ! -f "$PANEL_CONFIG" ]]; then
    install -m 600 "$PROJECT_ROOT/config/echo-agent-panel.toml" "$PANEL_CONFIG"
fi

cat >"$BIN_DIR/echo-agent-panel" <<EOF
#!/usr/bin/env sh
config="$PANEL_CONFIG"
has_config=0
for argument in "\$@"; do
    case "\$argument" in
        --core) config="$CORE_CONFIG" ;;
        -c|--config|--config=*) has_config=1 ;;
    esac
done
if [ "\$has_config" -eq 1 ]; then
    exec "$LIBEXEC_DIR/echo-agent-panel-bin" "\$@"
fi
exec "$LIBEXEC_DIR/echo-agent-panel-bin" --config "\$config" "\$@"
EOF
chmod 755 "$BIN_DIR/echo-agent-panel"

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
        -e "s|@CORE_CONFIG@|$CORE_CONFIG|g" \
        -e "s|@STATUS_FILE@|$STATUS_FILE|g" \
        -e "s|@SERVICE_PATH@|$SERVICE_PATH|g" \
        "$source" >"$destination"
    chmod 644 "$destination"
}

render_unit "$PROJECT_ROOT/packaging/systemd/echo-agent-panel-core.service.in" \
    "$SYSTEMD_DIR/echo-agent-panel-core.service"
render_unit "$PROJECT_ROOT/packaging/systemd/echo-agent-panel-update.service.in" \
    "$SYSTEMD_DIR/echo-agent-panel-update.service"

revision=$(git -C "$SOURCE_DIR" rev-parse HEAD)
printf '%s\n' "$revision" >"$STATE_DIR/installed-revision"
cat >"$STATUS_FILE" <<EOF
state=installed
revision=$revision
message=installation completed
EOF

systemctl --user daemon-reload
systemctl --user enable echo-agent-panel-core.service >/dev/null
if ((START_SERVICE)); then
    systemctl --user restart echo-agent-panel-core.service
fi

cat <<EOF

Installation complete.
  Panel:   $BIN_DIR/echo-agent-panel
  Config:  $CONFIG_DIR
  Service: systemctl --user status echo-agent-panel-core.service
  Logs:    journalctl --user -u echo-agent-panel-core.service -f

Ensure $BIN_DIR is in PATH, then run: echo-agent-panel
EOF
