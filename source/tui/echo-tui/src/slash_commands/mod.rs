//! Slash command definitions and dispatch entry point.
//!
//! Each command category lives in its own sub-module.

use echo_agent::BackendCommand;
use crate::app::AppState;
use crate::backend::Backend;

pub mod api;
pub mod adapter;
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
    ApiSwitch,
    ApiDelete,
    ApiSetPrompt,
    ApiSetKey,
    ApiSetProvider,
    ApiSetModel,
    ApiSetUrl,
    ApiNewProfile,
}

/// Command table: (name, description, action).
pub const SLASH_COMMANDS: &[(&str, &str, SlashAction)] = &[
    ("help", "显示按键帮助", SlashAction::Help),
    ("api", "交互式 API 配置菜单", SlashAction::ConfigureApi),
    ("api switch ", "切换 API profile", SlashAction::ApiSwitch),
    ("api delete ", "删除 API profile", SlashAction::ApiDelete),
    ("api prompt ", "设置系统提示词", SlashAction::ApiSetPrompt),
    ("api key ", "设置 API key", SlashAction::ApiSetKey),
    ("api provider ", "设置 LLM provider", SlashAction::ApiSetProvider),
    ("api model ", "设置 LLM model", SlashAction::ApiSetModel),
    ("api url ", "设置 API base URL", SlashAction::ApiSetUrl),
    ("api new ", "新建 API profile", SlashAction::ApiNewProfile),
    ("clear", "清空当前会话", SlashAction::ClearSession),
    ("switch", "切换会话", SlashAction::SwitchSession),
    ("sessions", "刷新会话列表", SlashAction::RequestState),
    ("adapters", "查看适配器状态", SlashAction::AdapterStatus),
    ("adapter start", "启动所有适配器", SlashAction::AdapterStart),
    ("adapter stop", "停止所有适配器", SlashAction::AdapterStop),
    ("qq login", "QQ 扫码登录", SlashAction::QqLogin),
    ("quit", "退出程序", SlashAction::Quit),
];

pub use SlashAction::*;

/// Dispatch a slash command. Called from the app loop.
pub fn dispatch(state: &mut AppState, backend: &Backend, action: SlashAction, text: String) {
    match action {
        Help => help::run(state),
        ConfigureApi => api::config(state, backend),
        ClearSession => basic::clear(state, backend),
        RequestState => { backend.send(BackendCommand::RequestState); }
        SwitchSession => { /* handled by open_palette in app */ }
        AdapterStatus => adapter::status(state, backend),
        AdapterStart => { backend.send(BackendCommand::StartAllAdapters); }
        AdapterStop => { backend.send(BackendCommand::StopAllAdapters); }
        QqLogin => qq::login(state, backend),
        ApiSwitch => api::switch(state, backend, &text),
        ApiDelete => api::delete(state, backend, &text),
        ApiSetPrompt => api::prompt(state, backend, &text),
        ApiSetKey => api::key(state, backend, &text),
        ApiSetProvider => api::provider(state, backend, &text),
        ApiSetModel => api::model(state, backend, &text),
        ApiSetUrl => api::url(state, backend, &text),
        ApiNewProfile => api::new_profile(state, backend, &text),
        Quit => { state.running = false; }
    }
}
