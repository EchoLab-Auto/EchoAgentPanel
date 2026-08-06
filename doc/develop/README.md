# EchoAgentPanel Development Documentation

## Index

| Document | Content |
|---|---|
| [install.md](install.md) | One-click user installation, systemd Core service, controlled self-update |
| [tui/design.md](tui/design.md) | TUI layout, components, state machine, slash commands, form overlay |
| [config/persistence.md](config/persistence.md) | ConfigStore, agent & gate persistence, atomic writes, sessions |
| [agent/background-tasks.md](agent/background-tasks.md) | Detached tasks, parallel branches, ordered integration, delivery targets |
| [adapter/qq/gating.md](adapter/qq/gating.md) | QQ message gating pipeline (5-layer), runtime mutability |
| [testing.md](testing.md) | Test strategy: unit / proptest / integration / concurrency layers |

> 架构/Agent/Adapter/Config 的通用文档已删除——这些信息通过源码注释（`//! module doc`）和 README 维护，避免文档与代码分叉。

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
│   │   ├── echo-adapter/      # Adapter trait + filter pipeline + ConfigStore
│   │   ├── echo-agent/        # Agent framework (agent/commands, adapter_bridge)
│   │   ├── echo-adapter-qq/   # QQ/OneBot adapter (adapter/filter, handler)
│   │   └── echo-test-utils/   # Shared test mocks (dev-dependency only)
│   ├── tui/
│   │   └── echo-tui/          # Terminal UI
│   └── echo/                  # Binary entry point
├── doc/develop/               # This documentation
├── packaging/systemd/         # User service templates
├── scripts/                   # Installer and controlled updater
├── tools/                     # Utility scripts
├── napcat/                    # NapCat Docker config
├── docker-compose.yml         # NapCat container
├── Dockerfile                 # EchoAgentPanel container
└── Cargo.toml                 # Workspace manifest
```

### Key Traits
- `LlmProvider` — LLM backend abstraction (OpenAI/Anthropic/Ollama)
- `Tool` — LLM-callable function (calculator, adapter mgmt, coding tools)
- `Adapter` — Platform integration (QQ/OneBot); `InboundMessageHook` — one-way adapter→agent input
- `MessageFilter` — Inbound message filter (allowlist, denylist, rate limit, keyword, content length)
- `Handler` — OneBot event handler (priority-ordered chain, panic isolation)
- `Component` — TUI component (render + handle_event, 7 implementors)

### Key Abstractions
- `ConfigStore` — Atomic TOML read-modify-write (shared by Agent + QqAdapter, eliminates concurrent-write races)
- `GateMode` — Strongly-typed gating mode (`None` / `Allowlist` / `Denylist`), serialised as snake_case for wire compatibility
- `AgentMessageHook` — echo-agent implements the one-way `InboundMessageHook`; platform output requires tools
- `FanoutHandle` — Multi-subscriber event fanout with stale subscriber pruning

### Key State
- `Agent` — Provider, tools, skills, sessions, adapters
- `AppState` — All TUI state (messages, sessions, scroll, focus, forms)
- `Session` — Per-user conversation (history, turn_lock)
- `QqInner` — QQ adapter internal state (running, connected, active_context)

### Key Flows
1. **QQ input hook**: QqHandler → trigger gating → filter pipeline → AgentMessageHook → structured `qq_message` input
2. **QQ output tool**: Agent tool call → `send_private_msg` / `send_group_msg` → QqAdapter::send_message
3. **TUI backend input**: prompt_input → BackendCommand::SendMessage → agent.process_message → BackendEvent::AgentOutput
4. **Slash command**: prompt_input [/] → show_slash → pending_slash → slash_commands::dispatch → toast()
5. **API config**: /api → FormOverlay::Selecting → e → FormOverlay::Editing → Ctrl+S → persist_config
6. **Adapter lifecycle**: QqAdapter::start() → bind port → spawn server task → accept connections → QqHandler
7. **Skill hot reload**: periodic scan → discover SKILL.md → preserve enabled state → replace registry → clear prompt cache
8. **Self-update**: authorized session → fixed framework_update tool → update user service → fast-forward/build → atomic replace → Core restart
9. **Background task**: context snapshot → detached branches → completion buffer → creation-order integration → explicit target delivery

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
