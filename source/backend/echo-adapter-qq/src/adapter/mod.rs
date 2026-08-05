//! QQ/OneBot adapter — wraps echo-server and implements the Adapter trait.
//!
//! Filter/gate management and TOML persistence live in `filter.rs`.

mod filter;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::Duration;

use async_trait::async_trait;
use echo_adapter::filter::FilterPipeline;
use echo_adapter::traits::{Adapter, AdapterConnectionState, AdapterError, AdapterInfo, GateMode};
use echo_adapter::types::{AdapterEvent, ChannelType, IncomingMessage, MessageTarget, SendResult};
use echo_core::{Event as OneBotEvent, MessageEvent, Segment};
use echo_server::{ConnCallback, Context, HandlerRegistry, Server, ServerConfig};
use tokio::sync::mpsc;

use crate::config::QqAdapterConfig;

/// Gating mode — mutually exclusive.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QqGateMode {
    /// No filtering — everyone can interact.
    None,
    /// Only allowlisted users/groups can interact.
    Allowlist,
    /// Denylisted users/groups are blocked; everyone else allowed.
    Denylist,
}

/// Shared inner state — lives in an Arc so the server task can reference it.
/// Fields are `pub(crate)` so the message handler (handler.rs) can use them.
pub(crate) struct QqInner {
    pub(crate) config: QqAdapterConfig,
    pub(crate) active_context: StdMutex<Option<Arc<Context>>>,
    pub(crate) running: AtomicBool,
    pub(crate) started_at: StdMutex<Option<i64>>,
    pub(crate) connected: AtomicBool,
    pub(crate) self_id: StdMutex<Option<String>>,
    pub(crate) subscribers: StdMutex<Vec<mpsc::UnboundedSender<AdapterEvent>>>,
    pub(crate) filter: StdMutex<Option<Arc<FilterPipeline>>>,
    pub(crate) shutdown_tx: StdMutex<Option<tokio::sync::oneshot::Sender<()>>>,
    pub(crate) tracker: echo_server::ConnectionTracker,
    /// Agent bridge (set externally before start). Adapters depend only on
    /// the [`echo_adapter::AgentBridge`] trait, not on echo-agent itself.
    pub(crate) agent_bridge: StdMutex<Option<Arc<dyn echo_adapter::AgentBridge>>>,
    /// Extra handlers to register alongside the internal QQ handler.
    pub(crate) extra_handlers: StdMutex<Vec<Box<dyn echo_server::Handler>>>,
    /// Runtime allowlist overrides (takes precedence over config file values).
    pub(crate) runtime_allowlist_users: StdMutex<Vec<i64>>,
    pub(crate) runtime_allowlist_groups: StdMutex<Vec<i64>>,
    /// Runtime denylist overrides.
    pub(crate) runtime_denylist_users: StdMutex<Vec<i64>>,
    pub(crate) runtime_denylist_groups: StdMutex<Vec<i64>>,
    /// Current gating mode (mutually exclusive).
    pub(crate) gate_mode: StdMutex<QqGateMode>,
    /// Shared config store for persisting gate/filter changes.
    pub(crate) config_store: StdMutex<Option<echo_adapter::ConfigStore>>,
}

/// Wrapper to make a boxed handler satisfy the `Handler` trait constraint.
struct BoxedHandler(Box<dyn echo_server::Handler>);

#[async_trait]
impl echo_server::Handler for BoxedHandler {
    fn name(&self) -> &str {
        self.0.name()
    }
    fn priority(&self) -> i32 {
        self.0.priority()
    }
    async fn handle(
        &self,
        ctx: &echo_server::Context,
        event: &OneBotEvent,
    ) -> echo_server::HandleResult {
        self.0.handle(ctx, event).await
    }
}

/// The QQ adapter — wraps a reverse-WebSocket server (echo-server)
/// and bridges OneBot v11 events into the agent.
pub struct QqAdapter {
    name: String,
    inner: Arc<QqInner>,
}

