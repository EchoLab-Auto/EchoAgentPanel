//! EchoAgentPanel terminal UI.
//!
//! An opencode-style TUI: status bar + chat area + prompt input, with a
//! toggleable session sidebar, command palette, toasts, and keybinding help.
//! Talks to the agent backend through a [`BackendBridge`](echo_agent::BackendBridge).

pub mod app;
pub mod backend;
pub mod clipboard;
pub mod components;
pub mod event;
pub mod keybindings;
pub mod slash_commands;
pub mod state;
pub mod theme;
pub mod util;

use ratatui::Terminal;

pub use app::App;
pub use backend::Backend;
pub use event::Event;
pub use state::AppState;
pub use theme::Theme;

/// Drop 时恢复终端：任务被取消（如 /shutdown、SIGTERM）或 panic 时，
/// 也能保证 raw mode / alternate screen / 光标全部还原，不会留下残屏。
struct TermGuard;
impl Drop for TermGuard {
    fn drop(&mut self) {
        let _ = crossterm::execute!(
            std::io::stdout(),
            crossterm::cursor::Show,
            crossterm::event::DisableMouseCapture,
            crossterm::terminal::LeaveAlternateScreen
        );
        let _ = crossterm::terminal::disable_raw_mode();
    }
}

/// Run the TUI until the user quits. Owns terminal setup/teardown.
///
/// 全屏模式：进入 alternate screen 独占整个终端，退出时恢复原画面。
pub async fn run_tui(bridge: echo_agent::BackendBridge, theme: Theme) -> anyhow::Result<()> {
    use crossterm::cursor::Hide;
    use crossterm::event::EnableMouseCapture;
    use crossterm::terminal::{enable_raw_mode, EnterAlternateScreen};
    use ratatui::backend::CrosstermBackend;

    if !crossterm::tty::IsTty::is_tty(&std::io::stdout()) {
        anyhow::bail!("stdout 不是终端，TUI 不可用（可用 --headless 运行）");
    }
    enable_raw_mode()?;
    let _guard = TermGuard;
    let mut stdout = std::io::stdout();
    crossterm::execute!(stdout, EnterAlternateScreen, Hide, EnableMouseCapture)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout))?;
    let mut app = App::new(Backend::new(bridge), theme, crate::keybindings::Keybindings::default());
    // 捕获 TUI 主循环 panic 并写入日志：否则任务 panic 会被 JoinError 吞掉，
    // 主进程"干净退出"，bug 极难定位。
    let result = futures_util::FutureExt::catch_unwind(std::panic::AssertUnwindSafe(app.run(&mut terminal))).await;
    let result = match result {
        Ok(r) => r,
        Err(payload) => {
            let msg = if let Some(s) = payload.downcast_ref::<&str>() {
                s.to_string()
            } else if let Some(s) = payload.downcast_ref::<String>() {
                s.clone()
            } else {
                "未知 panic".to_string()
            };
            tracing::error!("TUI 内部 panic: {msg}");
            anyhow::bail!("TUI 内部 panic: {msg}")
        }
    };
    drop(_guard);
    result
}
