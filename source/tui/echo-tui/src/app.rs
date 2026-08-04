//! Application state and the main event loop.

use std::collections::HashMap;
use std::time::Duration;

use anyhow::Result;
use echo_agent::{BackendCommand, BackendEvent, SessionInfo};
use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use ratatui::{Frame, Terminal};


use crate::backend::Backend;
use crate::components::{
    chat_view::ChatView, command_palette::PaletteAction, help_popup::HelpPopup,
    prompt_input::PromptInput, settings_popup::SettingsForm,
    settings_popup::SettingsPopup, status_bar::StatusBar, Component,
};
use crate::event::Event;
use crate::keybindings::Keybindings;
use crate::slash_commands::SlashAction;
use crate::theme::Theme;

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

    /// Whether any adapter is connected.
    pub fn is_connected(&self) -> bool {
        self.adapters.iter().any(|a| a.connected)
    }
}

/// 命令面板的两种模式：命令列表 / 会话切换列表。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteMode {
    Commands,
    Sessions,
}

/// 思考中 spinner 帧（250ms 一格，2s 一轮）。
pub const SPINNER: [char; 8] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'];

/// 交互式对话模式。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConversationMode {
    Normal,
    /// /api 交互式配置模式
    ApiConfig,
}

/// Central UI state.
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
    pub show_adapter_popup: bool,
    pub settings: SettingsForm,
    pub palette_selection: usize,
    pub status: StatusInfo,
    pub chat_scroll: usize,
    /// 是否滚到聊天区顶部（独立标记，避免 usize::MAX 哨兵卡住 PgDn）。
    pub chat_at_top: bool,
    /// Message queued by the prompt for the app loop to submit.
    pub pending_submit: Option<String>,
    /// 组件提交的待发送后端命令（由 app 循环统一发送）。
    pub pending_command: Option<BackendCommand>,
    /// Slash 命令菜单状态。
    pub show_slash: bool,
    pub slash_filter: String,
    pub slash_selection: usize,
    pub pending_slash: Option<SlashAction>,
    pub pending_slash_text: String,
    /// 输入框是否处于"选中（可输入）"状态。先 Tab 选中再输入。
    pub input_focused: bool,
    /// Whether the leader key (Ctrl+X) has been pressed.
    pub leader_active: bool,
    pub leader_pressed_at: std::time::Instant,
    /// 双击 Ctrl+C 退出：第一次按下进入待退出状态，2 秒内再按才真正退出。
    pub quit_armed: bool,
    pub quit_armed_at: std::time::Instant,
    // ---- 动画状态（由 250ms tick 驱动） ----
    /// 全局帧计数，所有动画相位取自它。
    pub anim_tick: u64,
    /// LLM 调用进行中（思考 spinner）。
    pub llm_in_flight: bool,
    /// 工具执行中：(工具名, 开始时刻)。
    pub tool_in_flight: Option<(String, std::time::Instant)>,
    /// 新消息到达高亮截止时刻。
    pub chat_flash_until: Option<std::time::Instant>,
    /// 当前对话模式（普通 / API配置 / 适配器管理等）。
    pub mode: ConversationMode,
        /// 对话内嵌表单组件（二级：选择列表 ←→ 表单编辑）。
    pub form_overlay: crate::components::form_overlay::FormOverlay,
    pub pending_action: Option<String>, // action awaiting parameter input
    pub menu_msg_idx: isize,
    // Mouse text selection state
    // Mouse text selection (row-index based, like opencode)
    pub selecting: bool,
    pub sel_anchor: Option<(usize, usize)>, // (line_index, visual_col)
    pub sel_other: Option<(usize, usize)>,
    pub conv_text: Vec<String>,             // rendered text lines (no wrapping markup)
    pub conv_area: ratatui::layout::Rect,   // last rendered conv area
    pub conv_top: usize,                    // first visible line index
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
            show_adapter_popup: false,
            settings: SettingsForm::default(),
            palette_selection: 0,
            status: StatusInfo::default(),
            chat_scroll: 0,
            chat_at_top: false,
            pending_submit: None,
            pending_command: None,
            show_slash: false,
            slash_filter: String::new(),
            slash_selection: 0,
            pending_slash: None,
            pending_slash_text: String::new(),
            input_focused: false,
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
        self.messages.entry(session_id.to_string()).or_default().push(msg);
        // New message → jump to the bottom.
        self.chat_scroll = 0;
        self.chat_at_top = false;
        // 新消息到达 → 短暂高亮最后一条（消息到达动效）
        self.chat_flash_until = Some(std::time::Instant::now() + Duration::from_millis(700));
    }

    /// Push or update the interactive menu as a chat message.
    /// Push or update the ChatForm as a chat message.
    pub fn refresh_menu_msg(&mut self) {
        if !self.form_overlay.is_active() { return; }
        let sid = self.active_session_id.clone().unwrap_or_else(|| "local:tui::local_user".into());
        if self.active_session_id.is_none() { self.active_session_id = Some(sid.clone()); }
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
        self.push_message(&sid, DisplayMessage {
            role: MsgRole::System, content: text,
            time: chrono::Utc::now().timestamp(),
        });
        self.menu_msg_idx = (self.messages.get(&sid).map(|m| m.len()).unwrap_or(1) - 1) as isize;
    }

    // ── Mouse selection helpers ──

    fn point_in_conv(&self, x: u16, y: u16) -> bool {
        let a = self.conv_area;
        x >= a.x && x < a.x.saturating_add(a.width)
            && y >= a.y.saturating_add(1) && y < a.y.saturating_add(a.height)
    }

    fn row_index_from_screen(&self, my: u16) -> Option<usize> {
        if self.conv_text.is_empty() { return None; }
        let a = self.conv_area;
        let inner_h = a.height.saturating_sub(1).max(1) as i16; // top border only
        if inner_h <= 0 { return None; }
        let iy0 = a.y + 1; // first text row (below top border)
        let y = my.clamp(iy0, iy0 + inner_h as u16 - 1);
        let idx = self.conv_top + (y - iy0) as usize;
        Some(idx.min(self.conv_text.len().saturating_sub(1)))
    }

    fn col_from_screen(&self, mx: u16) -> usize {
        // Text starts at a.x (no left border on chat view).
        let inner_w = self.conv_area.width.max(1) as i64;
        let offset = (mx as i64) - (self.conv_area.x as i64);
        (offset.max(0) as usize).min((inner_w - 1).max(0) as usize)
    }

    fn begin_selection(&mut self, mx: u16, my: u16) {
        if let Some(row) = self.row_index_from_screen(my) {
            let col = self.col_from_screen(mx);
            self.sel_anchor = Some((row, col));
            self.sel_other = Some((row, col));
            self.selecting = true;
        }
    }

    fn update_selection(&mut self, mx: u16, my: u16) {
        if let Some(row) = self.row_index_from_screen(my) {
            let col = self.col_from_screen(mx);
            self.sel_other = Some((row, col));
        }
    }

    fn clear_selection(&mut self) {
        self.selecting = false;
        self.sel_anchor = None;
        self.sel_other = None;
    }

    fn selection_rect(&self) -> Option<(usize, usize, usize, usize)> {
        if !self.selecting { return None; }
        let a = self.sel_anchor?;
        let b = self.sel_other?;
        if self.conv_text.is_empty() { return None; }
        let last = self.conv_text.len() - 1;
        let (ar, ac) = (a.0.min(last), a.1);
        let (br, bc) = (b.0.min(last), b.1);
        if (ar, ac) <= (br, bc) { Some((ar, ac, br, bc)) } else { Some((br, bc, ar, ac)) }
    }

    fn finish_selection(&mut self) {
        let Some((sr, sc, er, ec)) = self.selection_rect() else {
            self.clear_selection();
            return;
        };
        let lines = &self.conv_text;
        // Helper: visual column → byte offset (safe for multi-byte UTF-8).
        fn col_to_byte(s: &str, col: usize) -> usize {
            s.char_indices().nth(col).map(|(i, _)| i).unwrap_or(s.len())
        }
        let text = if sr == er {
            let s = &lines[sr];
            s.chars().skip(sc).take(ec.saturating_sub(sc)).collect::<String>()
        } else {
            let mut parts: Vec<String> = Vec::new();
            let s0 = &lines[sr];
            parts.push(s0[col_to_byte(s0, sc)..].to_string());
            for idx in sr + 1..er { parts.push(lines[idx].clone()); }
            let sn = &lines[er];
            parts.push(sn[..col_to_byte(sn, ec)].to_string());
            parts.join("\n")
        };
        if !text.trim().is_empty() {
            copy_to_clipboard(&text);
        }
        self.clear_selection();
    }

    pub fn toast(&mut self, text: impl Into<String>, _kind: ToastKind) {
        let text: String = text.into();
        let text: String = text.chars().take(4096).collect(); // raised from 500 for QR codes etc.
        let session_id = self.active_session_id.clone().unwrap_or_else(|| "local:tui::local_user".into());
        // Auto-set active session so messages are visible.
        if self.active_session_id.is_none() {
            self.active_session_id = Some(session_id.clone());
        }
        // Ensure session exists in list.
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
        self.push_message(&session_id, DisplayMessage {
            role: MsgRole::System,
            content: text,
            time: chrono::Utc::now().timestamp(),
        });
    }
}

