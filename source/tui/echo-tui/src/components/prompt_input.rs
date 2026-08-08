//! Multiline prompt input with opencode-style slash commands.
//!
//! - Enter 发送，Shift+Enter 换行
//! - 输入 `/` 触发命令补全菜单（过滤匹配，↑↓/Tab 导航，Enter 执行，Esc 关闭）
//! - 亮度层次：焦点边框（border_focused）> 标题（subtitle）> 内容（fg）> 占位（faint）

use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, Paragraph};
use ratatui::Frame;
use tui_textarea::{Input, Key, TextArea};
use unicode_width::UnicodeWidthChar;

use super::{Component, ComponentResult};
use crate::event::Event;
use crate::slash_commands::{SlashAction, SLASH_COMMANDS};
use crate::state::AppState;

#[derive(Debug, Default)]
pub struct PromptInput {
    textarea: TextArea<'static>,
    history: Vec<String>,
    history_idx: Option<usize>,
    draft: String,
}

impl PromptInput {
    const MIN_HEIGHT: u16 = 3;
    const MAX_HEIGHT: u16 = 8;

    /// Grow with multiline input, while leaving enough room for the conversation.
    pub(crate) fn preferred_height(&self, terminal_height: u16) -> u16 {
        let content_height = self.textarea.lines().len().min(6) as u16;
        let desired = content_height.saturating_add(2).max(Self::MIN_HEIGHT);
        let available = terminal_height.saturating_sub(4).max(1);
        desired.min(Self::MAX_HEIGHT).min(available)
    }

    pub(crate) fn is_empty(&self) -> bool {
        self.textarea.is_empty()
    }

    /// 输入内容若以 `/` 开头则返回命令过滤串（支持多词命令如 /adapter start）。
    fn slash_filter(&self) -> Option<String> {
        let text = self.textarea.lines().join(" ");
        text.strip_prefix('/').map(|s| s.to_string())
    }

    /// Filter commands by the current slash filter.
    /// When filter has no space, only show first-level (no-space) commands.
    fn filtered_commands<'a>(filter: &str) -> Vec<&'a (&'a str, &'a str, SlashAction)> {
        let show_sub = filter.contains(' ');
        SLASH_COMMANDS
            .iter()
            .filter(|(name, _, _)| {
                if !name.starts_with(filter) {
                    return false;
                }
                if !show_sub && name.contains(' ') {
                    return false;
                }
                true
            })
            .collect()
    }

    fn render_slash_menu(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        let filtered = Self::filtered_commands(&state.slash_filter);
        if filtered.is_empty() {
            return;
        }
        let sel = state.slash_selection.min(filtered.len().saturating_sub(1));
        // Use the FULL terminal area, not just the prompt area.
        let term_h = f.area().height;
        let h = (filtered.len() + 2).min((term_h.saturating_sub(4)) as usize) as u16;
        let w = 54u16.min(area.width.saturating_sub(2));
        let x = area.x;
        // Position the menu above the prompt, clamped to top of screen.
        let y = area.y.saturating_sub(h).max(1);
        let rect = Rect::new(x, y, w.min(area.width.saturating_sub(x)), h);

        let mut lines: Vec<Line> = Vec::new();
        for (i, (name, desc, _)) in filtered.iter().enumerate() {
            let marker = if i == sel { "▸" } else { " " };
            let name_style = if i == sel {
                Style::default().fg(theme.accent).bold()
            } else {
                Style::default().fg(theme.fg)
            };
            lines.push(Line::from(vec![
                Span::styled(
                    format!(" {marker} "),
                    if i == sel { theme.accent } else { theme.faint },
                ),
                Span::styled(*name, name_style),
                Span::styled(format!("  {desc}"), theme.dim),
            ]));
        }
        // Help hint on last line.
        lines.push(Line::from(Span::styled(
            " Tab 补全  ↑↓ 选择  Enter 执行  Esc 关闭",
            theme.faint,
        )));

        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(theme.border_focused)
            .title(Span::styled(
                format!(" /{} ", state.slash_filter),
                Style::default().fg(theme.title),
            ));
        let p = Paragraph::new(lines)
            .block(block)
            .style(Style::default().bg(theme.panel_bg));
        f.render_widget(Clear, rect);
        f.render_widget(p, rect);
    }
}

