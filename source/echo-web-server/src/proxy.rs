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

/// 定向/无壳命令等待链路就绪的上限与轮询间隔：链路异步建立，握手期
/// 命令可能先于链路建成到达；有界等待吸收毫秒级建链竞态，上游确实离线
/// 时到点丢弃。
const LINK_READY_WAIT: Duration = Duration::from_secs(2);
const LINK_READY_POLL: Duration = Duration::from_millis(20);

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

/// 上游健康状态（管理 API 返回；2026-10 Core 连接可视性）。
#[derive(Debug, Clone, serde::Serialize)]
pub struct UpstreamHealth {
    /// 连通性：`online`（链路活跃）/ `connecting`（重连中）/ `offline`。
    pub connectivity: String,
    /// 认证：`ok`（握手成功即通过）/ `failed`（401/403 明确拒绝）/
    /// `unknown`（未验证或失败原因非认证）。
    pub auth: String,
    /// 最近一次错误描述（连接失败原因；成功时 None）。
    pub last_error: Option<String>,
    /// 最近检查时间（unix 秒）。
    pub last_checked: u64,
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Shared server state handed to handlers.
#[derive(Clone)]
pub struct AppState {
    /// 上游注册表（管理面 + 运行时唯一事实来源；中继经它拿初始集合
    /// 并订阅变更）。
    pub registry: Arc<crate::upstreams::UpstreamRegistry>,
    /// 上游健康表（中继编排层上报，管理 API 读取）：连通性 + 认证 +
    /// 最近错误 + 最近检查时间。
    health: Arc<std::sync::RwLock<std::collections::HashMap<String, UpstreamHealth>>>,
    /// Static frontend directory (built `web/dist`).
    pub static_dir: Arc<str>,
    /// Media library directory: Core 落盘的入站图片（`/media/<id>` 从这里读）。
    pub media_dir: Arc<str>,
    /// SSH 隧道管理器（SSH 接入的上游；媒体拉取/远端日志也经它）。
    pub tunnels: Arc<crate::ssh::SshTunnels>,
    /// 访问令牌（空 = 无认证；见 config::ServerSection::access_token）。
    pub access_token: Arc<str>,
}

impl AppState {
    pub fn new(
        registry: Arc<crate::upstreams::UpstreamRegistry>,
        static_dir: Arc<str>,
        media_dir: Arc<str>,
        access_token: Arc<str>,
        tunnels: Arc<crate::ssh::SshTunnels>,
    ) -> Self {
        Self {
            registry,
            health: Arc::new(std::sync::RwLock::new(std::collections::HashMap::new())),
            static_dir,
            media_dir,
            tunnels,
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

    /// 上游健康快照（管理 API 用）。
    pub fn upstream_health(&self) -> std::collections::HashMap<String, UpstreamHealth> {
        self.health.read().map(|m| m.clone()).unwrap_or_default()
    }

    fn set_health(&self, name: &str, health: UpstreamHealth) {
        if let Ok(mut map) = self.health.write() {
            map.insert(name.to_string(), health);
        }
    }

    /// 是否有任一浏览器中继的活跃链路（探活泵据此让位——链路状态
    /// 比探活更准）。
    pub fn has_active_link(&self, name: &str) -> bool {
        self.health
            .read()
            .map(|m| {
                m.get(name)
                    .map(|h| h.connectivity == "online")
                    .unwrap_or(false)
            })
            .unwrap_or(false)
    }

    fn set_offline(&self, name: &str, error: Option<String>) {
        self.set_health(
            name,
            UpstreamHealth {
                connectivity: "offline".into(),
                auth: "unknown".into(),
                last_error: error,
                last_checked: now_unix(),
            },
        );
    }

    fn set_online_ok(&self, name: &str) {
        // WS 握手成功 = TCP+HTTP 通且认证通过（失败握手不会走到这里）。
        self.set_health(
            name,
            UpstreamHealth {
                connectivity: "online".into(),
                auth: "ok".into(),
                last_error: None,
                last_checked: now_unix(),
            },
        );
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
/// 连接失败分类（健康上报用）：配置错误 / 网络不可达 / 认证拒绝 /
/// 其他协议错误。
struct ConnectFailure {
    kind: &'static str, // "config" | "network" | "auth" | "protocol"
    message: String,
}

/// 解析上游的有效拨号地址：SSH 上游 = 本地隧道端口
/// （`ws://127.0.0.1:<port>`）；直连上游 = 配置地址。`None` = 暂未就绪
/// （SSH 隧道未建立 / 地址未配置）——调用方按自己的退避重试，
/// 不要当成永久离线。
async fn effective_url(state: &AppState, cfg: &crate::upstreams::UpstreamConfig) -> Option<String> {
    match &cfg.ssh {
        Some(_) => state
            .tunnels
            .local_port(&cfg.name)
            .await
            .map(|port| format!("ws://127.0.0.1:{port}")),
        None => {
            let url = cfg.url.trim();
            (!url.is_empty()).then(|| url.to_string())
        }
    }
}

async fn connect_upstream(
    upstream: &Upstream,
) -> Result<
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
    ConnectFailure,
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
                        return Err(ConnectFailure {
                            kind: "config",
                            message: format!("访问令牌格式非法: {error}"),
                        });
                    }
                }
            }
            request
        }
        Err(error) => {
            warn!(%error, "invalid Core WebSocket URL");
            return Err(ConnectFailure {
                kind: "config",
                message: format!("WebSocket 地址非法: {error}"),
            });
        }
    };
    // 连接超时（5s）：无响应挂死时不再永久停在 connecting（此前
    // connect_async 无超时——对端半开/防火墙 DROP 会挂死整条重连
    // 循环，健康表永远"连接中"）。
    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        connect_async(core_request),
    )
    .await
    {
        Err(_) => {
            warn!(core = %upstream.url, "connect to Core management WS timed out (5s)");
            Err(ConnectFailure {
                kind: "network",
                message: "连接超时（5s 无响应）".into(),
            })
        }
        Ok(Ok((core, _))) => Ok(core),
        Ok(Err(error)) => {
            // 分类：HTTP 401/403 → 认证失败；连接拒绝/超时/DNS → 网络；
            // 其余按协议错误。tokio-tungstenite 的 Http(Response) 携带状态码。
            let kind = match &error {
                tokio_tungstenite::tungstenite::Error::Http(resp) => match resp.status().as_u16() {
                    401 | 403 => "auth",
                    _ => "protocol",
                },
                tokio_tungstenite::tungstenite::Error::Io(_) => "network",
                _ => "protocol",
            };
            warn!(
                core = %upstream.url,
                %error, kind,
                "cannot connect to Core management WS; upstream skipped"
            );
            Err(ConnectFailure {
                kind,
                message: error.to_string(),
            })
        }
    }
}

