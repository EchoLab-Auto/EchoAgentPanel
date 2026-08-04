# Adapter System

## Architecture

Adapters bridge messaging platforms into the agent framework. Each adapter implements the `Adapter` trait defined in `echo-adapter`.

```
echo-adapter (trait + types)
    ↑
    ├── echo-adapter-qq (QQ/OneBot)
    └── (future: telegram, discord, slack...)
```

## Adapter Trait

```rust
#[async_trait]
pub trait Adapter: Send + Sync {
    fn name(&self) -> &str;           // "qq"
    fn display_name(&self) -> &str;   // "QQ / OneBot"
    fn platform(&self) -> &str;       // "qq" (for session scoping)

    fn is_configured(&self) -> bool;
    fn status_info(&self) -> AdapterInfo;

    async fn start(&self) -> Result<(), AdapterError>;
    async fn stop(&self) -> Result<(), AdapterError>;

    // Send a message to the platform
    async fn send_message(&self, target: &MessageTarget, content: &str)
        -> Result<SendResult, AdapterError>;

    // Subscribe to incoming messages/events
    fn subscribe(&self, tx: mpsc::UnboundedSender<AdapterEvent>);

    // Filter pipeline for inbound messages
    fn filter_pipeline(&self) -> Option<&FilterPipeline> { None }

    // Platform-specific capabilities
    async fn get_groups(&self) -> Result<Vec<(i64, String)>, AdapterError> { Ok(vec![]) }
    fn has_group_list(&self) -> bool { false }
}
```

## Platform-Agnostic Types

### IncomingMessage
```rust
pub struct IncomingMessage {
    pub adapter_name: String,    // "qq"
    pub platform: String,        // "qq"
    pub user_id: String,         // platform user ID
    pub user_name: String,       // display name
    pub channel: ChannelType,    // Direct / Group { group_id }
    pub content: String,         // plain text
    pub timestamp: i64,
    pub at_me: bool,
}
```

### MessageTarget
```rust
pub struct MessageTarget {
    pub adapter_name: String,
    pub channel: ChannelType,
    pub user_id: String,
}
```

### AdapterEvent
```rust
pub enum AdapterEvent {
    MessageReceived(IncomingMessage),
    ConnectionState { adapter_name, connected, self_id },
    Stopped { adapter_name },
    Error { adapter_name, message },
}
```

## QQ Adapter (echo-adapter-qq)

### QqAdapter
Wraps `echo-server`'s reverse-WebSocket server. Key behaviors:

- **start()**: Binds TCP port, creates `QqHandler`, starts server task
- **stop()**: Sends shutdown signal via oneshot channel
- **send_message()**: Uses active `Context` to call OneBot API
- **Internal handler (QqHandler)**: Runs trigger gating → filter pipeline → agent.process_message → reply

### QQ Tools
Registered via `register_qq_tools()`:
- `send_group_msg` — Send text to QQ group
- `send_private_msg` — Send text to QQ user
- `get_group_member_info` — Get group member details
- `get_group_list` — List all joined groups

### NapCatClient
HTTP client for NapCat's WebUI API (`http://localhost:6099`):
- `check()` — Detect login state (Online / WaitingForLogin / Unreachable)
- `configure_reverse_ws()` — Auto-configure reverse WS client
- `fetch_qrcode_docker()` — Read QR PNG from Docker container
- `login_status()` — Query login state via WebUI or OneBot API

### Filter Pipeline
Six configurable filters applied in order:
1. **AdminBypass** — Admin users skip remaining filters
2. **Allowlist** — Only allow listed users/groups (HashSet, O(1) lookup)
3. **Denylist** — Block listed users/groups
4. **RateLimit** — Per-user / per-group / global sliding window
5. **KeywordBlock** — Block messages matching keywords or regex
6. **ContentLength** — Block messages exceeding max length

### QQ Connection Lifecycle
```
Adapter.start()
  └── Bind TCP port
  └── Wait for NapCat connection
       └── NapCat connects → QqHandler registered
            └── ConnectionEstablished event
            └── QQ messages flow through handler
       └── NapCat disconnects
            └── ConnectionLost event
            └── Server keeps listening for reconnection
Adapter.stop()
  └── Send shutdown signal
  └── Server task exits
```

## AdapterRegistry

Manages multiple adapters:
- `register(adapter)` — Add adapter
- `get(name)` — Get by name
- `list_info()` — Status of all adapters
- `start_all()` — Start all configured adapters
- `stop_all()` — Stop all running adapters
