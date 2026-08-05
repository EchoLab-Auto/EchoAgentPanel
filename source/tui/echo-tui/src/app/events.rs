//! Backend event → UI state application.
//!
//! Split out of `mod.rs` so the large `match` over `BackendEvent` lives in
//! its own file.

use echo_agent::{BackendEvent, SessionInfo};

use crate::app::App;
use crate::state::{DisplayMessage, MsgRole, ToastKind};

impl App {
    pub(super) fn apply_backend_event(&mut self, ev: BackendEvent) {
        match ev {
            BackendEvent::AdapterStateChanged {
                adapter_name,
                connected,
                self_id,
            } => {
                let self_id_str = self_id.clone();
                self.state
                    .status
                    .set_adapter_state(crate::state::AdapterStatusEntry {
                        name: adapter_name.clone(),
                        display_name: adapter_name.clone(),
                        connected,
                        running: true,
                        self_id,
                        bind_address: String::new(),
                        started_at: None,
                    });
                if connected {
                    self.state.toast(
                        format!(
                            "{adapter_name} connected ({})",
                            self_id_str.as_deref().unwrap_or("?")
                        ),
                        ToastKind::Success,
                    );
                } else {
                    self.state
                        .toast(format!("{adapter_name} disconnected"), ToastKind::Error);
                }
            }
            BackendEvent::AdapterList { adapters } => {
                for a in adapters {
                    self.state
                        .status
                        .set_adapter_state(crate::state::AdapterStatusEntry {
                            name: a.name,
                            display_name: a.display_name,
                            connected: a.connected,
                            running: a.running,
                            self_id: a.self_id,
                            bind_address: a.bind_address,
                            started_at: a.started_at,
                        });
                }
            }
            BackendEvent::MessageReceived {
                session_id,
                content,
                timestamp,
                ..
            } => {
                self.push_to(session_id, MsgRole::User, content, timestamp);
            }
            BackendEvent::AgentThinking { session_id } => {
                self.state.llm_in_flight = true;
                self.push_to(session_id, MsgRole::System, "… 思考中".into(), 0);
            }
            BackendEvent::LlmRequest { model, .. } => {
                self.state.status.model = model;
            }
            BackendEvent::LlmResponse {
                model,
                prompt_tokens,
                completion_tokens,
                ..
            } => {
                self.state.status.model = model;
                self.state.llm_in_flight = false;
                let _ = (prompt_tokens, completion_tokens);
            }
            BackendEvent::ToolCall {
                session_id,
                tool_name,
                arguments,
                ..
            } => {
                self.state.tool_in_flight = Some((tool_name.clone(), std::time::Instant::now()));
                self.push_to(
                    session_id,
                    MsgRole::Tool,
                    format!("🔧 {tool_name}({arguments})"),
                    0,
                );
            }
            BackendEvent::ToolResult {
                session_id,
                tool_name,
                result,
                ..
            } => {
                self.state.tool_in_flight = None;
                let snippet: String = result.chars().take(80).collect();
                self.push_to(
                    session_id,
                    MsgRole::Tool,
                    format!("✓ {tool_name}: {snippet}"),
                    0,
                );
            }
            BackendEvent::MessageSent {
                session_id,
                content,
                ..
            } => {
                self.state.llm_in_flight = false;
                let ts = chrono::Utc::now().timestamp();
                self.push_to(session_id, MsgRole::Agent, content, ts);
            }
            BackendEvent::SessionUpdated { session } => {
                self.upsert_session(session);
            }
            BackendEvent::ApiConfigUpdated {
                provider,
                model,
                base_url,
                api_key_set,
                system_prompt,
                active_api,
                profiles,
            } => {
                self.state.status.provider = provider;
                self.state.status.model = model.clone();
                self.state.status.base_url = base_url;
                self.state.status.system_prompt = system_prompt;
                self.state.settings.profiles = profiles;
                self.state.settings.active_api = active_api.clone();
                self.state.settings.api_key_set = api_key_set;
                let _ = model;
            }
            BackendEvent::ApiProfilesUpdated {
                active_api,
                profiles,
            } => {
                self.state.settings.profiles = profiles;
                self.state.settings.active_api = active_api;
            }
            BackendEvent::GroupList { groups } => {
                self.state.qq_groups = groups
                    .into_iter()
                    .map(|g| (g.group_id, g.group_name))
                    .collect();
            }
            BackendEvent::QqGateMode { mode } => {
                self.state.qq_gate_mode = mode;
            }
            BackendEvent::QqFilterConfig {
                allowlist_users,
                allowlist_groups,
                denylist_users,
                denylist_groups,
            } => {
                self.state.qq_filter = crate::state::QqFilterCache {
                    allowlist_users,
                    allowlist_groups,
                    denylist_users,
                    denylist_groups,
                };
            }
            BackendEvent::Error {
                session_id,
                message,
            } => {
                self.state.llm_in_flight = false;
                let _ = session_id;
                self.state.toast(message, ToastKind::Error);
            }
        }
    }

    fn push_to(&mut self, session_id: String, role: MsgRole, content: String, time: i64) {
        self.state.push_message(
            &session_id,
            DisplayMessage {
                role,
                content: content.clone(),
                time,
            },
        );
        if let Some(s) = self.state.sessions.iter_mut().find(|s| s.id == session_id) {
            s.last_message = content;
            s.last_active = if time > 0 { time } else { s.last_active };
        }
    }

