//! Keybinding help modal ('?').

use crossterm::event::{KeyCode, KeyEventKind};
use ratatui::layout::{Alignment, Rect};
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, Paragraph};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::state::AppState;
use crate::event::Event;

#[derive(Debug, Default)]
pub struct HelpPopup;

impl Component for HelpPopup {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let kb = &state.keybindings;
        let rows: Vec<&str> = vec![
            "Tab                选中输入框（进入输入模式）",
            "Esc                取消输入框选中",
            "Enter              发送消息 / 面板中执行",
            "Shift+Enter        换行",
            "/cmd               输入框命令菜单 (/help /api /switch ...)",
            "Ctrl+P             命令面板（命令 / 会话列表）",
            "Ctrl+X 然后 o      切换会话",
            "Ctrl+X 然后 s      配置 API (provider/model/key)",
            "Ctrl+C (两次)       退出程序（第一次提示确认）",
            "PgUp / PgDn        聊天区滚动",
            "Home / End         滚动到顶部 / 底部",
            "?                   打开 / 关闭本帮助",
        ];
        let w = 44u16.min(area.width.saturating_sub(4));
        let h = rows.len() as u16 + 4;
        let x = area.width.saturating_sub(w) / 2;
        let y = area.height.saturating_sub(h) / 2;
        let rect = Rect::new(x, y, w, h);

        f.render_widget(Clear, rect);
        let lines: Vec<Line> = rows.iter().map(|r| Line::from(*r)).collect();
        let p = Paragraph::new(lines)
            .alignment(Alignment::Left)
            .style(Style::default().fg(theme.fg))
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded)
                    .border_style(theme.border_focused)
                    .title(Span::styled(" 按键绑定 ", Style::default().fg(theme.title).bold())),
            );
        f.render_widget(p, rect);
        let _ = kb;
    }

    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult {
        let Event::Input(crossterm::event::Event::Key(key)) = event else {
            return ComponentResult::Pass;
        };
        if key.kind == KeyEventKind::Press
            && (key.code == KeyCode::Esc || key.code == KeyCode::Char('?'))
        {
            state.show_help = false;
            return ComponentResult::Consumed;
        }
        ComponentResult::Pass
    }
}
