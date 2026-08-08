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
use crate::state::{
    AgentPhase, AppState, InboundMessage, MessageMetadata, MsgRole, ToolMessage, ToolMessageStatus,
    SPINNER,
};

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

        let flash_active = state
            .chat_flash_until
            .is_some_and(|t| std::time::Instant::now() < t);

        let mut lines: Vec<Line> = Vec::new();
        let n = messages.len();
        for (i, m) in messages.iter().enumerate() {
            let is_last = i == n - 1;
            let flash = is_last && flash_active;
            lines.extend(render_message(
                m,
                &m.content,
                conv_width as u16,
                state.theme,
                flash,
                state.anim_tick,
            ));
        }

        if let Some(activity) = state
            .active_activity()
            .filter(|activity| activity.phase.is_busy())
        {
            lines.extend(render_activity(activity, state, conv_width as u16));
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
    anim_tick: u64,
) -> Vec<Line<'static>> {
    if let Some(MessageMetadata::Tool(tool)) = &m.metadata {
        return render_tool_message(tool, width, theme, anim_tick);
    }
    let (label, color) = match (&m.role, &m.metadata) {
        (MsgRole::User, Some(MessageMetadata::Inbound(source))) => {
            (inbound_label(source), theme.user_fg)
        }
        (MsgRole::User, _) => ("后台输入".into(), theme.user_fg),
        (MsgRole::Backend, _) => ("Agent 后台输出".into(), theme.agent_fg),
        (MsgRole::Reasoning, _) => ("Agent 思考".into(), theme.subtitle),
        (MsgRole::Tool, _) => ("工具".into(), theme.tool_fg),
        (MsgRole::System, _) => ("系统".into(), theme.system_fg),
    };
    let time = if m.time > 0 {
        chrono::DateTime::from_timestamp(m.time, 0)
            .map(|d| {
                d.with_timezone(&chrono::Local)
                    .format("%m-%d %H:%M:%S %:z")
                    .to_string()
            })
            .unwrap_or_default()
    } else {
        String::new()
    };
    let mut time_parts = (!time.is_empty())
        .then_some(time)
        .into_iter()
        .collect::<Vec<_>>();
    if let Some(MessageMetadata::Inbound(source)) = &m.metadata {
        if source.received_at_ms > 0
            && source
                .received_at_ms
                .saturating_sub(m.time.saturating_mul(1000))
                .abs()
                >= 1_000
        {
            if let Some(received) = chrono::DateTime::from_timestamp_millis(source.received_at_ms) {
                time_parts.push(format!(
                    "收 {}",
                    received
                        .with_timezone(&chrono::Local)
                        .format("%H:%M:%S%.3f")
                ));
            }
        }
        if source.message_sequence > 0 {
            time_parts.push(format!("#{}", source.message_sequence));
        }
    }
    let time_str = if time_parts.is_empty() {
        String::new()
    } else {
        format!(" [{}]", time_parts.join(" · "))
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
    let body_style = if matches!(m.role, MsgRole::System | MsgRole::Reasoning) {
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
                let char_width = crate::util::str_visual_width(&ch.to_string());
                if col + char_width > wrap_width && !current.is_empty() {
                    out.push(Line::from(Span::styled(
                        std::mem::take(&mut current),
                        body_style,
                    )));
                    col = 0;
                }
                current.push(ch);
                col += char_width;
            }
            out.push(Line::from(Span::styled(current, body_style)));
        }
    } else {
        out.push(Line::from(Span::styled(content.to_string(), body_style)));
    }
    out.push(Line::default());
    out
}

fn inbound_label(source: &InboundMessage) -> String {
    if source.adapter_name.eq_ignore_ascii_case("local")
        || source.platform.eq_ignore_ascii_case("local")
    {
        return "后台输入".into();
    }
    let sender = if source.user_name.trim().is_empty() {
        source.user_id.clone()
    } else {
        format!("{} ({})", source.user_name, source.user_id)
    };
    if source.platform.eq_ignore_ascii_case("qq") {
        if source.channel.starts_with("group:") {
            let group = source
                .group_name
                .as_deref()
                .filter(|name| !name.trim().is_empty())
                .or_else(|| source.channel.strip_prefix("group:"))
                .unwrap_or("未知群");
            return format!("QQ 群 · {group} · {sender}");
        }
        return format!("QQ 私聊 · {sender}");
    }
    format!("{} · {sender}", source.platform)
}

