//! API 配置弹窗（Ctrl+P → 配置 API，或 Ctrl+X s，或输入框 /api）。
//!
//! 双模式：
//! - **列表模式**：展示所有 API profile + 顶层默认配置，↑↓ 选择、Enter 切换激活、
//!   `e` 编辑、`n` 新建、`d` 删除、`s` 编辑系统提示词、Esc 关闭
//! - **编辑模式**：表单编辑（新建含 name 字段；编辑已有不含），Enter 保存、Esc 返回列表

use crossterm::event::{KeyCode, KeyEventKind, KeyModifiers};
use echo_protocol::BackendCommand;
use ratatui::layout::{Alignment, Rect};
use ratatui::style::{Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, List, ListItem, ListState, Paragraph};
use ratatui::Frame;

use super::{Component, ComponentResult};
use crate::event::Event;
use crate::state::AppState;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettingsMode {
    /// 配置列表（选择/切换/管理）。
    List,
    /// 编辑/新建 profile 表单。
    EditProfile,
    /// 编辑全局系统提示词。
    EditSystemPrompt,
}

/// 设置表单状态（存于 AppState）。
#[derive(Debug, Clone)]
pub struct SettingsForm {
    pub mode: SettingsMode,
    /// 编辑中 profile 的名字（新建时为空，编辑已有时为目标名）。
    pub name: String,
    /// 编辑字段：
    /// - 新建 profile: [name, provider, model, base_url, api_key]
    /// - 编辑 profile: [provider, model, base_url, api_key]
    /// - 系统提示词:  [system_prompt]
    pub fields: Vec<String>,
    pub focus: usize,
    pub api_key_set: bool,
    /// Effective top-level/profile reasoning settings received from backend.
    pub thinking: echo_protocol::ThinkingMode,
    pub reasoning_effort: echo_protocol::ReasoningEffort,
    /// 后端推送的 profile 列表。
    pub profiles: Vec<echo_protocol::ApiProfileInfo>,
    /// 当前激活的 profile 名（空 = 顶层默认）。
    pub active_api: String,
    /// 列表模式选中项（0 = 顶层默认，1.. = profiles）。
    pub selection: usize,
}

impl Default for SettingsForm {
    fn default() -> Self {
        Self {
            mode: SettingsMode::List,
            name: String::new(),
            fields: Vec::new(),
            focus: 0,
            api_key_set: false,
            thinking: echo_protocol::ThinkingMode::default(),
            reasoning_effort: echo_protocol::ReasoningEffort::default(),
            profiles: Vec::new(),
            active_api: String::new(),
            selection: 0,
        }
    }
}

impl SettingsForm {
    /// 进入列表模式（保留后端推送的数据）。
    pub fn to_list(&mut self) {
        self.mode = SettingsMode::List;
        self.fields.clear();
        self.name.clear();
        self.focus = 0;
    }

    /// 开始编辑 profile：`name` 为空 = 新建（含 name 字段），否则编辑已有。
    pub fn edit_profile(
        &mut self,
        name: &str,
        provider: &str,
        model: &str,
        base_url: &str,
        api_key_set: bool,
    ) {
        self.edit_profile_with_reasoning(
            name,
            provider,
            model,
            base_url,
            api_key_set,
            echo_protocol::ThinkingMode::default(),
            echo_protocol::ReasoningEffort::default(),
        );
    }

    #[allow(clippy::too_many_arguments)]
    pub fn edit_profile_with_reasoning(
        &mut self,
        name: &str,
        provider: &str,
        model: &str,
        base_url: &str,
        api_key_set: bool,
        thinking: echo_protocol::ThinkingMode,
        reasoning_effort: echo_protocol::ReasoningEffort,
    ) {
        self.mode = SettingsMode::EditProfile;
        self.focus = 0;
        if name.is_empty() {
            self.name.clear();
            self.fields = vec![
                String::new(),
                provider.into(),
                model.into(),
                base_url.into(),
                String::new(),
                thinking.as_str().into(),
                reasoning_effort.as_str().into(),
            ];
        } else {
            self.name = name.to_string();
            self.fields = vec![
                provider.into(),
                model.into(),
                base_url.into(),
                String::new(),
                thinking.as_str().into(),
                reasoning_effort.as_str().into(),
            ];
        }
        self.api_key_set = api_key_set;
    }

