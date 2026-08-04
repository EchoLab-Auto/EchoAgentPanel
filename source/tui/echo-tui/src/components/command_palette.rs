//! Command palette (Ctrl+P): dual-mode selectable list.
//!
//! - Commands 模式：固定动作列表（配置 API / 清空会话 / 切换会话 / 帮助 / 退出）
//! - Sessions 模式：会话切换列表（按最近活跃排序，当前会话预选）
//!
//! 会话栏移除后，会话切换的唯一入口在这里（Ctrl+P → 切换会话，或 leader+o）。

use crossterm::event::{KeyCode, KeyEventKind};
use ratatui::layout::{Alignment, Rect};
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, List, ListItem, ListState, Paragraph};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::app::{AppState, PaletteMode};
use crate::event::Event;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteAction {
    ConfigureApi,
    ClearSession,
    RequestState,
    SwitchSession,
    ToggleHelp,
    Quit,
}

const ACTIONS: &[(PaletteAction, &str)] = &[
    (PaletteAction::ConfigureApi, "配置 API (provider/model/key)"),
    (PaletteAction::ClearSession, "清空当前会话"),
    (PaletteAction::SwitchSession, "切换会话"),
    (PaletteAction::RequestState, "刷新会话列表"),
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

impl CommandPalette {
    /// 会话列表项（按最近活跃排序，当前会话标 ●）。
    fn session_items<'a>(&self, state: &'a AppState) -> Vec<ListItem<'a>> {
        let theme = state.theme;
        let mut sessions = state.sessions.clone();
        sessions.sort_by(|a, b| b.last_active.cmp(&a.last_active));
        sessions
            .iter()
            .map(|s| {
                let active = state.active_session_id.as_deref() == Some(s.id.as_str());
                let name = if s.group_name.is_some() {
                    s.nickname.clone()
                } else {
                    format!("💬 {}", s.nickname)
                };
                let marker = if active { "● " } else { "○ " };
                let name_style = if active {
                    Style::default().fg(theme.title).bold()
                } else {
                    Style::default().fg(theme.fg)
                };
                let preview: String = s.last_message.chars().take(24).collect();
                ListItem::new(Line::from(vec![
                    Span::styled(format!("{marker}{name}"), name_style),
                    if preview.is_empty() {
                        Span::styled("", theme.faint)
                    } else {
                        Span::styled(format!("  {preview}"), theme.dim)
                    },
                ]))
            })
            .collect()
    }
}

impl Component for CommandPalette {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let (items, title, h) = match state.palette_mode {
            PaletteMode::Commands => {
                let items: Vec<ListItem> = ACTIONS
                    .iter()
                    .map(|(_, label)| ListItem::new(Line::from(*label)))
                    .collect();
                let h = ACTIONS.len() as u16 + 4;
                (items, " 命令 ".to_string(), h)
            }
            PaletteMode::Sessions => {
                let items = self.session_items(state);
                if items.is_empty() {
                    let empty = vec![ListItem::new(Line::from("暂无会话（收到消息后自动创建）"))];
                    (empty, " 切换会话 ".to_string(), 5)
                } else {
                    let h = items.len() as u16 + 4;
                    (items, " 切换会话 ".to_string(), h)
                }
            }
        };
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
        let list = List::new(items)
            .block(block)
            .highlight_style(Style::default().bg(theme.highlight_bg).fg(theme.title).bold());
        let mut list_state = ListState::default();
        list_state.select(Some(state.palette_selection.min(rect.height.saturating_sub(4) as usize)));
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
        let len = match state.palette_mode {
            PaletteMode::Commands => ACTIONS.len(),
            PaletteMode::Sessions => state.sessions.len().max(1),
        };
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