/// The terminal app.
pub struct App {
    pub state: AppState,
    backend: Backend,
    status_bar: StatusBar,
    chat_view: ChatView,
    prompt_input: PromptInput,
    command_palette: command_palette::CommandPalette,
    settings_popup: SettingsPopup,
    help_popup: HelpPopup,
    adapter_popup: adapter_popup::AdapterPopup,
}

use crate::components::command_palette;
use crate::components::adapter_popup;

impl App {
    pub fn new(backend: Backend, theme: Theme, keybindings: Keybindings) -> Self {
        Self {
            state: AppState::new(theme, keybindings),
            backend,
            status_bar: StatusBar::default(),
            chat_view: ChatView::default(),
            prompt_input: PromptInput::default(),
            command_palette: command_palette::CommandPalette::default(),
            settings_popup: SettingsPopup::default(),
            help_popup: HelpPopup::default(),
            adapter_popup: adapter_popup::AdapterPopup::default(),
        }
    }

    pub async fn run(&mut self, terminal: &mut Terminal<ratatui::backend::CrosstermBackend<std::io::Stdout>>) -> Result<()> {
        let (input_tx, mut input_rx) = tokio::sync::mpsc::unbounded_channel::<crossterm::event::Event>();
        std::thread::spawn(move || loop {
            match crossterm::event::read() {
                Ok(ev) => {
                    if input_tx.send(ev).is_err() {
                        tracing::error!("输入线程：事件通道已关闭");
                        break;
                    }
                }
                Err(e) => {
                    tracing::error!("输入线程：crossterm::event::read 失败: {e}");
                    break;
                }
            }
        });

        let mut tick = tokio::time::interval(Duration::from_millis(250));
        let mut pending_events: Vec<BackendEvent> = Vec::new();

        // 启动时拉取一次后端状态（API 配置、会话列表）。
        self.backend.send(BackendCommand::RequestState);
        tracing::debug!("TUI 主循环启动");

        let mut iter: u64 = 0;
        loop {
            iter = iter.wrapping_add(1);
            if iter % 20 == 0 {
                tracing::debug!(iter, "TUI 主循环心跳");
            }
            tokio::select! {
                maybe = input_rx.recv() => {
                    if let Some(ev) = maybe {
                        self.handle_input(&ev);
                    } else {
                        tracing::error!("输入事件通道关闭，TUI 退出（输入线程异常终止）");
                        break;
                    }
                }
                _ = tick.tick() => {
                    // 动画帧计数（所有动效的共享时钟）
                    self.state.anim_tick = self.state.anim_tick.wrapping_add(1);
                    // expire leader key
                    if self.state.leader_active && self.state.leader_pressed_at.elapsed() > Duration::from_secs(2) {
                        self.state.leader_active = false;
                    }
                    // 双击退出计时过期 → 重新武装
                    if self.state.quit_armed && self.state.quit_armed_at.elapsed() > Duration::from_secs(2) {
                        self.state.quit_armed = false;
                    }
                }
                _ = self.backend.drain_events(&mut pending_events) => {}
            }

            for ev in pending_events.drain(..) {
                let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    self.apply_backend_event(ev);
                }));
            }

            // Submit queued prompt input to the backend.
            if let Some(content) = self.state.pending_submit.take() {
                // Intercept: if in API config mode, route to config handler.
                if self.state.mode == ConversationMode::ApiConfig {
                    use crate::components::form_overlay::FormState;
                    if self.state.form_overlay.state == FormState::Editing {
                        self.state.form_overlay.set_field_value(&content);
                        self.state.refresh_menu_msg();
                    } else {
                        use crate::slash_commands::api;
                        let msg = if let Some(ref pending) = self.state.pending_action.take() {
                            format!("{pending}{content}")
                        } else {
                            content
                        };
                        api::handle_message(&mut self.state, &self.backend, &msg);
                        if self.state.mode == ConversationMode::ApiConfig {
                            api::populate_form(&mut self.state);
                            self.state.refresh_menu_msg();
                        }
                    }
                } else {
                    let session_id = self
                        .state
                        .active_session_id
                        .clone()
                        .unwrap_or_else(|| "user_0".to_string());
                    self.backend.send(BackendCommand::SendMessage { session_id, content });
                }
            }

            // Send a component-queued backend command.
            if let Some(cmd) = self.state.pending_command.take() {
                self.backend.send(cmd);
            }

            // Execute a queued slash command.
            if let Some(action) = self.state.pending_slash.take() {
                let text = std::mem::take(&mut self.state.pending_slash_text);
                let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    crate::slash_commands::dispatch(&mut self.state, &self.backend, action, text);
                }));
                if let Err(e) = result {
                    let msg = if let Some(s) = e.downcast_ref::<String>() { s.clone() }
                    else if let Some(s) = e.downcast_ref::<&str>() { s.to_string() }
                    else { "unknown".into() };
                    self.state.toast(format!("命令执行错误: {msg}"), ToastKind::Error);
                }
            }

            if let Err(e) = terminal.draw(|f| self.render(f)) {
                tracing::error!("terminal draw failed: {e}");
                break;
            }
            if !self.state.running {
                tracing::info!("running=false，TUI 退出");
                break;
            }
        }
        Ok(())
    }

    fn handle_input(&mut self, ev: &crossterm::event::Event) {
        // ── 鼠标：滚轮滚动 + 文本选择 ──
        if let crossterm::event::Event::Mouse(mouse) = ev {
            use crossterm::event::MouseEventKind;
            match mouse.kind {
                MouseEventKind::ScrollUp => {
                    self.state.chat_scroll = self.state.chat_scroll.saturating_add(3);
                    return;
                }
                MouseEventKind::ScrollDown => {
                    self.state.chat_scroll = self.state.chat_scroll.saturating_sub(3);
                    if self.state.chat_scroll == 0 { self.state.chat_at_top = false; }
                    return;
                }
                MouseEventKind::Down(_) => {
                    if self.state.point_in_conv(mouse.column, mouse.row) {
                        self.state.begin_selection(mouse.column, mouse.row);
                    } else {
                        self.state.clear_selection();
                    }
                    return;
                }
                MouseEventKind::Drag(_) => {
                    if self.state.selecting {
                        self.state.update_selection(mouse.column, mouse.row);
                    }
                    return;
                }
                MouseEventKind::Up(_) => {
                    if self.state.selecting {
                        self.state.finish_selection();
                    }
                    return;
                }
                _ => {}
            }
            return;
        }

        let crossterm::event::Event::Key(key) = ev else {
            return;
        };
        if key.kind != KeyEventKind::Press {
            return;
        }

        // Guard against panics in input handling — prevent crashes.
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.handle_key(key);
        }));
        if let Err(e) = result {
            let msg = if let Some(s) = e.downcast_ref::<String>() {
                s.clone()
            } else if let Some(s) = e.downcast_ref::<&str>() {
                s.to_string()
            } else {
                "unknown panic in input handler".into()
            };
            tracing::error!("input handler panic: {msg}");
            self.state.toast(format!("内部错误: {msg}"), ToastKind::Error);
        }
    }

    fn handle_key(&mut self, key: &KeyEvent) {
        // ── Ctrl+C (global) ──
        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
            let active = self.state.form_overlay.is_active();
            let armed = self.state.quit_armed && self.state.quit_armed_at.elapsed() <= Duration::from_secs(2);
            if active {
                if armed {
                    self.state.form_overlay.deactivate();
                    self.state.mode = ConversationMode::Normal;
                    self.state.menu_msg_idx = -1;
                    self.state.quit_armed = false;
                    self.state.toast("已退出配置", ToastKind::Info);
                } else {
                    let still_active = self.state.form_overlay.back();
                    self.state.quit_armed = true;
                    self.state.quit_armed_at = std::time::Instant::now();
                    if still_active {
                        self.state.refresh_menu_msg();
                        self.state.toast("已返回 (再按 Ctrl+C 退出)", ToastKind::Info);
                    } else {
                        self.state.mode = ConversationMode::Normal;
                        self.state.menu_msg_idx = -1;
                        self.state.toast("已退出配置", ToastKind::Info);
                    }
                }
                return;
            }
            if armed { self.state.running = false; }
            else {
                self.state.quit_armed = true;
                self.state.quit_armed_at = std::time::Instant::now();
                self.state.toast("再按一次 Ctrl+C 确认退出", ToastKind::Info);
            }
            return;
        }

        // ── 对话内嵌表单 ──
        if self.state.form_overlay.is_active() {
            use crate::components::form_overlay::FormState;
            // Esc → back one level.
            if key.code == KeyCode::Esc {
                let still_active = self.state.form_overlay.back();
                if still_active { self.state.refresh_menu_msg(); self.state.toast("已返回", ToastKind::Info); }
                else { self.state.mode = ConversationMode::Normal; self.state.menu_msg_idx = -1; self.state.toast("已退出配置", ToastKind::Info); }
                return;
            }
            // Navigation and Ctrl+S (no AppState needed).
            if self.state.form_overlay.handle_key(key, &self.backend) {
                self.state.refresh_menu_msg();
                return;
            }
            // AppState-dependent actions.
            match self.state.form_overlay.state {
                FormState::Selecting => match key.code {
                    KeyCode::Char('e') => {
                        let label = self.state.form_overlay.select_items
                            .get(self.state.form_overlay.select_idx)
                            .map(|s| s.label.clone()).unwrap_or_default();
                        let st = &self.state.status;
                        use crate::components::form_overlay::{FormField, FieldKind};
                        self.state.form_overlay.set_fields(vec![
                            FormField { label: "Provider".into(), value: st.provider.clone(), kind: FieldKind::Text },
                            FormField { label: "Model".into(), value: st.model.clone(), kind: FieldKind::Text },
                            FormField { label: "BaseURL".into(), value: st.base_url.clone(), kind: FieldKind::Text },
                            FormField { label: "APIKey".into(), value: String::new(), kind: FieldKind::Password },
                            FormField { label: "Prompt".into(), value: st.system_prompt.clone(), kind: FieldKind::Text },
                        ]);
                        self.state.form_overlay.edit_label = label;
                        self.state.form_overlay.enter_edit();
                        self.state.refresh_menu_msg();
                        return;
                    }
                    KeyCode::Enter => {
                        if let Some(val) = self.state.form_overlay.confirm() {
                            use crate::slash_commands::api;
                            api::handle_message(&mut self.state, &self.backend, &val);
                        }
                        self.state.refresh_menu_msg();
                        return;
                    }
                    _ => {} // other keys fall through to prompt_input
                },
                FormState::Editing => {
                    // In editing mode: non-form keys (regular chars) fall through to prompt_input.
                    // They get routed via pending_submit → set_field_value.
                },
                _ => {}
            }
            // Don't return — let non-form keys pass through to normal input handling.
        }

        // Leader key handling.
        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('x') {
            self.state.leader_active = true;
            self.state.leader_pressed_at = std::time::Instant::now();
            return;
        }
        if self.state.leader_active {
            self.state.leader_active = false;
            let kb = &self.state.keybindings;
            let chord = chord_of(key);
            if chord == kb.session_switch {
                self.open_palette(PaletteMode::Sessions);
            } else if chord == kb.settings {
                self.open_settings();
            } else if chord == kb.help {
                self.state.show_help = !self.state.show_help;
            }
            return;
        }

        // Modals take priority.
        if self.state.show_help {
            let _ = self.help_popup.handle_event(&Event::Input(crossterm::event::Event::Key(key.clone())), &mut self.state);
            return;
        }
        if self.state.show_adapter_popup {
            let _ = self.adapter_popup.handle_event(&Event::Input(crossterm::event::Event::Key(key.clone())), &mut self.state);
            return;
        }
        if self.state.show_settings {
            let _ = self.settings_popup.handle_event(&Event::Input(crossterm::event::Event::Key(key.clone())), &mut self.state);
            return;
        }
        if self.state.show_palette {
            let _ = self.command_palette.handle_event(&Event::Input(crossterm::event::Event::Key(key.clone())), &mut self.state);
            self.dispatch_palette(key);
            return;
        }
        // slash 命令菜单打开时，按键只路由给输入框。
        if self.state.show_slash {
            let _ = self.prompt_input.handle_event(&Event::Input(crossterm::event::Event::Key(key.clone())), &mut self.state);
            return;
        }

        // Global shortcuts.
        let kb = &self.state.keybindings;
        let chord = chord_of(key);
        if chord == kb.command_palette {
            self.open_palette(PaletteMode::Commands);
            return;
        }
        if chord == kb.help {
            self.state.show_help = true;
            return;
        }

        // 焦点模型：Tab 或 / 自动选中输入框。
        if !self.state.input_focused {
            if key.code == KeyCode::Tab || key.code == KeyCode::Char('/') {
                self.state.input_focused = true;
                // / key: pass through to prompt so slash menu opens immediately.
                // Tab key: just focus, don't pass the Tab character.
                if key.code == KeyCode::Tab {
                    return;
                }
            } else {
                let _ = self.chat_view.handle_event(&Event::Input(crossterm::event::Event::Key(key.clone())), &mut self.state);
                return;
            }
        }
        if self.state.input_focused && key.code == KeyCode::Esc {
            self.state.input_focused = false;
            return;
        }
        if self.state.input_focused {
            let _ = self.prompt_input.handle_event(&Event::Input(crossterm::event::Event::Key(key.clone())), &mut self.state);
        } else {
            let _ = self.chat_view.handle_event(&Event::Input(crossterm::event::Event::Key(key.clone())), &mut self.state);
        }
    }

    /// 会话按最近活跃排序（面板会话列表与预选索引共用）。
    fn sorted_sessions(&self) -> Vec<SessionInfo> {
        let mut sessions = self.state.sessions.clone();
        sessions.sort_by(|a, b| b.last_active.cmp(&a.last_active));
        sessions
    }

    /// 打开命令面板。会话模式下预选当前会话。
    fn open_palette(&mut self, mode: PaletteMode) {
        self.state.palette_mode = mode;
        self.state.palette_selection = 0;
        if mode == PaletteMode::Sessions {
            let sessions = self.sorted_sessions();
            if let Some(id) = &self.state.active_session_id {
                if let Some(idx) = sessions.iter().position(|s| &s.id == id) {
                    self.state.palette_selection = idx;
                }
            }
        }
        self.state.show_palette = true;
    }

    /// Execute the palette selection if Enter was pressed.
    fn dispatch_palette(&mut self, key: &KeyEvent) {
        if key.code != KeyCode::Enter {
            return;
        }
        // 会话模式：Enter 切换会话并关闭
        if self.state.palette_mode == PaletteMode::Sessions {
            let sessions = self.sorted_sessions();
            let idx = self.state.palette_selection.min(sessions.len().saturating_sub(1));
            if let Some(s) = sessions.get(idx) {
                self.state.active_session_id = Some(s.id.clone());
                self.state.chat_scroll = 0;
            }
            self.state.show_palette = false;
            return;
        }
        let actions = self.command_palette.actions();
        let action = actions[self.state.palette_selection.min(actions.len() - 1)];
        match action {
            PaletteAction::ConfigureApi => {
                self.open_settings();
            }
            PaletteAction::ClearSession => {
                if let Some(id) = self.state.active_session_id.clone() {
                    self.backend.send(BackendCommand::ClearSession { session_id: id });
                }
            }
            PaletteAction::RequestState => {
                self.backend.send(BackendCommand::RequestState);
            }
            PaletteAction::SwitchSession => {
                self.open_palette(PaletteMode::Sessions);
                return; // 面板保持打开，直接进入会话列表
            }
            PaletteAction::ToggleHelp => {
                self.state.show_help = true;
            }
            PaletteAction::Quit => {
                self.state.running = false;
            }
        }
        self.state.show_palette = false;
    }

    /// Execute a slash command chosen in the prompt.
    /// Open the settings form and refresh its values from the backend.
    fn open_settings(&mut self) {
        self.backend.send(BackendCommand::RequestState);
        self.state.settings.focus = 0;
        // 列表模式选中项重置到顶部，避免陈旧索引指向错误条目
        self.state.settings.selection = 0;
        self.state.show_settings = true;
    }

    fn apply_backend_event(&mut self, ev: BackendEvent) {
        match ev {
            BackendEvent::AdapterStateChanged { adapter_name, connected, self_id } => {
                let self_id_str = self_id.clone();
                self.state.status.set_adapter_state(
                    &adapter_name, &adapter_name, connected, true,
                    self_id, "", None,
                );
                if connected {
                    self.state.toast(
                        format!("{adapter_name} connected ({})", self_id_str.as_deref().unwrap_or("?")),
                        ToastKind::Success,
                    );
                } else {
                    self.state.toast(format!("{adapter_name} disconnected"), ToastKind::Error);
                }
            }
            BackendEvent::AdapterList { adapters } => {
                for a in adapters {
                    self.state.status.set_adapter_state(
                        &a.name, &a.display_name, a.connected, a.running,
                        a.self_id, &a.bind_address, a.started_at,
                    );
                }
            }
            BackendEvent::MessageReceived { session_id, content, timestamp, .. } => {
                self.push_to(session_id, MsgRole::User, content, timestamp);
            }
            BackendEvent::AgentThinking { session_id } => {
                self.state.llm_in_flight = true;
                self.push_to(session_id, MsgRole::System, "… 思考中".into(), 0);
            }
            BackendEvent::LlmRequest { model, .. } => {
                self.state.status.model = model;
            }
            BackendEvent::LlmResponse { model, prompt_tokens, completion_tokens, .. } => {
                self.state.status.model = model;
                self.state.llm_in_flight = false;
                let _ = (prompt_tokens, completion_tokens);
            }
            BackendEvent::ToolCall { session_id, tool_name, arguments, .. } => {
                self.state.tool_in_flight = Some((tool_name.clone(), std::time::Instant::now()));
                self.push_to(session_id, MsgRole::Tool, format!("🔧 {tool_name}({arguments})"), 0);
            }
            BackendEvent::ToolResult { session_id, tool_name, result, .. } => {
                self.state.tool_in_flight = None;
                let snippet: String = result.chars().take(80).collect();
                self.push_to(session_id, MsgRole::Tool, format!("✓ {tool_name}: {snippet}"), 0);
            }
            BackendEvent::MessageSent { session_id, content, .. } => {
                self.state.llm_in_flight = false;
                let ts = chrono::Utc::now().timestamp();
                self.push_to(session_id, MsgRole::Agent, content, ts);
            }
            BackendEvent::SessionUpdated { session } => {
                self.upsert_session(session);
            }
            BackendEvent::ApiConfigUpdated { provider, model, base_url, api_key_set, system_prompt, active_api, profiles } => {
                self.state.status.provider = provider.clone();
                self.state.status.model = model.clone();
                self.state.status.base_url = base_url.clone();
                self.state.status.system_prompt = system_prompt.clone();
                self.state.settings.profiles = profiles;
                self.state.settings.active_api = active_api.clone();
                self.state.settings.api_key_set = api_key_set;
            }
            BackendEvent::ApiProfilesUpdated { active_api, profiles } => {
                self.state.settings.profiles = profiles;
                self.state.settings.active_api = active_api;
            }
            BackendEvent::GroupList { .. } => {} // handled by tool, not TUI
            BackendEvent::Error { session_id, message } => {
                self.state.llm_in_flight = false;
                let _ = session_id;
                self.state.toast(message, ToastKind::Error);
            }
        }
    }

    fn push_to(&mut self, session_id: String, role: MsgRole, content: String, time: i64) {
        self.state.push_message(&session_id, DisplayMessage { role, content: content.clone(), time });
        // Ensure the session exists in the list.
        if let Some(s) = self.state.sessions.iter_mut().find(|s| s.id == session_id) {
            s.last_message = content.clone();
            s.last_active = if time > 0 { time } else { s.last_active };
        }
    }

    fn upsert_session(&mut self, session: SessionInfo) {
        if let Some(s) = self.state.sessions.iter_mut().find(|s| s.id == session.id) {
            *s = session.clone();
        } else {
            self.state.sessions.push(session.clone());
        }
        if self.state.active_session_id.is_none() {
            self.state.active_session_id = Some(session.id);
        }
    }

    pub fn render(&mut self, f: &mut Frame) {
        let area = f.area();
        let _theme = self.state.theme;
        f.render_widget(ratatui::widgets::Clear, area);

        // Top: status bar (1 row).
        let chunks = ratatui::layout::Layout::default()
            .direction(ratatui::layout::Direction::Vertical)
            .constraints([
                ratatui::layout::Constraint::Length(1),
                ratatui::layout::Constraint::Min(0),
                ratatui::layout::Constraint::Length(3),
            ])
            .split(area);
        let (top, main, prompt_area) = (chunks[0], chunks[1], chunks[2]);
        self.status_bar.render(f, top, &self.state);

        // 中间区域全宽给聊天区（已移除左侧会话栏）。
        self.chat_view.render(f, main, &self.state);
        self.state.conv_area = main;
        // Capture rendered text + render selection highlight (single buffer borrow).
        // Chat view has only Borders::TOP — no left/right border, so text starts at main.x.
        let inner_w = main.width as usize;
        let inner_h = main.height.saturating_sub(1) as usize; // subtract top border
        self.state.conv_text.clear();
        let buf = f.buffer_mut();
        for row in 0..inner_h {
            let sy = main.y + 1 + row as u16;
            let mut line = String::new();
            for col in 0..inner_w {
                let sx = main.x + col as u16;
                if let Some(cell) = buf.cell((sx, sy)) {
                    line.push_str(cell.symbol());
                }
            }
            self.state.conv_text.push(line.trim_end().to_string());
        }
        while self.state.conv_text.last().map(|s| s.is_empty()).unwrap_or(false) {
            self.state.conv_text.pop();
        }
        self.state.conv_top = self.state.chat_scroll;

        // ── 鼠标文本选择高亮 (frame-buffer cell REVERSED) ──
        if let Some((sr, sc, er, ec)) = self.state.selection_rect() {
            let ix0 = main.x; // text starts at main.x (no left border)
            let iy0 = main.y + 1; // past top border
            let vis_h = main.height.saturating_sub(1);
            let vis_w = main.width;
            let top = self.state.conv_top;
            for idx in sr..=er {
                let dy = idx as isize - top as isize;
                if dy < 0 || dy as u16 >= vis_h { continue; }
                let sy = iy0 + dy as u16;
                let line = self.state.conv_text.get(idx).map(|s| s.as_str()).unwrap_or("");
                let line_vw = line.chars().count().max(1);
                let (c0, c1) = if sr == er {
                    (sc.min(line_vw), ec.min(line_vw))
                } else if idx == sr {
                    (sc.min(line_vw), line_vw)
                } else if idx == er {
                    (0, ec.min(line_vw))
                } else {
                    (0, line_vw)
                };
                let x_start = (ix0 + c0 as u16).min(ix0 + vis_w.saturating_sub(1));
                let x_end = (ix0 + c1 as u16).min(ix0 + vis_w);
                for x in x_start..x_end.max(x_start) {
                    if let Some(cell) = buf.cell_mut((x, sy)) {
                        cell.set_style(cell.style().add_modifier(ratatui::style::Modifier::REVERSED));
                    }
                }
            }
        }

        // Bottom: prompt.
        self.prompt_input.render(f, prompt_area, &self.state);

        // Overlays.
        if self.state.show_palette {
            self.command_palette.render(f, area, &self.state);
        }
        if self.state.show_settings {
            self.settings_popup.render(f, area, &self.state);
        }
        if self.state.show_help {
            self.help_popup.render(f, area, &self.state);
        }
        if self.state.show_adapter_popup {
            self.adapter_popup.render(f, area, &self.state);
        }
    }
}

