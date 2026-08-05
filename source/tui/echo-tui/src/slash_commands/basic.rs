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
