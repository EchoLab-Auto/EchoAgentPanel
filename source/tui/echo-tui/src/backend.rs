//! Backend bridge wrapper for the TUI.

use echo_agent::{BackendBridge, BackendCommand, BackendEvent};

/// Thin client for the agent backend: send commands, drain events.
pub struct Backend {
    bridge: BackendBridge,
}

impl Backend {
    pub fn new(bridge: BackendBridge) -> Self {
        Self { bridge }
    }

    /// Send a command into the agent. Returns false if the agent is gone.
    pub fn send(&self, cmd: BackendCommand) -> bool {
        self.bridge.send_command(cmd)
    }

    /// Non-blocking drain of pending backend events.
    pub async fn drain_events(&self, out: &mut Vec<BackendEvent>) {
        let mut rx = self.bridge.event_rx.lock().await;
        while let Ok(ev) = rx.try_recv() {
            out.push(ev);
        }
    }
}
