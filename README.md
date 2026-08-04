# EchoAgentPanel

一个用 Rust 编写的 **AI Agent 框架**，支持通过 [OneBot v11](https://github.com/botuniverse/onebot-11) 协议接入 QQ（[NapCat](https://napcat.napneko.icu/)），内置 **OpenCode 风格 TUI 终端界面**。

```
                    ┌────────────────────────────────────────┐
QQ 用户 ──> NapCat ──反向 WS──> echo-server ──> HandlerRegistry
 (登录端)                               │                  └──> QqHandler
                                        │                       │
                                        ▼                       ▼
                                 echo-agent (Agent 框架)     过滤管道
                                 LLM / Tools / Skills / Memory  │
                                        │                       │
                               BackendBridge (mpsc / WS)       │
                                        │                       │
                                        ▼                       ▼
                                 echo-tui (TUI 终端)    QQ 门控配置
```

## 架构

Cargo workspace，源码位于 `source/`：

| crate | 路径 | 职责 |
|---|---|---|
| `echo-core` | `source/backend/echo-core` | OneBot v11 协议类型（纯 serde，无 I/O） |
| `echo-server` | `source/backend/echo-server` | 反向 WebSocket 服务端 |
| `echo-adapter` | `source/backend/echo-adapter` | 适配器 trait、消息类型、过滤管道、注册中心 |
| `echo-agent` | `source/backend/echo-agent` | Agent 框架：LLM Provider、工具、技能、会话记忆 |
| `echo-adapter-qq` | `source/backend/echo-adapter-qq` | QQ/OneBot 适配器：消息处理、过滤配置、NapCat API |
| `echo-tui` | `source/tui/echo-tui` | 终端 UI：聊天区、命令系统、交互式表单、鼠标选区 |
| `echo` | `source/echo` | 可执行程序：配置加载、接线、多运行模式 |

## 快速开始

### 1. 部署 NapCat

```bash
docker run -d -p 6099:6099 -p 3000:3000 -p 3001:3001 mlikiowa/napcat-docker:latest
```

打开 `http://<服务器IP>:6099`（WebUI），用手机 QQ 扫码登录。

### 2. 配置并运行

```bash
cp config/echo-agent-panel.toml config/echo-agent-panel.local.toml
# 编辑 [agent]：provider / model / api_key

# 完整模式（Core + TUI 同进程）
cargo run --release -- --config config/echo-agent-panel.local.toml

# 仅 Core（无头模式）
cargo run --release -- --config config/echo-agent-panel.local.toml --headless

# 仅 TUI（连接远程 Core）
cargo run --release -- --connect ws://127.0.0.1:3132
```

### 3. 验证

- **私聊**机器人任意消息 → Agent 自动回复
- **群聊** @机器人 → Agent 回复
- TUI 中输入 `/qq login` 查看扫码状态

## TUI 用法

全屏模式，布局：`状态栏 | 聊天区 | 输入框`。

| 按键 | 功能 |
|---|---|
| 直接输入 | 打字即可输入，无需先按 Tab |
| `Enter` / `Shift+Enter` | 发送消息 / 换行 |
| `Ctrl+P` | 命令面板 |
| `Ctrl+X` 然后 `o` / `s` / `?` | 切换会话 / API 配置 / 按键帮助 |
| `Ctrl+C`（连按两次） | 退出程序 |
| `PgUp` / `PgDn` / `Home` / `End` | 聊天区滚动 |
| 鼠标滚轮 | 聊天区滚动 |
| 鼠标拖拽 | 选中文字（松开即复制到剪贴板） |

### Slash 命令

| 命令 | 功能 |
|---|---|
| `/help` | 显示按键帮助 |
| `/api` | 交互式 API 配置 |
| `/clear` | 清空当前会话 |
| `/resume` | 恢复历史会话 |
| `/adapters` | 查看适配器状态 |
| `/qq login` | QQ 扫码登录 |
| `/qq setting` | QQ 设置（门控模式 + 白名单/黑名单管理） |
| `/quit` | 退出程序 |

### QQ 门控管理 (`/qq setting`)

```
/qq setting
  └── 门控模式（三选一，互斥）
      ├── ○ 无约束 — 所有人可用
      ├── ● 白名单模式 — 仅白名单中的用户/群可用
      └── ○ 黑名单模式 — 禁止黑名单中的用户/群
  └── 名单管理
      ├── 🔒 管理白名单 → 显示 QQ 群列表，Enter 切换
      └── 🚫 管理黑名单 → 同上
```

门控配置持久化到 `[adapters.qq.gate]` 和 `[adapters.qq.filter]`，重启后保留。

## 配置说明

```toml
[core]
management_address = "127.0.0.1:3132"  # Panel 连接地址（Core/Panel 分离模式）

[logging]
level = "info"
format = "text"

[adapters.qq]
enabled = true
owner_qq = 0                            # 管理员 QQ（0=禁用，管理员消息绕过所有过滤）
command_prefix = "/"
napcat_webui_url = "http://localhost:6099"

[adapters.qq.server]
bind_address = "0.0.0.0:3131"
access_token = ""
heartbeat_interval = 30

[adapters.qq.trigger]
dm_auto_reply = true                    # 私聊自动回复
group_at_reply = true                   # 群聊仅 @ 回复

[adapters.qq.filter.allowlist]          # 白名单（运行时可通过 /qq setting 修改）
user_ids = []
group_ids = []

[adapters.qq.filter.denylist]           # 黑名单
user_ids = []
group_ids = []

[agent]
provider = "deepseek"
model = "deepseek-v4-flash"
base_url = "https://api.deepseek.com/anthropic"
api_key = ""
system_prompt = "请你使用中文"
max_tool_iterations = 1024
memory_limit = 40
skills_dir = "skills"

[tui]
enabled = true
theme = "dark"
```

## LLM Provider

| provider | 说明 | 端点 |
|---|---|---|
| `openai` | OpenAI 及兼容端点 | `https://api.openai.com/v1` |
| `deepseek` | DeepSeek（OpenAI/Anthropic 兼容） | `https://api.deepseek.com/anthropic` |
| `anthropic` | Claude Messages API | `https://api.anthropic.com/v1` |
| `ollama` | 本地模型 | `http://localhost:11434/v1` |

## 测试

```bash
cargo test --workspace
```

## 目录结构

```
source/
├── backend/
│   ├── echo-core/          # OneBot v11 协议类型
│   ├── echo-server/        # 反向 WS 服务端
│   ├── echo-adapter/       # 适配器 trait + 过滤管道
│   ├── echo-agent/         # Agent 框架
│   └── echo-adapter-qq/    # QQ 适配器
├── tui/
│   └── echo-tui/           # TUI 终端界面
└── echo/                   # 可执行程序入口

doc/
├── develop/
│   ├── adapter/qq/gating.md        # QQ 门控设计
│   ├── tui/design.md               # TUI 架构设计
│   └── config/persistence.md       # 配置持久化
└── design/
    └── adapter/qq/gating.md        # 门控设计精简版
```

## 参考

- [OneBot 11 协议](https://github.com/botuniverse/onebot-11)
- [NapCat 文档](https://napcat.napneko.icu/)
- [opencode](https://github.com/sst/opencode)
