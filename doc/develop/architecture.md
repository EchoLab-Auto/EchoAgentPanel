# EchoAgentPanel Architecture

## Overview

EchoAgentPanel is a Rust-based AI Agent framework that connects LLMs to messaging platforms (QQ via OneBot v11) with a terminal UI. It follows a layered architecture with clear separation of concerns.

## Crate Dependency Graph

```
echo (binary)
├── echo-tui           # Terminal UI (ratatui)
│   └── echo-agent     # Agent framework
│       └── echo-adapter  # Adapter abstraction layer
├── echo-adapter-qq    # QQ/OneBot adapter
│   ├── echo-adapter
│   ├── echo-core      # OneBot v11 protocol types
│   └── echo-server    # Reverse WebSocket server
└── echo-server
    └── echo-core
```

## Crate Responsibilities

| Crate | Path | Role |
|---|---|---|
| `echo-core` | `source/backend/echo-core` | Pure serde types for OneBot v11 wire format — events, actions, message segments. Zero I/O. |
| `echo-server` | `source/backend/echo-server` | Reverse-WebSocket server. Accepts NapCat connections, dispatches events to handlers via priority-ordered chain. |
| `echo-adapter` | `source/backend/echo-adapter` | Adapter trait, platform-agnostic message types (`IncomingMessage`, `MessageTarget`), filter pipeline, adapter registry. Zero protocol dependency. |
| `echo-agent` | `source/backend/echo-agent` | Core agent: LLM provider abstraction, tool registry, skill system, session management, conversation memory. Depends only on `echo-adapter`. |
| `echo-adapter-qq` | `source/backend/echo-adapter-qq` | QQ/OneBot adapter implementation: `QqAdapter` wrapping echo-server, QQ tools, filter configuration, NapCat API client. |
| `echo-tui` | `source/tui/echo-tui` | Terminal UI: chat view, prompt input with slash commands, status bar, interactive form overlay, mouse text selection. |
| `echo` | `source/echo` | Binary entry point. Wires everything together, loads config, manages lifecycle. |

## Data Flow

### QQ Message Flow
```
QQ User → Tencent → NapCat (Docker) → ws:// → echo-server :3131
  → HandlerRegistry (priority chain)
    → QqHandler (inside QqAdapter)
      → Trigger gating (dm_auto_reply / group_at_reply)
      → Filter pipeline (allowlist → denylist → rate limit → keyword → content)
      → Agent.process_message()
        → LLM (OpenAI/Anthropic/Ollama)
        → Tool execution (if needed)
      → Reply via OneBot API
```

### TUI Message Flow
```
Prompt Input [Enter]
  → pending_submit
  → BackendCommand::SendMessage
  → Agent.process_message()
  → BackendEvent::MessageSent
  → TUI apply_backend_event()
  → Chat View render
```

### Slash Command Flow
```
Prompt Input [/api]
  → show_slash = true → render_slash_menu
  → [Enter]
  → pending_slash
  → slash_commands::dispatch()
  → api::config() / help::run() / adapter::status()
  → state.toast() → chat message
```

## State Machine: TUI Sessions

```
Inactive ←→ Selecting ←→ Editing
```

- **Inactive**: Normal chat mode
- **Selecting**: `/api` form — profile list, arrow key navigation, Enter = select, e = edit
- **Editing**: `/api` edit mode — form fields, Ctrl+S = save, Esc = back, Ctrl+C×2 = exit
