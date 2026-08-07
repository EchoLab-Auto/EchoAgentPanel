//! Backend event → UI state application.
//!
//! Split out of `mod.rs` so the large `match` over `BackendEvent` lives in
//! its own file.

use echo_agent::{BackendEvent, SessionInfo};

use crate::app::App;
use crate::state::{
    AgentPhase, DisplayMessage, InboundMessage, MessageMetadata, MsgRole, ToastKind, ToolMessage,
    ToolMessageStatus,
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
                platform,
                user_id,
                user_name,
                channel,
                group_name,
                content,
                timestamp,
                received_at_ms,
                message_sequence,
            } => {
                if adapter_name == "timer" {
                    self.push_to(
                        session_id,
                        MsgRole::System,
                        summarize_timer_event(&content),
                        timestamp,
                    );
                } else if adapter_name == "background" {
                    // This hook is internal context for the parent agent. Its structured
                    // branch outcomes belong in the task inspector, not the chat stream.
                    self.state.apply_background_hook(&content);
                } else {
                    self.push_display_to(
                        session_id,
                        DisplayMessage {
                            role: MsgRole::User,
                            content,
                            time: timestamp,
                            metadata: Some(MessageMetadata::Inbound(InboundMessage {
                                adapter_name,
                                platform,
                                user_id,
                                user_name,
                                channel,
                                group_name,
                                received_at_ms,
                                message_sequence,
                            })),
                        },
                    );
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
                self.state.start_subagent(&session_id, &task);
                self.state
                    .activity_mut(&session_id)
                    .transition(AgentPhase::Subagent, Some(truncate(&one_line(&task), 72)));
            }
            BackendEvent::SubagentCompleted {
                session_id,
                success,
            } => {
                self.state.complete_subagent(&session_id, success);
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
            BackendEvent::ReplyBranchStarted {
                session_id,
                branch_id,
                message_sequence,
                task,
                target,
                started_at_ms,
            } => {
                self.state.start_reply_branch(
                    &session_id,
                    &branch_id,
                    message_sequence,
                    &task,
                    &target,
                    started_at_ms,
                );
            }
            BackendEvent::ReplyBranchCompleted {
                session_id,
                branch_id,
                success,
                cancelled,
                completed_at_ms,
                ..
            } => {
                self.state
                    .complete_reply_branch(&branch_id, success, cancelled, completed_at_ms);
                if !self.state.has_running_reply_branches(&session_id) {
                    self.state
                        .activity_mut(&session_id)
                        .transition(AgentPhase::Completed, None);
                }
            }
            BackendEvent::BackgroundTaskStarted {
                session_id,
                task_id,
                sequence,
                branch_count,
                objective,
                created_at_ms,
            } => {
                self.state.start_background_task(
                    &session_id,
                    &task_id,
                    sequence,
                    branch_count,
                    &objective,
                    created_at_ms,
                );
                self.push_to(
                    session_id,
                    MsgRole::System,
                    format!(
                        "后台任务 #{sequence} 已挂起 · {branch_count} 个分支 · {} · {}",
                        short_id(&task_id),
                        truncate(&one_line(&objective), 96)
                    ),
                    created_at_ms / 1000,
                );
            }
            BackendEvent::BackgroundTaskCompleted {
                session_id,
                task_id,
                sequence,
                success,
                completed_at_ms,
            } => {
                self.state
                    .complete_background_task(&task_id, success, completed_at_ms);
                self.push_to(
                    session_id,
                    MsgRole::System,
                    format!(
                        "后台任务 #{sequence} 分支{} · {} · 等待按序整合",
                        if success { "已完成" } else { "存在失败" },
                        short_id(&task_id)
                    ),
                    completed_at_ms / 1000,
                );
            }
            BackendEvent::BackgroundTaskIntegrated {
                session_id,
                task_id,
                sequence,
                success,
                integrated_at_ms,
            } => {
                self.state
                    .integrate_background_task(&task_id, success, integrated_at_ms);
                self.push_to(
                    session_id,
                    MsgRole::System,
                    format!(
                        "后台任务 #{sequence} {} · {}",
                        if success {
                            "已按序整合"
                        } else {
                            "整合失败"
                        },
                        short_id(&task_id)
                    ),
                    integrated_at_ms / 1000,
                );
            }
            BackendEvent::ToolCall {
                session_id,
                tool_name,
                arguments,
                ..
            } => {
                self.state
                    .stage_orchestration_tool(&session_id, &tool_name, &arguments);
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
                if tool_name == "run_subagent" {
                    self.state.attach_subagent_result(&session_id, &result);
                } else if matches!(
                    tool_name.as_str(),
                    "spawn_background_task" | "spawn_parallel_task"
                ) && result.trim_start().starts_with("error:")
                {
                    self.state.discard_staged_background(&session_id);
                }
                let activity = self.state.activity_mut(&session_id);
                if tool_name != "run_subagent" {
                    activity.tools_completed += 1;
                }
                activity.transition(AgentPhase::Thinking, None);
            }
            BackendEvent::ChecklistUpdated { session_id, state } => {
                self.state.apply_checklist_state(&state);
                let _ = session_id;
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
                if !self.state.has_running_reply_branches(&session_id) {
                    self.state
                        .activity_mut(&session_id)
                        .transition(AgentPhase::Completed, None);
                }
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
        self.push_display_to(session_id, DisplayMessage::plain(role, content, time));
    }

    fn push_display_to(&mut self, session_id: String, message: DisplayMessage) {
        let content = message.content.clone();
        let time = message.time;
        self.state.push_message(&session_id, message);
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

fn short_id(value: &str) -> &str {
    value.get(..8).unwrap_or(value)
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
            received_at_ms: 1700000000123,
            message_sequence: 42,
        });
        assert_eq!(app.state.active_messages().len(), 1);
        assert_eq!(app.state.active_messages()[0].content, "你好");
        assert_eq!(app.state.active_messages()[0].role, MsgRole::User);
        let Some(MessageMetadata::Inbound(source)) = &app.state.active_messages()[0].metadata
        else {
            panic!("QQ message source metadata missing");
        };
        assert_eq!(source.platform, "qq");
        assert_eq!(source.user_name, "alice");
        assert_eq!(source.message_sequence, 42);
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
        assert_eq!(app.state.orchestration_tasks.len(), 1);
        assert_eq!(
            app.state.orchestration_tasks[0].status,
            crate::state::OrchestrationStatus::Running
        );

        app.apply_backend_event(BackendEvent::SubagentCompleted {
            session_id: "s1".into(),
            success: true,
        });
        assert_eq!(app.state.agent_activities["s1"].subagents_completed, 1);
        assert_eq!(
            app.state.orchestration_tasks[0].status,
            crate::state::OrchestrationStatus::Completed
        );
    }

    #[test]
    fn temporary_reply_branch_is_visible_and_can_be_cancelled() {
        let mut app = app();
        app.apply_backend_event(BackendEvent::ReplyBranchStarted {
            session_id: "s1".into(),
            branch_id: "reply-1".into(),
            message_sequence: 7,
            task: "第二句话".into(),
            target: "QQ 私聊 100".into(),
            started_at_ms: 1_700_000_000_000,
        });
        let task = &app.state.orchestration_tasks[0];
        assert_eq!(task.kind, crate::state::OrchestrationKind::ReplyBranch);
        assert_eq!(task.status, crate::state::OrchestrationStatus::Running);
        assert_eq!(task.branches[0].target, "QQ 私聊 100");

        app.apply_backend_event(BackendEvent::ReplyBranchCompleted {
            session_id: "s1".into(),
            branch_id: "reply-1".into(),
            message_sequence: 7,
            success: false,
            cancelled: true,
            completed_at_ms: 1_700_000_001_000,
        });
        assert_eq!(
            app.state.orchestration_tasks[0].status,
            crate::state::OrchestrationStatus::Cancelled
        );
    }

    #[test]
    fn session_stays_busy_until_its_last_reply_branch_finishes() {
        let mut app = app();
        for (branch_id, sequence) in [("reply-1", 1), ("reply-2", 2)] {
            app.apply_backend_event(BackendEvent::ReplyBranchStarted {
                session_id: "s1".into(),
                branch_id: branch_id.into(),
                message_sequence: sequence,
                task: format!("task-{sequence}"),
                target: "源会话".into(),
                started_at_ms: 1_700_000_000_000,
            });
        }
        app.apply_backend_event(BackendEvent::AgentThinking {
            session_id: "s1".into(),
        });
        app.apply_backend_event(BackendEvent::AgentCompleted {
            session_id: "s1".into(),
        });
        assert!(app.state.agent_activities["s1"].phase.is_busy());

        app.apply_backend_event(BackendEvent::ReplyBranchCompleted {
            session_id: "s1".into(),
            branch_id: "reply-1".into(),
            message_sequence: 1,
            success: true,
            cancelled: false,
            completed_at_ms: 1_700_000_001_000,
        });
        assert!(app.state.agent_activities["s1"].phase.is_busy());

        app.apply_backend_event(BackendEvent::ReplyBranchCompleted {
            session_id: "s1".into(),
            branch_id: "reply-2".into(),
            message_sequence: 2,
            success: true,
            cancelled: false,
            completed_at_ms: 1_700_000_002_000,
        });
        assert_eq!(
            app.state.agent_activities["s1"].phase,
            AgentPhase::Completed
        );
    }

    #[test]
    fn detached_background_task_does_not_keep_the_conversation_busy() {
        let mut app = app();
        app.state.active_session_id = Some("s1".into());
        app.apply_backend_event(BackendEvent::BackgroundTaskStarted {
            session_id: "s1".into(),
            task_id: "12345678-abcd".into(),
            sequence: 3,
            branch_count: 2,
            objective: "prepare replies".into(),
            created_at_ms: 1_700_000_000_123,
        });
        assert!(!app.state.agent_activities.contains_key("s1"));
        assert!(app.state.active_messages()[0]
            .content
            .contains("后台任务 #3 已挂起"));
        assert_eq!(app.state.orchestration_tasks.len(), 1);
        assert_eq!(app.state.orchestration_tasks[0].branches.len(), 2);
    }

    #[test]
    fn background_hook_updates_branches_without_leaking_raw_hook_to_chat() {
        let mut app = app();
        app.state.active_session_id = Some("s1".into());
        app.apply_backend_event(BackendEvent::ToolCall {
            session_id: "s1".into(),
            tool_name: "spawn_parallel_task".into(),
            arguments: r#"{"objective":"reply","branches":[{"branch_id":"dm","task":"reply dm","target":{"kind":"qq_private","id":"100"}}]}"#.into(),
        });
        app.apply_backend_event(BackendEvent::BackgroundTaskStarted {
            session_id: "s1".into(),
            task_id: "task-1".into(),
            sequence: 1,
            branch_count: 1,
            objective: "reply".into(),
            created_at_ms: 1_700_000_000_000,
        });
        app.apply_backend_event(BackendEvent::BackgroundTaskCompleted {
            session_id: "s1".into(),
            task_id: "task-1".into(),
            sequence: 1,
            success: true,
            completed_at_ms: 1_700_000_002_000,
        });
        let chat_len = app.state.active_messages().len();
        app.apply_backend_event(BackendEvent::MessageReceived {
            session_id: "s1".into(),
            adapter_name: "background".into(),
            platform: "qq".into(),
            user_id: "1".into(),
            user_name: "background task".into(),
            channel: "direct".into(),
            group_name: None,
            content: r#"<background_task_event>{"task_id":"task-1","objective":"reply","completed_at":"2023-11-14T22:13:22.000Z","cancelled":false,"deliveries":[{"branch_id":"dm","target":{"kind":"qq_private","user_id":"100"},"success":true,"result":"sent","started_at":"2023-11-14T22:13:20.000Z","completed_at":"2023-11-14T22:13:22.000Z"}]}</background_task_event>"#.into(),
            timestamp: 1_700_000_002,
            received_at_ms: 1_700_000_002_100,
            message_sequence: 9,
        });
        assert_eq!(app.state.active_messages().len(), chat_len);
        let branch = &app.state.orchestration_tasks[0].branches[0];
        assert_eq!(branch.target, "QQ 私聊 100");
        assert_eq!(branch.result.as_deref(), Some("sent"));
        assert_eq!(branch.status, crate::state::BranchStatus::Succeeded);
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
