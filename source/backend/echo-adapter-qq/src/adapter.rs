//! QQ/OneBot adapter — wraps echo-server and implements the Adapter trait.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::Duration;

use async_trait::async_trait;
use echo_adapter::filter::FilterPipeline;
use echo_adapter::traits::{Adapter, AdapterConnectionState, AdapterError, AdapterInfo};
use echo_adapter::types::{AdapterEvent, ChannelType, IncomingMessage, MessageTarget, SendResult};
use echo_core::{Event as OneBotEvent, MessageEvent, Segment};
use echo_server::{ConnCallback, Context, HandlerRegistry, Server, ServerConfig};
use tokio::sync::mpsc;

// Needed for the internal handler's agent processing.
use echo_agent;


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
struct QqInner {
    config: QqAdapterConfig,
    active_context: StdMutex<Option<Arc<Context>>>,
    running: AtomicBool,
    started_at: StdMutex<Option<i64>>,
    connected: AtomicBool,
    self_id: StdMutex<Option<String>>,
    subscribers: StdMutex<Vec<mpsc::UnboundedSender<AdapterEvent>>>,
    filter: StdMutex<Option<Arc<FilterPipeline>>>,
    shutdown_tx: StdMutex<Option<tokio::sync::oneshot::Sender<()>>>,
    tracker: echo_server::ConnectionTracker,
    /// Agent reference (set externally before start).
    agent: StdMutex<Option<Arc<echo_agent::Agent>>>,
    /// Extra handlers to register alongside the internal QQ handler.
    extra_handlers: StdMutex<Vec<Box<dyn echo_server::Handler>>>,
    /// Runtime allowlist overrides (takes precedence over config file values).
    runtime_allowlist_users: StdMutex<Vec<i64>>,
    runtime_allowlist_groups: StdMutex<Vec<i64>>,
    /// Runtime denylist overrides.
    runtime_denylist_users: StdMutex<Vec<i64>>,
    runtime_denylist_groups: StdMutex<Vec<i64>>,
    /// Current gating mode (mutually exclusive).
    gate_mode: StdMutex<QqGateMode>,
    /// Path to the config file for persisting gate changes.
    config_path: StdMutex<Option<String>>,
}

/// Wrapper to make a boxed handler satisfy the `Handler` trait constraint.
struct BoxedHandler(Box<dyn echo_server::Handler>);

#[async_trait]
impl echo_server::Handler for BoxedHandler {
    fn name(&self) -> &str { self.0.name() }
    fn priority(&self) -> i32 { self.0.priority() }
    async fn handle(&self, ctx: &echo_server::Context, event: &OneBotEvent) -> echo_server::HandleResult {
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
        let filter = config.build_filter_pipeline();
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
        Self {
            name: "qq".into(),
            inner: Arc::new(QqInner {
                config,
                active_context: StdMutex::new(None),
                running: AtomicBool::new(false),
                started_at: StdMutex::new(None),
                connected: AtomicBool::new(false),
                self_id: StdMutex::new(None),
                subscribers: StdMutex::new(Vec::new()),
                filter: StdMutex::new(Some(Arc::new(filter))),
                shutdown_tx: StdMutex::new(None),
                tracker: echo_server::ConnectionTracker::default(),
                agent: StdMutex::new(None),
                extra_handlers: StdMutex::new(Vec::new()),
                runtime_allowlist_users: StdMutex::new(au),
                runtime_allowlist_groups: StdMutex::new(ag),
                runtime_denylist_users: StdMutex::new(du),
                runtime_denylist_groups: StdMutex::new(dg),
                gate_mode: StdMutex::new(gate_mode),
                config_path: StdMutex::new(None),
            }),
        }
    }

    /// Set the agent reference — must be called before start().
    pub fn set_agent(&self, agent: Arc<echo_agent::Agent>) {
        *self.inner.agent.lock().expect("agent poisoned") = Some(agent);
    }

