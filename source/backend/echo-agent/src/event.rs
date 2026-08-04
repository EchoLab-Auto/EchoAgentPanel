//! Events emitted by the agent backend to subscribers (TUI, API, ...).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Adapter status reported to the TUI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdapterStatus {
    pub name: String,
    pub display_name: String,
    pub connected: bool,
    pub running: bool,
    pub self_id: Option<String>,
    pub bind_address: String,
    pub started_at: Option<i64>,
}

/// Snapshot of a conversation session, for the TUI session list.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    /// Platform identifier (e.g., "qq", "local").
    pub platform: String,
    /// Scope within the platform ("dm", "group", "tui").
    pub scope: String,
    /// Platform user ID as a string.
    pub user_id: String,
    pub nickname: String,
    /// Group name when the session is group-scoped, None for direct chat.
    pub group_name: Option<String>,
    pub last_active: i64,
    pub last_message: String,
}

/// Events flowing from the backend to the TUI.
#[derive(Debug, Clone)]
pub enum BackendEvent {
    // ---- Adapter lifecycle ----
    /// An adapter's connection state changed.
    AdapterStateChanged {
        adapter_name: String,
        connected: bool,
        self_id: Option<String>,
    },

    // ---- Incoming messages ----
    /// A message was received from any platform.
    MessageReceived {
        session_id: String,
        adapter_name: String,
        platform: String,
        user_id: String,
        user_name: String,
        /// Channel descriptor: "direct" or "group:{group_id}"
        channel: String,
        group_name: Option<String>,
        content: String,
        timestamp: i64,
    },

    // ---- Agent processing (platform-agnostic) ----
    /// Agent began processing (LLM call pending).
    AgentThinking { session_id: String },
    /// LLM request was sent.
    LlmRequest { session_id: String, model: String },
    /// LLM response completed.
    LlmResponse { session_id: String, model: String, prompt_tokens: u32, completion_tokens: u32 },
    /// Agent invoked a tool.
    ToolCall { session_id: String, tool_name: String, arguments: String },
    /// Tool execution completed.
    ToolResult { session_id: String, tool_name: String, result: String },
    /// Agent generated a reply.
    MessageSent { session_id: String, content: String },
    /// A session was created or updated.
    SessionUpdated { session: SessionInfo },
    /// API configuration changed (for TUI settings form).
    ApiConfigUpdated {
        provider: String,
        model: String,
        base_url: String,
        api_key_set: bool,
        system_prompt: String,
        /// Currently active profile name (empty = top-level default).
        active_api: String,
        /// All saved API profiles.
        profiles: Vec<ApiProfileInfo>,
    },
    /// API profile list changed (emitted together with ApiConfigUpdated).
    ApiProfilesUpdated {
        active_api: String,
        profiles: Vec<ApiProfileInfo>,
    },
    /// Backend error (also used for info toasts).
    Error { session_id: Option<String>, message: String },

    // ---- Adapter management ----
    AdapterList {
        adapters: Vec<AdapterStatus>,
    },
    /// QQ group list.
    GroupList {
        groups: Vec<GroupInfo>,
    },
}

/// QQ group info for display.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupInfo {
    pub group_id: i64,
    pub group_name: String,
}

/// API profile summary (for TUI list display).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiProfileInfo {
    pub name: String,
    pub provider: String,
    pub model: String,
    pub api_key_set: bool,
}

/// Full state snapshot sent to the TUI on connect.
#[derive(Debug, Clone, Default)]
pub struct BackendState {
    pub adapters: HashMap<String, AdapterStatus>,
    pub active_model: String,
    pub active_provider: String,
    pub system_prompt: String,
    pub enabled_skills: Vec<String>,
    pub sessions: Vec<SessionInfo>,
}
