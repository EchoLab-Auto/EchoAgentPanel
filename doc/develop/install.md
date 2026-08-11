# Panel installation

## Scope

EchoAgentPanel is the TUI frontend only. It connects to an EchoAgentCore
service over WebSocket; the Core's systemd service, controlled self-update,
and QQ/NapCat setup all live in the EchoAgentCore repository.

The installer targets Linux hosts, does not require root, and does not modify
system-wide directories.

**Prerequisite**: the EchoAgentCore repository must be checked out next to
this one (`../EchoAgentCore`) — `echo-tui` depends on its `echo-protocol`
crate via a relative path, so the build fails without it.

```bash
./scripts/install.sh
```

Use `./scripts/install.sh --dry-run` to inspect all resolved paths without
changing the machine. `ECHO_PREFIX` and `XDG_CONFIG_HOME` are respected.

## Installed layout

| Path | Purpose |
|---|---|
| `~/.local/bin/echo-agent-panel` | Panel launcher (injects default `--config`) |
| `~/.local/libexec/echo-agent-panel/echo-agent-panel-bin` | Runtime binary |
| `~/.config/echo-agent-panel/panel.toml` | Persistent Panel configuration |

An existing `panel.toml` is preserved on re-install. Unlike the Core
installer there is no systemd unit and no managed Git checkout: the Panel is
started manually by the user, and updating means `git pull` + re-running
`install.sh` (which rebuilds and atomically swaps the binary).

## Configuration

`panel.toml` only needs the Core address and TUI preferences:

```toml
[tui]
theme = "dark"

[core]
connect_url = "ws://127.0.0.1:3132"
```

Point `connect_url` at the Core's `[core] management_address` (they can be on
different hosts), or pass `--connect ws://…` on the command line.
