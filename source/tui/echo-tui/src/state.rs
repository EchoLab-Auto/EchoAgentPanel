//! Application state — data types, [`AppState`], and its methods.
//!
//! Extracted from the old `app.rs` god file.

use std::collections::HashMap;
use std::time::Duration;

use echo_agent::{BackendCommand, SessionInfo};

use crate::components::form_overlay::FormOverlay;
use crate::components::settings_popup::SettingsForm;
use crate::keybindings::Keybindings;
use crate::slash_commands::SlashAction;
use crate::theme::Theme;
use crate::util;

// ── Message types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MsgRole {
    User,
    Agent,
    Tool,
    System,
}

#[derive(Debug, Clone)]
pub struct DisplayMessage {
    pub role: MsgRole,
    pub content: String,
    pub time: i64,
}

// ── Toast ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToastKind {
    Info,
    Success,
    Error,
}

#[derive(Debug, Clone)]
pub struct Toast {
    pub text: String,
    pub kind: ToastKind,
    pub created: std::time::Instant,
}

// ── Adapter status ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct AdapterStatusEntry {
    pub name: String,
    pub display_name: String,
    pub connected: bool,
    pub running: bool,
    pub self_id: Option<String>,
    pub bind_address: String,
    pub started_at: Option<i64>,
}

#[derive(Debug, Clone, Default)]
pub struct StatusInfo {
    pub adapters: Vec<AdapterStatusEntry>,
    pub model: String,
    pub provider: String,
    pub base_url: String,
    pub skills: Vec<String>,
    pub system_prompt: String,
}

impl StatusInfo {
    pub fn set_adapter_state(
        &mut self,
        name: &str,
        display_name: &str,
        connected: bool,
        running: bool,
        self_id: Option<String>,
        bind_address: &str,
        started_at: Option<i64>,
    ) {
        if let Some(entry) = self.adapters.iter_mut().find(|a| a.name == name) {
            entry.connected = connected;
            entry.running = running;
            entry.self_id = self_id;
            entry.bind_address = bind_address.to_string();
            entry.started_at = started_at;
        } else {
            self.adapters.push(AdapterStatusEntry {
                name: name.to_string(),
                display_name: display_name.to_string(),
                connected,
                running,
                self_id,
                bind_address: bind_address.to_string(),
                started_at,
            });
        }
    }

    pub fn is_connected(&self) -> bool {
        self.adapters.iter().any(|a| a.connected)
    }
}

// ── Mode enums ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteMode {
    Commands,
    Sessions,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConversationMode {
    Normal,
    ApiConfig,
}

// ── Constants ──────────────────────────────────────────────────────────────

pub const SPINNER: [char; 8] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'];

// ── QQ filter cache ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct QqFilterCache {
    pub allowlist_users: Vec<i64>,
    pub allowlist_groups: Vec<i64>,
    pub denylist_users: Vec<i64>,
    pub denylist_groups: Vec<i64>,
}

// ── AppState ───────────────────────────────────────────────────────────────

pub struct AppState {
    pub running: bool,
    pub theme: Theme,
    pub keybindings: Keybindings,
    pub active_session_id: Option<String>,
    pub sessions: Vec<SessionInfo>,
    pub messages: HashMap<String, Vec<DisplayMessage>>,
    pub show_palette: bool,
    pub palette_mode: PaletteMode,
    pub show_help: bool,
    pub show_settings: bool,
    pub settings: SettingsForm,
    pub palette_selection: usize,
    pub status: StatusInfo,
    pub chat_scroll: usize,
    pub pending_submit: Option<String>,
    pub pending_command: Option<BackendCommand>,
    pub show_slash: bool,
    pub slash_filter: String,
    pub slash_selection: usize,
    pub pending_slash: Option<SlashAction>,
    pub pending_slash_text: String,
    pub leader_active: bool,
    pub leader_pressed_at: std::time::Instant,
    pub quit_armed: bool,
    pub quit_armed_at: std::time::Instant,
    pub anim_tick: u64,
    pub llm_in_flight: bool,
    pub tool_in_flight: Option<(String, std::time::Instant)>,
    pub chat_flash_until: Option<std::time::Instant>,
    pub mode: ConversationMode,
    pub form_overlay: FormOverlay,
    pub pending_action: Option<String>,
    pub menu_msg_idx: isize,
    pub qq_filter: QqFilterCache,
    /// Cached QQ group list (fetched from adapter on request).
    pub qq_groups: Vec<(i64, String)>,
    // Mouse text selection
    pub selecting: bool,
    pub sel_anchor: Option<(usize, usize)>,
    pub sel_other: Option<(usize, usize)>,
    pub conv_text: Vec<String>,
    pub conv_area: ratatui::layout::Rect,
    pub conv_top: usize,
}