fn render_tool_message(
    tool: &ToolMessage,
    width: u16,
    theme: crate::theme::Theme,
    anim_tick: u64,
) -> Vec<Line<'static>> {
    let (symbol, status, color, elapsed) = match tool.status {
        ToolMessageStatus::Running => (
            SPINNER[(anim_tick % SPINNER.len() as u64) as usize],
            "执行中",
            theme.tool_fg,
            tool.started_at.elapsed(),
        ),
        ToolMessageStatus::Succeeded => {
            ('✓', "完成", theme.success, tool.elapsed.unwrap_or_default())
        }
        ToolMessageStatus::Failed => ('×', "失败", theme.error, tool.elapsed.unwrap_or_default()),
    };
    let heading = truncate_visual(
        &format!(
            "{symbol} 工具 · {} · {status} · {}",
            tool.name,
            super::status_bar::format_duration(elapsed)
        ),
        width as usize,
    );
    let mut lines = vec![Line::from(Span::styled(
        heading,
        Style::default().fg(color).bold(),
    ))];
    if !tool.input.is_empty() {
        lines.extend(render_detail_line("输入", &tool.input, width, theme.dim));
    }
    if let Some(output) = &tool.output {
        let label = if tool.status == ToolMessageStatus::Failed {
            "错误"
        } else {
            "结果"
        };
        lines.extend(render_detail_line(label, output, width, theme.fg));
    }
    lines.push(Line::default());
    lines
}

fn render_detail_line(
    label: &'static str,
    content: &str,
    width: u16,
    color: ratatui::style::Color,
) -> Vec<Line<'static>> {
    let prefix = format!("  {label}  ");
    let prefix_width = crate::util::str_visual_width(&prefix);
    let available = (width as usize).saturating_sub(prefix_width);
    let content = truncate_visual(content, available);
    vec![Line::from(vec![
        Span::styled(prefix, Style::default().fg(color).bold()),
        Span::styled(content, Style::default().fg(color)),
    ])]
}

fn render_activity(
    activity: &crate::state::AgentActivity,
    state: &AppState,
    width: u16,
) -> Vec<Line<'static>> {
    let spinner = SPINNER[(state.anim_tick % SPINNER.len() as u64) as usize];
    let (phase, color) = match activity.phase {
        AgentPhase::Thinking => ("Agent 正在思考", state.theme.agent_fg),
        AgentPhase::Tool => ("Agent 正在调用工具", state.theme.tool_fg),
        AgentPhase::Subagent => ("Subagent 正在工作", state.theme.accent),
        AgentPhase::Completed | AgentPhase::Failed => return Vec::new(),
    };
    let mut title = format!(
        "{spinner} {phase} · {}",
        super::status_bar::format_duration(activity.phase_elapsed())
    );
    if let Some(detail) = &activity.detail {
        title.push_str(&format!(" · {detail}"));
    }
    title = truncate_visual(&title, width as usize);
    let mut summary = Vec::new();
    if activity.tools_completed > 0 {
        summary.push(format!("工具 {}", activity.tools_completed));
    }
    if activity.subagents_completed > 0 {
        summary.push(format!("Subagent {}", activity.subagents_completed));
    }
    let mut lines = vec![
        Line::from(Span::styled(
            "─".repeat(width.min(24) as usize),
            Style::default().fg(state.theme.border),
        )),
        Line::from(Span::styled(title, Style::default().fg(color).bold())),
    ];
    if !summary.is_empty() {
        lines.push(Line::from(Span::styled(
            format!("  本轮已完成 {}", summary.join(" · ")),
            state.theme.dim,
        )));
    }
    lines
}

