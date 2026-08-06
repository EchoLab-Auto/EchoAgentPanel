//! Two-line runtime status panel.
//!
//! The first row answers where the agent is connected. The second row answers
//! what the active conversation is doing right now.

use std::time::Duration;

use ratatui::layout::Rect;
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::event::Event;
use crate::state::{AgentPhase, AppState, SPINNER};

#[derive(Debug, Default)]
pub struct StatusBar;

impl StatusBar {
    /// Plain text rows, kept separate from styling for responsive tests.
    fn status_text(&self, state: &AppState, width: u16) -> (String, String) {
        let connection = connection_text(state);
        let mut context = connection;
        if let Some(session) = state.active_session() {
            let scope = if session.group_name.is_some() {
                "群聊"
            } else if session.platform == "local" {
                "本地"
            } else {
                "私聊"
            };
            context.push_str(&format!("  |  {scope} · {}", session.nickname));
        }
        if !state.status.model.is_empty() {
            context.push_str(&format!("  |  {}", state.status.model));
            if width >= 110 && !state.status.provider.is_empty() {
                context.push_str(&format!(" ({})", state.status.provider));
            }
        }
        if width >= 130 && !state.status.skills.is_empty() {
            context.push_str(&format!("  |  技能 {}", state.status.skills.len()));
        }

        let mut runtime = runtime_text(state);
        if width >= 100 {
            runtime.push_str("  |  ^X 命令  ? 帮助  ^C×2 退出");
        }
        (
            fit_width(&context, width as usize),
            fit_width(&runtime, width as usize),
        )
    }
}

impl Component for StatusBar {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let (context, runtime) = self.status_text(state, area.width);
        let runtime_color = match state.active_activity().map(|activity| activity.phase) {
            Some(AgentPhase::Tool) => theme.tool_fg,
            Some(AgentPhase::Subagent) => theme.accent,
            Some(AgentPhase::Completed) => theme.success,
            Some(AgentPhase::Failed) => theme.error,
            Some(AgentPhase::Thinking) => theme.agent_fg,
            None => theme.dim,
        };
        let lines = vec![
            Line::from(Span::styled(context, Style::default().fg(theme.fg))),
            Line::from(Span::styled(
                runtime,
                Style::default().fg(runtime_color).bold(),
            )),
        ];
        f.render_widget(
            Paragraph::new(lines).style(Style::default().bg(theme.panel_bg)),
            area,
        );
    }

    fn handle_event(&mut self, _event: &Event, _state: &mut AppState) -> ComponentResult {
        ComponentResult::Pass
    }
}

fn connection_text(state: &AppState) -> String {
    if state.status.adapters.is_empty() {
        return "○ 适配器状态未知".into();
    }
    let connected: Vec<_> = state
        .status
        .adapters
        .iter()
        .filter(|adapter| adapter.connected)
        .map(|adapter| adapter.display_name.as_str())
        .collect();
    if !connected.is_empty() {
        format!("● {} 已连接", connected.join(", "))
    } else if state.status.adapters.iter().any(|adapter| adapter.running) {
        "◐ 适配器运行中，等待连接".into()
    } else {
        "○ 适配器未运行".into()
    }
}

fn runtime_text(state: &AppState) -> String {
    let spinner = SPINNER[(state.anim_tick % SPINNER.len() as u64) as usize];
    let mut text = match state.active_activity() {
        None => "Agent 就绪".into(),
        Some(activity) => match activity.phase {
            AgentPhase::Thinking => format!(
                "{spinner} Agent 运行中 · 思考 · {}",
                format_duration(activity.phase_elapsed())
            ),
            AgentPhase::Tool => format!(
                "{spinner} Agent 运行中 · 工具 {} · {}",
                activity.detail.as_deref().unwrap_or("未知"),
                format_duration(activity.phase_elapsed())
            ),
            AgentPhase::Subagent => format!(
                "{spinner} Subagent 运行中 · {} · {}",
                activity.detail.as_deref().unwrap_or("分析任务"),
                format_duration(activity.phase_elapsed())
            ),
            AgentPhase::Completed => completed_text(activity, "✓ Agent 已完成"),
            AgentPhase::Failed => {
                let mut value = completed_text(activity, "× Agent 失败");
                if let Some(detail) = &activity.detail {
                    value.push_str(&format!(" · {detail}"));
                }
                value
            }
        },
    };
    let current_is_busy = state
        .active_activity()
        .is_some_and(|activity| activity.phase.is_busy()) as usize;
    let other_busy = state.busy_session_count().saturating_sub(current_is_busy);
    if other_busy > 0 {
        text.push_str(&format!("  |  其他运行会话 {other_busy}"));
    }
    text
}

