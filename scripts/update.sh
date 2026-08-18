#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR=""
BINARY=""
STATUS_FILE=""
STATIC_DIR=""
UPDATE_MODE=local

usage() {
    cat <<'EOF'
Usage: scripts/update.sh [--local|--remote] --source <dir> --binary <path> --status <path> --static-dir <path>

Modes:
  local (default)  Build the current source tree exactly as it is, including
                   uncommitted changes. No fetch or merge is performed. Use
                   this when the checkout is already on the desired revision.
  --remote         Fetch and fast-forward the clean managed checkout before
                   building (previous default; requires network access).

The update builds the Rust backend and the React frontend, replaces the
runtime binary and the static frontend directory, then restarts the
echo-agent-panel.service user unit.
EOF
}

while (($#)); do
    case "$1" in
        --source)
            SOURCE_DIR=${2:-}
            shift 2
            ;;
        --binary)
            BINARY=${2:-}
            shift 2
            ;;
        --status)
            STATUS_FILE=${2:-}
            shift 2
            ;;
        --static-dir)
            STATIC_DIR=${2:-}
            shift 2
            ;;
        --local)
            UPDATE_MODE=local
            shift
            ;;
        --remote)
            UPDATE_MODE=remote
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

if [[ -z "$SOURCE_DIR" || -z "$BINARY" || -z "$STATUS_FILE" || -z "$STATIC_DIR" ]]; then
    echo "error: --source, --binary, --status and --static-dir are required" >&2
    usage >&2
    exit 2
fi

STATE_DIR=$(dirname -- "$STATUS_FILE")
REVISION_FILE="$STATE_DIR/installed-revision"
LOCK_FILE="$STATE_DIR/update.lock"
PHASE=initializing
TARGET=unknown
ROLLBACK_ACTIVE=0
BIN_REPLACED=0
UPDATER_REPLACED=0
STATIC_REPLACED=0
ROLLBACK_BINARY=""
ROLLBACK_UPDATER=""
ROLLBACK_STATIC=""
temporary=""
FINALIZED=0

