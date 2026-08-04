//! Top status bar: connection state, model, provider, skills.
//!
//! 亮度层次：连接状态（title 最亮）> 模型/provider（fg）> 快捷键提示（faint 最弱）。
//! 动效：断开时连接点闪烁、LLM 在途 spinner、工具执行指示。

use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::state::{AppState, SPINNER};
use crate::event::Event;

#[derive(Debug, Default)]
pub struct StatusBar;

impl Component for StatusBar {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let status = &state.status;

        // Adapter indicator — a single dot showing if any adapter is connected.
        // Use /adapters to see full detail in a popup.
        let mut spans: Vec<Span> = Vec::new();
        let any_connected = status.adapters.iter().any(|a| a.connected);
        if status.adapters.is_empty() {
            spans.push(Span::styled("○", Style::default().fg(theme.dim)));
        } else if any_connected {
            spans.push(Span::styled("●", Style::default().fg(theme.success)));
        } else {
            spans.push(Span::styled("○", Style::default().fg(theme.error)));
        }

        // LLM 在途：spinner + 思考中（模型名前置）
        if state.llm_in_flight {
            let frame = SPINNER[(state.anim_tick % SPINNER.len() as u64) as usize];
            spans.push(Span::raw("  |  "));
            spans.push(Span::styled(format!("{frame} 思考中…"), theme.accent));
        }
        if !status.model.is_empty() {
            spans.push(Span::raw("  |  "));
            spans.push(Span::styled(format!("模型: {}", status.model), theme.fg));
        }
        if !status.provider.is_empty() {
            spans.push(Span::raw("  "));
            spans.push(Span::styled(format!("({})", status.provider), theme.subtitle));
        }
        // 当前会话（侧边栏移除后的身份提示）
        if let Some(s) = state.active_session() {
            spans.push(Span::raw("  |  "));
            let label = if s.group_name.is_some() {
                format!("会话: {}", s.nickname)
            } else {
                format!("会话: 💬 {}", s.nickname)
            };
            spans.push(Span::styled(label, theme.subtitle));
        }
        // 工具执行中：不确定进度条（░▒▓ 按帧扫动）
        if let Some((tool, started)) = &state.tool_in_flight {
            let elapsed_ms = started.elapsed().as_millis() as u64;
            let bar = "░▒▓".chars().nth(((elapsed_ms / 250) % 3) as usize).unwrap_or('░');
            spans.push(Span::raw("  |  "));
            spans.push(Span::styled(format!("工具 {tool} 执行中 {bar}"), theme.tool_fg));
        }
        if !status.skills.is_empty() {
            spans.push(Span::raw("  |  "));
            spans.push(Span::styled(format!("技能: {}", status.skills.len()), theme.tool_fg));
        }
        spans.push(Span::raw("  "));
        spans.push(Span::styled("Tab 选中输入 · ^X 前缀 · ^C×2 退出 · ? 帮助", theme.faint));

        f.render_widget(
            Paragraph::new(Line::from(spans)).style(Style::default().fg(theme.fg).bg(theme.bg)),
            area,
        );
    }

    fn handle_event(&mut self, _event: &Event, _state: &mut AppState) -> ComponentResult {
        ComponentResult::Pass
    }
}
