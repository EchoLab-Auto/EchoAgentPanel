//! Slash command definitions and dispatch entry point.
//!
//! Each command category lives in its own sub-module.

use crate::backend::Backend;
use crate::state::{AppState, ToastKind};
use echo_agent::BackendCommand;

pub mod adapter;
pub mod api;
pub mod basic;
pub mod help;
pub mod qq;

/// All available slash commands.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlashAction {
    Help,
    ConfigureApi,
    ClearSession,
    RequestState,
    SwitchSession,
    Quit,
    AdapterStatus,
    AdapterStart,
    AdapterStop,
    QqLogin,
    QqSetting,
    ApiSwitch,
    ApiDelete,
    ApiSetPrompt,
    ApiSetKey,
    ApiSetProvider,
    ApiSetModel,
    ApiSetUrl,
    ApiNewProfile,
    ResumeSession,
}

/// Command table: (name, description, action).
pub const SLASH_COMMANDS: &[(&str, &str, SlashAction)] = &[
    ("help", "显示按键帮助", SlashAction::Help),
    ("api", "交互式 API 配置菜单", SlashAction::ConfigureApi),
    ("api switch ", "切换 API profile", SlashAction::ApiSwitch),
    ("api delete ", "删除 API profile", SlashAction::ApiDelete),
    ("api prompt ", "设置系统提示词", SlashAction::ApiSetPrompt),
    ("api key ", "设置 API key", SlashAction::ApiSetKey),
    (
        "api provider ",
        "设置 LLM provider",
        SlashAction::ApiSetProvider,
    ),
    ("api model ", "设置 LLM model", SlashAction::ApiSetModel),
    ("api url ", "设置 API base URL", SlashAction::ApiSetUrl),
    ("api new ", "新建 API profile", SlashAction::ApiNewProfile),
    ("clear", "清空当前会话", SlashAction::ClearSession),
    ("switch", "切换会话", SlashAction::SwitchSession),
    ("resume", "回到之前的会话", SlashAction::ResumeSession),
    ("sessions", "刷新会话列表", SlashAction::RequestState),
    ("adapters", "查看适配器状态", SlashAction::AdapterStatus),
    ("adapter start", "启动所有适配器", SlashAction::AdapterStart),
    ("adapter stop", "停止所有适配器", SlashAction::AdapterStop),
    ("qq login", "QQ 扫码登录", SlashAction::QqLogin),
    (
        "qq setting",
        "QQ 设置（白名单/黑名单管理）",
        SlashAction::QqSetting,
    ),
    ("quit", "退出程序", SlashAction::Quit),
];

pub use SlashAction::*;

/// Dispatch a slash command. Called from the app loop.
pub fn dispatch(state: &mut AppState, backend: &Backend, action: SlashAction, text: String) {
    match action {
        Help => help::run(state),
        ConfigureApi => api::config(state, backend),
        ClearSession => basic::clear(state, backend),
        RequestState => {
            backend.send(BackendCommand::RequestState);
        }
        SwitchSession => { /* handled by open_palette in app */ }
        ResumeSession => cmd_resume(state),
        AdapterStatus => adapter::status(state, backend),
        AdapterStart => {
            backend.send(BackendCommand::StartAllAdapters);
        }
        AdapterStop => {
            backend.send(BackendCommand::StopAllAdapters);
        }
        QqLogin => qq::login(state, backend),
        QqSetting => qq::setting(state, backend),
        ApiSwitch => api::switch(state, backend, &text),
        ApiDelete => api::delete(state, backend, &text),
        ApiSetPrompt => api::prompt(state, backend, &text),
        ApiSetKey => api::key(state, backend, &text),
        ApiSetProvider => api::provider(state, backend, &text),
        ApiSetModel => api::model(state, backend, &text),
        ApiSetUrl => api::url(state, backend, &text),
        ApiNewProfile => api::new_profile(state, backend, &text),
        Quit => {
            state.running = false;
        }
    }
}

// ── Resume ──

fn cmd_resume(state: &mut AppState) {
    let sessions = state.sessions.clone();
    if sessions.is_empty() {
        state.toast("没有历史会话。开始对话后会自动保存。", ToastKind::Info);
        return;
    }
    let mut sorted = sessions;
    sorted.sort_by(|a, b| b.last_active.cmp(&a.last_active));

    // Build form overlay items for interactive session selection.
    use crate::components::form_overlay::{FormOverlay, SelectItem};
    let mut items: Vec<SelectItem> = Vec::new();
    let mut cur_idx = 0;
    for (i, s) in sorted.iter().enumerate() {
        let active = if Some(&s.id) == state.active_session_id.as_ref() {
            "◀"
        } else {
            ""
        };
        let scope = match s.scope.as_str() {
            "dm" => "💬私聊".to_string(),
            "group" => format!("👥群:{}", s.group_name.as_deref().unwrap_or("?")),
            "tui" => "🖥本地".to_string(),
            _ => s.scope.clone(),
        };
        let time = chrono::DateTime::from_timestamp(s.last_active, 0)
            .map(|d| {
                d.with_timezone(&chrono::Local)
                    .format("%m/%d %H:%M")
                    .to_string()
            })
            .unwrap_or_default();
        let preview: String = s.last_message.chars().take(40).collect();
        let label = format!(
            "{} [{}] {} ({})  {}  └ {}",
            active, s.platform, s.nickname, scope, time, preview
        );
        items.push(SelectItem {
            label,
            value: s.id.clone(),
        });
        if Some(&s.id) == state.active_session_id.as_ref() {
            cur_idx = i;
        }
    }

    let mut fo = FormOverlay::default();
    fo.activate(
        "历史会话 (↑↓选择 Enter进入 Esc取消)",
        items,
        crate::components::form_overlay::FormKind::SessionSelect,
    );
    fo.select_idx = cur_idx;
    state.form_overlay = fo;
    state.menu_msg_idx = -1;
    state.refresh_menu_msg();
}
