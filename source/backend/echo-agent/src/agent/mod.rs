//! The agent loop: LLM + tools + skills + memory composed into one reply.

mod commands;
mod orchestration;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use anyhow::{anyhow, Result};
use tokio::sync::{Mutex, RwLock};

use echo_adapter::AdapterRegistry;

use crate::bridge::BackendHandle;
use crate::command::BackendCommand;
use crate::config::{AgentConfig, ApiProfile};
use crate::event::{AdapterStatus, BackendEvent};
use crate::llm::{ChatMessage, ChatRequest, LlmProvider, ToolCall};
use crate::session::{Session, SessionManager};
use crate::skill::SkillRegistry;
use crate::tool::ToolRegistry;

/// The agent: owns provider, tools, skills, sessions, adapters, and emits events.
pub struct Agent {
    provider: RwLock<Arc<dyn LlmProvider>>,
    config: RwLock<AgentConfig>,
    active_model: RwLock<String>,
    /// Shared config store for persisting `[agent]` changes (optional).
    config_store: tokio::sync::Mutex<Option<echo_adapter::ConfigStore>>,
    pub tools: Arc<ToolRegistry>,
    pub skills: Arc<Mutex<SkillRegistry>>,
    pub sessions: SessionManager,
    /// Platform adapters managed externally (registered by main / config).
    pub adapters: Arc<AdapterRegistry>,
    /// Tokio RwLock: `emit()` runs from async loops and must never block a
    /// worker thread. All access goes through `try_*` (never held across
    /// await points, contention is negligible).
    pub handle: tokio::sync::RwLock<Option<Arc<BackendHandle>>>,
    system_prompt_cache: RwLock<Option<String>>,
    skill_reload_started: AtomicBool,
    orchestration_started: AtomicBool,
    timer_scheduler: orchestration::TimerScheduler,
    /// Cancels background tasks (session eviction / save) on shutdown.
    cancel: tokio_util::sync::CancellationToken,
}

impl std::fmt::Debug for Agent {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Agent")
            .field("active_model", &self.active_model)
            .field("adapters", &self.adapters.names())
            .finish_non_exhaustive()
    }
}

