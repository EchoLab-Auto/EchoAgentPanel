//! /context — request the current trunk context snapshot from the backend.
//!
//! The backend answers with `BackendEvent::ContextSnapshot`; the TUI renders
//! it as a chat message (see `crate::app::events`).

use crate::backend::Backend;
use crate::state::{AppState, ToastKind};
use echo_protocol::BackendCommand;

/// /context — ask the backend to report the currently filled context.
pub fn run(state: &mut AppState, backend: &Backend) {
    backend.send(BackendCommand::RequestContext);
    state.toast("正在获取上下文…", ToastKind::Info);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::theme::Theme;

    #[tokio::test]
    async fn run_sends_request_context() {
        let (bridge, handle) = echo_protocol::create_bridge();
        let backend = Backend::new(std::sync::Arc::new(bridge));
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        run(&mut st, &backend);
        assert_eq!(
            handle.try_recv_command(),
            Some(BackendCommand::RequestContext)
        );
        assert!(st
            .messages
            .get(crate::state::TRUNK_SESSION_ID)
            .map(|msgs| msgs.iter().any(|m| m.content.contains("正在获取上下文")))
            .unwrap_or(false));
    }
}
