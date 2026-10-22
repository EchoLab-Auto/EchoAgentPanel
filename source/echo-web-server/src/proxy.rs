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
use tracing::{debug, info, warn};

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
/// 对端地址提取器：**永不失配**——服务端没装 connect-info（测试 / 嵌入式
/// 复用本 handler）时退化成 `None`，日志里显示 "unknown"。
///
/// 不用 `Option<ConnectInfo<_>>`：axum 0.8 里 `Option<T>` 要求
/// `OptionalFromRequestParts`，`ConnectInfo` 没实现，handler 会直接失配。
pub struct PeerAddr(pub Option<std::net::SocketAddr>);

impl<S: Send + Sync> axum::extract::FromRequestParts<S> for PeerAddr {
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        Ok(PeerAddr(
            parts
                .extensions
                .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
                .map(|axum::extract::ConnectInfo(addr)| *addr),
        ))
    }
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
    peer: PeerAddr,
) -> impl IntoResponse {
    if !state.authorized(&headers, params.get("token").map(String::as_str)) {
        return axum::http::StatusCode::UNAUTHORIZED.into_response();
    }
    ws.on_upgrade(move |socket| bridge(socket, state, peer.0))
        .into_response()
}

/// 连一个上游；失败返回 None（其他上游不受影响——聚合视图下
/// 单上游离线不应拖垮整条浏览器链路）。
/// 连接失败分类（健康上报用）：配置错误 / 网络不可达 / 认证拒绝 /
/// 其他协议错误。
struct ConnectFailure {
    kind: &'static str, // "config" | "network" | "auth" | "protocol"
    message: String,
    /// 原始错误文本（日志用；去重签名 = kind + detail）。
    detail: String,
}

// ── 重连退避与日志降噪（2026-10）──
// 永久不可达的上游（308 重定向 / 连接拒绝）此前每个浏览器标签页各跑一条
// 1s→30s 重连循环，且探活泵每 10s 再拨一次，每次失败都 warn——1 小时
// 1000+ 条同样的日志。现在：连续失败 ≥ RECONNECT_DEGRADE_AFTER 次后退避
// 上限提到 60s，每次睡眠加 ±20% 抖动（多标签页错峰）；同一上游同一错误
// 只 warn 一次，直到连接成功或错误变化。

/// 链路活过这么久才算"配置是好的"：短于此的断开按失败计数并退避。
///
/// 取值 2s：Core 重启时旧连接立刻断、新进程几秒内起来——2s 内断开视为抖动，
/// 避免重启瞬间的 20 次/秒重建；活过 2s 的链路再断（滚更新、网络切换）
/// 没有风暴风险，立即重连体感更好。
const HEALTHY_LINK_AFTER: Duration = Duration::from_secs(2);

/// 连续失败多少次后进入降级（退避上限 60s）。
const RECONNECT_DEGRADE_AFTER: u32 = 5;
const RECONNECT_BASE: Duration = Duration::from_secs(1);
const RECONNECT_CAP: Duration = Duration::from_secs(30);
const RECONNECT_CAP_DEGRADED: Duration = Duration::from_secs(60);

/// 下一档退避：翻倍，上限按连续失败次数取 30s / 60s。
fn next_backoff(current: Duration, failures: u32) -> Duration {
    let cap = if failures >= RECONNECT_DEGRADE_AFTER {
        RECONNECT_CAP_DEGRADED
    } else {
        RECONNECT_CAP
    };
    (current * 2).min(cap)
}

/// ±20% 抖动：`factor` ∈ [0,1) 映射到 [0.8, 1.2)。
fn jitter_with(base: Duration, factor: f64) -> Duration {
    base.mul_f64(0.8 + 0.4 * factor.clamp(0.0, 1.0))
}

/// 取一个 [0,1) 随机数（std RandomState 的随机键——无需额外依赖）。
fn random_unit() -> f64 {
    use std::hash::{BuildHasher, Hasher};
    let mut hasher = std::collections::hash_map::RandomState::new().build_hasher();
    hasher.write_u128(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0),
    );
    (hasher.finish() >> 11) as f64 / (1u64 << 53) as f64
}

fn jittered(base: Duration) -> Duration {
    jitter_with(base, random_unit())
}

/// 每个上游最近一次已记录的失败签名（进程级——跨浏览器标签页与探活泵去重）。
fn connect_log_state() -> &'static std::sync::Mutex<std::collections::HashMap<String, String>> {
    static STATE: std::sync::OnceLock<std::sync::Mutex<std::collections::HashMap<String, String>>> =
        std::sync::OnceLock::new();
    STATE.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()))
}

/// 是否应记录这次失败：同一上游同一签名只返回一次 true。
fn should_log_failure(name: &str, signature: &str) -> bool {
    let Ok(mut map) = connect_log_state().lock() else {
        return true;
    };
    if map.get(name).map(String::as_str) == Some(signature) {
        return false;
    }
    map.insert(name.to_string(), signature.to_string());
    true
}

/// 连接成功：清除去重状态；若此前记录过失败则返回 true（打一条恢复日志）。
fn clear_failure_log(name: &str) -> bool {
    connect_log_state()
        .lock()
        .map(|mut map| map.remove(name).is_some())
        .unwrap_or(false)
}

fn log_connect_failure(upstream: &Upstream, failure: &ConnectFailure) {
    let signature = format!("{}|{}", failure.kind, failure.detail);
    if should_log_failure(&upstream.name, &signature) {
        warn!(
            core = %upstream.url,
            upstream = %upstream.name,
            error = %failure.detail,
            kind = failure.kind,
            "cannot connect to Core management WS; upstream skipped \
             (same error is logged once until it recovers or changes)"
        );
    }
}

