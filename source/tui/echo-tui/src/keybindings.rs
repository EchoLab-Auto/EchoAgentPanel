//! Keybindings, following the opencode leader-key pattern (Ctrl+X prefix).

use crossterm::event::{KeyCode, KeyModifiers};

#[derive(Debug, Clone)]
pub struct Keybindings {
    /// Toggle the command palette.
    pub command_palette: KeyChord,
    /// Open the session switcher (leader+o).
    pub session_switch: KeyChord,
    /// Open the API settings form (leader+s).
    pub settings: KeyChord,
    /// Show keybinding help ('?').
    pub help: KeyChord,
    /// Scroll chat up / down.
    pub scroll_up: KeyChord,
    pub scroll_down: KeyChord,
    pub scroll_top: KeyChord,
    pub scroll_bottom: KeyChord,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KeyChord {
    pub code: KeyCode,
    pub modifiers: KeyModifiers,
}

impl KeyChord {
    pub fn plain(code: KeyCode) -> Self {
        Self { code, modifiers: KeyModifiers::NONE }
    }
    pub fn ctrl(code: KeyCode) -> Self {
        Self { code, modifiers: KeyModifiers::CONTROL }
    }
}

impl Default for Keybindings {
    fn default() -> Self {
        Self {
            command_palette: KeyChord::ctrl(KeyCode::Char('p')),
            session_switch: KeyChord::plain(KeyCode::Char('o')),
            settings: KeyChord::plain(KeyCode::Char('s')),
            help: KeyChord::plain(KeyCode::Char('?')),
            scroll_up: KeyChord::plain(KeyCode::PageUp),
            scroll_down: KeyChord::plain(KeyCode::PageDown),
            scroll_top: KeyChord::ctrl(KeyCode::Char('g')),
            scroll_bottom: KeyChord::plain(KeyCode::End),
        }
    }
}
