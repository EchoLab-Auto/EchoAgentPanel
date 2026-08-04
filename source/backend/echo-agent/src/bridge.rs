//! In-process communication bridge between the agent backend and the TUI.

use tokio::sync::mpsc;
use tokio::sync::Mutex;

use crate::command::BackendCommand;
use crate::event::BackendEvent;

/// Frontend side of the bridge (held by the TUI).
///
/// - `command_tx`: send [`BackendCommand`]s into the agent.
/// - `event_rx`: receive [`BackendEvent`]s emitted by the agent.
pub struct BackendBridge {
    pub command_tx: mpsc::UnboundedSender<BackendCommand>,
    pub event_rx: Mutex<mpsc::UnboundedReceiver<BackendEvent>>,
}

impl BackendBridge {
    pub fn send_command(&self, cmd: BackendCommand) -> bool {
        self.command_tx.send(cmd).is_ok()
    }
}

/// Backend side of the bridge (held by the agent).
pub struct BackendHandle {
    pub event_tx: mpsc::UnboundedSender<BackendEvent>,
    pub command_rx: Mutex<mpsc::UnboundedReceiver<BackendCommand>>,
}

impl BackendHandle {
    /// Emit an event to all subscribers. Silently drops when no subscriber
    /// (e.g. headless mode).
    pub fn emit(&self, event: BackendEvent) {
        let _ = self.event_tx.send(event);
    }

    /// Try to receive the next command without blocking. `None` when no
    /// command is pending or the frontend has dropped the bridge.
    pub fn try_recv_command(&self) -> Option<BackendCommand> {
        self.command_rx.try_lock().ok()?.try_recv().ok()
    }
}

/// Create a bridge pair: frontend holds [`BackendBridge`], backend holds
/// [`BackendHandle`].
pub fn create_bridge() -> (BackendBridge, BackendHandle) {
    let (command_tx, command_rx) = mpsc::unbounded_channel();
    let (event_tx, event_rx) = mpsc::unbounded_channel();
    (
        BackendBridge { command_tx, event_rx: Mutex::new(event_rx) },
        BackendHandle { event_tx, command_rx: Mutex::new(command_rx) },
    )
}
