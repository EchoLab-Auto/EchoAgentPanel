//! Scrollable chat transcript with mouse text selection support.
//!
//! Uses ratatui's built-in `Paragraph::scroll()` for smooth scrolling.
//! Line texts are built from rendered `Line` objects (not frame-buffer cells)
//! for accurate mouse coordinate → text index mapping.

use ratatui::layout::Rect;
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{
    Block, Borders, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState,
};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::event::Event;
use crate::state::{AppState, MsgRole, SPINNER};

#[derive(Debug, Default)]
pub struct ChatView;

impl ChatView {
    /// Build rendered lines from messages and return both the ratatui `Line`
    /// objects and their plain-text string representations.
    ///
    /// The text strings are used by `app.rs` for mouse coordinate → text
    /// mapping during selection.  `area_width` is the widget's outer width
    /// (the block's inner width is `area_width - 2`).
    pub fn build_lines(
        &self,
        state: &AppState,
        area_width: u16,
    ) -> (Vec<Line<'static>>, Vec<String>) {
        let messages = state.active_messages();
        let conv_width = area_width.saturating_sub(2) as usize;

        let thinking = state.llm_in_flight
            && messages
                .last()
                .is_some_and(|m| m.role == MsgRole::System && m.content == "… 思考中");
        let spinner = SPINNER[(state.anim_tick % SPINNER.len() as u64) as usize];
        let flash_active = state
            .chat_flash_until
            .is_some_and(|t| std::time::Instant::now() < t);

        let mut lines: Vec<Line> = Vec::new();
        let n = messages.len();
        for (i, m) in messages.iter().enumerate() {
            let is_last = i == n - 1;
            let flash = is_last && flash_active;
            let content = if thinking && is_last {
                format!("{spinner} 思考中")
            } else {
                m.content.clone()
            };
            lines.extend(render_message(
                m,
                &content,
                conv_width as u16,
                state.theme,
                flash,
            ));
        }

        let line_texts: Vec<String> = lines
            .iter()
            .map(|l| {
                l.spans
                    .iter()
                    .map(|s| s.content.as_ref())
                    .collect::<String>()
            })
            .collect();

        (lines, line_texts)
    }
}

impl Component for ChatView {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let block = Block::default()
            .borders(Borders::TOP)
            .border_style(theme.border);

        let (lines, _line_texts) = self.build_lines(state, area.width);

        let total = lines.len();
        let height = area.height.saturating_sub(1) as usize; // subtract top border
        let max_scroll = total.saturating_sub(height);

        // chat_scroll is "offset from bottom" — 0 = at bottom.
        let conv_scroll = state.chat_scroll.min(max_scroll);
        let top = max_scroll.saturating_sub(conv_scroll);

        let paragraph = Paragraph::new(lines).block(block).scroll((top as u16, 0));
        f.render_widget(paragraph, area);

        // Scrollbar.
        let mut scrollbar_state = ScrollbarState::new(total).position(top);
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
        // Scroll up — increase offset from bottom.
        if key.code == kb.scroll_up.code {
            state.chat_scroll = state.chat_scroll.saturating_add(10);
            return ComponentResult::Consumed;
        }
        // Scroll down — decrease offset from bottom.
        if key.code == kb.scroll_down.code {
            state.chat_scroll = state.chat_scroll.saturating_sub(10);
            return ComponentResult::Consumed;
        }
        // Scroll to top.
        if key.code == kb.scroll_top.code {
            state.chat_scroll = usize::MAX; // clamped to max_scroll at render time
            return ComponentResult::Consumed;
        }
        // Scroll to bottom.
        if key.code == kb.scroll_bottom.code {
            state.chat_scroll = 0;
            return ComponentResult::Consumed;
        }
        ComponentResult::Pass
    }
}