fn chord_of(key: &KeyEvent) -> crate::keybindings::KeyChord {
    crate::keybindings::KeyChord { code: key.code, modifiers: key.modifiers }
}

/// Copy text to system clipboard using OSC 52 (works in most modern terminals).
fn copy_to_clipboard(text: &str) {
    use std::io::Write;
    let b64 = base64_encode(text);
    let _ = std::io::stdout().write_all(format!("\x1b]52;c;{b64}\x1b\\").as_bytes());
    let _ = std::io::stdout().flush();
}

fn base64_encode(s: &str) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes = s.as_bytes();
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = *chunk.get(1).unwrap_or(&0) as u32;
        let b2 = *chunk.get(2).unwrap_or(&0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(CHARS[((n >> 18) & 63) as usize] as char);
        out.push(CHARS[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 { CHARS[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { CHARS[(n & 63) as usize] as char } else { '=' });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

    fn key(code: KeyCode) -> crossterm::event::Event {
        crossterm::event::Event::Key(KeyEvent::new(code, KeyModifiers::NONE))
    }

    fn app() -> App {
        let (bridge, _handle) = echo_agent::create_bridge();
        App::new(Backend::new(bridge), Theme::dark(), Keybindings::default())
    }

    #[test]
    fn slash_does_not_quit() {
        let mut app = app();
        app.handle_input(&key(KeyCode::Tab)); // 选中输入框
        assert!(app.state.input_focused);

        // 输入 "/"：只应打开 slash 菜单
        app.handle_input(&key(KeyCode::Char('/')));
        assert!(app.state.show_slash);
        assert!(app.state.running, "输入 / 后不应退出");

        // 回车：slash 菜单里执行选中命令（help），不是退出
        app.handle_input(&key(KeyCode::Enter));
        assert!(app.state.running, "输入 / 后回车不应退出");
        assert_eq!(app.state.pending_slash, Some(SlashAction::Help));

        // 消费掉 pending_slash（模拟主循环）
        let _ = app.state.pending_slash.take();
        app.state.show_slash = false;

        // 继续输入普通消息并发送：也不应触发退出
        for c in ['你', '好'] {
            app.handle_input(&key(KeyCode::Char(c)));
            assert!(app.state.running);
        }
        app.handle_input(&key(KeyCode::Enter));
        assert!(app.state.running, "slash 菜单中的普通消息不应触发退出");
    }

    #[test]
    fn slash_render_does_not_panic() {
        let mut app = app();
        app.handle_input(&key(KeyCode::Tab));
        app.handle_input(&key(KeyCode::Char('/')));
        assert!(app.state.show_slash);
        let backend = ratatui::backend::TestBackend::new(80, 24);
        let mut terminal = ratatui::Terminal::new(backend).unwrap();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            terminal.draw(|f| app.render(f)).unwrap();
        }));
        assert!(result.is_ok(), "输入 / 后渲染不应 panic");
        // 继续输入字符并渲染
        for c in ['q', 'u'] {
            app.handle_input(&key(KeyCode::Char(c)));
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                terminal.draw(|f| app.render(f)).unwrap();
            }));
            assert!(result.is_ok(), "输入 {c} 后渲染不应 panic");
        }
        // /qu + Enter → 这是明确的 quit 命令，预期行为
        app.handle_input(&key(KeyCode::Enter));
        assert_eq!(app.state.pending_slash, Some(SlashAction::Quit));
    }

    #[test]
    fn settings_render_with_huge_profile_list_does_not_panic() {
        let mut app = app();
        // 模拟历史 bug 造成的海量重复 profile
        for i in 0..100_000 {
            app.state.settings.profiles.push(echo_agent::ApiProfileInfo {
                name: format!("dup-{}", i % 3),
                provider: "deepseek".into(),
                model: "deepseek-v4-flash".into(),
                api_key_set: true,
            });
        }
        app.state.show_settings = true;
        let backend = ratatui::backend::TestBackend::new(80, 24);
        let mut terminal = ratatui::Terminal::new(backend).unwrap();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            terminal.draw(|f| app.render(f)).unwrap();
        }));
        assert!(result.is_ok(), "海量 profile 渲染不应 panic");
        // 高度被钳制在屏幕内
        assert!(app.state.settings.list_len() > 100_000);
    }
}