fn log_connect_success(upstream: &Upstream) {
    if clear_failure_log(&upstream.name) {
        tracing::info!(core = %upstream.url, upstream = %upstream.name, "Core management WS reachable again");
    }
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

/// 连一个上游（带去重日志：同一错误只 warn 一次，成功后复位）。
async fn connect_upstream(
    upstream: &Upstream,
) -> Result<
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
    ConnectFailure,
> {
    let result = connect_upstream_raw(upstream).await;
    match &result {
        Ok(_) => log_connect_success(upstream),
        Err(failure) => log_connect_failure(upstream, failure),
    }
    result
}

async fn connect_upstream_raw(
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
                        return Err(ConnectFailure {
                            kind: "config",
                            message: format!("访问令牌格式非法: {error}"),
                            detail: format!("invalid Core access token: {error}"),
                        });
                    }
                }
            }
            request
        }
        Err(error) => {
            return Err(ConnectFailure {
                kind: "config",
                message: format!("WebSocket 地址非法: {error}"),
                detail: format!("invalid Core WebSocket URL: {error}"),
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
        Err(_) => Err(ConnectFailure {
            kind: "network",
            message: "连接超时（5s 无响应）".into(),
            detail: "connect timed out (5s)".into(),
        }),
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
            // 握手期静默断开（读到 EOF、没有任何 HTTP 响应）最常见根因是
            // 「对端令牌校验拒绝」或「连的不是 Core 管理端口」——给出可操作
            // 提示而不是裸的 "Handshake not finished"（2026-10 云机端口
            // 映射实况：旧版 Core 的未授权拒绝路径不发送响应，二者症状
            // 完全一致，纯看错误文案无法排查）。
            let message = match &error {
                tokio_tungstenite::tungstenite::Error::Protocol(
                    tokio_tungstenite::tungstenite::error::ProtocolError::HandshakeIncomplete,
                ) => "对端在 WebSocket 握手完成前直接断开（未返回任何 HTTP 响应）。\
                        常见原因：① 对端为 EchoAgentCore 且配置了 management_access_token，\
                        但此处访问令牌缺失或不对——请填入与 Core `echo-agent-core token` \
                        一致的令牌；② 地址/端口映射指向的不是 Core 管理端口"
                    .to_string(),
                _ => error.to_string(),
            };
            Err(ConnectFailure {
                kind,
                message,
                detail: error.to_string(),
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
/// 解码一条 Core → Panel 文本帧：一次性完成"加壳"与"取扇出序号"。
///
/// 返回 `None` 表示**无法转发**（仅限加壳模式下解析失败的帧）。
///
/// 序号来自 Core 的 `serialize_event_sequenced`（顶层 `"seq":N`）。提取它
/// 是为了做中继侧的**丢帧诊断**——本函数是中继唯一解析帧的地方，复用同一次
/// `serde_json` 解析、不额外增加开销（多上游模式此前就已解析过）。
/// 从裸命令帧里取**命令名**（首层唯一键）。
///
/// 只取名字、绝不记 payload：命令体里可能有消息正文与配置值。日志的价值在
/// "哪条命令被丢了"——丢了哪条都看不出来，就只能靠猜。
fn command_name(frame: &str) -> String {
    serde_json::from_str::<serde_json::Value>(frame)
        .ok()
        .and_then(|v| {
            v.as_object()
                .and_then(|o| o.keys().next().cloned())
                .or_else(|| Some(v.to_string()))
        })
        .unwrap_or_else(|| "<unparsed>".to_string())
}

/// 回一条**丢命令错误帧**给浏览器。
///
/// 为什么必须有：被丢弃的命令既没有发往任何上游，也就没有任何回执——
/// 前端只能表现为"这块数据永远是空的"，用户唯一能做的就是刷新重发，而
/// 重发很可能踩同一个坑（比如多上游下命令没有 `{core}` 信封）。这里按
/// `BackendEvent::Error` 的线形状补一条**不带 core 外壳**的本地错误帧：
/// 前端 `parseFrame` 的单上游分支可以直接解析，聚合分支忽略（无 core）。
///
/// 不带外壳是刻意的：这类错误**不属于任何上游**（正因为不知道该发给谁
/// 才丢的），挂上某个 core 反而会误导前端把提示归到错的 Agent 头上。
fn reject_to_browser(event_tx: &tokio::sync::mpsc::Sender<BrowserMessage>, message: &str) {
    let frame = serde_json::json!({
        "type": "event",
        "payload": { "Error": { "session_id": null, "message": message } },
    });
    // try_send：出口满/已关时丢弃本提示即可——不能用阻塞等待把路由泵卡住
    // （提示本身是尽力而为，丢帧的真实后果已有 WARN 落日志）。
    let _ = event_tx.try_send(BrowserMessage::Text(frame.to_string().into()));
}

fn decode_core_frame(upstream_name: &str, text: &str, wrap: bool) -> Option<(String, Option<u64>)> {
    if !wrap {
        // 单上游：原样透传（非 JSON 帧也照旧发）。序号取不到就返回 None，
        // 不影响转发。
        let seq = serde_json::from_str::<serde_json::Value>(text)
            .ok()
            .and_then(|v| v.get("seq").and_then(serde_json::Value::as_u64));
        return Some((text.to_string(), seq));
    }
    let frame: serde_json::Value = serde_json::from_str(text).ok()?;
    let seq = frame.get("seq").and_then(serde_json::Value::as_u64);
    Some((
        serde_json::json!({
            "core": upstream_name,
            "frame": frame,
        })
        .to_string(),
        seq,
    ))
}

/// 一条上游链路（一次 WebSocket 会话）的转发统计——丢帧诊断用。
///
/// 中继是纯透传，历史上"帧去哪了"完全不可见：用户看到工具行一直读秒，
/// 但 journalctl 里既没有 core 侧丢弃的痕迹、也没有中继侧丢弃的痕迹。
/// 有了这份统计（配合前端 `event-seq.ts` 的序号校验）就能判断是
/// **core 没发**（`last_seq` 连续、前端却跳号）、**中继没收到**
/// （`seq_gaps` > 0）还是**中继没转给浏览器**（链路因写超时被拆，
/// 下一节连上后由 `missed_while_disconnected` 报出）。
#[derive(Debug, Default)]
struct LinkStats {
    /// 本连接从 Core 收到的文本帧数。
    frames: u64,
    /// 最后见到的扇出序号。
    last_seq: Option<u64>,
    /// 本连接内序号跳号次数（core→relay 之间丢帧）。
    seq_gaps: u64,
    /// 跳号累计缺失条数。
    seq_missed: u64,
    /// 加壳模式下无法解析（非 JSON）而被丢弃的帧数。
    non_json: u64,
    /// 因浏览器侧写不动而提前结束（其余排队帧由重连补拉）。
    browser_stalled: bool,
    /// 链路退出的**原因短名**（日志字段，稳定可聚合）。
    ///
    /// 以前只有"是否丢帧"这一个维度，`upstream link closed` 把"对端关的"、
    /// "本端收割的"、"浏览器走了连带拆除的"混成一条 —— 排查时无法区分。
    close_reason: &'static str,
}

/// 一条链路上相邻两帧序号的连续性判定（纯函数，便于单测）。
#[derive(Debug, PartialEq, Eq)]
enum SeqCheck {
    /// 本连接的首个序号（基线）。
    First,
    /// 严格 +1。
    Contiguous,
    /// 向前跳——core→relay 之间丢了 `missed` 条。
    Gap { missed: u64 },
    /// 回退或重复：Core 重启（序号归 1）或补发了旧帧。不报警。
    Reset,
}

fn check_seq(prev: Option<u64>, cur: u64) -> SeqCheck {
    let Some(prev) = prev else {
        return SeqCheck::First;
    };
    if cur == prev + 1 {
        SeqCheck::Contiguous
    } else if cur > prev {
        SeqCheck::Gap {
            missed: cur - prev - 1,
        }
    } else {
        SeqCheck::Reset
    }
}

/// 断链期间丢失的条数：新连接首帧与上一条连接最后帧之间的空洞。
///
/// Core 重启会让序号归 1（`next <= prev`），此时返回 0——不是丢帧，是换了
/// 一代事件流。用饱和减法即可覆盖，无需额外判据。
fn resume_gap(prev: u64, next: u64) -> u64 {
    next.saturating_sub(prev + 1)
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

async fn bridge(
    browser: WebSocket,
    state: AppState,
    peer: Option<std::net::SocketAddr>,
) {
    // 浏览器侧的连接与断开此前**都没有日志**：上游那条 "upstream link closed"
    // 是被动结果（浏览器走了 → 连带拆除），却成了唯一可见的线索，于是每次
    // 排查都得从 Core 的 accept 数反推。这里补齐两端，并统一成
    // "browser link up / down" 一对，便于按 peer 聚合出"哪个标签页在抖"。
    let peer_desc = peer
        .map(|addr| addr.to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let bridge_started = Instant::now();
    let (mut browser_tx, mut browser_rx) = browser.split();
    // 每上游一条「浏览器→Core」转发任务（命令按壳路由/无壳广播）与
    // 「Core→浏览器」加壳转发任务（汇合进单一 mpsc 出口）。
    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel::<BrowserMessage>(256);
    let (cmd_tx, mut cmd_rx) = tokio::sync::mpsc::channel::<(CommandRoute, String)>(256);

    let reap_after = reap_after();
    let links: Arc<tokio::sync::RwLock<std::collections::HashMap<String, CoreLink>>> =
        Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new()));
    // 重连循环登记表（2026-10 修复）：每个上游的**重连循环任务**句柄，
    // 含尚未连上（失败重试中）的循环。此前只登记已连上链路的 reader
    // （CoreLink.abort 仅在 links 里），配置变更/删除时失败重试中的旧循环
    // 无从中止——它会一直用**旧地址**重试（面板改了地址仍持续显示旧地址
    // 的错误：改了端口还报 "Connection refused"，健康表在新旧错误间抖动），
    // 且浏览器关闭后也不退出（循环顶部的存活检查此前只在链路建立后的
    // 读泵退出路径可达 → 僵尸循环无限重试、白耗连接）。
    // 现在：Upsert/Removed 先中止旧循环再接新配置；循环顶部检查 event_tx
    // 是否关闭（浏览器走了即退出）；Lagged 重同步以本表判重（links 只含
    // 已连上的，判重会漏掉重试中的上游、重复接入）。
    let loops: Arc<std::sync::Mutex<std::collections::HashMap<String, tokio::task::AbortHandle>>> =
        Arc::new(std::sync::Mutex::new(std::collections::HashMap::new()));
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
        let loops = loops.clone();
        std::sync::Arc::new(move |cfg: crate::upstreams::UpstreamConfig| {
            let links = links.clone();
            let event_tx = event_tx.clone();
            let state = state2.clone();
            let multi = spawn_multi.clone();
            let replay = replay.clone();
            let loops = loops.clone();
            let cfg_name = cfg.name.clone();
            let handle = tokio::spawn(async move {
                let name = cfg.name.clone();
                // 断连重连循环：Core 重启/闪断后退避重试（1s→30s），不再
                // 一断即永久离线。浏览器断开（event_tx 关闭）即停止。
                // 连续失败计数：≥5 次进入降级（退避上限 60s），成功复位。
                let mut backoff = RECONNECT_BASE;
                let mut failures: u32 = 0;
                // 上一条连接见到的最后一个扇出序号。重连后拿它和新连接首帧
                // 对比即可算出"断链期间丢了 N 条"——这条日志是判断
                // "core 没发 / 中继没收到 / 中继没转给浏览器"的关键证据。
                let mut last_seq_seen: Option<u64> = None;
                loop {
                    // 浏览器已断开（事件出口无接收方）→ 退出整个重连循环。
                    // （2026-10 修复：此前该存活检查只在链路建立后的读泵
                    // 退出路径可达，失败重试中的循环在浏览器关闭后仍无限
                    // 重试——僵尸循环。）
                    if event_tx.is_closed() {
                        break;
                    }
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
                            failures = failures.saturating_add(1);
                            tokio::time::sleep(jittered(backoff)).await;
                            backoff = next_backoff(backoff, failures);
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
                            failures = failures.saturating_add(1);
                            tokio::time::sleep(jittered(backoff)).await;
                            backoff = next_backoff(backoff, failures);
                            continue;
                        }
                    };
                    backoff = RECONNECT_BASE;
                    failures = 0;
                    state.set_online_ok(&name);
                    // 存活计时：关闭日志里的 `up_ms` 是判断"是抖动还是真断了"
                    // 的关键（几秒就断 = 重连风暴，几十分钟 = 偶发网络事件）。
                    let link_started = Instant::now();
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
                    // 断链前的最后序号（重连时由外层传入）：首帧到达时即可
                    // 报出"断开期间丢了多少条"。Core 重启会让序号归 1，那时
                    // 差值为负，`saturating_sub` 自然不报警。
                    let resume_from = last_seq_seen;
                    let reader = tokio::spawn(async move {
                        let mut last_frame = Instant::now();
                        let mut hb = tokio::time::interval(heartbeat_interval());
                        hb.tick().await;
                        let mut stats = LinkStats::default();
                        let mut resume_pending = resume_from.is_some();
                        loop {
                            tokio::select! {
                                message = core_rx.next() => {
                                    let message = match message {
                                        Some(Ok(m)) => m,
                                        // 上游关闭：返回统计供外层写日志。
                                        // 分清"对端发 Close/断 TCP"（None）与
                                        // "协议或传输错误"（Err）——前者通常是
                                        // Core 重启或主动断开，后者常伴版本不匹配。
                                        Some(Err(e)) => {
                                            warn!(core = %name2, error = %e, "upstream read error");
                                            stats.close_reason = "upstream read error";
                                            break;
                                        }
                                        None => {
                                            stats.close_reason = "upstream stream ended";
                                            break;
                                        }
                                    };
                                    last_frame = Instant::now();
                                    let forward = match message {
                                        tokio_tungstenite::tungstenite::Message::Text(text) => {
                                            let wrap = multi_reader
                                                .load(std::sync::atomic::Ordering::Relaxed);
                                            match decode_core_frame(&name2, &text, wrap) {
                                                Some((out, seq)) => {
                                                    stats.frames += 1;
                                                    if let Some(cur) = seq {
                                                        // 断链后首帧：报出"core 在无接收方
                                                        // 期间发了多少条"（浏览器会按
                                                        // since_seq 补拉）。
                                                        if resume_pending {
                                                            resume_pending = false;
                                                            if let Some(prev) = resume_from {
                                                                let missed = resume_gap(prev, cur);
                                                                if missed > 0 {
                                                                    warn!(
                                                                        core = %name2,
                                                                        last_seq = prev,
                                                                        next_seq = cur,
                                                                        missed,
                                                                        "relay was disconnected from core: events missed in between \
                                                                         (browser re-syncs them via since_seq)"
                                                                    );
                                                                }
                                                            }
                                                        }
                                                        // 同一条连接内的跳号 = WS 层真丢帧。
                                                        match check_seq(stats.last_seq, cur) {
                                                            SeqCheck::Gap { missed } => {
                                                                stats.seq_gaps += 1;
                                                                stats.seq_missed += missed;
                                                                warn!(
                                                                    core = %name2,
                                                                    prev_seq = stats
                                                                        .last_seq
                                                                        .unwrap_or_default(),
                                                                    next_seq = cur,
                                                                    missed,
                                                                    "event frames lost inside the upstream link (core→relay)"
                                                                );
                                                            }
                                                            SeqCheck::Reset => debug!(
                                                                core = %name2,
                                                                prev_seq = stats
                                                                    .last_seq
                                                                    .unwrap_or_default(),
                                                                next_seq = cur,
                                                                "event seq went backwards (core restarted?): re-baselining"
                                                            ),
                                                            _ => {}
                                                        }
                                                        stats.last_seq = Some(cur);
                                                    }
                                                    BrowserMessage::Text(out.into())
                                                }
                                                None => {
                                                    // 加壳模式下无法解析的帧：无法归属
                                                    // core，只能丢弃——但要留痕。
                                                    stats.non_json += 1;
                                                    continue;
                                                }
                                            }
                                        }
                                        tokio_tungstenite::tungstenite::Message::Ping(p) => {
                                            BrowserMessage::Ping(p.to_vec().into())
                                        }
                                        tokio_tungstenite::tungstenite::Message::Pong(p) => {
                                            BrowserMessage::Pong(p.to_vec().into())
                                        }
                                        tokio_tungstenite::tungstenite::Message::Binary(payload) => {
                                            // 二进制帧在管理面协议里不存在：收到即视为
                                            // 协议不匹配（对方不是本协议的 Core，或版本
                                            // 错位）。记长度便于区分"心跳怪包"与"整帧"。
                                            warn!(
                                                core = %name2,
                                                bytes = payload.len(),
                                                "upstream sent an unexpected binary frame; closing link"
                                            );
                                            stats.close_reason = "upstream sent binary frame";
                                            break;
                                        }
                                        tokio_tungstenite::tungstenite::Message::Close(frame) => {
                                            // **关帧码是归因的决定性证据**：1001 = 对端
                                            // 进程退出/重启，1000 = 对端主动关，1006/无码
                                            // = 传输层异常。以前这里直接 break、码被丢掉，
                                            // "Core 主动踢人"与"网络掉线"完全分不开。
                                            match &frame {
                                                Some(frame) => info!(
                                                    core = %name2,
                                                    // `CloseCode` 不是 tracing::Value
                                                    // （枚举），转 u16 才是稳定可聚合的
                                                    // 数值字段。
                                                    code = u16::from(frame.code),
                                                    reason = %frame.reason,
                                                    "upstream sent close"
                                                ),
                                                None => info!(
                                                    core = %name2,
                                                    "upstream sent close (no code)"
                                                ),
                                            }
                                            stats.close_reason = "upstream sent close";
                                            break;
                                        }
                                        _ => continue,
                                    };
                                    if event_tx_reader.send(forward).await.is_err() {
                                        // 浏览器侧出口已关：本链路剩余事件无处可去。
                                        stats.browser_stalled = true;
                                        stats.close_reason = "browser side gone (relay torn down)";
                                        break;
                                    }
                                }
                                _ = hb.tick() => {
                                    if last_frame.elapsed() > reap_after {
                                        // 注意：这判的是**上游**静默（core 侧这么久
                                        // 一条帧都没来，含它的 Ping）。空闲会话不该
                                        // 走到这里（core 每 30s 有 Ping/Pong 往返）。
                                        warn!(
                                            core = %name2,
                                            idle_s = last_frame.elapsed().as_secs(),
                                            "core side silent, reaping relay link"
                                        );
                                        stats.close_reason = "upstream silent (reaper)";
                                        break;
                                    }
                                    let _ = heartbeat_tx.send(String::new()).await;
                                }
                            }
                        }
                        stats
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
                    // 链路**建成**也记一条：只记关闭时，反复重连在日志里只剩
                    // 一串没有对应开头的 close，看不出频率与存活时长。
                    info!(
                        core = %name,
                        url = %upstream.url,
                        resumed_from = ?last_seq_seen,
                        "upstream link up"
                    );
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
                    let stats = reader.await.unwrap_or_default();
                    if stats.last_seq.is_some() {
                        last_seq_seen = stats.last_seq;
                    }
                    // 链路关闭诊断（2026-10）：把这四条计数写进日志，配合
                    // 前端 event-seq 的跳号记录即可定位丢帧发生在哪一跳：
                    //   frames/last_seq  → Core 侧发到哪（连续即 Core 正常）
                    //   seq_gaps/missed  → core→relay 之间丢了几条
                    //   non_json         → 无法归属 core 被丢弃的帧
                    //   browser_stalled  → 浏览器侧出口先关，剩余帧由重连补拉
                    // 原先这条日志有 `frames > 0` 的前置条件：握手成功但**一帧
                    // 没收到**就断的链路完全静默——恰恰是"连上就掉"这种最该
                    // 看到的形态。现在无条件记，用 `reason` 区分责任方。
                    let reason = if stats.close_reason.is_empty() {
                        "unknown (task ended without recording a reason)"
                    } else {
                        stats.close_reason
                    };
                    if stats.seq_gaps > 0 || stats.non_json > 0 || stats.browser_stalled {
                        warn!(
                            core = %name,
                            frames = stats.frames,
                            last_seq = ?stats.last_seq,
                            seq_gaps = stats.seq_gaps,
                            missed = stats.seq_missed,
                            non_json = stats.non_json,
                            browser_stalled = stats.browser_stalled,
                            reason,
                            up_ms = link_started.elapsed().as_millis() as u64,
                            "upstream link closed with dropped frames"
                        );
                    } else {
                        info!(
                            core = %name,
                            frames = stats.frames,
                            last_seq = ?stats.last_seq,
                            reason,
                            up_ms = link_started.elapsed().as_millis() as u64,
                            "upstream link closed"
                        );
                    }
                    writer_abort.abort();
                    links.write().await.remove(&name);
                    refresh_multi(&state.registry, &multi, &links).await;
                    state.set_offline(&name, None);
                    // 浏览器已断开（event_tx 无接收方）→ 结束重连循环，避免
                    // 空转建连。
                    if event_tx.is_closed() {
                        break;
                    }
                    // 「连上就被断」的抖动必须退避，不能 50ms 无限重连。
                    //
                    // 此前这里是**固定 50ms**：建链成功时已把 `backoff` 复位成
                    // `RECONNECT_BASE`、`failures = 0`，于是握手成功但立刻掉线
                    // 的上游（对端刚重启、代理掐空闲连接、认证通过后策略拒绝）
                    // 会以 **20 次/秒**的节奏重建——日志里是一串同秒 close，
                    // Core 侧则是一串同秒 accept，双方都看不出是同一个根因。
                    //
                    // 判据用**存活时长**而不是成败：链路活过
                    // `HEALTHY_LINK_AFTER` 才算"这条配置是好的"，随时可重连；
                    // 短命链路按连续失败处理，走标准退避（1s→…→60s，±20%）。
                    let lived = link_started.elapsed();
                    if lived < HEALTHY_LINK_AFTER {
                        failures = failures.saturating_add(1);
                        let wait = jittered(backoff);
                        warn!(
                            core = %name,
                            lived_ms = lived.as_millis() as u64,
                            attempt = failures,
                            retry_in_ms = wait.as_millis() as u64,
                            "upstream link died immediately after connect; backing off"
                        );
                        tokio::time::sleep(wait).await;
                        backoff = next_backoff(backoff, failures);
                    } else {
                        // 长命链路正常断开（对端重启 / 网络切换）：立即重连，
                        // 并复位退避——短命抖动会自己把 `failures` 顶上去。
                        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                    }
                }
            });
            // 登记循环句柄（并兜底中止同名的上一枚循环——调用方在
            // Upsert/Removed 时已按约定中止，这里防重复登记）。
            let previous = loops
                .lock()
                .unwrap()
                .insert(cfg_name, handle.abort_handle());
            if let Some(previous) = previous {
                previous.abort();
            }
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
    let initial_upstreams = state.registry.list().await;
    for cfg in &initial_upstreams {
        if cfg.has_endpoint() {
            spawn_link(cfg.clone());
        }
    }
    info!(
        peer = %peer_desc,
        upstreams = initial_upstreams.iter().filter(|c| c.has_endpoint()).count(),
        "browser link up"
    );
    refresh_multi(&state.registry, &multi, &links).await;

    // 注册表变更泵：Upsert →（旧链路摘除后）接入；Removed → 摘除。
    {
        let mut events = state.registry.subscribe();
        let links2 = links.clone();
        let loops2 = loops.clone();
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
                            // 判重用循环登记表（含失败重试中、尚未建链的
                            // 循环）——links 只含已连上的，会对重试中的
                            // 上游重复接入（多个循环互抢、健康表抖动）。
                            if loops2.lock().unwrap().contains_key(&cfg.name) {
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
                        // 先中止旧**重连循环**（含失败重试中的——此前只中止
                        // 已连上链路的 reader，旧循环会用旧配置继续重试），
                        // 再摘旧链路；新配置由 spawn_link2 全新接入。
                        if let Some(old_loop) = loops2.lock().unwrap().remove(&cfg.name) {
                            old_loop.abort();
                        }
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
                        if let Some(old_loop) = loops2.lock().unwrap().remove(&name) {
                            old_loop.abort();
                        }
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

    // 命令路由泵：浏览器命令 → 目标上游（无壳 = 广播全部在线上游）。
    // 目标表是动态 links（管理面增删即时生效）。
    let route_pump = {
        let links = links.clone();
        let replay = broadcast_replay.clone();
        // 丢命令时要给浏览器回执（见 `reject_to_browser`）：路由泵需要自己
        // 一份出口句柄。**必须在 `drop(event_tx)` 之前克隆**——否则出口
        // 引用计数提前归零，浏览器读侧会把「没有人再发事件」当成正常关闭。
        let event_tx_for_cmds = event_tx.clone();
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
                                let command = command_name(&text);
                                warn!(
                                    core = %name,
                                    command = %command,
                                    waited_ms = LINK_READY_WAIT.as_millis() as u64,
                                    "targeted command dropped: upstream link not ready"
                                );
                                reject_to_browser(
                                    &event_tx_for_cmds,
                                    &format!(
                                        "命令 {command} 未发送：上游 {name} 的链路未就绪（正在重连），稍后会自动恢复"
                                    ),
                                );
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
                                    // 名字必带：这条命令**不会**送到任何上游，
                                    // 前端也收不到任何回执（静默丢弃）——不知道
                                    // 是哪条命令丢了，就只能靠刷新重发来试。
                                    let command = command_name(&text);
                                    warn!(
                                        command = %command,
                                        links = links.len(),
                                        "rejected untargeted command (need {{core}} or {{broadcast:true}} envelope)"
                                    );
                                    reject_to_browser(
                                        &event_tx_for_cmds,
                                        &format!(
                                            "命令 {command} 未发送：多上游（{} 条在线链路）下无法确定目标 Agent，请先选择 Agent 后重试",
                                            links.len()
                                        ),
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

    // 路由泵已持有自己的出口克隆，此处方可释放主句柄。
    drop(event_tx);

    // 浏览器 → 命令通道（读浏览器帧 → 拆壳 → cmd_tx）+ 浏览器侧心跳
    // 与半死收割（与原单上游中继同语义：收割阈值内浏览器无任何帧
    // （含 Pong）即断开整条链路；每 30s 向浏览器发 Ping）。
    let (browser_ping_tx, mut browser_ping_rx) = tokio::sync::mpsc::channel::<()>(8);
    let peer_for_read = peer_desc.clone();
    let browser_read = tokio::spawn(async move {
        let mut last_frame = Instant::now();
        let mut hb = tokio::time::interval(heartbeat_interval());
        hb.tick().await;
        // 退出原因（返回值交给外层统一记一条）。浏览器侧结束的 4 种情形
        // 以前全都静默，只在上游那条 close 里间接体现。
        #[allow(unused_assignments)]
        let mut reason: &'static str = "browser read loop ended";
        loop {
            tokio::select! {
                message = browser_rx.next() => {
                    let message = match message {
                        Some(Ok(m)) => m,
                        Some(Err(e)) => {
                            // 错误文本必须记：1006（异常断开）/ RST / 协议错误
                            // 是"网络掉了"的唯一直接证据。
                            warn!(peer = %peer_for_read, error = %e, "browser read error");
                            reason = "browser read error";
                            break;
                        }
                        None => {
                            reason = "browser socket closed (no close frame)";
                            break;
                        }
                    };
                    last_frame = Instant::now();
                    match message {
                        BrowserMessage::Text(text) => {
                            let (route, frame) = unwrap_command(&text);
                            if cmd_tx.send((route, frame)).await.is_err() {
                                reason = "command channel closed";
                                break;
                            }
                        }
                        BrowserMessage::Ping(_) | BrowserMessage::Pong(_) => {}
                        BrowserMessage::Binary(_) => {
                            reason = "browser sent binary frame";
                            break;
                        }
                        BrowserMessage::Close(frame) => {
                            // **关帧码是断链归因的决定性证据**：
                            //   1000/1005 → 前端自己 close()（自愈探测超时）
                            //   1001      → 页面卸载/刷新（going away）
                            //   1006/无帧 → 网络异常（TCP 被丢，见上面的 read error）
                            match &frame {
                                Some(frame) => info!(
                                    peer = %peer_for_read,
                                    code = frame.code,
                                    close_reason = %frame.reason,
                                    "browser sent close"
                                ),
                                None => info!(peer = %peer_for_read, "browser sent close (no code)"),
                            }
                            reason = "browser sent close";
                            break;
                        }
                    }
                }
                _ = hb.tick() => {
                    if last_frame.elapsed() > reap_after {
                        warn!(
                            idle_s = last_frame.elapsed().as_secs(),
                            "browser side silent, reaping relay link"
                        );
                        reason = "browser silent (reaper)";
                        break;
                    }
                    // 向浏览器发 Ping（经事件出口统一写端）；出口满/关
                    // 不判死（事件流可能正忙），下周期重试。
                    let _ = browser_ping_tx.try_send(());
                }
            }
        }
        drop(cmd_tx);
        reason
    });

    // 事件出口：event_rx + 心跳 Ping → 浏览器（带写超时）。
    let browser_write = tokio::spawn(async move {
        let mut sent: u64 = 0;
        let mut close_reason: &'static str = "browser closed";
        loop {
            tokio::select! {
                frame = event_rx.recv() => {
                    let Some(frame) = frame else { break };
                    match tokio::time::timeout(SEND_TIMEOUT, browser_tx.send(frame)).await {
                        Ok(Ok(())) => sent += 1,
                        Ok(Err(_)) => {
                            // 浏览器连接已断：写失败即是正常退出路径。
                            close_reason = "browser gone";
                            break;
                        }
                        Err(_) => {
                            // 写超时（浏览器标签冻结/网络黑洞）：判死并拆链路。
                            // 此刻 event_rx 里可能还排着若干条——它们不会到达
                            // 浏览器，由前端重连后的 since_seq 补拉找回。
                            close_reason = "browser write timed out";
                            warn!(
                                sent,
                                timeout_s = SEND_TIMEOUT.as_secs(),
                                "browser relay write timed out; closing relay link                                  (queued events are re-synced by the client after reconnect)"
                            );
                            break;
                        }
                    }
                }
                _ = browser_ping_rx.recv() => {
                    if browser_tx
                        .send(BrowserMessage::Ping(Vec::new().into()))
                        .await
                        .is_err()
                    {
                        close_reason = "browser gone (heartbeat write failed)";
                        break;
                    }
                }
            }
        }
        debug!(sent, close_reason, "browser relay writer finished");
        let _ = browser_tx.close().await;
        (sent, close_reason)
    });

    // 任一方向退出即整条链路收尾（显式 abort 其余——spawn 任务在
    // select! 取消后仍独立运行，不 abort 则 browser_write 挂在
    // event_rx（链路读泵持有 event_tx）永远不退出）。
    let route_abort = route_pump.abort_handle();
    let read_abort = browser_read.abort_handle();
    let write_abort = browser_write.abort_handle();
    // 谁先退出 = 断链的**主动方**。这是区分「浏览器关的 / 中继判死的 /
    // 路由泵结束」的唯一可靠依据，以前只留在 debug 日志里，info 级别下
    // 完全不可见（于是上游那条被动 close 成了唯一线索）。
    let (ended_by, reason, frames_sent) = tokio::select! {
        _ = route_pump => {
            read_abort.abort();
            write_abort.abort();
            ("route pump", "command routing ended".to_string(), 0u64)
        }
        r = browser_read => {
            route_abort.abort();
            write_abort.abort();
            let reason = r.unwrap_or("browser read task panicked").to_string();
            ("browser read", reason, 0u64)
        }
        w = browser_write => {
            route_abort.abort();
            read_abort.abort();
            match w {
                Ok((sent, reason)) => ("browser write", reason.to_string(), sent),
                Err(_) => ("browser write", "browser write task panicked".to_string(), 0),
            }
        }
    };
    info!(
        peer = %peer_desc,
        ended_by,
        reason = %reason,
        elapsed_s = bridge_started.elapsed().as_secs(),
        frames_sent,
        "browser link down"
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backoff_caps_at_30s_then_60s_after_degrade() {
        let mut backoff = RECONNECT_BASE;
        for failures in 1..RECONNECT_DEGRADE_AFTER {
            backoff = next_backoff(backoff, failures);
        }
        // 4 次失败：1→2→4→8→16，仍 < 30s 上限。
        assert_eq!(backoff, Duration::from_secs(16));
        assert_eq!(
            next_backoff(Duration::from_secs(20), 4),
            Duration::from_secs(30)
        );
        // 降级后上限 60s。
        assert_eq!(
            next_backoff(Duration::from_secs(20), 5),
            Duration::from_secs(40)
        );
        assert_eq!(
            next_backoff(Duration::from_secs(40), 9),
            Duration::from_secs(60)
        );
        assert_eq!(
            next_backoff(Duration::from_secs(60), 50),
            Duration::from_secs(60)
        );
    }

    #[test]
    fn jitter_stays_within_twenty_percent() {
        let base = Duration::from_secs(10);
        assert_eq!(jitter_with(base, 0.0), Duration::from_secs(8));
        assert_eq!(jitter_with(base, 0.5), Duration::from_secs(10));
        assert!(jitter_with(base, 0.999_999) < Duration::from_secs(12));
        for _ in 0..200 {
            let d = jittered(base);
            assert!(
                d >= Duration::from_secs(8) && d < Duration::from_secs(12),
                "{d:?}"
            );
        }
    }

    #[test]
    fn same_failure_is_logged_once_until_recovery() {
        let name = "dedup-test-upstream";
        assert!(should_log_failure(name, "network|refused"));
        assert!(!should_log_failure(name, "network|refused"));
        assert!(!should_log_failure(name, "network|refused"));
        // 错误变化 → 再记一次。
        assert!(should_log_failure(name, "protocol|308"));
        assert!(!should_log_failure(name, "protocol|308"));
        // 恢复后复位。
        assert!(clear_failure_log(name));
        assert!(!clear_failure_log(name));
        assert!(should_log_failure(name, "protocol|308"));
        clear_failure_log(name);
    }

    /// 定向壳：解析出目标上游名。
    /// 丢命令回执：线形状必须是**不带 core 外壳**的 `BackendEvent::Error`。
    ///
    /// 不带壳是契约：这类错误不属于任何上游（正因为不知道该发给谁才丢的），
    /// 挂上某个 core 会让前端把提示归到错的 Agent 头上。
    #[test]
    fn reject_frame_is_bare_error_event() {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<BrowserMessage>(4);
        reject_to_browser(&tx, "命令 RequestState 未发送：测试");
        let BrowserMessage::Text(text) = rx.try_recv().expect("frame") else {
            panic!("应为文本帧")
        };
        let value: serde_json::Value = serde_json::from_str(&text).expect("json");
        assert!(value.get("core").is_none(), "回执不得带 core 外壳");
        assert_eq!(value["type"], "event");
        assert_eq!(value["payload"]["Error"]["session_id"], serde_json::Value::Null);
        let message = value["payload"]["Error"]["message"]
            .as_str()
            .expect("message");
        assert!(message.contains("RequestState"), "回执要带上命令名：{message}");
    }

    #[test]
    fn command_name_reads_single_key() {
        assert_eq!(command_name(r#"{"RequestState":null}"#), "RequestState");
        assert_eq!(command_name("not json"), "<unparsed>");
    }

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
    /// 单上游：原样透传，同时取到顶层的扇出序号。
    #[test]
    fn decode_passthrough_extracts_seq() {
        let text = r#"{"type":"event","payload":{"AgentThinking":{"session_id":"s"}},"seq":42}"#;
        let (out, seq) =
            decode_core_frame("core", text, false).expect("single upstream always forwards");
        assert_eq!(out, text, "单上游必须原样透传");
        assert_eq!(seq, Some(42));
    }

    /// 单上游 + 旧版 Core（无 seq）：照旧转发，序号为 None（校验跳过）。
    #[test]
    fn decode_passthrough_without_seq() {
        let text = r#"{"type":"event","payload":{"AgentThinking":{"session_id":"s"}}}"#;
        let (out, seq) = decode_core_frame("core", text, false).unwrap();
        assert_eq!(out, text);
        assert_eq!(seq, None, "旧版 Core 无 seq → 不参与连续性校验");
    }

    /// 单上游的非 JSON 帧也必须转发（历史行为，不能因诊断而丢）。
    #[test]
    fn decode_passthrough_keeps_non_json() {
        let (out, seq) = decode_core_frame("core", "not-json-at-all", false).unwrap();
        assert_eq!(out, "not-json-at-all");
        assert_eq!(seq, None);
    }

    /// 多上游：加壳 + 序号保留在**内层** frame 上（前端从 frame 里取）。
    #[test]
    fn decode_wraps_and_keeps_seq_inner() {
        let text = r#"{"type":"event","payload":{"AgentThinking":{"session_id":"s"}},"seq":7}"#;
        let (out, seq) = decode_core_frame("node-a", text, true).unwrap();
        assert_eq!(seq, Some(7));
        let v: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v.get("core").and_then(|c| c.as_str()), Some("node-a"));
        assert_eq!(
            v.pointer("/frame/seq").and_then(|s| s.as_u64()),
            Some(7),
            "序号必须在内层 frame 上，前端 parseFrame 才能取到"
        );
    }

    /// 多上游的非 JSON 帧无法归属 core：丢弃（返回 None → 计数 + 告警）。
    #[test]
    fn decode_drops_non_json_when_wrapping() {
        assert!(decode_core_frame("node-a", "plain text", true).is_none());
    }

    /// 序号提取只看**顶层**：payload 内部的同名字段不能污染（TrunkTimeline
    /// 的条目自带 `seq`，取错会误报持续跳号）。
    #[test]
    fn decode_reads_top_level_seq_only() {
        let text = r#"{"type":"event","payload":{"TrunkTimeline":{"messages":[{"seq":900},{"seq":901}]}},"seq":12}"#;
        let (_, seq) = decode_core_frame("core", text, false).unwrap();
        assert_eq!(seq, Some(12), "必须取顶层 seq，而不是 payload 条目里的");
        // payload 里有 seq、顶层没有 → 视为无序号（旧版 Core）
        let old = r#"{"type":"event","payload":{"TrunkTimeline":{"messages":[{"seq":900}]}}}"#;
        let (_, seq) = decode_core_frame("core", old, false).unwrap();
        assert_eq!(seq, None);
    }

    // ── 序号连续性判定（纯函数）────────────────────────────────────────

    #[test]
    fn check_seq_classifies_all_cases() {
        // 首帧：建立基线
        assert_eq!(check_seq(None, 1), SeqCheck::First);
        assert_eq!(check_seq(None, 9000), SeqCheck::First);
        // 严格 +1
        assert_eq!(check_seq(Some(1), 2), SeqCheck::Contiguous);
        assert_eq!(check_seq(Some(900), 901), SeqCheck::Contiguous);
        // 跳号：缺几条要说准
        assert_eq!(check_seq(Some(10), 15), SeqCheck::Gap { missed: 4 });
        assert_eq!(check_seq(Some(1), 3), SeqCheck::Gap { missed: 1 });
        // 回退 / 重复：Core 重启或补发旧帧，不报警
        assert_eq!(check_seq(Some(500), 1), SeqCheck::Reset);
        assert_eq!(check_seq(Some(7), 7), SeqCheck::Reset);
        assert_eq!(check_seq(Some(7), 3), SeqCheck::Reset);
    }

    #[test]
    fn resume_gap_counts_disconnected_window() {
        // 断在 100，重连首帧 105 → 期间 101..=104 共 4 条没收到
        assert_eq!(resume_gap(100, 105), 4);
        // 紧接下一帧：没有丢
        assert_eq!(resume_gap(100, 101), 0);
        // Core 重启（序号归 1 / 更小）：不算丢帧
        assert_eq!(resume_gap(500, 1), 0);
        assert_eq!(resume_gap(500, 500), 0);
    }

    /// stats 默认值：全零 / 未见过序号。
    #[test]
    fn link_stats_default_is_empty() {
        let stats = LinkStats::default();
        assert_eq!(stats.frames, 0);
        assert_eq!(stats.last_seq, None);
        assert_eq!(stats.seq_gaps, 0);
        assert_eq!(stats.seq_missed, 0);
        assert_eq!(stats.non_json, 0);
        assert!(!stats.browser_stalled);
    }

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
