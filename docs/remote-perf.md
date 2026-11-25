# 远程访问下的面板性能：改动清单与部署检查

适用：Panel 跑在远端机器上、浏览器在另一台机器（MacBook 等）打开的场景。
本文分三部分——**代码侧做了什么**、**部署侧必须确认什么**、**怎么验证与回退**。

本地（`localhost`）访问时第二、三部分的差异基本感觉不到；远程访问下它们是
主要瓶颈，因为链路带宽与 RTT 会被放大到每一次页面加载与每一条消息上。

---

## 一、代码侧改动（2026-11）

### 1. WS 下行帧压缩（收益最大的一项）

**问题**：中继此前是**纯透传**。时间线首屏一帧（200 条）、长回答正文、工具
参数与结果全是裸 JSON 文本，中文场景压缩比常在 4:1 以上。

**做法**：中继对**超过 32 KiB** 的下行文本帧做 gzip，用 WS **二进制帧**下发：

```text
[ 'E' 'G' 'Z' '1' ][ gzip(utf8 json) ... ]
```

- 用二进制而不是 base64：base64 会放大 33%，正好吃掉一小半收益；
- 只压大帧：单条 delta / 心跳的压缩收益抵不过一次 gzip + 一次解压；
- **必须客户端声明**（WS query `frame_gzip=1`）才启用。浏览器支持
  `DecompressionStream` 时自动声明（Chrome 80+ / Safari 16.4+ / Firefox 113+），
  不支持则整条连接按明文转发——**旧前端、命令行调试完全不受影响**。

**顺序保证**：`DecompressionStream` 只有异步 API，所以前端维护一条串行解码
链——压缩帧开始解压后，紧随其后的普通帧排在它后面交付。否则工具结果会越过
它前面的叙述，`ChatView` 的分步边界会错。

涉及文件：`source/echo-web-server/src/ws_compress.rs`（新）、`proxy.rs`、
`web/src/ws-codec.ts`（新）、`web/src/connection.ts`。

### 2. 静态资源 brotli

同一份 JS/CSS 上 brotli 比 gzip 再省 15~20%。协商顺序：`br` → `gzip` → 明文；
压缩产物按 `(路径, 编码, mtime, 大小)` 进程内缓存，压缩跑在 `spawn_blocking`
（不阻塞 reactor）。质量取 5 而非 11：体积只差 2~4%，速度差 5~10 倍，而首次
请求是站在用户白屏时间的。

涉及文件：`source/echo-web-server/src/static_files.rs`。

### 3. 发消息本地回显（感知延迟最直接）

`SendMessage` → Core 处理 → `UserInput` 回推是一个完整往返。远程下 100~300ms
里输入框已清空、屏幕什么都没有，用户会以为没发出去而重发。

现在发送成功即插入一条 `pending` 用户行（淡态 + 「发送中」），真实事件到达
时**就地认领**（保留 Vue key，DOM 节点复用，视觉零跳变）。认领失败（内容被
Core 规范化、事件丢失）有 60 秒超时清理兜底。

涉及文件：`web/src/App.vue`、`web/src/state.ts`、
`web/src/state_domains/timeline.ts`、`web/src/chat-adapter.ts`、
`web/src/components/MessageItem.vue`。

### 4. 上游状态轮询自适应退避

原来固定 8s 一次 `/api/upstreams`：远程下每分钟 7 次完整往返，而状态绝大多数
时间不变。现在「有实质变化 → 保持 8s；连续无变化 → 8→16→24→30s」，状态一变
立刻回到 8s。判据**排除 `last_checked`**（后端每次探活都更新它，把它算进来
等于每轮都"有变化"，退避永不生效）。

涉及文件：`web/src/upstreams.ts`。

### 5. 帧解析只做一次

此前一帧解析 3~4 次（`JSON.parse` → `JSON.stringify` → 再 `parse`，`seqOf` /
`entryOf` 各自再 parse 一遍）。现在一次解析、全在对象上取字段。

涉及文件：`web/src/connection.ts`。

### 6. 渲染层：毛玻璃档位化 + 三层降级

浮层（会话浮层 / 弹出层 / agent 切换器）此前各自硬编码 `blur(24px) saturate(1.6)`，
没有统一下调入口。现在集中为 `--panel-glass-filter`，并加三层降级：

| 条件 | 效果 | 触发的典型场景 |
| --- | --- | --- |
| `min-resolution: 2dppx` | blur 24px → 12px，saturate 1.6 → 1.2 | MacBook 全系 |
| `prefers-reduced-transparency` | 整条滤镜置 `none` | macOS「降低透明度」 |
| 运行时探针（`frame-budget.ts`） | 连续掉帧后置 `none` | 外接 5K / 降频 / 低电量 / 链路突发 |

第三种是兜底：前两种靠媒体查询，而真正让面板变卡的条件组合（无风扇机降频、
双显示器、网络把多条帧挤进同一帧渲染）查不出对应的媒体特性。