/// 注册表级常驻探活（2026-10）：每 10s 对注册表全部上游做连接
/// 探测（connect+即关）——健康表反映**真实可达性**，不再随浏览器
/// 连接开关联动。有中继链路的上游跳过（链路状态更准）。
pub async fn probe_pump(state: AppState) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(10));
    interval.tick().await;
    loop {
        interval.tick().await;
        for cfg in state.registry.list().await {
            if !cfg.has_endpoint() {
                continue;
            }
            // 有活跃中继链路：链路状态优先，不覆盖。
            if state.has_active_link(&cfg.name) {
                continue;
            }
            // SSH 上游：隧道未在线时直接按隧道状态上报——比底层"连本地
            // 端口被拒"的表象信息量高，也省一次无谓探测。
            if cfg.ssh.is_some() {
                let tunnel = state.tunnels.status(&cfg.name).await;
                let ready = tunnel
                    .as_ref()
                    .map(|t| t.phase == "online")
                    .unwrap_or(false);
                if !ready {
                    let (connectivity, error) = match tunnel {
                        Some(t) if t.phase == "connecting" => ("connecting", t.error),
                        Some(t) => ("offline", t.error),
                        None => ("connecting", Some("SSH 隧道未创建".to_string())),
                    };
                    state.set_health(
                        &cfg.name,
                        UpstreamHealth {
                            connectivity: connectivity.into(),
                            auth: "unknown".into(),
                            last_error: error.map(|e| format!("SSH: {e}")),
                            last_checked: now_unix(),
                        },
                    );
                    continue;
                }
            }
            let Some(url) = effective_url(&state, &cfg).await else {
                continue;
            };
            let upstream = Upstream {
                name: Arc::from(cfg.name.as_str()),
                url: Arc::from(url.as_str()),
                access_token: Arc::from(cfg.access_token.as_str()),
            };
            match connect_upstream(&upstream).await {
                Ok(core) => {
                    drop(core);
                    state.set_online_ok(&cfg.name);
                }
                Err(failure) => {
                    state.set_health(
                        &cfg.name,
                        UpstreamHealth {
                            connectivity: "offline".into(),
                            auth: if failure.kind == "auth" {
                                "failed".into()
                            } else {
                                "unknown".into()
                            },
                            last_error: Some(format!("[{}] {}", failure.kind, failure.message)),
                            last_checked: now_unix(),
                        },
                    );
                }
            }
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

/// 浏览器命令帧的投递意图——中继**不做命令语义分类**（纯透传）。
///
/// 由客户端显式声明投递范围：
/// - `{"core": "<name>", "frame": {...}}` → 定向该上游；
/// - `{"broadcast": true, "frame": {...}}` → 显式广播给全部在线上游
///   （仅用于只读发现命令，如 `RequestState`/`RequestTeamsList`）；
/// - 无壳 → 单上游语义下直接转发（转发给唯一在线上游）；多上游下拒绝
///   （无意图不猜测）。
enum CommandRoute {
    Target(String),
    Broadcast,
    Unwrapped,
}

/// 拆浏览器命令帧：返回投递意图 + 内层命令原文。
fn unwrap_command(text: &str) -> (CommandRoute, String) {
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(text) {
        if let Some(frame) = v.get("frame") {
            if let Some(name) = v.get("core").and_then(|c| c.as_str()) {
                return (CommandRoute::Target(name.to_string()), frame.to_string());
            }
            if v.get("broadcast").and_then(|b| b.as_bool()) == Some(true) {
                return (CommandRoute::Broadcast, frame.to_string());
            }
        }
    }
    (CommandRoute::Unwrapped, text.to_string())
}

/// 一条活跃上游链路的句柄（命令写端 + 任务中止键）。
struct CoreLink {
    cmd_tx: tokio::sync::mpsc::Sender<String>,
    abort: tokio::task::AbortHandle,
}

/// 广播命令重放缓冲（每浏览器桥一份）。
///
/// 背景（2026-10 修复）：桥接的上游链路是**异步**建立的，而浏览器在页面
/// 加载的握手期就发出发现类广播（`RequestState` / `RequestTeamsList`）。
/// 若广播先于某条链路建成到达路由泵，该链路就会**静默丢失**这次请求——
/// 远端上游（跨网络、建链慢）尤其容易踩中，表现为该 core 的智能体/会话
/// 在面板中缺失（直到下一次广播，如切后台再回来触发 heal）——「一套
/// Panel 管全联邦」的联邦配置流程因此时好时坏。
///
/// 修复：路由泵把最近的广播帧记入环形缓冲；每条链路（含断线重连）注册
/// 进 `links` 后，把缓冲内的帧补投给它。发现命令幂等只读，重放安全；
/// 缓冲有界（只保留最近 [`BroadcastReplay::CAP`] 条），避免无界内存。
struct BroadcastReplay {
    frames: std::collections::VecDeque<String>,
}

impl BroadcastReplay {
    /// 环形缓冲容量：握手期发现命令只有个位数条，上限只做防御性封顶。
    const CAP: usize = 8;

    fn new() -> Self {
        Self {
            frames: std::collections::VecDeque::new(),
        }
    }

    /// 记一条广播帧（超出容量丢弃最旧）。
    fn remember(&mut self, frame: &str) {
        if self.frames.len() >= Self::CAP {
            self.frames.pop_front();
        }
        self.frames.push_back(frame.to_string());
    }

    /// 快照当前缓冲（新链路接入时按序补投）。
    fn snapshot(&self) -> Vec<String> {
        self.frames.iter().cloned().collect()
    }
}

async fn bridge(browser: WebSocket, state: AppState) {
    let (mut browser_tx, mut browser_rx) = browser.split();
    // 每上游一条「浏览器→Core」转发任务（命令按壳路由/无壳广播）与
    // 「Core→浏览器」加壳转发任务（汇合进单一 mpsc 出口）。
    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel::<BrowserMessage>(256);
    let (cmd_tx, mut cmd_rx) = tokio::sync::mpsc::channel::<(CommandRoute, String)>(256);

    let reap_after = reap_after();
    let links: Arc<tokio::sync::RwLock<std::collections::HashMap<String, CoreLink>>> =
        Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new()));
    // 最近广播帧（每条链路建成/重连后补投；见 BroadcastReplay 注释）。
    let broadcast_replay = Arc::new(tokio::sync::Mutex::new(BroadcastReplay::new()));

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
        let replay = broadcast_replay.clone();
        std::sync::Arc::new(move |cfg: crate::upstreams::UpstreamConfig| {
            let links = links.clone();
            let event_tx = event_tx.clone();
            let state = state2.clone();
            let multi = spawn_multi.clone();
            let replay = replay.clone();
            let _handle = tokio::spawn(async move {
                let name = cfg.name.clone();
                // 断连重连循环：Core 重启/闪断后退避重试（1s→30s），不再
                // 一断即永久离线。浏览器断开（event_tx 关闭）即停止。
                let mut backoff = std::time::Duration::from_secs(1);
                loop {
                    // 重连中状态（首次与每次重试前）——前端可见"正在连接"。
                    state.set_health(
                        &name,
                        UpstreamHealth {
                            connectivity: "connecting".into(),
                            auth: "unknown".into(),
                            last_error: None,
                            last_checked: now_unix(),
                        },
                    );
                    // 每次尝试都**重新解析**拨号地址：SSH 上游为本地隧道
                    // 端口（隧道未就绪时等待而不是误拨）；直连上游为配置地址。
                    let url = match effective_url(&state, &cfg).await {
                        Some(url) => url,
                        None => {
                            state.set_health(
                                &name,
                                UpstreamHealth {
                                    connectivity: "connecting".into(),
                                    auth: "unknown".into(),
                                    last_error: Some("SSH 隧道未就绪，等待重试".into()),
                                    last_checked: now_unix(),
                                },
                            );
                            tokio::time::sleep(backoff).await;
                            backoff = (backoff * 2).min(std::time::Duration::from_secs(30));
                            continue;
                        }
                    };
                    let upstream = Upstream {
                        name: Arc::from(cfg.name.as_str()),
                        url: Arc::from(url.as_str()),
                        access_token: Arc::from(cfg.access_token.as_str()),
                    };
                    let core = match connect_upstream(&upstream).await {
                        Ok(core) => core,
                        Err(failure) => {
                            state.set_health(
                                &name,
                                UpstreamHealth {
                                    connectivity: "offline".into(),
                                    auth: if failure.kind == "auth" {
                                        "failed".into()
                                    } else {
                                        "unknown".into()
                                    },
                                    last_error: Some(format!(
                                        "[{}] {}",
                                        failure.kind, failure.message
                                    )),
                                    last_checked: now_unix(),
                                },
                            );
                            tokio::time::sleep(backoff).await;
                            backoff = (backoff * 2).min(std::time::Duration::from_secs(30));
                            continue;
                        }
                    };
                    backoff = std::time::Duration::from_secs(1);
                    state.set_online_ok(&name);
                    // 每轮克隆句柄——reader/心跳任务 move 走本轮副本，
                    // 下轮重连仍可用。
                    let event_tx_reader = event_tx.clone();
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
                    // reader 需要自己的 multi 句柄做加壳判定；外层循环保留
                    // multi 用于链路增删时的 refresh_multi。
                    let multi_reader = multi.clone();
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
                                            let out = if multi_reader
                                                .load(std::sync::atomic::Ordering::Relaxed)
                                            {
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
                                    if event_tx_reader.send(forward).await.is_err() {
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
                    let replay_tx = cmd_tx.clone();
                    links
                        .write()
                        .await
                        .insert(name.clone(), CoreLink { cmd_tx, abort });
                    // 链路是**异步**建立的：初始那一次 refresh_multi 可能在
                    // links 还空时就跑完，此后只有注册表变更才会重算。必须
                    // 在这里（以及断开处）刷新，否则多上游永远多=false →
                    // 事件不加 core 壳 → 前端把两个 core 的 TeamsList 合并成
                    // 一份，最后一个覆盖前一个（表现为某些 agent 消失）。
                    refresh_multi(&state.registry, &multi, &links).await;
                    state.set_online_ok(&name);
                    // 握手期广播补投（见 BroadcastReplay）：本链路晚于浏览器
                    // 的发现广播（RequestState / RequestTeamsList）建成时，
                    // 把最近的广播帧补发一份——否则这次请求对本链路永久丢失
                    // （远端 core 的智能体/会话直到下一次广播前都不会出现）。
                    // 先快照再发送，避免持锁跨 await；重放与时序无关、幂等。
                    let replay_frames = {
                        let guard = replay.lock().await;
                        guard.snapshot()
                    };
                    for frame in replay_frames {
                        let _ = tokio::time::timeout(SEND_TIMEOUT, replay_tx.send(frame)).await;
                    }
                    // 读泵退出 = 链路死亡：**必须在本循环内 await**，绝不能
                    // 丢进 spawn 分流——否则外层 loop 每 ~50ms 无脑重连，而
                    // 旧 socket 的读半边一直被 reader 持有、永不关闭，到 Core
                    // 的连接持续泄漏直至进程 FD 耗尽（EMFILE，Panel 表现为
                    // "cannot connect ... Too many open files"）。
                    let _ = reader.await;
                    writer_abort.abort();
                    links.write().await.remove(&name);
                    refresh_multi(&state.registry, &multi, &links).await;
                    state.set_offline(&name, None);
                    // 浏览器已断开（event_tx 无接收方）→ 结束重连循环，避免
                    // 空转建连。
                    if event_tx.is_closed() {
                        break;
                    }
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
        _links: &Arc<tokio::sync::RwLock<std::collections::HashMap<String, CoreLink>>>,
    ) {
        // 加壳开关按**已配置上游数**（不是当前在线链路数）：只要配置了 >1 个
        // 上游，所有事件一律带 `{core, frame}` 外壳。若按在线链路数，某条链路
        // 一断就翻成"不加壳"，前端会拿到无 core 的帧、无法归属到运行区域
        // （表现为"尚未选择 agent/无法确定运行区域"），且同一批 TeamsList 会
        // 一半有 core 一半没有。稳定性优先于"单条在线时不加壳"的省字节优化。
        let configured = registry
            .list()
            .await
            .iter()
            .filter(|u| u.has_endpoint())
            .count();
        multi.store(configured > 1, std::sync::atomic::Ordering::Relaxed);
    }

    // 初始上游接入（零上游 = 空转等待——管理面添加后变更泵接入）。
    for cfg in state.registry.list().await {
        if cfg.has_endpoint() {
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
                            if cfg.has_endpoint() {
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
                        state2.set_offline(&cfg.name, None);
                        if cfg.has_endpoint() {
                            spawn_link2(*cfg);
                        }
                        refresh_multi(&state2.registry, &multi2, &links2).await;
                    }
                    crate::upstreams::UpstreamEvent::Removed { name } => {
                        if let Some(old) = links2.write().await.remove(&name) {
                            old.abort.abort();
                        }
                        state2.set_offline(&name, None);
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
        let replay = broadcast_replay.clone();
        tokio::spawn(async move {
            while let Some((route, text)) = cmd_rx.recv().await {
                match route {
                    CommandRoute::Target(name) => {
                        // 定向命令：目标链路**异步**建立（页面刚开、远端上游
                        // 跨网络建链慢），握手期命令可能先于链路建成到达。
                        // **有界等待链路就绪**吸收建链竞态；上游确实离线时
                        // 到点丢弃并告警。
                        let deadline = Instant::now() + LINK_READY_WAIT;
                        loop {
                            let sender = {
                                let links = links.read().await;
                                links.get(&name).map(|link| link.cmd_tx.clone())
                            };
                            if let Some(tx) = sender {
                                let _ = tokio::time::timeout(SEND_TIMEOUT, tx.send(text)).await;
                                break;
                            }
                            if Instant::now() >= deadline {
                                warn!(core = %name, "targeted command dropped: upstream link not ready");
                                break;
                            }
                            tokio::time::sleep(LINK_READY_POLL).await;
                        }
                    }
                    CommandRoute::Broadcast => {
                        // 客户端显式声明的广播（只读发现命令）。
                        // 先记入重放缓冲（供晚建成的链路补投——见
                        // BroadcastReplay），再向当前在线链路扇出。
                        replay.lock().await.remember(&text);
                        let links = links.read().await;
                        for link in links.values() {
                            let _ =
                                tokio::time::timeout(SEND_TIMEOUT, link.cmd_tx.send(text.clone()))
                                    .await;
                        }
                    }
                    CommandRoute::Unwrapped => {
                        // 无意图壳：仅单上游语义下放行（此时加壳开关为 false，
                        // 前端发的就是裸帧）；多上游下拒绝——不猜测命令语义。
                        //
                        // 链路异步建立：握手期命令可能先于链路建成到达（页面
                        // 加载即打引导请求）。**有界等待链路就绪**吸收毫秒级
                        // 建链竞态；上游确实离线时到点仍丢弃（附告警）。
                        let deadline = Instant::now() + LINK_READY_WAIT;
                        loop {
                            let sender = {
                                let links = links.read().await;
                                if links.len() > 1 {
                                    warn!(
                                        "rejected untargeted command (need {{core}} or {{broadcast:true}} envelope)"
                                    );
                                    break;
                                }
                                links.values().next().map(|link| link.cmd_tx.clone())
                            };
                            if let Some(tx) = sender {
                                let _ = tokio::time::timeout(SEND_TIMEOUT, tx.send(text)).await;
                                break;
                            }
                            if Instant::now() >= deadline {
                                warn!("untargeted command dropped: upstream link not ready");
                                break;
                            }
                            tokio::time::sleep(LINK_READY_POLL).await;
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
                            let (route, frame) = unwrap_command(&text);
                            if cmd_tx.send((route, frame)).await.is_err() {
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

#[cfg(test)]
mod tests {
    use super::*;

    /// 定向壳：解析出目标上游名。
    #[test]
    fn unwrap_targets_named_core() {
        let (route, frame) = unwrap_command(
            r#"{"core":"core-a","frame":{"type":"command","payload":"RequestState"}}"#,
        );
        assert!(matches!(route, CommandRoute::Target(name) if name == "core-a"));
        assert!(frame.contains("RequestState"));
    }

    /// 显式广播壳：只有 `broadcast: true` 才广播，不再按命令名猜。
    #[test]
    fn unwrap_honours_explicit_broadcast() {
        let (route, frame) = unwrap_command(
            r#"{"broadcast":true,"frame":{"type":"command","payload":"RequestTeamsList"}}"#,
        );
        assert!(matches!(route, CommandRoute::Broadcast));
        assert!(frame.contains("RequestTeamsList"));

        // 即使命令名"看起来只读"，没有 broadcast 意图也不是广播。
        let (route, _) =
            unwrap_command(r#"{"frame":{"type":"command","payload":"RequestTeamsList"}}"#);
        assert!(matches!(route, CommandRoute::Unwrapped));
    }
    /// 无壳裸命令：交给单上游兜底（多上游由 route pump 拒绝）。
    #[test]
    fn unwrap_plain_command_is_unwrapped() {
        let (route, frame) = unwrap_command(r#"{"type":"command","payload":"RequestState"}"#);
        assert!(matches!(route, CommandRoute::Unwrapped));
        assert!(frame.contains("RequestState"));
    }

    /// 广播重放缓冲：按序记录、越容量丢最旧（供晚建成的链路补投）。
    #[test]
    fn broadcast_replay_keeps_most_recent_in_order() {
        let mut replay = BroadcastReplay::new();
        assert!(replay.snapshot().is_empty());

        for i in 0..(BroadcastReplay::CAP + 3) {
            replay.remember(&format!(r#"{{"n":{i}}}"#));
        }
        let snapshot = replay.snapshot();
        assert_eq!(snapshot.len(), BroadcastReplay::CAP);
        // 只保留最近 CAP 条，顺序保持（最旧的 3 条已被挤出）。
        assert_eq!(snapshot.first().unwrap(), r#"{"n":3}"#);
        assert_eq!(
            snapshot.last().unwrap(),
            &format!(r#"{{"n":{}}}"#, BroadcastReplay::CAP + 2)
        );
    }
}