impl AppState {
    pub fn new(theme: Theme, keybindings: Keybindings) -> Self {
        Self {
            running: true,
            theme,
            keybindings,
            active_session_id: None,
            sessions: Vec::new(),
            messages: HashMap::new(),
            show_palette: false,
            palette_mode: PaletteMode::Commands,
            show_help: false,
            show_settings: false,
            settings: SettingsForm::default(),
            palette_selection: 0,
            status: StatusInfo::default(),
            chat_scroll: 0,
            pending_submit: None,
            pending_command: None,
            show_slash: false,
            slash_filter: String::new(),
            slash_selection: 0,
            pending_slash: None,
            pending_slash_text: String::new(),
            leader_active: false,
            leader_pressed_at: std::time::Instant::now(),
            quit_armed: false,
            quit_armed_at: std::time::Instant::now(),
            anim_tick: 0,
            llm_in_flight: false,
            tool_in_flight: None,
            chat_flash_until: None,
            mode: ConversationMode::Normal,
            form_overlay: Default::default(),
            pending_action: None,
            menu_msg_idx: -1,
            qq_filter: QqFilterCache::default(),
            qq_groups: Vec::new(),
            selecting: false,
            sel_anchor: None,
            sel_other: None,
            conv_text: Vec::new(),
            conv_area: ratatui::layout::Rect::default(),
            conv_top: 0,
        }
    }

    pub fn active_session(&self) -> Option<&SessionInfo> {
        let id = self.active_session_id.as_deref()?;
        self.sessions.iter().find(|s| s.id == id)
    }

    pub fn active_messages(&self) -> &[DisplayMessage] {
        match &self.active_session_id {
            Some(id) => self.messages.get(id).map(|v| v.as_slice()).unwrap_or(&[]),
            None => &[],
        }
    }

    pub fn push_message(&mut self, session_id: &str, msg: DisplayMessage) {
        self.messages
            .entry(session_id.to_string())
            .or_default()
            .push(msg);
        self.chat_scroll = 0;
        self.chat_flash_until = Some(std::time::Instant::now() + Duration::from_millis(700));
    }

    /// Push or update the interactive form as a chat message.
    pub fn refresh_menu_msg(&mut self) {
        if !self.form_overlay.is_active() {
            return;
        }
        let sid = self
            .active_session_id
            .clone()
            .unwrap_or_else(|| "local:tui::local_user".into());
        if self.active_session_id.is_none() {
            self.active_session_id = Some(sid.clone());
        }
        let text = self.form_overlay.render_text();

        if self.menu_msg_idx >= 0 {
            if let Some(msgs) = self.messages.get_mut(&sid) {
                let idx = self.menu_msg_idx as usize;
                if idx < msgs.len() {
                    msgs[idx].content = text;
                    msgs[idx].time = chrono::Utc::now().timestamp();
                    return;
                }
            }
        }
        self.push_message(
            &sid,
            DisplayMessage {
                role: MsgRole::System,
                content: text,
                time: chrono::Utc::now().timestamp(),
            },
        );
        self.menu_msg_idx =
            (self.messages.get(&sid).map(|m| m.len()).unwrap_or(1) - 1) as isize;
    }

    // ── Mouse selection helpers ────────────────────────────────────────

    pub fn point_in_conv(&self, x: u16, y: u16) -> bool {
        let a = self.conv_area;
        x >= a.x
            && x < a.x.saturating_add(a.width)
            && y >= a.y.saturating_add(1)
            && y < a.y.saturating_add(a.height)
    }

    pub fn row_index_from_screen(&self, my: u16) -> Option<usize> {
        if self.conv_text.is_empty() {
            return None;
        }
        let a = self.conv_area;
        let inner_h = a.height.saturating_sub(1) as i16;
        if inner_h <= 0 {
            return None;
        }
        let iy0 = a.y + 1;
        let y = my.clamp(iy0, iy0 + inner_h as u16 - 1);
        let mut idx = self.conv_top + (y - iy0) as usize;
        let last = self.conv_text.len() - 1;
        if idx > last {
            idx = last;
        }
        Some(idx)
    }

    pub fn no_modal(&self) -> bool {
        !self.show_palette
            && !self.show_help
            && !self.show_settings
            && !self.show_slash
    }

    pub fn col_from_screen(&self, mx: u16) -> usize {
        let inner_w = self.conv_area.width.max(1) as i64;
        let offset = (mx as i64) - (self.conv_area.x as i64);
        (offset.max(0) as usize).min((inner_w - 1).max(0) as usize)
    }

    pub fn begin_selection(&mut self, mx: u16, my: u16) {
        if let Some(row) = self.row_index_from_screen(my) {
            let col = self.col_from_screen(mx);
            self.sel_anchor = Some((row, col));
            self.sel_other = Some((row, col));
            self.selecting = true;
        }
    }

    pub fn update_selection(&mut self, mx: u16, my: u16) {
        if let Some(row) = self.row_index_from_screen(my) {
            let col = self.col_from_screen(mx);
            self.sel_other = Some((row, col));
        }
    }