impl QqAdapter {
    pub fn new(config: QqAdapterConfig) -> Self {
        // Seed runtime override fields from config.
        let au = config.filter.allowlist.user_ids.clone();
        let ag = config.filter.allowlist.group_ids.clone();
        let du = config.filter.denylist.user_ids.clone();
        let dg = config.filter.denylist.group_ids.clone();
        let gate_mode = match config.gate.mode.as_str() {
            "allowlist" => QqGateMode::Allowlist,
            "denylist" => QqGateMode::Denylist,
            _ => QqGateMode::None,
        };
        let adapter = Self {
            name: "qq".into(),
            inner: Arc::new(QqInner {
                config,
                active_context: StdMutex::new(None),
                running: AtomicBool::new(false),
                started_at: StdMutex::new(None),
                connected: AtomicBool::new(false),
                self_id: StdMutex::new(None),
                subscribers: StdMutex::new(Vec::new()),
                filter: StdMutex::new(None), // built below via rebuild_filter_pipeline
                shutdown_tx: StdMutex::new(None),
                tracker: echo_server::ConnectionTracker::default(),
                agent_bridge: StdMutex::new(None),
                extra_handlers: StdMutex::new(Vec::new()),
                runtime_allowlist_users: StdMutex::new(au),
                runtime_allowlist_groups: StdMutex::new(ag),
                runtime_denylist_users: StdMutex::new(du),
                runtime_denylist_groups: StdMutex::new(dg),
                gate_mode: StdMutex::new(gate_mode),
                config_store: StdMutex::new(None),
            }),
        };
        // Build the pipeline respecting gate mode.
        adapter.rebuild_filter_pipeline();
        adapter
    }

    /// Set the agent reference — must be called before start().
    /// Attach the agent bridge (implemented by echo-agent) that routes
    /// inbound messages into the LLM loop.
    pub fn set_agent(&self, bridge: Arc<dyn echo_adapter::AgentBridge>) {
        *self
            .inner
            .agent_bridge
            .lock()
            .expect("agent bridge poisoned") = Some(bridge);
    }

    /// Register an additional handler (e.g. Echo, Help, Admin).
    pub fn add_handler(&self, handler: Box<dyn echo_server::Handler>) {
        self.inner
            .extra_handlers
            .lock()
            .expect("handlers poisoned")
            .push(handler);
    }

    /// Get group list via the active QQ connection.
    pub async fn get_group_list(&self) -> Result<Vec<(i64, String)>, String> {
        let ctx = self
            .inner
            .active_context
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?
            .clone()
            .ok_or("no QQ connection active")?;
        let request = echo_core::action::actions::get_group_list();
        let resp = ctx.send_api(request).await.map_err(|e| e.to_string())?;
        // The response data is an array of { group_id, group_name, ... }.
        let groups: Vec<(i64, String)> = resp
            .data
            .as_array()
            .ok_or("unexpected response format")?
            .iter()
            .filter_map(|v| {
                let gid = v.get("group_id")?.as_i64()?;
                let name = v
                    .get("group_name")
                    .and_then(|n| n.as_str())
                    .unwrap_or("(unknown)")
                    .to_string();
                Some((gid, name))
            })
            .collect();

        // Apply gate-mode filtering to the group list.
        let mode = self.get_gate_mode();
        if mode != QqGateMode::None {
            let cfg = self.get_filter_config();
            let mut filtered = groups;
            match mode {
                QqGateMode::Allowlist => {
                    let allow_groups: std::collections::HashSet<i64> =
                        cfg.allowlist.group_ids.iter().cloned().collect();
                    if !allow_groups.is_empty() {
                        filtered.retain(|(gid, _)| allow_groups.contains(gid));
                    }
                }
                QqGateMode::Denylist => {
                    let deny_groups: std::collections::HashSet<i64> =
                        cfg.denylist.group_ids.iter().cloned().collect();
                    if !deny_groups.is_empty() {
                        filtered.retain(|(gid, _)| !deny_groups.contains(gid));
                    }
                }
                QqGateMode::None => {}
            }
            return Ok(filtered);
        }
        Ok(groups)
    }

