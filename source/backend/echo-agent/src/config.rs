//! Agent configuration.

use serde::{Deserialize, Serialize};

/// A named LLM API profile (multi-API storage, switchable from the TUI).
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct ApiProfile {
    /// 配置名，如 "openai-main" / "deepseek"。
    pub name: String,
    pub provider: String,
    pub model: String,
    pub base_url: String,
    #[serde(default)]
    pub api_key: String,
}

impl ApiProfile {
    pub fn new(name: impl Into<String>, provider: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            provider: provider.into(),
            model: model.into(),
            base_url: String::new(),
            api_key: String::new(),
        }
    }
}

/// Configuration for the agent framework (the `[agent]` TOML section).
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct AgentConfig {
    /// 顶层默认 provider / model / base_url / api_key（active_api 为空时生效）。
    pub provider: String,
    pub model: String,
    pub base_url: String,
    #[serde(skip_serializing, default)]
    pub api_key: String,
    /// 多 API 配置列表。
    pub api_profiles: Vec<ApiProfile>,
    /// 当前激活的 profile 名；为空使用顶层字段。
    pub active_api: String,
    /// System prompt describing the bot's personality and rules.
    pub system_prompt: String,
    /// Maximum number of tool-call iterations in one agent turn.
    pub max_tool_iterations: usize,
    /// Directory containing `SKILL.md` definitions.
    pub skills_dir: String,
    /// Maximum conversation messages kept per session.
    pub memory_limit: usize,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            // 默认 API 配置为空，由用户通过 TUI /api 或配置文件提供。
            provider: String::new(),
            model: String::new(),
            base_url: String::new(),
            api_key: String::new(),
            api_profiles: Vec::new(),
            active_api: String::new(),
            system_prompt: "You are a helpful assistant. Respond concisely and clearly.".into(),
            max_tool_iterations: 5,
            skills_dir: "skills".into(),
            memory_limit: 40,
        }
    }
}

impl AgentConfig {
    /// 激活的 profile（`active_api` 命中的那个）。
    pub fn active_profile(&self) -> Option<&ApiProfile> {
        if self.active_api.is_empty() {
            return None;
        }
        self.api_profiles.iter().find(|p| p.name == self.active_api)
    }

    /// 将激活 profile 的值合入顶层字段。只有非空值才会覆盖顶层。
    pub fn apply_active_profile(&mut self) {
        let Some(p) = self.active_profile().cloned() else { return };
        if !p.provider.is_empty() { self.provider = p.provider; }
        if !p.model.is_empty() { self.model = p.model; }
        if !p.base_url.is_empty() { self.base_url = p.base_url; }
        if !p.api_key.is_empty() { self.api_key = p.api_key; }
    }

    /// Resolve the effective API key: explicit config, then env var by provider.
    pub fn effective_api_key(&self) -> String {
        if !self.api_key.is_empty() {
            return self.api_key.clone();
        }
        let env_var = match self.provider.as_str() {
            "anthropic" | "claude" => "ANTHROPIC_API_KEY",
            "deepseek" => "DEEPSEEK_API_KEY",
            "ollama" => "",
            _ => "OPENAI_API_KEY",
        };
        if env_var.is_empty() {
            String::new()
        } else {
            std::env::var(env_var).unwrap_or_else(|_| {
                // deepseek 也允许用通用的 OPENAI_API_KEY
                if env_var == "DEEPSEEK_API_KEY" {
                    std::env::var("OPENAI_API_KEY").unwrap_or_default()
                } else {
                    String::new()
                }
            })
        }
    }

    /// Effective base URL, falling back to the provider default.
    pub fn effective_base_url(&self) -> String {
        if !self.base_url.is_empty() {
            return self.base_url.clone();
        }
        match self.provider.as_str() {
            "anthropic" | "claude" => "https://api.anthropic.com".into(),
            "deepseek" => "https://api.deepseek.com".into(),
            "ollama" => "http://localhost:11434".into(),
            _ => "https://api.openai.com/v1".into(),
        }
    }
}
