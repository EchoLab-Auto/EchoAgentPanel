//! LLM provider abstraction.
//!
//! A [`LlmProvider`] wraps any chat-completion backend (OpenAI-compatible,
//! Anthropic, Ollama, ...) behind one trait with a streaming variant.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::sync::mpsc;

pub mod anthropic;
pub mod ollama;
pub mod openai;

/// Role of a message in a conversation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChatRole {
    System,
    User,
    Assistant,
    Tool,
}

/// A single message in the conversation sent to the LLM.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: ChatRole,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    /// Required for `role == Tool`: the id of the tool call being answered.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

impl ChatMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: ChatRole::System,
            content: content.into(),
            tool_calls: None,
            tool_call_id: None,
        }
    }
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: ChatRole::User,
            content: content.into(),
            tool_calls: None,
            tool_call_id: None,
        }
    }
    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: ChatRole::Assistant,
            content: content.into(),
            tool_calls: None,
            tool_call_id: None,
        }
    }
    pub fn tool(content: impl Into<String>, tool_call_id: impl Into<String>) -> Self {
        Self {
            role: ChatRole::Tool,
            content: content.into(),
            tool_calls: None,
            tool_call_id: Some(tool_call_id.into()),
        }
    }
}

/// Tool definition sent to the LLM (OpenAI function-calling format).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    /// JSON Schema for the arguments object.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<serde_json::Value>,
}

/// A tool call requested by the LLM.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    /// JSON-encoded arguments.
    pub arguments: String,
}

/// Incremental chunk of a tool call during streaming.
#[derive(Debug, Clone)]
pub struct ToolCallDelta {
    pub index: usize,
    pub id: Option<String>,
    pub name: Option<String>,
    pub arguments: Option<String>,
}

/// Streaming chunk from the LLM.
#[derive(Debug, Clone)]
pub struct ChatChunk {
    pub content_delta: Option<String>,
    pub tool_call_delta: Option<ToolCallDelta>,
}

/// Token usage reported by the provider.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
}

/// A complete (non-streaming) chat response.
#[derive(Debug, Clone)]
pub struct ChatResponse {
    pub content: Option<String>,
    pub tool_calls: Vec<ToolCall>,
    pub usage: Usage,
}

/// A chat completion request.
#[derive(Debug, Clone)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub tools: Option<Vec<ToolDefinition>>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Error)]
pub enum LlmError {
    #[error("HTTP 请求失败: {0}")]
    Http(#[from] reqwest::Error),
    #[error("API 返回错误: {0}")]
    Api(String),
    #[error("响应解析失败: {0}")]
    Parse(String),
    #[error("provider 配置错误: {0}")]
    Config(String),
    #[error("流式传输中断")]
    StreamClosed,
}

/// Abstraction over a chat-completion backend.
#[async_trait]
pub trait LlmProvider: Send + Sync {
    /// Provider display name, e.g. "openai".
    fn name(&self) -> &str;

    /// Default model for this provider.
    fn default_model(&self) -> &str;

    /// Complete a chat without streaming.
    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError>;

    /// Stream a chat response, sending chunks into `tx`. The stream ends when
    /// the channel is dropped by the consumer or the provider finishes.
    async fn chat_stream(
        &self,
        request: &ChatRequest,
        tx: mpsc::UnboundedSender<ChatChunk>,
    ) -> Result<(), LlmError>;
}

/// Char-safe truncation for error messages (avoids panicking mid-UTF-8).
pub(crate) fn truncate(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        s.to_string()
    } else {
        s.chars().take(n).collect::<String>() + "…"
    }
}