    /// Get group member info via the active QQ connection.
    pub async fn get_group_member_info(
        &self,
        group_id: i64,
        user_id: i64,
    ) -> Result<String, String> {
        // ── Gate mode check ──
        {
            let mode = self.get_gate_mode();
            if mode != QqGateMode::None {
                let cfg = self.get_filter_config();
                match mode {
                    QqGateMode::Allowlist => {
                        let allow_groups: std::collections::HashSet<i64> =
                            cfg.allowlist.group_ids.iter().cloned().collect();
                        if !allow_groups.is_empty() && !allow_groups.contains(&group_id) {
                            return Err(format!("group {group_id} is not allowlisted"));
                        }
                    }
                    QqGateMode::Denylist => {
                        let deny_groups: std::collections::HashSet<i64> =
                            cfg.denylist.group_ids.iter().cloned().collect();
                        if !deny_groups.is_empty() && deny_groups.contains(&group_id) {
                            return Err(format!("group {group_id} is denylisted"));
                        }
                    }
                    QqGateMode::None => {}
                }
            }
        }
        let _ = user_id; // reserved for future per-user gating

        let ctx = self
            .inner
            .active_context
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?
            .clone();
        let ctx = ctx.ok_or("no QQ connection active")?;
        let request = echo_core::action::actions::get_group_member_info(group_id, user_id);
        let resp = ctx.send_api(request).await.map_err(|e| e.to_string())?;
        serde_json::to_string(&resp.data).map_err(|e| e.to_string())
    }

    pub(crate) fn convert_message(event: &OneBotEvent) -> Option<IncomingMessage> {
        let msg = event.as_message()?;
        if matches!(msg, MessageEvent::Unknown) {
            return None;
        }
        let content = msg.plain_text();
        if content.trim().is_empty() {
            return None;
        }
        let (channel, group_name) = if let Some(gid) = msg.group_id() {
            (
                ChannelType::Group {
                    group_id: gid.to_string(),
                },
                None,
            )
        } else {
            (ChannelType::Direct, None)
        };
        Some(IncomingMessage {
            adapter_name: "qq".into(),
            platform: "qq".into(),
            user_id: msg.user_id().to_string(),
            user_name: msg.sender_nickname().to_string(),
            channel,
            group_name,
            content,
            timestamp: msg.timestamp(),
            at_me: msg.at_me(),
            metadata: serde_json::Value::Null,
        })
    }
}

#[async_trait]
impl Adapter for QqAdapter {
    fn name(&self) -> &str {
        &self.name
    }

    fn display_name(&self) -> &str {
        "QQ / OneBot"
    }

    fn platform(&self) -> &str {
        "qq"
    }

    fn is_configured(&self) -> bool {
        !self.inner.config.server.bind_address.is_empty()
    }

    fn status_info(&self) -> AdapterInfo {
        let connected = self.inner.connected.load(Ordering::SeqCst);
        let running = self.inner.running.load(Ordering::SeqCst);
        AdapterInfo {
            name: self.name.clone(),
            display_name: "QQ / OneBot".into(),
            status: if !running {
                AdapterConnectionState::Stopped
            } else if connected {
                AdapterConnectionState::Connected
            } else {
                AdapterConnectionState::Disconnected
            },
            self_id: self.inner.self_id.lock().ok().and_then(|g| g.clone()),
            started_at: self.inner.started_at.lock().ok().and_then(|g| *g),
            platform: "qq".into(),
            configured: self.is_configured(),
        }
    }

