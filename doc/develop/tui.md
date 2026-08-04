# Terminal UI (echo-tui)

## Layout

```
┌─ Status Bar (1 row) ─────────────────────────────────────┐
│ ● QQ:online  |  模型:gpt-4o  |  Tab选中输入 · ^C×2 退出  │
├─ Chat View (fill) ────────────────────────────────────────┤
│  你: 你好                                                 │
│  Agent: 你好！有什么可以帮助你的？                          │
│  🔧 tool(args)                                            │
│  ✓ tool: result                                           │
│  系统: ── API 配置 ──                                     │
├─ Interactive Overlay (conditional) ───────────────────────┤
│ ▸● 1. deepseek  (deepseek/v4-flash)                       │
│  ○ 2. test  (anthropic/claude)                            │
├─ Prompt Input (3 rows) ───────────────────────────────────┤
│ >                                                         │
└───────────────────────────────────────────────────────────┘
```

## Key Components

### AppState
Central state struct holding all UI state:
- `sessions: Vec<SessionInfo>` — session list
- `messages: HashMap<String, Vec<DisplayMessage>>` — messages per session
- `active_session_id: Option<String>` — currently displayed session
- `chat_scroll: usize` — scroll offset (0 = bottom)
- `input_focused: bool` — prompt input focus state
- `show_slash: bool` — slash command menu visibility
- `form_overlay: FormOverlay` — interactive form component
- `mode: ConversationMode` — Normal / ApiConfig

### ChatView
- Renders messages as a `Paragraph` with word wrap
- Supports scroll via `PgUp`/`PgDn` and `chat_scroll`
- Scrollbar on right edge
- Spinner animation during LLM thinking
- New message flash highlight (700ms)

### PromptInput
- Multiline text input via `tui-textarea`
- Slash command detection (`/` triggers menu)
- Tab completion for commands
- Input history (↑↓ navigation, terminal-style)
- Mouse click → cursor positioning

### StatusBar
- Adapter connection status (●/○ dots)
- Current model and provider
- Active session info
- LLM thinking spinner
- Tool execution indicator

### FormOverlay (Interactive Menu)
Two-level state machine: `Selecting ←→ Editing`
- Arrow key navigation
- Enter to select, `e` to edit
- `Ctrl+S` to save, `Esc`/`Ctrl+C` to go back
- Renders inline as chat message (no popup)

### Mouse Text Selection
- Tracks selection via `sel_anchor`/`sel_other` (line index, visual column)
- Highlights via frame buffer `REVERSED` modifier
- Copies to clipboard via OSC 52 on mouse up
- Coordinate mapping: screen → conversation text lines via `conv_text`

## Event Loop

```
loop {
    tokio::select! {
        input_rx.recv() → handle_input()
        tick.tick()      → update animations, expire toasts
        drain_events()    → collect backend events
    }
    apply_backend_events()
    process pending_submit / pending_command / pending_slash
    terminal.draw(render)
}
```

## Slash Commands

| Command | Action |
|---|---|
| `/api` | Interactive API config menu |
| `/api switch <name>` | Switch API profile |
| `/api key <key>` | Set API key (persists to config) |
| `/api provider <name>` | Set LLM provider |
| `/api model <name>` | Set LLM model |
| `/help` | Show keybinding help |
| `/clear` | Clear current session |
| `/adapters` | Show adapter status detail |
| `/adapter start` | Start all adapters |
| `/adapter stop` | Stop all adapters |
| `/qq login` | QQ QR code login |
| `/quit` | Exit program |
