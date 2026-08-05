//! Terminal app — [`App`] struct, main event loop, input routing,
//! backend event handling, and rendering.
//!
//! Data types and [`AppState`] live in [`crate::state`].

use std::time::Duration;

use anyhow::Result;
use echo_agent::{BackendCommand, BackendEvent, SessionInfo};
use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use ratatui::{Frame, Terminal};

use crate::backend::Backend;
use crate::components::{
    chat_view::ChatView, command_palette::PaletteAction, help_popup::HelpPopup,
    prompt_input::PromptInput, settings_popup::SettingsPopup,
    status_bar::StatusBar, Component,
};
use crate::event::Event;
use crate::keybindings::Keybindings;
use crate::state::{
    AppState, ConversationMode, DisplayMessage, MsgRole, PaletteMode, ToastKind,
};
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
                    crate::slash_commands::dispatch(
                        &mut self.state,
                        &self.backend,
                        action,
                        text,
                    );
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
        self.backend
            .send(BackendCommand::SendMessage { session_id, content });
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
                    if self.state.no_modal()
                        && self.state.point_in_conv(mouse.column, mouse.row)
                    {
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
            self.state.toast(format!("内部错误: {msg}"), ToastKind::Error);
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
                        self.state.toast("已返回 (再按 Ctrl+C 退出)", ToastKind::Info);
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
                let is_qq_action = current_val.starts_with("allowlist_")
                    || current_val.starts_with("denylist_");
                let is_toggle = is_qq_action && current_val.contains("_toggle_group:");
                let is_direct_remove = is_qq_action && current_val.contains("_remove_user:");
                let needs_text_input = is_qq_action
                    && !is_toggle
                    && !is_direct_remove
                    && !current_val.ends_with("__info__");
                match key.code {
                    KeyCode::Char('e') if needs_text_input => if fo.form_kind == FormKind::QqFilter {
                        let val = fo.confirm().unwrap_or_default();
                        self.state.form_overlay.set_fields(vec![FormField {
                            label: "QQ号".into(),
                            value: String::new(),
                            kind: FieldKind::Text,
                        }]);
                        self.state.form_overlay.edit_label = val;
                        self.state.form_overlay.enter_edit();
                        self.state.mode = ConversationMode::Normal;
                    },
                    KeyCode::Char('e') => if fo.form_kind == FormKind::ApiConfig {
                        let label = fo
                            .select_items
                            .get(fo.select_idx)
                            .map(|s| s.label.clone())
                            .unwrap_or_default();
                        let st = &self.state.status;
                        self.state.form_overlay.set_fields(vec![
                            FormField { label: "Provider".into(), value: st.provider.clone(), kind: FieldKind::Text },
                            FormField { label: "Model".into(), value: st.model.clone(), kind: FieldKind::Text },
                            FormField { label: "BaseURL".into(), value: st.base_url.clone(), kind: FieldKind::Text },
                            FormField { label: "APIKey".into(), value: String::new(), kind: FieldKind::Password },
                            FormField { label: "Prompt".into(), value: st.system_prompt.clone(), kind: FieldKind::Text },
                        ]);
                        self.state.form_overlay.edit_label = label;
                        self.state.form_overlay.enter_edit();
                    },
                    KeyCode::Enter => {
                        if let Some(val) = self.state.form_overlay.confirm() {
                            match fo.form_kind {
                                // QQ setting: gate mode switch.
                                FormKind::QqFilter if val.starts_with("gate_mode:") => {
                                    let mode = val.strip_prefix("gate_mode:").unwrap_or("none");
                                    tracing::info!(%mode, "TUI: gate mode switch");
                                    self.backend.send(BackendCommand::SetQqGateMode { mode: mode.to_string() });
                                    self.backend.send(BackendCommand::RequestQqFilterConfig);
                                    self.state.qq_gate_mode = mode.to_string();
                                    // Refresh form to show updated radio state.
                                    crate::slash_commands::qq::setting(&mut self.state, &self.backend);
                                }
                                // QQ setting submenu navigation.
                                FormKind::QqFilter if val == "qq_allowlist" => {
                                    crate::slash_commands::qq::allowlist(&mut self.state, &self.backend);
                                }
                                FormKind::QqFilter if val == "qq_denylist" => {
                                    crate::slash_commands::qq::denylist(&mut self.state, &self.backend);
                                }
                                FormKind::QqFilter if is_toggle => {
                                    // toggle_group:123456 — add/remove group directly
                                    if let Some(gid_str) = val.split(':').nth(1) {
                                        if let Ok(gid) = gid_str.parse::<i64>() {
                                            crate::slash_commands::qq::handle_toggle_group(
                                                &mut self.state, &self.backend, &val, gid,
                                            );
                                            // Refresh form
                                            crate::slash_commands::qq::allowlist_deny_refresh(
                                                &mut self.state, &self.backend, val.starts_with("denylist_"),
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
                                                (cfg.denylist_users.clone(), cfg.denylist_groups.clone())
                                            } else {
                                                (cfg.allowlist_users.clone(), cfg.allowlist_groups.clone())
                                            };
                                            users.retain(|u| *u != uid);
                                            let cmd = if is_deny {
                                                BackendCommand::UpdateQqDenylist { user_ids: users, group_ids: groups }
                                            } else {
                                                BackendCommand::UpdateQqAllowlist { user_ids: users, group_ids: groups }
                                            };
                                            self.backend.send(cmd);
                                            self.backend.send(BackendCommand::RequestQqFilterConfig);
                                            let kind = if is_deny { "黑名单" } else { "白名单" };
                                            self.state.toast(format!("已将用户 {uid} 从{kind}移除 ✓"), ToastKind::Success);
                                            crate::slash_commands::qq::allowlist_deny_refresh(
                                                &mut self.state, &self.backend, is_deny,
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
                                    self.state.toast("已切换到该会话 — PgUp 查看历史消息", ToastKind::Info);
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

    fn apply_backend_event(&mut self, ev: BackendEvent) {
        match ev {
            BackendEvent::AdapterStateChanged {
                adapter_name,
                connected,
                self_id,
            } => {
                let self_id_str = self_id.clone();
                self.state.status.set_adapter_state(crate::state::AdapterStatusEntry {
                    name: adapter_name.clone(),
                    display_name: adapter_name.clone(),
                    connected,
                    running: true,
                    self_id,
                    bind_address: String::new(),
                    started_at: None,
                });
                if connected {
                    self.state.toast(
                        format!(
                            "{adapter_name} connected ({})",
                            self_id_str.as_deref().unwrap_or("?")
                        ),
                        ToastKind::Success,
                    );
                } else {
                    self.state
                        .toast(format!("{adapter_name} disconnected"), ToastKind::Error);
                }
            }
            BackendEvent::AdapterList { adapters } => {
                for a in adapters {
                    self.state.status.set_adapter_state(crate::state::AdapterStatusEntry {
                        name: a.name,
                        display_name: a.display_name,
                        connected: a.connected,
                        running: a.running,
                        self_id: a.self_id,
                        bind_address: a.bind_address,
                        started_at: a.started_at,
                    });
                }
            }
            BackendEvent::MessageReceived {
                session_id,
                content,
                timestamp,
                ..
            } => {
                self.push_to(session_id, MsgRole::User, content, timestamp);
            }
            BackendEvent::AgentThinking { session_id } => {
                self.state.llm_in_flight = true;
                self.push_to(session_id, MsgRole::System, "… 思考中".into(), 0);
            }
            BackendEvent::LlmRequest { model, .. } => {
                self.state.status.model = model;
            }
            BackendEvent::LlmResponse {
                model,
                prompt_tokens,
                completion_tokens,
                ..
            } => {
                self.state.status.model = model;
                self.state.llm_in_flight = false;
                let _ = (prompt_tokens, completion_tokens);
            }
            BackendEvent::ToolCall {
                session_id,
                tool_name,
                arguments,
                ..
            } => {
                self.state.tool_in_flight =
                    Some((tool_name.clone(), std::time::Instant::now()));
                self.push_to(
                    session_id,
                    MsgRole::Tool,
                    format!("🔧 {tool_name}({arguments})"),
                    0,
                );
            }
            BackendEvent::ToolResult {
                session_id,
                tool_name,
                result,
                ..
            } => {
                self.state.tool_in_flight = None;
                let snippet: String = result.chars().take(80).collect();
                self.push_to(
                    session_id,
                    MsgRole::Tool,
                    format!("✓ {tool_name}: {snippet}"),
                    0,
                );
            }
            BackendEvent::MessageSent {
                session_id,
                content,
                ..
            } => {
                self.state.llm_in_flight = false;
                let ts = chrono::Utc::now().timestamp();
                self.push_to(session_id, MsgRole::Agent, content, ts);
            }
            BackendEvent::SessionUpdated { session } => {
                self.upsert_session(session);
            }
            BackendEvent::ApiConfigUpdated {
                provider,
                model,
                base_url,
                api_key_set,
                system_prompt,
                active_api,
                profiles,
            } => {
                self.state.status.provider = provider;
                self.state.status.model = model.clone();
                self.state.status.base_url = base_url;
                self.state.status.system_prompt = system_prompt;
                self.state.settings.profiles = profiles;
                self.state.settings.active_api = active_api.clone();
                self.state.settings.api_key_set = api_key_set;
                let _ = model;
            }
            BackendEvent::ApiProfilesUpdated {
                active_api,
                profiles,
            } => {
                self.state.settings.profiles = profiles;
                self.state.settings.active_api = active_api;
            }
            BackendEvent::GroupList { groups } => {
                self.state.qq_groups = groups
                    .into_iter()
                    .map(|g| (g.group_id, g.group_name))
                    .collect();
            }
            BackendEvent::QqGateMode { mode } => {
                self.state.qq_gate_mode = mode;
            }
            BackendEvent::QqFilterConfig {
                allowlist_users,
                allowlist_groups,
                denylist_users,
                denylist_groups,
            } => {
                self.state.qq_filter = crate::state::QqFilterCache {
                    allowlist_users,
                    allowlist_groups,
                    denylist_users,
                    denylist_groups,
                };
            }
            BackendEvent::Error {
                session_id,
                message,
            } => {
                self.state.llm_in_flight = false;
                let _ = session_id;
                self.state.toast(message, ToastKind::Error);
            }
        }
    }

    fn push_to(&mut self, session_id: String, role: MsgRole, content: String, time: i64) {
        self.state.push_message(
            &session_id,
            DisplayMessage {
                role,
                content: content.clone(),
                time,
            },
        );
        if let Some(s) = self.state.sessions.iter_mut().find(|s| s.id == session_id) {
            s.last_message = content;
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
            Backend::new(bridge),
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
}
