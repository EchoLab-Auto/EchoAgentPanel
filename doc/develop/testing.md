# Testing Strategy (Panel)

165+ tests covering the frontend crates (`echo-tui`, `echo`). The Core-side
test layers (agent, adapters, QQ) live in the EchoAgentCore repository.

## Layers

### 1. Unit tests (`#[test]` / `#[tokio::test]`)
Located next to the code in `#[cfg(test)] mod tests` blocks.

- **TUI components** (echo-tui): chat_view, form_overlay, command_palette,
  settings_popup, status_bar, help_popup, prompt_input.
- **AppState core logic**: mouse selection, session ops, Ctrl+C exit,
  handle_submit routing (QQ filter → API config → plain send),
  slash commands (/help, /adapters, /api commands, /qq setting flows).
- **Backend client**: WS frame encode/decode via `echo_protocol`
  (`serialize_command` / `deserialize_message`), reconnect backoff.

### 2. Integration via the in-process bridge

`echo_tui::Backend::new(bridge)` drives the UI against
`echo_protocol::create_bridge()` — the same `BackendCommand`/`BackendEvent`
types used on the wire — so frontend logic is testable without a Core process.
Wire-format round-trip and backward-compatibility tests live in the
`echo-protocol` crate itself (EchoAgentCore).

## Quality gates (CI)

```bash
cargo test --workspace
cargo clippy --workspace --all-targets   # -D warnings
cargo fmt --all --check
```

`.github/workflows/ci.yml` runs all three on push/PR, stable + nightly. Every
job clones EchoAgentCore into a sibling directory first, because `echo-tui`
references `echo-protocol` by relative path.
