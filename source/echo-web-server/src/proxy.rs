//! WebSocket 中继：浏览器 ↔ EchoAgentCore management WS。
//!
//! 每个浏览器 WS 连接对应一条到 Core 的专用连接。帧按原文转发，**不解析、
//! 不记录负载**——因此与日志、命令队列完全隔离，只在中继管道里经过。

use std::sync::Arc;
use std::time::Duration;

use axum::extract::ws::{Message as BrowserMessage, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use futures_util::{SinkExt, StreamExt};
use tokio::time::Instant;
use tokio_tungstenite::{connect_async, tungstenite::client::IntoClientRequest};
use tracing::warn;

/// 心跳间隔：每 30s 向两侧各发一次 Ping。
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(30);
/// 收割阈值：一侧超过 3 个心跳周期（90s）没有任何帧（含 Pong）→ 判定半死，
/// 断开整条链路。设备休眠/网络闪断留下的僵尸连接（对端收不到 FIN 就永远
/// 挂在 ESTABLISHED）因此被清理，客户端唤醒后重连拿到的是干净状态。
const REAP_AFTER: Duration = Duration::from_secs(90);

/// 写超时（2026-09）：转发一帧时若对端写阻塞超过该时限，判定该侧已死并
/// 断开链路。没有它时，冻结的浏览器标签页会让中继的写一直挂着——中继随即
/// 停止读取另一侧，Core 的发送缓冲对这条链路无界积压（实测一条僵尸链路
/// 积了 4MB notsent），白占内存也让该标签页的恢复更慢。心跳的 90s 收割
/// 只看"有没有帧路过"，写入阻塞发生在帧路过之前的转发里，两者互补。
const SEND_TIMEOUT: Duration = Duration::from_secs(10);

// 测试可用 ECHO_RELAY_HEARTBEAT_MS / ECHO_RELAY_REAP_AFTER_MS 缩短周期
//（暂停时钟下运行时 idle 自动推进与真实 I/O 存在竞争，集成测试走真实时间）。
fn heartbeat_interval() -> Duration {
    std::env::var("ECHO_RELAY_HEARTBEAT_MS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .map(Duration::from_millis)
        .unwrap_or(HEARTBEAT_INTERVAL)
}

fn reap_after() -> Duration {
    std::env::var("ECHO_RELAY_REAP_AFTER_MS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .map(Duration::from_millis)
        .unwrap_or(REAP_AFTER)
}

/// 一个上游 Core（`[[cores]]` 或单上游物化）。
#[derive(Clone)]
pub struct Upstream {
    pub name: Arc<str>,
    pub url: Arc<str>,
    pub access_token: Arc<str>,
}

/// Shared server state handed to handlers.
#[derive(Clone)]
pub struct AppState {
    /// 上游注册表（管理面 + 运行时唯一事实来源；中继经它拿初始集合
    /// 并订阅变更）。
    pub registry: Arc<crate::upstreams::UpstreamRegistry>,
    /// 在线上游名集合（中继编排层上报，管理 API 读取）。
    online: Arc<std::sync::RwLock<std::collections::HashSet<String>>>,
    /// Static frontend directory (built `web/dist`).
    pub static_dir: Arc<str>,
    /// Media library directory: Core 落盘的入站图片（`/media/<id>` 从这里读）。
    pub media_dir: Arc<str>,
    /// 访问令牌（空 = 无认证；见 config::ServerSection::access_token）。
    pub access_token: Arc<str>,
}

impl AppState {
    pub fn new(
        registry: Arc<crate::upstreams::UpstreamRegistry>,
        static_dir: Arc<str>,
        media_dir: Arc<str>,
        access_token: Arc<str>,
    ) -> Self {
        Self {
            registry,
            online: Arc::new(std::sync::RwLock::new(std::collections::HashSet::new())),
            static_dir,
            media_dir,
            access_token,
        }
    }

    /// 校验请求凭据：token 为空（未配置）恒放行；否则比对 Bearer 头或
    /// `?token=` 查询参数（WS 握手场景浏览器无法自定义头）。
    pub fn authorized(&self, headers: &axum::http::HeaderMap, query_token: Option<&str>) -> bool {
        if self.access_token.is_empty() {
            return true;
        }
        let bearer = headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "));
        bearer == Some(self.access_token.as_ref())
            || query_token == Some(self.access_token.as_ref())
    }

    /// 在线上游快照（管理 API 用）。
    pub fn online_upstreams(&self) -> std::collections::HashSet<String> {
        self.online.read().map(|s| s.clone()).unwrap_or_default()
    }

    fn set_online(&self, name: &str, online: bool) {
        if let Ok(mut set) = self.online.write() {
            if online {
                set.insert(name.to_string());
            } else {
                set.remove(name);
            }
        }
    }
}

/// `GET /ws` — upgrade the browser connection and bridge it to Core.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    if !state.authorized(&headers, params.get("token").map(String::as_str)) {
        return axum::http::StatusCode::UNAUTHORIZED.into_response();
    }
    ws.on_upgrade(move |socket| bridge(socket, state))
        .into_response()
}

/// 连一个上游；失败返回 None（其他上游不受影响——聚合视图下
/// 单上游离线不应拖垮整条浏览器链路）。
async fn connect_upstream(
    upstream: &Upstream,
) -> Option<
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
> {
    let core_request = match upstream.url.as_ref().into_client_request() {
        Ok(mut request) => {
            if !upstream.access_token.is_empty() {
                let value = format!("Bearer {}", upstream.access_token);
                match value.parse() {
                    Ok(value) => {
                        request.headers_mut().insert("authorization", value);
                    }
                    Err(error) => {
                        warn!(%error, "invalid Core access token");
                        return None;
                    }
                }
            }
            request
        }
        Err(error) => {
            warn!(%error, "invalid Core WebSocket URL");
            return None;
        }
    };
    match connect_async(core_request).await {
        Ok((core, _)) => Some(core),
        Err(error) => {
            warn!(
                core = %upstream.url,
                %error,
                "cannot connect to Core management WS; upstream skipped"
            );
            None
        }
    }
}

/// 给上游事件帧加壳：`{core: "<上游名>", frame: <原 WsMessage>}`。
/// 解析只为加壳（serde_json Value 级），不触碰业务载荷。
fn wrap_event(upstream_name: &str, text: &str) -> Option<String> {
    let frame: serde_json::Value = serde_json::from_str(text).ok()?;
    Some(
        serde_json::json!({
            "core": upstream_name,
            "frame": frame,
        })
        .to_string(),
    )
}

/// 拆浏览器命令帧的壳：`{core: "...", frame: {...}}` → 目标上游名 + 原文；
/// 无壳（单上游旧前端）→ 广播给全部上游（单上游时即唯一上游）。
/// 无壳命令（未选中会话/上游）仅允许只读白名单广播；写/删除类必须
/// 显式指定目标 core——否则一次点击扇出到全部上游（批量清历史）。
fn is_readonly_command(type_str: &str) -> bool {
    matches!(
        type_str,
        "RequestTeamsList"
            | "RequestAdapterList"
            | "RequestState"
            | "RequestConfig"
            | "RequestWorkspaces"
            | "RequestSessions"
            | "RequestTrunkTimeline"
            | "RequestActiveTurns"
            | "RequestFederationStatus"
            | "RequestFederationInvite"
            | "RequestNodeStatus"
            | "Ping"
    )
}

fn unwrap_command(text: &str) -> (Option<String>, String) {
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(text) {
        if let (Some(core), Some(frame)) = (v.get("core"), v.get("frame")) {
            if let Some(name) = core.as_str() {
                return (Some(name.to_string()), frame.to_string());
            }
        }
    }
    (None, text.to_string())
}

/// 一条活跃上游链路的句柄（命令写端 + 任务中止键）。
struct CoreLink {
    cmd_tx: tokio::sync::mpsc::Sender<String>,
    abort: tokio::task::AbortHandle,
}

async fn bridge(browser: WebSocket, state: AppState) {
    let (mut browser_tx, mut browser_rx) = browser.split();
    // 每上游一条「浏览器→Core」转发任务（命令按壳路由/无壳广播）与
    // 「Core→浏览器」加壳转发任务（汇合进单一 mpsc 出口）。
    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel::<BrowserMessage>(256);
    let (cmd_tx, mut cmd_rx) = tokio::sync::mpsc::channel::<(Option<String>, String)>(256);

    let reap_after = reap_after();
    let links: Arc<tokio::sync::RwLock<std::collections::HashMap<String, CoreLink>>> =
        Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new()));

    // ── 动态上游接入（RelayHub 编排，2026-10）──
    // spawn_link：连一个上游并注册进 links（读泵 + 写泵两件套）；
    // 之后订阅注册表变更：Upsert 接入/重连，Removed 摘除。
    // 加壳开关：注册表上游数 > 1（动态——管理面增删即时生效）。
    let multi = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let spawn_link: std::sync::Arc<dyn Fn(crate::upstreams::UpstreamConfig) + Send + Sync> = {
        let links = links.clone();
        let event_tx = event_tx.clone();
        let state2 = state.clone();
        let spawn_multi = multi.clone();
        std::sync::Arc::new(move |cfg: crate::upstreams::UpstreamConfig| {
            let links = links.clone();
            let event_tx = event_tx.clone();
            let state = state2.clone();
            let multi = spawn_multi.clone();
            let _handle = tokio::spawn(async move {
                let upstream = Upstream {
                    name: Arc::from(cfg.name.as_str()),
                    url: Arc::from(cfg.url.as_str()),
                    access_token: Arc::from(cfg.access_token.as_str()),
                };
                let name = cfg.name.clone();
                // 断连重连循环：Core 重启/闪断后退避重试（1s→30s），不再
                // 一断即永久离线。浏览器断开（event_tx 关闭）即停止。
                let mut backoff = std::time::Duration::from_secs(1);
                loop {
                    let Some(core) = connect_upstream(&upstream).await else {
                        state.set_online(&name, false);
                        tokio::time::sleep(backoff).await;
                        backoff = (backoff * 2).min(std::time::Duration::from_secs(30));
                        continue;
                    };
                    backoff = std::time::Duration::from_secs(1);
                    state.set_online(&name, true);
                    // 每轮克隆句柄——reader/心跳任务 move 走本轮副本，
                    // 下轮重连仍可用。
                    let event_tx = event_tx.clone();
                    let multi = multi.clone();
                    let (mut core_tx, mut core_rx) = core.split();
                    let (cmd_tx, mut cmd_rx) = tokio::sync::mpsc::channel::<String>(256);
                    let heartbeat_tx = cmd_tx.clone();
                    let writer = tokio::spawn(async move {
                        while let Some(text) = cmd_rx.recv().await {
                            // 空字符串 = 心跳占位
                            if text.is_empty() {
                                if core_tx
                                    .send(tokio_tungstenite::tungstenite::Message::Ping(Vec::new()))
                                    .await
                                    .is_err()
                                {
                                    break;
                                }
                                continue;
                            }
                            let frame = tokio_tungstenite::tungstenite::Message::Text(text);
                            match tokio::time::timeout(SEND_TIMEOUT, core_tx.send(frame)).await {
                                Ok(Ok(())) => {}
                                _ => break,
                            }
                        }
                        let _ = core_tx.close().await;
                    });
                    let name2 = name.clone();
                    let reader = tokio::spawn(async move {
                        let mut last_frame = Instant::now();
                        let mut hb = tokio::time::interval(heartbeat_interval());
                        hb.tick().await;
                        loop {
                            tokio::select! {
                                message = core_rx.next() => {
                                    let message = match message {
                                        Some(Ok(m)) => m,
                                        _ => break,
                                    };
                                    last_frame = Instant::now();
                                    let forward = match message {
                                        tokio_tungstenite::tungstenite::Message::Text(text) => {
                                            let out = if multi.load(std::sync::atomic::Ordering::Relaxed) {
                                                match wrap_event(&name2, &text) {
                                                    Some(w) => w,
                                                    None => continue, // 非 JSON 帧：丢弃
                                                }
                                            } else {
                                                text.to_string()
                                            };
                                            BrowserMessage::Text(out.into())
                                        }
                                        tokio_tungstenite::tungstenite::Message::Ping(p) => {
                                            BrowserMessage::Ping(p.to_vec().into())
                                        }
                                        tokio_tungstenite::tungstenite::Message::Pong(p) => {
                                            BrowserMessage::Pong(p.to_vec().into())
                                        }
                                        tokio_tungstenite::tungstenite::Message::Binary(_)
                                        | tokio_tungstenite::tungstenite::Message::Close(_) => break,
                                        _ => continue,
                                    };
                                    if event_tx.send(forward).await.is_err() {
                                        break;
                                    }
                                }
                                _ = hb.tick() => {
                                    if last_frame.elapsed() > reap_after {
                                        warn!(core = %name2, "core side silent, reaping relay link");
                                        break;
                                    }
                                    let _ = heartbeat_tx.send(String::new()).await;
                                }
                            }
                        }
                    });
                    let abort = reader.abort_handle();
                    let writer_abort = writer.abort_handle();
                    links
                        .write()
                        .await
                        .insert(name.clone(), CoreLink { cmd_tx, abort });
                    state.set_online(&name, true);
                    // 读泵退出 = 链路死亡：清理（写泵一并中止）。
                    let links2 = links.clone();
                    let state3 = state.clone();
                    let name3 = name.clone();
                    tokio::spawn(async move {
                        let _ = reader.await;
                        writer_abort.abort();
                        links2.write().await.remove(&name3);
                        state3.set_online(&name3, false);
                    });
                    // 读泵退出后等待其完成（短暂），再回到 loop 顶部退避重连。
                    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                }
            });
        })
    };

    /// 加壳开关按**在线链路数**（而非注册表条数）：两条配置一条
    /// 离线时，唯一在线上游的帧不再无谓加壳（语义对齐"聚合视图"）。
    async fn refresh_multi(
        registry: &Arc<crate::upstreams::UpstreamRegistry>,
        multi: &Arc<std::sync::atomic::AtomicBool>,
        links: &Arc<tokio::sync::RwLock<std::collections::HashMap<String, CoreLink>>>,
    ) {
        let _ = registry; // 注册表保留参数位（后续可按需混合判定）
        multi.store(
            links.read().await.len() > 1,
            std::sync::atomic::Ordering::Relaxed,
        );
    }

    // 初始上游接入（零上游 = 空转等待——管理面添加后变更泵接入）。
    for cfg in state.registry.list().await {
        if !cfg.url.is_empty() {
            spawn_link(cfg);
        }
    }
    refresh_multi(&state.registry, &multi, &links).await;

    // 注册表变更泵：Upsert →（旧链路摘除后）接入；Removed → 摘除。
    {
        let mut events = state.registry.subscribe();
        let links2 = links.clone();
        let state2 = state.clone();
        let multi2 = multi.clone();
        let spawn_link2 = spawn_link.clone();
        tokio::spawn(async move {
            loop {
                // Lagged（广播溢出）不退出——继续收最新事件（链路表以
                // 注册表当前态为准，丢中间变更可接受；泵死了才是
                // links 与注册表永久分叉）。
                let event = match events.recv().await {
                    Ok(e) => e,
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                        tracing::warn!("upstream event pump lagged {n}, resyncing links");
                        // 以注册表当前态重放 Upsert（幂等接入/重连）。
                        for cfg in state2.registry.list().await {
                            if links2.read().await.contains_key(&cfg.name) {
                                continue;
                            }
                            if !cfg.url.is_empty() {
                                spawn_link2(cfg);
                            }
                        }
                        refresh_multi(&state2.registry, &multi2, &links2).await;
                        continue;
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                };
                match event {
                    crate::upstreams::UpstreamEvent::Upsert(cfg) => {
                        if let Some(old) = links2.write().await.remove(&cfg.name) {
                            old.abort.abort();
                        }
                        state2.set_online(&cfg.name, false);
                        if !cfg.url.is_empty() {
                            spawn_link2(cfg);
                        }
                        refresh_multi(&state2.registry, &multi2, &links2).await;
                    }
                    crate::upstreams::UpstreamEvent::Removed { name } => {
                        if let Some(old) = links2.write().await.remove(&name) {
                            old.abort.abort();
                        }
                        state2.set_online(&name, false);
                        refresh_multi(&state2.registry, &multi2, &links2).await;
                    }
                }
            }
        });
    }

    drop(event_tx);

    // 命令路由泵：浏览器命令 → 目标上游（无壳 = 广播全部在线上游）。
    // 目标表是动态 links（管理面增删即时生效）。
    let route_pump = {
        let links = links.clone();
        tokio::spawn(async move {
            while let Some((target, text)) = cmd_rx.recv().await {
                let links = links.read().await;
                match target {
                    Some(name) => {
                        if let Some(link) = links.get(&name) {
                            let _ =
                                tokio::time::timeout(SEND_TIMEOUT, link.cmd_tx.send(text)).await;
                        }
                    }
                    None => {
                        // 无目标：只读白名单广播；写/删除类拒绝
                        // （避免一次点击扇出到全部上游——批量清历史）。
                        let readonly = serde_json::from_str::<serde_json::Value>(&text)
                            .ok()
                            .and_then(|v| {
                                v.get("payload")
                                    .and_then(|p| p.get("type"))
                                    .and_then(|t| t.as_str())
                                    .map(str::to_owned)
                                    .or_else(|| {
                                        v.get("type").and_then(|t| t.as_str()).map(str::to_owned)
                                    })
                            })
                            .is_some_and(|t| is_readonly_command(&t));
                        if readonly {
                            for link in links.values() {
                                let _ = tokio::time::timeout(
                                    SEND_TIMEOUT,
                                    link.cmd_tx.send(text.clone()),
                                )
                                .await;
                            }
                        } else {
                            warn!(
                                "rejected untargeted non-readonly command (no active core selected)"
                            );
                        }
                    }
                }
            }
        })
    };

    // 浏览器 → 命令通道（读浏览器帧 → 拆壳 → cmd_tx）+ 浏览器侧心跳
    // 与半死收割（与原单上游中继同语义：收割阈值内浏览器无任何帧
    // （含 Pong）即断开整条链路；每 30s 向浏览器发 Ping）。
    let (browser_ping_tx, mut browser_ping_rx) = tokio::sync::mpsc::channel::<()>(8);
    let browser_read = tokio::spawn(async move {
        let mut last_frame = Instant::now();
        let mut hb = tokio::time::interval(heartbeat_interval());
        hb.tick().await;
        loop {
            tokio::select! {
                message = browser_rx.next() => {
                    let message = match message {
                        Some(Ok(m)) => m,
                        _ => break,
                    };
                    last_frame = Instant::now();
                    match message {
                        BrowserMessage::Text(text) => {
                            let (target, frame) = unwrap_command(&text);
                            if cmd_tx.send((target, frame)).await.is_err() {
                                break;
                            }
                        }
                        BrowserMessage::Ping(_) | BrowserMessage::Pong(_) => {}
                        BrowserMessage::Binary(_) | BrowserMessage::Close(_) => break,
                    }
                }
                _ = hb.tick() => {
                    if last_frame.elapsed() > reap_after {
                        warn!("browser side silent, reaping relay link");
                        break;
                    }
                    // 向浏览器发 Ping（经事件出口统一写端）；出口满/关
                    // 不判死（事件流可能正忙），下周期重试。
                    let _ = browser_ping_tx.try_send(());
                }
            }
        }
        drop(cmd_tx);
    });

    // 事件出口：event_rx + 心跳 Ping → 浏览器（带写超时）。
    let browser_write = tokio::spawn(async move {
        loop {
            tokio::select! {
                frame = event_rx.recv() => {
                    let Some(frame) = frame else { break };
                    match tokio::time::timeout(SEND_TIMEOUT, browser_tx.send(frame)).await {
                        Ok(Ok(())) => {}
                        _ => break,
                    }
                }
                _ = browser_ping_rx.recv() => {
                    if browser_tx
                        .send(BrowserMessage::Ping(Vec::new().into()))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
            }
        }
        let _ = browser_tx.close().await;
    });

    // 任一方向退出即整条链路收尾（显式 abort 其余——spawn 任务在
    // select! 取消后仍独立运行，不 abort 则 browser_write 挂在
    // event_rx（链路读泵持有 event_tx）永远不退出）。
    let route_abort = route_pump.abort_handle();
    let read_abort = browser_read.abort_handle();
    let write_abort = browser_write.abort_handle();
    tokio::select! {
        _ = route_pump => { read_abort.abort(); write_abort.abort(); }
        _ = browser_read => { route_abort.abort(); write_abort.abort(); }
        _ = browser_write => { route_abort.abort(); read_abort.abort(); }
    }
}