impl Agent {
    pub fn new(
        provider: Arc<dyn LlmProvider>,
        config: AgentConfig,
        skills: SkillRegistry,
        tools: ToolRegistry,
        adapters: Arc<AdapterRegistry>,
    ) -> Self {
        let sessions = SessionManager::new(config.memory_limit);
        let eviction_sessions = sessions.clone();
        let cancel = tokio_util::sync::CancellationToken::new();
        let eviction_cancel = cancel.clone();
        let timer_scheduler = orchestration::TimerScheduler::new(cancel.clone());
        let agent = Self {
            provider: RwLock::new(provider),
            config: RwLock::new(config),
            active_model: RwLock::new(String::new()),
            config_store: tokio::sync::Mutex::new(None),
            tools: Arc::new(tools),
            skills: Arc::new(Mutex::new(skills)),
            sessions,
            adapters,
            handle: tokio::sync::RwLock::new(None),
            system_prompt_cache: RwLock::new(None),
            skill_reload_started: AtomicBool::new(false),
            orchestration_started: AtomicBool::new(false),
            timer_scheduler,
            cancel,
        };
        // Spawn periodic session eviction (every 5 minutes).
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
            loop {
                tokio::select! {
                    _ = interval.tick() => eviction_sessions.evict_idle(),
                    _ = eviction_cancel.cancelled() => break,
                }
            }
        });
        agent
    }

    /// Graceful shutdown: stop background tasks and flush sessions to disk.
    pub async fn shutdown(&self) {
        self.cancel.cancel();
        self.sessions.save_now().await;
    }

    /// Set the TOML config file that `[agent]` changes are persisted to.
    pub fn set_config_path(&self, path: impl Into<std::path::PathBuf>) {
        let p: std::path::PathBuf = path.into();
        self.set_config_store(echo_adapter::ConfigStore::new(p));
    }

    /// Attach a shared [`echo_adapter::ConfigStore`] for `[agent]` persistence.
    ///
    /// Also sets the session persistence path (same directory). Called once
    /// at startup — uses try_lock since no concurrent access exists yet.
    pub fn set_config_store(&self, store: echo_adapter::ConfigStore) {
        let sessions_path = store.path().with_file_name("echo-sessions.json");
        self.sessions.set_persist_path(sessions_path);
        if let Ok(mut slot) = self.config_store.try_lock() {
            *slot = Some(store);
        } else {
            tracing::warn!("config store slot busy, ignoring set_config_store");
        }
    }

    /// Load persisted sessions from disk.
    pub async fn load_sessions(&self) -> usize {
        self.sessions.load_from_file().await
    }

    /// Spawn a periodic session save task.
    pub fn start_session_save_task(self: &Arc<Self>) {
        let agent = Arc::clone(self);
        let cancel = self.cancel.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                tokio::select! {
                    _ = interval.tick() => agent.sessions.maybe_save().await,
                    _ = cancel.cancelled() => break,
                }
            }
        });
    }

    /// Watch the configured skill directory and reload changed `SKILL.md`
    /// files. Runtime enable/disable choices survive content reloads.
    pub async fn start_skill_reload_task(self: &Arc<Self>) {
        let skills_dir = self.config.read().await.skills_dir.clone();
        if skills_dir.trim().is_empty()
            || self
                .skill_reload_started
                .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
                .is_err()
        {
            return;
        }

        let agent = Arc::clone(self);
        let cancel = self.cancel.clone();
        tracing::info!(path = %skills_dir, interval_seconds = 1, "skill hot reload started");
        tokio::spawn(async move {
            let start = tokio::time::Instant::now() + std::time::Duration::from_secs(1);
            let mut interval = tokio::time::interval_at(start, std::time::Duration::from_secs(1));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        if let Err(error) = agent.reload_skills(&skills_dir).await {
                            tracing::warn!(%error, path = %skills_dir, "skill hot reload failed; keeping previous registry");
                        }
                    }
                    _ = cancel.cancelled() => break,
                }
            }
        });
    }

    /// Start delivery of scheduled timer events back into their originating sessions.
    pub fn start_orchestration_task(self: &Arc<Self>) {
        if self
            .orchestration_started
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_err()
        {
            return;
        }
        let Some(mut receiver) = self.timer_scheduler.take_receiver() else {
            self.orchestration_started.store(false, Ordering::Release);
            tracing::warn!("timer event receiver unavailable");
            return;
        };

        let agent = Arc::clone(self);
        let cancel = self.cancel.clone();
        tokio::spawn(async move {
            loop {
                let event = tokio::select! {
                    event = receiver.recv() => match event {
                        Some(event) => event,
                        None => break,
                    },
                    _ = cancel.cancelled() => break,
                };
                agent.timer_scheduler.mark_delivered(&event.id).await;
                let Some(key) = crate::session::SessionKey::parse(&event.session_id) else {
                    tracing::warn!(timer_id = %event.id, session_id = %event.session_id, "timer session is invalid");
                    continue;
                };
                let session = agent
                    .sessions
                    .get(&event.session_id)
                    .unwrap_or_else(|| agent.sessions.get_or_create(&key, "timer".into(), None));
                let input = serde_json::json!({
                    "event": "timer",
                    "timer_id": event.id,
                    "due_at": event.due_at.to_rfc3339(),
                    "session": {
                        "id": event.session_id,
                        "platform": key.platform,
                        "scope": key.scope,
                        "scope_id": key.scope_id,
                        "user_id": key.user_id
                    },
                    "task": event.task
                });
                let input = format!("<timer_event>{input}</timer_event>");
                agent.emit(BackendEvent::MessageReceived {
                    session_id: session.id.clone(),
                    adapter_name: "timer".into(),
                    platform: session.session_key.platform.clone(),
                    user_id: session.session_key.user_id.clone(),
                    user_name: "timer".into(),
                    channel: if session.session_key.scope == "group" {
                        format!("group:{}", session.session_key.scope_id)
                    } else {
                        "direct".into()
                    },
                    group_name: session.group_name.clone(),
                    content: input.clone(),
                    timestamp: chrono::Utc::now().timestamp(),
                });
                match agent.process_message(&session, &input).await {
                    Ok(content) if !content.trim().is_empty() => {
                        agent.emit(BackendEvent::AgentOutput {
                            session_id: session.id.clone(),
                            content,
                        });
                    }
                    Ok(_) => {}
                    Err(error) => {
                        tracing::warn!(%error, timer_id = %event.id, "timer task failed");
                        agent.emit(BackendEvent::Error {
                            session_id: Some(session.id.clone()),
                            message: format!("timer {} failed: {error}", event.id),
                        });
                    }
                }
            }
        });
    }

    async fn reload_skills(&self, skills_dir: &str) -> Result<bool, String> {
        if !std::path::Path::new(skills_dir).exists() {
            return Ok(false);
        }

        let dir = skills_dir.to_string();
        let mut reloaded = tokio::task::spawn_blocking(move || SkillRegistry::discover(&dir))
            .await
            .map_err(|error| format!("skill reload task failed: {error}"))?
            .map_err(|error| error.to_string())?;

        let mut current = self.skills.lock().await;
        reloaded.inherit_enabled_from(&current);
        if *current == reloaded {
            return Ok(false);
        }

        let names = reloaded.names();
        *current = reloaded;
        drop(current);
        *self.system_prompt_cache.write().await = None;
        tracing::info!(skills = ?names, path = %skills_dir, "skills hot reloaded");
        Ok(true)
    }

    pub fn attach(&self, handle: Arc<BackendHandle>) {
        if let Ok(mut h) = self.handle.try_write() {
            *h = Some(handle);
        } else {
            tracing::warn!("handle slot busy, ignoring attach");
        }
    }

    /// Non-blocking poll for a frontend command (used by the command pump).
    pub fn try_recv_command(&self) -> Option<BackendCommand> {
        self.handle
            .try_read()
            .ok()?
            .as_ref()
            .and_then(|h| h.try_recv_command())
    }

    /// Emit an event to subscribers (TUI, ...). No-op when unattached.
    pub fn emit(&self, event: BackendEvent) {
        if let Some(h) = self
            .handle
            .try_read()
            .ok()
            .as_ref()
            .and_then(|g| g.as_ref())
        {
            h.emit(event);
        }
    }

    pub async fn active_model(&self) -> String {
        let model = self.active_model.read().await.clone();
        if model.is_empty() {
            self.provider.read().await.default_model().to_string()
        } else {
            model
        }
    }

    pub async fn active_provider(&self) -> String {
        self.provider.read().await.name().to_string()
    }

    pub async fn set_model(&self, model: String) {
        *self.active_model.write().await = model;
    }

    /// Process one user message through the agent loop and return the reply.
    pub async fn process_message(&self, session: &Session, content: &str) -> Result<String> {
        // Serialise turns for this session so concurrent messages don't interleave history.
        let _turn = session.turn_lock.lock().await;
        let session_id = session.id.clone();
        self.emit(BackendEvent::AgentThinking {
            session_id: session_id.clone(),
        });

        let mut system_prompt = self.build_system_prompt(content).await;
        // Distinguish input origin by content markers, NOT by the session's
        // platform. A QQ session can receive backend/TUI input (no hook), and
        // that must be answered in the backend — never pushed to QQ.
        let is_qq_hook = content.contains("<qq_message_hook>");
        let is_timer = content.contains("<timer_event>");
        let is_qq_session = session.session_key.platform.eq_ignore_ascii_case("qq");
        if is_qq_hook {
            system_prompt.push_str(
                "\n\n# QQ transport boundary\n\
                 This input is an external QQ message (<qq_message_hook>). \
                 Read sender and group data from the structured hook payload.\n\
                 Every <qq_message_hook> input MUST be answered exactly once via \
                 a send tool: send_private_msg for private chats (user_id from \
                 payload.sender.user_id), send_group_msg for groups (group_id \
                 from payload.channel.group_id). Read the target ID from the \
                 hook payload — never invent one. Your normal assistant output \
                 is backend-only and invisible to the QQ user; to send anything \
                 visible on QQ you MUST call send_private_msg or send_group_msg. \
                 Do not claim you replied before the send tool returns success.",
            );
        } else if is_timer {
            system_prompt.push_str(
                "\n\n# Backend task boundary\n\
                 This input is a scheduled backend task (<timer_event>), not an \
                 incoming QQ message. Your normal output is backend-only text. \
                 Only if the task explicitly asks to deliver a message to QQ, \
                 call send_private_msg or send_group_msg with an explicit target ID.",
            );
        } else if is_qq_session {
            system_prompt.push_str(
                "\n\n# Backend input boundary\n\
                 This input was typed locally (TUI/backend), not received from \
                 QQ. Reply directly in the backend. Do NOT call send_private_msg \
                 or send_group_msg unless the user explicitly asks you to send a \
                 message to a QQ user or group.",
            );
        }

        // Append user message to session history (bounded).
        {
            let mut history = session.history.lock().await;
            history.push(ChatMessage::user(content));
            let limit = self.sessions.memory_limit();
            let len = history.len();
            if len > limit {
                history.drain(..len - limit);
            }
        }
        let mut messages = vec![ChatMessage::system(system_prompt)];
        {
            let history = session.history.lock().await;
            messages.extend(history.iter().cloned());
        }

        let mut tools = (*self.tools.definitions().await).clone();
        tools.extend(orchestration::tool_definitions());
        // max_tool_iterations == 0 still allows one direct reply (without tools).
        let max_iterations = self.config.read().await.max_tool_iterations.max(1);

        for _ in 0..max_iterations {
            let model = self.active_model().await;
            self.emit(BackendEvent::LlmRequest {
                session_id: session_id.clone(),
                model: model.clone(),
            });
            let request = ChatRequest {
                model: model.clone(),
                messages: messages.clone(),
                tools: Some(tools.clone()),
                temperature: None,
                max_tokens: None,
            };
            let response = {
                let provider = self.provider.read().await;
                provider.chat(&request).await?
            };
            self.emit(BackendEvent::LlmResponse {
                session_id: session_id.clone(),
                model,
                prompt_tokens: response.usage.prompt_tokens,
                completion_tokens: response.usage.completion_tokens,
            });

            if response.tool_calls.is_empty() {
                let reply = response.content.unwrap_or_default();
                if !reply.trim().is_empty() {
                    session
                        .history
                        .lock()
                        .await
                        .push(ChatMessage::assistant(reply.clone()));
                }
                self.sessions.mark_dirty();
                self.emit(BackendEvent::AgentCompleted {
                    session_id: session_id.clone(),
                });
                return Ok(reply);
            }

            // LLM wants tools — execute them and continue the loop.
            messages.push(assistant_with_tool_calls(
                &response.tool_calls,
                &response.content,
            ));
            for call in &response.tool_calls {
                let result = self.run_tool(&session_id, call).await;
                messages.push(ChatMessage::tool(result, &call.id));
            }
        }

        Err(anyhow!(
            "reached max tool iterations ({}) without a final reply",
            max_iterations
        ))
    }

    async fn run_tool(&self, session_id: &str, call: &ToolCall) -> String {
        self.emit(BackendEvent::ToolCall {
            session_id: session_id.to_string(),
            tool_name: call.name.clone(),
            arguments: call.arguments.clone(),
        });
        let args = serde_json::from_str(&call.arguments).unwrap_or(serde_json::Value::Null);
        let result = match call.name.as_str() {
            "schedule_timer" => self.timer_scheduler.schedule(session_id, args).await,
            "list_timers" => Ok(self.timer_scheduler.list(session_id).await),
            "cancel_timer" => self.timer_scheduler.cancel(session_id, args).await,
            "run_subagent" => self.run_subagent(session_id, args).await,
            _ => self
                .tools
                .execute(&call.name, args)
                .await
                .map_err(|error| error.to_string()),
        }
        .unwrap_or_else(|error| format!("error: {error}"));
        self.emit(BackendEvent::ToolResult {
            session_id: session_id.to_string(),
            tool_name: call.name.clone(),
            result: result.clone(),
        });
        result
    }

    async fn run_subagent(
        &self,
        session_id: &str,
        arguments: serde_json::Value,
    ) -> Result<String, String> {
        let args = orchestration::parse_subagent_args(arguments)?;
        self.emit(BackendEvent::SubagentStarted {
            session_id: session_id.to_string(),
            task: args.task.clone(),
        });
        let mut messages = vec![ChatMessage::system(
            "You are an isolated subagent. Complete the bounded task and return a concise, factual result to the parent agent. You have no tools and must not claim to perform external actions or communicate with users.",
        )];
        if let Some(context) = args.context {
            messages.push(ChatMessage::user(format!("Context:\n{context}")));
        }
        messages.push(ChatMessage::user(format!("Task:\n{}", args.task)));
        let request = ChatRequest {
            model: self.active_model().await,
            messages,
            tools: None,
            temperature: None,
            max_tokens: None,
        };
        let provider = self.provider.read().await.clone();
        let response = match provider.chat(&request).await {
            Ok(response) => response,
            Err(error) => {
                self.emit(BackendEvent::SubagentCompleted {
                    session_id: session_id.to_string(),
                    success: false,
                });
                return Err(format!("subagent request failed: {error}"));
            }
        };
        if !response.tool_calls.is_empty() {
            self.emit(BackendEvent::SubagentCompleted {
                session_id: session_id.to_string(),
                success: false,
            });
            return Err("subagent attempted a tool call, but subagents have no tools".into());
        }
        let content = response.content.unwrap_or_default();
        if content.trim().is_empty() {
            self.emit(BackendEvent::SubagentCompleted {
                session_id: session_id.to_string(),
                success: false,
            });
            return Err("subagent returned an empty result".into());
        }
        self.emit(BackendEvent::SubagentCompleted {
            session_id: session_id.to_string(),
            success: true,
        });
        Ok(content)
    }

    /// System prompt = base prompt + skill metadata + triggered skill instructions.
    async fn build_system_prompt(&self, content: &str) -> String {
        let skills = self.skills.lock().await;
        let matched = skills.find_matching(content);
        // No skill triggered — use cache if available.
        if matched.is_none() {
            if let Some(ref cached) = *self.system_prompt_cache.read().await {
                return cached.clone();
            }
        }
        let base = self.config.read().await.system_prompt.clone();
        let mut prompt = base;
        if !skills.is_empty() {
            prompt.push_str("\n\n# Available skills\n");
            prompt.push_str(&skills.metadata_lines());
        }
        for skill in skills.always_enabled() {
            prompt.push_str(&format!(
                "\n\n# Active skill: {}\n{}",
                skill.metadata.name, skill.instructions
            ));
        }
        if let Some(matched) = matched {
            prompt.push_str(&format!(
                "\n\n# Triggered skill: {}\n{}",
                matched.metadata.name, matched.instructions
            ));
            return prompt; // don't cache triggered-skill prompts
        }
        // Cache the base+metadata prompt.
        let mut cache = self.system_prompt_cache.write().await;
        *cache = Some(prompt.clone());
        prompt
    }

    /// Emit the current adapter list to subscribers.
    fn emit_adapter_list(&self) {
        let adapters: Vec<AdapterStatus> = self
            .adapters
            .list_info()
            .into_iter()
            .map(|info| AdapterStatus {
                name: info.name,
                display_name: info.display_name,
                connected: matches!(info.status, echo_adapter::AdapterConnectionState::Connected),
                running: !matches!(info.status, echo_adapter::AdapterConnectionState::Stopped),
                self_id: info.self_id,
                bind_address: String::new(), // populated by QqAdapter
                started_at: info.started_at,
            })
            .collect();
        self.emit(BackendEvent::AdapterList { adapters });
    }

    /// Current API configuration summary (for the TUI settings form).
    pub async fn api_config(&self) -> AgentConfig {
        self.config.read().await.clone()
    }

    /// Emit the current API configuration to subscribers.
    pub async fn emit_api_config(&self) {
        let cfg = self.api_config().await;
        let mut resolved = cfg.clone();
        resolved.apply_active_profile();
        let key_set = !resolved.effective_api_key().is_empty();
        let profiles: Vec<crate::event::ApiProfileInfo> = cfg
            .api_profiles
            .iter()
            .map(|p| crate::event::ApiProfileInfo {
                name: p.name.clone(),
                provider: p.provider.clone(),
                model: p.model.clone(),
                api_key_set: !p.api_key.is_empty(),
            })
            .collect();
        self.emit(BackendEvent::ApiConfigUpdated {
            provider: resolved.provider.clone(),
            model: self.active_model().await,
            base_url: resolved.effective_base_url(),
            api_key_set: key_set,
            system_prompt: cfg.system_prompt.clone(),
            active_api: cfg.active_api.clone(),
            profiles: profiles.clone(),
        });
        self.emit(BackendEvent::ApiProfilesUpdated {
            active_api: cfg.active_api.clone(),
            profiles,
        });
    }

    /// Rebuild the LLM provider from the current config snapshot.
    async fn rebuild_provider(&self, cfg: &AgentConfig) -> bool {
        let mut resolved = cfg.clone();
        resolved.apply_active_profile();
        resolved.api_key = resolved.effective_api_key();
        resolved.base_url = resolved.effective_base_url();
        match crate::llm::create_provider(&resolved) {
            Ok(p) => {
                *self.provider.write().await = Arc::from(p);
                true
            }
            Err(e) => {
                self.emit(BackendEvent::Error {
                    session_id: None,
                    message: format!("failed to build provider: {e}"),
                });
                false
            }
        }
    }

    /// Save an API profile (or the top-level default when `name` is empty),
    /// activate it, rebuild the provider, and persist.
    async fn update_api_config(
        &self,
        name: String,
        provider: String,
        model: String,
        base_url: String,
        api_key: String,
    ) {
        let mut config = self.config.write().await;
        let keep_key = api_key.is_empty();
        if name.is_empty() {
            if !provider.is_empty() {
                config.provider = provider.clone();
            }
            if !model.is_empty() {
                config.model = model.clone();
            }
            if !base_url.is_empty() {
                config.base_url = base_url.clone();
            }
            if !keep_key {
                config.api_key = api_key.clone();
            }
            // Don't clear active_api — let explicit SwitchApi handle that.
        } else {
            let profile = match config.api_profiles.iter_mut().find(|p| p.name == name) {
                Some(p) => p,
                None => {
                    config.api_profiles.push(ApiProfile::new(
                        name.clone(),
                        provider.clone(),
                        model.clone(),
                    ));
                    let idx = config.api_profiles.len() - 1;
                    &mut config.api_profiles[idx]
                }
            };
            profile.provider = provider.clone();
            profile.model = model.clone();
            profile.base_url = base_url.clone();
            if !keep_key {
                profile.api_key = api_key.clone();
            }
            config.active_api = name.clone();
        }
        let cfg_snapshot = config.clone();
        drop(config);

        self.set_model(model.clone()).await;
        if self.rebuild_provider(&cfg_snapshot).await {
            self.emit(BackendEvent::Error {
                session_id: None,
                message: if name.is_empty() {
                    format!("default API updated: {provider} / {model}")
                } else {
                    format!("API saved and activated: {name} ({provider} / {model})")
                },
            });
        }
        self.emit_api_config().await;
        self.persist_config(&cfg_snapshot).await;
    }

    /// Switch to an API profile (or the top-level default when name is empty).
    async fn switch_api(&self, name: &str) {
        let mut config = self.config.write().await;
        if name.is_empty() {
            config.active_api.clear();
        } else {
            if !config.api_profiles.iter().any(|p| p.name == name) {
                self.emit(BackendEvent::Error {
                    session_id: None,
                    message: format!("API config not found: {name}"),
                });
                return;
            }
            config.active_api = name.to_string();
        }
        let cfg_snapshot = config.clone();
        let mut resolved = cfg_snapshot.clone();
        resolved.apply_active_profile();
        let model = resolved.model.clone();
        drop(config);

        if self.rebuild_provider(&cfg_snapshot).await {
            self.set_model(model).await;
            let label = if name.is_empty() {
                "default config".to_string()
            } else {
                name.to_string()
            };
            self.emit(BackendEvent::Error {
                session_id: None,
                message: format!("switched to API: {label}"),
            });
        }
        self.emit_api_config().await;
        self.persist_config(&cfg_snapshot).await;
    }

    /// Delete an API profile; if it was active, fall back to the top-level default.
    async fn delete_api(&self, name: &str) {
        let mut config = self.config.write().await;
        let before = config.api_profiles.len();
        config.api_profiles.retain(|p| p.name != name);
        let removed = config.api_profiles.len() < before;
        if removed && config.active_api == name {
            config.active_api.clear();
        }
        let cfg_snapshot = config.clone();
        drop(config);

        if removed {
            if self.rebuild_provider(&cfg_snapshot).await {
                self.set_model(cfg_snapshot.model.clone()).await;
            }
            self.emit(BackendEvent::Error {
                session_id: None,
                message: format!("deleted API config: {name}"),
            });
            self.emit_api_config().await;
            self.persist_config(&cfg_snapshot).await;
        } else {
            self.emit(BackendEvent::Error {
                session_id: None,
                message: format!("API config not found: {name}"),
            });
        }
    }

    /// Persist a config snapshot's `[agent]` section back to the TOML file
    /// through the shared [`echo_adapter::ConfigStore`].
    async fn persist_config(&self, cfg: &AgentConfig) {
        let store = match self.config_store.lock().await.clone() {
            Some(s) => s,
            None => return,
        };
        let value = match toml::Value::try_from(cfg) {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!(error = %e, "failed to serialize agent config");
                return;
            }
        };
        tracing::debug!(api_key_len = cfg.api_key.len(), "persisting agent config");
        if let Err(e) = store.patch(|root| {
            root.insert("agent".into(), value.clone());
            Ok(())
        }) {
            tracing::warn!(error = %e, "failed to persist agent config");
            return;
        }
        tracing::info!(path = %store.path().display(), "agent config persisted");
    }
}