    fn upsert_session(&mut self, session: SessionInfo) {
        if let Some(s) = self.state.sessions.iter_mut().find(|s| s.id == session.id) {
            *s = session.clone();
        } else {
            self.state.sessions.push(session.clone());
        }
        if self.state.active_session_id.is_none() {
            self.state.active_session_id = Some(session.id);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::theme::Theme;

    fn app() -> App {
        let (bridge, _handle) = echo_agent::create_bridge();
        App::new(
            crate::backend::Backend::new(std::sync::Arc::new(bridge)),
            Theme::dark(),
            Keybindings::default(),
        )
    }

    fn qq_entry(app: &App) -> Option<&crate::state::AdapterStatusEntry> {
        app.state.status.adapters.iter().find(|a| a.name == "qq")
    }

    #[test]
    fn adapter_connect_sets_state_and_toasts() {
        let mut app = app();
        app.apply_backend_event(BackendEvent::AdapterStateChanged {
            adapter_name: "qq".into(),
            connected: true,
            self_id: Some("10001".into()),
        });
        let entry = qq_entry(&app);
        assert!(entry.is_some());
        assert!(entry.unwrap().connected);
    }

    #[test]
    fn adapter_disconnect_marks_disconnected() {
        let mut app = app();
        app.apply_backend_event(BackendEvent::AdapterStateChanged {
            adapter_name: "qq".into(),
            connected: true,
            self_id: Some("10001".into()),
        });
        app.apply_backend_event(BackendEvent::AdapterStateChanged {
            adapter_name: "qq".into(),
            connected: false,
            self_id: Some("10001".into()),
        });
        assert!(!qq_entry(&app).unwrap().connected);
    }

    #[test]
    fn message_received_goes_to_session() {
        let mut app = app();
        app.apply_backend_event(BackendEvent::SessionUpdated {
            session: echo_agent::SessionInfo {
                id: "s1".into(),
                platform: "qq".into(),
                nickname: "alice".into(),
                scope: "dm".into(),
                user_id: "123".into(),
                group_name: None,
                last_active: 0,
                last_message: String::new(),
            },
        });
        app.apply_backend_event(BackendEvent::MessageReceived {
            session_id: "s1".into(),
            adapter_name: "qq".into(),
            platform: "qq".into(),
            user_id: "123".into(),
            user_name: "alice".into(),
            channel: "dm".into(),
            group_name: None,
            content: "你好".into(),
            timestamp: 1700000000,
        });
        assert_eq!(app.state.active_messages().len(), 1);
        assert_eq!(app.state.active_messages()[0].content, "你好");
        assert_eq!(app.state.active_messages()[0].role, MsgRole::User);
    }

    #[test]
    fn message_sent_marks_agent_role() {
        let mut app = app();
        app.apply_backend_event(BackendEvent::SessionUpdated {
            session: echo_agent::SessionInfo {
                id: "s1".into(),
                platform: "qq".into(),
                nickname: "alice".into(),
                scope: "dm".into(),
                user_id: "123".into(),
                group_name: None,
                last_active: 0,
                last_message: String::new(),
            },
        });
        app.apply_backend_event(BackendEvent::MessageSent {
            session_id: "s1".into(),
            content: "回复".into(),
        });
        assert_eq!(app.state.active_messages().len(), 1);
        assert_eq!(app.state.active_messages()[0].role, MsgRole::Agent);
    }

    #[test]
    fn session_updated_inserts_and_updates() {
        let mut app = app();
        let info = echo_agent::SessionInfo {
            id: "s1".into(),
            platform: "qq".into(),
            nickname: "alice".into(),
            scope: "dm".into(),
            user_id: "123".into(),
            group_name: None,
            last_active: 100,
            last_message: "old".into(),
        };
        app.apply_backend_event(BackendEvent::SessionUpdated {
            session: info.clone(),
        });
        assert_eq!(app.state.sessions.len(), 1);
        assert_eq!(app.state.active_session_id.as_deref(), Some("s1"));

        // Update the same session.
        let mut updated = info;
        updated.last_message = "new".into();
        app.apply_backend_event(BackendEvent::SessionUpdated { session: updated });
        assert_eq!(app.state.sessions.len(), 1, "updated in place");
        assert_eq!(app.state.sessions[0].last_message, "new");
    }

    #[test]
    fn tool_call_and_result_update_flags() {
        let mut app = app();
        app.apply_backend_event(BackendEvent::SessionUpdated {
            session: echo_agent::SessionInfo {
                id: "s1".into(),
                platform: "qq".into(),
                nickname: "a".into(),
                scope: "dm".into(),
                user_id: "1".into(),
                group_name: None,
                last_active: 0,
                last_message: String::new(),
            },
        });
        app.apply_backend_event(BackendEvent::ToolCall {
            session_id: "s1".into(),
            tool_name: "calc".into(),
            arguments: "{}".into(),
        });
        assert!(app.state.tool_in_flight.is_some());
        app.apply_backend_event(BackendEvent::ToolResult {
            session_id: "s1".into(),
            tool_name: "calc".into(),
            result: "42".into(),
        });
        assert!(app.state.tool_in_flight.is_none());
    }

    #[test]
    fn error_event_toasts() {
        let mut app = app();
        app.apply_backend_event(BackendEvent::Error {
            session_id: None,
            message: "LLM 超时".into(),
        });
        assert!(!app.state.llm_in_flight);
    }
}
