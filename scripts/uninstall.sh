#!/usr/bin/env bash
set -Eeuo pipefail

# BASH_SOURCE 兜底（同 install.sh）：管道执行时它不可用，退回 $0；两者都
# 没有时定位到当前目录，走下面的 bootstrap 分支（按设计）。
_SCRIPT_PATH="${BASH_SOURCE[0]:-${0:-}}"
PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$_SCRIPT_PATH")/.." 2>/dev/null && pwd -P || pwd -P)

# ── curl|bash 一键卸载引导（2026-10）─────────────────────────────────
# 用法：curl -fsSL <raw-url>/scripts/uninstall.sh | bash [-s -- --purge]
#
# 卸载不需要被卸仓库的源码，但需要**这份脚本本身**（删哪些路径、怎么停服务
# 的清单都在这里）。管道运行时不在 git 检出里 → 浅克隆到临时目录接力，
# 与 install.sh 同款；`--help` 短路以免为了看帮助先下载仓库。
if [[ ! -d "$PROJECT_ROOT/.git" ]] && [[ -z "${ECHO_PANEL_BOOTSTRAPPED:-}" ]]; then
    for arg in "$@"; do
        case "$arg" in
            -h|--help)
                echo "EchoAgentPanel uninstaller"
                echo
                echo "  在 git 检出内运行：scripts/uninstall.sh --help   （查看完整选项）"
                echo "  或先下载后运行："
                echo "    curl -fsSL <raw-url>/scripts/uninstall.sh -o /tmp/uninstall.sh"
                echo "    bash /tmp/uninstall.sh --help"
                exit 0
                ;;
        esac
    done

    DEFAULT_PANEL_REPO="https://github.com/EchoLab-Auto/EchoAgentPanel.git"
    bootstrap_repo=${ECHO_REPOSITORY_URL:-$DEFAULT_PANEL_REPO}
    echo "==> curl|bash bootstrap: cloning $bootstrap_repo (for uninstall assets)"
    if ! command -v git >/dev/null 2>&1; then
        echo "error: bootstrap 需要 git" >&2
        echo "      或直接下载脚本后运行：" >&2
        echo "      curl -fsSL <raw-url>/scripts/uninstall.sh -o /tmp/uninstall.sh && bash /tmp/uninstall.sh" >&2
        exit 1
    fi
    BOOTSTRAP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/echo-panel-uninstall.XXXXXX")
    trap 'rm -rf "$BOOTSTRAP_DIR"' EXIT
    clone_url=$bootstrap_repo
    if [[ -n "${ECHO_GITHUB_PROXY:-}" && "$bootstrap_repo" == https://github.com/* ]]; then
        echo "==> Using GitHub mirror: $ECHO_GITHUB_PROXY"
        clone_url="${ECHO_GITHUB_PROXY%/}/${bootstrap_repo}"
        if ! git clone --depth 1 "$clone_url" "$BOOTSTRAP_DIR/repo"; then
            echo "warning: mirror clone failed; retrying without mirror" >&2
            rm -rf -- "$BOOTSTRAP_DIR/repo"
            clone_url=$bootstrap_repo
        fi
    fi
    if [[ ! -d "$BOOTSTRAP_DIR/repo/.git" ]]; then
        git clone --depth 1 "$clone_url" "$BOOTSTRAP_DIR/repo" || {
            echo "error: 克隆失败——检查网络，或用 ECHO_REPOSITORY_URL 指定可达仓库" >&2
            exit 1
        }
    fi
    export ECHO_PANEL_BOOTSTRAPPED=1
    exec bash "$BOOTSTRAP_DIR/repo/scripts/uninstall.sh" "$@"
fi

PREFIX=${ECHO_PREFIX:-"$HOME/.local"}
CONFIG_HOME=${XDG_CONFIG_HOME:-"$HOME/.config"}
DATA_HOME=${XDG_DATA_HOME:-"$HOME/.local/share"}
STATE_HOME=${XDG_STATE_HOME:-"$HOME/.local/state"}
CONFIG_DIR="$CONFIG_HOME/echo-agent-panel"
DATA_DIR="$DATA_HOME/echo-agent-panel"
STATE_DIR="$STATE_HOME/echo-agent-panel"
LIBEXEC_DIR="$PREFIX/libexec/echo-agent-panel"
BIN_DIR="$PREFIX/bin"
SYSTEMD_DIR="$CONFIG_HOME/systemd/user"

PURGE=0
DRY_RUN=0

usage() {
    cat <<'EOF'
Usage: scripts/uninstall.sh [options]

Remove the EchoAgentPanel installation for the current user: the systemd
service units, the launcher, the runtime binary, the frontend build, and the
managed source checkout. The configuration (panel.toml) is kept by default so
a reinstall restores it; pass --purge to remove it as well.

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
  service:   $SYSTEMD_DIR/echo-agent-panel.service (+ update unit)
  launcher:  $BIN_DIR/echo-agent-panel
  libexec:   $LIBEXEC_DIR
  data:      $DATA_DIR
  state:     $STATE_DIR
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

echo "==> Stopping Panel service"
systemctl --user stop echo-agent-panel.service 2>/dev/null || true
systemctl --user disable echo-agent-panel.service 2>/dev/null || true
remove_file "$SYSTEMD_DIR/echo-agent-panel.service" "service unit"
remove_file "$SYSTEMD_DIR/echo-agent-panel-update.service" "update unit"
systemctl --user daemon-reload 2>/dev/null || true

remove_file "$BIN_DIR/echo-agent-panel" "launcher"
remove_dir "$LIBEXEC_DIR" "runtime libexec"
remove_dir "$DATA_DIR" "managed source checkout"
remove_dir "$STATE_DIR" "state directory"

if ((PURGE)); then
    remove_dir "$CONFIG_DIR" "config directory"
else
    echo "==> Keeping config: $CONFIG_DIR (re-run with --purge to remove)"
fi

echo
echo "Uninstall complete."
if ((!PURGE)); then
    echo "Config was kept at: $CONFIG_DIR"
fi
