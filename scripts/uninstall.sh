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

# 路径按「装着这份安装的那个用户」推导（与 install.sh 的 derive_paths 同形）。
# system 作用域下安装属于 root，卸载也要从 root 的家目录算——否则普通用户执行
# `--scope system --dry-run` 会打印出调用者自己的路径，看着像要删错东西。
derive_paths() {
    local home=$1 use_xdg=$2
    PREFIX=${ECHO_PREFIX:-"$home/.local"}
    if ((use_xdg)); then
        CONFIG_HOME=${XDG_CONFIG_HOME:-"$home/.config"}
        DATA_HOME=${XDG_DATA_HOME:-"$home/.local/share"}
        STATE_HOME=${XDG_STATE_HOME:-"$home/.local/state"}
    else
        CONFIG_HOME="$home/.config"
        DATA_HOME="$home/.local/share"
        STATE_HOME="$home/.local/state"
    fi
    CONFIG_DIR="$CONFIG_HOME/echo-agent-panel"
    DATA_DIR="$DATA_HOME/echo-agent-panel"
    STATE_DIR="$STATE_HOME/echo-agent-panel"
    LIBEXEC_DIR="$PREFIX/libexec/echo-agent-panel"
    BIN_DIR="$PREFIX/bin"
    SYSTEMD_DIR="$CONFIG_HOME/systemd/user"
}
derive_paths "$HOME" 1
# system 作用域（`install.sh --scope system` 的装法，以及存量手工装法）。两种都
# 要清：只删自己那种、把另一种静默留下 = "卸载了却还在开机重启"。
SYSTEM_UNIT_DIR=/etc/systemd/system

# 本实例装在哪个作用域：显式 --scope > 环境变量 > 单元文件探测
# （文件存在才算；服务停着时 is-active 两个作用域都是 inactive，探不出来）。
SYSTEM_SCOPE_UNIT="$SYSTEM_UNIT_DIR/echo-agent-panel.service"
SERVICE_SCOPE=${ECHO_SERVICE_SCOPE:-}
if [[ -z "$SERVICE_SCOPE" ]]; then
    if [[ -e "$SYSTEM_SCOPE_UNIT" ]]; then
        SERVICE_SCOPE=system
    else
        SERVICE_SCOPE=user
    fi
fi

PURGE=0
DRY_RUN=0
# linger 默认**不动**：它是**用户级全局**设置，可能被这台机器上别的用户服务
# （用户自己跑的守护进程）共用——卸载本服务时顺手关掉，会连带让那些服务在
# 最后一个登录会话结束时静默死亡，而这里既不知道有没有这样的服务，也无法
# 事后补偿。默认只报告状态；要关必须显式 --disable-linger。
DISABLE_LINGER=0

USERS_INSTALLED_UNITS=(echo-agent-panel.service echo-agent-panel-update.service)

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
  --scope <user|system> Which systemd scope the installation lives in
                        (default: auto-detected from where the unit files are;
                        ECHO_SERVICE_SCOPE is honoured too).

                        `system` needs root and removes the units from
                        /etc/systemd/system with plain `systemctl`.

  --purge            Also remove the config directory ($CONFIG_HOME/echo-agent-panel)
  --dry-run          Print resolved paths without changing the system
  --disable-linger   Also turn off linger for this user.

                     Installer enables linger so the service survives logout
                     and starts at boot. Uninstall leaves it ON by default:
                     linger is a **per-user, machine-wide** switch, so other
                     user services on this machine may rely on it. Turning it
                     off would make them stop when your last session ends.
                     Use this flag only if nothing else here needs it.

  -h, --help         Show this help
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
        --scope)
            SERVICE_SCOPE=${2:-}
            shift 2
            ;;
        --scope=*)
            SERVICE_SCOPE=${1#--scope=}
            shift
            ;;
        --disable-linger)
            DISABLE_LINGER=1
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

