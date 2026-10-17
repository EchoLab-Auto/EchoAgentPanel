# EchoAgentPanel — Web 面板（Rust 后端 + Vue 3 前端）

对接 [EchoAgentCore](https://github.com/EchoLab-Auto/EchoAgentCore) 的 Web UI 面板：
一个 axum HTTP/WS 后端把浏览器 WebSocket 中继到 Core 的 management WS
（默认 `ws://127.0.0.1:3132`），并托管构建后的 Vue 3 前端。

> 终端 UI（TUI）已迁移到独立的 [EchoAgentTui](https://github.com/EchoLab-Auto/EchoAgentTui) 仓库。

## 架构

```
浏览器 (Vue 3)  ── /ws ──►  echo-agent-panel (Rust 后端)
                              │  单上游：帧按原文转发，不解析、不落日志
                              │  多上游：{core, frame} 信封加壳/拆壳（仅信封层）
                              ▼
                  EchoAgentCore management WS（:3132，可多上游）
```

**多上游聚合视图（2026-10）**：`[[cores]]` 配置任意多条上游 Core——
浏览器单连接同时中继到全部上游，事件按来源加壳、会话列表带来源徽标、
命令按当前会话所属上游路由（未选中会话时无壳命令**广播全部上游**——多上游下全局类命令（如 RequestTeamsList）各端各收一份，聚合响应）。上游可在**设置·Core 连接**页在线增删
（写回 `[[cores]]` 段持久化，中继动态并入/摘除，无需重启）；
零上游部署留空即可，部署后在线添加。单上游（`[core]` 或一条
`[[cores]]`）为无壳直发路径。

- **后端**（`source/echo-web-server`）：axum 静态托管 + WS 中继。每个浏览器连接
  中继到**全部**上游（单上游 = 一条）；帧只经过中继管道，与日志、命令队列完全
  隔离。静态资源 gzip 协商 + 弱 ETag/304
  （`assets/` 带内容哈希 → 一年 immutable）；中继带写超时（对端卡死 10s 断链，
  防止慢标签页拖出无界发送缓冲）。
- **前端**（`web/`）：Vue 3 + TypeScript + Vite（组件库 @echolab-auto/ui-frame），零后端依赖，纯 WS 协议。
  刷新首屏零等待：时间线快照按 team 缓存到 localStorage（挂载前 hydrate），
  引导请求带 `since_seq` 只拉缺口（`trunk-cache.ts` + `connection.ts`）。

## 功能（对齐原 TUI）

- 全局时间线聊天（用户 / Agent / 工具 / 系统消息、推理过程折叠展示）
- 工具调用、思考（推理）与子代理完成统一为 chip 行（连续工作条目合并为一排小圆角矩形图标、点击展开详情；2026-10 一般化）、临时回复分支面板（入口行「任务」弹层，按当前会话过滤）、清单面板
- API 设置（provider / model / base_url / api_key / profiles；system prompt 在智能体配置弹层 AgentConfigModal 中编辑）；DeepSeek 余额查询（含充值/赠送分账）+ **余额与用量图表**（近 7 天：总览对比图 + profile 卡内嵌 sparkline；数据由 Core 本地积累，含 token 费用估算）
- QQ 管理（多实例切换、扫码登录（Core 代理走 WS）、门控模式、白名单 / 黑名单、群 / 好友列表）、适配器启停
- 工作区会话管理（入口行「工作区」宽版面板：多会话 / 多工作区目录 / 各目录 git 状态；文件浏览器已迁至会话视图右侧边栏，2026-09-19；`echo-agent.workspace` 插件）
- 上下文快照、深浅主题
- Core 连接（设置·Core 连接，2026-10 末联邦并入本页）：连接管理统一入口——
  上游区块（多上游聚合管理：在线增删/编辑上游、在线状态指示）+
  联邦区块（Core↔Core 配对：`echofed://` 邀请串、peers 列表与在线状态、会话迁移）
- **SSH 接入（2026-10）**：云服务器只开 SSH 端口时，上游可配「SSH 隧道」
  接入方式——Panel 内嵌 russh 直连 SSH，把远端 management 端口本地端口
  转发（direct-tcpip）给中继拨号（自动重连、指数退避、主机密钥 TOFU
  校验）；同一连接顺带读远端 Core 日志（日志页上游选择器）与聊天图片
  （媒体文件经隧道 `cat` 回源 + 本地缓存，`/media/<id>` 对远端图不再裂图）

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

### ui-frame 组件库引用方式（本地快照 ⇄ npm 包）

前端默认以**仓库内提交的本地快照**引用 `@echolab-auto/ui-frame`
（`web/vendor/ui-frame`，上游源码仓库的构建产物），也可一键切到 **npm 已发布包**：

```bash
npm run ui-frame:status          # 当前模式 + 安装形态 + npm dist-tags 对照
npm run ui-frame:npm             # 切到 npm 包（默认跟随当前通道：预发布用 dev、否则 latest）
npm run ui-frame:npm -- 1.3.2    # 或指定版本 / 标签 / 范围（一律解析为精确版本写入）
npm run ui-frame:local           # 切回本地快照（file:./vendor/ui-frame）
npm run ui-frame:sync            # 用 ui-frame 源码仓库刷新快照（默认 ~/code_file/gitlab/echo-tech/ui-frame，可用 UI_FRAME_REPO 覆盖）
npm run ui-frame:sync -- --build # 先构建源码仓库再刷新（联合开发 UI 库时用）
npm run ui-frame:diff            # 对比快照与 npm 版本——查看尚未发版的改动
npm run ui-frame:diff -- 1.3.2   # 对比指定版本 / 标签
```

约定与提示：

- **依赖行是唯一事实来源**（`web/package.json` 的 `@echolab-auto/ui-frame`）；
  切换会改写该行与 `package-lock.json`——**会出现在 git diff 里**，按需提交或回滚。
- 切到 npm 前先跑 `npm run ui-frame:diff`：本地快照常含**尚未发版**的修复
  （如 `useClipboard` 非安全上下文兜底），diff 会列出切过去会丢哪些文件。
- 本地联调 UI 库的循环：改 `ui-frame` 源码 → `npm run ui-frame:sync -- --build`
  → Panel dev server 若未热更新则重启（或 `npm run dev -- --force`）。
- 本地快照模式（`file:` 目录依赖）会连带安装快照 `package.json` 的
  devDependencies（storybook 等工具链，约 560 包）——首次安装偏慢属正常；
  切到 npm 模式会移除它们。
- CI 用 `npm ci` + 提交的 vendor 快照，无需任何切换动作。

### 前端质量脚本（`web/`）

```bash
cd web
npm test              # vitest（70 文件 / 570 用例）
npm run lint:styles   # 样式令牌守卫：幻影令牌 / --nf-* 禁用命名空间 / 拼写错
npm run build         # vue-tsc + vite 生产构建（视图与弹层按 import() 自动分包）
```

**样式令牌纪律（2026-10 起）**：只用 ui-frame 真实存在的 `--nm-*` 令牌与 Panel
的 `--panel-*` 语义色；禁止自造令牌名（历史上 37 处幻影令牌曾导致主题切换静默
失效）。`lint:styles` 会对照 ui-frame 的 `tokens.scss` 全量校验（源文件不在时
退化为名单检查）；玻璃浮层统一用 `--panel-glass-*` 配方，遮罩用 `--nm-mask-bg`。

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
- `[core] connect_url`：Core management WS 地址（默认 `ws://127.0.0.1:3132`；单上游形态——`[[cores]]` 键出现过即以在线管理为准）
- `[[cores]]`：多上游（可空 = 零上游部署；设置·Core 连接页在线增删并自动写回）
- `[[cores]]` 的 `[cores.ssh]` 段：SSH 接入（`host` / `user` / 可选
  `identity_file`、`port`、`remote_port`、`remote_media_dir` 等——出现即
  SSH 隧道模式，`url` 被忽略）；`[server] media_cache_dir`：远端媒体缓存目录

## 文档

本仓库文档已合并到 EchoAgentCore 仓库的文档群（`document/`，ProDoc 格式）：

- `document/panel/panel.md` — Panel 前端（仓库布局、数据流、视图规范、无状态中继架构）
- `document/panel/panel-chat.md` — 会话视图（消息时序与入场动画）
- `document/ops/ops-deploy.md` — Panel 安装 / 更新 / 卸载（与 Core 同篇）

## 工作区同步契约（2026-10）

工作区列表 `WorkspaceSessions` 是 Core 的权威快照，按 `(team_id, core)` 归属渲染；
Panel 在 WebSocket 建立、重连、切换 Agent/Core 时主动重新请求列表（不依赖工作区面板
是否打开、不依赖组件重新挂载），过期响应不能覆盖当前 Agent。

`SaveWorkspaceSession` 是全量 upsert：编辑工作区元数据时必须原样携带 `conversations`
与 `last_conversation`，不能把缺省字段当作“清空对话”，否则会话入口会被清空。

管理面当前仍采用事件回推模型；事件必须按 `core + team_id` 判断归属。涉及“删除对话 +
清理历史”的多步操作应由 UI 防重复提交（操作期间按钮去重并保留表单）、先串行清理对应
通道历史再提交更新，超时/错误需可见并可重试；未来协议中增加 request id / version，
以便 Core 原子化确认和乱序恢复。