fn render_message(
    m: &crate::state::DisplayMessage,
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
        chrono::DateTime::from_timestamp(m.time, 0)
            .map(|d| {
                d.with_timezone(&chrono::Local)
                    .format("%H:%M:%S")
                    .to_string()
            })
            .unwrap_or_default()
    } else {
        String::new()
    };
    let time_str = if time.is_empty() {
        String::new()
    } else {
        format!(" [{time}]")
    };
    let header_style = if flash {
        Style::default().fg(color).bold().bg(theme.highlight_bg)
    } else {
        Style::default().fg(color).bold()
    };
    let header = Line::from(vec![
        Span::styled(label.to_string(), header_style),
        Span::styled(time_str, Style::default().fg(theme.faint)),
    ]);
    let mut out = vec![header];
    let body_style = if m.role == MsgRole::System {
        theme.dim
    } else {
        theme.fg
    };
    let wrap_width = width.saturating_sub(1) as usize;
    if wrap_width > 0 {
        for line in content.lines() {
            let mut current = String::new();
            let mut col = 0usize;
            for ch in line.chars() {
                if col >= wrap_width {
                    out.push(Line::from(Span::styled(
                        std::mem::take(&mut current),
                        body_style,
                    )));
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::state::{DisplayMessage, MsgRole};
    use crate::theme::Theme;

    fn test_state() -> AppState {
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        st.active_session_id = Some("s1".into());
        st.push_message(
            "s1",
            DisplayMessage {
                role: MsgRole::User,
                content: "你好".into(),
                time: 0,
            },
        );
        st
    }

    fn key_for(chord: crate::keybindings::KeyChord) -> Event {
        Event::Input(crossterm::event::Event::Key(
            crossterm::event::KeyEvent::new(chord.code, chord.modifiers),
        ))
    }

    #[test]
    fn build_lines_labels_messages() {
        let st = test_state();
        let view = ChatView;
        let (lines, texts) = view.build_lines(&st, 80);
        assert!(!lines.is_empty());
        assert_eq!(texts.len(), lines.len());
        // Header line contains the role label.
        assert!(texts[0].contains("你"));
        // Body line contains the content.
        assert!(texts.iter().any(|t| t.contains("你好")));
    }

    #[test]
    fn build_lines_wraps_long_content() {
        let mut st = test_state();
        st.push_message(
            "s1",
            DisplayMessage {
                role: MsgRole::Agent,
                content: "x".repeat(100),
                time: 0,
            },
        );
        let view = ChatView;
        let (lines, _) = view.build_lines(&st, 20); // narrow area → wrap
                                                    // Header + wrapped body chunks + blank line.
        assert!(
            lines.len() >= 6,
            "100 chars at width 18 must wrap to several lines, got {}",
            lines.len()
        );
    }

    #[test]
    fn handle_event_scroll_up_increases_offset() {
        let mut st = test_state();
        let mut view = ChatView;
        let event = key_for(st.keybindings.scroll_up);
        assert_eq!(
            view.handle_event(&event, &mut st),
            ComponentResult::Consumed
        );
        assert!(st.chat_scroll >= 10);
    }

    #[test]
    fn handle_event_scroll_down_never_underflows() {
        let mut st = test_state();
        let mut view = ChatView;
        let event = key_for(st.keybindings.scroll_down);
        assert_eq!(
            view.handle_event(&event, &mut st),
            ComponentResult::Consumed
        );
        assert_eq!(st.chat_scroll, 0, "saturating_sub must not underflow");
    }

    #[test]
    fn handle_event_scroll_top_and_bottom() {
        let mut st = test_state();
        let mut view = ChatView;
        let top = key_for(st.keybindings.scroll_top);
        assert_eq!(view.handle_event(&top, &mut st), ComponentResult::Consumed);
        assert_eq!(st.chat_scroll, usize::MAX);
        let bottom = key_for(st.keybindings.scroll_bottom);
        assert_eq!(
            view.handle_event(&bottom, &mut st),
            ComponentResult::Consumed
        );
        assert_eq!(st.chat_scroll, 0);
    }

    #[test]
    fn render_message_includes_timestamp_when_set() {
        let m = DisplayMessage {
            role: MsgRole::Agent,
            content: "hi".into(),
            time: 1700000000,
        };
        let lines = render_message(&m, "hi", 80, Theme::dark(), false);
        let text: String = lines
            .iter()
            .flat_map(|l| l.spans.iter().map(|s| s.content.as_ref()))
            .collect();
        assert!(text.contains("Agent"));
        assert!(text.contains("["), "timestamp should be shown");
    }
}
