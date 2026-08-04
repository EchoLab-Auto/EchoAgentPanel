# Configuration

## File: `config/echo-agent-panel.toml`

Default config. Copy to `echo-agent-panel.local.toml` for local overrides.

## Sections

### `[server]` (Legacy — use `[adapters.qq.server]`)
```toml
[server]
bind_address = "0.0.0.0:3131"   # Reverse WS listen address
access_token = ""                # Shared token with NapCat
heartbeat_interval = 30          # Seconds, 0 = disable
```

### `[logging]`
```toml
[logging]
level = "info"    # trace | debug | info | warn | error
format = "text"   # text | json
log_file = ""     # Empty = auto: logs/echo-agent-panel.log (TUI) or stdout (headless)
```

### `[agent]`
```toml
[agent]
provider = "deepseek"                          # openai | deepseek | anthropic | ollama
model = "deepseek-v4-flash"
base_url = "https://api.deepseek.com/anthropic" # /anthropic suffix → Anthropic format
api_key = ""                                    # Empty = read from env var
active_api = "deepseek"                         # Which profile is active (empty = default)
system_prompt = "请你使用中文"
max_tool_iterations = 5
memory_limit = 40
skills_dir = "skills"

[[agent.api_profiles]]    # Multi-API storage
name = "deepseek"
provider = "deepseek"
model = "deepseek-v4-flash"
base_url = "https://api.deepseek.com/anthropic"
api_key = ""
```

### `[adapters.qq]`
```toml
[adapters.qq]
enabled = true

[adapters.qq.server]
bind_address = "0.0.0.0:3131"
access_token = ""
heartbeat_interval = 30

[adapters.qq.trigger]
dm_auto_reply = true      # Auto-reply to DMs
group_at_reply = true     # Only reply to @mentions in groups

[adapters.qq.filter.allowlist]
user_ids = []             # Empty = allow all
group_ids = []

[adapters.qq.filter.denylist]
user_ids = []
group_ids = []

[adapters.qq.filter.rate_limit]
per_user = { max_requests = 10, window_seconds = 60 }
per_group = { max_requests = 30, window_seconds = 60 }
global = { max_requests = 100, window_seconds = 60 }

[adapters.qq.filter.keyword]
block_keywords = ["广告", "spam"]
block_regex = ""

[adapters.qq.filter.content]
max_length = 2000
```

### `[bot]` (Legacy — use `[adapters.qq]`)
```toml
[bot]
owner_qq = 0              # QQ number for admin commands, 0 = disabled
command_prefix = "/"
```

### `[tui]`
```toml
[tui]
enabled = true
theme = "dark"            # dark | light
```

## Environment Variables

| Variable | Overrides |
|---|---|
| `ECHO_ACCESS_TOKEN` | `[server] access_token` |
| `OPENAI_API_KEY` | OpenAI provider API key |
| `DEEPSEEK_API_KEY` | DeepSeek provider API key (falls back to `OPENAI_API_KEY`) |
| `ANTHROPIC_API_KEY` | Anthropic provider API key |

## Provider Resolution

```
effective_api_key()
  1. config.api_key (if non-empty)
  2. Provider-specific env var (DEEPSEEK_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY)

effective_base_url()
  1. config.base_url (if non-empty)
  2. Provider default (https://api.openai.com/v1, https://api.anthropic.com, http://localhost:11434)
```

DeepSeek with `/anthropic` base_url suffix → routes to Anthropic Messages API format.

## Profile System

- `active_api` selects which `[[agent.api_profiles]]` entry is active
- When active profile exists, its values override top-level `[agent]` fields (only non-empty values)
- `/api switch <name>` changes active profile
- `/api key <key>` sets key on active profile (or default if none active)
- Config persisted on every `/api` change via atomic write (.tmp → rename)

## Session Persistence

- Sessions auto-saved to `<config-dir>/echo-sessions.json` every 30 seconds
- Format: JSON array of session objects with history
- Session ID: `{platform}:{scope}:{scope_id}:{user_id}`
- Restored on startup via `Agent::load_sessions()`
