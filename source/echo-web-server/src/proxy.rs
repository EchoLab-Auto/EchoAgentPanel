//! WebSocket 中继：浏览器 ↔ EchoAgentCore management WS。
//!
//! 每个浏览器 WS 连接对应一条到 Core 的专用连接。帧按原文转发，**不解析、
//! 不记录负载**——sudo 密码帧（`{"type":"sudo_password",...}`）因此与日志、
//! 命令队列完全隔离，只在中继管道里经过。

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

/// Shared server state handed to handlers.
#[derive(Clone)]
pub struct AppState {
    /// Core management WebSocket address (e.g. `ws://127.0.0.1:3132`).
    pub core_url: Arc<str>,
    /// Bearer token sent only on the server-to-Core hop.
    pub core_access_token: Arc<str>,
    /// Static frontend directory (built `web/dist`).
    pub static_dir: Arc<str>,
    /// Media library directory: Core 落盘的入站图片（`/media/<id>` 从这里读）。
    pub media_dir: Arc<str>,
}

/// `GET /ws` — upgrade the browser connection and bridge it to Core.
pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| bridge(socket, state))
}

async fn bridge(browser: WebSocket, state: AppState) {
    let core_request = match state.core_url.as_ref().into_client_request() {
        Ok(mut request) => {
            if !state.core_access_token.is_empty() {
                let value = format!("Bearer {}", state.core_access_token);
                match value.parse() {
                    Ok(value) => {
                        request.headers_mut().insert("authorization", value);
                    }
                    Err(error) => {
                        warn!(%error, "invalid Core access token");
                        return;
                    }
                }
            }
            request
        }
        Err(error) => {
            warn!(%error, "invalid Core WebSocket URL");
            return;
        }
    };
    let (core, _) = match connect_async(core_request).await {
        Ok(pair) => pair,
        Err(error) => {
            warn!(
                core = %state.core_url,
                %error,
                "cannot connect to Core management WS; browser connection dropped"
            );
            return;
        }
    };
    let (mut browser_tx, mut browser_rx) = browser.split();
    let (mut core_tx, mut core_rx) = core.split();

    // 心跳保活 + Ping/Pong 透传 + 半死收割：Core 服务端的心跳 Ping 经本中继
    // 转发给浏览器（浏览器内核自动回 Pong，再经本中继转回 Core）；本中继自身
    // 也每 30s 向两侧各发一次 Ping，空闲连接不会被中间层（NAT/反代）悄悄
    // 断开。一侧超过 REAP_AFTER 没有任何帧（含 Pong）即判半死、断开链路。
    // 注意 tungstenite 在 split 后自动回的 Pong 不保证及时 flush，
    // 因此显式透传而不是依赖隐式应答。
    let mut up_heartbeat = tokio::time::interval(heartbeat_interval());
    up_heartbeat.tick().await; // 首次 tick 立即返回，跳过
    let mut down_heartbeat = tokio::time::interval(heartbeat_interval());
    down_heartbeat.tick().await;
    let reap_after = reap_after();
    let mut last_browser_frame = Instant::now();
    let mut last_core_frame = Instant::now();

    // Browser → Core: commands and sudo-password frames, verbatim.
    let to_core = async {
        loop {
            tokio::select! {
                message = browser_rx.next() => {
                    let message = match message {
                        Some(Ok(message)) => message,
                        _ => break,
                    };
                    last_browser_frame = Instant::now();
                    let forward = match message {
                        BrowserMessage::Text(text) => {
                            tokio_tungstenite::tungstenite::Message::Text(text.to_string())
                        }
                        BrowserMessage::Ping(payload) => {
                            tokio_tungstenite::tungstenite::Message::Ping(payload.to_vec())
                        }
                        BrowserMessage::Pong(payload) => {
                            tokio_tungstenite::tungstenite::Message::Pong(payload.to_vec())
                        }
                        // Binary frames are not part of the protocol; drop the link.
                        BrowserMessage::Binary(_) | BrowserMessage::Close(_) => break,
                    };
                    // 写超时保护：对端（Core）写阻塞过久 = 该侧已死。
                    match tokio::time::timeout(SEND_TIMEOUT, core_tx.send(forward)).await {
                        Ok(Ok(())) => {}
                        Ok(Err(_)) => break,
                        Err(_) => {
                            warn!(
                                "core write stalled > {SEND_TIMEOUT:?}, dropping relay link"
                            );
                            break;
                        }
                    }
                }
                _ = up_heartbeat.tick() => {
                    if last_browser_frame.elapsed() > reap_after {
                        warn!("browser side silent > {reap_after:?}, reaping relay link");
                        break;
                    }
                    if core_tx
                        .send(tokio_tungstenite::tungstenite::Message::Ping(Vec::new()))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
            }
        }
        let _ = core_tx.close().await;
    };

    // Core → Browser: events, verbatim.
    let to_browser = async {
        loop {
            tokio::select! {
                message = core_rx.next() => {
                    let message = match message {
                        Some(Ok(message)) => message,
                        _ => break,
                    };
                    last_core_frame = Instant::now();
                    let forward = match message {
                        tokio_tungstenite::tungstenite::Message::Text(text) => {
                            BrowserMessage::Text(text.to_string().into())
                        }
                        tokio_tungstenite::tungstenite::Message::Ping(payload) => {
                            BrowserMessage::Ping(payload.to_vec().into())
                        }
                        tokio_tungstenite::tungstenite::Message::Pong(payload) => {
                            BrowserMessage::Pong(payload.to_vec().into())
                        }
                        tokio_tungstenite::tungstenite::Message::Binary(_)
                        | tokio_tungstenite::tungstenite::Message::Close(_) => break,
                        _ => continue,
                    };
                    // 写超时保护：浏览器侧读极慢/冻结时不再无限挂起
                    //（否则中继停止读 Core，对端发送缓冲无界积压）。
                    match tokio::time::timeout(SEND_TIMEOUT, browser_tx.send(forward)).await {
                        Ok(Ok(())) => {}
                        Ok(Err(_)) => break,
                        Err(_) => {
                            warn!(
                                "browser write stalled > {SEND_TIMEOUT:?}, dropping relay link"
                            );
                            break;
                        }
                    }
                }
                _ = down_heartbeat.tick() => {
                    if last_core_frame.elapsed() > reap_after {
                        warn!("core side silent > {reap_after:?}, reaping relay link");
                        break;
                    }
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
    };

    tokio::join!(to_core, to_browser);
}
