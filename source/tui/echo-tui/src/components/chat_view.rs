//! Scrollable chat transcript.
//!
//! 亮度层次：消息头（角色色加粗）> 正文（fg）> 工具/系统（dim）> 时间戳（faint）。
//! 动效：思考中 spinner（llm_in_flight 驱动）、新消息到达头行高亮闪烁。

use ratatui::layout::Rect;
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::app::{AppState, MsgRole, SPINNER};
use crate::event::Event;

#[derive(Debug, Default)]
pub struct ChatView;

impl Component for ChatView {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let block = Block::default().borders(Borders::TOP).border_style(theme.border);

        let messages = state.active_messages();
        let inner = block.inner(area);
        let height = inner.height as usize;

        // 思考中动效：最后一条是占位符且 LLM 在途 → 用 spinner 替换文本
        let thinking = state.llm_in_flight
            && messages.last().is_some_and(|m| m.role == MsgRole::System && m.content == "… 思考中");
        let spinner = SPINNER[(state.anim_tick % SPINNER.len() as u64) as usize];

        // 新消息到达高亮窗口
        let flash_active = state
            .chat_flash_until
            .is_some_and(|t| std::time::Instant::now() < t);

        // Compute the rendered line list (each message may wrap).
        let mut lines: Vec<Line> = Vec::new();
        let n = messages.len();
        for (i, m) in messages.iter().enumerate() {
            let is_last = i == n - 1;
            let flash = is_last && flash_active;
            let content = if thinking && is_last { format!("{spinner} 思考中") } else { m.content.clone() };
            lines.extend(render_message(m, &content, inner.width, theme, flash));
        }

        // Scroll: keep chat_scroll as "offset from bottom" convention — 0 = bottom。
        // chat_at_top 单独标记"滚到顶"状态（不再用 usize::MAX 哨兵，
        // 否则 PgDn 永远无法从顶部滚下来）。
        let total = lines.len();
        let max_offset = total.saturating_sub(height);
        let offset = if state.chat_at_top {
            0
        } else {
            max_offset.saturating_sub(state.chat_scroll.min(max_offset))
        };
        let visible: Vec<Line> = lines
            .iter()
            .skip(offset)
            .take(height)
            .cloned()
            .collect();

        let paragraph = Paragraph::new(visible).block(block);
        f.render_widget(paragraph, area);

        let mut scrollbar_state = ScrollbarState::new(total).position(offset);
        f.render_stateful_widget(
            Scrollbar::new(ScrollbarOrientation::VerticalRight)
                .begin_symbol(Some("↑"))
                .end_symbol(Some("↓"))
                .thumb_style(Style::default().fg(theme.border_focused)),
            area,
            &mut scrollbar_state,
        );
    }

    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult {
        let Event::Input(crossterm::event::Event::Key(key)) = event else {
            return ComponentResult::Pass;
        };
        let kb = &state.keybindings;
        if key.code == kb.scroll_up.code {
            if state.chat_at_top {
                state.chat_at_top = false;
            } else {
                state.chat_scroll = state.chat_scroll.saturating_add(10);
            }
            return ComponentResult::Consumed;
        }
        if key.code == kb.scroll_down.code {
            state.chat_at_top = false;
            state.chat_scroll = state.chat_scroll.saturating_sub(10);
            return ComponentResult::Consumed;
        }
        if key.code == kb.scroll_top.code {
            state.chat_at_top = true;
            return ComponentResult::Consumed;
        }
        if key.code == kb.scroll_bottom.code {
            state.chat_at_top = false;
            state.chat_scroll = 0;
            return ComponentResult::Consumed;
        }
        ComponentResult::Pass
    }
}

fn render_message(
    m: &crate::app::DisplayMessage,
    content: &str,
    width: u16,
    theme: crate::theme::Theme,
    flash: bool,
) -> Vec<Line<'static>> {
    let (label, color) = match m.role {
        MsgRole::User => ("你", theme.user_fg),
        MsgRole::Agent => ("Agent", theme.agent_fg),
        MsgRole::Tool => ("工具", theme.tool_fg),
        MsgRole::System => ("系统", theme.system_fg),
    };
    let time = if m.time > 0 {
        let s = chrono::DateTime::from_timestamp(m.time, 0)
            .map(|d| d.with_timezone(&chrono::Local).format("%H:%M:%S").to_string())
            .unwrap_or_default();
        format!(" [{s}]")
    } else {
        String::new()
    };
    let header_style = if flash {
        // 新消息到达：头行用高亮背景短暂闪烁
        Style::default().fg(color).bold().bg(theme.highlight_bg)
    } else {
        Style::default().fg(color).bold()
    };
    let header = Line::from(vec![
        Span::styled(format!("{label}"), header_style),
        Span::styled(time, Style::default().fg(theme.faint)),
    ]);
    let mut out = vec![header];
    // word-wrap the body: 正文 fg，系统消息降一档为 dim。
    // 用增量列计数避免 O(n²)。
    let body_style = if m.role == MsgRole::System { theme.dim } else { theme.fg };
    let wrap_width = width.saturating_sub(1) as usize;
    if wrap_width > 0 {
        for line in content.lines() {
            let mut current = String::new();
            let mut col = 0usize;
            for ch in line.chars() {
                if col >= wrap_width {
                    out.push(Line::from(Span::styled(std::mem::take(&mut current), body_style)));
                    col = 0;
                }
                current.push(ch);
                col += 1;
            }
            out.push(Line::from(Span::styled(current, body_style)));
        }
    } else {
        out.push(Line::from(Span::styled(content.to_string(), body_style)));
    }
    out.push(Line::default());
    out
}
