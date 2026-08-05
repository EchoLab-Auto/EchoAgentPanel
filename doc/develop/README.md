# EchoAgentPanel Development Documentation

## Index

| Document | Content |
|---|---|
| [architecture.md](architecture.md) | Crate dependency graph, data flow, state machines |
| [agent.md](agent.md) | Agent loop, LLM providers, tools, sessions, BackendBridge |
| [adapter.md](adapter.md) | Adapter trait, QQ adapter, filter pipeline, NapCatClient |
| [tui.md](tui.md) | Layout, components, slash commands, mouse selection, event loop |
| [config.md](config.md) | TOML config, env vars, profiles, persistence |
| [testing.md](testing.md) | Test strategy: unit / property / integration layers |

## Quick Reference

### Project Structure
```
EchoAgentPanel/
├── config/                    # TOML configuration files
├── skills/                    # SKILL.md skill definitions
├── source/
│   ├── backend/
│   │   ├── echo-core/         # OneBot v11 protocol types
│   │   ├── echo-server/       # Reverse WebSocket server
│   │   ├── echo-adapter/      # Adapter abstraction (trait + filter)
│   │   ├── echo-agent/        # Agent framework (LLM + tools + skills)
│   │   └── echo-adapter-qq/   # QQ/OneBot adapter implementation
│   ├── tui/
│   │   └── echo-tui/          # Terminal UI
│   └── echo/                  # Binary entry point
├── doc/develop/               # This documentation
├── tools/                     # Utility scripts
├── napcat/                    # NapCat Docker config
├── docker-compose.yml         # NapCat container
├── Dockerfile                 # EchoAgentPanel container
└── Cargo.toml                 # Workspace manifest
```

### Key Traits
- `LlmProvider` — LLM backend abstraction (OpenAI/Anthropic/Ollama)
- `Tool` — LLM-callable function (calculator, adapter mgmt, QQ tools)
- `Adapter` — Platform bridge (QQ/OneBot)
- `MessageFilter` — Inbound message filter (allowlist, rate limit, etc.)
- `Handler` — OneBot event handler (priority-ordered chain)
- `Component` — TUI component (render + handle_event)

### Key State
- `Agent` — Provider, tools, skills, sessions, adapters
- `AppState` — All TUI state (messages, sessions, scroll, focus, forms)
- `Session` — Per-user conversation (history, turn_lock)
- `QqInner` — QQ adapter internal state (running, connected, active_context)

### Key Flows
1. **QQ message → Agent reply**: QqHandler → trigger gating → filter pipeline → agent.process_message → ctx.reply_to
2. **TUI message → Agent reply**: prompt_input → pending_submit → BackendCommand::SendMessage → agent.process_message → BackendEvent::MessageSent → chat_view
3. **Slash command**: prompt_input [/] → show_slash → pending_slash → slash_commands::dispatch → toast()
4. **API config**: /api → FormOverlay::Selecting → e → FormOverlay::Editing → Ctrl+S → persist_config
5. **Adapter lifecycle**: QqAdapter::start() → bind port → spawn server task → accept connections → QqHandler

### Build & Run

Panel 与 Core 分离部署，各自加载独立的配置文件：

```bash
# Core（Agent + QQ 适配器 + management 服务）
cargo run --release -- --core --config config/echo-agent-core.local.toml

# Panel（TUI，连接远程 Core；--connect 可覆盖配置中的 connect_url）
cargo run --release -- --panel --config config/echo-agent-panel.local.toml
cargo run --release -- --connect ws://127.0.0.1:3132

# Development
cargo run -- --core --config config/echo-agent-core.local.toml
cargo run -- --panel --config config/echo-agent-panel.local.toml

# Tests (350+ across all crates; unit + proptest + integration)
cargo test --workspace

# Quality gates (CI enforces all three)
cargo clippy --workspace --all-targets   # zero warnings required
cargo fmt --all --check

# Specific crate
cargo test -p echo-agent
```
