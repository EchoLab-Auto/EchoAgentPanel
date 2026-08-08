//! 对话内嵌表单组件 — 二级交互（选择列表 → 表单编辑）。
//!
//! Supports multiple form kinds via [`FormKind`]:
//! - `ApiConfig`: API configuration (multi-field editing, Ctrl+S save)
//! - `QqFilter`: QQ allowlist/denylist management (single QQ-number prompt)
//!
//! ## 操作
//! - Selecting: ↑↓导航 Enter执行 e编辑 Esc退出 Ctrl+C退出
//! - Editing:   ↑↓选字段 直接输入改值 Ctrl+S保存 Esc返回 Ctrl+C×2退出

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use echo_agent::BackendCommand;

use crate::backend::Backend;

// ── Types ──

/// 表单类型 — determines editing behavior.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum FormKind {
    /// API configuration form (multi-field: provider, model, url, key, prompt).
    #[default]
    ApiConfig,
    /// QQ allowlist/denylist form (single-field: QQ number).
    QqFilter,
}

/// 表单状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FormState {
    Inactive,
    Selecting,
    Editing,
}

/// 单选列表项。
#[derive(Debug, Clone)]
pub struct SelectItem {
    pub label: String,
    pub value: String,
}

/// 表单字段。
#[derive(Debug, Clone)]
pub struct FormField {
    pub label: String,
    pub value: String,
    pub kind: FieldKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FieldKind {
    Text,
    Password,
}

/// 对话内嵌表单组件。
#[derive(Debug, Clone)]
pub struct FormOverlay {
    pub state: FormState,
    pub title: String,
    pub select_items: Vec<SelectItem>,
    pub select_idx: usize,
    pub fields: Vec<FormField>,
    pub field_idx: usize,
    pub edit_label: String,
    /// Which kind of form this is.
    pub form_kind: FormKind,
    /// Scroll offset for adaptive scrolling in Selecting mode.
    pub select_scroll_offset: usize,
    /// Scroll offset for adaptive scrolling in Editing mode.
    pub edit_scroll_offset: usize,
    /// Number of visible items in the viewport.
    pub viewport_size: usize,
}

impl Default for FormOverlay {
    fn default() -> Self {
        Self {
            state: FormState::Inactive,
            title: String::new(),
            select_items: Vec::new(),
            select_idx: 0,
            fields: Vec::new(),
            field_idx: 0,
            edit_label: String::new(),
            form_kind: FormKind::default(),
            select_scroll_offset: 0,
            edit_scroll_offset: 0,
            viewport_size: 10, // Default viewport shows 10 items
        }
    }
}

impl FormOverlay {
    // ── lifecycle ──

    pub fn is_active(&self) -> bool {
        self.state != FormState::Inactive
    }

    pub fn activate(&mut self, title: &str, items: Vec<SelectItem>, kind: FormKind) {
        self.state = FormState::Selecting;
        self.title = title.to_string();
        // Calculate viewport size before moving items
        self.viewport_size = items.len().clamp(5, 15);
        self.select_items = items;
        self.select_idx = 0;
        self.fields.clear();
        self.field_idx = 0;
        self.form_kind = kind;
        self.select_scroll_offset = 0;
        self.edit_scroll_offset = 0;
    }

    pub fn deactivate(&mut self) {
        self.state = FormState::Inactive;
    }

    // ── navigation ──

    /// Move by `delta` items (wrapping), or 0 for no-op.
    fn shift_idx(&mut self, delta: isize) {
        let (idx, len) = match self.state {
            FormState::Selecting => (&mut self.select_idx, self.select_items.len()),
            FormState::Editing => (&mut self.field_idx, self.fields.len()),
            _ => return,
        };
        let len = len.max(1) as isize;
        *idx = ((*idx as isize + delta + len) % len) as usize;

        // Adaptive scrolling based on mode
        match self.state {
            FormState::Selecting if !self.select_items.is_empty() => {
                self.update_select_scroll_offset();
            }
            FormState::Editing if !self.fields.is_empty() => {
                self.update_edit_scroll_offset();
            }
            _ => {}
        }
    }

    fn navigate(&mut self, delta: isize) {
        self.shift_idx(delta);
    }