case "$SERVICE_SCOPE" in
    user|system) ;;
    *)
        echo "error: --scope must be 'user' or 'system' (got: '$SERVICE_SCOPE')" >&2
        exit 2
        ;;
esac

if [[ "$SERVICE_SCOPE" == system ]]; then
    SERVICE_HOME=$(getent passwd root 2>/dev/null | cut -d: -f6)
    derive_paths "${SERVICE_HOME:-/root}" 0
    # --dry-run 例外：只打印计划，不动系统，不必提权。
    if ((EUID != 0)) && ((!DRY_RUN)); then
        echo "error: --scope system requires root (units live in $SYSTEM_UNIT_DIR)" >&2
        echo "       re-run as: sudo $0 --scope system" >&2
        exit 1
    fi
    systemd_available=1
    [[ -x /run/systemd/system ]] || systemd_available=0
else
    systemd_available=0
    if systemctl --user show-environment >/dev/null 2>&1; then
        systemd_available=1
    fi
fi

# ── 环境探测（dry-run 与真实卸载共用同一份判断）─────────────────────
# linger 状态：/var/lib/systemd/linger/<user> 存在即开启（与 install.sh 的
# 成功判据同源，不额外解析 loginctl 输出）。
current_user=$(id -un)
linger_on=0
if [[ -e "/var/lib/systemd/linger/$current_user" ]]; then
    linger_on=1
fi

# system 作用域单元：存在即说明这台机器不是按 install.sh 的默认路径装的。
system_scope_units=()
for unit in "${USERS_INSTALLED_UNITS[@]}"; do
    if [[ -e "$SYSTEM_UNIT_DIR/$unit" ]]; then
        system_scope_units+=("$unit")
    fi
done

linger_note() {
    if ((!linger_on)); then
        echo "not enabled — nothing to clean up"
    elif ((DISABLE_LINGER)); then
        echo "enabled — will be turned OFF (--disable-linger)"
    else
        echo "enabled — kept (per-user setting may serve other services; --disable-linger to turn off)"
    fi
}

