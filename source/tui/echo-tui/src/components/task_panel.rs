//! Persistent orchestration summary and temporary branch inspector.

use crossterm::event::{KeyCode, KeyEventKind, MouseEventKind};
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Color, Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{
    Block, BorderType, Borders, Clear, List, ListItem, ListState, Paragraph, Wrap,
};
use ratatui::Frame;
use std::time::Duration;

use super::status_bar::format_duration;
use super::{Component, ComponentResult};
use crate::event::Event;
use crate::state::{AppState, BranchStatus, OrchestrationActivity, OrchestrationStatus, SPINNER};

#[derive(Debug, Default)]
pub struct TaskStatusBar;

impl TaskStatusBar {
    fn summary_text(&self, state: &AppState, width: u16) -> String {
        let trunk_count = state.trunk_message_count();
        let active_count = state.active_orchestration_count();
        let latest = state
            .orchestration_tasks
            .iter()
            .rev()
            .find(|task| task.status.is_active())
            .or_else(|| state.orchestration_tasks.last());
        let Some(task) = latest else {
            return fit_width(
                &format!("◇ Trunk {trunk_count} 条 · 分支 / Subagent · 暂无任务"),
                width as usize,
            );
        };
        let marker = if task.status == OrchestrationStatus::Running {
            SPINNER[(state.anim_tick % SPINNER.len() as u64) as usize]
        } else {
            status_marker(task.status)
        };
        let identity = task_identity(task);
        let branch_progress = if task.branches.is_empty() {
            String::new()
        } else {
            format!(
                " · 分支 {}/{}",
                task.completed_branches(),
                task.branches.len()
            )
        };
        let concurrent = if active_count > 1 {
            format!(" · 活跃 {active_count}")
        } else {
            String::new()
        };
        fit_width(
            &format!(
                "{marker} {} {identity} · {}{branch_progress} · {}{concurrent}  Trunk {trunk_count} 条 · 分支列表 ▣",
                task.kind.label(),
                task.status.label(),
                format_duration(task.elapsed())
            ),
            width as usize,
        )
    }
}

impl Component for TaskStatusBar {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        if area.is_empty() {
            return;
        }
        let theme = state.theme;
        let status = state
            .orchestration_tasks
            .iter()
            .rev()
            .find(|task| task.status.is_active())
            .or_else(|| state.orchestration_tasks.last())
            .map(|task| task.status);
        let color = match status {
            Some(OrchestrationStatus::Running) => theme.accent,
            Some(OrchestrationStatus::AwaitingIntegration) => theme.tool_fg,
            Some(OrchestrationStatus::Completed | OrchestrationStatus::Integrated) => theme.success,
            Some(OrchestrationStatus::Failed | OrchestrationStatus::Cancelled) => theme.error,
            None => theme.faint,
        };
        f.render_widget(
            Paragraph::new(Line::from(Span::styled(
                self.summary_text(state, area.width),
                Style::default().fg(color),
            )))
            .style(Style::default().bg(theme.panel_bg)),
            area,
        );
    }

    fn handle_event(&mut self, _event: &Event, _state: &mut AppState) -> ComponentResult {
        ComponentResult::Pass
    }
}

#[derive(Debug, Default)]
pub struct TaskInspector;

