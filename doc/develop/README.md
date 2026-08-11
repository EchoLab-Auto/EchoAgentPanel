# EchoAgentPanel Development Documentation

EchoAgentPanel 是 EchoAgentCore 的 **TUI 前端**：通过 management WebSocket
（JSON 协议，默认 `:3132`）连接远程 Core。线协议契约（`BackendCommand`/
`BackendEvent`/兼容规则）见 EchoAgentCore 仓库的 `doc/develop/protocol.md`。

## Index

| Document | Content |
|---|---|
| [install.md](install.md) | Panel 安装（二进制 + 启动器 + 配置种子） |
| [tui/design.md](tui/design.md) | TUI layout, components, state machine, slash commands, form overlay |
| [tui/qq-setting-interaction.md](tui/qq-setting-interaction.md) | /qq setting interaction design (gate mode + allow/denylist UI) |
| [testing.md](testing.md) | Test strategy for the frontend crates |

> Core 侧文档（agent 框架、QQ 适配器门控、配置持久化、自更新）已随拆分迁入
> EchoAgentCore 仓库的 `doc/develop/`。

## Quick Reference

### Project Structure
```
EchoAgentPanel/
├── config/echo-agent-panel.toml   # Panel 配置模板
├── source/
│   ├── tui/echo-tui/              # Terminal UI（协议客户端）
│   └── echo/                      # echo-agent-panel 二进制入口
├── doc/develop/                   # This documentation
├── scripts/install.sh             # Panel installer
└── Cargo.toml                     # Workspace manifest
```

### Dependency on EchoAgentCore

`echo-tui` 通过相对路径依赖引用 `../EchoAgentCore/source/protocol/echo-protocol`
——构建本仓库前需并排克隆 EchoAgentCore。前端使用的协议类型：

- `BackendCommand` / `BackendEvent` — 全部交互语义
- `BackendBridge` / `create_bridge` — 进程内 mpsc 传输（测试用）
- `serialize_command` / `deserialize_message` / `WsMessage` — WS 帧编解码
- `GateMode` / `ThinkingMode` / `ReasoningEffort` — 共享枚举

### Key Abstractions
- `Backend` — 双传输后端（WS 生产 / mpsc 测试），WS 带指数退避自动重连
- `AppState` — 全部 TUI 状态（消息、会话、滚动、焦点、表单）
- `Component` — TUI 组件（render + handle_event）
- Slash 命令经 `BackendCommand` 发往 Core；`/api`、`/qq setting` 的修改由
  **Core** 持久化（Panel 不写 Core 配置文件）

### Build & Run

```bash
# 前提：../EchoAgentCore 已克隆（echo-protocol path 依赖）
cargo run -- --config config/echo-agent-panel.local.toml
cargo run -- --connect ws://127.0.0.1:3132

# Tests
cargo test --workspace

# Quality gates (CI enforces all three)
cargo clippy --workspace --all-targets   # zero warnings required
cargo fmt --all --check
```
