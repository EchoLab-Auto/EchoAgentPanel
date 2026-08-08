//! /api — interactive API configuration with select list + form fields in chat.

use crate::backend::Backend;
use crate::components::form_overlay::{FormKind, SelectItem};
use crate::state::{AppState, ConversationMode, ToastKind};
use echo_agent::BackendCommand;

/// /api — enter interactive API config mode.
pub fn config(state: &mut AppState, backend: &Backend) {
    backend.send(BackendCommand::RequestState);
    state.mode = ConversationMode::ApiConfig;
    state.menu_msg_idx = -1;
    state.form_overlay.deactivate(); // force fresh start
    populate_form(state);
    state.refresh_menu_msg();
}

/// Build the ChatForm from current API state.
pub fn populate_form(state: &mut AppState) {
    let s = &state.settings;
    let st = &state.status;

    let mut items: Vec<SelectItem> = Vec::new();
    for (i, p) in s.profiles.iter().enumerate() {
        let mark = if p.name == s.active_api { "●" } else { "○" };
        items.push(SelectItem {
            label: format!(
                "{} {}. {}  ({}/{})",
                mark,
                i + 1,
                p.name,
                p.provider,
                p.model
            ),
            value: (i + 1).to_string(),
        });
    }

    let active = if s.active_api.is_empty() {
        "默认".to_string()
    } else {
        s.active_api.clone()
    };
    let title = format!(
        "API 配置 [当前: {} / {} / {}]",
        st.provider, st.model, active
    );
    state
        .form_overlay
        .activate(&title, items, FormKind::ApiConfig);
    state.form_overlay.select_idx = s
        .profiles
        .iter()
        .position(|p| p.name == s.active_api)
        .unwrap_or(0);
}

/// Handle text input in API config mode.
pub fn handle_message(state: &mut AppState, backend: &Backend, msg: &str) -> bool {
    let parts: Vec<&str> = msg.split_whitespace().collect();

    match parts.first().copied() {
        Some("q") | Some("/q") | Some("quit") => {
            state.mode = ConversationMode::Normal;
            state.form_overlay.deactivate();
            state.menu_msg_idx = -1;
            state.toast("已退出 API 配置", ToastKind::Info);
            return true;
        }
        Some(n) if n.parse::<usize>().is_ok() => {
            let idx: usize = n.parse().unwrap();
            let profiles = &state.settings.profiles;
            if idx >= 1 && idx <= profiles.len() {
                backend.send(BackendCommand::SwitchApi {
                    name: profiles[idx - 1].name.clone(),
                });
            } else if idx == 0 {
                backend.send(BackendCommand::SwitchApi {
                    name: String::new(),
                });
            } else {
                state.toast(
                    format!("无效序号 (共 {} 个)", profiles.len()),
                    ToastKind::Error,
                );
            }
            return true;
        }
        _ => {}
    }

    match parts.as_slice() {
        ["switch", name] | ["s", name] => {
            backend.send(BackendCommand::SwitchApi {
                name: name.to_string(),
            });
            true
        }
        ["delete", name] | ["d", name] => {
            backend.send(BackendCommand::DeleteApi {
                name: name.to_string(),
            });
            true
        }
        ["new", name, prov, model] | ["n", name, prov, model] => {
            backend.send(BackendCommand::UpdateApiConfig {
                name: name.to_string(),
                provider: prov.to_string(),
                model: model.to_string(),
                base_url: String::new(),
                api_key: String::new(),
                thinking: None,
                reasoning_effort: None,
            });
            true
        }
        ["new", ..] | ["n", ..] => {
            state.toast("用法: new <name> <provider> <model>", ToastKind::Error);
            true
        }
        ["provider", val] | ["p", val] => {
            backend.send(BackendCommand::UpdateApiConfig {
                name: String::new(),
                provider: val.to_string(),
                model: String::new(),
                base_url: String::new(),
                api_key: String::new(),
                thinking: None,
                reasoning_effort: None,
            });
            true
        }
        ["model", val] | ["m", val] => {
            backend.send(BackendCommand::UpdateApiConfig {
                name: String::new(),
                provider: String::new(),
                model: val.to_string(),
                base_url: String::new(),
                api_key: String::new(),
                thinking: None,
                reasoning_effort: None,
            });
            true
        }
        ["url", val] | ["u", val] => {
            backend.send(BackendCommand::UpdateApiConfig {
                name: String::new(),
                provider: String::new(),
                model: String::new(),
                base_url: val.to_string(),
                api_key: String::new(),
                thinking: None,
                reasoning_effort: None,
            });
            true
        }
        ["key", val] | ["k", val] => {
            backend.send(BackendCommand::UpdateApiConfig {
                name: String::new(),
                provider: String::new(),
                model: String::new(),
                base_url: String::new(),
                api_key: val.to_string(),
                thinking: None,
                reasoning_effort: None,
            });
            true
        }
        ["thinking", val] => {
            let thinking = match *val {
                "enabled" | "on" => Some(echo_agent::ThinkingMode::Enabled),
                "disabled" | "off" => Some(echo_agent::ThinkingMode::Disabled),
                _ => None,
            };
            if let Some(thinking) = thinking {
                backend.send(BackendCommand::UpdateApiConfig {
                    name: state.settings.active_api.clone(),
                    provider: String::new(),
                    model: String::new(),
                    base_url: String::new(),
                    api_key: String::new(),
                    thinking: Some(thinking),
                    reasoning_effort: None,
                });
            } else {
                state.toast("用法: thinking <enabled|disabled>", ToastKind::Error);
            }
            true
        }
        ["effort", val] => {
            let effort = match *val {
                "low" => Some(echo_agent::ReasoningEffort::Low),
                "high" => Some(echo_agent::ReasoningEffort::High),
                "max" => Some(echo_agent::ReasoningEffort::Max),
                _ => None,
            };
            if let Some(effort) = effort {
                backend.send(BackendCommand::UpdateApiConfig {
                    name: state.settings.active_api.clone(),
                    provider: String::new(),
                    model: String::new(),
                    base_url: String::new(),
                    api_key: String::new(),
                    thinking: None,
                    reasoning_effort: Some(effort),
                });
            } else {
                state.toast("用法: effort <low|high|max>", ToastKind::Error);
            }
            true
        }
        ["prompt", ..] | ["s", ..] => {
            let prompt = msg
                .trim()
                .split_once(' ')
                .map(|x| x.1)
                .unwrap_or("")
                .trim()
                .to_string();
            if prompt.is_empty() {
                state.toast("用法: prompt <文本>", ToastKind::Error);
            } else {
                backend.send(BackendCommand::SetSystemPrompt { prompt });
            }
            true
        }
        ["h"] | ["help"] | ["?"] => {
            state.toast("↑↓选择 ←→切换区域 Enter确认 Esc退出\n数字切换profile 文本命令: switch/del/new/key/url/thinking/effort/prompt q退出", ToastKind::Info);
            true
        }
        [""] => {
            populate_form(state);
            state.refresh_menu_msg();
            true
        }
        _ => {
            state.toast(format!("未知: {msg}  (h帮助 q退出)"), ToastKind::Error);
            true
        }
    }
}