    /// 开始编辑系统提示词。
    pub fn edit_system_prompt(&mut self, current: &str) {
        self.mode = SettingsMode::EditSystemPrompt;
        self.focus = 0;
        self.fields = vec![current.to_string()];
    }

    /// 字段标签（按模式）。
    pub fn field_names(&self) -> Vec<&'static str> {
        match self.mode {
            SettingsMode::EditProfile if self.fields.len() == 7 => {
                vec![
                    "name",
                    "provider",
                    "model",
                    "base_url",
                    "api_key",
                    "thinking",
                    "reasoning_effort",
                ]
            }
            SettingsMode::EditProfile => vec![
                "provider",
                "model",
                "base_url",
                "api_key",
                "thinking",
                "reasoning_effort",
            ],
            SettingsMode::EditSystemPrompt => vec!["system_prompt"],
            SettingsMode::List => Vec::new(),
        }
    }

    /// 掩码显示 api_key。
    pub fn display_value(&self, i: usize) -> String {
        let is_key = self.field_names().get(i) == Some(&"api_key");
        if is_key && !self.fields[i].is_empty() {
            "•".repeat(self.fields[i].chars().count())
        } else {
            self.fields[i].clone()
        }
    }

    /// 由当前表单内容构造后端命令（由 app 循环发送）。
    pub fn build_command(&self) -> BackendCommand {
        match self.mode {
            SettingsMode::EditProfile => {
                let (name, rest) = if self.fields.len() == 7 {
                    (self.fields[0].clone(), self.fields[1..].to_vec())
                } else {
                    (self.name.clone(), self.fields.clone())
                };
                BackendCommand::UpdateApiConfig {
                    name,
                    provider: rest[0].clone(),
                    model: rest[1].clone(),
                    base_url: rest[2].clone(),
                    api_key: rest[3].clone(),
                    thinking: Some(match rest[4].as_str() {
                        "disabled" => echo_protocol::ThinkingMode::Disabled,
                        _ => echo_protocol::ThinkingMode::Enabled,
                    }),
                    reasoning_effort: Some(match rest[5].as_str() {
                        "low" => echo_protocol::ReasoningEffort::Low,
                        "high" => echo_protocol::ReasoningEffort::High,
                        _ => echo_protocol::ReasoningEffort::Max,
                    }),
                }
            }
            SettingsMode::EditSystemPrompt => BackendCommand::SetSystemPrompt {
                prompt: self.fields[0].clone(),
            },
            SettingsMode::List => unreachable!("list mode has no command"),
        }
    }

    /// 列表项数（顶层默认 + profiles）。
    pub fn list_len(&self) -> usize {
        self.profiles.len() + 1
    }

    /// 列表选中项：`None` = 顶层默认，`Some(i)` = profiles[i]。
    /// selection==0 必须映射到顶层默认（None），不能用 saturating_sub。
    pub fn selected_profile(&self) -> Option<&echo_protocol::ApiProfileInfo> {
        self.selection
            .checked_sub(1)
            .and_then(|i| self.profiles.get(i))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile(name: &str) -> echo_protocol::ApiProfileInfo {
        echo_protocol::ApiProfileInfo {
            name: name.into(),
            provider: "deepseek".into(),
            model: "ds-v4".into(),
            base_url: "https://api.deepseek.com".into(),
            api_key_set: true,
            thinking: echo_protocol::ThinkingMode::Enabled,
            reasoning_effort: echo_protocol::ReasoningEffort::Max,
        }
    }

    #[test]
    fn edit_profile_new_has_name_field() {
        let mut f = SettingsForm::default();
        f.edit_profile("", "deepseek", "ds-v4", "http://x", false);
        assert_eq!(f.mode, SettingsMode::EditProfile);
        assert_eq!(f.fields.len(), 7);
        assert_eq!(
            f.field_names(),
            vec![
                "name",
                "provider",
                "model",
                "base_url",
                "api_key",
                "thinking",
                "reasoning_effort"
            ]
        );
        assert!(f.name.is_empty());
    }

    #[test]
    fn edit_profile_existing_omits_name_field() {
        let mut f = SettingsForm::default();
        f.edit_profile("p1", "openai", "gpt-4o", "http://y", true);
        assert_eq!(f.fields.len(), 6);
        assert_eq!(f.name, "p1");
        assert_eq!(
            f.field_names(),
            vec![
                "provider",
                "model",
                "base_url",
                "api_key",
                "thinking",
                "reasoning_effort"
            ]
        );
        assert!(f.api_key_set);
    }

    #[test]
    fn edit_system_prompt_sets_single_field() {
        let mut f = SettingsForm::default();
        f.edit_system_prompt("你好");
        assert_eq!(f.mode, SettingsMode::EditSystemPrompt);
        assert_eq!(f.field_names(), vec!["system_prompt"]);
        assert_eq!(f.fields[0], "你好");
    }

    #[test]
    fn display_value_masks_api_key() {
        let mut f = SettingsForm::default();
        f.edit_profile("p1", "openai", "m", "", false);
        let idx = f
            .field_names()
            .iter()
            .position(|name| *name == "api_key")
            .unwrap();
        f.fields[idx] = "sk-123".into();
        let masked = f.display_value(idx);
        assert!(!masked.contains("sk-123"));
        assert_eq!(masked.chars().count(), 6, "one dot per character");
        // Non-key fields show raw value.
        assert_eq!(f.display_value(0), "openai");
    }

    #[test]
    fn build_command_from_new_profile() {
        let mut f = SettingsForm::default();
        f.edit_profile("", "deepseek", "ds-v4", "http://x", false);
        f.fields = vec![
            "newp".into(),
            "deepseek".into(),
            "ds-v4".into(),
            "http://x".into(),
            "sk".into(),
            "enabled".into(),
            "max".into(),
        ];
        match f.build_command() {
            BackendCommand::UpdateApiConfig {
                name,
                provider,
                model,
                base_url,
                api_key,
                thinking,
                reasoning_effort,
            } => {
                assert_eq!(name, "newp");
                assert_eq!(provider, "deepseek");
                assert_eq!(model, "ds-v4");
                assert_eq!(base_url, "http://x");
                assert_eq!(api_key, "sk");
                assert_eq!(thinking, Some(echo_protocol::ThinkingMode::Enabled));
                assert_eq!(reasoning_effort, Some(echo_protocol::ReasoningEffort::Max));
            }
            other => panic!("unexpected command: {other:?}"),
        }
    }

    #[test]
    fn build_command_from_existing_profile_keeps_name() {
        let mut f = SettingsForm::default();
        f.edit_profile("existing", "openai", "m", "", true);
        match f.build_command() {
            BackendCommand::UpdateApiConfig { name, .. } => assert_eq!(name, "existing"),
            other => panic!("unexpected command: {other:?}"),
        }
    }

    #[test]
    fn build_command_system_prompt() {
        let mut f = SettingsForm::default();
        f.edit_system_prompt("be concise");
        assert_eq!(
            f.build_command(),
            BackendCommand::SetSystemPrompt {
                prompt: "be concise".into()
            }
        );
    }

    #[test]
    fn selection_maps_zero_to_default() {
        let mut f = SettingsForm {
            profiles: vec![profile("a"), profile("b")],
            ..Default::default()
        };
        f.selection = 0;
        assert!(f.selected_profile().is_none(), "selection 0 = default");
        f.selection = 1;
        assert_eq!(f.selected_profile().unwrap().name, "a");
        f.selection = 2;
        assert_eq!(f.selected_profile().unwrap().name, "b");
        f.selection = 99;
        assert!(f.selected_profile().is_none(), "out of range");
        assert_eq!(f.list_len(), 3);
    }

    #[test]
    fn to_list_resets_edit_state() {
        let mut f = SettingsForm::default();
        f.edit_profile("p1", "openai", "m", "", false);
        f.to_list();
        assert_eq!(f.mode, SettingsMode::List);
        assert!(f.fields.is_empty());
        assert!(f.name.is_empty());
        assert_eq!(f.focus, 0);
    }
}

