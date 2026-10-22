#!/usr/bin/env bash
set -Eeuo pipefail

# BASH_SOURCE 兜底（同 Core）：sh/dash 或管道执行时它不可用——退回 $0；
# 两者都没有（纯 stdin）时 PROJECT_ROOT 定位到当前目录、不是 git 检出，
# 于是走下面的 bootstrap 分支重新克隆（按设计）。
_SCRIPT_PATH="${BASH_SOURCE[0]:-${0:-}}"
PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$_SCRIPT_PATH")/.." 2>/dev/null && pwd -P || pwd -P)

# ── curl|bash 一键安装引导（2026-10）─────────────────────────────────
# 用法：curl -fsSL <raw-url>/scripts/install.sh | bash
#
# 通过管道运行时脚本不在 git 检出里（`$BASH_SOURCE` 为空 → PROJECT_ROOT 是
# 当前目录）：先把仓库浅克隆到临时目录，再 exec 克隆里的 install.sh 接力。
# 之后流程与本地运行**完全一致**——无需两套脚本、两个 URL。
#
# `--help` 单独短路：不想为了看帮助而先下载仓库。
if [[ ! -d "$PROJECT_ROOT/.git" ]] && [[ -z "${ECHO_PANEL_BOOTSTRAPPED:-}" ]]; then
    for arg in "$@"; do
        case "$arg" in
            -h|--help)
                # usage() 在本块之后才定义，这里只给最必要的一句 + 提示重跑。
                echo "EchoAgentPanel installer"
                echo
                echo "  在 git 检出内运行：scripts/install.sh --help   （查看完整选项）"
                echo "  或先下载后运行："
                echo "    curl -fsSL <raw-url>/scripts/install.sh -o /tmp/install.sh"
                echo "    bash /tmp/install.sh --help"
                exit 0
                ;;
        esac
    done

    DEFAULT_PANEL_REPO="https://github.com/EchoLab-Auto/EchoAgentPanel.git"
    # `--repository <url>` 也要影响 bootstrap 的那次 clone，否则用户指定的
    # 仓库要等接力后才生效——白克隆一次默认仓库（受限网络下就是白等）。
    bootstrap_repo=${ECHO_REPOSITORY_URL:-$DEFAULT_PANEL_REPO}
    prev=""
    for arg in "$@"; do
        if [[ "$prev" == "--repository" ]]; then
            bootstrap_repo=$arg
            break
        fi
        prev=$arg
    done
    echo "==> curl|bash bootstrap: cloning $bootstrap_repo"
    if ! command -v git >/dev/null 2>&1; then
        echo "error: bootstrap 需要 git" >&2
        echo "      先安装 git（Debian/Ubuntu: sudo apt-get install -y git），或直接下载脚本：" >&2
        echo "      curl -fsSL <raw-url>/scripts/install.sh -o /tmp/install.sh && bash /tmp/install.sh" >&2
        exit 1
    fi
    BOOTSTRAP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/echo-panel-bootstrap.XXXXXX")
    trap 'rm -rf "$BOOTSTRAP_DIR"' EXIT
    # 国内 / 受限网络：ECHO_GITHUB_PROXY 给 https://github.com/* 套一层前缀
    # （与 EchoAgentCore 同名同义，如 https://gh-proxy.com/）。先试镜像，
    # 失败自动退回直连，不改变既有行为。
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
            echo "      国内 / 慢网络可直接用镜像或 SSH：" >&2
            echo "        ECHO_GITHUB_PROXY=https://gh-proxy.com curl … | bash" >&2
            echo "        ECHO_REPOSITORY_URL=git@github.com:EchoLab-Auto/EchoAgentPanel.git curl … | bash" >&2
            exit 1
        }
    fi
    export ECHO_PANEL_BOOTSTRAPPED=1
    exec bash "$BOOTSTRAP_DIR/repo/scripts/install.sh" "$@"
fi

# 全部安装路径都由「服务用户的 HOME」推导（函数化：system 作用域下 HOME 可能
# 不是当前 shell 的 $HOME，参数解析完要按目标用户重算一次，见 derive_paths）。
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
    SOURCE_DIR="$DATA_DIR/source"
    LIBEXEC_DIR="$PREFIX/libexec/echo-agent-panel"
    BIN_DIR="$PREFIX/bin"
    SYSTEMD_DIR="$CONFIG_HOME/systemd/user"
    PANEL_CONFIG="$CONFIG_DIR/panel.toml"
    STATIC_DIR="$LIBEXEC_DIR/web"
    STATUS_FILE="$STATE_DIR/update-status"
}
derive_paths "$HOME" 1

