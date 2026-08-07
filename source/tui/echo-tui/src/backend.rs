//! Backend bridge wrapper for the TUI.
//!
//! Supports two transports:
//! - **In-process** (mpsc) — when Core and Panel share a process.
//! - **WebSocket** — when Core and Panel run as separate processes.

use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite;

use echo_agent::{BackendBridge, BackendCommand, BackendEvent};

/// Thin client for the agent backend: send commands, drain events.
pub struct Backend {
    inner: BackendInner,
}

enum BackendInner {
    /// In-process mpsc bridge.
    Mpsc(Arc<BackendBridge>),
    /// WebSocket-based transport.
    Ws {
        tx: tokio::sync::mpsc::UnboundedSender<String>,
        events: Arc<Mutex<Vec<BackendEvent>>>,
    },
}

impl Backend {
    /// Create an in-process backend from a shared bridge (no unwrap / panic).
    pub fn new(bridge: Arc<BackendBridge>) -> Self {
        Self {
            inner: BackendInner::Mpsc(bridge),
        }
    }

    /// Create a WebSocket-backed backend.  `ws_url` is e.g. "ws://127.0.0.1:3132".
    /// Spawns background tasks for reading/writing WS frames.
    ///
    /// Reconnects with exponential backoff (1s → 30s cap) when the connection
    /// drops or fails, so a Core restart does not kill the Panel. The caller
    /// exits via the TUI quit key or Ctrl+C instead.
    pub async fn connect_ws(ws_url: &str) -> Result<Self, String> {
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();
        let events = Arc::new(Mutex::new(Vec::<BackendEvent>::new()));
        let events_clone = events.clone();
        let url = ws_url.to_string();

        // Connection supervisor: (re)connect until the Backend is dropped.
        tokio::spawn(async move {
            let mut backoff = 1u64;
            loop {
                let ws_stream = match tokio_tungstenite::connect_async(&url).await {
                    Ok((ws, _)) => {
                        backoff = 1;
                        ws
                    }
                    Err(e) => {
                        tracing::warn!(error = %e, url = %url, "WS connect failed, retrying");
                        tokio::time::sleep(std::time::Duration::from_secs(backoff)).await;
                        backoff = (backoff * 2).min(30);
                        continue;
                    }
                };
                let (mut write, mut read) = ws_stream.split();
                tracing::info!(url = %url, "WS connected");

                // Serve reads and writes concurrently; either side ending
                // (peer closed, or send failed) tears down and reconnects.
                tokio::select! {
                    // Writer: drain queued commands onto the socket.
                    _ = async {
                        while let Some(msg) = rx.recv().await {
                            if write.send(tungstenite::Message::Text(msg)).await.is_err() {
                                break;
                            }
                        }
                    } => break, // Backend dropped — stop reconnecting.
                    // Reader: buffer incoming events.
                    _ = async {
                        while let Some(Ok(msg)) = read.next().await {
                            if let tungstenite::Message::Text(text) = msg {
                                if let Some(echo_agent::bridge::WsMessage::Event(ev)) =
                                    echo_agent::bridge::deserialize_message(&text.to_string())
                                {
                                    events_clone.lock().await.push(ev);
                                }
                            }
                        }
                    } => tracing::warn!(url = %url, "WS connection lost, reconnecting"),
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

#[cfg(test)]
mod tests {
    use super::*;
    use echo_agent::BackendEvent;

    #[tokio::test]
    async fn mpsc_send_forwards_command_to_handle() {
        let (bridge, handle) = echo_agent::create_bridge();
        let backend = Backend::new(Arc::new(bridge));
        assert!(backend.send(BackendCommand::SwitchModel {
            model: "gpt-x".into()
        }));
        assert_eq!(
            handle.try_recv_command(),
            Some(BackendCommand::SwitchModel {
                model: "gpt-x".into()
            })
        );
    }

    #[tokio::test]
    async fn mpsc_send_reports_failure_when_agent_gone() {
        let (bridge, handle) = echo_agent::create_bridge();
        let backend = Backend::new(Arc::new(bridge));
        drop(handle); // receiver gone → send must fail
        assert!(!backend.send(BackendCommand::RequestState));
    }

    #[tokio::test]
    async fn drain_events_empties_shared_buffer() {
        let (bridge, handle) = echo_agent::create_bridge();
        let backend = Backend::new(Arc::new(bridge));
        handle.emit(BackendEvent::AgentOutput {
            session_id: "s1".into(),
            content: "hi".into(),
            branch_id: None,
        });
        handle.emit(BackendEvent::LlmRequest {
            session_id: "s1".into(),
            model: "m".into(),
        });

        let mut out = Vec::new();
        backend.drain_events(&mut out).await;
        assert_eq!(out.len(), 2);
        // Second drain is empty — events are consumed.
        let mut out2 = Vec::new();
        backend.drain_events(&mut out2).await;
        assert!(out2.is_empty());
    }

    #[tokio::test]
    async fn drain_events_appends_to_existing_vec() {
        let (bridge, handle) = echo_agent::create_bridge();
        let backend = Backend::new(Arc::new(bridge));
        handle.emit(BackendEvent::AgentOutput {
            session_id: "s".into(),
            content: "x".into(),
            branch_id: None,
        });
        let mut out = vec![BackendEvent::LlmRequest {
            session_id: "pre".into(),
            model: "m".into(),
        }];
        backend.drain_events(&mut out).await;
        assert_eq!(out.len(), 2);
    }
}