    /// Register an additional handler (e.g. Echo, Help, Admin).
    pub fn add_handler(&self, handler: Box<dyn echo_server::Handler>) {
        self.inner.extra_handlers.lock().expect("handlers poisoned").push(handler);
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
                        filtered = filtered
                            .into_iter()
                            .filter(|(gid, _)| allow_groups.contains(gid))
                            .collect();
                    }
                }
                QqGateMode::Denylist => {
                    let deny_groups: std::collections::HashSet<i64> =
                        cfg.denylist.group_ids.iter().cloned().collect();
                    if !deny_groups.is_empty() {
                        filtered = filtered
                            .into_iter()
                            .filter(|(gid, _)| !deny_groups.contains(gid))
                            .collect();
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

    /// Rebuild the filter pipeline from config + runtime overrides and store it.
    fn rebuild_filter_pipeline(&self) {
        let allowlist_users = self.inner.runtime_allowlist_users.lock().expect("poisoned").clone();
        let allowlist_groups = self.inner.runtime_allowlist_groups.lock().expect("poisoned").clone();
        let denylist_users = self.inner.runtime_denylist_users.lock().expect("poisoned").clone();
        let denylist_groups = self.inner.runtime_denylist_groups.lock().expect("poisoned").clone();

        // Build a filter config with runtime overrides.
        let mut filter_cfg = self.inner.config.filter.clone();
        filter_cfg.allowlist.user_ids = allowlist_users;
        filter_cfg.allowlist.group_ids = allowlist_groups;
        filter_cfg.denylist.user_ids = denylist_users;
        filter_cfg.denylist.group_ids = denylist_groups;

        // Rebuild pipeline using the same logic as QqAdapterConfig.
        let mut pipeline = FilterPipeline::new();

        let admin_ids: Vec<String> = if self.inner.config.owner_qq > 0 {
            vec![self.inner.config.owner_qq.to_string()]
        } else {
            vec![]
        };
        let admin_filter = echo_adapter::filter::AdminBypassFilter::new(admin_ids);
        if admin_filter.is_active() {
            pipeline.push(Box::new(admin_filter));
        }

        // Gate mode — allowlist and denylist are mutually exclusive.
        let mode = self.get_gate_mode();
        match mode {
            QqGateMode::Allowlist => {
                let allowlist = echo_adapter::filter::AllowlistFilter::new(
                    filter_cfg.allowlist.user_ids.iter().map(|id| id.to_string()).collect(),
                    filter_cfg.allowlist.group_ids.iter().map(|id| id.to_string()).collect(),
                );
                if allowlist.is_active() {
                    pipeline.push(Box::new(allowlist));
                }
            }
            QqGateMode::Denylist => {
                let denylist = echo_adapter::filter::DenylistFilter::new(
                    filter_cfg.denylist.user_ids.iter().map(|id| id.to_string()).collect(),
                    filter_cfg.denylist.group_ids.iter().map(|id| id.to_string()).collect(),
                );
                if denylist.is_active() {
                    pipeline.push(Box::new(denylist));
                }
            }
            QqGateMode::None => {
                // No allowlist or denylist filtering.
            }
        }

        // Rate limit, keyword, content length from static config.
        if let Some(ref r) = self.inner.config.filter.rate_limit.per_user {
            let f = echo_adapter::filter::RateLimitFilter::new(
                Some(echo_adapter::filter::RateLimitEntry { max_requests: r.max_requests, window_seconds: r.window_seconds }),
                None, None,
            );
            if f.is_active() { pipeline.push(Box::new(f)); }
        }
        if let Some(ref r) = self.inner.config.filter.rate_limit.per_group {
            let f = echo_adapter::filter::RateLimitFilter::new(
                None,
                Some(echo_adapter::filter::RateLimitEntry { max_requests: r.max_requests, window_seconds: r.window_seconds }),
                None,
            );
            if f.is_active() { pipeline.push(Box::new(f)); }
        }
        if let Some(ref r) = self.inner.config.filter.rate_limit.global {
            let f = echo_adapter::filter::RateLimitFilter::new(
                None, None,
                Some(echo_adapter::filter::RateLimitEntry { max_requests: r.max_requests, window_seconds: r.window_seconds }),
            );
            if f.is_active() { pipeline.push(Box::new(f)); }
        }

        let keyword = echo_adapter::filter::KeywordBlockFilter::new(
            self.inner.config.filter.keyword.block_keywords.clone(),
            &self.inner.config.filter.keyword.block_regex,
        );
        if keyword.is_active() {
            pipeline.push(Box::new(keyword));
        }

        if self.inner.config.filter.content.max_length > 0 {
            pipeline.push(Box::new(echo_adapter::filter::ContentLengthFilter::new(
                self.inner.config.filter.content.max_length,
            )));
        }

        *self.inner.filter.lock().expect("filter poisoned") = Some(Arc::new(pipeline));
    }

    /// Update the runtime allowlist. Changes take effect immediately and persist.
    pub fn update_allowlist(&self, user_ids: Vec<i64>, group_ids: Vec<i64>) {
        *self.inner.runtime_allowlist_users.lock().expect("poisoned") = user_ids;
        *self.inner.runtime_allowlist_groups.lock().expect("poisoned") = group_ids;
        self.rebuild_filter_pipeline();
        self.persist_filter();
        tracing::info!("QQ allowlist updated");
    }

    /// Update the runtime denylist. Changes take effect immediately and persist.
    pub fn update_denylist(&self, user_ids: Vec<i64>, group_ids: Vec<i64>) {
        *self.inner.runtime_denylist_users.lock().expect("poisoned") = user_ids;
        *self.inner.runtime_denylist_groups.lock().expect("poisoned") = group_ids;
        self.rebuild_filter_pipeline();
        self.persist_filter();
        tracing::info!("QQ denylist updated");
    }

    /// Set the path to the config file for persisting gate changes.
    pub fn set_config_path(&self, path: String) {
        *self.inner.config_path.lock().expect("poisoned") = Some(path);
    }

    /// Persist the current filter config and gate mode to the config file.
    fn persist_filter(&self) {
        let path = match self.inner.config_path.lock().expect("poisoned").clone() {
            Some(p) => p,
            None => {
                tracing::warn!("QQ filter persist skipped: no config path set");
                return;
            }
        };

        let cfg = self.get_filter_config();
        let mode_str = match self.get_gate_mode() {
            QqGateMode::Allowlist => "allowlist",
            QqGateMode::Denylist => "denylist",
            QqGateMode::None => "none",
        };

        let au = cfg.allowlist.user_ids.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(", ");
        let ag = cfg.allowlist.group_ids.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(", ");
        let du = cfg.denylist.user_ids.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(", ");
        let dg = cfg.denylist.group_ids.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(", ");

        // Write each section separately so `replace_toml_section` can
        // find and replace the exact marker, or append if missing.
        let gate_block = format!("[adapters.qq.gate]\nmode = \"{mode_str}\"\n");
        let allowlist_block = format!(
            "[adapters.qq.filter.allowlist]\nuser_ids = [{au}]\ngroup_ids = [{ag}]\n"
        );
        let denylist_block = format!(
            "[adapters.qq.filter.denylist]\nuser_ids = [{du}]\ngroup_ids = [{dg}]\n"
        );

        // Atomic write: tmp → rename.
        let tmp = format!("{path}.tmp");
        let result: Result<(), String> = (|| {
            let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let mut updated = replace_toml_section(&content, "adapters.qq.gate", &gate_block);
            updated = replace_toml_section(&updated, "adapters.qq.filter.allowlist", &allowlist_block);
            updated = replace_toml_section(&updated, "adapters.qq.filter.denylist", &denylist_block);
            std::fs::write(&tmp, &updated).map_err(|e| e.to_string())?;
            std::fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
            Ok(())
        })();
        if let Err(e) = result {
            tracing::warn!(error = %e, "failed to persist QQ filter config");
        } else {
            tracing::info!(mode = mode_str, au = %au, ag = %ag, "QQ filter config persisted");
        }
    }

    /// Set the gating mode. Rebuilds the filter pipeline and persists.
    pub fn set_gate_mode(&self, mode: QqGateMode) {
        *self.inner.gate_mode.lock().expect("poisoned") = mode;
        self.rebuild_filter_pipeline();
        self.persist_filter();
        tracing::info!(mode = ?mode, "QQ gate mode updated");
    }

    /// Get the current gating mode.
    pub fn get_gate_mode(&self) -> QqGateMode {
        *self.inner.gate_mode.lock().expect("poisoned")
    }

    /// Return the current effective filter config (runtime overrides merged).
    pub fn get_filter_config(&self) -> crate::config::QqFilterConfig {
        let mut cfg = self.inner.config.filter.clone();
        cfg.allowlist.user_ids = self.inner.runtime_allowlist_users.lock().expect("poisoned").clone();
        cfg.allowlist.group_ids = self.inner.runtime_allowlist_groups.lock().expect("poisoned").clone();
        cfg.denylist.user_ids = self.inner.runtime_denylist_users.lock().expect("poisoned").clone();
        cfg.denylist.group_ids = self.inner.runtime_denylist_groups.lock().expect("poisoned").clone();
        cfg
    }

    fn convert_message(event: &OneBotEvent) -> Option<IncomingMessage> {
        let msg = event.as_message()?;
        if matches!(msg, MessageEvent::Unknown) {
            return None;
        }
        let content = msg.plain_text();
        if content.trim().is_empty() {
            return None;
        }
        let (channel, group_name) = if let Some(gid) = msg.group_id() {
            (ChannelType::Group { group_id: gid.to_string() }, None)
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

        // The handler that bridges OneBot events into the agent.
        struct QqHandler {
            inner: Arc<QqInner>,
        }

        #[async_trait]
        impl echo_server::Handler for QqHandler {
            fn name(&self) -> &str {
                "qq-handler"
            }
            fn priority(&self) -> i32 {
                1000
            }
            async fn handle(
                &self,
                ctx: &Context,
                event: &OneBotEvent,
            ) -> echo_server::HandleResult {
                // Store context for outbound sends.
                *self.inner.active_context.lock().expect("ctx poisoned") =
                    Some(Arc::new(ctx.clone()));

                let Some(msg) = QqAdapter::convert_message(event) else {
                    return echo_server::HandleResult::Pass;
                };

                // Trigger gating.
                let trigger = &self.inner.config.trigger;
                if msg.channel.is_group() {
                    if !trigger.group_at_reply || !msg.at_me {
                        return echo_server::HandleResult::Pass;
                    }
                } else if !trigger.dm_auto_reply {
                    return echo_server::HandleResult::Pass;
                }

                // Filter pipeline — clone Arc out of the lock so the guard
                // is dropped before .await.
                let pipeline_opt = self.inner.filter.lock().expect("filter poisoned").clone();
                if let Some(pipeline) = pipeline_opt {
                    let (accepted, block_reply) = pipeline.should_accept(&msg).await;
                    if !accepted {
                        if let Some(reply) = block_reply {
                            let _ = ctx.reply_to(
                                event.as_message().expect("already checked"),
                                reply,
                            ).await;
                        }
                        return echo_server::HandleResult::Handled;
                    }
                }

                // If agent is set, process through it.
                let agent = self.inner.agent.lock().expect("agent poisoned").clone();
                if let Some(agent) = agent {
                    use echo_agent::SessionKey;

                    let key = SessionKey {
                        platform: "qq".into(),
                        scope: if msg.channel.is_group() { "group".into() } else { "dm".into() },
                        scope_id: msg.channel.group_id().unwrap_or("").to_string(),
                        user_id: msg.user_id.clone(),
                    };
                    let session = agent.sessions.get_or_create(
                        &key,
                        msg.user_name.clone(),
                        msg.group_name.clone(),
                    );
                    let session_id = session.id.clone();

                    agent.emit(echo_agent::BackendEvent::SessionUpdated {
                        session: session.info(String::new()),
                    });
                    agent.emit(echo_agent::BackendEvent::MessageReceived {
                        session_id: session_id.clone(),
                        adapter_name: "qq".into(),
                        platform: "qq".into(),
                        user_id: msg.user_id.clone(),
                        user_name: msg.user_name.clone(),
                        channel: format!("{}", msg.channel),
                        group_name: msg.group_name.clone(),
                        content: msg.content.clone(),
                        timestamp: msg.timestamp,
                    });

                    match agent.process_message(&session, &msg.content).await {
                        Ok(reply) => {
                            if !reply.trim().is_empty() {
                                let _ = ctx.reply_to(
                                    event.as_message().expect("already checked"),
                                    reply.clone(),
                                ).await;
                                agent.emit(echo_agent::BackendEvent::MessageSent {
                                    session_id,
                                    content: reply,
                                });
                            }
                        }
                        Err(e) => {
                            tracing::warn!(error = %e, "agent processing failed");
                            agent.emit(echo_agent::BackendEvent::Error {
                                session_id: Some(session_id.clone()),
                                message: e.to_string(),
                            });
                            let _ = ctx.reply_to(
                                event.as_message().expect("already checked"),
                                "（处理消息出错，请稍后再试）".to_string(),
                            ).await;
                        }
                    }
                } else {
                    // No agent — forward to subscribers.
                    let adapter_event = AdapterEvent::MessageReceived(msg);
                    let subs = self.inner.subscribers.lock().expect("subs poisoned");
                    for tx in subs.iter() {
                        let _ = tx.send(adapter_event.clone());
                    }
                }

                echo_server::HandleResult::Handled
            }
        }

        let bind_addr = server_cfg.bind_address.clone();

        let listener = tokio::net::TcpListener::bind(&bind_addr)
            .await
            .map_err(|e| AdapterError::Internal(format!("bind {}: {e}", bind_addr)))?;

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
        *inner.shutdown_tx.lock().map_err(|e| AdapterError::Internal(e.to_string()))? = Some(shutdown_tx);

        let inner_cb = inner.clone();
        let conn_cb: ConnCallback = Arc::new(move |connected: bool, self_id: i64| {
            if connected {
                *inner_cb.self_id.lock().expect("self_id poisoned") = Some(self_id.to_string());
                tracing::info!(%self_id, "NapCat client connected via reverse WebSocket");
            } else {
                tracing::warn!("NapCat client disconnected");
            }
            inner_cb.connected.store(connected, Ordering::SeqCst);
            if let Some(ref agent) = *inner_cb.agent.lock().expect("agent poisoned") {
                agent.emit(echo_agent::BackendEvent::AdapterStateChanged {
                    adapter_name: "qq".into(),
                    connected,
                    self_id: Some(self_id.to_string()),
                });
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
        registry.register(QqHandler { inner: inner.clone() });

        inner.running.store(true, Ordering::SeqCst);
        *inner.started_at.lock().expect("started_at poisoned") =
            Some(chrono::Utc::now().timestamp());

        let server = Server::new(server_cfg, Arc::new(registry), inner.tracker.clone(), Some(conn_cb));

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
        // NapCat runs in Docker — use host.docker.internal to reach the host.
        let napcat_url = self.inner.config.napcat_webui_url.clone();
        let port = bind_addr.split(':').last().unwrap_or("3131");
        let ws_url = format!("ws://host.docker.internal:{port}");
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
                    tracing::info!("NapCat running, not logged in — will try auto-config after login");
                }
                crate::napcat::NapCatState::Unreachable => {
                    tracing::info!("NapCat WebUI not reachable at {napcat_url} — skipping auto-config");
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
                        if !allow_users.is_empty() && user_id != 0 && !allow_users.contains(&user_id) {
                            return Ok(SendResult { message_id: None, success: false,
                                error: Some(format!("user {user_id} is not allowlisted")) });
                        }
                        if !allow_groups.is_empty() {
                            if let Some(gid) = group_id {
                                if !allow_groups.contains(&gid) {
                                    return Ok(SendResult { message_id: None, success: false,
                                        error: Some(format!("group {gid} is not allowlisted")) });
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
                            return Ok(SendResult { message_id: None, success: false,
                                error: Some(format!("user {user_id} is denylisted")) });
                        }
                        if !deny_groups.is_empty() {
                            if let Some(gid) = group_id {
                                if deny_groups.contains(&gid) {
                                    return Ok(SendResult { message_id: None, success: false,
                                        error: Some(format!("group {gid} is denylisted")) });
                                }
                            }
                        }
                    }
                    QqGateMode::None => unreachable!(),
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
        self.get_group_list().await.map_err(|e| AdapterError::Internal(e))
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
            cfg.allowlist.user_ids.iter().map(|id| id.to_string()).collect(),
            cfg.allowlist.group_ids.iter().map(|id| id.to_string()).collect(),
            cfg.denylist.user_ids.iter().map(|id| id.to_string()).collect(),
            cfg.denylist.group_ids.iter().map(|id| id.to_string()).collect(),
        )
    }

    fn set_gate_mode(&self, mode: &str) {
        let m = match mode {
            "allowlist" => QqGateMode::Allowlist,
            "denylist" => QqGateMode::Denylist,
            _ => QqGateMode::None,
        };
        self.set_gate_mode(m);
    }

    fn get_gate_mode(&self) -> String {
        match self.get_gate_mode() {
            QqGateMode::Allowlist => "allowlist".into(),
            QqGateMode::Denylist => "denylist".into(),
            QqGateMode::None => "none".into(),
        }
    }
}

// ── TOML section replacer ─────────────────────────────────────────────────

/// Replace (or insert) a TOML section in `content`.
fn replace_toml_section(content: &str, section: &str, new_block: &str) -> String {
    let marker = format!("[{section}]");
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.iter().position(|l| l.trim() == marker);
    let Some(start) = start else {
        let mut out = content.trim_end().to_string();
        if !out.is_empty() { out.push('\n'); }
        out.push_str(new_block);
        if !new_block.ends_with('\n') { out.push('\n'); }
        return out;
    };
    let array_sub = format!("[[{section}");
    let dotted_sub = format!("[{section}.");
    let mut end = lines.len();
    for i in (start + 1)..lines.len() {
        let t = lines[i].trim_start();
        let is_sub = t.starts_with(&array_sub) || t.starts_with(&dotted_sub);
        if t.starts_with('[') && !is_sub && t != marker { end = i; break; }
    }
    let mut out = String::new();
    for (i, line) in lines.iter().enumerate() {
        if i == start {
            out.push_str(new_block);
            if !new_block.ends_with('\n') { out.push('\n'); }
        } else if i > start && i < end {
            // skip old section body
        } else {
            out.push_str(line);
            out.push('\n');
        }
    }
    out
}