另外把 `WorkRunGroup` 展开卡片的 `backdrop-filter: blur(16px)` 去掉了——它坐在
消息托盘（实色）上，模糊纯色背景在数学上等于原色，是纯开销（这套结论与之前
chip 的实测同源）。

涉及文件：`web/src/styles.css`、`frame-budget.ts`（新）、`SessionOverlay.vue`、
`PanelPopover.vue`、`AgentSwitcher.vue`、`WorkRunGroup.vue`、`main.ts`。

### 7. 没做 / 已存在（避免重复劳动）

- **会话切换缓存**：`state.sessionHistory` 早已是 12 份、按最近使用淘汰的 LRU
  （`state.ts:419`）。切回缓存的会话本来就是瞬时出画，这次只补了回归测试。
  超出 12 份的会话仍要等一次 RTT——如果常用会话更多，调大
  `SESSION_HISTORY_LIMIT` 即可（代价是常驻内存，每份最多 1000 条）。
- **虚拟滚动**：不做。变量高度（Markdown / 图片 / 代码块）的虚拟滚动要重做
  吸底、锚点、Ctrl+F、入场动画，而窗口化（200 条 + 按需扩窗）已经把成本压到
  与历史长度无关。
- **permessage-deflate**：不做。`axum` 0.8 的 `WebSocketUpgrade` 不暴露该配置，
  开启它要绕开升级 API 自己接裸 socket，收益与第 1 项相同而风险高一个数量级。

---

## 二、部署侧必须确认（不在代码里）

Panel 自己只监听 `axum::serve` 的**裸 TCP**，没有 TLS / HTTP/2。所以下面三项
取决于你前面那层（Caddy / nginx / Cloudflare Tunnel / frp / SSH 隧道）。

### 1. HTTP/2

首屏 `index.html` 里有 20 多个 `<script type="module">`。HTTP/2 下多路复用，基本
无感；HTTP/1.1 下受 6 连接并发限制，要 4 波左右——60ms RTT 就多花约 200ms。

```bash
# 确认协议版本
curl -sI --http2 https://your-panel/ | head -1
# 期望: HTTP/2 200
```

nginx 关键行：

```nginx
listen 443 ssl;
http2 on;                     # nginx ≥ 1.25.1；旧版用 listen 443 ssl http2;
```

Caddy 默认就开 h2，无需配置。

### 2. 不要二次压缩 / 不要剥离编码协商

Panel 已经按 `Accept-Encoding` 协商 brotli/gzip 并带 `Vary: accept-encoding`。
反代再做一层压缩是纯损耗（多一次 CPU、可能把已压缩的字节再压一遍）。

nginx：

```nginx
gzip off;                     # 让 Panel 自己协商
```

同时**不要**改写或删除 `Vary` 头——删了会让 CDN/浏览器缓存串表示（同一个 URL
缓存了明文版本，之后不支持的客户端拿到压缩字节，解不开）。

### 3. WS 不能缓冲

反向代理默认会缓冲 WS 帧来"优化"吞吐，代价是**每条流式 delta 都被攒着**
直到缓冲区满或超时——观感就是「回答一段一段蹦出来」。

nginx：

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;              # 关键：不要把 WS 帧攒起来
    proxy_read_timeout 3600s;         # 长连接别被 60s 默认值掐断
}
```

Caddy 的 `reverse_proxy` 对 WS 默认不缓冲，无需额外配置。

### 4. 如果是 SSH 隧道

SSH 隧道的单连接带宽与 RTT 抖动会盖过上面大部分前端优化。此时优先确认：

- 是否开了压缩：`ssh -C`（OpenSSH 的 zlib，对已 gzip 的 WS 帧**没有**收益，
  但对面板自己的明文协议帧仍有）；
- `ServerAliveInterval` 与 `TCPKeepAlive`（长连接被中间设备静默掐断时，前端
  的 45s 空闲看门狗会走重连，但那一轮问答就白等了）。

---

## 三、验证与回退

### 验证压缩是否真的在工作

Panel 日志里每条上游链路关闭时会打一行：

```text
frames=1234 compressed=56 "upstream link closed"
```

`compressed` 为 0 而 `frames` 很大 = 客户端没声明（浏览器太旧，或被中间设备
剥掉了 query）。此时若仍然卡，可以直接排除压缩路径。

前端侧在控制台看：

```js
typeof DecompressionStream              // 'function' = 支持，会自动声明
document.querySelector('html').dataset.perf   // 'low' = 探针已降级
```

### 回退

- **关压缩**（不改代码）：环境变量 `PANEL_WS_COMPRESS=0`，重启 Panel。
- **单独回退某一项**：`git checkout -- <file>`。各项互不依赖，可以只留压缩或
  只留回显。
- brotli 依赖：`Cargo.toml` 里的 `brotli = "7"`（约 3 个传递依赖）。

### 本地性能基线

```bash
cd source && cargo test -p echo-web-server      # 后端（含压缩/协商往返）
cd web && npx vitest run && npm run build       # 前端
```

前端测试里与本次改动直接相关的是：`ws-codec`、`optimistic-echo`、
`upstreams-backoff`、`frame-budget`、`session-history-lru`。
