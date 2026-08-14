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

/// Shared server state handed to handlers.
#[derive(Clone)]
pub struct AppState {
    /// Core management WebSocket address (e.g. `ws://127.0.0.1:3132`).
    pub core_url: Arc<str>,
    /// Static frontend directory (built `web/dist`).
    pub static_dir: Arc<str>,
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

    // Browser → Core: commands and sudo-password frames, verbatim.
    let to_core = async {
        while let Some(message) = browser_rx.next().await {
            let message = match message {
                Ok(message) => message,
                Err(_) => break,
            };
            match message {
                BrowserMessage::Text(text) => {
                    let text: String = text.to_string();
                    if core_tx
                        .send(tokio_tungstenite::tungstenite::Message::Text(text))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                // Binary frames are not part of the protocol; drop the link.
                BrowserMessage::Binary(_) | BrowserMessage::Close(_) => break,
                _ => {}
            }
        }
        let _ = core_tx.close().await;
    };

    // Core → Browser: events, verbatim.
    let to_browser = async {
        while let Some(message) = core_rx.next().await {
            let message = match message {
                Ok(message) => message,
                Err(_) => break,
            };
            match message {
                tokio_tungstenite::tungstenite::Message::Text(text) => {
                    let text: String = text.to_string();
                    if browser_tx
                        .send(BrowserMessage::Text(text.into()))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                tokio_tungstenite::tungstenite::Message::Binary(_)
                | tokio_tungstenite::tungstenite::Message::Close(_) => break,
                _ => {}
            }
        }
        let _ = browser_tx.close().await;
    };

    tokio::join!(to_core, to_browser);
}
