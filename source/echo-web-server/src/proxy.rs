//! WebSocket 中继：浏览器 ↔ EchoAgentCore management WS。
//!
//! 每个浏览器 WS 连接对应一条到 Core 的专用连接。帧按原文转发，**不解析、
//! 不记录负载**——sudo 密码帧（`{"type":"sudo_password",...}`）因此与日志、
//! 命令队列完全隔离，只在中继管道里经过。

use std::sync::Arc;

use axum::extract::ws::{Message as BrowserMessage, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::connect_async;
use tracing::warn;

use crate::config::QqSection;

/// Shared server state handed to handlers.
#[derive(Clone)]
pub struct AppState {
    /// Core management WebSocket address (e.g. `ws://127.0.0.1:3132`).
    pub core_url: Arc<str>,
    /// Static frontend directory (built `web/dist`).
    pub static_dir: Arc<str>,
    /// NapCat/QQ login helper settings.
    pub qq: QqSection,
}

/// `GET /ws` — upgrade the browser connection and bridge it to Core.
pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| bridge(socket, state))
}

async fn bridge(browser: WebSocket, state: AppState) {
    let (core, _) = match connect_async(state.core_url.as_ref()).await {
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

    // 心跳保活 + Ping/Pong 透传：Core 服务端的心跳 Ping 经本中继转发给
    // 浏览器（浏览器内核自动回 Pong，再经本中继转回 Core）；本中继自身也
    // 每 30s 向两侧各发一次 Ping，空闲连接不会被中间层（NAT/反代）悄悄
    // 断开。注意 tungstenite 在 split 后自动回的 Pong 不保证及时 flush，
    // 因此显式透传而不是依赖隐式应答。
    let mut up_heartbeat = tokio::time::interval(std::time::Duration::from_secs(30));
    up_heartbeat.tick().await; // 首次 tick 立即返回，跳过
    let mut down_heartbeat = tokio::time::interval(std::time::Duration::from_secs(30));
    down_heartbeat.tick().await;

    // Browser → Core: commands and sudo-password frames, verbatim.
    let to_core = async {
        loop {
            tokio::select! {
                message = browser_rx.next() => {
                    let message = match message {
                        Some(Ok(message)) => message,
                        _ => break,
                    };
                    let forward = match message {
                        BrowserMessage::Text(text) => {
                            tokio_tungstenite::tungstenite::Message::Text(text.to_string().into())
                        }
                        BrowserMessage::Ping(payload) => {
                            tokio_tungstenite::tungstenite::Message::Ping(payload.to_vec().into())
                        }
                        BrowserMessage::Pong(payload) => {
                            tokio_tungstenite::tungstenite::Message::Pong(payload.to_vec().into())
                        }
                        // Binary frames are not part of the protocol; drop the link.
                        BrowserMessage::Binary(_) | BrowserMessage::Close(_) => break,
                    };
                    if core_tx.send(forward).await.is_err() {
                        break;
                    }
                }
                _ = up_heartbeat.tick() => {
                    if core_tx
                        .send(tokio_tungstenite::tungstenite::Message::Ping(Vec::new().into()))
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
                    if browser_tx.send(forward).await.is_err() {
                        break;
                    }
                }
                _ = down_heartbeat.tick() => {
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