if ((DRY_RUN)); then
    if [[ "$SERVICE_SCOPE" == system ]]; then
        system_units="$SYSTEM_UNIT_DIR/{${USERS_INSTALLED_UNITS[*]}} (system scope)"
        units="— (installed in system scope)"
    else
        if ((systemd_available)); then
            units="$SYSTEMD_DIR/echo-agent-panel.service (+ update unit)"
        else
            units="systemd user manager unavailable (units skipped)"
        fi
        if ((${#system_scope_units[@]})); then
            system_units="$SYSTEM_UNIT_DIR/{${system_scope_units[*]}} (leftover, system scope)"
        else
            system_units="none"
        fi
    fi
    cat <<EOF
EchoAgentPanel uninstall plan
  scope:     $SERVICE_SCOPE
  service:   $units
  system:    $system_units
  launcher:  $BIN_DIR/echo-agent-panel
  libexec:   $LIBEXEC_DIR
  data:      $DATA_DIR ($( ((PURGE)) && echo "will be removed" || echo "kept: media-cache — removed: source" ))
  state:     $STATE_DIR
  config:    $CONFIG_DIR ($( ((PURGE)) && echo "will be removed" || echo "kept — use --purge to remove" ))
  linger:    $( [[ "$SERVICE_SCOPE" == system ]] && echo "not applicable (system scope)" || linger_note )
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

# ── user 作用域单元 ────────────────────────────────────────────────
if [[ "$SERVICE_SCOPE" == user ]]; then
    echo "==> Stopping Panel service"
    for unit in "${USERS_INSTALLED_UNITS[@]}"; do
        systemctl --user stop "$unit" 2>/dev/null || true
        systemctl --user disable "$unit" 2>/dev/null || true
    done
fi

# ── system 作用域单元（存量服务器装法）────────────────────────────
# 这里**不静默跳过**：留着它们，下次开机 systemd 会去拉起一个已经被删掉
# 二进制的服务，表现为"卸载了却还在崩溃重启"。以 root 运行则直接清；否则
# 打印出可直接复制的命令（不擅自 sudo，也不假装成功）。
if ((${#system_scope_units[@]})); then
    if ((EUID == 0)); then
        for unit in "${system_scope_units[@]}"; do
            echo "==> Stopping system unit $unit"
            systemctl stop "$unit" 2>/dev/null || true
            systemctl disable "$unit" 2>/dev/null || true
        done
        for unit in "${system_scope_units[@]}"; do
            if [[ -e "$SYSTEM_UNIT_DIR/$unit" ]]; then
                echo "==> Removing system unit: $SYSTEM_UNIT_DIR/$unit"
                rm -f -- "$SYSTEM_UNIT_DIR/$unit"
            fi
        done
        systemctl daemon-reload 2>/dev/null || true
    else
        echo "warning: system-scope units present but this script is not running as root:" >&2
        for unit in "${system_scope_units[@]}"; do
            echo "         $SYSTEM_UNIT_DIR/$unit" >&2
        done
        echo "         Clean them up with (otherwise systemd keeps trying to start them):" >&2
        for unit in "${system_scope_units[@]}"; do
            echo "           sudo systemctl disable --now $unit && sudo rm -f $SYSTEM_UNIT_DIR/$unit" >&2
        done
        echo "           sudo systemctl daemon-reload" >&2
    fi
fi

if [[ "$SERVICE_SCOPE" == user ]]; then
    for unit in "${USERS_INSTALLED_UNITS[@]}"; do
        remove_file "$SYSTEMD_DIR/$unit" "service unit"
    done
    systemctl --user daemon-reload 2>/dev/null || true
fi

remove_file "$BIN_DIR/echo-agent-panel" "launcher"
remove_dir "$LIBEXEC_DIR" "runtime libexec"
remove_dir "$STATE_DIR" "state directory"

# 数据目录：只删受管产物（源码检出）。媒体缓存 media-cache/ 是**可重新拉取
# 的缓存**而非数据（远端图床/MCP 图片按需回源），但口径与 Core 的 uninstall
# 保持一致——不带 --purge 就不碰，避免"卸载一次、面板历史图片全没了"这种
# 意外；--purge 才整体移除。
if ((PURGE)); then
    remove_dir "$DATA_DIR" "data directory (checkout, media-cache)"
else
    remove_dir "$DATA_DIR/source" "managed source checkout"
    if [[ -d "$DATA_DIR" ]]; then
        echo "==> Keeping media cache: $DATA_DIR (media-cache; use --purge to remove)"
    fi
fi

# ── linger ────────────────────────────────────────────────────────
# 只在显式要求时关，且只操作本用户（install 用的也是 `id -un`）。
# system 作用域与 linger 无关（单元挂 multi-user.target），此时既不改也不报告，
# 免得"linger 仍开着"被读成"还有东西要清理"。
if [[ "$SERVICE_SCOPE" == system ]]; then
    :
elif ((DISABLE_LINGER)); then
    if ((linger_on)); then
        echo "==> Disabling linger for $current_user"
        if loginctl disable-linger "$current_user" 2>/dev/null &&
            [[ ! -e "/var/lib/systemd/linger/$current_user" ]]; then
            linger_on=0
        else
            echo "warning: could not disable linger for $current_user" >&2
            echo "         fix: loginctl disable-linger $current_user" >&2
        fi
    fi
else
    if ((linger_on)); then
        echo "==> Keeping linger for $current_user (per-user setting; --disable-linger to turn off)"
    fi
fi

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
if ((linger_on)) && ((!DISABLE_LINGER)); then
    echo "linger still enabled for $current_user — it keeps /run/user/$UID alive"
    echo "without a login session. Other user services may depend on it;"
    echo "turn it off with: loginctl disable-linger $current_user"
fi