impl Component for PromptInput {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState) {
        let theme = state.theme;
        // slash 命令菜单渲染在输入框上方
        if state.show_slash {
            self.render_slash_menu(f, area, state);
        }

        let focused = true;
        let title = " 消息输入 (全局时间线) ".to_string();
        let block = Block::default()
            .borders(Borders::ALL)
            .border_style(if focused {
                theme.border_focused
            } else {
                theme.border
            })
            .title(Span::styled(
                if focused {
                    title
                } else {
                    format!("{title}(Tab 选中后输入)")
                },
                Style::default().fg(if focused { theme.subtitle } else { theme.faint }),
            ));
        let inner = block.inner(area);
        f.render_widget(
            block.style(Style::default().bg(theme.panel_bg).fg(theme.fg)),
            area,
        );
        if inner.width == 0 || inner.height == 0 {
            return;
        }

        // Keep the insertion point visible using terminal display columns rather than
        // character counts, which matters for Chinese and other wide characters.
        let lines = self.textarea.lines();
        let (cursor_row, cursor_col) = self.textarea.cursor();
        let visible_height = inner.height as usize;
        let first_row = cursor_row.saturating_sub(visible_height.saturating_sub(1));
        let cursor_visual_col = visual_prefix_width(&lines[cursor_row], cursor_col);
        let start_col =
            horizontal_start(&lines[cursor_row], cursor_visual_col, inner.width as usize);
        let visible: Vec<Line> = lines
            .iter()
            .skip(first_row)
            .take(visible_height)
            .map(|line| Line::from(visible_columns(line, start_col, inner.width as usize)))
            .collect();

        if self.textarea.is_empty() {
            let hint = Paragraph::new(" 输入消息或 / 命令")
                .style(Style::default().bg(theme.panel_bg).fg(theme.faint));
            f.render_widget(hint, inner);
        } else {
            let text =
                Paragraph::new(visible).style(Style::default().bg(theme.panel_bg).fg(theme.fg));
            f.render_widget(text, inner);
        }