/// Build a provider from configuration.
///
/// base_url 以 `/anthropic` 结尾时（如 DeepSeek 的 Anthropic 兼容端点
/// `https://api.deepseek.com/anthropic`）自动走 Anthropic Messages 格式客户端，
/// 即使 provider 名为 openai/deepseek。
pub fn create_provider(cfg: &crate::config::AgentConfig) -> Result<Box<dyn LlmProvider>, LlmError> {
    // 空 provider = 未配置 API，按 OpenAI 兼容处理（请求会因无 key 失败，
    // 等用户在 TUI /api 中配置后生效）。
    let provider_kind = if cfg.provider.is_empty() {
        return Err(LlmError::Config(
            "no LLM provider configured — use /api in TUI or set [agent] provider in config".into(),
        ));
    } else {
        cfg.provider.as_str()
    };
    let anthropic_style = cfg.base_url.trim_end_matches('/').ends_with("/anthropic");
    match provider_kind {
        "openai" | "deepseek" if anthropic_style => {
            // DeepSeek 的 /anthropic 端点只实现 Messages API（POST /v1/messages）
            Ok(Box::new(anthropic::AnthropicProvider::new(
                &cfg.base_url,
                &cfg.api_key,
                &cfg.model,
            )))
        }
        "openai" | "deepseek" => Ok(Box::new(openai::OpenAiProvider::new(
            &cfg.base_url,
            &cfg.api_key,
            &cfg.model,
        ))),
        "anthropic" | "claude" => Ok(Box::new(anthropic::AnthropicProvider::new(
            &cfg.base_url,
            &cfg.api_key,
            &cfg.model,
        ))),
        "ollama" => Ok(Box::new(ollama::OllamaProvider::new(
            &cfg.base_url,
            &cfg.model,
        ))),
        other => Err(LlmError::Config(format!(
            "不支持的 provider: {other} (可选: openai/deepseek/anthropic/ollama)"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AgentConfig;

    fn cfg(provider: &str, base_url: &str) -> AgentConfig {
        AgentConfig {
            provider: provider.into(),
            base_url: base_url.into(),
            model: "test-model".into(),
            api_key: "test-key".into(),
            ..Default::default()
        }
    }

    #[test]
    fn deepseek_anthropic_endpoint_routes_to_anthropic_client() {
        let p = create_provider(&cfg("deepseek", "https://api.deepseek.com/anthropic")).unwrap();
        assert_eq!(p.name(), "anthropic");
    }

    #[test]
    fn deepseek_openai_endpoint_routes_to_openai_client() {
        let p = create_provider(&cfg("deepseek", "https://api.deepseek.com")).unwrap();
        assert_eq!(p.name(), "openai");
        let p = create_provider(&cfg("deepseek", "")).unwrap();
        assert_eq!(p.name(), "openai");
    }

    #[test]
    fn unknown_provider_is_config_error() {
        assert!(create_provider(&cfg("gpt-x", "")).is_err());
    }

    // ── Property tests ─────────────────────────────────────────────────────

    use proptest::prelude::Just;
    use proptest::prop_assert_eq;

    proptest::proptest! {
        /// ChatMessage JSON round-trip for any plausible message.
        #[test]
        fn chat_message_json_roundtrip(
            role in proptest::prop_oneof![
                Just(ChatRole::System),
                Just(ChatRole::User),
                Just(ChatRole::Assistant),
                Just(ChatRole::Tool),
            ],
            content in ".*",
            has_tool_call in proptest::bool::ANY,
            tool_call_id in "[a-z0-9_-]{0,20}",
        ) {
            let tool_calls = if has_tool_call {
                Some(vec![ToolCall {
                    id: "call_1".into(),
                    name: "calculator".into(),
                    arguments: "{\"expr\":\"1+1\"}".into(),
                }])
            } else {
                None
            };
            let msg = ChatMessage {
                role,
                content,
                tool_calls,
                tool_call_id: (role == ChatRole::Tool).then_some(tool_call_id),
            };
            let json = serde_json::to_string(&msg).expect("serialize");
            let back: ChatMessage = serde_json::from_str(&json).expect("deserialize");
            prop_assert_eq!(back.role, msg.role);
            prop_assert_eq!(back.content, msg.content);
            prop_assert_eq!(back.tool_calls, msg.tool_calls);
            prop_assert_eq!(back.tool_call_id, msg.tool_call_id);
        }

        /// ToolCall JSON round-trip.
        #[test]
        fn tool_call_json_roundtrip(
            id in "[a-z0-9_-]{1,20}",
            name in "[a-z0-9_]{1,20}",
            arguments in ".*",
        ) {
            let call = ToolCall { id, name, arguments };
            let json = serde_json::to_string(&call).expect("serialize");
            let back: ToolCall = serde_json::from_str(&json).expect("deserialize");
            prop_assert_eq!(back, call);
        }
    }
}