    /// Update scroll offset to ensure selected item is visible in the viewport (Selecting mode).
    fn update_select_scroll_offset(&mut self) {
        if self.select_items.is_empty() {
            return;
        }

        let viewport_end = self.select_scroll_offset.saturating_add(self.viewport_size);
        let selected = self.select_idx;

        // If selected item is before viewport, scroll up
        if selected < self.select_scroll_offset {
            self.select_scroll_offset = selected;
        }
        // If selected item is after viewport, scroll down
        else if selected >= viewport_end && self.viewport_size > 0 {
            self.select_scroll_offset =
                selected.saturating_sub(self.viewport_size.saturating_sub(1));
            // Ensure we don't go beyond the list
            let max_offset = self.select_items.len().saturating_sub(self.viewport_size);
            self.select_scroll_offset = self.select_scroll_offset.min(max_offset);
        }
    }

    /// Update scroll offset to ensure selected field is visible in the viewport (Editing mode).
    fn update_edit_scroll_offset(&mut self) {
        if self.fields.is_empty() {
            return;
        }

        let viewport_end = self.edit_scroll_offset.saturating_add(self.viewport_size);
        let selected = self.field_idx;

        // If selected field is before viewport, scroll up
        if selected < self.edit_scroll_offset {
            self.edit_scroll_offset = selected;
        }
        // If selected field is after viewport, scroll down
        else if selected >= viewport_end && self.viewport_size > 0 {
            self.edit_scroll_offset = selected.saturating_sub(self.viewport_size.saturating_sub(1));
            // Ensure we don't go beyond the list
            let max_offset = self.fields.len().saturating_sub(self.viewport_size);
            self.edit_scroll_offset = self.edit_scroll_offset.min(max_offset);
        }
    }

    /// Jump to the first or last item.
    fn jump_to(&mut self, end: bool) {
        match self.state {
            FormState::Selecting => {
                if end {
                    self.select_idx = self.select_items.len().saturating_sub(1);
                    // Scroll to show the last item
                    let max_offset = self.select_items.len().saturating_sub(self.viewport_size);
                    self.select_scroll_offset = max_offset;
                } else {
                    self.select_idx = 0;
                    self.select_scroll_offset = 0;
                }
            }
            FormState::Editing => {
                if end {
                    self.field_idx = self.fields.len().saturating_sub(1);
                    // Scroll to show the last field
                    let max_offset = self.fields.len().saturating_sub(self.viewport_size);
                    self.edit_scroll_offset = max_offset;
                } else {
                    self.field_idx = 0;
                    self.edit_scroll_offset = 0;
                }
            }
            _ => {}
        }
    }

    // ── actions ──

    /// Enter edit mode. Caller should pre-fill via set_fields() before calling this.
    pub fn set_fields(&mut self, fields: Vec<FormField>) {
        self.fields = fields;
    }

    pub fn enter_edit(&mut self) {
        if self.state != FormState::Selecting {
            return;
        }
        self.field_idx = 0;
        self.state = FormState::Editing;
    }

    /// Save form fields to backend. Only meaningful for ApiConfig.
    pub fn save(&mut self, backend: &Backend) {
        if self.form_kind != FormKind::ApiConfig {
            return;
        }
        let vals: Vec<String> = self.fields.iter().map(|f| f.value.clone()).collect();
        let provider = vals.first().cloned().unwrap_or_default();
        let model = vals.get(1).cloned().unwrap_or_default();
        let url = vals.get(2).cloned().unwrap_or_default();
        let key = vals.get(3).cloned().unwrap_or_default();
        let prompt = vals.get(4).cloned().unwrap_or_default();

        let send = |name, prov, mdl, url, key| {
            backend.send(BackendCommand::UpdateApiConfig {
                name,
                provider: prov,
                model: mdl,
                base_url: url,
                api_key: key,
            });
        };
        if !provider.is_empty() {
            send(
                String::new(),
                provider,
                String::new(),
                String::new(),
                String::new(),
            );
        }
        if !model.is_empty() {
            send(
                String::new(),
                String::new(),
                model,
                String::new(),
                String::new(),
            );
        }
        if !url.is_empty() {
            send(
                String::new(),
                String::new(),
                String::new(),
                url,
                String::new(),
            );
        }
        if !key.is_empty() {
            send(
                String::new(),
                String::new(),
                String::new(),
                String::new(),
                key,
            );
        }
        if !prompt.is_empty() {
            backend.send(BackendCommand::SetSystemPrompt { prompt });
        }

        self.state = FormState::Selecting;
    }