        let cursor_x = inner.x
            + cursor_visual_col
                .saturating_sub(start_col)
                .min(inner.width.saturating_sub(1) as usize) as u16;
        let cursor_y = inner.y + cursor_row.saturating_sub(first_row) as u16;
        if let Some(cell) = f.buffer_mut().cell_mut((cursor_x, cursor_y)) {
            cell.set_style(
                Style::default()
                    .fg(theme.panel_bg)
                    .bg(theme.accent)
                    .add_modifier(Modifier::BOLD),
            );
        }
    }

    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult {
        let Event::Input(crossterm::event::Event::Key(key)) = event else {
            return ComponentResult::Pass;
        };
        if key.kind != KeyEventKind::Press {
            return ComponentResult::Pass;
        }

        // ---- slash 命令模式 ----
        if state.show_slash {
            match key.code {
                KeyCode::Esc => {
                    state.show_slash = false;
                    return ComponentResult::Consumed;
                }
                KeyCode::Enter => {
                    let filtered = Self::filtered_commands(&state.slash_filter);
                    if let Some((_, _, action)) =
                        filtered.get(state.slash_selection % filtered.len().max(1))
                    {
                        self.save_to_history();
                        state.pending_slash = Some(*action);
                        state.pending_slash_text = self.textarea.lines().join(" ");
                        state.show_slash = false;
                        self.clear_input();
                    } else {
                        // 无匹配命令：只关菜单，保留输入内容（与普通发送一致）
                        state.show_slash = false;
                    }
                    return ComponentResult::Consumed;
                }
                // Tab → autocomplete to the selected match.
                KeyCode::Tab => {
                    let filtered = Self::filtered_commands(&state.slash_filter);
                    if let Some((name, _, _)) =
                        filtered.get(state.slash_selection % filtered.len().max(1))
                    {
                        // Replace textarea content with the completed command.
                        self.textarea.select_all();
                        self.textarea.delete_line_by_end();
                        let completed = format!("/{name} ");
                        self.textarea.insert_str(&completed);
                        // Update filter — the completed text now has a trailing space,
                        // which means slash_filter won't match (due to space check).
                        // We keep the menu open to show the exact match.
                        let new_filter = name.to_string();
                        state.slash_filter = new_filter;
                        state.slash_selection = 0;
                    }
                    return ComponentResult::Consumed;
                }
                // ↓/↑ navigate the list.
                KeyCode::Down => {
                    let filtered = Self::filtered_commands(&state.slash_filter).len();
                    state.slash_selection = (state.slash_selection + 1) % filtered.max(1);
                    return ComponentResult::Consumed;
                }
                KeyCode::Up | KeyCode::BackTab => {
                    state.slash_selection = state.slash_selection.saturating_sub(1);
                    return ComponentResult::Consumed;
                }
                KeyCode::Backspace => {
                    self.textarea.input(to_tui_input(key));
                    self.refresh_slash_state(state);
                    return ComponentResult::Consumed;
                }
                KeyCode::Char(_) => {
                    self.textarea.input(to_tui_input(key));
                    self.refresh_slash_state(state);
                    return ComponentResult::Consumed;
                }
                _ => {}
            }
        }

        // ---- 普通输入模式 ----
        // Enter（不带 Shift）发送。
        if key.code == KeyCode::Enter && !key.modifiers.contains(KeyModifiers::SHIFT) {
            // 输入为 `/cmd` 时按命令处理
            if let Some(filter) = self.slash_filter() {
                let filtered = Self::filtered_commands(&filter);
                if let Some((_, _, action)) = filtered.first() {
                    state.pending_slash = Some(*action);
                    state.pending_slash_text = self.textarea.lines().join(" ");
                    state.show_slash = false;
                    self.clear_input();
                    return ComponentResult::Consumed;
                }
            }
            let content = self.textarea.lines().join("\n");
            let trimmed = content.trim().to_string();
            if !trimmed.is_empty() {
                self.save_to_history();
                state.pending_submit = Some(trimmed);
            }
            self.clear_input();
            return ComponentResult::Consumed;
        }

        if key.code == KeyCode::Esc {
            return ComponentResult::Consumed;
        }

        // Plain Up/Down navigate history only for a single-line draft. Multiline
        // input and modified arrows retain the textarea's native cursor movement.
        if matches!(key.code, KeyCode::Up | KeyCode::Down)
            && key.modifiers == KeyModifiers::NONE
            && self.textarea.lines().len() == 1
        {
            return self.navigate_history(key.code, state);
        }

        // 其余按键交给 textarea，随后评估是否进入 slash 模式。
        self.textarea.input(to_tui_input(key));
        self.refresh_slash_state(state);
        ComponentResult::Consumed
    }
}

fn char_width(ch: char) -> usize {
    ch.width().unwrap_or(1)
}

fn visual_prefix_width(line: &str, char_col: usize) -> usize {
    line.chars().take(char_col).map(char_width).sum()
}

/// Align the horizontal viewport to a character boundary at or after the
/// minimum start column, so a wide character is never split at the left edge.
fn horizontal_start(line: &str, cursor_col: usize, width: usize) -> usize {
    let minimum = cursor_col.saturating_sub(width.saturating_sub(1));
    let mut visual_col = 0;
    for ch in line.chars() {
        if visual_col >= minimum {
            return visual_col;
        }
        visual_col += char_width(ch);
    }
    visual_col
}

fn visible_columns(line: &str, start: usize, width: usize) -> String {
    let mut visual_col = 0;
    let mut output_width = 0;
    let mut output = String::new();

    for ch in line.chars() {
        let ch_width = char_width(ch);
        let next_col = visual_col + ch_width;
        if next_col <= start {
            visual_col = next_col;
            continue;
        }
        if visual_col < start {
            let gap = (next_col - start).min(width);
            output.extend(std::iter::repeat(' ').take(gap));
            output_width += gap;
            visual_col = next_col;
            continue;
        }
        if output_width + ch_width > width {
            break;
        }
        output.push(ch);
        output_width += ch_width;
        visual_col = next_col;
    }
    output
}

