//! Backend event → UI state application.
//!
//! Split out of `mod.rs` so the large `match` over `BackendEvent` lives in
//! its own file.

use echo_agent::{BackendEvent, SessionInfo};

use crate::app::App;
use crate::state::{
    AgentPhase, DisplayMessage, MessageMetadata, MsgRole, ToastKind, ToolMessage, ToolMessageStatus,
};

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
                adapter_name,
                content,
                timestamp,
                ..
            } => {
                if adapter_name == "timer" {
                    self.push_to(
                        session_id,
                        MsgRole::System,
                        summarize_timer_event(&content),
                        timestamp,
                    );
                } else {
                    self.push_to(session_id, MsgRole::User, content, timestamp);
                }
            }
            BackendEvent::AgentThinking { session_id } => {
                self.state.start_agent_activity(&session_id);
            }
            BackendEvent::LlmRequest { session_id, model } => {
                self.state.status.model = model;
                self.state
                    .activity_mut(&session_id)
                    .transition(AgentPhase::Thinking, None);
            }
            BackendEvent::LlmResponse {
                session_id,
                model,
                prompt_tokens,
                completion_tokens,
            } => {
                self.state.status.model = model;
                let activity = self.state.activity_mut(&session_id);
                activity.prompt_tokens = activity.prompt_tokens.saturating_add(prompt_tokens);
                activity.completion_tokens =
                    activity.completion_tokens.saturating_add(completion_tokens);
            }
            BackendEvent::SubagentStarted { session_id, task } => {
                self.state
                    .activity_mut(&session_id)
                    .transition(AgentPhase::Subagent, Some(truncate(&one_line(&task), 72)));
            }
            BackendEvent::SubagentCompleted {
                session_id,
                success,
            } => {
                let activity = self.state.activity_mut(&session_id);
                if success {
                    activity.subagents_completed += 1;
                }
                activity.transition(
                    AgentPhase::Thinking,
                    Some(if success {
                        "正在整合 subagent 结果".into()
                    } else {
                        "subagent 失败，正在恢复".into()
                    }),
                );
            }
            BackendEvent::ToolCall {
                session_id,
                tool_name,
                arguments,
                ..
            } => {
                let phase = if tool_name == "run_subagent" {
                    AgentPhase::Subagent
                } else {
                    AgentPhase::Tool
                };
                let detail = summarize_arguments(&arguments);
                self.state
                    .activity_mut(&session_id)
                    .transition(phase, Some(tool_name.clone()));
                self.state.push_message(
                    &session_id,
                    DisplayMessage {
                        role: MsgRole::Tool,
                        content: tool_name.clone(),
                        time: chrono::Utc::now().timestamp(),
                        metadata: Some(MessageMetadata::Tool(ToolMessage {
                            name: tool_name,
                            input: detail,
                            output: None,
                            status: ToolMessageStatus::Running,
                            started_at: std::time::Instant::now(),
                            elapsed: None,
                        })),
                    },
                );
                if let Some(session) = self
                    .state
                    .sessions
                    .iter_mut()
                    .find(|session| session.id == session_id)
                {
                    session.last_message = "[工具执行中]".into();
                }
            }
            BackendEvent::ToolResult {
                session_id,
                tool_name,
                result,
                ..
            } => {
                self.finish_tool_message(&session_id, &tool_name, &result);
                let activity = self.state.activity_mut(&session_id);
                if tool_name != "run_subagent" {
                    activity.tools_completed += 1;
                }
                activity.transition(AgentPhase::Thinking, None);
            }
            BackendEvent::AgentOutput {
                session_id,
                content,
                ..
            } => {
                if self
                    .state
                    .agent_activities
                    .get(&session_id)
                    .is_some_and(|activity| activity.phase.is_busy())
                {
                    self.state
                        .activity_mut(&session_id)
                        .transition(AgentPhase::Completed, None);
                }
                let ts = chrono::Utc::now().timestamp();
                self.push_to(session_id, MsgRole::Backend, content, ts);
            }
            BackendEvent::AgentCompleted { session_id } => {
                self.state
                    .activity_mut(&session_id)
                    .transition(AgentPhase::Completed, None);
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
                self.state.qq_groups_loaded = true;
                self.state.qq_groups = groups
                    .into_iter()
                    .map(|g| (g.group_id, g.group_name))
                    .collect();
                // If the QQ filter form is open, auto-refresh it so the
                // group list appears without the user having to close and
                // reopen the form.
                self.try_refresh_qq_filter_form();
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
                self.try_refresh_qq_filter_form();
            }
            BackendEvent::FriendList { friends } => {
                self.state.qq_friends = friends
                    .into_iter()
                    .map(|f| (f.user_id, f.nickname))
                    .collect();
                self.state.qq_friends_loaded = true;
                self.try_refresh_qq_filter_form();
            }
            BackendEvent::Error {
                session_id,
                message,
            } => {
                if let Some(session_id) = session_id {
                    if self
                        .state
                        .agent_activities
                        .get(&session_id)
                        .is_some_and(|activity| activity.phase.is_busy())
                    {
                        self.state.activity_mut(&session_id).transition(
                            AgentPhase::Failed,
                            Some(truncate(&one_line(&message), 72)),
                        );
                    }
                }
                self.state.toast(message, ToastKind::Error);
            }
        }
    }

    fn push_to(&mut self, session_id: String, role: MsgRole, content: String, time: i64) {
        self.state.push_message(
            &session_id,
            DisplayMessage::plain(role, content.clone(), time),
        );
        if let Some(s) = self.state.sessions.iter_mut().find(|s| s.id == session_id) {
            s.last_message = content;
            s.last_active = if time > 0 { time } else { s.last_active };
        }
    }

    fn finish_tool_message(&mut self, session_id: &str, tool_name: &str, result: &str) {
        let failed = result.trim_start().starts_with("error:");
        let messages = self
            .state
            .messages
            .entry(session_id.to_string())
            .or_default();
        if let Some(tool) = messages.iter_mut().rev().find_map(|message| {
            let Some(MessageMetadata::Tool(tool)) = message.metadata.as_mut() else {
                return None;
            };
            (tool.name == tool_name && tool.status == ToolMessageStatus::Running).then_some(tool)
        }) {
            tool.status = if failed {
                ToolMessageStatus::Failed
            } else {
                ToolMessageStatus::Succeeded
            };
            tool.output = Some(summarize_result(result));
            tool.elapsed = Some(tool.started_at.elapsed());
        } else {
            messages.push(DisplayMessage {
                role: MsgRole::Tool,
                content: tool_name.to_string(),
                time: chrono::Utc::now().timestamp(),
                metadata: Some(MessageMetadata::Tool(ToolMessage {
                    name: tool_name.to_string(),
                    input: String::new(),
                    output: Some(summarize_result(result)),
                    status: if failed {
                        ToolMessageStatus::Failed
                    } else {
                        ToolMessageStatus::Succeeded
                    },
                    started_at: std::time::Instant::now(),
                    elapsed: Some(std::time::Duration::ZERO),
                })),
            });
        }
        self.state.chat_scroll = 0;
        self.state.chat_flash_until =
            Some(std::time::Instant::now() + std::time::Duration::from_millis(700));
        if let Some(session) = self
            .state
            .sessions
            .iter_mut()
            .find(|session| session.id == session_id)
        {
            session.last_message =
                format!("[工具{}] {tool_name}", if failed { "失败" } else { "完成" });
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

fn summarize_timer_event(content: &str) -> String {
    let json = content
        .strip_prefix("<timer_event>")
        .and_then(|value| value.strip_suffix("</timer_event>"));
    let task = json
        .and_then(|value| serde_json::from_str::<serde_json::Value>(value).ok())
        .and_then(|value| value["task"].as_str().map(str::to_string));
    match task {
        Some(task) => format!("定时任务触发 · {}", truncate(&one_line(&task), 120)),
        None => "定时任务触发".into(),
    }
}

fn summarize_arguments(arguments: &str) -> String {
    match serde_json::from_str::<serde_json::Value>(arguments) {
        Ok(value) => summarize_value(&value, None),
        Err(_) => truncate(&one_line(arguments), 120),
    }
}

fn summarize_result(result: &str) -> String {
    match serde_json::from_str::<serde_json::Value>(result) {
        Ok(value) => truncate(&summarize_value(&value, None), 140),
        Err(_) => truncate(&one_line(result), 140),
    }
}

fn summarize_value(value: &serde_json::Value, key: Option<&str>) -> String {
    if key.is_some_and(is_sensitive_key) {
        return "[已隐藏]".into();
    }
    match value {
        serde_json::Value::Null => "null".into(),
        serde_json::Value::Bool(value) => value.to_string(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::String(value) => truncate(&one_line(value), 64),
        serde_json::Value::Array(values) => {
            let items = values
                .iter()
                .take(3)
                .map(|value| summarize_value(value, None))
                .collect::<Vec<_>>()
                .join(", ");
            if values.len() > 3 {
                format!("[{items}, …]")
            } else {
                format!("[{items}]")
            }
        }
        serde_json::Value::Object(values) => values
            .iter()
            .take(4)
            .map(|(key, value)| format!("{key}={}", summarize_value(value, Some(key))))
            .collect::<Vec<_>>()
            .join(" · "),
    }
}

fn is_sensitive_key(key: &str) -> bool {
    let key = key.to_ascii_lowercase();
    ["token", "secret", "password", "api_key", "access_key"]
        .iter()
        .any(|needle| key.contains(needle))
}

fn one_line(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn truncate(value: &str, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        value.to_string()
    } else {
        value.chars().take(max_chars).collect::<String>() + "…"
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
    fn filter_config_event_refreshes_open_allowlist() {
        let mut app = app();
        app.state.form_overlay.activate(
            "QQ 白名单管理",
            vec![],
            crate::components::form_overlay::FormKind::QqFilter,
        );

        app.apply_backend_event(BackendEvent::QqFilterConfig {
            allowlist_users: vec![123456],
            allowlist_groups: vec![],
            denylist_users: vec![],
            denylist_groups: vec![],
        });

        assert!(app
            .state
            .form_overlay
            .select_items
            .iter()
            .any(|item| item.value == "allowlist_remove_user:123456"));
    }

    #[test]
    fn filter_config_event_does_not_replace_qq_settings_menu() {
        let mut app = app();
        app.state.form_overlay.activate(
            "QQ 设置",
            vec![crate::components::form_overlay::SelectItem {
                label: "管理白名单".into(),
                value: "qq_allowlist".into(),
            }],
            crate::components::form_overlay::FormKind::QqFilter,
        );

        app.apply_backend_event(BackendEvent::QqFilterConfig {
            allowlist_users: vec![123456],
            allowlist_groups: vec![],
            denylist_users: vec![],
            denylist_groups: vec![],
        });

        assert_eq!(app.state.form_overlay.title, "QQ 设置");
        assert_eq!(app.state.form_overlay.select_items[0].value, "qq_allowlist");
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
    fn agent_output_marks_backend_role() {
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
        app.apply_backend_event(BackendEvent::AgentOutput {
            session_id: "s1".into(),
            content: "回复".into(),
        });
        assert_eq!(app.state.active_messages().len(), 1);
        assert_eq!(app.state.active_messages()[0].role, MsgRole::Backend);
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
    fn tool_call_and_result_update_one_timeline_entry() {
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
        assert_eq!(app.state.agent_activities["s1"].phase, AgentPhase::Tool);
        assert_eq!(app.state.active_messages().len(), 1);
        let Some(MessageMetadata::Tool(tool)) = &app.state.active_messages()[0].metadata else {
            panic!("tool metadata missing");
        };
        assert_eq!(tool.status, ToolMessageStatus::Running);
        app.apply_backend_event(BackendEvent::ToolResult {
            session_id: "s1".into(),
            tool_name: "calc".into(),
            result: "42".into(),
        });
        assert_eq!(app.state.active_messages().len(), 1);
        let Some(MessageMetadata::Tool(tool)) = &app.state.active_messages()[0].metadata else {
            panic!("tool metadata missing");
        };
        assert_eq!(tool.status, ToolMessageStatus::Succeeded);
        assert_eq!(tool.output.as_deref(), Some("42"));
        assert_eq!(app.state.agent_activities["s1"].tools_completed, 1);
    }

    #[test]
    fn targeted_error_marks_the_session_failed() {
        let mut app = app();
        app.state.start_agent_activity("s1");
        app.apply_backend_event(BackendEvent::Error {
            session_id: Some("s1".into()),
            message: "LLM 超时".into(),
        });
        assert_eq!(app.state.agent_activities["s1"].phase, AgentPhase::Failed);
    }

    #[test]
    fn subagent_events_have_a_distinct_phase() {
        let mut app = app();
        app.state.active_session_id = Some("s1".into());
        app.apply_backend_event(BackendEvent::SubagentStarted {
            session_id: "s1".into(),
            task: "比较两个实现方案".into(),
        });
        let activity = &app.state.agent_activities["s1"];
        assert_eq!(activity.phase, AgentPhase::Subagent);
        assert_eq!(activity.detail.as_deref(), Some("比较两个实现方案"));

        app.apply_backend_event(BackendEvent::SubagentCompleted {
            session_id: "s1".into(),
            success: true,
        });
        assert_eq!(app.state.agent_activities["s1"].subagents_completed, 1);
    }

    #[test]
    fn llm_response_keeps_turn_running_until_agent_completed() {
        let mut app = app();
        app.apply_backend_event(BackendEvent::AgentThinking {
            session_id: "s1".into(),
        });
        app.apply_backend_event(BackendEvent::LlmRequest {
            session_id: "s1".into(),
            model: "model".into(),
        });
        app.apply_backend_event(BackendEvent::LlmResponse {
            session_id: "s1".into(),
            model: "model".into(),
            prompt_tokens: 10,
            completion_tokens: 4,
        });
        let activity = &app.state.agent_activities["s1"];
        assert_eq!(activity.phase, AgentPhase::Thinking);
        assert_eq!(activity.prompt_tokens + activity.completion_tokens, 14);

        app.apply_backend_event(BackendEvent::AgentCompleted {
            session_id: "s1".into(),
        });
        assert_eq!(
            app.state.agent_activities["s1"].phase,
            AgentPhase::Completed
        );
    }

    #[test]
    fn tool_argument_summary_redacts_secrets() {
        let summary =
            summarize_arguments(r#"{"api_key":"secret-value","query":"a very useful query"}"#);
        assert!(!summary.contains("secret-value"));
        assert!(summary.contains("[已隐藏]"));
        assert!(summary.contains("query="));
    }

    #[test]
    fn timer_event_is_presented_as_a_backend_task() {
        let content = r#"<timer_event>{"task":"发送提醒"}</timer_event>"#;
        assert_eq!(summarize_timer_event(content), "定时任务触发 · 发送提醒");
    }
}
