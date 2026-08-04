# EchoAgentPanel

一个用 Rust 编写的 **AI Agent 框架**，支持通过 [OneBot v11](https://github.com/botuniverse/onebot-11) 协议接入 QQ（[NapCat](https://napcat.napneko.icu/)），内置 **OpenCode 风格 TUI 终端界面**。

```
                    ┌──────────────────────────────────────┐
QQ 用户 ──> NapCat ──反向 WebSocket──> echo-server ──> HandlerRegistry
 (登录端)                               │                  └──> AgentHandler
                                       │                       │
                    ┌──────────────────┼───────────────────────┘
                    │                  ▼
                    │            echo-agent (Agent 框架)
                    │            LLM Provider / Tools / Skills / Memory
                    │                  │
                    │        BackendBridge (mpsc)
                    │                  ▼
                    └──> TUI ──> echo-tui (ratatui, opencode 风格)
```

## 架构

Cargo workspace 五个 crate，源码位于 `source/`：

| crate | 路径 | 职责 |
|---|---|---|
| `echo-core` | `source/backend/echo-core` | OneBot v11 协议类型：事件、动作、消息段（纯 serde，无 I/O） |
| `echo-server` | `source/backend/echo-server` | 反向 WebSocket 服务端：连接管理、handler 分发、API 调用关联 |
| `echo-agent` | `source/backend/echo-agent` | **Agent 框架**：LLM Provider、工具、技能、会话记忆、Agent 循环 |
| `echo-tui` | `source/tui/echo-tui` | **终端 UI**：聊天区、会话侧边栏、命令面板、按键帮助 |
| `echo` | `source/echo` | 可执行程序 `echo-agent-panel`：配置加载、接线、`--headless` 模式 |

依赖关系：`echo ──> echo-tui ──> echo-agent ──> echo-server ──> echo-core`

## 快速开始

### 1. 部署 NapCat（QQ 登录端）

```bash
docker run -d -p 6099:6099 -p 3000:3000 -p 3001:3001 mlikiowa/napcat-docker:latest
```

打开 `http://<服务器IP>:6099`（WebUI），用手机 QQ 扫码登录（⚠️ 不要用常用大号，有风控风险）。

### 2. 配置 NapCat 反向 WebSocket

WebUI → 网络配置 → 新建 → **WebSocket 客户端**：

| 配置项 | 值 |
|---|---|
| 地址 | `ws://<EchoAgentPanel 地址>:3131` |
| 消息格式 | Array |
| 心跳间隔 | 5000（毫秒） |
| Token（可选） | 与 `config/echo-agent-panel.toml` 的 `access_token` 一致 |

### 3. 配置 LLM 并运行

```bash
cp config/echo-agent-panel.toml config/echo-agent-panel.local.toml
# 编辑 [agent] 段：provider / model / api_key（或设 OPENAI_API_KEY 环境变量）

# 带 TUI 启动（默认）
cargo run --release -- --config config/echo-agent-panel.local.toml

# 无头模式（仅服务端）
cargo run --release -- --config config/echo-agent-panel.local.toml --headless
```

### 4. 验证

- 用另一个 QQ 号**私聊**机器人任意消息 → Agent 自动回复（LLM 生成）
- **群聊** @机器人 → Agent 回复
- 命令：`/echo hello`、`/help`、`/status`（管理员）、`/shutdown`（管理员）

## TUI 用法

界面为全屏模式（alternate screen），布局：顶部状态栏 + 全宽聊天区 + 底部输入框（无侧边栏）。

| 按键 | 功能 |
|---|---|
| `Tab` | 选中输入框（先选中再输入） |
| `Esc` | 取消输入框选中 |
| `Enter` / `Shift+Enter` | 发送消息 / 换行 |
| `Ctrl+P` | 命令面板（命令 / 切换会话列表） |
| `Ctrl+X` 然后 `o` / `s` / `?` | 切换会话 / 配置 API / 按键帮助 |
| `Ctrl+C`（连按两次） | 退出程序（第一次提示确认，2 秒内再按生效） |
| `PgUp` / `PgDn` / `Home` / `End` | 聊天区滚动 |

- 会话切换：`Ctrl+P` → 切换会话（或 `Ctrl+X` 然后 `o`），列表按最近活跃排序，当前会话预选
- 输入框 slash 命令：`/help` `/api` `/switch` `/clear` `/quit`
- 状态栏动效：LLM 思考中 spinner、工具执行指示、断开时连接点闪烁
- TUI 中发送的消息会进入本地会话（`user_0`），回复通过后端事件流实时显示

## 技能系统（Skills）

技能是 `skills/<name>/SKILL.md`，YAML frontmatter + Markdown 说明：

```markdown
---
name: web-search
description: 搜索网页获取最新信息
keywords: [搜索, 天气, 新闻]
---
# 使用说明
...
```

- **渐进披露**：Tier 1（name/description/keywords）注入系统提示词；消息命中关键词时加载完整指令（Tier 2）
- 内置示例：`skills/calculator`（配合 `calculator` 工具）、`skills/web-search`

## LLM Provider

| provider | 说明 | 环境变量 |
|---|---|---|
| `openai` | OpenAI 及所有兼容端点（DeepSeek、Moonshot、vLLM…） | `OPENAI_API_KEY` |
| `deepseek` | 同上（OpenAI 兼容） | `OPENAI_API_KEY` |
| `anthropic` | Claude Messages API | `ANTHROPIC_API_KEY` |
| `ollama` | 本地模型 | 无需 key |

支持工具调用（function calling），Agent 循环内最多执行 `max_tool_iterations` 轮工具。

## 配置说明

```toml
[logging]
level = "info"                  # trace | debug | info | warn | error
format = "text"                 # text | json
log_file = ""                   # 留空自动：TUI 模式写 logs/echo-agent-panel.log，headless 写 stdout

[server]
bind_address = "0.0.0.0:3131"   # 反向 WS 监听地址
access_token = ""               # 与 NapCat Token 一致；也可用环境变量 ECHO_ACCESS_TOKEN
heartbeat_interval = 30         # 心跳探测秒数，0 禁用

[agent]
provider = "openai"             # openai | deepseek | anthropic | ollama
model = "gpt-4o-mini"
base_url = ""                   # 留空用 provider 默认值
api_key = ""                    # 留空读环境变量
system_prompt = "..."           # 机器人人设
max_tool_iterations = 5
dm_auto_reply = true            # 私聊自动回复
group_at_reply = true           # 群聊仅 @回复
skills_dir = "skills"
memory_limit = 40               # 会话保留消息数

[tui]
enabled = true                  # --headless 可强制关闭
theme = "dark"                  # dark | light
```

## Docker 部署

```bash
docker build -t echo-agent-panel .
docker run -d -p 3131:3131 \
  -v $PWD/config:/app/config \
  -e OPENAI_API_KEY=sk-xxx \
  echo-agent-panel
```

容器内以 `--headless` 运行（无 TTY）。

## 测试

```bash
cargo test --workspace
```

- `echo-core`：OneBot v11 样本 JSON 的 serde 往返测试
- `echo-server`：集成测试——mock NapCat 反向 WS 连接，验证事件分发与 API echo 关联、鉴权
- `echo-agent`：Agent 循环、记忆边界、技能关键词匹配、SKILL.md 解析、计算器工具

## 扩展点

- **新 Handler**：实现 `echo_server::Handler` 注册到 `HandlerRegistry`（AgentHandler 即如此）
- **新工具**：实现 `echo_agent::Tool` trait 注册到 `ToolRegistry`
- **新技能**：添加 `skills/<name>/SKILL.md`
- **新 Provider**：实现 `echo_agent::LlmProvider` trait，在 `llm::create_provider` 注册

## 路线图

- [x] 接入 LLM（`echo-agent` crate：对话记忆 + 工具调用）
- [x] OpenCode 风格 TUI（`echo-tui` crate）
- [ ] 群管理命令（禁言/踢人/名片）
- [ ] 消息发送限速
- [ ] 会话持久化（SQLite）

## 参考

- [OneBot 11 协议](https://github.com/botuniverse/onebot-11)
- [NapCat 文档](https://napcat.napneko.icu/)
- [opencode](https://github.com/sst/opencode)
