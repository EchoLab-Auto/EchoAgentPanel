//! Temporary configuration menu rendered between chat and prompt.

use ratatui::layout::Rect;
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::components::form_overlay::{FieldKind, FormOverlay, FormState};
use crate::event::Event;
use crate::state::AppState;

const MAX_VISIBLE_ROWS: usize = 12;

#[derive(Debug, Default)]
pub struct FormMenu;

impl FormMenu {
    pub fn preferred_height(form: &FormOverlay) -> u16 {
        if !form.is_active() {
            return 0;
        }
        let rows = match form.state {
            FormState::Selecting => form.select_items.len(),
            FormState::Editing => form.fields.len(),
            FormState::Inactive => 0,
        }
        .clamp(1, MAX_VISIBLE_ROWS);
        rows.saturating_add(1) as u16 // top separator
    }

    fn build_lines(form: &FormOverlay, width: usize, state: &AppState) -> Vec<Line<'static>> {
        let theme = state.theme;
        match form.state {
            FormState::Selecting => {
                if form.select_items.is_empty() {
                    return vec![Line::from(Span::styled("  暂无可用项", theme.dim))];
                }
                let end = form
                    .select_scroll_offset
                    .saturating_add(form.viewport_size)
                    .min(form.select_items.len());
                form.select_items[form.select_scroll_offset..end]
                    .iter()
                    .enumerate()
                    .map(|(offset, item)| {
                        let index = form.select_scroll_offset + offset;
                        let selectable = item.value != "__info__";
                        let selected = selectable && index == form.select_idx;
                        let prefix = if selected { "  ▸ " } else { "    " };
                        let text = fit_row(&format!("{prefix}{}", item.label), width);
                        let style = if selected {
                            Style::default()
                                .fg(theme.title)
                                .bg(theme.highlight_bg)
                                .bold()
                        } else if selectable {
                            Style::default().fg(theme.fg)
                        } else {
                            Style::default().fg(theme.dim)
                        };
                        Line::from(Span::styled(text, style))
                    })
                    .collect()
            }
            FormState::Editing => {
                if form.fields.is_empty() {
                    return vec![Line::from(Span::styled("  暂无可编辑字段", theme.dim))];
                }
                let end = form
                    .edit_scroll_offset
                    .saturating_add(form.viewport_size)
                    .min(form.fields.len());
                form.fields[form.edit_scroll_offset..end]
                    .iter()
                    .enumerate()
                    .map(|(offset, field)| {
                        let index = form.edit_scroll_offset + offset;
                        let selected = index == form.field_idx;
                        let value = match field.kind {
                            FieldKind::Password if field.value.is_empty() => "(保持不变)".into(),
                            FieldKind::Password => "***".into(),
                            FieldKind::Text if field.value.is_empty() => "(空)".into(),
                            FieldKind::Text => field.value.clone(),
                        };
                        let prefix = if selected { "  ▸ " } else { "    " };
                        let text = fit_row(&format!("{prefix}{}: {value}", field.label), width);
                        let style = if selected {
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
            FormState::Inactive => Vec::new(),
        }
    }
}

impl Component for FormMenu {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let form = &state.form_overlay;
        if !form.is_active() || area.width == 0 || area.height == 0 {
            return;
        }
        let total = match form.state {
            FormState::Selecting => form.select_items.len(),
            FormState::Editing => form.fields.len(),
            FormState::Inactive => 0,
        };
        let selected = match form.state {
            FormState::Selecting => form.select_idx,
            FormState::Editing => form.field_idx,
            FormState::Inactive => 0,
        };
        let mode = matches!(form.state, FormState::Editing).then_some(" · 编辑");
        let position = (total > 0).then(|| format!("  {}/{}", selected + 1, total));
        let title = format!(
            " {}{}{} ",
            form.title,
            mode.unwrap_or_default(),
            position.unwrap_or_default()
        );
        let block = Block::default()
            .borders(Borders::TOP)
            .title(title)
            .title_style(Style::default().fg(state.theme.accent).bold())
            .border_style(Style::default().fg(state.theme.border_focused))
            .style(Style::default().bg(state.theme.panel_bg));
        let inner = block.inner(area);
        f.render_widget(block, area);
        let lines = Self::build_lines(form, inner.width as usize, state);
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
    use crate::components::form_overlay::{FormField, FormKind, SelectItem};
    use crate::keybindings::Keybindings;
    use crate::theme::Theme;

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    fn line_text(line: &Line<'_>) -> String {
        line.spans
            .iter()
            .map(|span| span.content.as_ref())
            .collect()
    }

    #[test]
    fn editing_masks_passwords_and_marks_empty_values() {
        let mut form = FormOverlay::default();
        form.activate(
            "API",
            vec![SelectItem {
                label: "profile".into(),
                value: "profile".into(),
            }],
            FormKind::ApiConfig,
        );
        form.set_fields(vec![
            FormField {
                label: "APIKey".into(),
                value: "sk-secret".into(),
                kind: FieldKind::Password,
            },
            FormField {
                label: "Model".into(),
                value: String::new(),
                kind: FieldKind::Text,
            },
        ]);
        form.enter_edit();

        let rendered = FormMenu::build_lines(&form, 40, &state())
            .iter()
            .map(line_text)
            .collect::<Vec<_>>()
            .join("\n");
        assert!(rendered.contains("APIKey: ***"));
        assert!(!rendered.contains("sk-secret"));
        assert!(rendered.contains("Model: (空)"));
    }

    #[test]
    fn preferred_height_is_bounded_and_includes_separator() {
        let mut form = FormOverlay::default();
        assert_eq!(FormMenu::preferred_height(&form), 0);
        form.activate(
            "API",
            (0..20)
                .map(|index| SelectItem {
                    label: format!("profile {index}"),
                    value: index.to_string(),
                })
                .collect(),
            FormKind::ApiConfig,
        );
        assert_eq!(FormMenu::preferred_height(&form), 13);
    }

    #[test]
    fn fitted_rows_respect_visual_width() {
        let row = fit_row("  ▸ 中文 profile", 10);
        assert_eq!(crate::util::str_visual_width(&row), 10);
    }
}
