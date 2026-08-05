//! Top status bar: connection state, model, provider, skills.
//!
//! 亮度层次：连接状态（title 最亮）> 模型/provider（fg）> 快捷键提示（faint 最弱）。
//! 动效：断开时连接点闪烁、LLM 在途 spinner、工具执行指示。

use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::Line;
use ratatui::widgets::Paragraph;
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::event::Event;
use crate::state::{AppState, SPINNER};

#[derive(Debug, Default)]
pub struct StatusBar;

impl StatusBar {
    /// Plain-text status line (without styling). Pure function, unit-testable.
    fn status_text(&self, state: &AppState) -> String {
        let status = &state.status;

        // Adapter indicator — a single dot showing if any adapter is connected.
        let any_connected = status.adapters.iter().any(|a| a.connected);
        let mut parts: Vec<String> = Vec::new();
        if status.adapters.is_empty() {
            parts.push("○".into());
        } else if any_connected {
            parts.push("●".into());
        } else {
            parts.push("○".into());
        }

        // LLM 在途：spinner + 思考中（模型名前置）
        if state.llm_in_flight {
            let frame = SPINNER[(state.anim_tick % SPINNER.len() as u64) as usize];
            parts.push(format!("  |  {frame} 思考中…"));
        }
        if !status.model.is_empty() {
            parts.push(format!("  |  模型: {}", status.model));
        }
        if !status.provider.is_empty() {
            parts.push(format!("  ({})", status.provider));
        }
        // 当前会话（侧边栏移除后的身份提示）
        if let Some(s) = state.active_session() {
            let label = if s.group_name.is_some() {
                format!("会话: {}", s.nickname)
            } else {
                format!("会话: 💬 {}", s.nickname)
            };
            parts.push(format!("  |  {label}"));
        }
        // 工具执行中：不确定进度条（░▒▓ 按帧扫动）
        if let Some((tool, _started)) = &state.tool_in_flight {
            parts.push(format!("  |  工具 {tool} 执行中"));
        }
        if !status.skills.is_empty() {
            parts.push(format!("  |  技能: {}", status.skills.len()));
        }
        parts.push("  Tab 选中输入 · ^X 前缀 · ^C×2 退出 · ? 帮助".into());
        parts.concat()
    }
}

impl Component for StatusBar {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        f.render_widget(
            Paragraph::new(Line::from(self.status_text(state)))
                .style(Style::default().fg(theme.fg).bg(theme.bg)),
            area,
        );
    }

    fn handle_event(&mut self, _event: &Event, _state: &mut AppState) -> ComponentResult {
        ComponentResult::Pass
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::state::AdapterStatusEntry;
    use crate::theme::Theme;

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    #[test]
    fn shows_dim_dot_when_no_adapters() {
        let st = state();
        let bar = StatusBar;
        let text = bar.status_text(&st);
        assert!(text.starts_with("○"));
    }

    #[test]
    fn shows_solid_dot_when_connected() {
        let mut st = state();
        st.status.set_adapter_state(AdapterStatusEntry {
            name: "qq".into(),
            display_name: "qq".into(),
            connected: true,
            running: true,
            self_id: Some("10001".into()),
            bind_address: String::new(),
            started_at: None,
        });
        let bar = StatusBar;
        assert!(bar.status_text(&st).starts_with("●"));
    }

    #[test]
    fn shows_model_and_provider() {
        let mut st = state();
        st.status.model = "deepseek-v4-flash".into();
        st.status.provider = "deepseek".into();
        let bar = StatusBar;
        let text = bar.status_text(&st);
        assert!(text.contains("模型: deepseek-v4-flash"));
        assert!(text.contains("(deepseek)"));
    }

    #[test]
    fn shows_thinking_when_llm_in_flight() {
        let mut st = state();
        st.llm_in_flight = true;
        let bar = StatusBar;
        assert!(bar.status_text(&st).contains("思考中"));
    }

    #[test]
    fn shows_tool_and_skill_counters() {
        let mut st = state();
        st.tool_in_flight = Some(("calculator".into(), std::time::Instant::now()));
        st.status.skills = vec!["calc".into(), "web".into()];
        let bar = StatusBar;
        let text = bar.status_text(&st);
        assert!(text.contains("工具 calculator"));
        assert!(text.contains("技能: 2"));
    }

    #[test]
    fn always_shows_help_hint() {
        let st = state();
        let bar = StatusBar;
        assert!(bar.status_text(&st).contains("Tab 选中输入"));
    }
}