# 服务作用域（2026-10）：`user`（默认）或 `system`（/etc/systemd/system）。
# Core 与 Panel 要装在同一作用域——各自的 updater 单元互相独立，但单元名与
# 生命周期假设一致；混装不报错，只在某次重启后表现为"一个起来了、另一个没有"。
# 两条作用域的单元都注入 ECHO_SERVICE_SCOPE，脚本据此选择 systemctl 的形态。
SERVICE_SCOPE=${ECHO_SERVICE_SCOPE:-user}
SERVICE_USER=${ECHO_SERVICE_USER:-}
SERVICE_HOME=""
ECHO_SKIP_LINGER=0
SYSTEMCTL=(systemctl --user)
REPOSITORY_URL=${ECHO_REPOSITORY_URL:-}
START_SERVICE=1
DRY_RUN=0
NO_DEPS=0

usage() {
    cat <<'EOF'
Usage: scripts/install.sh [options]

Install EchoAgentPanel for the current user and run it as a systemd service
(Rust backend + Vue 3 frontend). The backend relays a browser WebSocket to the
EchoAgentCore management WS and serves the built frontend.

Prerequisites: the Rust toolchain, Node.js (npm) and a systemd user manager
must be available. The EchoAgentCore service must be running for the panel to
be useful.

Options:
  --repository <url>  Upstream Git repository stored in the managed checkout
  --no-start          Install and enable units without starting the Panel
  --no-deps           Only check prerequisites, never try to install them
  --dry-run           Print resolved paths without changing the system
  -h, --help          Show this help

Prerequisites (auto-installed when missing and a package manager + sudo/root
are available; --no-deps disables that): git, a C toolchain, pkg-config,
Rust (cargo, via rustup), Node.js + npm.

Options:
  --repository <url>    Upstream Git repository used by self-update
  --no-start            Install and enable units without starting the Panel
  --no-deps             Skip automatic installation of missing prerequisites
  --dry-run             Print resolved paths without changing the system
  --scope <user|system> Which systemd scope to install into (default: user).

                        `user` writes ~/.config/systemd/user units and drives them
                        with `systemctl --user`; it enables linger so the service
                        survives logout.
                        `system` writes /etc/systemd/system units and drives them
                        with plain `systemctl`; it requires root and leaves linger
                        alone (linger is a user-scope lifetime switch).

                        Install Core and Panel in the *same* scope.
  --service-user <name> Service account for system scope. Currently must be root
                        (default): the updater unit has to `systemctl restart` a
                        system-wide unit, which only root can do.
  -h, --help            Show this help

One-liner (no clone needed):
  curl -fsSL https://raw.githubusercontent.com/EchoLab-Auto/EchoAgentPanel/main/scripts/install.sh | bash
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
        --no-deps)
            NO_DEPS=1
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
        --service-user)
            SERVICE_USER=${2:-}
            shift 2
            ;;
        --service-user=*)
            SERVICE_USER=${1#--service-user=}
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

# ── 作用域解析（与 Core 的 install.sh 同一套规则）─────────────────────
case "$SERVICE_SCOPE" in
    user|system) ;;
    *)
        echo "error: --scope must be 'user' or 'system' (got: '$SERVICE_SCOPE')" >&2
        exit 2
        ;;
esac

if [[ "$SERVICE_SCOPE" == system ]]; then
    # --dry-run 例外：只打印计划，不提权。
    if ((EUID != 0)) && ((!DRY_RUN)); then
        echo "error: --scope system requires root (it writes /etc/systemd/system)" >&2
        echo "       re-run as: sudo $0 --scope system" >&2
        exit 1
    fi
    # 固定 root：updater 是 oneshot，最后要 `systemctl restart` 系统级单元。
    SERVICE_USER=${SERVICE_USER:-root}
    if [[ "$SERVICE_USER" != root ]]; then
        echo "error: --scope system currently runs the service as root (got --service-user $SERVICE_USER)" >&2
        echo "       The updater unit must be able to 'systemctl restart' a system unit." >&2
        echo "       Use the default user scope for non-root services." >&2
        exit 1
    fi
    SERVICE_HOME=$(getent passwd root 2>/dev/null | cut -d: -f6)
    SERVICE_HOME=${SERVICE_HOME:-/root}
    derive_paths "$SERVICE_HOME" 1
    SYSTEMD_DIR=/etc/systemd/system
    SYSTEMCTL=(systemctl)
    ECHO_SKIP_LINGER=1