    /// Confirm selection (Enter in Selecting mode).
    pub fn confirm(&self) -> Option<String> {
        if self.state != FormState::Selecting {
            return None;
        }
        self.select_items
            .get(self.select_idx)
            .map(|s| s.value.clone())
    }

    /// Go back one level: Editing→Selecting, Selecting→Inactive.
    /// Returns true if still active after going back.
    pub fn back(&mut self) -> bool {
        match self.state {
            FormState::Editing => {
                self.state = FormState::Selecting;
                true
            }
            FormState::Selecting => {
                self.state = FormState::Inactive;
                false
            }
            _ => false,
        }
    }

    /// Set the value of the currently selected field.
    pub fn set_field_value(&mut self, value: &str) {
        if self.state == FormState::Editing {
            if let Some(f) = self.fields.get_mut(self.field_idx) {
                f.value = value.to_string();
            }
        }
    }

    // ── rendering ──

    /// Build the chat message text for the current form state.
    pub fn render_text(&self) -> String {
        let mut lines: Vec<String> = Vec::new();
        match self.state {
            FormState::Editing => {
                let total = self.fields.len();
                let pos = format!("{}/{}", self.field_idx.saturating_add(1), total);
                lines.push(format!("── 编辑: {}  ({pos}) ──", self.edit_label));

                // Show scroll indicators at appropriate positions
                let has_scroll_up = self.edit_scroll_offset > 0;
                let has_scroll_down = {
                    let viewport_end = self
                        .edit_scroll_offset
                        .saturating_add(self.viewport_size)
                        .min(total);
                    viewport_end < total
                };

                if has_scroll_up {
                    lines.push("    ▲ (向上滚动)".to_string());
                } else {
                    lines.push(String::new());
                }

                // Only render visible fields in the viewport
                let viewport_end = self
                    .edit_scroll_offset
                    .saturating_add(self.viewport_size)
                    .min(total);
                for i in self.edit_scroll_offset..viewport_end {
                    if let Some(field) = self.fields.get(i) {
                        let mark = if i == self.field_idx { "▸ " } else { "  " };
                        let display = match field.kind {
                            FieldKind::Password => {
                                if field.value.is_empty() {
                                    "(未设置)".to_string()
                                } else {
                                    "***".to_string()
                                }
                            }
                            FieldKind::Text => {
                                if field.value.is_empty() {
                                    "(空)".to_string()
                                } else {
                                    field.value.clone()
                                }
                            }
                        };
                        lines.push(format!("{mark}{}: {}", field.label, display));
                    }
                }

                if has_scroll_down {
                    lines.push("    ▼ (向下滚动)".to_string());
                }

                lines.push(String::new());
                match self.form_kind {
                    FormKind::ApiConfig => {
                        lines.push(
                            "↑↓选字段  直接输入改值  Ctrl+S保存  Esc返回  Ctrl+C×2退出".into(),
                        );
                    }
                    FormKind::QqFilter => {
                        lines.push("输入号码后 Enter确认  Esc取消".into());
                    }
                }
            }
            FormState::Selecting => {
                let total = self.select_items.len();
                let pos = format!("{}/{}", self.select_idx.saturating_add(1), total);
                lines.push(format!("── {}  ({pos}) ──", self.title));

                // Show scroll indicators at appropriate positions
                let has_scroll_up = self.select_scroll_offset > 0;
                let has_scroll_down = {
                    let viewport_end = self
                        .select_scroll_offset
                        .saturating_add(self.viewport_size)
                        .min(total);
                    viewport_end < total
                };

                if has_scroll_up {
                    lines.push("    ▲ (向上滚动)".to_string());
                } else {
                    lines.push(String::new());
                }

                // Max visible width for labels (keep each row on one terminal line).
                const LABEL_MAX_CHARS: usize = 64;

                // Only render visible items in the viewport
                let viewport_end = self
                    .select_scroll_offset
                    .saturating_add(self.viewport_size)
                    .min(total);
                for i in self.select_scroll_offset..viewport_end {
                    if let Some(item) = self.select_items.get(i) {
                        let mark = if i == self.select_idx { "▸" } else { " " };
                        let radio = if item.value == "__info__" { " " } else { "●" };
                        let label = truncate_label(&item.label, LABEL_MAX_CHARS);
                        lines.push(format!(" {mark}{radio} {label}"));
                    }
                }

                if has_scroll_down {
                    lines.push("    ▼ (向下滚动)".to_string());
                }

                lines.push(String::new());
                let nav = match self.form_kind {
                    FormKind::ApiConfig => "↑↓选择  Home/End首尾  Enter切换  e编辑  Ctrl+C×2退出",
                    FormKind::QqFilter => "↑↓选择  Home/End首尾  Enter/e执行  Ctrl+C×2退出",
                };
                lines.push(nav.into());
            }
            FormState::Inactive => {}
        }
        lines.join("\n")
    }