// ── Slash command wrappers (from mod.rs dispatch) ──

fn arg(text: &str, prefix: &str, usage: &str, state: &mut AppState) -> Option<String> {
    let val = text.strip_prefix(prefix).unwrap_or("").trim().to_string();
    if val.is_empty() {
        state.toast(format!("用法: {usage}"), ToastKind::Error);
        None
    } else {
        Some(val)
    }
}
pub fn switch(state: &mut AppState, backend: &Backend, text: &str) {
    if let Some(name) = arg(text, "/api switch ", "/api switch <name>", state) {
        backend.send(BackendCommand::SwitchApi { name });
    }
}
pub fn delete(state: &mut AppState, backend: &Backend, text: &str) {
    if let Some(name) = arg(text, "/api delete ", "/api delete <name>", state) {
        backend.send(BackendCommand::DeleteApi { name });
    }
}
pub fn prompt(state: &mut AppState, backend: &Backend, text: &str) {
    if let Some(p) = arg(text, "/api prompt ", "/api prompt <text>", state) {
        backend.send(BackendCommand::SetSystemPrompt { prompt: p });
    }
}
pub fn key(state: &mut AppState, backend: &Backend, text: &str) {
    if let Some(k) = arg(text, "/api key ", "/api key <key>", state) {
        backend.send(BackendCommand::UpdateApiConfig {
            name: String::new(),
            provider: String::new(),
            model: String::new(),
            base_url: String::new(),
            api_key: k,
            thinking: None,
            reasoning_effort: None,
        });
    }
}
pub fn provider(state: &mut AppState, backend: &Backend, text: &str) {
    if let Some(v) = arg(text, "/api provider ", "/api provider <name>", state) {
        backend.send(BackendCommand::UpdateApiConfig {
            name: String::new(),
            provider: v,
            model: String::new(),
            base_url: String::new(),
            api_key: String::new(),
            thinking: None,
            reasoning_effort: None,
        });
    }
}
pub fn model(state: &mut AppState, backend: &Backend, text: &str) {
    if let Some(v) = arg(text, "/api model ", "/api model <name>", state) {
        backend.send(BackendCommand::UpdateApiConfig {
            name: String::new(),
            provider: String::new(),
            model: v,
            base_url: String::new(),
            api_key: String::new(),
            thinking: None,
            reasoning_effort: None,
        });
    }
}
pub fn url(state: &mut AppState, backend: &Backend, text: &str) {
    if let Some(v) = arg(text, "/api url ", "/api url <url>", state) {
        backend.send(BackendCommand::UpdateApiConfig {
            name: String::new(),
            provider: String::new(),
            model: String::new(),
            base_url: v,
            api_key: String::new(),
            thinking: None,
            reasoning_effort: None,
        });
    }
}
pub fn new_profile(state: &mut AppState, backend: &Backend, text: &str) {
    let args: Vec<&str> = text
        .strip_prefix("/api new ")
        .unwrap_or("")
        .split_whitespace()
        .collect();
    if args.len() < 3 {
        state.toast("用法: /api new <name> <provider> <model>", ToastKind::Error);
    } else {
        backend.send(BackendCommand::UpdateApiConfig {
            name: args[0].into(),
            provider: args[1].into(),
            model: args[2].into(),
            base_url: String::new(),
            api_key: String::new(),
            thinking: None,
            reasoning_effort: None,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::theme::Theme;
    use std::sync::Arc;

    fn test_state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    /// A Backend plus a handle for reading sent commands.
    fn test_backend() -> (Backend, echo_agent::BackendHandle) {
        let (bridge, handle) = echo_agent::create_bridge();
        (Backend::new(Arc::new(bridge)), handle)
    }

    async fn recv_command(handle: &echo_agent::BackendHandle) -> BackendCommand {
        handle
            .command_rx
            .lock()
            .await
            .recv()
            .await
            .expect("command sent")
    }

    #[tokio::test]
    async fn switch_command_sends_switch_api() {
        let (backend, handle) = test_backend();
        let mut state = test_state();
        assert!(handle_message(&mut state, &backend, "switch my-profile"));
        assert_eq!(
            recv_command(&handle).await,
            BackendCommand::SwitchApi {
                name: "my-profile".into()
            }
        );
    }

    #[tokio::test]
    async fn key_command_sends_update_api_config() {
        let (backend, handle) = test_backend();
        let mut state = test_state();
        assert!(handle_message(&mut state, &backend, "key sk-123"));
        let cmd = recv_command(&handle).await;
        match cmd {
            BackendCommand::UpdateApiConfig { api_key, name, .. } => {
                assert_eq!(api_key, "sk-123");
                assert!(name.is_empty(), "top-level default");
            }
            other => panic!("unexpected command: {other:?}"),
        }
    }

    #[tokio::test]
    async fn reasoning_commands_update_the_active_profile() {
        let (backend, handle) = test_backend();
        let mut state = test_state();
        state.settings.active_api = "deepseek".into();

        assert!(handle_message(&mut state, &backend, "thinking disabled"));
        match recv_command(&handle).await {
            BackendCommand::UpdateApiConfig { name, thinking, .. } => {
                assert_eq!(name, "deepseek");
                assert_eq!(thinking, Some(echo_agent::ThinkingMode::Disabled));
            }
            other => panic!("unexpected command: {other:?}"),
        }

        assert!(handle_message(&mut state, &backend, "effort max"));
        match recv_command(&handle).await {
            BackendCommand::UpdateApiConfig {
                name,
                reasoning_effort,
                ..
            } => {
                assert_eq!(name, "deepseek");
                assert_eq!(reasoning_effort, Some(echo_agent::ReasoningEffort::Max));
            }
            other => panic!("unexpected command: {other:?}"),
        }
    }

    #[tokio::test]
    async fn quit_exits_api_config_mode() {
        let (backend, _handle) = test_backend();
        let mut state = test_state();
        state.mode = ConversationMode::ApiConfig;
        assert!(handle_message(&mut state, &backend, "q"));
        assert_eq!(state.mode, ConversationMode::Normal);
    }

    #[tokio::test]
    async fn numeric_index_switches_profile() {
        let (backend, handle) = test_backend();
        let mut state = test_state();
        state.settings.profiles.push(echo_agent::ApiProfileInfo {
            name: "deepseek".into(),
            provider: "deepseek".into(),
            model: "deepseek-v4-flash".into(),
            base_url: "https://api.deepseek.com".into(),
            api_key_set: false,
            thinking: echo_agent::ThinkingMode::Enabled,
            reasoning_effort: echo_agent::ReasoningEffort::Max,
        });
        assert!(handle_message(&mut state, &backend, "1"));
        assert_eq!(
            recv_command(&handle).await,
            BackendCommand::SwitchApi {
                name: "deepseek".into()
            }
        );
    }

    #[tokio::test]
    async fn new_with_missing_args_does_not_send() {
        let (backend, handle) = test_backend();
        let mut state = test_state();
        assert!(handle_message(&mut state, &backend, "new onlyname"));
        assert!(
            handle.command_rx.try_lock().unwrap().try_recv().is_err(),
            "no command should be sent for malformed new"
        );
    }

    #[tokio::test]
    async fn slash_wrappers_require_arg() {
        let (backend, handle) = test_backend();
        let mut state = test_state();
        switch(&mut state, &backend, "/api switch ");
        assert!(
            handle.command_rx.try_lock().unwrap().try_recv().is_err(),
            "no command for empty arg"
        );
    }

    #[tokio::test]
    async fn new_profile_parses_three_args() {
        let (backend, handle) = test_backend();
        let mut state = test_state();
        new_profile(&mut state, &backend, "/api new test deepseek m1");
        let cmd = recv_command(&handle).await;
        match cmd {
            BackendCommand::UpdateApiConfig {
                name,
                provider,
                model,
                ..
            } => {
                assert_eq!(name, "test");
                assert_eq!(provider, "deepseek");
                assert_eq!(model, "m1");
            }
            other => panic!("unexpected command: {other:?}"),
        }
    }
}
