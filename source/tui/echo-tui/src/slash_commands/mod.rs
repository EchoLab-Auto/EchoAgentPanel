//! Slash command definitions and dispatch entry point.
//!
//! Each command category lives in its own sub-module.

use crate::backend::Backend;
use crate::state::AppState;
use echo_agent::BackendCommand;

pub mod adapter;
pub mod api;
pub mod basic;
pub mod context;
pub mod help;
pub mod qq;

/// All available slash commands.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlashAction {
    Help,
    ConfigureApi,
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
    Context,
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
    ("context", "查看已填充的上下文", SlashAction::Context),
];

pub use SlashAction::*;

/// Filter slash commands by the current input filter.
/// When the filter has no space, only first-level (no-space) commands are shown.
pub fn filtered_commands<'a>(filter: &str) -> Vec<&'a (&'a str, &'a str, SlashAction)> {
    let show_sub = filter.contains(' ');
    SLASH_COMMANDS
        .iter()
        .filter(|(name, _, _)| {
            if !name.starts_with(filter) {
                return false;
            }
            if !show_sub && name.contains(' ') {
                return false;
            }
            true
        })
        .collect()
}

/// Dispatch a slash command. Called from the app loop.
pub fn dispatch(state: &mut AppState, backend: &Backend, action: SlashAction, text: String) {
    match action {
        Help => help::run(state),
        ConfigureApi => api::config(state, backend),
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
        Context => context::run(state, backend),
        Quit => {
            state.running = false;
        }
    }
}
