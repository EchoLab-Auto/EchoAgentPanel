//! Checklist panel — visualizes the agent's `checklist` tool state.

use crossterm::event::{KeyCode, KeyEventKind, MouseEventKind};
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{
    Block, BorderType, Borders, Clear, List, ListItem, ListState, Paragraph, Wrap,
};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::event::Event;
use crate::state::{AppState, ChecklistEntry};

#[derive(Debug, Default)]
pub struct ChecklistPanel;

impl Component for ChecklistPanel {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        if area.width < 20 || area.height < 8 {
            return;
        }
        let theme = state.theme;
        let popup = centered_rect(area, 100, 30);
        f.render_widget(Clear, popup);
        let outer = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Plain)
            .border_style(Style::default().fg(theme.border_focused))
            .style(Style::default().bg(theme.overlay_bg))
            .title(Span::styled(
                " 检查清单 ",
                Style::default().fg(theme.title).bold(),
            ));
        let inner = outer.inner(popup);
        f.render_widget(outer, popup);

        if state.checklists.is_empty() {
            f.render_widget(
                Paragraph::new("暂无清单 — 让 Agent 调用 checklist 工具后在此查看")
                    .style(Style::default().fg(theme.faint)),
                inner,
            );
            return;
        }

        let regions = if inner.width >= 72 {
            Layout::default()
                .direction(Direction::Horizontal)
                .constraints([Constraint::Percentage(30), Constraint::Min(30)])
                .split(inner)
        } else {
            Layout::default()
                .direction(Direction::Vertical)
                .constraints([Constraint::Percentage(35), Constraint::Min(4)])
                .split(inner)
        };
        render_list(f, regions[0], state);
        render_detail(f, regions[1], state);
    }

    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult {
        match event {
            Event::Input(crossterm::event::Event::Key(key)) if key.kind == KeyEventKind::Press => {
                let last = state.checklists.len().saturating_sub(1);
                match key.code {
                    KeyCode::Esc => state.show_checklist_panel = false,
                    KeyCode::Up | KeyCode::Char('k') => {
                        state.checklist_selection = state.checklist_selection.saturating_sub(1);
                        state.checklist_scroll = 0;
                    }
                    KeyCode::Down | KeyCode::Char('j') => {
                        state.checklist_selection =
                            state.checklist_selection.saturating_add(1).min(last);
                        state.checklist_scroll = 0;
                    }
                    KeyCode::Home => {
                        state.checklist_selection = 0;
                        state.checklist_scroll = 0;
                    }
                    KeyCode::End => {
                        state.checklist_selection = last;
                        state.checklist_scroll = 0;
                    }
                    KeyCode::PageUp => {
                        state.checklist_scroll = state.checklist_scroll.saturating_sub(5);
                    }
                    KeyCode::PageDown => {
                        state.checklist_scroll = state.checklist_scroll.saturating_add(5);
                    }
                    _ => return ComponentResult::Pass,
                }
                ComponentResult::Consumed
            }
            Event::Input(crossterm::event::Event::Mouse(mouse)) => {
                match mouse.kind {
                    MouseEventKind::ScrollUp => {
                        state.checklist_scroll = state.checklist_scroll.saturating_sub(3);
                    }
                    MouseEventKind::ScrollDown => {
                        state.checklist_scroll = state.checklist_scroll.saturating_add(3);
                    }
                    _ => return ComponentResult::Pass,
                }
                ComponentResult::Consumed
            }
            _ => ComponentResult::Pass,
        }
    }
}

fn render_list(f: &mut Frame, area: Rect, state: &AppState) {
    let theme = state.theme;
    let items = state
        .checklists
        .iter()
        .map(|entry| {
            let progress = if entry.total == 0 {
                "空".to_string()
            } else {
                entry.progress()
            };
            ListItem::new(Line::from(vec![
                Span::styled(
                    if entry.done == entry.total && entry.total > 0 {
                        "✓"
                    } else {
                        "▫"
                    },
                    Style::default().fg(if entry.done == entry.total && entry.total > 0 {
                        theme.success
                    } else {
                        theme.accent
                    }),
                ),
                Span::styled(format!(" {}  ", entry.name), Style::default().fg(theme.fg)),
                Span::styled(progress, Style::default().fg(theme.dim)),
            ]))
        })
        .collect::<Vec<_>>();
    let list = List::new(items)
        .highlight_style(
            Style::default()
                .bg(theme.highlight_bg)
                .fg(theme.title)
                .bold(),
        )
        .highlight_symbol("▸ ")
        .block(
            Block::default()
                .borders(Borders::RIGHT)
                .border_style(Style::default().fg(theme.border))
                .title(Span::styled(" 清单 ", Style::default().fg(theme.subtitle))),
        );
    let mut list_state = ListState::default().with_selected(Some(
        state
            .checklist_selection
            .min(state.checklists.len().saturating_sub(1)),
    ));
    f.render_stateful_widget(list, area, &mut list_state);
}

