//! Adapter management popup — start/stop all adapters, view status.
//!
//! Opened via `/adapters`.  All adapters (QQ/OneBot etc.) are started together.
//! Duplicate-start is prevented by the adapter layer.
//!
//! - `s` start all adapters
//! - `x` stop all adapters
//! - `r` refresh status
//! - `Esc` close

use crossterm::event::{KeyCode, KeyEventKind};
use echo_agent::BackendCommand;
use ratatui::layout::{Alignment, Rect};
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, Paragraph};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::app::AppState;
use crate::event::Event;

#[derive(Debug, Default)]
pub struct AdapterPopup;

impl Component for AdapterPopup {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let adapters = &state.status.adapters;

        let w = 62u16.min(area.width.saturating_sub(4));
        let row_count = if adapters.is_empty() { 4 } else { adapters.len() + 4 };
        let max_h = (area.height.saturating_sub(2)).max(8) as usize;
        let h = (row_count).clamp(8, max_h) as u16;
        let x = area.width.saturating_sub(w) / 2;
        let y = area.height.saturating_sub(h) / 2;
        let rect = Rect::new(x, y, w, h);

        f.render_widget(Clear, rect);

        let mut lines: Vec<Line> = Vec::new();

        if adapters.is_empty() {
            lines.push(Line::from(vec![
                Span::raw("  "),
                Span::styled("○  no adapters configured", theme.subtitle),
            ]));
            lines.push(Line::from(""));
            lines.push(Line::from(vec![
                Span::raw("  "),
                Span::styled(
                    "enable QQ with [adapters.qq] enabled = true in config",
                    theme.faint,
                ),
            ]));
        } else {
            let all_running = adapters.iter().all(|a| a.running);
            let any_stopped = adapters.iter().any(|a| !a.running);
            let any_connected = adapters.iter().any(|a| a.connected);

            // Summary line.
            let summary = if all_running && any_connected {
                Span::styled("all adapters running & connected", Style::default().fg(theme.success))
            } else if all_running {
                Span::styled("all adapters running", Style::default().fg(theme.accent))
            } else if any_stopped {
                Span::styled("some adapters stopped — press [s] to start all", theme.subtitle)
            } else {
                Span::styled("unknown state", theme.faint)
            };
            lines.push(Line::from(vec![Span::raw("  "), summary]));
            lines.push(Line::from(""));

            for adp in adapters {
                let (dot, status) = if !adp.running {
                    (
                        Span::styled("○", Style::default().fg(theme.dim)),
                        Span::styled("stopped", Style::default().fg(theme.dim)),
                    )
                } else if adp.connected {
                    let id = adp.self_id.as_deref().unwrap_or("?");
                    (
                        Span::styled("●", Style::default().fg(theme.success)),
                        Span::styled(format!("connected (self: {id})"), Style::default().fg(theme.success)),
                    )
                } else {
                    (
                        Span::styled("◐", Style::default().fg(theme.accent)),
                        Span::styled("waiting for client…", Style::default().fg(theme.accent)),
                    )
                };

                lines.push(Line::from(vec![
                    Span::raw("    "),
                    dot,
                    Span::raw("  "),
                    Span::styled(&adp.display_name, Style::default().fg(theme.title).bold()),
                    Span::raw("  "),
                    status,
                ]));
            }
        }

        lines.push(Line::from(""));
        lines.push(Line::from(vec![Span::styled(
            "  [s] start all   [x] stop all   [r] refresh   Esc close",
            theme.faint,
        )]));

        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(theme.border)
            .title(Span::styled(" Adapters ", Style::default().fg(theme.title).bold()))
            .title_alignment(Alignment::Center);

        let p = Paragraph::new(lines)
            .block(block)
            .style(Style::default().bg(theme.panel_bg));
        f.render_widget(p, rect);
    }

    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult {
        let Event::Input(crossterm::event::Event::Key(key)) = event else {
            return ComponentResult::Pass;
        };
        if key.kind != KeyEventKind::Press {
            return ComponentResult::Pass;
        }

        match key.code {
            KeyCode::Esc => {
                state.show_adapter_popup = false;
            }
            KeyCode::Char('s') => {
                state.pending_command = Some(BackendCommand::StartAllAdapters);
                state.toast("starting all adapters…", crate::app::ToastKind::Info);
            }
            KeyCode::Char('x') => {
                state.pending_command = Some(BackendCommand::StopAllAdapters);
                state.toast("stopping all adapters…", crate::app::ToastKind::Info);
            }
            KeyCode::Char('r') => {
                state.pending_command = Some(BackendCommand::RequestAdapterStatus);
            }
            _ => {}
        }
        ComponentResult::Consumed
    }
}
