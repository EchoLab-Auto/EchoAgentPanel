#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
PREFIX=${ECHO_PREFIX:-"$HOME/.local"}
CONFIG_HOME=${XDG_CONFIG_HOME:-"$HOME/.config"}
DATA_HOME=${XDG_DATA_HOME:-"$HOME/.local/share"}
CONFIG_DIR="$CONFIG_HOME/echo-agent-panel"
DATA_DIR="$DATA_HOME/echo-agent-panel"
LIBEXEC_DIR="$PREFIX/libexec/echo-agent-panel"
BIN_DIR="$PREFIX/bin"

PURGE=0
DRY_RUN=0

usage() {
    cat <<'EOF'
Usage: scripts/uninstall.sh [options]

Remove the EchoAgentPanel installation for the current user: the launcher,
the runtime binary, the frontend build, and the managed source checkout.
The configuration (panel.toml) is kept by default so a reinstall restores
it; pass --purge to remove it as well.

The EchoAgentCore service is unaffected — uninstall it separately with
EchoAgentCore's scripts/uninstall.sh.

Options:
  --purge      Also remove the config directory ($CONFIG_HOME/echo-agent-panel)
  --dry-run    Print resolved paths without changing the system
  -h, --help   Show this help
EOF
}

while (($#)); do
    case "$1" in
        --purge)
            PURGE=1
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

if ((DRY_RUN)); then
    cat <<EOF
EchoAgentPanel uninstall plan
  launcher:  $BIN_DIR/echo-agent-panel
  libexec:   $LIBEXEC_DIR
  data:      $DATA_DIR
  config:    $CONFIG_DIR ($( ((PURGE)) && echo "will be removed" || echo "kept — use --purge to remove" ))
EOF
    exit 0
fi

remove_dir() {
    local dir=$1 label=$2
    if [[ -n "$dir" && "$dir" != "/" && "$dir" != "$HOME" && -d "$dir" ]]; then
        echo "==> Removing $label: $dir"
        rm -rf -- "$dir"
    fi
}

remove_file() {
    local file=$1 label=$2
    if [[ -n "$file" && -e "$file" ]]; then
        echo "==> Removing $label: $file"
        rm -f -- "$file"
    fi
}

remove_file "$BIN_DIR/echo-agent-panel" "launcher"
remove_dir "$LIBEXEC_DIR" "runtime libexec"
remove_dir "$DATA_DIR" "managed source checkout"

if ((PURGE)); then
    remove_dir "$CONFIG_DIR" "config directory"
else
    echo "==> Keeping config: $CONFIG_DIR (re-run with --purge to remove)"
fi

echo
echo "Uninstall complete."
if ((!PURGE)); then
    echo "  Config kept at: $CONFIG_DIR"
fi
echo "  Reinstall with: scripts/install.sh"