fn completed_text(activity: &crate::state::AgentActivity, prefix: &str) -> String {
    let mut parts = vec![
        prefix.to_string(),
        format_duration(activity.total_elapsed()),
    ];
    if activity.tools_completed > 0 {
        parts.push(format!("工具 {}", activity.tools_completed));
    }
    if activity.subagents_completed > 0 {
        parts.push(format!("Subagent {}", activity.subagents_completed));
    }
    let tokens = activity
        .prompt_tokens
        .saturating_add(activity.completion_tokens);
    if tokens > 0 {
        parts.push(format!("Token {tokens}"));
    }
    parts.join(" · ")
}

pub(crate) fn format_duration(duration: Duration) -> String {
    if duration.as_secs() >= 60 {
        format!(
            "{}m{:02}s",
            duration.as_secs() / 60,
            duration.as_secs() % 60
        )
    } else if duration.as_secs() >= 10 {
        format!("{}s", duration.as_secs())
    } else {
        format!("{:.1}s", duration.as_secs_f32())
    }
}

fn fit_width(value: &str, width: usize) -> String {
    if crate::util::str_visual_width(value) <= width {
        return value.to_string();
    }
    if width <= 1 {
        return "…".chars().take(width).collect();
    }
    let mut output = String::new();
    for ch in value.chars() {
        let candidate = format!("{output}{ch}…");
        if crate::util::str_visual_width(&candidate) > width {
            break;
        }
        output.push(ch);
    }
    output.push('…');
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::state::{AdapterStatusEntry, AgentActivity};
    use crate::theme::Theme;

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    #[test]
    fn distinguishes_adapter_states() {
        let bar = StatusBar;
        let mut state = state();
        assert!(bar.status_text(&state, 120).0.contains("状态未知"));
        state.status.set_adapter_state(AdapterStatusEntry {
            name: "qq".into(),
            display_name: "QQ".into(),
            running: true,
            ..Default::default()
        });
        assert!(bar.status_text(&state, 120).0.contains("等待连接"));
        state.status.adapters[0].connected = true;
        assert!(bar.status_text(&state, 120).0.contains("QQ 已连接"));
    }

    #[test]
    fn clearly_names_every_runtime_phase() {
        let bar = StatusBar;
        let mut state = state();
        state.active_session_id = Some("s1".into());
        let mut activity = AgentActivity::new();
        state.agent_activities.insert("s1".into(), activity.clone());
        assert!(bar.status_text(&state, 120).1.contains("思考"));

        activity.transition(AgentPhase::Tool, Some("calculator".into()));
        state.agent_activities.insert("s1".into(), activity.clone());
        assert!(bar.status_text(&state, 120).1.contains("工具 calculator"));

        activity.transition(AgentPhase::Subagent, Some("分析方案".into()));
        state.agent_activities.insert("s1".into(), activity.clone());
        assert!(bar.status_text(&state, 120).1.contains("Subagent 运行中"));

        activity.transition(AgentPhase::Completed, None);
        state.agent_activities.insert("s1".into(), activity);
        assert!(bar.status_text(&state, 120).1.contains("已完成"));
    }

    #[test]
    fn narrow_status_never_exceeds_available_width() {
        let mut state = state();
        state.status.model = "a-very-long-model-name-that-must-be-truncated".into();
        let bar = StatusBar;
        let (first, second) = bar.status_text(&state, 24);
        assert!(crate::util::str_visual_width(&first) <= 24);
        assert!(crate::util::str_visual_width(&second) <= 24);
    }

    #[test]
    fn duration_format_is_stable() {
        assert_eq!(format_duration(Duration::from_millis(1250)), "1.2s");
        assert_eq!(format_duration(Duration::from_secs(12)), "12s");
        assert_eq!(format_duration(Duration::from_secs(65)), "1m05s");
    }

    #[test]
    fn runtime_reports_other_busy_sessions() {
        let mut state = state();
        state.active_session_id = Some("s1".into());
        state
            .agent_activities
            .insert("s1".into(), AgentActivity::new());
        state
            .agent_activities
            .insert("s2".into(), AgentActivity::new());
        assert!(runtime_text(&state).contains("其他运行会话 1"));
    }
}