#[derive(Debug, Default)]
pub struct SettingsPopup;

impl Component for SettingsPopup {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        match state.settings.mode {
            SettingsMode::List => self.render_list(f, area, state, theme),
            SettingsMode::EditProfile | SettingsMode::EditSystemPrompt => {
                self.render_edit(f, area, state, theme)
            }
        }
    }

    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult {
        let Event::Input(crossterm::event::Event::Key(key)) = event else {
            return ComponentResult::Pass;
        };
        if key.kind != KeyEventKind::Press {
            return ComponentResult::Pass;
        }
        match state.settings.mode {
            SettingsMode::List => self.handle_list(key, state),
            SettingsMode::EditProfile | SettingsMode::EditSystemPrompt => {
                self.handle_edit(key, state)
            }
        }
    }
}

impl SettingsPopup {
    // ---- 列表模式 ------------------------------------------------------
    fn render_list(&self, f: &mut Frame, area: Rect, state: &AppState, theme: crate::theme::Theme) {
        let form = &state.settings;
        let w = 64u16.min(area.width.saturating_sub(4));
        // 高度钳制到屏幕内：profile 数量异常庞大时（历史文件曾指数增长）
        // 不能按列表长度撑出超屏窗口。注意 clamp 的 min 必须 ≤ max——
        // 终端极矮（或 pty 无窗口尺寸）时 height-2 < 8 会导致 panic。
        let max_h = (area.height.saturating_sub(2)).max(8) as usize;
        let h = (form.list_len() + 4).clamp(8, max_h) as u16;
        let x = area.width.saturating_sub(w) / 2;
        let y = area.height.saturating_sub(h) / 2;
        let rect = Rect::new(x, y, w, h);

        f.render_widget(Clear, rect);

        let mut items: Vec<ListItem> = Vec::new();
        // 顶层默认（selection 0）
        let default_active = form.active_api.is_empty();
        let default_label = if default_active {
            "⚙ 默认配置 ◀ 当前".to_string()
        } else {
            "⚙ 默认配置".to_string()
        };
        items.push(ListItem::new(Line::from(vec![
            Span::styled(
                default_label,
                if default_active {
                    Style::default().fg(theme.title).bold()
                } else {
                    Style::default().fg(theme.fg)
                },
            ),
            Span::styled("  (顶层默认)", theme.faint),
        ])));
        // profiles
        for p in &form.profiles {
            let active = p.name == form.active_api;
            let marker = if active { "● " } else { "○ " };
            let name_style = if active {
                Style::default().fg(theme.title).bold()
            } else {
                Style::default().fg(theme.fg)
            };
            let mut spans = vec![Span::styled(format!("{marker}{}", p.name), name_style)];
            spans.push(Span::styled(
                format!("  ({}/{})", p.provider, p.model),
                if active { theme.accent } else { theme.dim },
            ));
            spans.push(Span::styled(
                format!(
                    "  [{}/{}]",
                    p.thinking.as_str(),
                    p.reasoning_effort.as_str()
                ),
                theme.faint,
            ));
            if !p.api_key_set {
                spans.push(Span::styled("  [无 key]", theme.faint));
            }
            if active {
                spans.push(Span::styled("  ◀ 当前", theme.success));
            }
            items.push(ListItem::new(Line::from(spans)));
        }

        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(theme.border_focused)
            .title(Span::styled(
                " API 配置 ",
                Style::default().fg(theme.title).bold(),
            ));
        let list = List::new(items)
            .block(block)
            .highlight_style(Style::default().bg(theme.highlight_bg));
        let mut list_state = ListState::default();
        list_state.select(Some(form.selection.min(form.list_len().saturating_sub(1))));
        f.render_stateful_widget(list, rect, &mut list_state);

        let hint = Paragraph::new(Line::from(
            "↑↓/jk 选择 · Enter 切换 · e 编辑 · n 新建 · d 删除 · s 系统提示词 · Esc 关闭",
        ))
        .alignment(Alignment::Center)
        .style(Style::default().fg(theme.faint));
        f.render_widget(hint, Rect::new(x, y + h, w, 1));
    }

