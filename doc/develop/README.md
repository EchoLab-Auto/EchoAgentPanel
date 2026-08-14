# EchoAgentPanel Development Documentation

EchoAgentPanel 是 EchoAgentCore 的 **Web 面板**：Rust 后端（axum）托管 React
前端，并把浏览器 WebSocket 中继到 Core 的 management WS。终端 UI 已迁移到
EchoAgentTui 仓库。

## 仓库布局

```
EchoAgentPanel/
├── config/echo-agent-panel.toml     # 面板配置模板
├── source/echo-web-server/          # Rust 后端（axum + WS 中继）
│   ├── src/main.rs                  # 服务入口（静态托管 + /ws 路由）
│   ├── src/proxy.rs                 # 浏览器 ↔ Core 帧中继（不解析负载）
│   └── src/config.rs                # 面板配置加载
├── web/                             # React + TypeScript + Vite 前端
│   └── src/
│       ├── protocol.ts              # echo-protocol 线格式的 TS 镜像
│       ├── state.ts                 # 状态 + reducer（移植自 EchoAgentTui）
│       ├── ws.ts                    # WS 连接 hook（重连退避）
│       └── components/              # 聊天 / 设置 / sudo / QQ / 任务 / 清单
├── scripts/install.sh               # 一键安装（Rust + 前端）
├── scripts/uninstall.sh             # 卸载
└── doc/decisions/                   # 架构决策记录
```

## 开发

```bash
cargo test --workspace          # 后端测试（含 /ws 中继集成测试）
cd web && npm run build         # 前端类型检查 + 构建
cd web && npm run dev           # 前端热更新（/ws 代理到 :8080）
```

## 协议

前端不解析后端：后端只是字节级中继，帧格式由 echo-protocol 定义（信封
`{"type":"command|event|sudo_password","payload":{...}}`）。`web/src/protocol.ts`
镜像这些类型；改协议时两端（EchoAgentCore 的 echo-protocol 与本仓库的
protocol.ts）需同步更新。
