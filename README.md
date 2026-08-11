# EchoAgentPanel

**EchoAgentCore 的 TUI 前端** —— 一个 opencode 风格的终端界面，通过
WebSocket（JSON 协议，默认 `ws://127.0.0.1:3132`）连接远程 Agent 核心服务。

本仓库只包含前端。Agent 核心（LLM agent 循环、工具/技能、会话记忆、QQ 适配器、
management WS 服务）在独立仓库 **EchoAgentCore** 中，可独立部署。

```
 EchoAgentCore (Core 服务)                EchoAgentPanel (本仓库)
 ┌──────────────────────────┐   WS/JSON   ┌─────────────────────────┐
 │ Agent · Tools · Skills · │ ◄─────────► │ echo-tui · 聊天/表单/   │
 │ Memory · QQ 适配器       │   :3132     │ 命令面板 · 设置弹窗      │
 └──────────────────────────┘             └─────────────────────────┘
        ▲ reverse WS :3131
   NapCat (QQ)
```

线协议（`BackendCommand`/`BackendEvent`）由 EchoAgentCore 仓库的
`echo-protocol` crate 定义，契约文档见 EchoAgentCore 的
`doc/develop/protocol.md`。

## 架构

Cargo workspace，源码位于 `source/`：

| crate | 路径 | 职责 |
|---|---|---|
| `echo-tui` | `source/tui/echo-tui` | 终端 UI：聊天区、命令系统、交互式表单、鼠标选区；`Backend` 双传输（WS / 进程内 mpsc） |
| `echo` | `source/echo` | 可执行程序 `echo-agent-panel`：配置加载、日志、WS 连接、启动 TUI |

前端对 Core 的全部依赖就是 `echo-protocol` 中的协议类型
（`BackendCommand`/`BackendEvent`/`GateMode` 等）——Panel 是纯粹的
"协议客户端"，不包含任何 agent 或 QQ 逻辑。

## 构建前置条件

`echo-tui` 通过**相对路径依赖**引用 EchoAgentCore 仓库的 `echo-protocol` crate，
因此两个仓库必须并排克隆：

```
…/echo_tech/
├── EchoAgentCore/    # 提供 echo-protocol
└── EchoAgentPanel/   # 本仓库
```

（如需改为 git 依赖，编辑 `source/tui/echo-tui/Cargo.toml` 中
`echo-protocol` 一行即可，见根 `Cargo.toml` 注释。）

## 快速开始

先确保 EchoAgentCore 服务已在运行（见 EchoAgentCore 的 README），然后：

```bash
# 配置（TUI 外观 + Core 连接地址）
cp config/echo-agent-panel.toml config/echo-agent-panel.local.toml

# 构建并运行
cargo run --release -- --config config/echo-agent-panel.local.toml
# 或直接用 --connect 指定 Core 地址（覆盖配置中的 connect_url）：
cargo run --release -- --connect ws://127.0.0.1:3132
```

Core 与 Panel 可部署在不同机器：Core 的 `[core] management_address` 需监听
可被 Panel 访问的地址（如 `0.0.0.0:3132`），Panel 的 `[core] connect_url`
指向该地址。Core 重启后 Panel 会自动重连（指数退避，1s→30s）。

### 安装（Linux）

```bash
./scripts/install.sh          # 先 --dry-run 查看路径
```

安装器把二进制装到 `~/.local/libexec/echo-agent-panel/`，启动器装到
`~/.local/bin/echo-agent-panel`，配置种子到
`~/.config/echo-agent-panel/panel.toml`。Panel 由用户手动启动，
无 systemd 服务（Core 的服务与自更新由 EchoAgentCore 的安装器负责）。

## TUI 用法

全屏模式，布局：`状态栏 | 聊天区 | 输入框`。

TUI 只显示一个全局时间线对话框，汇总本地、QQ 私聊和 QQ 群消息。顶部运行面板
显示最近活动分支的 `就绪 / 思考 / 工具 / Subagent / 完成 / 失败` 阶段、阶段耗时、
本轮总耗时、工具与 Subagent 次数及 Token 用量。聊天区底部会在运行期间显示动态
进度；工具调用的输入摘要、结果和耗时合并在同一条记录中，敏感参数会自动隐藏。

| 按键 | 功能 |
|---|---|
| 直接输入 | 打字即可输入，无需先按 Tab |
| `Enter` / `Shift+Enter` | 发送消息 / 换行 |
| `Ctrl+P` | 命令面板 |
| `Ctrl+X` 然后 `s` / `?` | API 配置 / 按键帮助 |
| `Ctrl+C`（连按两次） | 退出程序 |
| `PgUp` / `PgDn` / `Home` / `End` | 聊天区滚动 |
| 鼠标滚轮 | 聊天区滚动 |
| 鼠标拖拽 | 选中文字（松开即复制到剪贴板） |

### Slash 命令

| 命令 | 功能 |
|---|---|
| `/help` | 显示按键帮助 |
| `/api` | 交互式 API 配置（由 Core 持久化） |
| `/adapters` | 查看适配器状态 |
| `/qq login` | QQ 扫码登录 |
| `/qq setting` | QQ 设置（门控模式 + 白名单/黑名单管理） |
| `/context` | 查看已填充的上下文（token 占用与逐条明细） |
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

门控配置由 Core 持久化到 `[adapters.qq.gate]` 和 `[adapters.qq.filter]`，
重启后保留（详见 EchoAgentCore 的 `doc/develop/adapter/qq/gating.md`）。

## 配置说明

`config/echo-agent-panel.toml`（Panel 唯一配置）：

```toml
[logging]
level = "info"
format = "text"
log_file = ""             # 留空时使用 logs/echo-agent-panel.log（stdout 被 TUI 占用）
max_file_size_mb = 20
max_files = 5

[tui]
enabled = true
theme = "dark"            # dark | light

[core]
connect_url = "ws://127.0.0.1:3132"      # 远程 Core 地址（--connect 可覆盖）
```

Core 侧配置（provider/model/api_key、QQ 适配器、门控、自更新授权等）全部在
EchoAgentCore 仓库的 `config/echo-agent-core.toml`。Panel 中通过 `/api`、
`/qq setting` 等命令发起的修改，会经 management WebSocket 下发并由 Core
持久化。

## 测试

```bash
cargo test --workspace
cargo clippy --workspace --all-targets   # 必须零警告
cargo fmt --all --check
```

CI（`.github/workflows/ci.yml`）在 push/PR 时自动执行 fmt + clippy + test
（stable + nightly），并会先克隆 EchoAgentCore 作为 sibling 检出以满足
path 依赖。

## 目录结构

```
source/
├── tui/
│   └── echo-tui/           # TUI 终端界面（app/ 含事件处理子模块）
└── echo/                   # 可执行程序入口（echo-agent-panel）

config/echo-agent-panel.toml   # Panel 配置模板
doc/develop/
├── tui/design.md                    # TUI 架构设计
└── tui/qq-setting-interaction.md    # /qq setting 交互设计
scripts/install.sh                 # Panel 安装器
```

## 参考

- EchoAgentCore（Core 服务仓库，需并排克隆）
- [OneBot 11 协议](https://github.com/botuniverse/onebot-11)
- [NapCat 文档](https://napcat.napneko.icu/)
- [opencode](https://github.com/sst/opencode)
