//! Communication bridge between agent backend and frontends (TUI / API).
//!
//! Supports two transports:
//! - **In-process** (mpsc channels) — used when Core and Panel run in the same
//!   process (backward-compatible).
//! - **WebSocket** — used when Core and Panel run as separate processes.
//!
//! ## WebSocket wire format
//!
//! ```json
//! // Panel → Core
//! {"type":"command","command":{"SendMessage":{"session_id":"...","content":"..."}}}
//!
//! // Core → Panel
//! {"type":"event","event":{"MessageSent":{"session_id":"...","content":"..."}}}
//! ```

use tokio::sync::{mpsc, Mutex};

use crate::command::BackendCommand;
use crate::event::BackendEvent;

// ── In-process bridge ──────────────────────────────────────────────────────

/// Frontend side (held by the TUI).
#[derive(Debug)]
pub struct BackendBridge {
    pub command_tx: mpsc::UnboundedSender<BackendCommand>,
    pub event_rx: Mutex<mpsc::UnboundedReceiver<BackendEvent>>,
}

impl BackendBridge {
    pub fn send_command(&self, cmd: BackendCommand) -> bool {
        self.command_tx.send(cmd).is_ok()
    }
}

/// Backend side (held by the agent).
pub struct BackendHandle {
    pub event_tx: mpsc::UnboundedSender<BackendEvent>,
    pub command_rx: Mutex<mpsc::UnboundedReceiver<BackendCommand>>,
}

impl BackendHandle {
    pub fn emit(&self, event: BackendEvent) {
        let _ = self.event_tx.send(event);
    }

    pub fn try_recv_command(&self) -> Option<BackendCommand> {
        self.command_rx.try_lock().ok()?.try_recv().ok()
    }
}

/// Create an in-process bridge pair.
pub fn create_bridge() -> (BackendBridge, BackendHandle) {
    let (command_tx, command_rx) = mpsc::unbounded_channel();
    let (event_tx, event_rx) = mpsc::unbounded_channel();
    (
        BackendBridge { command_tx, event_rx: Mutex::new(event_rx) },
        BackendHandle { event_tx, command_rx: Mutex::new(command_rx) },
    )
}

// ── Multi-subscriber handle ────────────────────────────────────────────────

/// A handle that fans out events to all connected frontends (Panels).
pub struct FanoutHandle {
    senders: Mutex<Vec<mpsc::UnboundedSender<BackendEvent>>>,
    command_tx: mpsc::UnboundedSender<BackendCommand>,
    command_rx: Mutex<mpsc::UnboundedReceiver<BackendCommand>>,
}

impl Default for FanoutHandle {
    fn default() -> Self { Self::new() }
}

impl FanoutHandle {
    pub fn new() -> Self {
        let (command_tx, command_rx) = mpsc::unbounded_channel();
        Self {
            senders: Mutex::new(Vec::new()),
            command_tx,
            command_rx: Mutex::new(command_rx),
        }
    }

    /// Register a new subscriber. Returns an event receiver (for forwarding
    /// to the subscriber) and a command sender (for the subscriber to send
    /// commands back to the agent).
    pub async fn subscribe(&self) -> (mpsc::UnboundedReceiver<BackendEvent>, mpsc::UnboundedSender<BackendCommand>) {
        let (event_tx, event_rx) = mpsc::unbounded_channel();
        self.senders.lock().await.push(event_tx);
        (event_rx, self.command_tx.clone())
    }

    /// Emit an event to all subscribers.
    pub async fn emit(&self, event: BackendEvent) {
        let senders = self.senders.lock().await;
        senders.iter().for_each(|tx| { let _ = tx.send(event.clone()); });
    }

    /// Try to receive a command without blocking.
    pub fn try_recv_command(&self) -> Option<BackendCommand> {
        self.command_rx.try_lock().ok()?.try_recv().ok()
    }

    /// Receive commands (for task-based consumption).
    pub async fn recv_command(&self) -> Option<BackendCommand> {
        self.command_rx.lock().await.recv().await
    }

    /// Get a sender for commands (to share with subscribers).
    pub fn command_sender(&self) -> mpsc::UnboundedSender<BackendCommand> {
        self.command_tx.clone()
    }
}