    pub fn clear_selection(&mut self) {
        self.selecting = false;
        self.sel_anchor = None;
        self.sel_other = None;
    }

    pub fn selection_rect(&self) -> Option<(usize, usize, usize, usize)> {
        if !self.selecting {
            return None;
        }
        let a = self.sel_anchor?;
        let b = self.sel_other?;
        if self.conv_text.is_empty() {
            return None;
        }
        let last = self.conv_text.len() - 1;
        let (ar, ac) = (a.0.min(last), a.1);
        let (br, bc) = (b.0.min(last), b.1);
        if (ar, ac) <= (br, bc) {
            Some((ar, ac, br, bc))
        } else {
            Some((br, bc, ar, ac))
        }
    }

    pub fn finish_selection(&mut self) {
        let Some((sr, sc, er, ec)) = self.selection_rect() else {
            self.clear_selection();
            return;
        };
        let lines = &self.conv_text;
        let text = if sr == er {
            let s = &lines[sr];
            s[util::col_to_byte(s, sc)..util::col_to_byte(s, ec)].to_string()
        } else {
            let mut parts: Vec<String> = Vec::new();
            let s0 = &lines[sr];
            parts.push(s0[util::col_to_byte(s0, sc)..].to_string());
            for idx in sr + 1..er {
                parts.push(lines[idx].clone());
            }
            let sn = &lines[er];
            parts.push(sn[..util::col_to_byte(sn, ec)].to_string());
            parts.join("\n")
        };
        if !text.trim().is_empty() {
            crate::clipboard::copy_to_clipboard(&text);
        }
        self.clear_selection();
    }

    /// Load session messages from the persistence file.
    pub fn load_session_messages(&mut self, session_id: &str) {
        use std::path::PathBuf;
        let path = PathBuf::from("echo-sessions.json");
        if !path.exists() {
            let path = PathBuf::from("config/echo-sessions.json");
            if !path.exists() {
                return;
            }
            self.load_from_file(&path, session_id);
        } else {
            self.load_from_file(&path, session_id);
        }
    }

    fn load_from_file(&mut self, path: &std::path::PathBuf, session_id: &str) {
        let Ok(data) = std::fs::read_to_string(path) else {
            return;
        };
        let Ok(sessions) = serde_json::from_str::<Vec<serde_json::Value>>(&data) else {
            return;
        };
        for s in &sessions {
            let Some(id) = s["id"].as_str() else { continue };
            if id != session_id {
                continue;
            }
            let Some(history) = s["history"].as_array() else {
                continue;
            };
            let msgs = self.messages.entry(session_id.to_string()).or_default();
            msgs.clear();
            for m in history {
                let role = match m["role"].as_str().unwrap_or("user") {
                    "user" => MsgRole::User,
                    "assistant" => MsgRole::Agent,
                    "tool" => MsgRole::Tool,
                    _ => MsgRole::System,
                };
                let content = m["content"].as_str().unwrap_or("").to_string();
                msgs.push(DisplayMessage { role, content, time: 0 });
            }
            return;
        }
    }

    pub fn toast(&mut self, text: impl Into<String>, _kind: ToastKind) {
        let text: String = text.into();
        let text: String = text.chars().take(4096).collect();
        let session_id = self
            .active_session_id
            .clone()
            .unwrap_or_else(|| "local:tui::local_user".into());
        if self.active_session_id.is_none() {
            self.active_session_id = Some(session_id.clone());
        }
        if !self.sessions.iter().any(|s| s.id == session_id) {
            self.sessions.push(SessionInfo {
                id: session_id.clone(),
                platform: "local".into(),
                scope: "tui".into(),
                user_id: "local_user".into(),
                nickname: "EchoAgent".into(),
                group_name: None,
                last_active: chrono::Utc::now().timestamp(),
                last_message: text.clone(),
            });
        }
        self.push_message(
            &session_id,
            DisplayMessage {
                role: MsgRole::System,
                content: text,
                time: chrono::Utc::now().timestamp(),
            },
        );
    }

    /// Switch to a session by id — resets scroll and deactivates form.
    pub fn do_session_switch(&mut self, session_id: &str) {
        self.active_session_id = Some(session_id.to_string());
        self.chat_scroll = 0;
        self.form_overlay.deactivate();
        self.menu_msg_idx = -1;
    }

    /// Exit any active config mode.
    pub fn exit_config_mode(&mut self) {
        self.mode = ConversationMode::Normal;
        self.menu_msg_idx = -1;
    }

    /// All sessions sorted by last_active descending.
    pub fn sorted_sessions(&self) -> Vec<SessionInfo> {
        let mut sessions = self.sessions.clone();
        sessions.sort_by(|a, b| b.last_active.cmp(&a.last_active));
        sessions
    }
}