    // ── input handling ──

    /// Handle a key event. Returns `true` if the key was consumed.
    /// Handle key events that DON'T need AppState access.
    pub fn handle_key(&mut self, key: &KeyEvent, backend: &Backend) -> bool {
        if !self.is_active() {
            return false;
        }

        let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        if ctrl && key.code == KeyCode::Char('c') {
            // Ctrl+C handling is done in app.rs (double-press logic).
            return false;
        }

        // ── Shared navigation keys (both Selecting and Editing) ──
        match key.code {
            KeyCode::Up => {
                self.navigate(-1);
                return true;
            }
            KeyCode::Down => {
                self.navigate(1);
                return true;
            }
            // PgUp/PgDn still work for faster navigation (jump by viewport size)
            KeyCode::PageUp => {
                // Jump up by viewport size
                let jump = self.viewport_size as isize;
                self.navigate(-jump);
                return true;
            }
            KeyCode::PageDown => {
                // Jump down by viewport size
                let jump = self.viewport_size as isize;
                self.navigate(jump);
                return true;
            }
            KeyCode::Home => {
                self.jump_to(false);
                return true;
            }
            KeyCode::End => {
                self.jump_to(true);
                return true;
            }
            _ => {}
        }

        // ── State-specific keys ──
        if let FormState::Editing = self.state {
            if ctrl && key.code == KeyCode::Char('s') && self.form_kind == FormKind::ApiConfig {
                self.save(backend);
                return true;
            }
        }
        false
    }
}

/// Truncate a label to `max_chars` visual characters, appending "…" if cut.
fn truncate_label(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        return s.to_string();
    }
    let mut out = String::with_capacity(max_chars + 3);
    for (i, ch) in s.chars().enumerate() {
        if i >= max_chars.saturating_sub(1) {
            break;
        }
        out.push(ch);
    }
    out.push('…');
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn items(n: usize) -> Vec<SelectItem> {
        (0..n)
            .map(|i| SelectItem {
                label: format!("item {i}"),
                value: format!("v{i}"),
            })
            .collect()
    }

    fn key(code: KeyCode, ctrl: bool) -> KeyEvent {
        KeyEvent::new(
            code,
            if ctrl {
                KeyModifiers::CONTROL
            } else {
                KeyModifiers::NONE
            },
        )
    }

    #[test]
    fn inactive_form_ignores_keys() {
        let (backend, _handle) = {
            let (bridge, handle) = echo_agent::create_bridge();
            (Backend::new(std::sync::Arc::new(bridge)), handle)
        };
        let mut fo = FormOverlay::default();
        assert!(!fo.is_active());
        assert!(!fo.handle_key(&key(KeyCode::Down, false), &backend));
        assert_eq!(fo.confirm(), None);
    }

    #[test]
    fn navigation_wraps_around() {
        let mut fo = FormOverlay::default();
        fo.activate("t", items(3), FormKind::ApiConfig);
        assert_eq!(fo.select_idx, 0);
        fo.navigate(-1); // wrap to last
        assert_eq!(fo.select_idx, 2);
        fo.navigate(1);
        assert_eq!(fo.select_idx, 0);
        fo.navigate(1);
        fo.navigate(1);
        assert_eq!(fo.select_idx, 2);
    }

