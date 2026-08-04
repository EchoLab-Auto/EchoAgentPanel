//! /help command.

use crate::app::{AppState, ToastKind};

/// /help — show keybinding and slash command reference.
pub fn run(state: &mut AppState) {
    let help = vec![
        "── 按键帮助 ──",
        "  Tab          选中输入框",
        "  Esc          取消选中 / 关闭弹窗",
        "  Enter        发送消息",
        "  Shift+Enter  换行",
        "  Ctrl+P       命令面板",
        "  Ctrl+X o     切换会话",
        "  Ctrl+X s     配置 API",
        "  PgUp/PgDn    滚动聊天区",
        "  Ctrl+C ×2    退出",
        "",
        "── 斜杠命令 ──",
        "  /api          配置 API",
        "  /help         显示帮助",
        "  /clear        清空会话",
        "  /switch       切换会话",
        "  /adapters     适配器状态",
        "  /adapter start  启动适配器",
        "  /adapter stop   停止适配器",
        "  /qq login     QQ 扫码登录",
        "  /quit         退出",
    ].join("\n");
    state.toast(help, ToastKind::Info);
}
