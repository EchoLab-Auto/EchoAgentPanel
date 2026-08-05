# 配置持久化

## 概述

EchoAgentPanel 的配置分为两类持久化方式：

| 类型 | 机制 | 文件 |
|---|---|---|
| Agent 配置（API key、模型、prompt） | `replace_toml_section` 替换 `[agent]` section | 启动时 `--config` 指定的文件 |
| QQ 门控配置（gate mode、白名单、黑名单） | `toml::Value` 解析→修改→序列化 | 同上 |

两者都使用**原子写入**（写 tmp → rename），避免写入中途崩溃导致配置损坏。

## Agent 配置持久化

### 触发时机

| 操作 | 触发 |
|---|---|
| `/api switch <name>` | 切换 API profile → `persist_config()` |
| `/api key <key>` | 修改 API key → `persist_config()` |
| `/api model <name>` | 修改模型 → `persist_config()` |
| `/api provider <name>` | 修改 provider → `persist_config()` |
| `/api prompt <text>` | 修改 system prompt → `persist_config()` |
| `/api new <name>` | 新建 profile → `persist_config()` |

### 数据流

```
Panel 操作 (/api ...)
  → BackendCommand::UpdateApiConfig / SwitchApi / ...（经 management WS）
  → Core 的 Agent::apply_command()
    → 更新内存中的 AgentConfig
    → Agent::persist_config(&cfg)
      → 序列化 [agent] section 为 TOML
      → replace_toml_section(content, "agent", new_block)
      → 写入 {path}.tmp → rename → {path}
```

### 写入的文件位置

```
Core 启动时 --config 指定的文件（如 config/echo-agent-core.local.toml）的 [agent] section
```

Panel 自身不读写 Core 配置文件——所有配置操作都通过 Core 的 management
WebSocket API 下发，持久化统一在 Core 进程内完成。

### 不持久化的内容

以下配置只在启动时从文件读取，运行时修改不持久化：
- `[adapters.qq.server]`（bind_address、access_token、heartbeat_interval）
- `[adapters.qq.trigger]`（dm_auto_reply、group_at_reply）
- `[logging]`
- `[bot]`

## QQ 门控配置持久化

### 触发时机

| 操作 | 触发 |
|---|---|
| `/qq setting` 切换门控模式 | `set_gate_mode()` → `persist_filter()` |
| `/qq setting` → 白名单 → 切换群 | `update_allowlist()` → `persist_filter()` |
| `/qq setting` → 黑名单 → 切换群 | `update_denylist()` → `persist_filter()` |
| 手动输入 QQ 号添加/移除用户 | `update_allowlist()` / `update_denylist()` → `persist_filter()` |

### 数据流

```
Panel 操作 (/qq setting)（经 management WS）
  → BackendCommand::SetQqGateMode / UpdateQqAllowlist / UpdateQqDenylist
  → Agent::apply_command()
    → Adapter::set_gate_mode() / update_allowlist() / update_denylist()
    → 更新内存中的 runtime 字段
    → rebuild_filter_pipeline()（立即生效）
    → persist_filter()
      → toml::from_str() 解析配置文件
      → 修改 adapters.qq.gate.mode
      → 修改 adapters.qq.filter.allowlist / denylist
      → toml::to_string_pretty() 序列化
      → 写入 {path}.tmp → rename → {path}
```

### 写入的 section

```toml
[adapters.qq.gate]
mode = "allowlist"  # "none" | "allowlist" | "denylist"

[adapters.qq.filter.allowlist]
user_ids = [123456, 789012]
group_ids = [111222]

[adapters.qq.filter.denylist]
user_ids = []
group_ids = []
```

### 线程安全

- `QqInner` 中所有运行时字段使用 `StdMutex` 保护
- `persist_filter()` 锁定 `config_path` 和 `gate_mode`，不阻塞消息处理
- 过滤管道使用 `Arc<FilterPipeline>`，读取时克隆 Arc（O(1)），不持锁

### 不持久化的内容

- `rebuild_filter_pipeline()` 不触发持久化（只重建管道，不修改配置）
- `get_filter_config()` 只读不写

## 原子写入

两个持久化路径都使用相同的原子写入模式：

```
1. 读取当前文件内容
2. 在内存中修改目标 section
3. 写入 {path}.tmp（临时文件）
4. std::fs::rename({path}.tmp, {path})（原子替换）
```

`rename` 在同一文件系统上是原子操作（POSIX 保证），因此：
- 写入中途崩溃 → tmp 文件残留，原文件完整无损
- 不会出现"文件写一半"的损坏状态

## Session 持久化

会话（消息历史）的持久化由 `echo-agent` 的 session manager 管理，与上述配置持久化是独立的子系统。

| 属性 | 说明 |
|---|---|
| 文件 | `echo-sessions.json`（与可执行文件同目录） |
| 格式 | JSON 数组，每元素包含 `id`、`history`、`title` 等 |
| 触发 | 每次对话轮次结束时自动保存 |
| 加载 | 启动时自动恢复 |