    #[test]
    fn confirm_returns_selected_value() {
        let mut fo = FormOverlay::default();
        fo.activate("t", items(3), FormKind::QqFilter);
        fo.select_idx = 1;
        assert_eq!(fo.confirm(), Some("v1".into()));
    }

    #[test]
    fn confirm_inactive_or_editing_returns_none() {
        let fo = FormOverlay::default();
        assert_eq!(fo.confirm(), None);
        let mut fo = FormOverlay::default();
        fo.activate("t", items(1), FormKind::ApiConfig);
        fo.enter_edit();
        assert_eq!(fo.confirm(), None);
    }

    #[test]
    fn back_transitions_editing_selecting_inactive() {
        let mut fo = FormOverlay::default();
        fo.activate("t", items(2), FormKind::ApiConfig);
        fo.enter_edit();
        assert_eq!(fo.state, FormState::Editing);
        assert!(fo.back());
        assert_eq!(fo.state, FormState::Selecting);
        assert!(!fo.back());
        assert_eq!(fo.state, FormState::Inactive);
    }

    #[test]
    fn render_text_lists_selection_with_cursor() {
        let mut fo = FormOverlay::default();
        fo.activate("标题", items(2), FormKind::QqFilter);
        fo.select_idx = 1;
        let text = fo.render_text();
        assert!(text.contains("── 标题"), "title present: {text}");
        assert!(text.contains("(2/2)"), "position indicator: {text}");
        assert!(text.contains("▸"));
        assert!(text.contains("item 0"));
        assert!(text.contains("item 1"));
    }

    #[test]
    fn render_text_masks_password_fields() {
        let mut fo = FormOverlay::default();
        fo.activate("api", items(0), FormKind::ApiConfig);
        fo.set_fields(vec![
            FormField {
                label: "APIKey".into(),
                value: "secret".into(),
                kind: FieldKind::Password,
            },
            FormField {
                label: "Model".into(),
                value: String::new(),
                kind: FieldKind::Text,
            },
        ]);
        fo.enter_edit();
        let text = fo.render_text();
        assert!(text.contains("***"), "password must be masked");
        assert!(!text.contains("secret"), "password must not leak");
        assert!(text.contains("(空)"));
    }

    #[test]
    fn set_field_value_updates_selected_field_only() {
        let mut fo = FormOverlay::default();
        fo.activate("api", items(0), FormKind::ApiConfig);
        fo.set_fields(vec![
            FormField {
                label: "A".into(),
                value: "a".into(),
                kind: FieldKind::Text,
            },
            FormField {
                label: "B".into(),
                value: "b".into(),
                kind: FieldKind::Text,
            },
        ]);
        fo.enter_edit();
        fo.set_field_value("new");
        assert_eq!(fo.fields[0].value, "new");
        assert_eq!(fo.fields[1].value, "b");
    }

    #[tokio::test]
    async fn save_sends_commands_for_nonempty_fields() {
        let (bridge, handle) = echo_agent::create_bridge();
        let backend = Backend::new(std::sync::Arc::new(bridge));
        let mut fo = FormOverlay::default();
        fo.activate("api", items(0), FormKind::ApiConfig);
        fo.set_fields(vec![
            FormField {
                label: "Provider".into(),
                value: "deepseek".into(),
                kind: FieldKind::Text,
            },
            FormField {
                label: "Model".into(),
                value: "deepseek-v4-flash".into(),
                kind: FieldKind::Text,
            },
            FormField {
                label: "BaseURL".into(),
                value: String::new(),
                kind: FieldKind::Text,
            },
            FormField {
                label: "APIKey".into(),
                value: "sk-123".into(),
                kind: FieldKind::Password,
            },
            FormField {
                label: "Prompt".into(),
                value: "你好".into(),
                kind: FieldKind::Text,
            },
        ]);
        fo.enter_edit();
        fo.save(&backend);

        let mut commands = Vec::new();
        while let Ok(cmd) = handle.command_rx.try_lock().unwrap().try_recv() {
            commands.push(cmd);
        }
        // provider + model + key + prompt = 4 commands (empty url skipped)
        assert_eq!(commands.len(), 4);
        assert_eq!(
            commands[0],
            BackendCommand::UpdateApiConfig {
                name: String::new(),
                provider: "deepseek".into(),
                model: String::new(),
                base_url: String::new(),
                api_key: String::new(),
            }
        );
        assert_eq!(
            commands[3],
            BackendCommand::SetSystemPrompt {
                prompt: "你好".into()
            }
        );
        // After save the form returns to selecting.
        assert_eq!(fo.state, FormState::Selecting);
    }