impl Component for TaskInspector {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        if area.width < 12 || area.height < 8 {
            return;
        }
        let theme = state.theme;
        let popup = centered_rect(area, 110, 32);
        f.render_widget(Clear, popup);
        let outer = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Plain)
            .border_style(Style::default().fg(theme.border_focused))
            .style(Style::default().bg(theme.overlay_bg))
            .title(Span::styled(
                " 分支与 Subagent ",
                Style::default().fg(theme.title).bold(),
            ));
        let inner = outer.inner(popup);
        f.render_widget(outer, popup);

        if state.orchestration_tasks.is_empty() && state.trunk_message_count() == 0 {
            f.render_widget(
                Paragraph::new("暂无分支或 Subagent 记录").style(Style::default().fg(theme.faint)),
                inner,
            );
            return;
        }

        // Trunk overview: message count + live branch list.
        let overview_height = trunk_overview_height(state);
        let areas = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(overview_height), Constraint::Min(0)])
            .split(inner);
        let overview = areas[0];
        let rest = areas[1];
        render_trunk_overview(f, overview, state);
        if rest.height < 4 {
            return;
        }

        let regions = if rest.width >= 72 {
            Layout::default()
                .direction(Direction::Horizontal)
                .constraints([Constraint::Percentage(34), Constraint::Min(30)])
                .split(rest)
        } else {
            Layout::default()
                .direction(Direction::Vertical)
                .constraints([Constraint::Percentage(38), Constraint::Min(4)])
                .split(rest)
        };
        render_task_list(f, regions[0], state);
        render_task_detail(f, regions[1], state);
    }

    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult {
        match event {
            Event::Input(crossterm::event::Event::Key(key)) if key.kind == KeyEventKind::Press => {
                let last = state.orchestration_tasks.len().saturating_sub(1);
                match key.code {
                    KeyCode::Esc => state.show_task_inspector = false,
                    KeyCode::Up | KeyCode::Char('k') => {
                        state.task_inspector_selection =
                            state.task_inspector_selection.saturating_sub(1);
                        state.task_inspector_scroll = 0;
                    }
                    KeyCode::Down | KeyCode::Char('j') => {
                        state.task_inspector_selection =
                            state.task_inspector_selection.saturating_add(1).min(last);
                        state.task_inspector_scroll = 0;
                    }
                    KeyCode::Home => {
                        state.task_inspector_selection = 0;
                        state.task_inspector_scroll = 0;
                    }
                    KeyCode::End => {
                        state.task_inspector_selection = last;
                        state.task_inspector_scroll = 0;
                    }
                    KeyCode::PageUp => {
                        state.task_inspector_scroll = state.task_inspector_scroll.saturating_sub(5);
                    }
                    KeyCode::PageDown => {
                        state.task_inspector_scroll = state.task_inspector_scroll.saturating_add(5);
                    }
                    _ => return ComponentResult::Pass,
                }
                ComponentResult::Consumed
            }
            Event::Input(crossterm::event::Event::Mouse(mouse)) => {
                match mouse.kind {
                    MouseEventKind::ScrollUp => {
                        state.task_inspector_scroll = state.task_inspector_scroll.saturating_sub(3);
                    }
                    MouseEventKind::ScrollDown => {
                        state.task_inspector_scroll = state.task_inspector_scroll.saturating_add(3);
                    }
                    _ => return ComponentResult::Pass,
                }
                ComponentResult::Consumed
            }
            _ => ComponentResult::Pass,
        }
    }
}

/// Height of the trunk overview block: header + up to 3 live branch lines.
fn trunk_overview_height(state: &AppState) -> u16 {
    let branches = state.active_branches();
    1 + branches.len().min(3) as u16
}

fn render_trunk_overview(f: &mut Frame, area: Rect, state: &AppState) {
    if area.is_empty() {
        return;
    }
    let theme = state.theme;
    let branches = state.active_branches();
    let mut lines = vec![Line::from(vec![
        Span::styled(" Trunk ", Style::default().fg(theme.title).bold()),
        Span::styled(
            format!("· {} 条消息", state.trunk_message_count()),
            Style::default().fg(theme.dim),
        ),
        Span::styled(
            format!(" · {} 个活跃分支", branches.len()),
            Style::default().fg(theme.subtitle),
        ),
    ])];
    let now = chrono::Utc::now().timestamp_millis();
    for branch in branches.iter().take(3) {
        let marker = if branch.status == OrchestrationStatus::Running {
            SPINNER[(state.anim_tick % SPINNER.len() as u64) as usize]
        } else {
            '◐'
        };
        let elapsed = Duration::from_millis(now.saturating_sub(branch.created_at_ms).max(0) as u64);
        lines.push(Line::from(vec![
            Span::styled(format!("  {marker} "), Style::default().fg(theme.accent)),
            Span::styled(
                format!("{} → {}", branch.kind.label(), branch.target),
                Style::default().fg(theme.fg),
            ),
            Span::styled(
                format!(
                    " · {} · {}",
                    branch.status.label(),
                    format_duration(elapsed)
                ),
                Style::default().fg(theme.dim),
            ),
        ]));
    }
    f.render_widget(
        Paragraph::new(lines).style(Style::default().bg(theme.overlay_bg)),
        area,
    );
}

