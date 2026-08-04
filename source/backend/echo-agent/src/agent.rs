//! The agent loop: LLM + tools + skills + memory composed into one reply.

use std::sync::Arc;

use anyhow::{anyhow, Result};
use tokio::sync::{Mutex, RwLock};

use echo_adapter::AdapterRegistry;

use crate::bridge::BackendHandle;
use crate::command::BackendCommand;
use crate::config::{AgentConfig, ApiProfile};
use crate::event::{AdapterStatus, BackendEvent};
use crate::llm::{ChatMessage, ChatRequest, LlmProvider, ToolCall};
use crate::session::{Session, SessionKey, SessionManager};
use crate::skill::SkillRegistry;
use crate::tool::ToolRegistry;

/// The agent: owns provider, tools, skills, sessions, adapters, and emits events.
pub struct Agent {
    provider: RwLock<Arc<dyn LlmProvider>>,
    config: RwLock<AgentConfig>,
    active_model: RwLock<String>,
    /// TOML config file to persist `[agent]` changes to (optional).
    config_path: std::sync::Mutex<Option<std::path::PathBuf>>,
    pub tools: Arc<ToolRegistry>,
    pub skills: Arc<Mutex<SkillRegistry>>,
    pub sessions: SessionManager,
    /// Platform adapters managed externally (registered by main / config).
    pub adapters: Arc<AdapterRegistry>,
    pub handle: std::sync::RwLock<Option<Arc<BackendHandle>>>,
    system_prompt_cache: RwLock<Option<String>>,
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
        let agent = Self {
            provider: RwLock::new(provider),
            config: RwLock::new(config),
            active_model: RwLock::new(String::new()),
            config_path: std::sync::Mutex::new(None),
            tools: Arc::new(tools),
            skills: Arc::new(Mutex::new(skills)),
            sessions,
            adapters,
            handle: std::sync::RwLock::new(None),
            system_prompt_cache: RwLock::new(None),
        };
        // Spawn periodic session eviction (every 5 minutes).
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
            loop {
                interval.tick().await;
                eviction_sessions.evict_idle();
            }
        });
        agent
    }

    /// Set the TOML config file that `[agent]` changes are persisted to.
    pub fn set_config_path(&self, path: impl Into<std::path::PathBuf>) {
        let p: std::path::PathBuf = path.into();
        // Also set session persistence path (in same directory).
        let sessions_path = p.with_file_name("echo-sessions.json");
        self.sessions.set_persist_path(sessions_path);
        *self.config_path.lock().expect("config path poisoned") = Some(p);
    }

    /// Load persisted sessions from disk.
    pub async fn load_sessions(&self) -> usize {
        self.sessions.load_from_file().await
    }

    /// Spawn a periodic session save task.
    pub fn start_session_save_task(self: &Arc<Self>) {
        let agent = Arc::clone(self);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                agent.sessions.maybe_save().await;
            }
        });
    }

    pub fn attach(&self, handle: Arc<BackendHandle>) {
        *self.handle.write().expect("handle poisoned") = Some(handle);
    }

    /// Non-blocking poll for a frontend command (used by the command pump).
    pub fn try_recv_command(&self) -> Option<BackendCommand> {
        self.handle
            .read()
            .expect("handle poisoned")
            .as_ref()
            .and_then(|h| h.try_recv_command())
    }

    /// Emit an event to subscribers (TUI, ...). No-op when unattached.
    pub fn emit(&self, event: BackendEvent) {
        if let Some(h) = self.handle.read().expect("handle poisoned").as_ref() {
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
        self.emit(BackendEvent::AgentThinking { session_id: session_id.clone() });

        let system_prompt = self.build_system_prompt(content).await;

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

        let tools = self.tools.definitions();
        // max_tool_iterations == 0 still allows one direct reply (without tools).
        let max_iterations = self.config.read().await.max_tool_iterations.max(1);

        for _ in 0..max_iterations {
            let model = self.active_model().await;
            self.emit(BackendEvent::LlmRequest { session_id: session_id.clone(), model: model.clone() });
            let request = ChatRequest {
                model: model.clone(),
                messages: messages.clone(),
                tools: Some((*tools).clone()),
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
                    session.history.lock().await.push(ChatMessage::assistant(reply.clone()));
                }
                self.sessions.mark_dirty();
                return Ok(reply);
            }

            // LLM wants tools — execute them and continue the loop.
            messages.push(assistant_with_tool_calls(&response.tool_calls, &response.content));
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
        let args = serde_json::from_str(&call.arguments)
            .unwrap_or_else(|_| serde_json::Value::Null);
        let result = match self.tools.execute(&call.name, args).await {
            Ok(r) => r,
            Err(e) => format!("error: {}", e),
        };
        self.emit(BackendEvent::ToolResult {
            session_id: session_id.to_string(),
            tool_name: call.name.clone(),
            result: result.clone(),
        });
        result
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

    /// Apply a frontend command (from the TUI).
    pub async fn apply_command(&self, cmd: BackendCommand) {
        match cmd {
            BackendCommand::SwitchModel { model } => {
                self.set_model(model.clone()).await;
                self.emit(BackendEvent::Error {
                    session_id: None,
                    message: format!("switched model: {model}"),
                });
            }
            BackendCommand::SwitchProvider { provider } => {
                let mut config = self.config.write().await;
                let old_provider = config.provider.clone();
                config.provider = provider.clone();
                let cfg = config.clone();
                drop(config);
                if self.rebuild_provider(&cfg).await {
                    let model = cfg.model.clone();
                    let base_url = cfg.effective_base_url();
                    let key_set = !cfg.effective_api_key().is_empty();
                    self.set_model(model).await;
                    self.emit_api_config().await;
                    self.persist_config(&cfg).await;
                    self.emit(BackendEvent::Error {
                        session_id: None,
                        message: format!(
                            "switched provider: {provider} ({base_url}, key: {})",
                            if key_set { "***" } else { "not set" }
                        ),
                    });
                } else {
                    let mut config = self.config.write().await;
                    config.provider = old_provider;
                }
            }
            BackendCommand::SetSystemPrompt { prompt } => {
                self.config.write().await.system_prompt = prompt.clone();
                *self.system_prompt_cache.write().await = None;
                self.emit(BackendEvent::Error {
                    session_id: None,
                    message: "system prompt updated".into(),
                });
            }
            BackendCommand::ToggleSkill { name, enabled } => {
                let mut skills = self.skills.lock().await;
                let ok = skills.set_enabled(&name, enabled);
                *self.system_prompt_cache.write().await = None;
                self.emit(BackendEvent::Error {
                    session_id: None,
                    message: if ok {
                        format!("skill {name} {}", if enabled { "enabled" } else { "disabled" })
                    } else {
                        format!("skill {name} not found")
                    },
                });
            }
            BackendCommand::UpdateApiConfig { name, provider, model, base_url, api_key } => {
                self.update_api_config(name, provider, model, base_url, api_key).await;
            }
            BackendCommand::SwitchApi { name } => {
                self.switch_api(&name).await;
            }
            BackendCommand::DeleteApi { name } => {
                self.delete_api(&name).await;
            }
            BackendCommand::RequestState => {
                self.emit_api_config().await;
                for s in self.sessions.all() {
                    let last = s.history.lock().await.last().cloned().map(|m| m.content).unwrap_or_default();
                    self.emit(BackendEvent::SessionUpdated { session: s.info(last) });
                }
                // Also emit adapter status.
                self.emit_adapter_list();
            }
            BackendCommand::ClearSession { session_id } => {
                if self.sessions.clear(&session_id).await {
                    self.emit(BackendEvent::Error {
                        session_id: Some(session_id),
                        message: "session cleared".into(),
                    });
                }
            }
            BackendCommand::SendMessage { session_id, content } => {
                // Parse or fall back to local TUI session key.
                let key = SessionKey::parse(&session_id).unwrap_or_else(SessionKey::local_tui);
                let session = self.sessions.get_or_create(&key, "local user".into(), None);
                let sid = session.id.clone();
                // Notify TUI that a session exists so it can set active_session_id.
                self.emit(BackendEvent::SessionUpdated { session: session.info(String::new()) });
                self.emit(BackendEvent::MessageReceived {
                    session_id: sid.clone(),
                    adapter_name: "local".into(),
                    platform: key.platform.clone(),
                    user_id: key.user_id.clone(),
                    user_name: "local user".into(),
                    channel: match &*key.scope {
                        "group" => format!("group:{}", key.scope_id),
                        _ => "direct".into(),
                    },
                    group_name: None,
                    content: content.clone(),
                    timestamp: chrono::Utc::now().timestamp(),
                });
                match self.process_message(&session, &content).await {
                    Ok(reply) => {
                        self.emit(BackendEvent::MessageSent { session_id: sid, content: reply });
                    }
                    Err(e) => {
                        self.emit(BackendEvent::Error {
                            session_id: Some(sid),
                            message: e.to_string(),
                        });
                    }
                }
            }
            // ---- Adapter management ----
            BackendCommand::StartAdapter { name } => {
                match self.adapters.get(&name) {
                    Some(adapter) => {
                        match adapter.start().await {
                            Ok(()) => self.emit(BackendEvent::Error {
                                session_id: None,
                                message: format!("adapter {} started", adapter.display_name()),
                            }),
                            Err(e) => self.emit(BackendEvent::Error {
                                session_id: None,
                                message: format!("adapter {} start failed: {e}", adapter.display_name()),
                            }),
                        }
                        self.emit_adapter_list();
                    }
                    None => self.emit(BackendEvent::Error {
                        session_id: None,
                        message: format!("adapter {name} not found"),
                    }),
                }
            }
            BackendCommand::StopAdapter { name } => {
                match self.adapters.get(&name) {
                    Some(adapter) => {
                        match adapter.stop().await {
                            Ok(()) => self.emit(BackendEvent::Error {
                                session_id: None,
                                message: format!("adapter {} stopped", adapter.display_name()),
                            }),
                            Err(e) => self.emit(BackendEvent::Error {
                                session_id: None,
                                message: format!("adapter {} stop failed: {e}", adapter.display_name()),
                            }),
                        }
                        self.emit_adapter_list();
                    }
                    None => self.emit(BackendEvent::Error {
                        session_id: None,
                        message: format!("adapter {name} not found"),
                    }),
                }
            }
            BackendCommand::RestartAdapter { name } => {
                match self.adapters.get(&name) {
                    Some(adapter) => {
                        match adapter.stop().await {
                            Ok(()) => match adapter.start().await {
                                Ok(()) => self.emit(BackendEvent::Error {
                                    session_id: None,
                                    message: format!("adapter {} restarted", adapter.display_name()),
                                }),
                                Err(e) => self.emit(BackendEvent::Error {
                                    session_id: None,
                                    message: format!("adapter {} restart (start) failed: {e}", adapter.display_name()),
                                }),
                            },
                            Err(e) => self.emit(BackendEvent::Error {
                                session_id: None,
                                message: format!("adapter {} restart (stop) failed: {e}", adapter.display_name()),
                            }),
                        }
                        self.emit_adapter_list();
                    }
                    None => self.emit(BackendEvent::Error {
                        session_id: None,
                        message: format!("adapter {name} not found"),
                    }),
                }
            }
            BackendCommand::RequestAdapterStatus => {
                self.emit_adapter_list();
            }
            BackendCommand::StartAllAdapters => {
                let results = self.adapters.start_all().await;
                for (name, result) in &results {
                    match result {
                        Ok(()) => self.emit(BackendEvent::Error {
                            session_id: None,
                            message: format!("adapter {name} started"),
                        }),
                        Err(e) => self.emit(BackendEvent::Error {
                            session_id: None,
                            message: format!("adapter {name}: {e}"),
                        }),
                    }
                }
                self.emit_adapter_list();
            }
            BackendCommand::StopAllAdapters => {
                self.adapters.stop_all().await;
                self.emit(BackendEvent::Error {
                    session_id: None,
                    message: "all adapters stopped".into(),
                });
                self.emit_adapter_list();
            }
            BackendCommand::UpdateQqAllowlist { user_ids, group_ids } => {
                let user_strs: Vec<String> = user_ids.iter().map(|id| id.to_string()).collect();
                let group_strs: Vec<String> = group_ids.iter().map(|id| id.to_string()).collect();
                if let Some(adapter) = self.adapters.get("qq") {
                    adapter.update_allowlist(user_strs, group_strs);
                    let (au, ag, du, dg) = adapter.get_filter_info();
                    self.emit(BackendEvent::QqFilterConfig {
                        allowlist_users: au.iter().filter_map(|s| s.parse().ok()).collect(),
                        allowlist_groups: ag.iter().filter_map(|s| s.parse().ok()).collect(),
                        denylist_users: du.iter().filter_map(|s| s.parse().ok()).collect(),
                        denylist_groups: dg.iter().filter_map(|s| s.parse().ok()).collect(),
                    });
                    self.emit(BackendEvent::Error {
                        session_id: None,
                        message: "QQ 白名单已更新".into(),
                    });
                } else {
                    self.emit(BackendEvent::Error {
                        session_id: None,
                        message: "QQ 适配器未找到".into(),
                    });
                }
            }
            BackendCommand::UpdateQqDenylist { user_ids, group_ids } => {
                let user_strs: Vec<String> = user_ids.iter().map(|id| id.to_string()).collect();
                let group_strs: Vec<String> = group_ids.iter().map(|id| id.to_string()).collect();
                if let Some(adapter) = self.adapters.get("qq") {
                    adapter.update_denylist(user_strs, group_strs);
                    let (au, ag, du, dg) = adapter.get_filter_info();
                    self.emit(BackendEvent::QqFilterConfig {
                        allowlist_users: au.iter().filter_map(|s| s.parse().ok()).collect(),
                        allowlist_groups: ag.iter().filter_map(|s| s.parse().ok()).collect(),
                        denylist_users: du.iter().filter_map(|s| s.parse().ok()).collect(),
                        denylist_groups: dg.iter().filter_map(|s| s.parse().ok()).collect(),
                    });
                    self.emit(BackendEvent::Error {
                        session_id: None,
                        message: "QQ 黑名单已更新".into(),
                    });
                } else {
                    self.emit(BackendEvent::Error {
                        session_id: None,
                        message: "QQ 适配器未找到".into(),
                    });
                }
            }
            BackendCommand::RequestQqFilterConfig => {
                if let Some(adapter) = self.adapters.get("qq") {
                    let (au, ag, du, dg) = adapter.get_filter_info();
                    self.emit(BackendEvent::QqFilterConfig {
                        allowlist_users: au.iter().filter_map(|s| s.parse().ok()).collect(),
                        allowlist_groups: ag.iter().filter_map(|s| s.parse().ok()).collect(),
                        denylist_users: du.iter().filter_map(|s| s.parse().ok()).collect(),
                        denylist_groups: dg.iter().filter_map(|s| s.parse().ok()).collect(),
                    });
                }
            }
            BackendCommand::RequestGroupList => {
                let groups = match self.adapters.get("qq") {
                    Some(adapter) => match adapter.get_groups().await {
                        Ok(groups) => {
                            let result: Vec<crate::event::GroupInfo> = groups
                                .into_iter()
                                .map(|(gid, name)| crate::event::GroupInfo {
                                    group_id: gid,
                                    group_name: name,
                                })
                                .collect();
                            result
                        }
                        Err(e) => {
                            self.emit(BackendEvent::Error {
                                session_id: None,
                                message: format!("failed to get group list: {e}"),
                            });
                            Vec::new()
                        }
                    },
                    None => {
                        self.emit(BackendEvent::Error {
                            session_id: None,
                            message: "QQ adapter not found".into(),
                        });
                        Vec::new()
                    }
                };
                if !groups.is_empty() {
                    self.emit(BackendEvent::GroupList { groups });
                }
            }
        }
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
                connected: matches!(
                    info.status,
                    echo_adapter::AdapterConnectionState::Connected
                ),
                running: !matches!(
                    info.status,
                    echo_adapter::AdapterConnectionState::Stopped
                ),
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
            if !provider.is_empty() { config.provider = provider.clone(); }
            if !model.is_empty() { config.model = model.clone(); }
            if !base_url.is_empty() { config.base_url = base_url.clone(); }
            if !keep_key { config.api_key = api_key.clone(); }
            // Don't clear active_api — let explicit SwitchApi handle that.
        } else {
            let profile = match config.api_profiles.iter_mut().find(|p| p.name == name) {
                Some(p) => p,
                None => {
                    config
                        .api_profiles
                        .push(ApiProfile::new(name.clone(), provider.clone(), model.clone()));
                    config.api_profiles.last_mut().expect("just pushed")
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

    /// Persist a config snapshot's `[agent]` section back to the TOML file.
    async fn persist_config(&self, cfg: &AgentConfig) {
        let Some(path) = self.config_path.lock().expect("config path poisoned").clone() else {
            return;
        };
        let mut root = toml::Table::new();
        let value = match toml::Value::try_from(cfg) {
            Ok(v) => v,
            Err(e) => { tracing::warn!(error = %e, "failed to serialize agent config"); return; }
        };
        root.insert("agent".into(), value);
        let new_block = match toml::to_string_pretty(&root) {
            Ok(b) => b,
            Err(e) => { tracing::warn!(error = %e, "failed to serialize agent config"); return; }
        };
        // Log serialized block for debugging.
        tracing::debug!(api_key_len = cfg.api_key.len(), "persisting agent config:\n{new_block}");
        let updated = match tokio::fs::read_to_string(&path).await {
            Ok(content) => replace_toml_section(&content, "agent", &new_block),
            Err(_) => new_block,
        };
        // Atomic write: write to .tmp then rename.
        let tmp = format!("{}.tmp", path.display());
        if let Err(e) = tokio::fs::write(&tmp, &updated).await {
            tracing::warn!(error = %e, path = %path.display(), "failed to write config tmp");
            return;
        }
        if let Err(e) = tokio::fs::rename(&tmp, &path).await {
            tracing::warn!(error = %e, path = %path.display(), "failed to rename config tmp");
            return;
        }
        tracing::info!(path = %path.display(), "agent config persisted");
    }
}

/// Replace the `[section]` block in a TOML document with `new_block`
/// (which must start with the `[section]` line). Appends if absent.
fn replace_toml_section(content: &str, section: &str, new_block: &str) -> String {
    let marker = format!("[{section}]");
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.iter().position(|l| l.trim() == marker);
    let Some(start) = start else {
        let mut out = content.trim_end().to_string();
        if !out.is_empty() {
            out.push('\n');
        }
        out.push_str(new_block);
        out.push('\n');
        return out;
    };
    // Find the end of the section.
    // `[[section.sub]]` array sub-table headers (e.g. `[[agent.api_profiles]]`)
    // still belong to this section — they get replaced as well.
    let array_sub = format!("[[{section}");
    let dotted_sub = format!("[{section}.");
    let mut end = lines.len();
    for i in (start + 1)..lines.len() {
        let t = lines[i].trim_start();
        let is_section_sub = t.starts_with(&array_sub) || t.starts_with(&dotted_sub);
        if t.starts_with('[') && !is_section_sub && t != marker {
            end = i;
            break;
        }
    }
    let mut out = String::new();
    for (i, line) in lines.iter().enumerate() {
        if i == start {
            out.push_str(new_block);
            if !new_block.ends_with('\n') {
                out.push('\n');
            }
        } else if i > start && i < end {
            // old section body — replaced
        } else {
            out.push_str(line);
            out.push('\n');
        }
    }
    out
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
        let tmp = std::env::temp_dir().join(format!("echo-agent-cfg-{}.toml", uuid::Uuid::new_v4()));
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

    #[test]
    fn toml_section_replacement() {
        let content = "\
[server]
bind_address = \"0.0.0.0:3131\"

[agent]
provider = \"openai\"
model = \"gpt-4o\"

[tui]
enabled = true
";
        let new_block = "[agent]\nprovider = \"anthropic\"\nmodel = \"claude\"\n";
        let out = super::replace_toml_section(content, "agent", new_block);
        assert!(out.contains("provider = \"anthropic\""));
        assert!(!out.contains("model = \"gpt-4o\""));
        assert!(out.contains("bind_address = \"0.0.0.0:3131\""));
        assert!(out.contains("[tui]\nenabled = true"));

        let out2 = super::replace_toml_section("[server]\nx = 1\n", "agent", new_block);
        assert!(out2.contains("[server]"));
        assert!(out2.contains("[agent]\nprovider = \"anthropic\""));
    }

    #[test]
    fn array_subtables_are_replaced_not_accumulated() {
        let content = "\
[server]
bind_address = \"0.0.0.0:3131\"

[agent]
provider = \"openai\"
model = \"gpt-4o\"

[[agent.api_profiles]]
name = \"deepseek\"
provider = \"deepseek\"
model = \"deepseek-v4-flash\"

[[agent.api_profiles]]
name = \"deepseek\"
provider = \"deepseek\"
model = \"deepseek-v4-flash\"

[bot]
owner_qq = 0
";
        let new_block = "[agent]\nprovider = \"anthropic\"\nmodel = \"claude\"\n";
        let out = super::replace_toml_section(content, "agent", new_block);
        assert_eq!(out.matches("[[agent.api_profiles]]").count(), 0, "old profile blocks must be removed");
        assert_eq!(out.matches("deepseek").count(), 0);
        assert!(out.contains("[bot]\nowner_qq = 0"));
        assert!(out.contains("bind_address = \"0.0.0.0:3131\""));
    }

    #[tokio::test]
    async fn skill_keyword_loads_instructions() {
        let mut reg = SkillRegistry::new();
        reg.register(crate::skill::Skill {
            metadata: crate::skill::SkillMetadata {
                name: "calc".into(),
                description: "d".into(),
                keywords: vec!["calc".into()],
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
}