    fn handle_list(
        &mut self,
        key: &crossterm::event::KeyEvent,
        state: &mut AppState,
    ) -> ComponentResult {
        let len = state.settings.list_len();
        match key.code {
            KeyCode::Esc => {
                state.show_settings = false;
            }
            KeyCode::Down | KeyCode::Char('j') => {
                state.settings.selection = (state.settings.selection + 1) % len;
            }
            KeyCode::Up | KeyCode::Char('k') => {
                state.settings.selection = state.settings.selection.saturating_sub(1);
            }
            KeyCode::Enter => {
                // 切换激活
                let name = state
                    .settings
                    .selected_profile()
                    .map(|p| p.name.clone())
                    .unwrap_or_default();
                state.pending_command = Some(BackendCommand::SwitchApi { name });
                state.show_settings = false;
            }
            KeyCode::Char('e') => {
                let selection = state.settings.selected_profile().cloned();
                match selection {
                    Some(p) => {
                        state.settings.edit_profile_with_reasoning(
                            &p.name,
                            &p.provider,
                            &p.model,
                            &p.base_url,
                            p.api_key_set,
                            p.thinking,
                            p.reasoning_effort,
                        );
                    }
                    None => {
                        // 顶层默认：也允许编辑（name 空 = 顶层）
                        let thinking = state.settings.thinking;
                        let effort = state.settings.reasoning_effort;
                        state.settings.edit_profile_with_reasoning(
                            "",
                            &state.status.provider.clone(),
                            &state.status.model.clone(),
                            &state.status.base_url.clone(),
                            state.settings.api_key_set,
                            thinking,
                            effort,
                        );
                    }
                }
            }
            KeyCode::Char('n') => {
                state.settings.edit_profile("", "", "", "", false);
            }
            KeyCode::Char('d') => {
                if let Some(p) = state.settings.selected_profile() {
                    state.pending_command = Some(BackendCommand::DeleteApi {
                        name: p.name.clone(),
                    });
                }
            }
            KeyCode::Char('s') => {
                state
                    .settings
                    .edit_system_prompt(&state.status.system_prompt);
            }
            _ => return ComponentResult::Pass,
        }
        ComponentResult::Consumed
    }