else
    if ((EUID == 0)) && [[ -n "${SUDO_USER:-}" ]]; then
        echo "warning: running as root via sudo but installing the **user** scope:" >&2
        echo "         units go to $SYSTEMD_DIR (root's home), not to $SUDO_USER's." >&2
        echo "         For a system-wide service: sudo $0 --scope system" >&2
    fi
    if ! systemctl --user show-environment >/dev/null 2>&1; then
        echo "error: systemd user manager is unavailable for this user" >&2
        echo "       (on servers without one, use --scope system)" >&2
        exit 1
    fi
    if [[ -e /etc/systemd/system/echo-agent-panel.service ]]; then
        echo "error: system-scope units already exist (/etc/systemd/system/echo-agent-panel.service)" >&2
        echo "       refusing to add a user-scope installation next to them (both would" >&2
        echo "       bind the same port). Run: sudo scripts/uninstall.sh --scope system" >&2
        exit 1
    fi
fi

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

# dry-run 必须无副作用：自动安装会改系统，所以预览时强制只查不装。
if ((DRY_RUN)); then
    NO_DEPS=1
fi

# ── 前置依赖：检查 + 自动安装（2026-10）────────────────────────────
# 干净机器上"一键安装"卡在缺 npm / cargo 是最常见的失败；这里先尝试装，
# 装不上再报错并给出可操作的提示。--no-deps 只检查不安装（CI / 受限环境）。
installer_sudo() {
    if [[ "$(id -u)" -eq 0 ]]; then
        printf ''
    elif command -v sudo >/dev/null 2>&1; then
        printf 'sudo'
    else
        return 1
    fi
}

pkg_install() {
    local sudo_prefix
    if ! sudo_prefix=$(installer_sudo); then
        echo "warning: 需要 root 或 sudo 才能自动安装 $*；请手动安装" >&2
        return 1
    fi
    echo "==> Installing via the system package manager: $*"
    if command -v apt-get >/dev/null 2>&1; then
        $sudo_prefix apt-get update -qq &&
            DEBIAN_FRONTEND=noninteractive $sudo_prefix apt-get install -y "$@"
    elif command -v dnf >/dev/null 2>&1; then
        $sudo_prefix dnf install -y "$@"
    elif command -v yum >/dev/null 2>&1; then
        $sudo_prefix yum install -y "$@"
    elif command -v pacman >/dev/null 2>&1; then
        $sudo_prefix pacman -Sy --noconfirm --needed "$@"
    elif command -v zypper >/dev/null 2>&1; then
        $sudo_prefix zypper --non-interactive install "$@"
    else
        echo "warning: 未找到可识别的包管理器（apt-get/dnf/yum/pacman/zypper）" >&2
        return 1
    fi
}

# `cargo` 走官方 rustup（用户级，无需 root）。装到 ~/.cargo/bin 后补进 PATH。
ensure_rust() {
    if command -v cargo >/dev/null 2>&1; then
        return 0
    fi
    if ((NO_DEPS)); then
        echo "error: cargo 缺失（--no-deps 已禁用自动安装）" >&2
        echo "  手动安装：https://rustup.rs" >&2
        return 1
    fi
    echo "==> Installing the Rust toolchain via rustup (no root needed)"
    local rustup_init
    rustup_init=$(mktemp "${TMPDIR:-/tmp}/rustup-init.XXXXXX")
    if ! curl -fsSL "${RUSTUP_INIT_URL:-https://sh.rustup.rs}" -o "$rustup_init"; then
        echo "error: 下载 rustup-init 失败——请检查网络后用 https://rustup.rs 手动安装" >&2
        rm -f "$rustup_init"
        return 1
    fi
    if ! sh "$rustup_init" -y --profile minimal --default-toolchain stable; then
        rm -f "$rustup_init"
        echo "error: rustup 安装失败" >&2
        return 1
    fi
    rm -f "$rustup_init"
    if [[ -x "$HOME/.cargo/bin/cargo" ]]; then
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
    command -v cargo >/dev/null 2>&1
}

# 系统命令：包名在发行版间不同，这里只给最常见的映射，失败时退回软链检查。
ensure_system_command() {
    local command=$1
    command -v "$command" >/dev/null 2>&1 && return 0
    if ((NO_DEPS)); then
        return 1
    fi
    case "$command" in
        git) pkg_install git ;;
        flock) pkg_install util-linux ;;
        install|cp|stat|sed) pkg_install coreutils sed ;;
        curl) pkg_install curl ;;
        node|npm) pkg_install nodejs npm ;;
        *) return 1 ;;
    esac
    command -v "$command" >/dev/null 2>&1
}

