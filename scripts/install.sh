#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
PREFIX=${ECHO_PREFIX:-"$HOME/.local"}
CONFIG_HOME=${XDG_CONFIG_HOME:-"$HOME/.config"}
DATA_HOME=${XDG_DATA_HOME:-"$HOME/.local/share"}
CONFIG_DIR="$CONFIG_HOME/echo-agent-panel"
DATA_DIR="$DATA_HOME/echo-agent-panel"
SOURCE_DIR="$DATA_DIR/source"
LIBEXEC_DIR="$PREFIX/libexec/echo-agent-panel"
BIN_DIR="$PREFIX/bin"
PANEL_CONFIG="$CONFIG_DIR/panel.toml"
REPOSITORY_URL=${ECHO_REPOSITORY_URL:-}
DRY_RUN=0

usage() {
    cat <<'EOF'
Usage: scripts/install.sh [options]

Install the EchoAgentPanel TUI for the current user.

The Panel is only the frontend: it connects to an EchoAgentCore service
(agent core, separate repository) over WebSocket. Install/start the Core
first (see EchoAgentCore's scripts/install.sh), then point this Panel at it
via [core] connect_url in panel.toml or --connect.

Prerequisite: the EchoAgentCore repository must be checked out next to this
one (echo-tui depends on its echo-protocol crate via a relative path).

Options:
  --repository <url>  Upstream Git repository stored in the managed checkout
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
  launcher:   $BIN_DIR/echo-agent-panel
  config:     $PANEL_CONFIG
  repository: $REPOSITORY_URL
  branch:     $BRANCH
  requires:   $PROJECT_ROOT/../EchoAgentCore (echo-protocol path dependency)
EOF
    exit 0
fi

for command in cargo git install; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "error: required command not found: $command" >&2
        exit 1
    fi
done

install -d -m 755 "$BIN_DIR" "$LIBEXEC_DIR" "$CONFIG_DIR" "$DATA_DIR"

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

echo "==> Building release binary"
cargo build --release --locked -p echo --manifest-path "$PROJECT_ROOT/Cargo.toml"

binary_temporary=$(mktemp "$LIBEXEC_DIR/echo-agent-panel-bin.new.XXXXXX")
install -m 755 "$PROJECT_ROOT/target/release/echo-agent-panel" "$binary_temporary"
mv -f "$binary_temporary" "$LIBEXEC_DIR/echo-agent-panel-bin"

if [[ ! -f "$PANEL_CONFIG" ]]; then
    install -m 600 "$PROJECT_ROOT/config/echo-agent-panel.toml" "$PANEL_CONFIG"
    echo "==> Installed Panel config: $PANEL_CONFIG"
else
    echo "==> Preserved existing Panel config: $PANEL_CONFIG"
fi

launcher_temporary=$(mktemp "$BIN_DIR/echo-agent-panel.new.XXXXXX")
cat >"$launcher_temporary" <<EOF
#!/usr/bin/env sh
has_config=0
for argument in "\$@"; do
    case "\$argument" in
        -c|--config|--config=*) has_config=1 ;;
    esac
done
if [ "\$has_config" -eq 1 ]; then
    exec "$LIBEXEC_DIR/echo-agent-panel-bin" "\$@"
fi
exec "$LIBEXEC_DIR/echo-agent-panel-bin" --config "$PANEL_CONFIG" "\$@"
EOF
chmod 755 "$launcher_temporary"
mv -f "$launcher_temporary" "$BIN_DIR/echo-agent-panel"

cat <<EOF

Installation complete.
  Panel:  $BIN_DIR/echo-agent-panel
  Config: $PANEL_CONFIG
  Source: $SOURCE_DIR

Ensure $BIN_DIR is in PATH, the EchoAgentCore service is running, then run: echo-agent-panel
EOF
