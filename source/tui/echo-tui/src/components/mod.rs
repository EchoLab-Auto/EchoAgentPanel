//! UI components. Each handles its own rendering and input.

pub mod chat_view;
pub mod command_palette;
pub mod form_overlay;
pub mod help_popup;
pub mod prompt_input;
pub mod settings_popup;
pub mod status_bar;
pub mod task_panel;
pub mod toast;

use ratatui::layout::Rect;
use ratatui::Frame;

use crate::event::Event;
use crate::state::AppState;

/// Outcome of routing an event to a component.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ComponentResult {
    /// The component consumed the event.
    Consumed,
    /// Not for this component.
    Pass,
}

pub trait Component {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState);
    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult;
}