write_status() {
    local state=$1 message=$2 revision=${3:-unknown}
    local temporary="$STATUS_FILE.tmp"
    {
        printf 'state=%s\n' "$state"
        printf 'revision=%s\n' "$revision"
        printf 'message=%s\n' "$message"
        printf 'pid=%s\n' "$$"
        printf 'updated_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    } >"$temporary"
    mv -f "$temporary" "$STATUS_FILE"
}

# Restore the previous binary / updater / static dir / revision and restart the
# Panel service if it was active before this update. Best-effort.
rollback_installation() {
    if [[ -n "$ROLLBACK_BINARY" && -x "$ROLLBACK_BINARY" ]]; then
        mv -f "$ROLLBACK_BINARY" "$BINARY" || true
    elif ((BIN_REPLACED)); then
        rm -f "$BINARY" || true
    fi
    if [[ -n "$ROLLBACK_UPDATER" && -f "$ROLLBACK_UPDATER" ]]; then
        mv -f "$ROLLBACK_UPDATER" "$(dirname -- "$BINARY")/update.sh" || true
    elif ((UPDATER_REPLACED)); then
        rm -f "$(dirname -- "$BINARY")/update.sh" || true
    fi
    if [[ -n "$ROLLBACK_STATIC" && -d "$ROLLBACK_STATIC" ]]; then
        rm -rf "$STATIC_DIR" || true
        mv -f "$ROLLBACK_STATIC" "$STATIC_DIR" || true
    elif ((STATIC_REPLACED)); then
        rm -rf "$STATIC_DIR" || true
    fi
    if [[ -n "${installed:-}" ]]; then
        revision_restore="${REVISION_FILE}.restore.$$"
        printf '%s\n' "$installed" >"$revision_restore"
        mv -f "$revision_restore" "$REVISION_FILE" || true
    else
        rm -f "$REVISION_FILE" || true
    fi
    if (( ${panel_was_active:-0} )); then
        systemctl --user restart echo-agent-panel.service >/dev/null 2>&1 || true
    fi
}

# Record a definitive failure state: roll back when something was already
# replaced, otherwise just mark the run as failed. Idempotent.
finalize_failure() {
    local code=$1 reason=$2
    if ((FINALIZED == 1)); then
        return
    fi
    FINALIZED=1
    trap - ERR EXIT
    set +e
    if ((BIN_REPLACED || UPDATER_REPLACED || STATIC_REPLACED)); then
        ROLLBACK_ACTIVE=1
        rollback_installation
        write_status rolled_back "$reason; restored previous installation" "${installed:-unknown}" || true
    else
        write_status failed "$reason" "${TARGET:-unknown}" || true
    fi
}

on_error() {
    local code=$?
    finalize_failure "$code" "update failed during $PHASE"
    exit "$code"
}
trap on_error ERR

on_exit() {
    local code=$?
    trap - EXIT ERR
    if [[ -n "$temporary" ]]; then
        rm -f "$temporary" 2>/dev/null || true
    fi
    if ((FINALIZED == 0)) && ((code != 0)); then
        set +e
        if ((BIN_REPLACED || UPDATER_REPLACED || STATIC_REPLACED)); then
            ROLLBACK_ACTIVE=1
            rollback_installation
            write_status rolled_back "update interrupted (exit $code) during $PHASE; restored previous installation" "${installed:-unknown}" || true
        else
            write_status failed "update interrupted (exit $code) during $PHASE" "${TARGET:-unknown}" || true
        fi
    fi
}
trap on_exit EXIT

install -d -m 755 "$STATE_DIR" "$(dirname -- "$BINARY")" "$(dirname -- "$STATIC_DIR")"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    write_status busy "another update is already running"
    FINALIZED=1
    exit 0
fi

if [[ -f "$STATUS_FILE" ]] && grep -q '^state=running' "$STATUS_FILE" 2>/dev/null; then
    write_status interrupted "previous update was interrupted; starting a new attempt" "$(cat "$REVISION_FILE" 2>/dev/null || true)"
fi
installed=$(cat "$REVISION_FILE" 2>/dev/null || true)
panel_was_active=0
if systemctl --user is-active --quiet echo-agent-panel.service 2>/dev/null; then
    panel_was_active=1
fi

for command in cargo git install systemctl npm node; do
    command -v "$command" >/dev/null 2>&1 || {
        write_status failed "required command not found: $command"
        FINALIZED=1
        exit 1
    }
done
if [[ ! -f "$SOURCE_DIR/Cargo.toml" ]]; then
    write_status failed "source Cargo.toml is missing"
    FINALIZED=1
    exit 1
fi
current=$(git -C "$SOURCE_DIR" rev-parse HEAD 2>/dev/null || echo unknown)
if [[ "$UPDATE_MODE" == local ]]; then
    TARGET="local:$current"
    if ! git -C "$SOURCE_DIR" diff --quiet 2>/dev/null \
        || ! git -C "$SOURCE_DIR" diff --cached --quiet 2>/dev/null \
        || [[ -n "$(git -C "$SOURCE_DIR" ls-files --others --exclude-standard 2>/dev/null)" ]]; then
        TARGET+="+dirty"
    fi
    write_status running "building local source tree" "$TARGET"
else
    if [[ ! -d "$SOURCE_DIR/.git" ]]; then
        write_status failed "managed source checkout is missing"
        FINALIZED=1
        exit 1
    fi
    if ! git -C "$SOURCE_DIR" diff --quiet || ! git -C "$SOURCE_DIR" diff --cached --quiet; then
        write_status failed "managed source has tracked local changes; refusing to overwrite"
        FINALIZED=1
        exit 1
    fi

    branch=$(git -C "$SOURCE_DIR" branch --show-current)
    if [[ -z "$branch" ]]; then
        write_status failed "managed source is on a detached HEAD"
        FINALIZED=1
        exit 1
    fi

    PHASE=fetching
    write_status running "fetching origin/$branch" "$current"
    git -C "$SOURCE_DIR" fetch --prune origin "$branch"
    TARGET=$(git -C "$SOURCE_DIR" rev-parse FETCH_HEAD)
    if ! git -C "$SOURCE_DIR" merge-base --is-ancestor "$current" "$TARGET"; then
        write_status failed "origin/$branch is not a fast-forward" "$current"
        FINALIZED=1
        exit 1
    fi
    git -C "$SOURCE_DIR" merge --ff-only "$TARGET"

    if [[ "$installed" == "$TARGET" && -x "$BINARY" ]]; then
        write_status current "already up to date" "$TARGET"
        FINALIZED=1
        exit 0
    fi
fi

PHASE=building
write_status running "building revision $TARGET" "$TARGET"
cargo build --release --locked -p echo-web-server --manifest-path "$SOURCE_DIR/Cargo.toml"
(
    cd "$SOURCE_DIR/web"
    if [[ -f package-lock.json ]]; then
        npm ci
    else
        npm install
    fi
    npm run build
)

PHASE=installing
temporary=$(mktemp "${BINARY}.new.XXXXXX")
install -m 755 "$SOURCE_DIR/target/release/echo-agent-panel" "$temporary"
rollback="${BINARY}.rollback"
ROLLBACK_BINARY="$rollback"
if [[ -x "$BINARY" ]]; then
    rollback_temporary=$(mktemp "${rollback}.new.XXXXXX")
    install -m 755 "$BINARY" "$rollback_temporary"
    mv -f "$rollback_temporary" "$rollback"
fi
mv -f "$temporary" "$BINARY"
BIN_REPLACED=1
temporary=""

if [[ -d "$STATIC_DIR" ]]; then
    static_rollback="$(mktemp -d "$(dirname -- "$STATIC_DIR")/web.rollback.XXXXXX")"
    cp -a "$STATIC_DIR/." "$static_rollback/"
    ROLLBACK_STATIC="$static_rollback"
fi
rm -rf "$STATIC_DIR"
cp -a "$SOURCE_DIR/web/dist" "$STATIC_DIR"
STATIC_REPLACED=1

if ((panel_was_active)); then
    PHASE=restarting
    restart_failed=0
    if ! systemctl --user restart echo-agent-panel.service; then
        restart_failed=1
    else
        healthy_checks=0
        for _ in {1..15}; do
            sleep 1
            if systemctl --user is-active --quiet echo-agent-panel.service; then
                ((healthy_checks += 1))
                if ((healthy_checks >= 3)); then
                    restart_failed=0
                    break
                fi
            else
                healthy_checks=0
            fi
        done
    fi
    if ((restart_failed)); then
        false
    fi
fi

if [[ -f "$SOURCE_DIR/scripts/update.sh" ]]; then
    PHASE=refreshing_updater
    updater="$(dirname -- "$BINARY")/update.sh"
    updater_temporary=$(mktemp "${updater}.new.XXXXXX")
    if [[ -f "$updater" ]]; then
        ROLLBACK_UPDATER="${updater}.rollback"
        updater_rollback_temporary=$(mktemp "${ROLLBACK_UPDATER}.new.XXXXXX")
        install -m 755 "$updater" "$updater_rollback_temporary"
        mv -f "$updater_rollback_temporary" "$ROLLBACK_UPDATER"
    fi
    install -m 755 "$SOURCE_DIR/scripts/update.sh" "$updater_temporary"
    mv -f "$updater_temporary" "$updater"
    UPDATER_REPLACED=1
fi

PHASE=committing
revision_temporary=$(mktemp "${REVISION_FILE}.new.XXXXXX")
printf '%s\n' "$TARGET" >"$revision_temporary"
mv -f "$revision_temporary" "$REVISION_FILE"
if [[ "$UPDATE_MODE" == local ]]; then
    write_status updated "installed successfully from local source" "$TARGET"
else
    write_status updated "updated successfully" "$TARGET"
fi
FINALIZED=1
BIN_REPLACED=0
UPDATER_REPLACED=0
STATIC_REPLACED=0
rm -f "$rollback" "$ROLLBACK_UPDATER" || true
if [[ -n "$ROLLBACK_STATIC" ]]; then
    rm -rf "$ROLLBACK_STATIC" || true
fi