    // ---- 编辑模式 ------------------------------------------------------
    fn render_edit(&self, f: &mut Frame, area: Rect, state: &AppState, theme: crate::theme::Theme) {
        let form = &state.settings;
        let names = form.field_names();
        let w = 64u16.min(area.width.saturating_sub(4));
        let h = names.len() as u16 + 4;
        let x = area.width.saturating_sub(w) / 2;
        let y = area.height.saturating_sub(h) / 2;
        let rect = Rect::new(x, y, w, h);

        f.render_widget(Clear, rect);
        let title = match form.mode {
            SettingsMode::EditProfile if form.fields.len() == 7 => " 新建 API 配置 ",
            SettingsMode::EditProfile => " 编辑 API 配置 ",
            _ => " 系统提示词 ",
        };
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(theme.border_focused)
            .title(Span::styled(title, Style::default().fg(theme.title).bold()));

        let mut lines: Vec<Line> = Vec::new();
        for (i, name) in names.iter().enumerate() {
            let focused = i == form.focus;
            let prefix = if focused { "▸ " } else { "  " };
            let label = if *name == "api_key" {
                format!(
                    "api_key ({})",
                    if form.api_key_set {
                        "已设置"
                    } else {
                        "未设置"
                    }
                )
            } else {
                name.to_string()
            };
            let value = form.display_value(i);
            let placeholder = match *name {
                "name" => "配置名，如 openai-main / deepseek".to_string(),
                "provider" => "openai / deepseek / anthropic / ollama".to_string(),
                "model" => "如 gpt-4o-mini / deepseek-chat / qwen2.5".to_string(),
                "base_url" => "留空用默认 (openai→api.openai.com/v1)".to_string(),
                "api_key" => "留空保持不变".to_string(),
                "thinking" => "enabled / disabled（←→ 或空格切换）".to_string(),
                "reasoning_effort" => "low / high / max（←→ 或空格切换）".to_string(),
                _ => "机器人人设与规则".to_string(),
            };
            let (label_style, value_style) = if focused {
                (
                    Style::default().fg(theme.accent).bold(),
                    Style::default().fg(theme.title),
                )
            } else {
                (
                    Style::default().fg(theme.subtitle),
                    Style::default().fg(theme.fg),
                )
            };
            let mut spans = vec![Span::styled(format!("{prefix}{label}: "), label_style)];
            if value.is_empty() {
                spans.push(Span::styled(placeholder, Style::default().fg(theme.faint)));
            } else {
                spans.push(Span::styled(value, value_style));
            }
            lines.push(Line::from(spans));
        }

        let p = Paragraph::new(lines)
            .style(Style::default().bg(theme.panel_bg))
            .block(block);
        f.render_widget(p, rect);

        let hint = Paragraph::new(Line::from(
            "Tab/↑↓ 字段 · ←→/空格 选项 · Enter 保存 · Esc 取消",
        ))
        .alignment(Alignment::Center)
        .style(Style::default().fg(theme.faint));
        f.render_widget(hint, Rect::new(x, y + h, w, 1));
    }

