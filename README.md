# EchoAgentPanel — Web 面板（Rust 后端 + Vue 3 前端）

对接 [EchoAgentCore](https://gitlab.com/echo_tech/EchoAgentCore) 的 Web UI 面板：
一个 axum HTTP/WS 后端把浏览器 WebSocket 中继到 Core 的 management WS
（默认 `ws://127.0.0.1:3132`），并托管构建后的 Vue 3 前端。

> 终端 UI（TUI）已迁移到独立的 [EchoAgentTui](https://github.com/EchoLab-Auto/EchoAgentTui) 仓库。

## 架构

```
浏览器 (Vue 3)  ── /ws ──►  echo-agent-panel (Rust 后端)
                              │  帧按原文转发，不解析、不落日志
                              ▼
                       EchoAgentCore management WS (:3132)
```

- **后端**（`source/echo-web-server`）：axum 静态托管 + WS 中继。每个浏览器连接
  对应一条到 Core 的连接；sudo 密码帧（`{"type":"sudo_password",...}`）只经过
  中继管道，与日志、命令队列完全隔离。
- **前端**（`web/`）：Vue 3 + TypeScript + Vite（组件库 @echolab-auto/ui-frame），零后端依赖，纯 WS 协议。

## 功能（对齐原 TUI）

- 全局时间线聊天（用户 / Agent / 工具 / 系统消息、推理过程折叠展示）
- 工具调用进度、后台任务 / Subagent / 临时回复分支面板、清单面板
- API 设置（provider / model / base_url / api_key / profiles / system prompt）
- 🔐 sudo 授权弹窗（遮罩密码，Enter 授权 / Esc 拒绝，专用通道提交）
- QQ 管理（多实例切换、扫码登录（Core 代理走 WS）、门控模式、白名单 / 黑名单、群 / 好友列表）、适配器启停
- 上下文快照、帮助与斜杠命令、深浅主题

## 快速开始（开发）

```bash
# 1. 启动 EchoAgentCore（其 management WS 默认在 127.0.0.1:3132）
cd ../EchoAgentCore && cargo run -p echo-agent-core -- --config config/echo-agent-core.toml

# 2. 构建并启动面板后端（另开终端）
cd EchoAgentPanel
cargo run -p echo-web-server -- --config config/echo-agent-panel.toml --static-dir web/dist
# 或前端热更新开发：cd web && npm run dev（/ws 已代理到 :8080）

# 3. 打开 http://<你的服务器IP>:8080（本机可用 http://localhost:8080）
```

## 安装（Linux，用户级）

```bash
./scripts/install.sh          # 先 --dry-run 查看路径
```

安装器构建 Rust 后端与 Vue 3 前端，装到 `~/.local/libexec/echo-agent-panel/`，
启动器到 `~/.local/bin/echo-agent-panel`，配置种子到
`~/.config/echo-agent-panel/panel.toml`。启动：

```bash
echo-agent-panel
# 打开 http://<你的服务器IP>:8080（地址取决于 [server] bind_address）
```

卸载：`./scripts/uninstall.sh`（保留 `panel.toml`；`--purge` 连配置一起删）。

## 配置

见 [config/echo-agent-panel.toml](config/echo-agent-panel.toml) 内联注释：

- `[server] bind_address`：HTTP/WS 监听地址（默认 `0.0.0.0:8080`，允许外部访问）
- `[server] static_dir`：前端静态目录（安装器注入绝对路径，一般无需改）
- `[core] connect_url`：Core management WS 地址（默认 `ws://127.0.0.1:3132`）
- `[qq]`：**遗留字段**（早期 Panel 直连 NapCat 时使用；2026-09-13 起 QQ 登录 / 二维码由 Core 代理走 WS，此段不再参与运行，保留仅为配置兼容）

## 文档

本仓库文档已合并到 EchoAgentCore 仓库的文档群（`document/`，ProDoc 格式）：

- `document/panel.md` — Panel 前端（仓库布局、数据流、视图规范、无状态中继架构）
- `document/panel-chat.md` — 会话视图（消息时序与入场动画）
- `document/ops-deploy.md` — Panel 安装 / 更新 / 卸载（与 Core 同篇）
