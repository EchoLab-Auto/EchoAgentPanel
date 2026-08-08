//! Keybindings, following the opencode leader-key pattern (Ctrl+X prefix).

use crossterm::event::{KeyCode, KeyModifiers};

#[derive(Debug, Clone)]
pub struct Keybindings {
    /// Toggle the command palette.
    pub command_palette: KeyChord,
    /// Open the API settings form (leader+s).
    pub settings: KeyChord,
    /// Show keybinding help ('?').
    pub help: KeyChord,
    /// Open the detached branch / subagent inspector.
    pub task_inspector: KeyChord,
    /// Open the checklist panel (leader+c).
    pub checklist_panel: KeyChord,
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
        Self {
            code,
            modifiers: KeyModifiers::NONE,
        }
    }
    pub fn ctrl(code: KeyCode) -> Self {
        Self {
            code,
            modifiers: KeyModifiers::CONTROL,
        }
    }
}

impl Default for Keybindings {
    fn default() -> Self {
        Self {
            command_palette: KeyChord::ctrl(KeyCode::Char('p')),
            settings: KeyChord::plain(KeyCode::Char('s')),
            help: KeyChord::plain(KeyCode::Char('?')),
            task_inspector: KeyChord::ctrl(KeyCode::Char('b')),
            checklist_panel: KeyChord::plain(KeyCode::Char('c')),
            scroll_up: KeyChord::plain(KeyCode::PageUp),
            scroll_down: KeyChord::plain(KeyCode::PageDown),
            scroll_top: KeyChord::ctrl(KeyCode::Char('g')),
            scroll_bottom: KeyChord::plain(KeyCode::End),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_bindings_follow_leader_pattern() {
        let kb = Keybindings::default();
        assert_eq!(kb.command_palette.code, KeyCode::Char('p'));
        assert!(kb.command_palette.modifiers.contains(KeyModifiers::CONTROL));
        assert_eq!(kb.scroll_up.code, KeyCode::PageUp);
        assert_eq!(kb.scroll_down.code, KeyCode::PageDown);
        assert_eq!(kb.scroll_top.code, KeyCode::Char('g'));
        assert!(kb.scroll_top.modifiers.contains(KeyModifiers::CONTROL));
        assert_eq!(kb.scroll_bottom.code, KeyCode::End);
        assert_eq!(kb.help.code, KeyCode::Char('?'));
        assert_eq!(kb.task_inspector.code, KeyCode::Char('b'));
        assert!(kb.task_inspector.modifiers.contains(KeyModifiers::CONTROL));
        assert_eq!(kb.checklist_panel.code, KeyCode::Char('c'));
        assert_eq!(kb.checklist_panel.modifiers, KeyModifiers::NONE);
    }

    #[test]
    fn chord_constructors_set_modifiers() {
        let plain = KeyChord::plain(KeyCode::Enter);
        assert_eq!(plain.modifiers, KeyModifiers::NONE);
        let ctrl = KeyChord::ctrl(KeyCode::Char('c'));
        assert!(ctrl.modifiers.contains(KeyModifiers::CONTROL));
        assert_eq!(ctrl.code, KeyCode::Char('c'));
    }
}
