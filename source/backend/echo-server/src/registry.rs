//! Handler trait, per-event context, and the priority-ordered registry.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use dashmap::DashMap;
use echo_core::{ApiRequest, ApiResponse, Event, MessageEvent, Segment};
use futures_util::FutureExt;
use tokio::sync::{mpsc, oneshot};
use tokio::time::timeout;

use crate::connection::Outgoing;
use crate::error::EchoServerError;

/// How long [`Context::send_api`] waits for the correlated response.
pub const DEFAULT_RESPONSE_TIMEOUT: Duration = Duration::from_secs(15);

/// Per-event handle handed to handlers.
///
/// It exposes the bot's capabilities without leaking connection internals.
#[derive(Clone)]
pub struct Context {
    /// QQ number of the bot on this connection.
    pub self_id: i64,
    /// Unique id of the WebSocket connection that delivered the event.
    pub connection_id: String,
    pub(crate) api_tx: mpsc::Sender<Outgoing>,
    pub(crate) pending: Arc<DashMap<String, oneshot::Sender<ApiResponse>>>,
    response_timeout: Duration,
}

impl Context {
    pub(crate) fn new(
        self_id: i64,
        connection_id: String,
        api_tx: mpsc::Sender<Outgoing>,
        pending: Arc<DashMap<String, oneshot::Sender<ApiResponse>>>,
    ) -> Self {
        Self {
            self_id,
            connection_id,
            api_tx,
            pending,
            response_timeout: DEFAULT_RESPONSE_TIMEOUT,
        }
    }

    /// Call an OneBot action and await the correlated response.
    pub async fn send_api(&self, mut request: ApiRequest) -> Result<ApiResponse, EchoServerError> {
        let echo = uuid::Uuid::new_v4().to_string();
        request.echo = Some(echo.clone());

        let (tx, rx) = oneshot::channel();
        self.pending.insert(echo.clone(), tx);
        // 发送失败时立刻清掉 pending 条目，避免泄漏 oneshot Sender
        if self.api_tx.send(Outgoing::Api(request)).await.is_err() {
            self.pending.remove(&echo);
            return Err(EchoServerError::ConnectionClosed);
        }

        let result = timeout(self.response_timeout, rx).await;
        self.pending.remove(&echo);

        match result {
            Ok(Ok(resp)) => Ok(resp),
            Ok(Err(_)) => Err(EchoServerError::ConnectionClosed),
            Err(_) => Err(EchoServerError::ApiTimeout),
        }
    }

    /// Send a message to a private chat.
    pub async fn send_private_msg(
        &self,
        user_id: i64,
        message: Vec<Segment>,
    ) -> Result<ApiResponse, EchoServerError> {
        self.send_api(echo_core::action::actions::send_private_msg(user_id, message))
            .await
    }

    /// Send a message to a group.
    pub async fn send_group_msg(
        &self,
        group_id: i64,
        message: Vec<Segment>,
    ) -> Result<ApiResponse, EchoServerError> {
        self.send_api(echo_core::action::actions::send_group_msg(group_id, message))
            .await
    }

    /// Send a text message to a private chat.
    pub async fn send_private_text(
        &self,
        user_id: i64,
        content: &str,
    ) -> Result<ApiResponse, EchoServerError> {
        self.send_private_msg(user_id, echo_core::message::text(content)).await
    }

    /// Send a text message to a group.
    pub async fn send_group_text(
        &self,
        group_id: i64,
        content: &str,
    ) -> Result<ApiResponse, EchoServerError> {
        self.send_group_msg(group_id, echo_core::message::text(content)).await
    }

    /// Reply to a message: private messages get a DM; group messages get a
    /// group message that mentions the sender.
    pub async fn reply_to(
        &self,
        msg: &MessageEvent,
        content: impl Into<String>,
    ) -> Result<ApiResponse, EchoServerError> {
        let content = content.into();
        match msg {
            MessageEvent::Private { user_id, .. } => {
                self.send_private_text(*user_id, &content).await
            }
            MessageEvent::Group { group_id, user_id, .. } => {
                self.send_group_msg(
                    *group_id,
                    vec![Segment::at(user_id.to_string()), Segment::text(content)],
                )
                .await
            }
            MessageEvent::Unknown => Err(EchoServerError::Handshake("unknown message event")),
        }
    }
}

/// What a handler wants to happen after it processes an event.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HandleResult {
    /// This handler consumed the event; stop dispatching.
    Handled,
    /// Not for this handler; continue with the next one.
    Pass,
    /// Handled, but still let other handlers observe the event.
    HandledAndContinue,
}

/// A unit of bot logic. Handlers are dispatched events in priority order.
#[async_trait]
pub trait Handler: Send + Sync {
    /// Unique handler name, used in logs.
    fn name(&self) -> &str;

    /// Lower priority runs first. The default (100) is a sensible middle.
    fn priority(&self) -> i32 {
        100
    }

    /// Process one event.
    async fn handle(&self, ctx: &Context, event: &Event) -> HandleResult;
}

/// Priority-ordered collection of handlers.
pub struct HandlerRegistry {
    handlers: Vec<Arc<dyn Handler>>,
}

impl Default for HandlerRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl HandlerRegistry {
    pub fn new() -> Self {
        Self {
            handlers: Vec::new(),
        }
    }

    /// Register a handler, keeping the registry ordered by priority.
    pub fn register<H: Handler + 'static>(&mut self, handler: H) {
        self.handlers.push(Arc::new(handler));
        self.handlers.sort_by_key(|h| h.priority());
    }

    pub fn len(&self) -> usize {
        self.handlers.len()
    }

    pub fn is_empty(&self) -> bool {
        self.handlers.is_empty()
    }

    /// Registered handler names, in dispatch order.
    pub fn names(&self) -> Vec<&str> {
        self.handlers.iter().map(|h| h.name()).collect()
    }

    /// Dispatch an event to every handler until one returns [`HandleResult::Handled`].
    pub async fn dispatch(&self, ctx: &Context, event: &Event) {
        for handler in &self.handlers {
            let name = handler.name().to_string();
            // panic 隔离：单个 handler 崩溃不能拖垮整个分发任务
            let result = match std::panic::AssertUnwindSafe(handler.handle(ctx, event))
                .catch_unwind()
                .await
            {
                Ok(r) => r,
                Err(_) => {
                    tracing::error!(handler = %name, "handler panicked while processing event");
                    return;
                }
            };
            match result {
                HandleResult::Handled => {
                    tracing::debug!(handler = %name, "event handled");
                    break;
                }
                HandleResult::HandledAndContinue => {
                    tracing::debug!(handler = %name, "event handled (continued)");
                }
                HandleResult::Pass => {}
            }
        }
    }
}
