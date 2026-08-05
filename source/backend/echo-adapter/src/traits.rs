//! Adapter trait and associated types.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

use crate::filter::FilterPipeline;
use crate::types::{AdapterEvent, IncomingMessage, MessageTarget, SendResult};

/// Connection state of an adapter.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AdapterConnectionState {
    /// Not started.
    Stopped,
    /// Running and connected.
    Connected,
    /// Running but disconnected (no client connected).
    Disconnected,
    /// In the process of starting.
    Starting,
    /// In the process of stopping.
    Stopping,
    /// Encountered an error.
    Error,
}

/// Snapshot of adapter status for the TUI / API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdapterInfo {
    /// Unique adapter identifier (e.g., "qq").
    pub name: String,
    /// Human-readable label (e.g., "QQ/OneBot").
    pub display_name: String,
    /// Connection status.
    pub status: AdapterConnectionState,
    /// Self ID on the platform (e.g., QQ number as string).
    pub self_id: Option<String>,
    /// When the adapter was started (Unix timestamp).
    pub started_at: Option<i64>,
    /// Platform name for session scoping.
    pub platform: String,
    /// Whether this adapter is configured and enabled.
    pub configured: bool,
}

/// Bridge that platform adapters use to route inbound messages into the
/// agent framework, without depending on echo-agent directly.
///
/// The agent framework implements this trait; adapters hold an
/// `Arc<dyn AgentBridge>` and call [`handle_incoming_message`]
/// (AgentBridge::handle_incoming_message) from their handlers.
#[async_trait]
pub trait AgentBridge: Send + Sync {
    /// Route one inbound platform message through the agent.
    ///
    /// The bridge owns session lookup, agent event emission, and LLM
    /// processing. Returns the reply text to send back, or `None` when no
    /// reply is needed; `Err` carries a user-facing error message.
    async fn handle_incoming_message(&self, msg: IncomingMessage)
        -> Result<Option<String>, String>;

    /// Notify the agent that an adapter's connection state changed.
    fn on_connection_state(&self, adapter_name: &str, connected: bool, self_id: Option<String>);
}

/// Gating mode: which users/groups may interact with the bot.
///
/// Serialised as `"none" | "allowlist" | "denylist"` (snake_case), matching
/// the legacy string-based protocol so WS payloads stay wire-compatible.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GateMode {
    /// Everyone may interact.
    #[default]
    None,
    /// Only allowlisted users/groups may interact.
    Allowlist,
    /// Allowlisted-excluded: only denylisted users/groups are blocked.
    Denylist,
}

impl GateMode {
    pub fn as_str(self) -> &'static str {
        match self {
            GateMode::None => "none",
            GateMode::Allowlist => "allowlist",
            GateMode::Denylist => "denylist",
        }
    }
}

/// Adapter errors.
#[derive(Debug, thiserror::Error)]
pub enum AdapterError {
    #[error("adapter {0} is not configured")]
    NotConfigured(String),

    #[error("adapter {0} is already running")]
    AlreadyRunning(String),

    #[error("adapter {0} is not running")]
    NotRunning(String),

    #[error("adapter error: {0}")]
    Internal(String),

    #[error("send failed: {0}")]
    SendFailed(String),

    #[error("timeout")]
    Timeout,
}

/// An abstraction over a messaging platform (QQ, Telegram, Discord, etc.).
///
/// Adapters translate platform-specific events into platform-agnostic
/// [`IncomingMessage`](crate::types::IncomingMessage) values, and
/// accept [`MessageTarget`] values to send replies.
///
/// # Lifecycle
///
/// 1. Created with configuration (may be incomplete — see `is_configured()`).
/// 2. `subscribe()` — the agent hooks in to receive events.
/// 3. `start()` — the adapter begins listening for platform events.
/// 4. `stop()` — graceful shutdown.
#[async_trait]
pub trait Adapter: Send + Sync {
    /// Unique adapter identifier (e.g., "qq").
    fn name(&self) -> &str;

    /// Human-readable label (e.g., "QQ / OneBot").
    fn display_name(&self) -> &str;

    /// Platform tag used in session scoping (e.g., "qq").
    fn platform(&self) -> &str;

    /// Whether this adapter has a valid configuration to run.
    fn is_configured(&self) -> bool;

    /// Current status info for display.
    fn status_info(&self) -> AdapterInfo;

    /// Start the adapter. For a QQ adapter this binds the reverse-WS server.
    async fn start(&self) -> Result<(), AdapterError>;

    /// Stop the adapter gracefully.
    async fn stop(&self) -> Result<(), AdapterError>;

    /// Send a text message to a specific platform target.
    async fn send_message(
        &self,
        target: &MessageTarget,
        content: &str,
    ) -> Result<SendResult, AdapterError>;

    /// Subscribe to adapter events. May be called multiple times.
    fn subscribe(&self, tx: mpsc::UnboundedSender<AdapterEvent>);

    /// Return the filter pipeline that gates inbound messages for this adapter.
    /// Default: empty pipeline (no filtering).
    fn filter_pipeline(&self) -> Option<&FilterPipeline> {
        None
    }

    /// Get the group list for this platform. Default: empty.
    async fn get_groups(&self) -> Result<Vec<(i64, String)>, AdapterError> {
        let _ = self;
        Ok(Vec::new())
    }
    fn has_group_list(&self) -> bool {
        false
    }

    /// Get the friend list for this platform. Default: empty.
    async fn get_friend_list(&self) -> Result<Vec<(i64, String)>, AdapterError> {
        let _ = self;
        Ok(Vec::new())
    }

    /// Update the adapter's runtime allowlist.  Default: no-op.
    fn update_allowlist(&self, _user_ids: Vec<String>, _group_ids: Vec<String>) {}

    /// Update the adapter's runtime denylist.  Default: no-op.
    fn update_denylist(&self, _user_ids: Vec<String>, _group_ids: Vec<String>) {}

    /// Return the current filter config (allowlist_users, allowlist_groups,
    /// denylist_users, denylist_groups).  All IDs are strings.
    /// Default: empty.
    fn get_filter_info(&self) -> (Vec<String>, Vec<String>, Vec<String>, Vec<String>) {
        (vec![], vec![], vec![], vec![])
    }

    /// Set the gating mode.  Default: no-op.
    fn set_gate_mode(&self, _mode: GateMode) {}

    /// Get the current gating mode.  Default: [`GateMode::None`].
    fn get_gate_mode(&self) -> GateMode {
        GateMode::None
    }
}