fn render_task_list(f: &mut Frame, area: Rect, state: &AppState) {
    let theme = state.theme;
    let items = state
        .orchestration_tasks
        .iter()
        .rev()
        .map(|task| {
            let id = task_identity(task);
            ListItem::new(Line::from(vec![
                Span::styled(
                    format!("{} ", status_marker(task.status)),
                    Style::default().fg(status_color(task.status, state)),
                ),
                Span::styled(
                    format!("{} {id}", task.kind.label()),
                    Style::default().fg(theme.fg),
                ),
                Span::styled(
                    format!("  {}", task.status.label()),
                    Style::default().fg(theme.dim),
                ),
            ]))
        })
        .collect::<Vec<_>>();
    let list = List::new(items)
        .highlight_style(
            Style::default()
                .bg(theme.highlight_bg)
                .fg(theme.title)
                .bold(),
        )
        .highlight_symbol("▸ ")
        .block(
            Block::default()
                .borders(Borders::RIGHT)
                .border_style(Style::default().fg(theme.border))
                .title(Span::styled(" 任务 ", Style::default().fg(theme.subtitle))),
        );
    let mut list_state = ListState::default().with_selected(Some(
        state
            .task_inspector_selection
            .min(state.orchestration_tasks.len().saturating_sub(1)),
    ));
    f.render_stateful_widget(list, area, &mut list_state);
}

fn render_task_detail(f: &mut Frame, area: Rect, state: &AppState) {
    let theme = state.theme;
    let Some(task) = state.selected_orchestration() else {
        return;
    };
    let id = task
        .sequence
        .map(|sequence| format!("#{} · {}", sequence, short_id(&task.id)))
        .unwrap_or_else(|| task_identity(task));
    let mut lines = vec![
        Line::from(vec![
            Span::styled(
                format!("{}  ", status_marker(task.status)),
                Style::default().fg(status_color(task.status, state)).bold(),
            ),
            Span::styled(
                format!("{} {id}", task.kind.label()),
                Style::default().fg(theme.title).bold(),
            ),
        ]),
        Line::from(vec![
            Span::styled("状态  ", Style::default().fg(theme.faint)),
            Span::styled(task.status.label(), Style::default().fg(theme.fg)),
            Span::styled("    耗时  ", Style::default().fg(theme.faint)),
            Span::styled(
                format_duration(task.elapsed()),
                Style::default().fg(theme.fg),
            ),
        ]),
        Line::from(vec![
            Span::styled("会话  ", Style::default().fg(theme.faint)),
            Span::styled(task.session_id.clone(), Style::default().fg(theme.dim)),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            task.objective.clone(),
            Style::default().fg(theme.fg),
        )),
        Line::from(""),
        Line::from(Span::styled(
            format!(
                "分支  {}/{}",
                task.completed_branches(),
                task.branches.len()
            ),
            Style::default().fg(theme.subtitle).bold(),
        )),
    ];
    for branch in &task.branches {
        let duration = branch
            .completed_at_ms
            .unwrap_or_else(|| chrono::Utc::now().timestamp_millis())
            .saturating_sub(branch.started_at_ms)
            .max(0) as u64;
        lines.push(Line::from(""));
        lines.push(Line::from(vec![
            Span::styled(
                format!("{}  ", branch_marker(branch.status)),
                Style::default().fg(branch_color(branch.status, state)),
            ),
            Span::styled(
                branch.branch_id.clone(),
                Style::default().fg(theme.title).bold(),
            ),
            Span::styled(
                format!(
                    "  {} · {} · {}",
                    branch.status.label(),
                    branch.target,
                    format_duration(std::time::Duration::from_millis(duration))
                ),
                Style::default().fg(theme.dim),
            ),
        ]));
        if !branch.task.is_empty() {
            lines.push(Line::from(vec![
                Span::styled("   任务  ", Style::default().fg(theme.faint)),
                Span::styled(branch.task.clone(), Style::default().fg(theme.fg)),
            ]));
        }
        if let Some(result) = &branch.result {
            lines.push(Line::from(vec![
                Span::styled(
                    if task.kind == crate::state::OrchestrationKind::ReplyBranch {
                        "   临时回复  "
                    } else {
                        "   结果  "
                    },
                    Style::default().fg(theme.faint),
                ),
                Span::styled(result.clone(), Style::default().fg(theme.subtitle)),
            ]));
        }
    }
    f.render_widget(
        Paragraph::new(lines)
            .wrap(Wrap { trim: false })
            .scroll((state.task_inspector_scroll, 0))
            .style(Style::default().bg(theme.overlay_bg)),
        area,
    );
}

fn centered_rect(area: Rect, max_width: u16, max_height: u16) -> Rect {
    let width = max_width.min(area.width.saturating_sub(4)).max(8);
    let height = max_height.min(area.height.saturating_sub(4)).max(6);
    Rect::new(
        area.x + area.width.saturating_sub(width) / 2,
        area.y + area.height.saturating_sub(height) / 2,
        width.min(area.width),
        height.min(area.height),
    )
}