    fn handle_edit(
        &mut self,
        key: &crossterm::event::KeyEvent,
        state: &mut AppState,
    ) -> ComponentResult {
        let n = state.settings.fields.len();
        let focused_name = state
            .settings
            .field_names()
            .get(state.settings.focus)
            .copied();
        let is_option = matches!(focused_name, Some("thinking" | "reasoning_effort"));
        match key.code {
            KeyCode::Esc => {
                state.settings.to_list();
            }
            KeyCode::Enter => {
                // 先构造命令再退出编辑：build_command 依赖编辑模式，
                // 模式一旦切回 List 就无法再构建。
                let cmd = state.settings.build_command();
                state.pending_command = Some(cmd);
                state.settings.to_list();
                state.show_settings = false;
            }
            // 编辑模式下 j/k 是普通字符（表单输入），字段切换只用 Tab/↑↓
            KeyCode::Tab | KeyCode::Down => {
                state.settings.focus = (state.settings.focus + 1) % n;
            }
            KeyCode::BackTab | KeyCode::Up => {
                state.settings.focus = if state.settings.focus == 0 {
                    n - 1
                } else {
                    state.settings.focus - 1
                };
            }
            KeyCode::Left | KeyCode::Right | KeyCode::Char(' ') if is_option => {
                let value = &mut state.settings.fields[state.settings.focus];
                *value = match focused_name {
                    Some("thinking") => if value == "enabled" {
                        "disabled"
                    } else {
                        "enabled"
                    }
                    .into(),
                    Some("reasoning_effort") => match (value.as_str(), key.code) {
                        ("low", KeyCode::Left) => "max".into(),
                        ("high", KeyCode::Left) => "low".into(),
                        ("max", KeyCode::Left) => "high".into(),
                        ("low", _) => "high".into(),
                        ("high", _) => "max".into(),
                        _ => "low".into(),
                    },
                    _ => value.clone(),
                };
            }
            KeyCode::Backspace => {
                if !is_option {
                    state.settings.fields[state.settings.focus].pop();
                }
            }
            KeyCode::Delete => {
                if !is_option {
                    state.settings.fields[state.settings.focus].clear();
                }
            }
            KeyCode::Char(c) => {
                if is_option {
                    return ComponentResult::Consumed;
                }
                if c == ' ' || !key.modifiers.contains(KeyModifiers::CONTROL) {
                    state.settings.fields[state.settings.focus].push(c);
                    return ComponentResult::Consumed;
                }
                return ComponentResult::Pass;
            }
            _ => return ComponentResult::Pass,
        }
        ComponentResult::Consumed
    }
}
