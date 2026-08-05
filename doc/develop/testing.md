# Testing Strategy

350+ tests across three layers, covering every source file in all 7 crates.

## Layers

### 1. Unit tests (`#[test]` / `#[tokio::test]`)
Located next to the code in `#[cfg(test)] mod tests` blocks.

- **Protocol** (echo-core): OneBot event parsing for every variant family
  (message / notice / request / meta), message segments, action builders,
  unknown-type preservation.
- **Filtering** (echo-adapter): allowlist / denylist / rate limit / keyword /
  content length / admin bypass, pipeline ordering and short-circuit.
- **Security** (echo-agent tools): path-traversal guards for read/write/edit,
  dangerous command patterns, absolute-path rejection.
- **TUI** (echo-tui): components (chat_view, form_overlay, command_palette,
  settings_popup, status_bar, help_popup), core state (AppState), slash
  commands, Ctrl+C double-press exit.
- **Persistence** (echo-agent): session save/load round-trips, lenient
  malformed-entry recovery, idle eviction, ConfigStore atomic patches.

### 2. Property tests (proptest)
Generated inputs that must satisfy invariants:

- `SessionKey` round-trip for arbitrary field values.
- `ChatMessage` / `ToolCall` JSON round-trips.
- Message-event JSON parse → serialize → parse stability for arbitrary
  Unicode text (quotes, control chars, CJK).

### 3. Integration tests (`tests/` dirs)

- `echo-server/tests/reverse_ws.rs` — real WS server + raw client:
  event dispatch → handler → API correlation, token rejection.
- `echo-agent/tests/agent_integration.rs` — real Agent driven through the
  bridge: SendMessage → LLM → MessageSent event, session creation, clear,
  system prompt propagation, model switch.
- `echo-adapter-qq` — NapCat client against a `wiremock` HTTP server:
  login status detection, WebUI fallback, reverse-WS config, QR fetch.

## Mocks & fixtures

- `echo-test-utils` crate (dev-only): `MockAdapter` for registry/tool tests,
  `temp_config_file` helper. Deliberately does **not** depend on echo-agent
  (a dev-dependency cycle would compile echo-agent twice and break type
  identity).
- Mock LLM providers live inside echo-agent's own test module and the
  agent integration tests.

## Quality gates (CI)

```bash
cargo test --workspace
cargo clippy --workspace --all-targets   # -D warnings
cargo fmt --all --check
```

`.github/workflows/ci.yml` runs all three on push/PR, stable + nightly.

## History of notable fixes caught by tests

- Path traversal in `write_file` / `edit_file` (could escape workspace).
- NapCat `user_id` arriving as integer instead of string.
- OneBot `notify` notice type parsed as `Unknown` (wrong serde tag).
- Session dirty flag cleared before a successful write (data loss).
- Silent serialization / teardown failures now logged.
