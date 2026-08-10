//! Temporary slash-command completion menu rendered between chat and prompt.
//!
//! Behaves exactly like [`super::form_menu::FormMenu`]: it appears between the
//! conversation and the prompt input, separated from the conversation by a
//! top border line, and vanishes once the command is executed or dismissed.

use ratatui::layout::Rect;
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::event::Event;
use crate::slash_commands::filtered_commands;
use crate::state::AppState;

const MAX_VISIBLE_ROWS: usize = 12;

#[derive(Debug, Default)]
pub struct SlashMenu;

impl SlashMenu {
    /// Height reserved between chat and prompt while the menu is open.
    /// 0 when hidden (no slash input, or a form overlay takes priority).
    pub fn preferred_height(state: &AppState) -> u16 {
        if !state.show_slash || state.form_overlay.is_active() {
            return 0;
        }
        let rows = filtered_commands(&state.slash_filter)
            .len()
            .clamp(1, MAX_VISIBLE_ROWS);
        rows.saturating_add(1) as u16 // top separator
    }

    fn build_lines(state: &AppState, width: usize) -> Vec<Line<'static>> {
        let theme = state.theme;
        let filtered = filtered_commands(&state.slash_filter);
        if filtered.is_empty() {
            return vec![Line::from(Span::styled("  无匹配命令", theme.dim))];
        }
        let sel = state.slash_selection.min(filtered.len().saturating_sub(1));
        filtered
            .iter()
            .enumerate()
            .map(|(index, (name, desc, _))| {
                let marker = if index == sel { "  ▸ " } else { "    " };
                let text = fit_row(&format!("{marker}/{name}  {desc}"), width);
                let style = if index == sel {
                    Style::default()
                        .fg(theme.title)
                        .bg(theme.highlight_bg)
                        .bold()
                } else {
                    Style::default().fg(theme.fg)
                };
                Line::from(Span::styled(text, style))
            })
            .collect()
    }
}

impl Component for SlashMenu {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        if !state.show_slash
            || state.form_overlay.is_active()
            || area.width == 0
            || area.height == 0
        {
            return;
        }
        let block = Block::default()
            .borders(Borders::TOP)
            .title(format!(" /{} ", state.slash_filter))
            .title_style(Style::default().fg(state.theme.accent).bold())
            .border_style(Style::default().fg(state.theme.border_focused))
            .style(Style::default().bg(state.theme.panel_bg));
        let inner = block.inner(area);
        f.render_widget(block, area);
        let mut lines = Self::build_lines(state, inner.width as usize);
        lines.push(Line::from(Span::styled(
            " Tab 补全  ↑↓/jk 选择  Enter 执行  Esc 关闭",
            state.theme.faint,
        )));
        f.render_widget(
            Paragraph::new(lines).style(Style::default().bg(state.theme.panel_bg)),
            inner,
        );
    }

    fn handle_event(&mut self, _event: &Event, _state: &mut AppState) -> ComponentResult {
        ComponentResult::Pass
    }
}

fn fit_row(value: &str, width: usize) -> String {
    if width == 0 {
        return String::new();
    }
    let mut output = String::new();
    let mut used = 0usize;
    for ch in value.chars() {
        let char_width = crate::util::str_visual_width(&ch.to_string());
        if used + char_width > width {
            break;
        }
        output.push(ch);
        used += char_width;
    }
    output.push_str(&" ".repeat(width.saturating_sub(used)));
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::theme::Theme;

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    #[test]
    fn hidden_when_no_slash_input() {
        let st = state();
        assert_eq!(SlashMenu::preferred_height(&st), 0);
    }

    #[test]
    fn height_tracks_filtered_rows_plus_separator() {
        let mut st = state();
        st.show_slash = true;
        st.slash_filter = String::new();
        // All first-level commands are listed while the filter is empty.
        let rows = filtered_commands("").len();
        assert_eq!(
            SlashMenu::preferred_height(&st),
            rows.saturating_add(1) as u16
        );
    }

    #[test]
    fn height_is_bounded() {
        let mut st = state();
        st.show_slash = true;
        assert!(SlashMenu::preferred_height(&st) as usize <= MAX_VISIBLE_ROWS + 1);
    }

    #[test]
    fn form_overlay_takes_priority_over_slash_menu() {
        let mut st = state();
        st.show_slash = true;
        st.form_overlay.activate(
            "API",
            vec![crate::components::form_overlay::SelectItem {
                label: "profile".into(),
                value: "profile".into(),
            }],
            crate::components::form_overlay::FormKind::ApiConfig,
        );
        assert_eq!(SlashMenu::preferred_height(&st), 0);
    }
}
