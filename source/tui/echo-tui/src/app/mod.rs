//! Terminal app — [`App`] struct, main event loop, input routing,
//! backend event handling, and rendering.
//!
//! Data types and [`AppState`] live in [`crate::state`]. The large
//! `BackendEvent` match lives in `events.rs`.

mod events;

use std::time::Duration;

use anyhow::Result;
use echo_agent::{BackendCommand, BackendEvent};
use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use ratatui::{Frame, Terminal};

use crate::backend::Backend;
use crate::components::{
    chat_view::ChatView, command_palette::PaletteAction, help_popup::HelpPopup,
    prompt_input::PromptInput, settings_popup::SettingsPopup, status_bar::StatusBar, Component,
};
use crate::event::Event;
use crate::keybindings::Keybindings;
use crate::state::{AppState, ConversationMode, PaletteMode, ToastKind};
use crate::theme::Theme;
use crate::util;

use crate::components::command_palette;

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
}

impl App {
    pub fn new(backend: Backend, theme: Theme, keybindings: Keybindings) -> Self {
        Self {
            state: AppState::new(theme, keybindings),
            backend,
            status_bar: StatusBar,
            chat_view: ChatView,
            prompt_input: PromptInput::default(),
            command_palette: command_palette::CommandPalette,
            settings_popup: SettingsPopup,
            help_popup: HelpPopup,
        }
    }