impl PromptInput {
    pub(crate) fn clear_input(&mut self) {
        self.textarea.select_all();
        self.textarea.delete_line_by_end();
        self.textarea.move_cursor(tui_textarea::CursorMove::Bottom);
    }

    /// Save current input to history (called when a message is sent).
    pub fn save_to_history(&mut self) {
        let text = self.textarea.lines().join("\n").trim().to_string();
        if !text.is_empty() {
            // Deduplicate: if same as last entry, don't add again.
            if self.history.last().map(|s| s.as_str()) != Some(text.as_str()) {
                self.history.push(text);
            }
        }
        self.history_idx = None;
        self.draft.clear();
    }

    /// Navigate input history with Up/Down.
    fn navigate_history(&mut self, code: KeyCode, _state: &mut AppState) -> ComponentResult {
        if self.history.is_empty() {
            return ComponentResult::Consumed;
        }

        // Save current draft when first entering history navigation.
        if self.history_idx.is_none() {
            self.draft = self.textarea.lines().join("\n");
        }

        let new_idx = match code {
            KeyCode::Up => match self.history_idx {
                None => self.history.len().saturating_sub(1),
                Some(i) => i.saturating_sub(1),
            },
            KeyCode::Down => {
                match self.history_idx {
                    None => return ComponentResult::Consumed,
                    Some(i) => {
                        if i + 1 >= self.history.len() {
                            // Past the end — restore draft.
                            self.history_idx = None;
                            self.set_text(&self.draft.clone());
                            self.draft.clear();
                            return ComponentResult::Consumed;
                        }
                        i + 1
                    }
                }
            }
            _ => return ComponentResult::Consumed,
        };

        self.history_idx = Some(new_idx);
        let text = self.history[new_idx].clone();
        self.set_text(&text);
        ComponentResult::Consumed
    }

    fn set_text(&mut self, text: &str) {
        self.textarea.select_all();
        self.textarea.delete_line_by_end();
        self.textarea.insert_str(text);
    }

    fn refresh_slash_state(&mut self, state: &mut AppState) {
        match self.slash_filter() {
            Some(filter) => {
                state.show_slash = true;
                state.slash_filter = filter;
                state.slash_selection = 0;
            }
            None => {
                state.show_slash = false;
                state.slash_filter.clear();
            }
        }
    }
}

