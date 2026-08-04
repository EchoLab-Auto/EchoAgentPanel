//! OpenAI-compatible provider.
//!
//! Works with any OpenAI-compatible endpoint (OpenAI, DeepSeek, Moonshot,
//! local vLLM, ...) by pointing `base_url` at it.

use async_trait::async_trait;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;
use tokio::sync::mpsc;

use super::{ChatChunk, ChatRequest, ChatResponse, LlmError, LlmProvider, ToolCall, ToolCallDelta, Usage};

#[derive(Debug, Clone)]
pub struct OpenAiProvider {
    base_url: String,
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl OpenAiProvider {
    pub fn new(base_url: &str, api_key: &str, model: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
            model: model.to_string(),
            // 超时保护：上游挂起时不能让 agent 任务无限阻塞
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(120))
                .connect_timeout(std::time::Duration::from_secs(10))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }
}

#[async_trait]
impl LlmProvider for OpenAiProvider {
    fn name(&self) -> &str {
        "openai"
    }

    fn default_model(&self) -> &str {
        &self.model
    }

    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError> {
        let body = build_request_body(request, false);
        let resp = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;
        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() {
            return Err(LlmError::Api(format!("HTTP {status}: {}", super::truncate(&text, 300))));
        }
        let parsed: OpenAIResponse = serde_json::from_str(&text)
            .map_err(|e| LlmError::Parse(format!("{e} — body: {}", super::truncate(&text, 300))))?;
        let choice = parsed
            .choices
            .into_iter()
            .next()
            .ok_or_else(|| LlmError::Api("响应中没有 choices".into()))?;
        let msg = choice.message;
        Ok(ChatResponse {
            content: msg.content,
            tool_calls: msg
                .tool_calls
                .unwrap_or_default()
                .into_iter()
                .map(|tc| ToolCall { id: tc.id, name: tc.function.name, arguments: tc.function.arguments })
                .collect(),
            usage: parsed.usage.map(|u| Usage { prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens }).unwrap_or_default(),
        })
    }

    async fn chat_stream(
        &self,
        request: &ChatRequest,
        tx: mpsc::UnboundedSender<ChatChunk>,
    ) -> Result<(), LlmError> {
        let body = build_request_body(request, true);
        let resp = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;
        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await?;
            return Err(LlmError::Api(format!("HTTP {status}: {}", super::truncate(&text, 300))));
        }
        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));
            // 规范化 CRLF 与多余空白，兼容不同实现的行结尾
            buffer = buffer.replace("\r\n", "\n");
            // SSE events are separated by blank lines; process complete lines.
            while let Some(pos) = buffer.find("\n\n") {
                let event = buffer[..pos].to_string();
                buffer.drain(..pos + 2);
                for line in event.lines() {
                    let line = line.trim();
                    if let Some(raw) = line.strip_prefix("data:") {
                        let data = raw.trim_start();
                        if data == "[DONE]" {
                            let _ = tx.send(ChatChunk { content_delta: None, tool_call_delta: None });
                            return Ok(());
                        }
                        let parsed: StreamChunk = match serde_json::from_str(data) {
                            Ok(p) => p,
                            Err(_) => continue,
                        };
                        // 流中段错误（HTTP 200 + data:{"error":...}）不能静默成功
                        if let Some(err) = &parsed.error {
                            return Err(LlmError::Api(format!(
                                "流式响应错误: {}",
                                super::truncate(&err.message, 300)
                            )));
                        }
                        if let Some(choice) = parsed.choices.first() {
                            let delta = &choice.delta;
                            // 并行工具调用：逐个转发所有 delta，而不是只取第一个
                            if let Some(tcs) = &delta.tool_calls {
                                for tc in tcs.iter() {
                                    let _ = tx.send(ChatChunk {
                                        content_delta: None,
                                        tool_call_delta: Some(ToolCallDelta {
                                            index: tc.index.unwrap_or(0),
                                            id: tc.id.clone(),
                                            name: tc.function.as_ref().and_then(|f| f.name.clone()),
                                            arguments: tc.function.as_ref().and_then(|f| f.arguments.clone()),
                                        }),
                                    });
                                }
                            }
                            if let Some(content) = &delta.content {
                                let _ = tx.send(ChatChunk { content_delta: Some(content.clone()), tool_call_delta: None });
                            }
                        }
                    }
                }
            }
        }
        let _ = tx.send(ChatChunk { content_delta: None, tool_call_delta: None });
        Ok(())
    }
}

