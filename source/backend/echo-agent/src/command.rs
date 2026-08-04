//! Commands sent by the TUI / API layer into the agent backend.

/// Commands from the frontend to the agent backend.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum BackendCommand {
    /// Send a message into a session (as if from the local user).
    SendMessage { session_id: String, content: String },
    /// Switch the active model.
    SwitchModel { model: String },
    /// Switch the active provider.
    SwitchProvider { provider: String },
    /// Replace the system prompt.
    SetSystemPrompt { prompt: String },
    /// Update an API profile (or the top-level default when `name` is empty).
    /// The profile is activated after saving. An empty `api_key` keeps the
    /// current key unchanged.
    UpdateApiConfig {
        name: String,
        provider: String,
        model: String,
        base_url: String,
        api_key: String,
    },
    /// Switch to an API profile by name (empty = top-level default).
    SwitchApi { name: String },
    /// Delete an API profile by name.
    DeleteApi { name: String },
    /// Enable or disable a skill.
    ToggleSkill { name: String, enabled: bool },
    /// Request a full state snapshot (responded with `BackendEvent::SessionUpdated`
    /// per session plus a fresh [`crate::BackendState`] via the bridge).
    RequestState,
    /// Clear a session's conversation history.
    ClearSession { session_id: String },
    /// Start an adapter by name.
    StartAdapter { name: String },
    /// Stop an adapter by name.
    StopAdapter { name: String },
    /// Restart an adapter.
    RestartAdapter { name: String },
    /// Request the current adapter status list.
    RequestAdapterStatus,
    /// Request the QQ group list.
    RequestGroupList,
    /// Start all configured adapters.
    StartAllAdapters,
    /// Stop all running adapters.
    StopAllAdapters,
    /// Update QQ adapter allowlist at runtime.
    UpdateQqAllowlist { user_ids: Vec<i64>, group_ids: Vec<i64> },
    /// Update QQ adapter denylist at runtime.
    UpdateQqDenylist { user_ids: Vec<i64>, group_ids: Vec<i64> },
    /// Request current QQ filter config.
    RequestQqFilterConfig,
    /// Set QQ gating mode ("none" / "allowlist" / "denylist").
    SetQqGateMode { mode: String },
}