fn truncate_visual(value: &str, max_width: usize) -> String {
    if crate::util::str_visual_width(value) <= max_width {
        return value.to_string();
    }
    if max_width == 0 {
        return String::new();
    }
    let ellipsis_width = crate::util::str_visual_width("…");
    let content_width = max_width.saturating_sub(ellipsis_width);
    let mut output = String::new();
    let mut width = 0;
    for ch in value.chars() {
        let char_width = crate::util::str_visual_width(&ch.to_string());
        if width + char_width > content_width {
            break;
        }
        output.push(ch);
        width += char_width;
    }
    output.push('…');
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::state::{DisplayMessage, MsgRole};
    use crate::theme::Theme;

    fn test_state() -> AppState {
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        st.push_message("s1", DisplayMessage::plain(MsgRole::User, "你好", 0));
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
        assert!(texts[0].contains("后台输入"));
        // Body line contains the content.
        assert!(texts.iter().any(|t| t.contains("你好")));
    }

    #[test]
    fn build_lines_wraps_long_content() {
        let mut st = test_state();
        st.push_message(
            "s1",
            DisplayMessage::plain(MsgRole::Backend, "x".repeat(100), 0),
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
    fn build_lines_wraps_cjk_by_terminal_column_width() {
        let mut state = test_state();
        state
            .messages
            .get_mut(crate::state::TRUNK_SESSION_ID)
            .unwrap()[0]
            .content = "中文中文中文".into();
        let (_, texts) = ChatView.build_lines(&state, 8);
        let body: Vec<_> = texts
            .iter()
            .filter(|line| line.contains('中') || line.contains('文'))
            .collect();
        assert!(body.len() >= 2, "CJK text should wrap by visual width");
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
        let m = DisplayMessage::plain(MsgRole::Backend, "hi", 1700000000);
        let lines = render_message(&m, "hi", 80, Theme::dark(), false, 0);
        let text: String = lines
            .iter()
            .flat_map(|l| l.spans.iter().map(|s| s.content.as_ref()))
            .collect();
        assert!(text.contains("后台"));
        assert!(text.contains("["), "timestamp should be shown");
    }

    #[test]
    fn inbound_headers_distinguish_qq_private_group_and_backend_inputs() {
        let private = DisplayMessage {
            role: MsgRole::User,
            content: "hi".into(),
            time: 0,
            metadata: Some(MessageMetadata::Inbound(InboundMessage {
                adapter_name: "qq".into(),
                platform: "qq".into(),
                user_id: "123".into(),
                user_name: "alice".into(),
                channel: "direct".into(),
                group_name: None,
                received_at_ms: 0,
                message_sequence: 7,
            })),
        };
        let group = DisplayMessage {
            metadata: Some(MessageMetadata::Inbound(InboundMessage {
                channel: "group:456".into(),
                group_name: Some("开发群".into()),
                ..match private.metadata.clone().unwrap() {
                    MessageMetadata::Inbound(source) => source,
                    MessageMetadata::Tool(_) => unreachable!(),
                }
            })),
            ..private.clone()
        };
        let backend = DisplayMessage::plain(MsgRole::User, "local", 0);
        let backend_in_qq_session = DisplayMessage {
            metadata: Some(MessageMetadata::Inbound(InboundMessage {
                adapter_name: "local".into(),
                platform: "qq".into(),
                user_id: "123".into(),
                user_name: "local user".into(),
                channel: "direct".into(),
                group_name: None,
                received_at_ms: 0,
                message_sequence: 8,
            })),
            ..backend.clone()
        };

        let text = |message: &DisplayMessage| {
            render_message(message, &message.content, 100, Theme::dark(), false, 0)
                .into_iter()
                .flat_map(|line| line.spans.into_iter().map(|span| span.content.into_owned()))
                .collect::<String>()
        };
        assert!(text(&private).contains("QQ 私聊 · alice (123)"));
        assert!(text(&private).contains("#7"));
        assert!(text(&group).contains("QQ 群 · 开发群 · alice (123)"));
        assert!(text(&backend).contains("后台输入"));
        assert!(text(&backend_in_qq_session).contains("后台输入"));
    }

    #[test]
    fn running_activity_is_rendered_without_persisting_placeholder_message() {
        let mut state = test_state();
        state.start_agent_activity("s1");
        let (_, texts) = ChatView.build_lines(&state, 80);
        assert!(texts.iter().any(|text| text.contains("Agent 正在思考")));
        assert_eq!(state.active_messages().len(), 1);
    }

    #[test]
    fn tool_message_shows_status_input_result_and_elapsed_time() {
        let message = DisplayMessage {
            role: MsgRole::Tool,
            content: "calculator".into(),
            time: 0,
            metadata: Some(MessageMetadata::Tool(ToolMessage {
                name: "calculator".into(),
                input: "expression=1+1".into(),
                output: Some("2".into()),
                status: ToolMessageStatus::Succeeded,
                started_at: std::time::Instant::now(),
                elapsed: Some(std::time::Duration::from_millis(20)),
            })),
        };
        let lines = render_message(&message, "", 80, Theme::dark(), false, 0);
        let text = lines
            .iter()
            .flat_map(|line| line.spans.iter().map(|span| span.content.as_ref()))
            .collect::<String>();
        assert!(text.contains("工具 · calculator · 完成"));
        assert!(text.contains("输入"));
        assert!(text.contains("结果"));
    }

    #[test]
    fn visual_truncation_respects_cjk_width() {
        let value = truncate_visual("中文abcdef", 6);
        assert!(crate::util::str_visual_width(&value) <= 6);
        assert!(value.ends_with('…'));
    }
}