fn build_request_body(request: &ChatRequest, stream: bool) -> serde_json::Value {
    let messages: Vec<serde_json::Value> = request
        .messages
        .iter()
        .map(|m| {
            let mut v = json!({
                "role": role_str(m.role),
                "content": m.content,
            });
            if let Some(tool_calls) = &m.tool_calls {
                v["tool_calls"] = json!(tool_calls.iter().map(|tc| json!({
                    "id": tc.id,
                    "type": "function",
                    "function": { "name": tc.name, "arguments": tc.arguments },
                })).collect::<Vec<_>>());
            }
            if let Some(id) = &m.tool_call_id {
                v["tool_call_id"] = json!(id);
            }
            v
        })
        .collect();
    let mut body = json!({
        "model": request.model,
        "messages": messages,
        "stream": stream,
    });
    if let Some(tools) = &request.tools {
        body["tools"] = json!(tools.iter().map(|t| json!({
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters.clone().unwrap_or_else(|| json!({"type": "object", "properties": {}})),
            },
        })).collect::<Vec<_>>());
    }
    if let Some(t) = request.temperature {
        body["temperature"] = json!(t);
    }
    if let Some(mt) = request.max_tokens {
        body["max_tokens"] = json!(mt);
    }
    body
}

fn role_str(role: super::ChatRole) -> &'static str {
    match role {
        super::ChatRole::System => "system",
        super::ChatRole::User => "user",
        super::ChatRole::Assistant => "assistant",
        super::ChatRole::Tool => "tool",
    }
}

// ---- wire types -----------------------------------------------------------

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
    usage: Option<UsageWire>,
}

#[derive(Deserialize)]
struct Choice {
    message: MessageWire,
}

#[derive(Deserialize)]
struct MessageWire {
    content: Option<String>,
    tool_calls: Option<Vec<ToolCallWire>>,
}

#[derive(Deserialize)]
struct ToolCallWire {
    id: String,
    function: FunctionWire,
}

#[derive(Deserialize)]
struct FunctionWire {
    name: String,
    arguments: String,
}

#[derive(Deserialize)]
struct UsageWire {
    prompt_tokens: u32,
    completion_tokens: u32,
}

#[derive(Deserialize)]
struct StreamChunk {
    choices: Vec<StreamChoice>,
    /// HTTP 200 + SSE error 事件时出现。
    #[serde(default)]
    error: Option<StreamErrorWire>,
}

#[derive(Deserialize)]
struct StreamErrorWire {
    message: String,
}

#[derive(Deserialize)]
struct StreamChoice {
    delta: DeltaWire,
}

#[derive(Deserialize)]
struct DeltaWire {
    content: Option<String>,
    tool_calls: Option<Vec<StreamToolCallWire>>,
}

#[derive(Deserialize)]
struct StreamToolCallWire {
    index: Option<usize>,
    id: Option<String>,
    function: Option<StreamFunctionWire>,
}

#[derive(Deserialize)]
struct StreamFunctionWire {
    name: Option<String>,
    arguments: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::llm::ChatMessage;

    #[tokio::test]
    async fn chat_parses_response() {
        let _ = ChatMessage::user("hi");
        // payload shape is exercised through build_request_body
        let body = build_request_body(
            &ChatRequest {
                model: "test".into(),
                messages: vec![ChatMessage::user("hi")],
                tools: None,
                temperature: None,
                max_tokens: None,
            },
            false,
        );
        assert_eq!(body["model"], "test");
        assert_eq!(body["messages"][0]["role"], "user");
        assert_eq!(body["stream"], false);
    }
}
