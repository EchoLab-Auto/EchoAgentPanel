# Panel installation

## Scope

EchoAgentPanel is the web UI for EchoAgentCore: a Rust backend (axum) that
serves a React frontend and relays a browser WebSocket to the Core's
management WS. The terminal UI lives in the separate EchoAgentTui repository.

The installer targets Linux hosts, does not require root, and does not modify
system-wide directories. The Rust toolchain and Node.js (npm) must be
installed.

```bash
./scripts/install.sh
```

Use `./scripts/install.sh --dry-run` to inspect all resolved paths without
changing the machine. `ECHO_PREFIX`, `XDG_CONFIG_HOME`, and `XDG_DATA_HOME`
are respected. Pass `--repository <url>` (or set `ECHO_REPOSITORY_URL`) to
override the managed checkout's upstream URL.

## Installed layout

| Path | Purpose |
|---|---|
| `~/.local/bin/echo-agent-panel` | Panel launcher (injects `--config` + `--static-dir`) |
| `~/.local/libexec/echo-agent-panel/echo-agent-panel-bin` | Rust backend binary |
| `~/.local/libexec/echo-agent-panel/web` | Built frontend (served by the backend) |
| `~/.config/echo-agent-panel/panel.toml` | Persistent Panel configuration |
| `~/.local/share/echo-agent-panel/source` | Managed Git source checkout |

An existing `panel.toml` is preserved on re-install. The managed source is
created as a local clone of the checkout running the installer; the binary
and frontend are always built from the invoking checkout, so uncommitted
changes deploy directly.

## Running

```bash
echo-agent-panel
# open http://127.0.0.1:8080 (address from [server] bind_address)
```

The EchoAgentCore service must be running and reachable at `[core]
connect_url`. When the Core is down, the page still loads and shows
"连接中…" with automatic reconnection (exponential backoff).

## Uninstall

```bash
./scripts/uninstall.sh            # keep panel.toml
./scripts/uninstall.sh --purge    # also remove the config directory
```

Removes the launcher, the backend binary, the frontend build, and the managed
source checkout. `panel.toml` is kept by default so a reinstall restores it.
The EchoAgentCore service is unaffected — uninstall it separately with
EchoAgentCore's `scripts/uninstall.sh`.

## Configuration

`panel.toml` only needs the server bind address and the Core address:

```toml
[server]
bind_address = "127.0.0.1:8080"

[core]
connect_url = "ws://127.0.0.1:3132"
```

Point `connect_url` at the Core's `[core] management_address` (they can be on
different hosts), or pass `--core ws://…` on the command line. `--bind` and
`--static-dir` override the server settings at runtime.