    async fn start(&self) -> Result<(), AdapterError> {
        if self.inner.running.load(Ordering::SeqCst) {
            return Err(AdapterError::AlreadyRunning("qq".into()));
        }

        let server_cfg = ServerConfig {
            bind_address: self.inner.config.server.bind_address.clone(),
            access_token: if self.inner.config.server.access_token.is_empty() {
                None
            } else {
                Some(self.inner.config.server.access_token.clone())
            },
            heartbeat_interval: (self.inner.config.server.heartbeat_interval > 0)
                .then(|| Duration::from_secs(self.inner.config.server.heartbeat_interval)),
        };

        let inner = self.inner.clone();

        let bind_addr = server_cfg.bind_address.clone();

        let listener = tokio::net::TcpListener::bind(&bind_addr)
            .await
            .map_err(|e| AdapterError::Internal(format!("bind {}: {e}", bind_addr)))?;

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
        *inner
            .shutdown_tx
            .lock()
            .map_err(|e| AdapterError::Internal(e.to_string()))? = Some(shutdown_tx);

        let inner_cb = inner.clone();
        let conn_cb: ConnCallback = Arc::new(move |connected: bool, self_id: i64| {
            if connected {
                *inner_cb.self_id.lock().expect("self_id poisoned") = Some(self_id.to_string());
                tracing::info!(%self_id, "NapCat client connected via reverse WebSocket");
            } else {
                tracing::warn!("NapCat client disconnected");
            }
            inner_cb.connected.store(connected, Ordering::SeqCst);
            if let Some(ref bridge) = *inner_cb.agent_bridge.lock().expect("agent bridge poisoned")
            {
                bridge.on_connection_state("qq", connected, Some(self_id.to_string()));
            }
        });

        let mut registry = HandlerRegistry::new();
        // Cannot clone Box<dyn Handler>, so we take them out and re-create later if needed.
        // For now, take ownership and register via the wrapper.
        let extra: Vec<Box<dyn echo_server::Handler>> =
            std::mem::take(&mut *inner.extra_handlers.lock().expect("handlers poisoned"));
        for h in extra {
            registry.register(BoxedHandler(h));
        }
        registry.register(crate::handler::QqHandler::new(inner.clone()));

        inner.running.store(true, Ordering::SeqCst);
        *inner.started_at.lock().expect("started_at poisoned") =
            Some(chrono::Utc::now().timestamp());

        let server = Server::new(
            server_cfg,
            Arc::new(registry),
            inner.tracker.clone(),
            Some(conn_cb),
        );

        tokio::spawn(async move {
            let run_fut = server.run_with_listener(listener);
            tokio::select! {
                result = run_fut => {
                    if let Err(e) = result {
                        tracing::warn!(error = %e, "QQ server terminated");
                    }
                }
                _ = &mut shutdown_rx => {
                    tracing::info!("QQ adapter shutdown requested");
                }
            }
            inner.running.store(false, Ordering::SeqCst);
        });

        // Auto-configure NapCat reverse WebSocket (background).
        // NapCat usually runs in Docker — reach the host via the configured
        // host (default host.docker.internal).
        let napcat_url = self.inner.config.napcat_webui_url.clone();
        let napcat_host = self.inner.config.napcat_host.clone();
        let port = bind_addr.split(':').next_back().unwrap_or("3131");
        let ws_url = format!("ws://{napcat_host}:{port}");
        let token = self.inner.config.server.access_token.clone();
        tokio::spawn(async move {
            let napcat = crate::NapCatClient::new(&napcat_url);
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            match napcat.check().await {
                crate::napcat::NapCatState::Online { user_id, nickname } => {
                    tracing::info!(%user_id, %nickname, "NapCat detected — configuring reverse WS to {ws_url}");
                    if let Err(e) = napcat.configure_reverse_ws(&ws_url, &token).await {
                        tracing::warn!(error = %e, "NapCat auto-config failed");
                    }
                }
                crate::napcat::NapCatState::WaitingForLogin => {
                    tracing::info!(
                        "NapCat running, not logged in — will try auto-config after login"
                    );
                }
                crate::napcat::NapCatState::Unreachable => {
                    tracing::info!(
                        "NapCat WebUI not reachable at {napcat_url} — skipping auto-config"
                    );
                }
            }
        });

        tracing::info!(address = %bind_addr, "QQ adapter started");
        Ok(())
    }

