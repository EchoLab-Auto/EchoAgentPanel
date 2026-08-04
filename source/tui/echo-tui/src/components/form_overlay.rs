//! 对话内嵌表单组件 — 二级交互（选择列表 → 表单编辑）。
//!
//! ## 状态机
//! ```text
//!                /api              Esc/Ctrl+C
//! Inactive ──────────> Selecting ─────────────> Inactive
//!    ▲                    │  ▲
//!    │  Ctrl+C×2          │  │ Esc / Ctrl+C
//!    │                    │  │
//!    │              Enter │  │ e
//!    │                    ▼  │
//!    │               (执行操作)│
//!    │                       │
//!    ├───────────────────────┤
//!    │         Ctrl+C×2      │
//!    │                        ▼
//!    └────────────── Editing ─┘
//!                         │
//!                    Ctrl+S│
//!                         ▼
//!                      Selecting (保存后返回)
//! ```
//!
//! ## 操作
//! - Selecting: ↑↓导航 Enter执行 e编辑 Esc退出 Ctrl+C退出
//! - Editing:   ↑↓选字段 直接输入改值 Ctrl+S保存 Esc返回 Ctrl+C×2退出

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use echo_agent::BackendCommand;

use crate::backend::Backend;

// ── Types ──

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
        }
    }
}

impl FormOverlay {
    // ── lifecycle ──

    pub fn is_active(&self) -> bool { self.state != FormState::Inactive }

    pub fn activate(&mut self, title: &str, items: Vec<SelectItem>) {
        self.state = FormState::Selecting;
        self.title = title.to_string();
        self.select_items = items;
        self.select_idx = 0;
        self.fields.clear();
        self.field_idx = 0;
    }

    pub fn deactivate(&mut self) {
        self.state = FormState::Inactive;
    }

    // ── navigation ──

    fn navigate(&mut self, delta: isize) {
        match self.state {
            FormState::Selecting => {
                let len = self.select_items.len().max(1) as isize;
                let new = ((self.select_idx as isize + delta + len) % len) as usize;
                self.select_idx = new;
            }
            FormState::Editing => {
                let len = self.fields.len().max(1) as isize;
                let new = ((self.field_idx as isize + delta + len) % len) as usize;
                self.field_idx = new;
            }
            _ => {}
        }
    }

    // ── actions ──

    /// Enter edit mode. Caller should pre-fill via set_fields() before calling this.
    pub fn set_fields(&mut self, fields: Vec<FormField>) { self.fields = fields; }

    pub fn enter_edit(&mut self) {
        if self.state != FormState::Selecting { return; }
        self.field_idx = 0;
        self.state = FormState::Editing;
    }

    /// Save form fields to backend.
    pub fn save(&mut self, backend: &Backend) {
        let vals: Vec<String> = self.fields.iter().map(|f| f.value.clone()).collect();
        let provider = vals.get(0).cloned().unwrap_or_default();
        let model = vals.get(1).cloned().unwrap_or_default();
        let url = vals.get(2).cloned().unwrap_or_default();
        let key = vals.get(3).cloned().unwrap_or_default();
        let prompt = vals.get(4).cloned().unwrap_or_default();

        let send = |name, prov, mdl, url, key| {
            backend.send(BackendCommand::UpdateApiConfig {
                name, provider: prov, model: mdl, base_url: url, api_key: key,
            });
        };
        if !provider.is_empty() { send(String::new(), provider, String::new(), String::new(), String::new()); }
        if !model.is_empty() { send(String::new(), String::new(), model, String::new(), String::new()); }
        if !url.is_empty() { send(String::new(), String::new(), String::new(), url, String::new()); }
        if !key.is_empty() { send(String::new(), String::new(), String::new(), String::new(), key); }
        if !prompt.is_empty() { backend.send(BackendCommand::SetSystemPrompt { prompt }); }

        self.state = FormState::Selecting;
    }

    /// Confirm selection (Enter in Selecting mode).
    pub fn confirm(&self) -> Option<String> {
        if self.state != FormState::Selecting { return None; }
        self.select_items.get(self.select_idx).map(|s| s.value.clone())
    }

    /// Go back one level: Editing→Selecting, Selecting→Inactive.
    /// Returns true if still active after going back.
    pub fn back(&mut self) -> bool {
        match self.state {
            FormState::Editing => { self.state = FormState::Selecting; true }
            FormState::Selecting => { self.state = FormState::Inactive; false }
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
                lines.push(format!("── 编辑: {} ──", self.edit_label));
                lines.push(String::new());
                for (i, field) in self.fields.iter().enumerate() {
                    let mark = if i == self.field_idx { "▸ " } else { "  " };
                    let display = match field.kind {
                        FieldKind::Password => if field.value.is_empty() { "(未设置)".to_string() } else { "***".to_string() },
                        FieldKind::Text => if field.value.is_empty() { "(空)".to_string() } else { field.value.clone() },
                    };
                    lines.push(format!("{mark}{}: {}", field.label, display));
                }
                lines.push(String::new());
                lines.push("↑↓选字段  直接输入改值  Ctrl+S保存  Ctrl+C×1返回  Ctrl+C×2退出".into());
            }
            FormState::Selecting => {
                lines.push(format!("── {} ──", self.title));
                lines.push(String::new());
                for (i, item) in self.select_items.iter().enumerate() {
                    let mark = if i == self.select_idx { "▸" } else { " " };
                    let radio = if item.value.is_empty() { " " } else { "●" };
                    lines.push(format!(" {mark}{radio} {}", item.label));
                }
                lines.push(String::new());
                lines.push("↑↓选择  Enter切换  e编辑  Ctrl+C×2退出".into());
            }
            FormState::Inactive => {}
        }
        lines.join("\n")
    }

    // ── input handling ──

    /// Handle a key event. Returns `true` if the key was consumed.
    /// Handle key events that DON'T need AppState access.
    /// Returns `Some(true)` if key was consumed, `None` if caller should handle.
    pub fn handle_key(&mut self, key: &KeyEvent, backend: &Backend) -> bool {
        if !self.is_active() { return false; }

        let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        if ctrl && key.code == KeyCode::Char('c') {
            // Ctrl+C handling is done in app.rs (double-press logic).
            // Here we just handle the state transitions triggered by app.rs.
            return false; // Let app.rs handle it.
        }

        match self.state {
            FormState::Selecting => match key.code {
                KeyCode::Up => { self.navigate(-1); return true; }
                KeyCode::Down => { self.navigate(1); return true; }
                // Enter and e are handled in app.rs (need AppState access)
                _ => {}
            },
            FormState::Editing => match key.code {
                KeyCode::Up => { self.navigate(-1); return true; }
                KeyCode::Down => { self.navigate(1); return true; }
                KeyCode::Char('s') if ctrl => { self.save(backend); return true; }
                _ => {}
            },
            _ => {}
        }
        false
    }
}