fn status_marker(status: OrchestrationStatus) -> char {
    match status {
        OrchestrationStatus::Running => '●',
        OrchestrationStatus::AwaitingIntegration => '◐',
        OrchestrationStatus::Completed | OrchestrationStatus::Integrated => '✓',
        OrchestrationStatus::Failed => '×',
        OrchestrationStatus::Cancelled => '−',
    }
}

fn branch_marker(status: BranchStatus) -> char {
    match status {
        BranchStatus::Running => '●',
        BranchStatus::Completed => '◐',
        BranchStatus::Succeeded => '✓',
        BranchStatus::Failed => '×',
        BranchStatus::Cancelled => '−',
    }
}

fn status_color(status: OrchestrationStatus, state: &AppState) -> Color {
    match status {
        OrchestrationStatus::Running => state.theme.accent,
        OrchestrationStatus::AwaitingIntegration => state.theme.tool_fg,
        OrchestrationStatus::Completed | OrchestrationStatus::Integrated => state.theme.success,
        OrchestrationStatus::Failed | OrchestrationStatus::Cancelled => state.theme.error,
    }
}

fn branch_color(status: BranchStatus, state: &AppState) -> Color {
    match status {
        BranchStatus::Running => state.theme.accent,
        BranchStatus::Completed => state.theme.tool_fg,
        BranchStatus::Succeeded => state.theme.success,
        BranchStatus::Failed | BranchStatus::Cancelled => state.theme.error,
    }
}

fn short_id(value: &str) -> &str {
    value.get(..8).unwrap_or(value)
}

fn task_identity(task: &OrchestrationActivity) -> String {
    if let Some(sequence) = task.sequence {
        format!("#{sequence}")
    } else if let Some(sequence) = task.id.strip_prefix("subagent-") {
        format!("S{sequence}")
    } else {
        short_id(&task.id).to_string()
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
        if crate::util::str_visual_width(&format!("{output}{ch}…")) > width {
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
    use crate::state::{BranchActivity, OrchestrationActivity, OrchestrationKind};
    use crate::theme::Theme;

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    #[test]
    fn empty_bar_is_clear_and_bounded() {
        let bar = TaskStatusBar;
        let state = state();
        let text = bar.summary_text(&state, 40);
        assert!(text.contains("暂无"));
        assert!(crate::util::str_visual_width(&text) <= 40);
    }

    #[test]
    fn idle_bar_reports_the_trunk_message_count() {
        let bar = TaskStatusBar;
        let mut state = state();
        state.ensure_trunk_session();
        state.push_message(
            "qq:dm::1",
            crate::state::DisplayMessage::plain(crate::state::MsgRole::User, "hi", 0),
        );
        let text = bar.summary_text(&state, 60);
        assert!(text.contains("Trunk 1 条"), "got: {text}");
        assert!(text.contains("暂无任务"));
    }

    #[test]
    fn trunk_overview_height_scales_with_branches() {
        let empty = state();
        assert_eq!(trunk_overview_height(&empty), 1);
        let mut busy = state();
        busy.start_reply_branch("s1", "r1", 1, "t", "QQ 私聊 1", 1_700_000_000_000);
        assert_eq!(trunk_overview_height(&busy), 2);
    }

    #[test]
    fn running_bar_reports_branch_progress() {
        let bar = TaskStatusBar;
        let mut state = state();
        state.orchestration_tasks.push(OrchestrationActivity {
            id: "1234567890".into(),
            sequence: Some(3),
            session_id: "s1".into(),
            kind: OrchestrationKind::Parallel,
            objective: "test".into(),
            status: OrchestrationStatus::Running,
            created_at_ms: chrono::Utc::now().timestamp_millis(),
            completed_at_ms: None,
            integrated_at_ms: None,
            branches: vec![BranchActivity {
                branch_id: "a".into(),
                task: "task".into(),
                target: "源会话".into(),
                status: BranchStatus::Running,
                started_at_ms: chrono::Utc::now().timestamp_millis(),
                completed_at_ms: None,
                result: None,
            }],
            updated_at: std::time::Instant::now(),
        });
        let text = bar.summary_text(&state, 100);
        assert!(text.contains("并行 #3"));
        assert!(text.contains("分支 0/1"));
        assert!(text.contains("分支列表"));
    }
}
