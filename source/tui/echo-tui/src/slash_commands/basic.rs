//! Basic slash commands: /clear, /quit.

use echo_agent::BackendCommand;
use crate::app::AppState;
use crate::backend::Backend;

/// /clear — clear the current session's history.
pub fn clear(state: &mut AppState, backend: &Backend) {
    if let Some(id) = state.active_session_id.clone() {
        backend.send(BackendCommand::ClearSession { session_id: id });
    }
}