// ── WebSocket message types ────────────────────────────────────────────────

/// Top-level WS message envelope.
///
/// Serialises as:
/// ```json
/// {"type":"command","payload":{"SendMessage":{"session_id":"...","content":"..."}}}
/// {"type":"event","payload":{"MessageSent":{"session_id":"...","content":"..."}}}
/// ```
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", content = "payload", rename_all = "snake_case")]
pub enum WsMessage {
    Command(BackendCommand),
    Event(BackendEvent),
}

/// Serialise a command for WS transport.
pub fn serialize_command(cmd: &BackendCommand) -> String {
    serde_json::to_string(&WsMessage::Command(cmd.clone())).unwrap_or_default()
}

/// Serialise an event for WS transport.
pub fn serialize_event(ev: &BackendEvent) -> String {
    serde_json::to_string(&WsMessage::Event(ev.clone())).unwrap_or_default()
}

/// Deserialise a WS text message.
pub fn deserialize_message(text: &str) -> Option<WsMessage> {
    serde_json::from_str(text).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::SessionInfo;

    #[test]
    fn command_roundtrip_via_ws() {
        let cmd = BackendCommand::SendMessage {
            session_id: "qq:group:123:456".into(),
            content: "你好".into(),
        };
        let text = serialize_command(&cmd);
        assert!(text.contains("\"type\":\"command\""));
        let msg = deserialize_message(&text).unwrap();
        match msg {
            WsMessage::Command(c) => match c {
                BackendCommand::SendMessage { session_id, content } => {
                    assert_eq!(session_id, "qq:group:123:456");
                    assert_eq!(content, "你好");
                }
                other => panic!("wrong command variant: {other:?}"),
            },
            other => panic!("wrong message type: {other:?}"),
        }
    }

    #[test]
    fn event_roundtrip_via_ws() {
        let ev = BackendEvent::MessageSent {
            session_id: "user_0".into(),
            content: "回复内容".into(),
        };
        let text = serialize_event(&ev);
        assert!(text.contains("\"type\":\"event\""));
        let msg = deserialize_message(&text).unwrap();
        match msg {
            WsMessage::Event(e) => match e {
                BackendEvent::MessageSent { session_id, content } => {
                    assert_eq!(session_id, "user_0");
                    assert_eq!(content, "回复内容");
                }
                other => panic!("wrong event variant: {other:?}"),
            },
            other => panic!("wrong message type: {other:?}"),
        }
    }

    #[test]
    fn session_updated_event_roundtrip() {
        let session = SessionInfo {
            id: "qq:group:123:456".into(),
            platform: "qq".into(),
            scope: "group".into(),
            user_id: "456".into(),
            nickname: "alice".into(),
            group_name: Some("测试群".into()),
            last_active: 1700000000,
            last_message: "hello".into(),
        };
        let ev = BackendEvent::SessionUpdated { session };
        let text = serialize_event(&ev);
        let msg = deserialize_message(&text).unwrap();
        match msg {
            WsMessage::Event(BackendEvent::SessionUpdated { session }) => {
                assert_eq!(session.id, "qq:group:123:456");
                assert_eq!(session.nickname, "alice");
                assert_eq!(session.group_name.as_deref(), Some("测试群"));
            }
            other => panic!("wrong variant: {other:?}"),
        }
    }

    #[test]
    fn malformed_message_returns_none() {
        assert!(deserialize_message("not json").is_none());
        assert!(deserialize_message("{\"type\":\"unknown\"}").is_none());
    }

    #[tokio::test]
    async fn fanout_handle_default_and_subscribe() {
        let handle = FanoutHandle::default();
        let (ev_rx, cmd_tx) = handle.subscribe().await;
        // Emit an event and verify it reaches the subscriber.
        handle.emit(BackendEvent::MessageSent {
            session_id: "s1".into(),
            content: "hi".into(),
        }).await;
        let mut rx = ev_rx;
        let ev = rx.try_recv().expect("event should be delivered");
        match ev {
            BackendEvent::MessageSent { content, .. } => assert_eq!(content, "hi"),
            other => panic!("wrong event: {other:?}"),
        }
        let _ = cmd_tx;
    }
}