/// Convert a crossterm key event into a tui-textarea `Input`.
fn to_tui_input(key: &KeyEvent) -> Input {
    let mk = |k: Key| Input {
        key: k,
        ctrl: key.modifiers.contains(KeyModifiers::CONTROL),
        alt: key.modifiers.contains(KeyModifiers::ALT),
        shift: key.modifiers.contains(KeyModifiers::SHIFT),
    };
    match key.code {
        KeyCode::Char(c) => mk(Key::Char(c)),
        KeyCode::Enter => mk(Key::Enter),
        KeyCode::Tab => mk(Key::Tab),
        KeyCode::Backspace => mk(Key::Backspace),
        KeyCode::Delete => mk(Key::Delete),
        KeyCode::Left => mk(Key::Left),
        KeyCode::Right => mk(Key::Right),
        KeyCode::Up => mk(Key::Up),
        KeyCode::Down => mk(Key::Down),
        KeyCode::Home => mk(Key::Home),
        KeyCode::End => mk(Key::End),
        KeyCode::PageUp => mk(Key::PageUp),
        KeyCode::PageDown => mk(Key::PageDown),
        _ => Input::default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{keybindings::Keybindings, theme::Theme};

    fn key(code: KeyCode) -> Event {
        key_with_modifiers(code, KeyModifiers::NONE)
    }

    fn key_with_modifiers(code: KeyCode, modifiers: KeyModifiers) -> Event {
        Event::Input(crossterm::event::Event::Key(KeyEvent::new(code, modifiers)))
    }

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    #[test]
    fn slash_opens_menu_and_filters() {
        let mut input = PromptInput::default();
        let mut st = state();
        // 输入 "/" → 菜单打开
        input.handle_event(&key(KeyCode::Char('/')), &mut st);
        assert!(st.show_slash);
        assert_eq!(st.slash_filter, "");
        // 继续输入 "api" → 过滤
        for c in ['a', 'p', 'i'] {
            input.handle_event(&key(KeyCode::Char(c)), &mut st);
        }
        assert!(st.show_slash);
        assert_eq!(st.slash_filter, "api");
        // Enter 执行选中命令
        input.handle_event(&key(KeyCode::Enter), &mut st);
        assert_eq!(st.pending_slash, Some(SlashAction::ConfigureApi));
        assert!(!st.show_slash);
    }

    #[test]
    fn escape_closes_menu_but_keeps_input() {
        let mut input = PromptInput::default();
        let mut st = state();
        input.handle_event(&key(KeyCode::Char('/')), &mut st);
        assert!(st.show_slash);
        input.handle_event(&key(KeyCode::Esc), &mut st);
        assert!(!st.show_slash);
        assert_eq!(input.textarea.lines()[0], "/");
    }

    #[test]
    fn plain_text_sends_not_slash() {
        let mut input = PromptInput::default();
        let mut st = state();
        for c in ['h', 'i'] {
            input.handle_event(&key(KeyCode::Char(c)), &mut st);
        }
        assert!(!st.show_slash);
        input.handle_event(&key(KeyCode::Enter), &mut st);
        assert_eq!(st.pending_submit.as_deref(), Some("hi"));
        assert!(st.pending_slash.is_none());
    }

    #[test]
    fn left_and_right_edit_between_cjk_characters() {
        let mut input = PromptInput::default();
        let mut st = state();
        for c in ['你', '好'] {
            input.handle_event(&key(KeyCode::Char(c)), &mut st);
        }

        input.handle_event(&key(KeyCode::Left), &mut st);
        input.handle_event(&key(KeyCode::Char('，')), &mut st);
        assert_eq!(input.textarea.lines(), ["你，好"]);
        assert_eq!(input.textarea.cursor(), (0, 2));

        input.handle_event(&key(KeyCode::Right), &mut st);
        assert_eq!(input.textarea.cursor(), (0, 3));
    }

    #[test]
    fn up_and_down_move_inside_multiline_input() {
        let mut input = PromptInput::default();
        let mut st = state();
        for c in ['a', 'b', 'c'] {
            input.handle_event(&key(KeyCode::Char(c)), &mut st);
        }
        input.handle_event(
            &key_with_modifiers(KeyCode::Enter, KeyModifiers::SHIFT),
            &mut st,
        );
        for c in ['x', 'y'] {
            input.handle_event(&key(KeyCode::Char(c)), &mut st);
        }

        input.handle_event(&key(KeyCode::Up), &mut st);
        assert_eq!(input.textarea.cursor(), (0, 2));
        input.handle_event(&key(KeyCode::Char('!')), &mut st);
        assert_eq!(input.textarea.lines(), ["ab!c", "xy"]);

        input.handle_event(&key(KeyCode::Down), &mut st);
        assert_eq!(input.textarea.cursor(), (1, 2));
    }

    #[test]
    fn prompt_height_grows_with_lines_and_is_capped() {
        let mut input = PromptInput::default();
        assert_eq!(input.preferred_height(24), 3);
        for _ in 0..10 {
            input.textarea.insert_newline();
        }
        assert_eq!(input.preferred_height(24), 8);
        assert_eq!(input.preferred_height(7), 3);
    }

    #[test]
    fn long_cjk_input_keeps_high_contrast_cursor_visible() {
        let mut input = PromptInput::default();
        let mut st = state();
        for c in "这是一个很长的中文输入内容".chars() {
            input.handle_event(&key(KeyCode::Char(c)), &mut st);
        }

        let backend = ratatui::backend::TestBackend::new(14, 3);
        let mut terminal = ratatui::Terminal::new(backend).unwrap();
        terminal
            .draw(|frame| input.render(frame, frame.area(), &st))
            .unwrap();

        let buffer = terminal.backend().buffer();
        let cursor_cells = buffer
            .content()
            .iter()
            .filter(|cell| cell.bg == st.theme.accent)
            .count();
        assert_eq!(
            cursor_cells, 1,
            "cursor should remain visible in a narrow input"
        );
    }
}