echo "==> Checking prerequisites"
missing=()
for command in git install sed systemctl flock cp stat curl npm node; do
    if ! ensure_system_command "$command"; then
        missing+=("$command")
    fi
done
if ! ensure_rust; then
    missing+=("cargo")
fi
if ((${#missing[@]})) && ((DRY_RUN == 0)); then
    echo "error: 缺少必需命令：${missing[*]}" >&2
    echo "      自动安装未成功（无包管理器 / 无 sudo / 网络受限）。手动安装后重跑：" >&2
    echo "      · Rust:  https://rustup.rs" >&2
    echo "      · Node:  https://nodejs.org（需要 18+）" >&2
    echo "      · git / util-linux / coreutils: 用你的包管理器" >&2
    exit 1
fi

if ((DRY_RUN)); then
    # dry-run 绝不动系统：上面的依赖检查已经在 --dry-run 下强制只查不装
    # （见 NO_DEPS 的赋值处），这里只把结果报出来。
    if ((${#missing[@]})); then
        prereq="MISSING: ${missing[*]}"
    else
        prereq="all found"
    fi
    cat <<EOF
EchoAgentPanel install plan
  project:    $PROJECT_ROOT
  source:     $SOURCE_DIR
  binary:     $LIBEXEC_DIR/echo-agent-panel-bin
  frontend:   $STATIC_DIR
  launcher:   $BIN_DIR/echo-agent-panel
  config:     $PANEL_CONFIG
  state:      $STATE_DIR
  systemd:    $SYSTEMD_DIR ($SERVICE_SCOPE scope$( [[ "$SERVICE_SCOPE" == system ]] && echo ", user=$SERVICE_USER" ))
  repository: $REPOSITORY_URL
  branch:     $BRANCH
  start:      $START_SERVICE
  prereqs:    $prereq
EOF
    exit 0
fi

if [[ "$(uname -s)" != "Linux" ]]; then
    echo "error: the service installer currently supports Linux/systemd only" >&2
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

# 记录当前服务的启用/运行状态：回滚要还原到**原样**。此前这两个变量没有
# 赋值处，`${panel_was_enabled:-0}` 恒为 0，于是一次失败的重装会把 panel
# 留在「已禁用 + 已停止」，且没有任何提示。
panel_was_active=0
if "${SYSTEMCTL[@]}" is-active --quiet echo-agent-panel.service 2>/dev/null; then
    panel_was_active=1
fi
panel_was_enabled=0
if "${SYSTEMCTL[@]}" is-enabled --quiet echo-agent-panel.service 2>/dev/null; then
    panel_was_enabled=1
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
        "${SYSTEMCTL[@]}" daemon-reload >/dev/null 2>&1 || true
        if [[ "${panel_was_enabled:-0}" == 1 ]]; then
            "${SYSTEMCTL[@]}" enable echo-agent-panel.service >/dev/null 2>&1 || true
        else
            "${SYSTEMCTL[@]}" disable echo-agent-panel.service >/dev/null 2>&1 || true
        fi
        if [[ "${panel_was_active:-0}" == 1 ]]; then
            "${SYSTEMCTL[@]}" restart echo-agent-panel.service >/dev/null 2>&1 || true
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

# 作用域决定的单元片段（与 Core 的 install.sh 同构）：
#   @SCOPE_LINES@  system 作用域写运行身份与家目录，user 作用域整行省略；
#   @SCOPE_ENV@    两条作用域都注入 ECHO_SERVICE_SCOPE（脚本据此选 systemctl）；
#   @WANTED_BY@    user=default.target，system=multi-user.target。
if [[ "$SERVICE_SCOPE" == system ]]; then
    UNIT_SCOPE_LINES="User=$SERVICE_USER
Group=$(id -gn "$SERVICE_USER" 2>/dev/null || echo "$SERVICE_USER")
Environment=HOME=$SERVICE_HOME
Environment=XDG_CONFIG_HOME=$SERVICE_HOME/.config
Environment=XDG_DATA_HOME=$SERVICE_HOME/.local/share
Environment=XDG_STATE_HOME=$SERVICE_HOME/.local/state"
    UNIT_WANTED_BY=multi-user.target
else
    UNIT_SCOPE_LINES=""
    UNIT_WANTED_BY=default.target
fi
UNIT_SCOPE_ENV="Environment=\"ECHO_SERVICE_SCOPE=$SERVICE_SCOPE\""

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
        -e "s|@SCOPE_ENV@|$UNIT_SCOPE_ENV|g" \
        -e "s|@WANTED_BY@|$UNIT_WANTED_BY|g" \
        "$source" >"$destination"
    # 多行片段用 awk 整行替换（sed 的替换串里嵌换行不可读；awk -v 传不了
    # 换行，走环境变量 + ENVIRON）。
    if [[ -z "$UNIT_SCOPE_LINES" ]]; then
        sed -i '/@SCOPE_LINES@/d' "$destination"
    else
        ECHO_UNIT_SCOPE_LINES="$UNIT_SCOPE_LINES" awk '
            $0 == "@SCOPE_LINES@" { print ENVIRON["ECHO_UNIT_SCOPE_LINES"]; next }
            { print }
        ' "$destination" >"$destination.tmp"
        mv -f "$destination.tmp" "$destination"
    fi
    chmod 644 "$destination"
}

# 常驻用户管理器（linger）：user 作用域服务的**生命周期前提**。
#
# 不加这一步会发生什么（2026-10 实测，A100 节点）：unit 是 `--user` 作用域，
# 挂在 `default.target` 上，而 `default.target` 属于 `user@<uid>.service`。
# 该用户管理器平时**不存在**——它由第一个登录会话拉起、最后一个会话消失后
# 十秒被 logind 停掉，`user@` 一停，其下所有单元（含 Panel）一并被停止。
#
# 后果不是"偶发"而是"必然"：运维 SSH 登出 → Panel 死；下次有人登录 → Panel
# 又活了。表现为"面板神秘掉线、重启时间与某人登录时间精确重合"。更糟的是
# `Restart=always` 在这里**完全无效**——unit 不是失败退出，是被上层正常
# 停止，systemd 语义里显式 stop 之后不自动重启。
#
# `loginctl enable-linger` 让该用户管理器开机即起、无人登录也保留，顺带修掉
# 另一个不易察觉的缺陷：**重启后无人登录时 Panel 不会自动启动**。
#
# 权限：`set-self-linger` 的 polkit 默认 `allow_any = yes`，普通用户给自己
# 开免密；只有给别人开才需要授权。所以这步在 root 与普通用户安装下都能成功。
#
# 失败**不中断安装**（服务已经装好了，缺 linger 只是会在登出时停），但必须
# 显式告警并给出修复命令——静默降级正是这次排查花掉一小时的原因。
ensure_service_linger() {
    if [[ "${ECHO_SKIP_LINGER:-0}" == 1 ]]; then
        # system 作用域单元挂 multi-user.target，开机即起、与会话无关。
        return 0
    fi
    local user
    user=$(id -un)
    if loginctl enable-linger "$user" 2>/dev/null &&
        [[ -e "/var/lib/systemd/linger/$user" ]]; then
        echo "==> Enabled linger for $user (service survives logout and starts at boot)"
        return 0
    fi
    {
        echo "warning: could not enable linger for $user."
        echo "         This service runs in the systemd **user** scope: without linger it"
        echo "         stops as soon as the last login session ends, and it will NOT start"
        echo "         at boot until someone logs in."
        echo "         fix: loginctl enable-linger $user"
    } >&2
    return 0
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
"${SYSTEMCTL[@]}" daemon-reload
"${SYSTEMCTL[@]}" enable echo-agent-panel.service >/dev/null
# 生命周期前提（见 ensure_service_linger 的注释）：缺这一步，登出即停、
# 重启不自启。
ensure_service_linger
if ((START_SERVICE)); then
    "${SYSTEMCTL[@]}" restart echo-agent-panel.service
    panel_healthy=0
    healthy_checks=0
    for _ in {1..15}; do
        sleep 1
        if "${SYSTEMCTL[@]}" is-active --quiet echo-agent-panel.service; then
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

if [[ "$SERVICE_SCOPE" == system ]]; then
    scope_hint="systemctl status echo-agent-panel.service"
    log_hint="journalctl -u echo-agent-panel.service -f"
else
    scope_hint="systemctl --user status echo-agent-panel.service"
    log_hint="journalctl --user -u echo-agent-panel.service -f"
fi
cat <<EOF

Installation complete.
  Launcher: $BIN_DIR/echo-agent-panel
  Config:   $PANEL_CONFIG
  Service:  $scope_hint
  Logs:     $log_hint
  Update:   $( [[ "$SERVICE_SCOPE" == system ]] && echo "sudo systemctl start echo-agent-panel-update.service" || echo "systemctl --user start echo-agent-panel-update.service" )
  Web:      http://<你的服务器IP>:8080  (地址取决于 [server] bind_address)
EOF
