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

/// Shared inner state — lives in an Arc so the server task can reference it.
struct QqInner {
    config: QqAdapterConfig,
    active_context: StdMutex<Option<Arc<Context>>>,
    running: AtomicBool,
    started_at: StdMutex<Option<i64>>,
    connected: AtomicBool,
    self_id: StdMutex<Option<String>>,
    subscribers: StdMutex<Vec<mpsc::UnboundedSender<AdapterEvent>>>,
    filter: Option<FilterPipeline>,
    shutdown_tx: StdMutex<Option<tokio::sync::oneshot::Sender<()>>>,
    tracker: echo_server::ConnectionTracker,
    /// Agent reference (set externally before start).
    agent: StdMutex<Option<Arc<echo_agent::Agent>>>,
    /// Extra handlers to register alongside the internal QQ handler.
    extra_handlers: StdMutex<Vec<Box<dyn echo_server::Handler>>>,
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
                filter: Some(filter),
                shutdown_tx: StdMutex::new(None),
                tracker: echo_server::ConnectionTracker::default(),
                agent: StdMutex::new(None),
                extra_handlers: StdMutex::new(Vec::new()),
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
        Ok(groups)
    }

    /// Get group member info via the active QQ connection.
    pub async fn get_group_member_info(
        &self,
        group_id: i64,
        user_id: i64,
    ) -> Result<String, String> {
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

                // Filter pipeline.
                if let Some(ref pipeline) = self.inner.filter {
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
        self.inner.filter.as_ref()
    }

    async fn get_groups(&self) -> Result<Vec<(i64, String)>, AdapterError> {
        self.get_group_list().await.map_err(|e| AdapterError::Internal(e))
    }

    fn has_group_list(&self) -> bool {
        true
    }
}
