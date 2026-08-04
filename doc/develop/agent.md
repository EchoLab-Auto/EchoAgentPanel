# Agent Framework (echo-agent)

## Core Loop

```
process_message(session, content)
  ├── Lock session turn_lock (serialise concurrent messages)
  ├── build_system_prompt(content)
  │     ├── Base system prompt from config
  │     ├── Skill metadata (Tier 1 — always included)
  │     └── Triggered skill instructions (Tier 2 — keyword match)
  ├── Push user message to session history (bounded by memory_limit)
  ├── Build messages: [system_prompt, ...history]
  ├── For each iteration (up to max_tool_iterations):
  │     ├── Call LLM provider.chat(messages, tools)
  │     ├── If no tool_calls → push assistant reply to history → return
  │     └── If tool_calls → execute tools → push results → continue loop
  └── Error if max iterations reached without final reply
```

## Key Components

### Agent Struct
```rust
pub struct Agent {
    provider: RwLock<Arc<dyn LlmProvider>>,  // Current LLM provider
    config: RwLock<AgentConfig>,              // Live config (mutable via TUI)
    active_model: RwLock<String>,             // Model override
    tools: Arc<ToolRegistry>,                 // Registered tools
    skills: Arc<Mutex<SkillRegistry>>,        // Loaded skills
    sessions: SessionManager,                 // Per-user sessions
    adapters: Arc<AdapterRegistry>,           // Platform adapters
    handle: RwLock<Option<Arc<BackendHandle>>>, // TUI bridge
    system_prompt_cache: RwLock<Option<String>>, // Cached prompt
}
```

### LLM Provider Trait
```rust
#[async_trait]
pub trait LlmProvider: Send + Sync {
    fn name(&self) -> &str;
    fn default_model(&self) -> &str;
    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError>;
    async fn chat_stream(&self, request: &ChatRequest, tx: mpsc::Sender) -> Result<(), LlmError>;
}
```

Implementations: `OpenAiProvider`, `AnthropicProvider`, `OllamaProvider`

### Tool Trait
```rust
#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn parameters(&self) -> Value;  // JSON Schema
    async fn execute(&self, arguments: Value) -> Result<String, ToolError>;
}
```

Built-in tools: `calculator`, `adapter_status`, `adapter_start`, `adapter_stop`, `adapter_restart`

### Session
```rust
pub struct Session {
    pub id: String,              // "{platform}:{scope}:{scope_id}:{user_id}"
    pub session_key: SessionKey,
    pub nickname: String,
    pub history: Arc<Mutex<Vec<ChatMessage>>>,
    pub turn_lock: Arc<Mutex<()>>,  // Serialise concurrent turns
}
```

Session ID format: `qq:dm::123456` / `qq:group:789:456` / `local:tui::local_user`

### Memory Limit
History bounded to `memory_limit` messages (default 40). Oldest messages evicted via `drain(..len - limit)`.

## BackendBridge (TUI Communication)

```
TUI side                    Agent side
BackendBridge               BackendHandle
  command_tx ──mpsc──>        command_rx
  event_rx   <──mpsc──        event_tx
```

- **Commands** (TUI → Agent): `SendMessage`, `SwitchModel`, `SwitchProvider`, `SetSystemPrompt`, `UpdateApiConfig`, `SwitchApi`, `DeleteApi`, `ToggleSkill`, `ClearSession`, `StartAllAdapters`, `StopAllAdapters`, `RequestGroupList`
- **Events** (Agent → TUI): `MessageReceived`, `MessageSent`, `AgentThinking`, `LlmRequest`, `LlmResponse`, `ToolCall`, `ToolResult`, `SessionUpdated`, `ApiConfigUpdated`, `AdapterStateChanged`, `AdapterList`, `GroupList`, `Error`

## Configuration Persistence

- Config changes via TUI `/api` are persisted to TOML via `persist_config()`
- Atomic write: write to `.tmp` then rename
- `api_key` is serialized (no `skip_serializing`)
- Sessions auto-saved every 30s to `echo-sessions.json`
- Sessions restored on startup