    async fn stop(&self) -> Result<(), AdapterError> {
        if !self.inner.running.load(Ordering::SeqCst) {
            return Err(AdapterError::NotRunning("qq".into()));
        }
        let tx = self
            .inner
            .shutdown_tx
            .lock()
            .map_err(|e| AdapterError::Internal(e.to_string()))?
            .take();
        if let Some(tx) = tx {
            let _ = tx.send(());
        }
        self.inner.running.store(false, Ordering::SeqCst);
        Ok(())
    }

    async fn send_message(
        &self,
        target: &MessageTarget,
        content: &str,
    ) -> Result<SendResult, AdapterError> {
        if target.adapter_name != "qq" {
            return Ok(SendResult {
                message_id: None,
                success: false,
                error: Some(format!(
                    "wrong adapter: expected 'qq', got '{}'",
                    target.adapter_name
                )),
            });
        }

        // ── Gate mode check ──
        {
            let mode = self.get_gate_mode();
            if mode != QqGateMode::None {
                let cfg = self.get_filter_config();
                let user_id: i64 = target.user_id.parse().unwrap_or(0);
                let group_id: Option<i64> = match &target.channel {
                    ChannelType::Group { group_id } => group_id.parse().ok(),
                    ChannelType::Direct => None,
                };

                match mode {
                    QqGateMode::Allowlist => {
                        let allow_users: std::collections::HashSet<i64> =
                            cfg.allowlist.user_ids.iter().cloned().collect();
                        let allow_groups: std::collections::HashSet<i64> =
                            cfg.allowlist.group_ids.iter().cloned().collect();
                        if !allow_users.is_empty()
                            && user_id != 0
                            && !allow_users.contains(&user_id)
                        {
                            tracing::info!(%user_id, "send_message blocked: user not allowlisted");
                            return Ok(SendResult {
                                message_id: None,
                                success: false,
                                error: Some(format!("user {user_id} is not allowlisted")),
                            });
                        }
                        if !allow_groups.is_empty() {
                            if let Some(gid) = group_id {
                                if !allow_groups.contains(&gid) {
                                    tracing::info!(%gid, "send_message blocked: group not allowlisted");
                                    return Ok(SendResult {
                                        message_id: None,
                                        success: false,
                                        error: Some(format!("group {gid} is not allowlisted")),
                                    });
                                }
                            }
                        }
                    }
                    QqGateMode::Denylist => {
                        let deny_users: std::collections::HashSet<i64> =
                            cfg.denylist.user_ids.iter().cloned().collect();
                        let deny_groups: std::collections::HashSet<i64> =
                            cfg.denylist.group_ids.iter().cloned().collect();
                        if !deny_users.is_empty() && user_id != 0 && deny_users.contains(&user_id) {
                            tracing::info!(%user_id, "send_message blocked: user denylisted");
                            return Ok(SendResult {
                                message_id: None,
                                success: false,
                                error: Some(format!("user {user_id} is denylisted")),
                            });
                        }
                        if !deny_groups.is_empty() {
                            if let Some(gid) = group_id {
                                if deny_groups.contains(&gid) {
                                    tracing::info!(%gid, "send_message blocked: group denylisted");
                                    return Ok(SendResult {
                                        message_id: None,
                                        success: false,
                                        error: Some(format!("group {gid} is denylisted")),
                                    });
                                }
                            }
                        }
                    }
                    // Never reached: the outer guard filters out None. A
                    // fallback arm keeps this robust if a new mode is added.
                    _ => {}
                }
            }
        }

        let ctx = self
            .inner
            .active_context
            .lock()
            .map_err(|e| AdapterError::Internal(e.to_string()))?
            .clone()
            .ok_or_else(|| AdapterError::SendFailed("no QQ connection active".into()))?;

        let result = match &target.channel {
            ChannelType::Direct => {
                let user_id: i64 = target
                    .user_id
                    .parse()
                    .map_err(|_| AdapterError::SendFailed("invalid user_id".into()))?;
                ctx.send_private_text(user_id, content).await
            }
            ChannelType::Group { group_id } => {
                let gid: i64 = group_id
                    .parse()
                    .map_err(|_| AdapterError::SendFailed("invalid group_id".into()))?;
                let user_id: i64 = if target.user_id.is_empty() {
                    0
                } else {
                    target
                        .user_id
                        .parse()
                        .map_err(|_| AdapterError::SendFailed("invalid user_id".into()))?
                };
                if user_id != 0 {
                    ctx.send_group_msg(
                        gid,
                        vec![Segment::at(target.user_id.clone()), Segment::text(content)],
                    )
                    .await
                } else {
                    ctx.send_group_text(gid, content).await
                }
            }
        };

        match result {
            Ok(resp) => {
                let message_id = resp
                    .data
                    .get("message_id")
                    .and_then(|v| v.as_i64())
                    .map(|id| id.to_string());
                Ok(SendResult {
                    message_id,
                    success: resp.is_ok(),
                    error: resp.error_message(),
                })
            }
            Err(e) => Ok(SendResult {
                message_id: None,
                success: false,
                error: Some(e.to_string()),
            }),
        }
    }