    #[test]
    fn save_is_noop_for_non_api_forms() {
        let (bridge, handle) = echo_agent::create_bridge();
        let backend = Backend::new(std::sync::Arc::new(bridge));
        let mut fo = FormOverlay::default();
        fo.activate("qq", items(0), FormKind::QqFilter);
        fo.save(&backend);
        assert!(
            handle.command_rx.try_lock().unwrap().try_recv().is_err(),
            "QqFilter forms must not save"
        );
    }

    #[test]
    fn handle_key_navigates_and_consumes() {
        let (bridge, _handle) = echo_agent::create_bridge();
        let backend = Backend::new(std::sync::Arc::new(bridge));
        let mut fo = FormOverlay::default();
        fo.activate("t", items(3), FormKind::ApiConfig);
        assert!(fo.handle_key(&key(KeyCode::Down, false), &backend));
        assert_eq!(fo.select_idx, 1);
        assert!(fo.handle_key(&key(KeyCode::Up, false), &backend));
        assert_eq!(fo.select_idx, 0);
    }

    #[test]
    fn adaptive_scrolling_with_viewport() {
        let mut fo = FormOverlay::default();
        fo.activate("t", items(25), FormKind::QqFilter); // 25 items, viewport size will be min(25, 15).max(5) = 15

        // Initial state: scroll_offset = 0, select_idx = 0
        assert_eq!(fo.select_scroll_offset, 0);
        assert_eq!(fo.select_idx, 0);

        // Navigate down beyond viewport to trigger scrolling
        for _ in 0..20 {
            fo.navigate(1);
        }
        // After 20 steps, select_idx should be 20 (wrapping: 0 + 20 = 20)
        assert_eq!(fo.select_idx, 20);

        // Scroll offset should have adjusted to keep selected item visible
        // viewport_end = scroll_offset + 15 should be >= 20
        let viewport_end = fo.select_scroll_offset + fo.viewport_size;
        assert!(
            viewport_end > fo.select_idx,
            "selected item should be in viewport"
        );

        // Navigate to first item using jump_to
        fo.jump_to(false);
        assert_eq!(fo.select_idx, 0);
        assert_eq!(
            fo.select_scroll_offset, 0,
            "scroll should reset when jumping to start"
        );

        // Navigate to last item using jump_to
        fo.jump_to(true);
        assert_eq!(fo.select_idx, 24);
        // Scroll offset should show last items
        assert!(
            fo.select_scroll_offset > 0,
            "scroll should adjust when jumping to end"
        );
    }

    #[test]
    fn jump_to_moves_to_first_and_last() {
        let mut fo = FormOverlay::default();
        fo.activate("t", items(5), FormKind::QqFilter);
        fo.select_idx = 2;
        fo.jump_to(true);
        assert_eq!(fo.select_idx, 4, "End");
        fo.jump_to(false);
        assert_eq!(fo.select_idx, 0, "Home");
    }

    #[test]
    fn render_text_includes_position_indicator() {
        let mut fo = FormOverlay::default();
        fo.activate("标题", items(5), FormKind::QqFilter);
        fo.select_idx = 2;
        let text = fo.render_text();
        assert!(
            text.contains("(3/5)"),
            "position indicator in title: {text}"
        );
    }

    #[test]
    fn truncate_label_cuts_long_strings() {
        let s = "x".repeat(100);
        let t = truncate_label(&s, 20);
        assert_eq!(t.chars().count(), 20, "truncated with …");
        assert!(t.ends_with('…'));
        // Short strings unchanged.
        assert_eq!(truncate_label("hi", 20), "hi");
    }
}
