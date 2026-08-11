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
changing the machine. `ECHO_PREFIX`, `XDG_CONFIG_HOME`, and `XDG_DATA_HOME`
are respected. Pass `--repository <url>` (or set `ECHO_REPOSITORY_URL`) to
override the managed checkout's upstream URL.

## Installed layout

| Path | Purpose |
|---|---|
| `~/.local/bin/echo-agent-panel` | Panel launcher (injects default `--config`) |
| `~/.local/libexec/echo-agent-panel/echo-agent-panel-bin` | Runtime binary |
| `~/.config/echo-agent-panel/panel.toml` | Persistent Panel configuration |
| `~/.local/share/echo-agent-panel/source` | Managed Git source checkout |

An existing `panel.toml` is preserved on re-install. The managed source is
created as a local clone of the checkout running the installer. Re-installing
fast-forwards it to the invoking checkout when possible, refuses to overwrite
tracked local changes, and preserves a diverged checkout. The binary is still
built from the invoking checkout because the Panel's `echo-protocol` dependency
comes from its sibling `EchoAgentCore` repository.

There is no Panel systemd unit: it is started manually by the user. Updating
means `git pull` in the development checkout and re-running `install.sh`, which
refreshes the managed source and atomically swaps the binary.

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