    fn subscribe(&self, tx: mpsc::UnboundedSender<AdapterEvent>) {
        if let Ok(mut subs) = self.inner.subscribers.lock() {
            subs.push(tx);
        }
    }

    fn filter_pipeline(&self) -> Option<&FilterPipeline> {
        // The filter pipeline is behind a mutex for runtime updates and can't
        // be borrowed through this trait method.  Return None — the real
        // filtering happens inside QqHandler::handle().
        None
    }

    async fn get_groups(&self) -> Result<Vec<(i64, String)>, AdapterError> {
        self.get_group_list().await.map_err(AdapterError::Internal)
    }

    fn has_group_list(&self) -> bool {
        true
    }

    fn update_allowlist(&self, user_ids: Vec<String>, group_ids: Vec<String>) {
        let users: Vec<i64> = user_ids.iter().filter_map(|s| s.parse().ok()).collect();
        let groups: Vec<i64> = group_ids.iter().filter_map(|s| s.parse().ok()).collect();
        self.update_allowlist(users, groups);
    }

    fn update_denylist(&self, user_ids: Vec<String>, group_ids: Vec<String>) {
        let users: Vec<i64> = user_ids.iter().filter_map(|s| s.parse().ok()).collect();
        let groups: Vec<i64> = group_ids.iter().filter_map(|s| s.parse().ok()).collect();
        self.update_denylist(users, groups);
    }

    fn get_filter_info(&self) -> (Vec<String>, Vec<String>, Vec<String>, Vec<String>) {
        let cfg = self.get_filter_config();
        (
            cfg.allowlist
                .user_ids
                .iter()
                .map(|id| id.to_string())
                .collect(),
            cfg.allowlist
                .group_ids
                .iter()
                .map(|id| id.to_string())
                .collect(),
            cfg.denylist
                .user_ids
                .iter()
                .map(|id| id.to_string())
                .collect(),
            cfg.denylist
                .group_ids
                .iter()
                .map(|id| id.to_string())
                .collect(),
        )
    }

    fn set_gate_mode(&self, mode: GateMode) {
        let m = match mode {
            GateMode::Allowlist => QqGateMode::Allowlist,
            GateMode::Denylist => QqGateMode::Denylist,
            GateMode::None => QqGateMode::None,
        };
        self.set_gate_mode(m);
    }

