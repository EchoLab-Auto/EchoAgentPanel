//! Command palette (Ctrl+P).

use crossterm::event::{KeyCode, KeyEventKind};
use ratatui::layout::{Alignment, Rect};
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, List, ListItem, ListState, Paragraph};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::event::Event;
use crate::state::AppState;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteAction {
    ConfigureApi,
    ToggleHelp,
    Quit,
}

const ACTIONS: &[(PaletteAction, &str)] = &[
    (PaletteAction::ConfigureApi, "配置 API (provider/model/key)"),
    (PaletteAction::ToggleHelp, "按键帮助"),
    (PaletteAction::Quit, "退出"),
];

#[derive(Debug, Default)]
pub struct CommandPalette;

impl CommandPalette {
    pub fn actions(&self) -> Vec<PaletteAction> {
        ACTIONS.iter().map(|(a, _)| *a).collect()
    }
}

impl Component for CommandPalette {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let items: Vec<ListItem> = ACTIONS
            .iter()
            .map(|(_, label)| ListItem::new(Line::from(*label)))
            .collect();
        let title = " 命令 ";
        let h = ACTIONS.len() as u16 + 4;
        let w = 52u16.min(area.width.saturating_sub(4));
        let h = h.min(area.height.saturating_sub(2));
        let x = area.width.saturating_sub(w) / 2;
        let y = area.height.saturating_sub(h) / 2;
        let rect = Rect::new(x, y, w, h);

        f.render_widget(Clear, rect);
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(theme.border_focused)
            .title(Span::styled(title, Style::default().fg(theme.title).bold()));
        let list = List::new(items).block(block).highlight_style(
            Style::default()
                .bg(theme.highlight_bg)
                .fg(theme.title)
                .bold(),
        );
        let mut list_state = ListState::default();
        list_state.select(Some(
            state
                .palette_selection
                .min(rect.height.saturating_sub(4) as usize),
        ));
        f.render_stateful_widget(list, rect, &mut list_state);

        let hint = Paragraph::new(Line::from("↑↓/jk 选择 · Enter 执行 · Esc 关闭"))
            .alignment(Alignment::Center)
            .style(Style::default().fg(theme.faint));
        f.render_widget(hint, Rect::new(x, y + h, w, 1));
    }

    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult {
        let Event::Input(crossterm::event::Event::Key(key)) = event else {
            return ComponentResult::Pass;
        };
        if key.kind != KeyEventKind::Press {
            return ComponentResult::Pass;
        }
        let len = ACTIONS.len();
        match key.code {
            KeyCode::Esc => state.show_palette = false,
            KeyCode::Down | KeyCode::Char('j') => {
                state.palette_selection = (state.palette_selection + 1) % len;
            }
            KeyCode::Up | KeyCode::Char('k') => {
                state.palette_selection = state.palette_selection.saturating_sub(1);
            }
            _ => return ComponentResult::Pass,
        }
        ComponentResult::Consumed
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::theme::Theme;

    fn key(code: KeyCode, kind: KeyEventKind) -> Event {
        let mut k = crossterm::event::KeyEvent::new(code, crossterm::event::KeyModifiers::NONE);
        k.kind = kind;
        Event::Input(crossterm::event::Event::Key(k))
    }

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    #[test]
    fn actions_returns_commands_without_session_management() {
        let palette = CommandPalette;
        assert_eq!(palette.actions().len(), 3);
        assert!(palette.actions().contains(&PaletteAction::Quit));
        assert!(palette.actions().contains(&PaletteAction::ConfigureApi));
    }

    #[test]
    fn down_navigates_with_wraparound() {
        let mut st = state();
        let mut palette = CommandPalette;
        let ev = key(KeyCode::Down, KeyEventKind::Press);
        assert_eq!(
            palette.handle_event(&ev, &mut st),
            ComponentResult::Consumed
        );
        assert_eq!(st.palette_selection, 1);
        // Wrap from last to first.
        st.palette_selection = 2;
        assert_eq!(
            palette.handle_event(&ev, &mut st),
            ComponentResult::Consumed
        );
        assert_eq!(st.palette_selection, 0);
    }

    #[test]
    fn up_never_underflows() {
        let mut st = state();
        let mut palette = CommandPalette;
        let ev = key(KeyCode::Char('k'), KeyEventKind::Press);
        assert_eq!(
            palette.handle_event(&ev, &mut st),
            ComponentResult::Consumed
        );
        assert_eq!(st.palette_selection, 0, "saturating_sub must not underflow");
    }

    #[test]
    fn escape_closes_palette() {
        let mut st = state();
        st.show_palette = true;
        let mut palette = CommandPalette;
        let ev = key(KeyCode::Esc, KeyEventKind::Press);
        assert_eq!(
            palette.handle_event(&ev, &mut st),
            ComponentResult::Consumed
        );
        assert!(!st.show_palette);
    }

    #[test]
    fn release_events_pass_through() {
        let mut st = state();
        let mut palette = CommandPalette;
        let ev = key(KeyCode::Down, KeyEventKind::Release);
        assert_eq!(palette.handle_event(&ev, &mut st), ComponentResult::Pass);
        assert_eq!(st.palette_selection, 0);
    }
}
