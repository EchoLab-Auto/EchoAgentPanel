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
use crate::event::Event;
use crate::state::{AgentPhase, AppState, PaletteMode};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteAction {
    ConfigureApi,
    RequestState,
    SwitchSession,
    ToggleHelp,
    Quit,
}

const ACTIONS: &[(PaletteAction, &str)] = &[
    (PaletteAction::ConfigureApi, "配置 API (provider/model/key)"),
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
    /// 会话列表标签（按最近活跃排序，当前会话标 ●）。纯函数，测试专用。
    #[cfg(test)]
    fn session_labels(&self, state: &AppState) -> Vec<String> {
        let mut sessions = state.sessions.clone();
        sessions.sort_by(|a, b| b.last_active.cmp(&a.last_active));
        sessions
            .iter()
            .map(|s| {
                let active = state.active_session_id.as_deref() == Some(s.id.as_str());
                let name = session_display_name(s);
                let marker = if active { "● " } else { "○ " };
                let phase = session_phase_label(state, &s.id);
                let preview: String = s.last_message.chars().take(24).collect();
                let preview_part = if preview.is_empty() {
                    String::new()
                } else {
                    format!("  {preview}")
                };
                format!("{marker}{phase}{name}{preview_part}")
            })
            .collect()
    }

    /// 会话列表项（按最近活跃排序，当前会话标 ●）。
    fn session_items<'a>(&self, state: &'a AppState) -> Vec<ListItem<'a>> {
        let theme = state.theme;
        let mut sessions = state.sessions.clone();
        sessions.sort_by(|a, b| b.last_active.cmp(&a.last_active));
        sessions
            .iter()
            .map(|s| {
                let active = state.active_session_id.as_deref() == Some(s.id.as_str());
                let name = session_display_name(s);
                let marker = if active { "● " } else { "○ " };
                let phase = state
                    .agent_activities
                    .get(&s.id)
                    .map(|activity| activity.phase);
                let phase_label = session_phase_label(state, &s.id);
                let name_style = if active {
                    Style::default().fg(theme.title).bold()
                } else {
                    Style::default().fg(theme.fg)
                };
                let preview: String = s.last_message.chars().take(24).collect();
                ListItem::new(Line::from(vec![
                    Span::styled(marker, name_style),
                    Span::styled(
                        phase_label,
                        Style::default()
                            .fg(match phase {
                                Some(AgentPhase::Tool) => theme.tool_fg,
                                Some(AgentPhase::Subagent) => theme.accent,
                                Some(AgentPhase::Completed) => theme.success,
                                Some(AgentPhase::Failed) => theme.error,
                                Some(AgentPhase::Thinking) => theme.agent_fg,
                                None => theme.faint,
                            })
                            .bold(),
                    ),
                    Span::styled(name, name_style),
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

fn session_display_name(session: &echo_agent::SessionInfo) -> String {
    match (session.platform.as_str(), session.scope.as_str()) {
        ("local", _) => "[后台] 本地会话".into(),
        ("qq", "group") => format!(
            "[QQ 群] {} · {}",
            session.group_name.as_deref().unwrap_or("未知群"),
            session.nickname
        ),
        ("qq", _) => format!("[QQ 私聊] {} ({})", session.nickname, session.user_id),
        (platform, scope) => format!("[{platform}/{scope}] {}", session.nickname),
    }
}

fn session_phase_label(state: &AppState, session_id: &str) -> String {
    match state
        .agent_activities
        .get(session_id)
        .map(|activity| activity.phase)
    {
        Some(AgentPhase::Thinking) => "[思考] ",
        Some(AgentPhase::Tool) => "[工具] ",
        Some(AgentPhase::Subagent) => "[子任务] ",
        Some(AgentPhase::Completed) => "[完成] ",
        Some(AgentPhase::Failed) => "[失败] ",
        None => "",
    }
    .into()
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

    fn state_with_sessions() -> AppState {
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        st.sessions = vec![
            echo_agent::SessionInfo {
                id: "old".into(),
                platform: "qq".into(),
                nickname: "alice".into(),
                scope: "dm".into(),
                user_id: "123".into(),
                group_name: None,
                last_active: 100,
                last_message: "hi".into(),
            },
            echo_agent::SessionInfo {
                id: "new".into(),
                platform: "qq".into(),
                nickname: "bob".into(),
                scope: "group".into(),
                user_id: "456".into(),
                group_name: Some("testers".into()),
                last_active: 200,
                last_message: String::new(),
            },
        ];
        st.active_session_id = Some("old".into());
        st
    }

    #[test]
    fn actions_returns_all_five() {
        let palette = CommandPalette;
        assert_eq!(palette.actions().len(), 5);
        assert!(palette.actions().contains(&PaletteAction::Quit));
        assert!(palette.actions().contains(&PaletteAction::ConfigureApi));
    }

    #[test]
    fn session_labels_sorted_by_recency_with_active_marker() {
        let st = state_with_sessions();
        let palette = CommandPalette;
        let labels = palette.session_labels(&st);
        assert_eq!(labels.len(), 2);
        // Most recent first: bob (last_active 200) before alice (100).
        assert!(labels[0].contains("bob"), "got: {}", labels[0]);
        assert!(
            labels[1].contains("●"),
            "active session must be marked: {}",
            labels[1]
        );
        assert!(labels[1].contains("alice"));
        assert!(labels[0].contains("[QQ 群]"));
        assert!(labels[1].contains("[QQ 私聊]"));
    }

    #[test]
    fn session_labels_expose_background_activity() {
        let mut state = state_with_sessions();
        state.start_agent_activity("new");
        state
            .activity_mut("old")
            .transition(AgentPhase::Subagent, Some("task".into()));
        let labels = CommandPalette.session_labels(&state);
        assert!(labels[0].contains("[思考]"));
        assert!(labels[1].contains("[子任务]"));
    }

    #[test]
    fn down_navigates_with_wraparound() {
        let mut st = state_with_sessions();
        st.palette_mode = PaletteMode::Commands; // 5 actions
        let mut palette = CommandPalette;
        let ev = key(KeyCode::Down, KeyEventKind::Press);
        assert_eq!(
            palette.handle_event(&ev, &mut st),
            ComponentResult::Consumed
        );
        assert_eq!(st.palette_selection, 1);
        // Wrap from last to first.
        st.palette_selection = 4;
        assert_eq!(
            palette.handle_event(&ev, &mut st),
            ComponentResult::Consumed
        );
        assert_eq!(st.palette_selection, 0);
    }

    #[test]
    fn up_never_underflows() {
        let mut st = state_with_sessions();
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
        let mut st = state_with_sessions();
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
        let mut st = state_with_sessions();
        let mut palette = CommandPalette;
        let ev = key(KeyCode::Down, KeyEventKind::Release);
        assert_eq!(palette.handle_event(&ev, &mut st), ComponentResult::Pass);
        assert_eq!(st.palette_selection, 0);
    }
}