    fn get_gate_mode(&self) -> GateMode {
        match self.get_gate_mode() {
            QqGateMode::Allowlist => GateMode::Allowlist,
            QqGateMode::Denylist => GateMode::Denylist,
            QqGateMode::None => GateMode::None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use echo_core::Event;

    fn private_event(text: &str) -> Event {
        serde_json::from_value(serde_json::json!({
            "post_type": "message",
            "message_type": "private",
            "time": 1700000000,
            "self_id": 10001,
            "sub_type": "friend",
            "message_id": 42,
            "user_id": 123456,
            "message": [{"type": "text", "data": {"text": text}}],
            "raw_message": text,
            "font": 0,
            "sender": {"user_id": 123456, "nickname": "tester"}
        }))
        .unwrap()
    }

    fn group_event(text: &str, at_me: bool) -> Event {
        let mut segments = vec![serde_json::json!({"type": "text", "data": {"text": text}})];
        if at_me {
            segments.insert(
                0,
                serde_json::json!({"type": "at", "data": {"qq": "10001"}}),
            );
        }
        serde_json::from_value(serde_json::json!({
            "post_type": "message",
            "message_type": "group",
            "time": 1700000000,
            "self_id": 10001,
            "sub_type": "normal",
            "message_id": 43,
            "group_id": 999,
            "user_id": 123456,
            "message": segments,
            "raw_message": text,
            "font": 0,
            "sender": {"user_id": 123456, "nickname": "tester", "card": ""}
        }))
        .unwrap()
    }

    #[test]
    fn converts_private_message_to_direct_channel() {
        let msg = QqAdapter::convert_message(&private_event("hello")).expect("converted");
        assert_eq!(msg.platform, "qq");
        assert_eq!(msg.user_id, "123456");
        assert_eq!(msg.user_name, "tester");
        assert!(matches!(msg.channel, ChannelType::Direct));
        assert_eq!(msg.content, "hello");
        assert_eq!(msg.timestamp, 1700000000);
        assert!(!msg.at_me);
    }

    #[test]
    fn converts_group_message_with_group_id() {
        let msg = QqAdapter::convert_message(&group_event("hi all", false)).expect("converted");
        match msg.channel {
            ChannelType::Group { group_id } => assert_eq!(group_id, "999"),
            other => panic!("expected group channel, got {other:?}"),
        }
        assert!(!msg.at_me);
    }

    #[test]
    fn detects_at_me_in_group_message() {
        let msg = QqAdapter::convert_message(&group_event("hi", true)).expect("converted");
        assert!(msg.at_me);
    }

    #[test]
    fn rejects_blank_content() {
        assert!(QqAdapter::convert_message(&private_event("   ")).is_none());
        assert!(QqAdapter::convert_message(&private_event("")).is_none());
    }

    #[test]
    fn rejects_non_message_events() {
        let heartbeat = serde_json::from_value(serde_json::json!({
            "post_type": "meta_event",
            "meta_event_type": "heartbeat",
            "time": 1700000000,
            "self_id": 10001,
            "interval": 5000,
            "status": {"online": true}
        }))
        .unwrap();
        assert!(QqAdapter::convert_message(&heartbeat).is_none());
    }

    #[test]
    fn converts_cq_image_segments_without_content() {
        // A message with only an image has no plain text — content empty.
        let event = serde_json::from_value(serde_json::json!({
            "post_type": "message",
            "message_type": "private",
            "time": 1700000000,
            "self_id": 10001,
            "sub_type": "friend",
            "message_id": 42,
            "user_id": 123456,
            "message": [{"type": "image", "data": {"file": "abc.png"}}],
            "raw_message": "[CQ:image,file=abc.png]",
            "font": 0,
            "sender": {"user_id": 123456, "nickname": "tester"}
        }))
        .unwrap();
        // Image-only messages carry no text, so they are dropped.
        assert!(QqAdapter::convert_message(&event).is_none());
    }
}

// ── TOML section replacer ─────────────────────────────────────────────────