fn render_detail(f: &mut Frame, area: Rect, state: &AppState) {
    let theme = state.theme;
    let Some(entry) = state.checklists.get(state.checklist_selection) else {
        return;
    };
    let mut lines = vec![header_line(entry, state)];
    lines.push(Line::from(""));
    if entry.items.is_empty() {
        lines.push(Line::from(Span::styled(
            "（空清单）",
            Style::default().fg(theme.faint),
        )));
    }
    for (index, item) in entry.items.iter().enumerate() {
        let mark = if item.done { "[x]" } else { "[ ]" };
        lines.push(Line::from(vec![
            Span::styled(
                format!("{mark} "),
                Style::default().fg(if item.done { theme.success } else { theme.dim }),
            ),
            Span::styled(format!("{}. ", index + 1), Style::default().fg(theme.faint)),
            Span::styled(
                item.text.clone(),
                Style::default().fg(if item.done { theme.dim } else { theme.fg }),
            ),
        ]));
    }
    f.render_widget(
        Paragraph::new(lines)
            .wrap(Wrap { trim: false })
            .scroll((state.checklist_scroll, 0))
            .style(Style::default().bg(theme.overlay_bg)),
        area,
    );
}

fn header_line(entry: &ChecklistEntry, state: &AppState) -> Line<'static> {
    let theme = state.theme;
    let progress = if entry.total == 0 {
        "空".to_string()
    } else {
        format!("{} / {} 完成", entry.done, entry.total)
    };
    Line::from(vec![
        Span::styled(
            if entry.total > 0 && entry.done == entry.total {
                "✓ "
            } else {
                "▫ "
            },
            Style::default()
                .fg(if entry.total > 0 && entry.done == entry.total {
                    theme.success
                } else {
                    theme.accent
                })
                .bold(),
        ),
        Span::styled(entry.name.clone(), Style::default().fg(theme.title).bold()),
        Span::styled(
            format!("  ·  {progress}"),
            Style::default().fg(theme.subtitle),
        ),
    ])
}

fn centered_rect(area: Rect, max_width: u16, max_height: u16) -> Rect {
    let width = max_width.min(area.width.saturating_sub(4)).max(12);
    let height = max_height.min(area.height.saturating_sub(4)).max(6);
    Rect::new(
        area.x + area.width.saturating_sub(width) / 2,
        area.y + area.height.saturating_sub(height) / 2,
        width.min(area.width),
        height.min(area.height),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::state::{ChecklistEntry, ChecklistItemEntry};
    use crate::theme::Theme;

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    fn key(code: KeyCode, kind: KeyEventKind) -> Event {
        let mut k = crossterm::event::KeyEvent::new(code, crossterm::event::KeyModifiers::NONE);
        k.kind = kind;
        Event::Input(crossterm::event::Event::Key(k))
    }

    fn seeded() -> AppState {
        let mut st = state();
        st.checklists = vec![ChecklistEntry {
            name: "部署".into(),
            done: 1,
            total: 2,
            items: vec![
                ChecklistItemEntry {
                    text: "构建".into(),
                    done: true,
                },
                ChecklistItemEntry {
                    text: "发布".into(),
                    done: false,
                },
            ],
        }];
        st
    }

    #[test]
    fn empty_panel_renders_hint() {
        let mut st = state();
        st.show_checklist_panel = true;
        let backend = ratatui::backend::TestBackend::new(80, 24);
        let mut terminal = ratatui::Terminal::new(backend).unwrap();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            terminal
                .draw(|f| ChecklistPanel.render(f, f.area(), &st))
                .unwrap();
        }));
        assert!(result.is_ok(), "empty panel must not panic");
    }

    #[test]
    fn seeded_panel_renders_list_and_detail() {
        let mut st = seeded();
        st.show_checklist_panel = true;
        let backend = ratatui::backend::TestBackend::new(100, 30);
        let mut terminal = ratatui::Terminal::new(backend).unwrap();
        terminal
            .draw(|f| ChecklistPanel.render(f, f.area(), &st))
            .unwrap();
        let buffer = terminal.backend().buffer();
        let text = (0..buffer.area.height)
            .map(|y| {
                (0..buffer.area.width)
                    .map(|x| buffer[(x, y)].symbol())
                    .collect::<String>()
            })
            .collect::<Vec<_>>()
            .join("\n");
        let compact = text.replace(' ', "");
        assert!(compact.contains("检查清单"), "title missing:\n{text}");
        assert!(compact.contains("部署"));
        assert!(compact.contains("构建"));
        assert!(compact.contains("发布"));
    }

    #[test]
    fn escape_closes_panel() {
        let mut st = seeded();
        st.show_checklist_panel = true;
        st.show_checklist_panel = true;
        let mut panel = ChecklistPanel;
        let ev = key(KeyCode::Esc, KeyEventKind::Press);
        assert_eq!(panel.handle_event(&ev, &mut st), ComponentResult::Consumed);
        assert!(!st.show_checklist_panel);
    }

    #[test]
    fn arrows_move_selection_within_bounds() {
        let mut st = seeded();
        st.show_checklist_panel = true;
        let mut panel = ChecklistPanel;
        let down = key(KeyCode::Down, KeyEventKind::Press);
        let up = key(KeyCode::Up, KeyEventKind::Press);
        panel.handle_event(&down, &mut st);
        assert_eq!(st.checklist_selection, 0, "clamped to last item");
        let _ = panel.handle_event(&down, &mut st);
        assert_eq!(st.checklist_selection, 0);
        let _ = panel.handle_event(&up, &mut st);
        assert_eq!(st.checklist_selection, 0);
    }
}
