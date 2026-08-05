//! Basic slash commands: /clear, /quit.

use crate::backend::Backend;
use crate::state::AppState;
use echo_agent::BackendCommand;

/// /clear — clear the current session's history.
pub fn clear(state: &mut AppState, backend: &Backend) {
    if let Some(id) = state.active_session_id.clone() {
        backend.send(BackendCommand::ClearSession { session_id: id });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::theme::Theme;

    fn backend() -> (Backend, echo_agent::BackendHandle) {
        let (bridge, handle) = echo_agent::create_bridge();
        (Backend::new(std::sync::Arc::new(bridge)), handle)
    }

    #[tokio::test]
    async fn clear_sends_command_for_active_session() {
        let (backend, handle) = backend();
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        st.active_session_id = Some("qq:dm::123".into());
        clear(&mut st, &backend);
        assert_eq!(
            handle.try_recv_command(),
            Some(BackendCommand::ClearSession {
                session_id: "qq:dm::123".into()
            })
        );
    }

    #[tokio::test]
    async fn clear_is_noop_without_active_session() {
        let (backend, handle) = backend();
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        clear(&mut st, &backend);
        assert!(handle.try_recv_command().is_none());
    }
}