    pub async fn run(
        &mut self,
        terminal: &mut Terminal<ratatui::backend::CrosstermBackend<std::io::Stdout>>,
    ) -> Result<()> {
        let (input_tx, mut input_rx) =
            tokio::sync::mpsc::unbounded_channel::<crossterm::event::Event>();
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
                        tracing::error!("输入事件通道关闭，TUI 退出");
                        break;
                    }
                }
                _ = tick.tick() => {
                    self.state.anim_tick = self.state.anim_tick.wrapping_add(1);
                    if self.state.leader_active
                        && self.state.leader_pressed_at.elapsed() > Duration::from_secs(2)
                    {
                        self.state.leader_active = false;
                    }
                    if self.state.quit_armed
                        && self.state.quit_armed_at.elapsed() > Duration::from_secs(2)
                    {
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

            // Submit queued prompt input.
            if let Some(content) = self.state.pending_submit.take() {
                self.handle_submit(content);
            }

            // Send component-queued backend command.
            if let Some(cmd) = self.state.pending_command.take() {
                self.backend.send(cmd);
            }

            // Execute queued slash command.
            if let Some(action) = self.state.pending_slash.take() {
                let text = std::mem::take(&mut self.state.pending_slash_text);
                let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    crate::slash_commands::dispatch(&mut self.state, &self.backend, action, text);
                }));
                if let Err(e) = result {
                    let msg = if let Some(s) = e.downcast_ref::<String>() {
                        s.clone()
                    } else if let Some(s) = e.downcast_ref::<&str>() {
                        s.to_string()
                    } else {
                        "unknown".into()
                    };
                    self.state
                        .toast(format!("命令执行错误: {msg}"), ToastKind::Error);
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

    /// Route a submitted prompt through any active form interceptors,
    /// then fall back to sending a plain message.
    fn handle_submit(&mut self, content: String) {
        use crate::components::form_overlay::{FormKind, FormState};

        // QQ filter form editing.
        if self.state.form_overlay.state == FormState::Editing
            && self.state.form_overlay.form_kind == FormKind::QqFilter
        {
            let action = self.state.form_overlay.edit_label.clone();
            crate::slash_commands::qq::handle_filter_action(
                &mut self.state,
                &self.backend,
                &action,
                &content,
            );
            self.state.form_overlay.deactivate();
            self.state.menu_msg_idx = -1;
            self.backend.send(BackendCommand::RequestQqFilterConfig);
            return;
        }

        // API config mode.
        if self.state.mode == ConversationMode::ApiConfig {
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
            return;
        }

        // Normal send.
        let session_id = self
            .state
            .active_session_id
            .clone()
            .unwrap_or_else(|| "user_0".to_string());
        self.backend.send(BackendCommand::SendMessage {
            session_id,
            content,
        });
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
                    return;
                }
                MouseEventKind::Down(_) => {
                    if self.state.no_modal() && self.state.point_in_conv(mouse.column, mouse.row) {
                        self.state.begin_selection(mouse.column, mouse.row);
                    } else if self.state.no_modal() {
                        self.state.clear_selection();
                    }
                    return;
                }
                MouseEventKind::Drag(_) => {
                    if self.state.selecting && self.state.no_modal() {
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
            self.state
                .toast(format!("内部错误: {msg}"), ToastKind::Error);
        }
    }

    fn handle_key(&mut self, key: &KeyEvent) {
        self.state.clear_selection();

        // ── Ctrl+C (global) ──
        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
            let active = self.state.form_overlay.is_active();
            let armed = self.state.quit_armed
                && self.state.quit_armed_at.elapsed() <= Duration::from_secs(2);
            if active {
                if armed {
                    self.state.form_overlay.deactivate();
                    self.state.exit_config_mode();
                    self.state.quit_armed = false;
                    self.state.toast("已退出配置", ToastKind::Info);
                } else {
                    let still_active = self.state.form_overlay.back();
                    self.state.quit_armed = true;
                    self.state.quit_armed_at = std::time::Instant::now();
                    if still_active {
                        self.state.refresh_menu_msg();
                        self.state
                            .toast("已返回 (再按 Ctrl+C 退出)", ToastKind::Info);
                    } else {
                        self.state.exit_config_mode();
                        self.state.toast("已退出配置", ToastKind::Info);
                    }
                }
                return;
            }
            if armed {
                self.state.running = false;
            } else {
                self.state.quit_armed = true;
                self.state.quit_armed_at = std::time::Instant::now();
                self.state
                    .toast("再按一次 Ctrl+C 确认退出", ToastKind::Info);
            }
            return;
        }

        // ── 对话内嵌表单 ──
        if self.state.form_overlay.is_active() {
            self.handle_form_key(key);
            return;
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
            let chord = util::chord_of(key);
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
            let _ = self.help_popup.handle_event(
                &Event::Input(crossterm::event::Event::Key(*key)),
                &mut self.state,
            );
            return;
        }
        if self.state.show_settings {
            let _ = self.settings_popup.handle_event(
                &Event::Input(crossterm::event::Event::Key(*key)),
                &mut self.state,
            );
            return;
        }
        if self.state.show_palette {
            let _ = self.command_palette.handle_event(
                &Event::Input(crossterm::event::Event::Key(*key)),
                &mut self.state,
            );
            self.dispatch_palette(key);
            return;
        }
        if self.state.show_slash {
            let _ = self.prompt_input.handle_event(
                &Event::Input(crossterm::event::Event::Key(*key)),
                &mut self.state,
            );
            return;
        }

        // Global shortcuts.
        let kb = &self.state.keybindings;
        let chord = util::chord_of(key);
        if chord == kb.command_palette {
            self.open_palette(PaletteMode::Commands);
            return;
        }
        if chord == kb.help {
            self.state.show_help = true;
            return;
        }

        // Scroll keys — route to chat view even when input is active.
        if key.code == kb.scroll_up.code
            || key.code == kb.scroll_down.code
            || key.code == kb.scroll_top.code
            || key.code == kb.scroll_bottom.code
        {
            let _ = self.chat_view.handle_event(
                &Event::Input(crossterm::event::Event::Key(*key)),
                &mut self.state,
            );
            return;
        }

        // Everything else → prompt input.
        let _ = self.prompt_input.handle_event(
            &Event::Input(crossterm::event::Event::Key(*key)),
            &mut self.state,
        );
    }

    /// If the QQ filter form is open, re-generate it so updated group/member
    /// lists appear immediately (called when GroupList or QqFilterConfig events arrive).
    pub(super) fn try_refresh_qq_filter_form(&mut self) {
        use crate::components::form_overlay::FormKind;
        if self.state.form_overlay.form_kind != FormKind::QqFilter {
            return;
        }
        let title = &self.state.form_overlay.title;
        let is_deny = title.contains("黑名单");
        crate::slash_commands::qq::open_filter_form(&mut self.state, &self.backend, is_deny);
    }

    /// Handle keys within the form overlay.
    fn handle_form_key(&mut self, key: &KeyEvent) {
        use crate::components::form_overlay::{FieldKind, FormField, FormKind, FormState};

        if key.code == KeyCode::Esc {
            let still_active = self.state.form_overlay.back();
            if still_active {
                self.state.refresh_menu_msg();
                self.state.toast("已返回", ToastKind::Info);
            } else {
                self.state.exit_config_mode();
                self.state.toast("已退出配置", ToastKind::Info);
            }
            return;
        }

        if self.state.form_overlay.handle_key(key, &self.backend) {
            self.state.refresh_menu_msg();
            return;
        }

        match self.state.form_overlay.state {
            FormState::Selecting => {
                let fo = &self.state.form_overlay;
                let current_val = fo
                    .select_items
                    .get(fo.select_idx)
                    .map(|s| s.value.as_str())
                    .unwrap_or("");
                let is_qq_action =
                    current_val.starts_with("allowlist_") || current_val.starts_with("denylist_");
                let is_toggle = is_qq_action && current_val.contains("_toggle_group:");
                let is_friend_toggle = is_qq_action && current_val.contains("_toggle_friend:");
                let is_direct_remove = is_qq_action && current_val.contains("_remove_user:");
                let needs_text_input = is_qq_action
                    && !is_toggle
                    && !is_friend_toggle
                    && !is_direct_remove
                    && !current_val.ends_with("__info__");
                match key.code {
                    KeyCode::Char('e') if needs_text_input => {
                        if fo.form_kind == FormKind::QqFilter {
                            let val = fo.confirm().unwrap_or_default();
                            self.state.form_overlay.set_fields(vec![FormField {
                                label: "QQ号".into(),
                                value: String::new(),
                                kind: FieldKind::Text,
                            }]);
                            self.state.form_overlay.edit_label = val;
                            self.state.form_overlay.enter_edit();
                            self.state.mode = ConversationMode::Normal;
                        }
                    }
                    KeyCode::Char('e') => {
                        if fo.form_kind == FormKind::ApiConfig {
                            let label = fo
                                .select_items
                                .get(fo.select_idx)
                                .map(|s| s.label.clone())
                                .unwrap_or_default();
                            let st = &self.state.status;
                            self.state.form_overlay.set_fields(vec![
                                FormField {
                                    label: "Provider".into(),
                                    value: st.provider.clone(),
                                    kind: FieldKind::Text,
                                },
                                FormField {
                                    label: "Model".into(),
                                    value: st.model.clone(),
                                    kind: FieldKind::Text,
                                },
                                FormField {
                                    label: "BaseURL".into(),
                                    value: st.base_url.clone(),
                                    kind: FieldKind::Text,
                                },
                                FormField {
                                    label: "APIKey".into(),
                                    value: String::new(),
                                    kind: FieldKind::Password,
                                },
                                FormField {
                                    label: "Prompt".into(),
                                    value: st.system_prompt.clone(),
                                    kind: FieldKind::Text,
                                },
                            ]);
                            self.state.form_overlay.edit_label = label;
                            self.state.form_overlay.enter_edit();
                        }
                    }
                    KeyCode::Enter => {
                        if let Some(val) = self.state.form_overlay.confirm() {
                            match fo.form_kind {
                                // QQ setting: gate mode switch.
                                FormKind::QqFilter if val.starts_with("gate_mode:") => {
                                    let mode = match val.strip_prefix("gate_mode:") {
                                        Some("allowlist") => echo_adapter::GateMode::Allowlist,
                                        Some("denylist") => echo_adapter::GateMode::Denylist,
                                        _ => echo_adapter::GateMode::None,
                                    };
                                    tracing::info!(mode = %mode.as_str(), "TUI: gate mode switch");
                                    self.backend.send(BackendCommand::SetQqGateMode { mode });
                                    self.backend.send(BackendCommand::RequestQqFilterConfig);
                                    self.state.qq_gate_mode = mode;
                                    // Refresh form to show updated radio state.
                                    crate::slash_commands::qq::setting(
                                        &mut self.state,
                                        &self.backend,
                                    );
                                }
                                // QQ setting submenu navigation.
                                FormKind::QqFilter if val == "qq_allowlist" => {
                                    crate::slash_commands::qq::allowlist(
                                        &mut self.state,
                                        &self.backend,
                                    );
                                }
                                FormKind::QqFilter if val == "qq_denylist" => {
                                    crate::slash_commands::qq::denylist(
                                        &mut self.state,
                                        &self.backend,
                                    );
                                }
                                FormKind::QqFilter if is_toggle => {
                                    // toggle_group:123456 — add/remove group directly
                                    if let Some(gid_str) = val.split(':').nth(1) {
                                        if let Ok(gid) = gid_str.parse::<i64>() {
                                            crate::slash_commands::qq::handle_toggle_group(
                                                &mut self.state,
                                                &self.backend,
                                                &val,
                                                gid,
                                            );
                                            // Refresh form
                                            crate::slash_commands::qq::allowlist_deny_refresh(
                                                &mut self.state,
                                                &self.backend,
                                                val.starts_with("denylist_"),
                                            );
                                        }
                                    }
                                }
                                FormKind::QqFilter if is_friend_toggle => {
                                    // toggle_friend:123456 — add/remove friend from list
                                    if let Some(uid_str) = val.split(':').nth(1) {
                                        if let Ok(uid) = uid_str.parse::<i64>() {
                                            crate::slash_commands::qq::handle_toggle_friend(
                                                &mut self.state,
                                                &self.backend,
                                                &val,
                                                uid,
                                            );
                                            // Refresh the form.
                                            crate::slash_commands::qq::allowlist_deny_refresh(
                                                &mut self.state,
                                                &self.backend,
                                                val.starts_with("denylist_"),
                                            );
                                        }
                                    }
                                }
                                FormKind::QqFilter if is_direct_remove => {
                                    // remove_user:123456 — remove user directly
                                    if let Some(uid_str) = val.split(':').nth(1) {
                                        if let Ok(uid) = uid_str.parse::<i64>() {
                                            let is_deny = val.starts_with("denylist_");
                                            let cfg = &self.state.qq_filter;
                                            let (mut users, groups) = if is_deny {
                                                (
                                                    cfg.denylist_users.clone(),
                                                    cfg.denylist_groups.clone(),
                                                )
                                            } else {
                                                (
                                                    cfg.allowlist_users.clone(),
                                                    cfg.allowlist_groups.clone(),
                                                )
                                            };
                                            users.retain(|u| *u != uid);
                                            let cmd = if is_deny {
                                                BackendCommand::UpdateQqDenylist {
                                                    user_ids: users,
                                                    group_ids: groups,
                                                }
                                            } else {
                                                BackendCommand::UpdateQqAllowlist {
                                                    user_ids: users,
                                                    group_ids: groups,
                                                }
                                            };
                                            self.backend.send(cmd);
                                            self.backend
                                                .send(BackendCommand::RequestQqFilterConfig);
                                            let kind =
                                                if is_deny { "黑名单" } else { "白名单" };
                                            self.state.toast(
                                                format!("已将用户 {uid} 从{kind}移除 ✓"),
                                                ToastKind::Success,
                                            );
                                            crate::slash_commands::qq::allowlist_deny_refresh(
                                                &mut self.state,
                                                &self.backend,
                                                is_deny,
                                            );
                                        }
                                    }
                                }
                                FormKind::QqFilter if needs_text_input => {
                                    self.state.form_overlay.set_fields(vec![FormField {
                                        label: "QQ号".into(),
                                        value: String::new(),
                                        kind: FieldKind::Text,
                                    }]);
                                    self.state.form_overlay.edit_label = val;
                                    self.state.form_overlay.enter_edit();
                                    self.state.mode = ConversationMode::Normal;
                                }
                                FormKind::SessionSelect if val.contains(':') => {
                                    self.state.do_session_switch(&val);
                                    self.state.load_session_messages(&val);
                                    self.backend.send(BackendCommand::RequestState);
                                    self.state.toast(
                                        "已切换到该会话 — PgUp 查看历史消息",
                                        ToastKind::Info,
                                    );
                                }
                                FormKind::ApiConfig => {
                                    if val.contains(':') {
                                        self.state.do_session_switch(&val);
                                        self.state.load_session_messages(&val);
                                        self.backend.send(BackendCommand::RequestState);
                                        self.state.toast("已切换到该会话", ToastKind::Info);
                                    } else {
                                        use crate::slash_commands::api;
                                        api::handle_message(&mut self.state, &self.backend, &val);
                                    }
                                }
                                _ => {}
                            }
                        }
                        self.state.refresh_menu_msg();
                    }
                    _ => {}
                }
            }
            FormState::Editing => {
                // non-form keys fall through to prompt_input
            }
            _ => {}
        }
    }

    pub fn open_palette(&mut self, mode: PaletteMode) {
        self.state.palette_mode = mode;
        self.state.palette_selection = 0;
        if mode == PaletteMode::Sessions {
            let sessions = self.state.sorted_sessions();
            if let Some(id) = &self.state.active_session_id {
                if let Some(idx) = sessions.iter().position(|s| &s.id == id) {
                    self.state.palette_selection = idx;
                }
            }
        }
        self.state.show_palette = true;
    }

    fn dispatch_palette(&mut self, key: &KeyEvent) {
        if key.code != KeyCode::Enter {
            return;
        }
        if self.state.palette_mode == PaletteMode::Sessions {
            let sessions = self.state.sorted_sessions();
            let idx = self
                .state
                .palette_selection
                .min(sessions.len().saturating_sub(1));
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
            PaletteAction::ConfigureApi => self.open_settings(),
            PaletteAction::ClearSession => {
                if let Some(id) = self.state.active_session_id.clone() {
                    self.backend
                        .send(BackendCommand::ClearSession { session_id: id });
                }
            }
            PaletteAction::RequestState => {
                self.backend.send(BackendCommand::RequestState);
            }
            PaletteAction::SwitchSession => {
                self.open_palette(PaletteMode::Sessions);
                return;
            }
            PaletteAction::ToggleHelp => self.state.show_help = true,
            PaletteAction::Quit => self.state.running = false,
        }
        self.state.show_palette = false;
    }

    fn open_settings(&mut self) {
        self.backend.send(BackendCommand::RequestState);
        self.state.settings.focus = 0;
        self.state.settings.selection = 0;
        self.state.show_settings = true;
    }

    pub fn render(&mut self, f: &mut Frame) {
        let area = f.area();
        f.render_widget(ratatui::widgets::Clear, area);

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

        // Build rendered lines for mouse coordinate mapping.
        let (lines, line_texts) = self.chat_view.build_lines(&self.state, main.width);
        self.state.conv_text = line_texts;

        let total = lines.len();
        let height = main.height.saturating_sub(1) as usize;
        let max_scroll = total.saturating_sub(height);
        let conv_scroll = self.state.chat_scroll.min(max_scroll);
        let top_line = max_scroll.saturating_sub(conv_scroll);
        self.state.conv_top = top_line;
        self.state.conv_area = main;

        self.chat_view.render(f, main, &self.state);

        // ── 鼠标文本选择高亮 ──
        if let Some((sr, sc, er, ec)) = self.state.selection_rect() {
            let ix0 = main.x;
            let iy0 = main.y + 1;
            let vis_h = main.height.saturating_sub(1);
            let vis_w = main.width;
            let buf = f.buffer_mut();
            for idx in sr..=er {
                let dy = idx as isize - top_line as isize;
                if dy < 0 || dy as u16 >= vis_h {
                    continue;
                }
                let sy = iy0 + dy as u16;
                let line = self
                    .state
                    .conv_text
                    .get(idx)
                    .map(|s| s.as_str())
                    .unwrap_or("");
                let line_vw = util::str_visual_width(line).max(1);
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
                        cell.set_style(
                            cell.style()
                                .add_modifier(ratatui::style::Modifier::REVERSED),
                        );
                    }
                }
            }
        }

        self.prompt_input.render(f, prompt_area, &self.state);

        if self.state.show_palette {
            self.command_palette.render(f, area, &self.state);
        }
        if self.state.show_settings {
            self.settings_popup.render(f, area, &self.state);
        }
        if self.state.show_help {
            self.help_popup.render(f, area, &self.state);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::slash_commands::SlashAction;
    use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

    fn key(code: KeyCode) -> crossterm::event::Event {
        crossterm::event::Event::Key(KeyEvent::new(code, KeyModifiers::NONE))
    }

    fn app() -> App {
        let (bridge, _handle) = echo_agent::create_bridge();
        App::new(
            Backend::new(std::sync::Arc::new(bridge)),
            Theme::dark(),
            Keybindings::default(),
        )
    }

    #[test]
    fn slash_does_not_quit() {
        let mut app = app();
        // / key opens slash menu directly (no focus model needed).
        app.handle_input(&key(KeyCode::Char('/')));
        assert!(app.state.show_slash);
        assert!(app.state.running, "输入 / 后不应退出");

        app.handle_input(&key(KeyCode::Enter));
        assert!(app.state.running, "输入 / 后回车不应退出");
        assert_eq!(app.state.pending_slash, Some(SlashAction::Help));

        let _ = app.state.pending_slash.take();
        app.state.show_slash = false;

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
        app.handle_input(&key(KeyCode::Char('/')));
        assert!(app.state.show_slash);
        let backend = ratatui::backend::TestBackend::new(80, 24);
        let mut terminal = ratatui::Terminal::new(backend).unwrap();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            terminal.draw(|f| app.render(f)).unwrap();
        }));
        assert!(result.is_ok(), "输入 / 后渲染不应 panic");
        for c in ['q', 'u'] {
            app.handle_input(&key(KeyCode::Char(c)));
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                terminal.draw(|f| app.render(f)).unwrap();
            }));
            assert!(result.is_ok(), "输入 {c} 后渲染不应 panic");
        }
        app.handle_input(&key(KeyCode::Enter));
        assert_eq!(app.state.pending_slash, Some(SlashAction::Quit));
    }

    #[test]
    fn settings_render_with_huge_profile_list_does_not_panic() {
        let mut app = app();
        for i in 0..100_000 {
            app.state
                .settings
                .profiles
                .push(echo_agent::ApiProfileInfo {
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
        assert!(app.state.settings.list_len() > 100_000);
    }

    fn ctrl_c() -> crossterm::event::Event {
        crossterm::event::Event::Key(KeyEvent::new(KeyCode::Char('c'), KeyModifiers::CONTROL))
    }

    #[test]
    fn first_ctrl_c_arms_quit_not_exit() {
        let mut app = app();
        app.handle_input(&ctrl_c());
        assert!(app.state.running, "first Ctrl+C must not exit");
        assert!(app.state.quit_armed);
    }

    #[test]
    fn second_ctrl_c_within_window_quits() {
        let mut app = app();
        app.handle_input(&ctrl_c());
        assert!(app.state.running);
        app.handle_input(&ctrl_c());
        assert!(!app.state.running, "double Ctrl+C within window exits");
    }

    #[test]
    fn quit_arm_expires_after_window() {
        let mut app = app();
        app.handle_input(&ctrl_c());
        assert!(app.state.running);
        // Pretend 3 seconds passed (window is 2s).
        app.state.quit_armed_at = std::time::Instant::now() - Duration::from_secs(3);
        app.handle_input(&ctrl_c());
        assert!(
            app.state.running,
            "second Ctrl+C after the window must re-arm, not exit"
        );
        assert!(app.state.quit_armed);
    }

    #[test]
    fn ctrl_c_in_form_goes_back_one_level() {
        let mut app = app();
        // Activate a form overlay.
        app.state.form_overlay.activate(
            "test",
            vec![crate::components::form_overlay::SelectItem {
                label: "x".into(),
                value: "y".into(),
            }],
            crate::components::form_overlay::FormKind::ApiConfig,
        );
        app.state.form_overlay.enter_edit();
        assert!(app.state.form_overlay.is_active());
        app.handle_input(&ctrl_c());
        assert!(
            app.state.form_overlay.is_active(),
            "first Ctrl+C inside a form backs up one level"
        );
        // Second Ctrl+C within the window deactivates.
        app.handle_input(&ctrl_c());
        assert!(!app.state.form_overlay.is_active());
        assert!(app.state.running);
    }

    fn key_event(code: KeyCode) -> crossterm::event::Event {
        crossterm::event::Event::Key(KeyEvent::new(code, KeyModifiers::NONE))
    }

    /// Activate a form overlay with one selectable item.
    fn activate_form(
        app: &mut App,
        kind: crate::components::form_overlay::FormKind,
        items: Vec<(&str, &str)>,
    ) {
        app.state.form_overlay.activate(
            "test",
            items
                .into_iter()
                .map(
                    |(label, value)| crate::components::form_overlay::SelectItem {
                        label: label.into(),
                        value: value.into(),
                    },
                )
                .collect(),
            kind,
        );
    }

    #[test]
    fn form_escape_from_selecting_exits_config_mode() {
        let mut app = app();
        activate_form(
            &mut app,
            crate::components::form_overlay::FormKind::ApiConfig,
            vec![("x", "y")],
        );
        app.handle_input(&key_event(KeyCode::Esc));
        assert!(!app.state.form_overlay.is_active(), "Esc closes the form");
        assert_eq!(app.state.mode, ConversationMode::Normal);
    }

    #[test]
    fn form_escape_from_editing_returns_to_selecting() {
        let mut app = app();
        activate_form(
            &mut app,
            crate::components::form_overlay::FormKind::ApiConfig,
            vec![("x", "y")],
        );
        app.state
            .form_overlay
            .set_fields(vec![crate::components::form_overlay::FormField {
                label: "Model".into(),
                value: String::new(),
                kind: crate::components::form_overlay::FieldKind::Text,
            }]);
        app.state.form_overlay.enter_edit();
        assert_eq!(
            app.state.form_overlay.state,
            crate::components::form_overlay::FormState::Editing
        );

        app.handle_input(&key_event(KeyCode::Esc));
        assert!(
            app.state.form_overlay.is_active(),
            "Esc in Editing returns to Selecting"
        );
        assert_eq!(
            app.state.form_overlay.state,
            crate::components::form_overlay::FormState::Selecting
        );
    }

    #[test]
    fn form_e_edits_api_config_with_current_values() {
        let mut app = app();
        app.state.status.provider = "deepseek".into();
        app.state.status.model = "ds-v4".into();
        app.state.status.base_url = "http://x".into();
        app.state.status.system_prompt = "你好".into();
        activate_form(
            &mut app,
            crate::components::form_overlay::FormKind::ApiConfig,
            vec![("1. deepseek", "1")],
        );

        app.handle_input(&key_event(KeyCode::Char('e')));
        assert_eq!(
            app.state.form_overlay.state,
            crate::components::form_overlay::FormState::Editing
        );
        let fields = &app.state.form_overlay.fields;
        assert_eq!(fields.len(), 5);
        assert_eq!(fields[0].value, "deepseek");
        assert_eq!(fields[1].value, "ds-v4");
        assert_eq!(fields[2].value, "http://x");
        assert_eq!(fields[4].value, "你好");
    }

    #[test]
    fn form_e_on_qq_add_user_enters_single_field_edit() {
        let mut app = app();
        activate_form(
            &mut app,
            crate::components::form_overlay::FormKind::QqFilter,
            vec![("[+] 手动输入QQ号添加用户", "allowlist_add_user")],
        );
        app.handle_input(&key_event(KeyCode::Char('e')));
        assert_eq!(
            app.state.form_overlay.state,
            crate::components::form_overlay::FormState::Editing
        );
        assert_eq!(app.state.form_overlay.fields.len(), 1);
        assert_eq!(app.state.form_overlay.fields[0].label, "QQ号");
    }

    #[test]
    fn form_enter_switches_gate_mode_and_sends_command() {
        let (bridge, handle) = echo_agent::create_bridge();
        let mut app = App::new(
            Backend::new(std::sync::Arc::new(bridge)),
            Theme::dark(),
            Keybindings::default(),
        );
        activate_form(
            &mut app,
            crate::components::form_overlay::FormKind::QqFilter,
            vec![("● 白名单模式", "gate_mode:allowlist")],
        );
        app.handle_input(&key_event(KeyCode::Enter));
        assert_eq!(
            handle.try_recv_command(),
            Some(BackendCommand::SetQqGateMode {
                mode: echo_adapter::GateMode::Allowlist
            })
        );
    }

    #[tokio::test]
    async fn submit_in_qq_filter_edit_sends_allowlist_command() {
        let (bridge, handle) = echo_agent::create_bridge();
        let mut app = App::new(
            Backend::new(std::sync::Arc::new(bridge)),
            Theme::dark(),
            Keybindings::default(),
        );
        // Simulate the "add user to allowlist" edit state.
        app.state.form_overlay.activate(
            "qq",
            vec![crate::components::form_overlay::SelectItem {
                label: "[+] 手动输入".into(),
                value: "allowlist_add_user".into(),
            }],
            crate::components::form_overlay::FormKind::QqFilter,
        );
        app.state.form_overlay.edit_label = "allowlist_add_user".into();
        app.state
            .form_overlay
            .set_fields(vec![crate::components::form_overlay::FormField {
                label: "QQ号".into(),
                value: String::new(),
                kind: crate::components::form_overlay::FieldKind::Text,
            }]);
        app.state.form_overlay.enter_edit();

        app.handle_submit("123456".into());
        assert!(
            !app.state.form_overlay.is_active(),
            "form closes after submit"
        );
        // handle_filter_action sends UpdateQqAllowlist, then the submit
        // path sends RequestQqFilterConfig.
        let mut commands = Vec::new();
        while let Some(cmd) = handle.try_recv_command() {
            commands.push(cmd);
        }
        assert!(
            commands.iter().any(|c| matches!(
                c,
                BackendCommand::UpdateQqAllowlist { user_ids, .. }
                    if user_ids.as_slice() == [123456]
            )),
            "UpdateQqAllowlist expected, got {commands:?}"
        );
        assert!(commands.contains(&BackendCommand::RequestQqFilterConfig));
    }

    #[tokio::test]
    async fn submit_in_api_config_mode_routes_to_api_handler() {
        let (bridge, handle) = echo_agent::create_bridge();
        let mut app = App::new(
            Backend::new(std::sync::Arc::new(bridge)),
            Theme::dark(),
            Keybindings::default(),
        );
        app.state.mode = ConversationMode::ApiConfig;

        app.handle_submit("key sk-123".into());
        let cmd = handle.try_recv_command().expect("command sent");
        match cmd {
            BackendCommand::UpdateApiConfig { api_key, .. } => assert_eq!(api_key, "sk-123"),
            other => panic!("unexpected command: {other:?}"),
        }
    }

    #[tokio::test]
    async fn submit_normal_sends_message() {
        let (bridge, handle) = echo_agent::create_bridge();
        let mut app = App::new(
            Backend::new(std::sync::Arc::new(bridge)),
            Theme::dark(),
            Keybindings::default(),
        );
        app.state.active_session_id = Some("qq:dm::123".into());

        app.handle_submit("你好".into());
        assert_eq!(
            handle.try_recv_command(),
            Some(BackendCommand::SendMessage {
                session_id: "qq:dm::123".into(),
                content: "你好".into()
            })
        );
    }
}
