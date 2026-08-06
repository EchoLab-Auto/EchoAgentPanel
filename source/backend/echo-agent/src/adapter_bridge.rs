//! Platform adapter → Agent inbound message hook.
//!
//! [`AgentMessageHook`] implements [`echo_adapter::InboundMessageHook`] so
//! adapters can deliver structured events without receiving an implicit reply.
//! Platform output remains available only through explicit tools.

use std::sync::Arc;

use async_trait::async_trait;
use echo_adapter::types::{ChannelType, IncomingMessage};
use echo_adapter::InboundMessageHook;

use crate::agent::Agent;
use crate::event::BackendEvent;
use crate::session::SessionKey;

/// Wraps an `Arc<Agent>` behind the adapter-facing inbound hook.
pub struct AgentMessageHook {
    agent: Arc<Agent>,
}

impl AgentMessageHook {
    pub fn new(agent: Arc<Agent>) -> Self {
        Self { agent }
    }
}

#[async_trait]
impl InboundMessageHook for AgentMessageHook {
    async fn on_incoming_message(&self, msg: IncomingMessage) -> Result<(), String> {
        let agent = &self.agent;
        let key = SessionKey {
            platform: msg.platform.clone(),
            scope: if msg.channel.is_group() {
                "group".into()
            } else {
                "dm".into()
            },
            scope_id: msg.channel.group_id().unwrap_or("").to_string(),
            user_id: msg.user_id.clone(),
        };
        let session =
            agent
                .sessions
                .get_or_create(&key, msg.user_name.clone(), msg.group_name.clone());
        let session_id = session.id.clone();

        agent.emit(BackendEvent::SessionUpdated {
            session: session.info(String::new()),
        });
        agent.emit(BackendEvent::MessageReceived {
            session_id: session_id.clone(),
            adapter_name: msg.adapter_name.clone(),
            platform: msg.platform.clone(),
            user_id: msg.user_id.clone(),
            user_name: msg.user_name.clone(),
            channel: format!("{}", msg.channel),
            group_name: msg.group_name.clone(),
            content: msg.content.clone(),
            timestamp: msg.timestamp,
        });

        let hook_input = format_hook_input(&msg);
        match agent.process_message(&session, &hook_input).await {
            Ok(output) => {
                if !output.trim().is_empty() {
                    agent.emit(BackendEvent::AgentOutput {
                        session_id,
                        content: output,
                    });
                }
                Ok(())
            }
            Err(e) => {
                tracing::warn!(error = %e, "agent processing failed");
                agent.emit(BackendEvent::Error {
                    session_id: Some(session_id),
                    message: e.to_string(),
                });
                Err(e.to_string())
            }
        }
    }

    fn on_connection_state(&self, adapter_name: &str, connected: bool, self_id: Option<String>) {
        self.agent.emit(BackendEvent::AdapterStateChanged {
            adapter_name: adapter_name.into(),
            connected,
            self_id,
        });
    }
}

/// Encode an adapter event as a clearly marked, structured hook input.
/// Message content stays inside JSON so it cannot be confused with source
/// metadata such as sender or group identifiers.
fn format_hook_input(msg: &IncomingMessage) -> String {
    let channel = match &msg.channel {
        ChannelType::Direct => serde_json::json!({
            "type": "private"
        }),
        ChannelType::Group { group_id } => serde_json::json!({
            "type": "group",
            "group_id": group_id,
            "group_name": msg.group_name
        }),
    };
    let payload = serde_json::json!({
        "event": format!("{}_message", msg.platform),
        "adapter": msg.adapter_name,
        "platform": msg.platform,
        "channel": channel,
        "sender": {
            "user_id": msg.user_id,
            "name": msg.user_name
        },
        "at_me": msg.at_me,
        "timestamp": msg.timestamp,
        "content": msg.content,
        "metadata": msg.metadata
    });
    let json = serde_json::to_string_pretty(&payload).unwrap_or_else(|_| payload.to_string());
    format!(
        "<{}_message_hook>\n{json}\n</{}_message_hook>",
        msg.platform, msg.platform
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::tests::MockProvider;
    use echo_adapter::types::{ChannelType, IncomingMessage};
    use std::sync::atomic::AtomicUsize;

    fn mock_agent(reply: &str) -> Arc<Agent> {
        let provider = Arc::new(MockProvider {
            calls: Arc::new(AtomicUsize::new(0)),
            reply: reply.to_string(),
        });
        Arc::new(Agent::new(
            provider,
            crate::config::AgentConfig::default(),
            crate::skill::SkillRegistry::new(),
            crate::tool::ToolRegistry::new(),
            Arc::new(echo_adapter::registry::AdapterRegistry::new()),
        ))
    }

    fn dm_message(content: &str) -> IncomingMessage {
        IncomingMessage {
            adapter_name: "qq".into(),
            platform: "qq".into(),
            user_id: "123456".into(),
            user_name: "tester".into(),
            channel: ChannelType::Direct,
            group_name: None,
            content: content.into(),
            timestamp: 1700000000,
            at_me: false,
            metadata: serde_json::Value::Null,
        }
    }

    #[tokio::test]
    async fn routes_message_through_one_way_hook() {
        let hook = AgentMessageHook::new(mock_agent("后台完成"));
        let result = hook.on_incoming_message(dm_message("hello")).await;
        assert_eq!(result, Ok(()));

        // The session was created with the QQ scoping.
        let sessions = hook.agent.sessions.all();
        assert_eq!(sessions.len(), 1);
        let session = &sessions[0];
        assert_eq!(session.session_key.platform, "qq");
        assert_eq!(session.session_key.scope, "dm");
        assert_eq!(session.session_key.user_id, "123456");
        let history = session.history.lock().await;
        assert!(history[0].content.starts_with("<qq_message_hook>"));
        assert!(history[0].content.contains("\"event\": \"qq_message\""));
        assert!(history[0].content.contains("\"user_id\": \"123456\""));
        assert!(history[0].content.contains("\"content\": \"hello\""));
        assert_eq!(history[1].content, "后台完成");
    }

    #[tokio::test]
    async fn group_message_uses_group_scope() {
        let hook = AgentMessageHook::new(mock_agent("ok"));
        let mut msg = dm_message("hello");
        msg.channel = ChannelType::Group {
            group_id: "999".into(),
        };
        let _ = hook.on_incoming_message(msg).await;

        let sessions = hook.agent.sessions.all();
        let session = &sessions[0];
        assert_eq!(session.session_key.scope, "group");
        assert_eq!(session.session_key.scope_id, "999");
        let history = session.history.lock().await;
        assert!(history[0].content.contains("\"type\": \"group\""));
        assert!(history[0].content.contains("\"group_id\": \"999\""));
    }

    #[tokio::test]
    async fn connection_state_propagates() {
        let hook = AgentMessageHook::new(mock_agent("x"));
        // Must not panic with no handle attached.
        hook.on_connection_state("qq", true, Some("10001".into()));
    }
}
