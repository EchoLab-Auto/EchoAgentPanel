//! Unified event enum for the TUI event loop.

use echo_agent::BackendEvent;

#[derive(Debug)]
pub enum Event {
    /// Terminal input (keyboard, resize, ...).
    Input(crossterm::event::Event),
    /// Periodic tick for spinners / animations.
    Tick,
    /// An event from the agent backend.
    Backend(BackendEvent),
}
