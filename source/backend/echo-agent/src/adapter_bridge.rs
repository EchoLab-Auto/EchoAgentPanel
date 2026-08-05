//! Adapter → Agent bridge implementation.
//!
//! [`AdapterBridge`] implements [`echo_adapter::AgentBridge`] so platform
//! adapters can route inbound messages into the agent loop without depending
//! on this crate directly. The bridge owns session lookup, agent event
//! emission, and LLM processing.

use std::sync::Arc;

use async_trait::async_trait;
use echo_adapter::types::IncomingMessage;
use echo_adapter::AgentBridge as AgentBridgeTrait;

use crate::agent::Agent;
use crate::event::BackendEvent;
use crate::session::SessionKey;

/// Wraps an `Arc<Agent>` behind the adapter-facing bridge trait.
pub struct AdapterBridge {
    agent: Arc<Agent>,
}

impl AdapterBridge {
    pub fn new(agent: Arc<Agent>) -> Self {
        Self { agent }
    }
}

#[async_trait]
impl AgentBridgeTrait for AdapterBridge {
    async fn handle_incoming_message(
        &self,
        msg: IncomingMessage,
    ) -> Result<Option<String>, String> {
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

        match agent.process_message(&session, &msg.content).await {
            Ok(reply) => {
                if !reply.trim().is_empty() {
                    agent.emit(BackendEvent::MessageSent {
                        session_id,
                        content: reply.clone(),
                    });
                    Ok(Some(reply))
                } else {
                    // Empty reply — nothing to send back.
                    Ok(None)
                }
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
    async fn routes_message_and_returns_reply() {
        let bridge = AdapterBridge::new(mock_agent("你好！"));
        let reply = bridge.handle_incoming_message(dm_message("hello")).await;
        assert_eq!(reply, Ok(Some("你好！".into())));

        // The session was created with the QQ scoping.
        let sessions = bridge.agent.sessions.all();
        assert_eq!(sessions.len(), 1);
        let session = &sessions[0];
        assert_eq!(session.session_key.platform, "qq");
        assert_eq!(session.session_key.scope, "dm");
        assert_eq!(session.session_key.user_id, "123456");
    }

    #[tokio::test]
    async fn group_message_uses_group_scope() {
        let bridge = AdapterBridge::new(mock_agent("ok"));
        let mut msg = dm_message("hello");
        msg.channel = ChannelType::Group {
            group_id: "999".into(),
        };
        let _ = bridge.handle_incoming_message(msg).await;

        let sessions = bridge.agent.sessions.all();
        let session = &sessions[0];
        assert_eq!(session.session_key.scope, "group");
        assert_eq!(session.session_key.scope_id, "999");
    }

    #[tokio::test]
    async fn empty_reply_returns_none() {
        let bridge = AdapterBridge::new(mock_agent(""));
        let reply = bridge.handle_incoming_message(dm_message("hi")).await;
        assert_eq!(reply, Ok(None));
    }

    #[tokio::test]
    async fn connection_state_propagates() {
        let bridge = AdapterBridge::new(mock_agent("x"));
        // Must not panic with no handle attached.
        bridge.on_connection_state("qq", true, Some("10001".into()));
    }
}