fn assistant_with_tool_calls(calls: &[ToolCall], content: &Option<String>) -> ChatMessage {
    ChatMessage {
        role: crate::llm::ChatRole::Assistant,
        content: content.clone().unwrap_or_default(),
        tool_calls: Some(calls.to_vec()),
        tool_call_id: None,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::llm::{ChatChunk, ChatResponse, LlmError, Usage};
    use crate::session::SessionKey;
    use crate::tool::{Tool, ToolError};
    use std::sync::atomic::{AtomicUsize, Ordering};

    pub struct MockProvider {
        pub calls: Arc<AtomicUsize>,
        pub reply: String,
    }

    #[async_trait::async_trait]
    impl LlmProvider for MockProvider {
        fn name(&self) -> &str {
            "mock"
        }
        fn default_model(&self) -> &str {
            "mock-model"
        }
        async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            assert_eq!(request.messages[0].role, crate::llm::ChatRole::System);
            Ok(ChatResponse {
                content: Some(self.reply.clone()),
                tool_calls: vec![],
                usage: Usage::default(),
            })
        }
        async fn chat_stream(
            &self,
            _request: &ChatRequest,
            _tx: tokio::sync::mpsc::UnboundedSender<ChatChunk>,
        ) -> Result<(), LlmError> {
            Ok(())
        }
    }

    fn test_agent(provider: Arc<dyn LlmProvider>) -> Agent {
        Agent::new(
            provider,
            AgentConfig::default(),
            SkillRegistry::new(),
            ToolRegistry::new(),
            Arc::new(AdapterRegistry::new()),
        )
    }

    #[tokio::test]
    async fn agent_replies_and_remembers() {
        let provider = Arc::new(MockProvider {
            calls: Arc::new(AtomicUsize::new(0)),
            reply: "Hello!".into(),
        });
        let agent = test_agent(provider.clone());
        let key = SessionKey::local_tui();
        let session = agent.sessions.get_or_create(&key, "user".into(), None);
        let reply = agent.process_message(&session, "hi").await.unwrap();
        assert_eq!(reply, "Hello!");
        assert_eq!(session.history.lock().await.len(), 2);
        let _ = agent.process_message(&session, "again").await.unwrap();
        assert_eq!(session.history.lock().await.len(), 4);
        assert_eq!(provider.calls.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn update_api_config_persists() {
        let tmp =
            std::env::temp_dir().join(format!("echo-agent-cfg-{}.toml", uuid::Uuid::new_v4()));
        std::fs::write(
            &tmp,
            "[server]\nx = 1\n\n[agent]\nprovider = \"openai\"\nmodel = \"old-model\"\n",
        )
        .unwrap();
        let provider = Arc::new(MockProvider {
            calls: Arc::new(AtomicUsize::new(0)),
            reply: "ok".into(),
        });
        let agent = test_agent(provider);
        agent.set_config_path(tmp.clone());

        agent
            .apply_command(BackendCommand::UpdateApiConfig {
                name: String::new(),
                provider: "anthropic".into(),
                model: "claude-x".into(),
                base_url: "http://example.test".into(),
                api_key: String::new(),
            })
            .await;

        let cfg = agent.api_config().await;
        assert_eq!(cfg.provider, "anthropic");
        assert_eq!(cfg.model, "claude-x");
        assert_eq!(cfg.base_url, "http://example.test");
        assert!(cfg.effective_api_key().is_empty());
        assert!(cfg.active_api.is_empty());

        let content = std::fs::read_to_string(&tmp).unwrap();
        assert!(content.contains("[server]\nx = 1"));
        assert!(content.contains("provider = \"anthropic\""));
        assert!(content.contains("model = \"claude-x\""));
        assert!(content.contains("base_url = \"http://example.test\""));
        assert!(!content.contains("old-model"));
        std::fs::remove_file(&tmp).ok();
    }

    #[tokio::test]
    async fn skill_keyword_loads_instructions() {
        let mut reg = SkillRegistry::new();
        reg.register(crate::skill::Skill {
            metadata: crate::skill::SkillMetadata {
                name: "calc".into(),
                description: "d".into(),
                keywords: vec!["calc".into()],
                always: false,
                enabled: true,
            },
            instructions: "use calculator tool".into(),
        });
        let provider = Arc::new(MockProvider {
            calls: Arc::new(AtomicUsize::new(0)),
            reply: "ok".into(),
        });
        let agent = Agent::new(
            provider,
            AgentConfig::default(),
            reg,
            ToolRegistry::new(),
            Arc::new(AdapterRegistry::new()),
        );
        let prompt = agent.build_system_prompt("help me calc 1+1").await;
        assert!(prompt.contains("Available skills"));
        assert!(prompt.contains("Triggered skill: calc"));
        assert!(prompt.contains("calculator"));
    }

    #[tokio::test]
    async fn skill_directory_hot_reloads_updates_additions_and_deletions() {
        let dir = std::env::temp_dir().join(format!("echo-skill-reload-{}", uuid::Uuid::new_v4()));
        let style_dir = dir.join("style");
        std::fs::create_dir_all(&style_dir).unwrap();
        let style_path = style_dir.join("SKILL.md");
        std::fs::write(
            &style_path,
            "---\nname: style\ndescription: style\nmetadata:\n  always: true\n---\nold instructions",
        )
        .unwrap();

        let config = AgentConfig {
            skills_dir: dir.display().to_string(),
            ..Default::default()
        };
        let initial = SkillRegistry::discover(&config.skills_dir).unwrap();
        let provider = Arc::new(MockProvider {
            calls: Arc::new(AtomicUsize::new(0)),
            reply: "ok".into(),
        });
        let agent = Arc::new(Agent::new(
            provider,
            config,
            initial,
            ToolRegistry::new(),
            Arc::new(AdapterRegistry::new()),
        ));

        let first_prompt = agent.build_system_prompt("plain input").await;
        assert!(first_prompt.contains("old instructions"));
        agent.start_skill_reload_task().await;

        std::fs::write(
            &style_path,
            "---\nname: style\ndescription: updated\nmetadata:\n  always: true\n---\nnew instructions",
        )
        .unwrap();
        let extra_dir = dir.join("extra");
        std::fs::create_dir_all(&extra_dir).unwrap();
        std::fs::write(
            extra_dir.join("SKILL.md"),
            "---\nname: extra\ndescription: extra\nkeywords: [extra]\n---\nextra instructions",
        )
        .unwrap();

        tokio::time::timeout(std::time::Duration::from_secs(4), async {
            loop {
                let skills = agent.skills.lock().await;
                let updated = skills
                    .get("style")
                    .is_some_and(|skill| skill.instructions == "new instructions");
                let added = skills.get("extra").is_some();
                drop(skills);
                if updated && added {
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            }
        })
        .await
        .expect("modified and added skills should hot reload");

        let second_prompt = agent.build_system_prompt("plain input").await;
        assert!(second_prompt.contains("new instructions"));
        assert!(!second_prompt.contains("old instructions"));

        std::fs::remove_file(&style_path).unwrap();
        tokio::time::timeout(std::time::Duration::from_secs(4), async {
            loop {
                if agent.skills.lock().await.get("style").is_none() {
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            }
        })
        .await
        .expect("deleted skill should be removed by hot reload");

        agent.shutdown().await;
        std::fs::remove_dir_all(&dir).ok();
    }

    // ── Tool calling loop ──────────────────────────────────────────────────

    /// LLM provider that replays a fixed script of responses.
    struct ScriptedProvider {
        script: tokio::sync::Mutex<std::collections::VecDeque<ChatResponse>>,
        calls: Arc<AtomicUsize>,
        requests: tokio::sync::Mutex<Vec<ChatRequest>>,
    }

    impl ScriptedProvider {
        fn new(script: Vec<ChatResponse>) -> Self {
            Self {
                script: tokio::sync::Mutex::new(script.into()),
                calls: Arc::new(AtomicUsize::new(0)),
                requests: tokio::sync::Mutex::new(Vec::new()),
            }
        }
        fn call_count(&self) -> usize {
            self.calls.load(Ordering::SeqCst)
        }
    }

    #[async_trait::async_trait]
    impl LlmProvider for ScriptedProvider {
        fn name(&self) -> &str {
            "scripted"
        }
        fn default_model(&self) -> &str {
            "mock-model"
        }
        async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            assert_eq!(request.messages[0].role, crate::llm::ChatRole::System);
            self.requests.lock().await.push(request.clone());
            self.script
                .lock()
                .await
                .pop_front()
                .ok_or_else(|| LlmError::Config("script exhausted".into()))
        }
        async fn chat_stream(
            &self,
            _request: &ChatRequest,
            _tx: tokio::sync::mpsc::UnboundedSender<ChatChunk>,
        ) -> Result<(), LlmError> {
            Ok(())
        }
    }

    /// A tool that returns a canned result.
    struct MockTool {
        name: &'static str,
        result: String,
    }

    #[async_trait::async_trait]
    impl Tool for MockTool {
        fn name(&self) -> &str {
            self.name
        }
        fn description(&self) -> &str {
            "mock tool"
        }
        fn parameters(&self) -> serde_json::Value {
            serde_json::json!({})
        }
        async fn execute(&self, _arguments: serde_json::Value) -> Result<String, ToolError> {
            Ok(self.result.clone())
        }
    }

    fn tool_call(id: &str, name: &str) -> ChatResponse {
        ChatResponse {
            content: Some(format!("calling {name}")),
            tool_calls: vec![ToolCall {
                id: id.into(),
                name: name.into(),
                arguments: "{}".into(),
            }],
            usage: Usage::default(),
        }
    }

    #[tokio::test]
    async fn tool_calling_loop_executes_and_finishes() {
        let script = vec![
            tool_call("call_1", "mock_tool"),
            ChatResponse {
                content: Some("final answer".into()),
                tool_calls: vec![],
                usage: Usage::default(),
            },
        ];
        let provider = Arc::new(ScriptedProvider::new(script));
        let mut tools = ToolRegistry::new();
        tools.register(Arc::new(MockTool {
            name: "mock_tool",
            result: "tool output".into(),
        }));

        let agent = Agent::new(
            provider.clone(),
            AgentConfig::default(),
            SkillRegistry::new(),
            tools,
            Arc::new(AdapterRegistry::new()),
        );
        let key = SessionKey::local_tui();
        let session = agent.sessions.get_or_create(&key, "user".into(), None);
        let reply = agent
            .process_message(&session, "use the tool")
            .await
            .unwrap();
        assert_eq!(reply, "final answer");
        assert_eq!(provider.call_count(), 2);
    }

    #[tokio::test]
    async fn max_tool_iterations_returns_error() {
        let cfg = AgentConfig {
            max_tool_iterations: 2,
            ..Default::default()
        };
        let script = vec![
            tool_call("c1", "mock_tool"),
            tool_call("c2", "mock_tool"),
            tool_call("c3", "mock_tool"),
        ];
        let provider = Arc::new(ScriptedProvider::new(script));
        let mut tools = ToolRegistry::new();
        tools.register(Arc::new(MockTool {
            name: "mock_tool",
            result: "x".into(),
        }));

        let agent = Agent::new(
            provider,
            cfg,
            SkillRegistry::new(),
            tools,
            Arc::new(AdapterRegistry::new()),
        );
        let key = SessionKey::local_tui();
        let session = agent.sessions.get_or_create(&key, "user".into(), None);
        let err = agent.process_message(&session, "loop").await.unwrap_err();
        assert!(err.to_string().contains("max tool iterations"));
    }

    #[tokio::test]
    async fn tool_execution_failure_is_surfaced_to_llm() {
        let script = vec![
            tool_call("call_1", "missing_tool"),
            ChatResponse {
                content: Some("done".into()),
                tool_calls: vec![],
                usage: Usage::default(),
            },
        ];
        let provider = Arc::new(ScriptedProvider::new(script));
        let agent = Agent::new(
            provider,
            AgentConfig::default(),
            SkillRegistry::new(),
            ToolRegistry::new(),
            Arc::new(AdapterRegistry::new()),
        );
        let key = SessionKey::local_tui();
        let session = agent.sessions.get_or_create(&key, "user".into(), None);
        let reply = agent.process_message(&session, "hi").await.unwrap();
        assert_eq!(reply, "done");
    }

    #[tokio::test]
    async fn subagent_runs_without_tools_and_returns_to_parent() {
        let script = vec![
            ChatResponse {
                content: None,
                tool_calls: vec![ToolCall {
                    id: "subagent_1".into(),
                    name: "run_subagent".into(),
                    arguments: serde_json::json!({
                        "task": "Compare two approaches",
                        "context": "Only use the supplied facts"
                    })
                    .to_string(),
                }],
                usage: Usage::default(),
            },
            ChatResponse {
                content: Some("isolated result".into()),
                tool_calls: vec![],
                usage: Usage::default(),
            },
            ChatResponse {
                content: Some("parent final".into()),
                tool_calls: vec![],
                usage: Usage::default(),
            },
        ];
        let provider = Arc::new(ScriptedProvider::new(script));
        let agent = test_agent(provider.clone());
        let session = agent
            .sessions
            .get_or_create(&SessionKey::local_tui(), "user".into(), None);

        let reply = agent
            .process_message(&session, "delegate this")
            .await
            .unwrap();

        assert_eq!(reply, "parent final");
        let requests = provider.requests.lock().await;
        assert_eq!(requests.len(), 3);
        assert!(
            requests[1].tools.is_none(),
            "subagent must not receive tools"
        );
        assert!(requests[1]
            .messages
            .iter()
            .any(|message| message.content.contains("Compare two approaches")));
        let parent_tools = requests[0].tools.as_ref().unwrap();
        assert!(parent_tools
            .iter()
            .any(|definition| definition.name == "run_subagent"));
    }

    #[tokio::test]
    async fn timers_are_scoped_to_the_originating_session_and_can_be_cancelled() {
        let provider = Arc::new(MockProvider {
            calls: Arc::new(AtomicUsize::new(0)),
            reply: "ok".into(),
        });
        let agent = test_agent(provider);
        let schedule = ToolCall {
            id: "schedule_1".into(),
            name: "schedule_timer".into(),
            arguments: serde_json::json!({
                "delay_seconds": 3600,
                "task": "send a reminder"
            })
            .to_string(),
        };
        let scheduled = agent.run_tool("local:tui::one", &schedule).await;
        let timer_id = serde_json::from_str::<serde_json::Value>(&scheduled).unwrap()["timer_id"]
            .as_str()
            .unwrap()
            .to_string();

        let listed = agent
            .run_tool(
                "local:tui::one",
                &ToolCall {
                    id: "list_1".into(),
                    name: "list_timers".into(),
                    arguments: "{}".into(),
                },
            )
            .await;
        assert!(listed.contains(&timer_id));

        let cancel = ToolCall {
            id: "cancel_1".into(),
            name: "cancel_timer".into(),
            arguments: serde_json::json!({ "timer_id": timer_id }).to_string(),
        };
        let rejected = agent.run_tool("local:tui::two", &cancel).await;
        assert!(rejected.contains("not found in the current session"));
        let cancelled = agent.run_tool("local:tui::one", &cancel).await;
        assert!(cancelled.contains("cancelled"));
        agent.shutdown().await;
    }

    #[tokio::test]
    async fn due_timer_reenters_the_original_session() {
        let script = vec![
            ChatResponse {
                content: None,
                tool_calls: vec![ToolCall {
                    id: "schedule_now".into(),
                    name: "schedule_timer".into(),
                    arguments: serde_json::json!({
                        "delay_seconds": 0,
                        "task": "perform the due task"
                    })
                    .to_string(),
                }],
                usage: Usage::default(),
            },
            ChatResponse {
                content: Some("timer scheduled".into()),
                tool_calls: vec![],
                usage: Usage::default(),
            },
            ChatResponse {
                content: Some("timer completed".into()),
                tool_calls: vec![],
                usage: Usage::default(),
            },
        ];
        let provider = Arc::new(ScriptedProvider::new(script));
        let agent = Arc::new(test_agent(provider.clone()));
        agent.start_orchestration_task();
        let session = agent
            .sessions
            .get_or_create(&SessionKey::local_tui(), "user".into(), None);

        let reply = agent
            .process_message(&session, "remind me now")
            .await
            .unwrap();
        assert_eq!(reply, "timer scheduled");
        tokio::time::timeout(std::time::Duration::from_secs(2), async {
            loop {
                if provider.call_count() == 3 {
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            }
        })
        .await
        .expect("due timer should invoke the agent");

        let history = session.history.lock().await;
        assert_eq!(history.len(), 4);
        assert!(history[2].content.starts_with("<timer_event>"));
        assert_eq!(history[3].content, "timer completed");
        drop(history);
        agent.shutdown().await;
    }
}
