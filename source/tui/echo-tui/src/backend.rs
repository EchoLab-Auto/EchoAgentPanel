//! Backend bridge wrapper for the TUI.
//!
//! Supports two transports:
//! - **In-process** (mpsc) — when Core and Panel share a process.
//! - **WebSocket** — when Core and Panel run as separate processes.

use std::sync::Arc;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite;

use echo_agent::{BackendBridge, BackendCommand, BackendEvent};

/// Thin client for the agent backend: send commands, drain events.
pub struct Backend {
    inner: BackendInner,
}

enum BackendInner {
    /// In-process mpsc bridge.
    Mpsc(BackendBridge),
    /// WebSocket-based transport.
    Ws {
        tx: tokio::sync::mpsc::UnboundedSender<String>,
        events: Arc<Mutex<Vec<BackendEvent>>>,
    },
}

impl Backend {
    /// Create an in-process backend (backward-compatible).
    pub fn new(bridge: BackendBridge) -> Self {
        Self { inner: BackendInner::Mpsc(bridge) }
    }

    /// Create a WebSocket-backed backend.  `ws_url` is e.g. "ws://127.0.0.1:3132".
    /// Spawns background tasks for reading/writing WS frames.
    pub async fn connect_ws(ws_url: &str) -> Result<Self, String> {
        let (ws_stream, _) = tokio_tungstenite::connect_async(ws_url)
            .await
            .map_err(|e| format!("WS connect failed: {e}"))?;
        let (mut write, mut read) = ws_stream.split();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();
        let events = Arc::new(Mutex::new(Vec::<BackendEvent>::new()));
        let events_clone = events.clone();

        // Background writer task: send queued strings to WS.
        tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                let _ = write.send(tungstenite::Message::Text(msg)).await;
            }
        });

        // Background reader task: read WS frames and buffer events.
        tokio::spawn(async move {
            while let Some(Ok(msg)) = read.next().await {
                if let tungstenite::Message::Text(text) = msg {
                    if let Some(echo_agent::bridge::WsMessage::Event(ev)) =
                        echo_agent::bridge::deserialize_message(&text.to_string())
                    {
                        events_clone.lock().await.push(ev);
                    }
                }
            }
        });

        Ok(Self {
            inner: BackendInner::Ws { tx, events },
        })
    }

    /// Send a command to the backend.
    pub fn send(&self, cmd: BackendCommand) -> bool {
        match &self.inner {
            BackendInner::Mpsc(bridge) => bridge.send_command(cmd),
            BackendInner::Ws { tx, .. } => {
                let text = echo_agent::bridge::serialize_command(&cmd);
                tx.send(text).is_ok()
            }
        }
    }

    /// Non-blocking drain of pending backend events.
    pub async fn drain_events(&self, out: &mut Vec<BackendEvent>) {
        match &self.inner {
            BackendInner::Mpsc(bridge) => {
                let mut rx = bridge.event_rx.lock().await;
                while let Ok(ev) = rx.try_recv() {
                    out.push(ev);
                }
            }
            BackendInner::Ws { events, .. } => {
                let mut buf = events.lock().await;
                out.append(&mut buf);
            }
        }
    }
}
