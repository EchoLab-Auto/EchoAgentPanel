//! Anthropic Claude provider (Messages API).

use async_trait::async_trait;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;
use tokio::sync::mpsc;

use super::{ChatChunk, ChatRequest, ChatResponse, LlmError, LlmProvider, ToolCall, ToolCallDelta, Usage};

#[derive(Debug, Clone)]
pub struct AnthropicProvider {
    base_url: String,
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl AnthropicProvider {
    pub fn new(base_url: &str, api_key: &str, model: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
            model: model.to_string(),
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(120))
                .connect_timeout(std::time::Duration::from_secs(10))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }
}

#[async_trait]
impl LlmProvider for AnthropicProvider {
    fn name(&self) -> &str {
        "anthropic"
    }

    fn default_model(&self) -> &str {
        &self.model
    }

    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError> {
        let body = build_request_body(request, false);
        let resp = self
            .client
            .post(format!("{}/v1/messages", self.base_url))
            // Anthropic 官方与 DeepSeek /anthropic 端点均用 x-api-key 认证
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await?;
        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() {
            return Err(LlmError::Api(format!("HTTP {status}: {}", super::truncate(&text, 300))));
        }
        let parsed: MessagesResponse = serde_json::from_str(&text)
            .map_err(|e| LlmError::Parse(format!("{e} — body: {}", super::truncate(&text, 300))))?;
        let mut content = String::new();
        let mut tool_calls = Vec::new();
        for block in parsed.content {
            match block {
                ContentBlock::Text { text } => content.push_str(&text),
                ContentBlock::ToolUse { id, name, input } => {
                    tool_calls.push(ToolCall { id, name, arguments: input.to_string() });
                }
                // 未知块（推理模型的 thinking 等）宽容跳过
                ContentBlock::Other => {}
            }
        }
        Ok(ChatResponse {
            // 只有 tool_use 没有文本时置 None，避免助手消息带空 content 被严格端点拒绝
            content: if content.is_empty() { None } else { Some(content) },
            tool_calls,
            usage: parsed
                .usage
                .map(|u| Usage { prompt_tokens: u.input_tokens, completion_tokens: u.output_tokens })
                .unwrap_or_default(),
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
            .post(format!("{}/v1/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
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
            while let Some(pos) = buffer.find("\n\n") {
                let event = buffer[..pos].to_string();
                buffer.drain(..pos + 2);
                let mut data = None;
                for line in event.lines() {
                    let line = line.trim();
                    if let Some(d) = line.strip_prefix("data: ") {
                        data = Some(d.to_string());
                    }
                }
                let Some(data) = data else { continue };
                let parsed: StreamEvent = match serde_json::from_str(&data) {
                    Ok(p) => p,
                    Err(_) => continue,
                };
                match parsed {
                    StreamEvent::ContentBlockStart { index, content_block: Some(ContentBlockStartWire::ToolUse { id, name, .. }) } => {
                        let _ = tx.send(ChatChunk {
                            content_delta: None,
                            tool_call_delta: Some(ToolCallDelta {
                                index,
                                id: Some(id),
                                name: Some(name),
                                arguments: None,
                            }),
                        });
                    }
                    StreamEvent::ContentBlockDelta { index, delta } => {
                        match delta {
                            DeltaWire::TextDelta { text } => {
                                let _ = tx.send(ChatChunk { content_delta: Some(text), tool_call_delta: None });
                            }
                            DeltaWire::InputJsonDelta { partial_json } => {
                                let _ = tx.send(ChatChunk {
                                    content_delta: None,
                                    tool_call_delta: Some(ToolCallDelta {
                                        index,
                                        id: None,
                                        name: None,
                                        arguments: Some(partial_json),
                                    }),
                                });
                            }
                            // thinking_delta 等未知增量跳过
                            DeltaWire::Other => {}
                        }
                    }
                    // 流中段错误不能静默当作成功
                    StreamEvent::Error => {
                        return Err(LlmError::Api(format!("流式响应错误: {}", super::truncate(&data, 300))));
                    }
                    _ => {}
                }
            }
        }
        let _ = tx.send(ChatChunk { content_delta: None, tool_call_delta: None });
        Ok(())
    }
}

fn build_request_body(request: &ChatRequest, stream: bool) -> serde_json::Value {
    let system = request
        .messages
        .iter()
        .filter(|m| m.role == super::ChatRole::System)
        .map(|m| m.content.clone())
        .collect::<Vec<_>>()
        .join("\n");
    let messages: Vec<serde_json::Value> = {
        let mut out: Vec<serde_json::Value> = Vec::new();
        let mut i = 0;
        let msgs = &request.messages;
        while i < msgs.len() {
            let m = &msgs[i];
            if m.role == super::ChatRole::System { i += 1; continue; }
            if m.role == super::ChatRole::Tool {
                let mut results: Vec<serde_json::Value> = Vec::new();
                while i < msgs.len() && msgs[i].role == super::ChatRole::Tool {
                    let tm = &msgs[i];
                    results.push(json!({
                        "type": "tool_result",
                        "tool_use_id": tm.tool_call_id.clone().unwrap_or_default(),
                        "content": tm.content,
                    }));
                    i += 1;
                }
                out.push(json!({"role": "user", "content": results}));
            } else {
                out.push(match m.role {
                    super::ChatRole::User => json!({"role": "user", "content": m.content}),
                    super::ChatRole::Assistant => {
                        let has_tools = m.tool_calls.as_ref().map(|tc| !tc.is_empty()).unwrap_or(false);
                        if has_tools {
                            let mut blocks: Vec<serde_json::Value> = Vec::new();
                            if !m.content.is_empty() {
                                blocks.push(json!({"type": "text", "text": m.content}));
                            }
                            for tc in m.tool_calls.as_ref().unwrap() {
                                blocks.push(json!({
                                    "type": "tool_use",
                                    "id": tc.id,
                                    "name": tc.name,
                                    "input": serde_json::from_str::<serde_json::Value>(&tc.arguments).unwrap_or_else(|_| json!({})),
                                }));
                            }
                            json!({
                                "role": "assistant",
                                "content": blocks,
                            })
                        } else {
                            json!({"role": "assistant", "content": m.content})
                        }
                    }
                    _ => unreachable!(),
                });
                i += 1;
            }
        }
        out
    };
    let mut body = json!({
        "model": request.model,
        "messages": messages,
        "stream": stream,
    });
    if !system.is_empty() {
        body["system"] = json!(system);
    }
    if let Some(tools) = &request.tools {
        body["tools"] = json!(tools.iter().map(|t| json!({
            "name": t.name,
            "description": t.description,
            "input_schema": t.parameters.clone().unwrap_or_else(|| json!({"type": "object", "properties": {}})),
        })).collect::<Vec<_>>());
    }
    if let Some(t) = request.temperature {
        body["temperature"] = json!(t);
    }
    // Anthropic Messages API 要求 max_tokens 必填（DeepSeek /anthropic 同样）
    body["max_tokens"] = json!(request.max_tokens.unwrap_or(4096));
    body
}

// ---- wire types -----------------------------------------------------------

#[derive(Deserialize)]
struct MessagesResponse {
    content: Vec<ContentBlock>,
    usage: Option<UsageWire>,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
#[allow(dead_code)]
enum ContentBlock {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "tool_use")]
    ToolUse { id: String, name: String, input: serde_json::Value },
    /// 未知内容块（如推理模型的 thinking 块），宽容跳过
    #[serde(other)]
    Other,
}

#[derive(Deserialize)]
struct UsageWire {
    input_tokens: u32,
    output_tokens: u32,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum StreamEvent {
    ContentBlockStart { index: usize, content_block: Option<ContentBlockStartWire> },
    ContentBlockDelta { index: usize, delta: DeltaWire },
    MessageStart,
    MessageDelta,
    ContentBlockStop,
    MessageStop,
    Ping,
    Error,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
#[allow(dead_code)]
enum ContentBlockStartWire {
    Text { text: String },
    ToolUse { id: String, name: String, input: serde_json::Value },
    #[serde(other)]
    Other,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum DeltaWire {
    TextDelta { text: String },
    InputJsonDelta { partial_json: String },
    #[serde(other)]
    Other,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::llm::ChatMessage;

    #[test]
    fn parses_response_with_thinking_blocks() {
        // DeepSeek 推理模型在 Anthropic 兼容端点返回 thinking 块，
        // 必须宽容跳过而不是让整个响应解析失败
        let raw = r#"{
            "id": "msg_1",
            "type": "message",
            "role": "assistant",
            "model": "deepseek-v4-flash",
            "content": [
                {"type": "thinking", "thinking": "用户只发了一个斜杠，应该询问需求"},
                {"type": "text", "text": "你好，请问需要什么帮助？"}
            ],
            "usage": {"input_tokens": 12, "output_tokens": 18}
        }"#;
        let parsed: super::MessagesResponse = serde_json::from_str(raw).unwrap();
        let mut content = String::new();
        let mut tool_calls = Vec::new();
        for block in parsed.content {
            match block {
                super::ContentBlock::Text { text } => content.push_str(&text),
                super::ContentBlock::ToolUse { id, name, input } => {
                    tool_calls.push((id, name, input));
                }
                super::ContentBlock::Other => {}
            }
        }
        assert_eq!(content, "你好，请问需要什么帮助？");
        assert!(tool_calls.is_empty());
    }

    #[test]
    fn body_strips_system_into_top_level() {
        let body = build_request_body(
            &ChatRequest {
                model: "claude-test".into(),
                messages: vec![
                    ChatMessage::system("你是助手"),
                    ChatMessage::user("hi"),
                ],
                tools: None,
                temperature: None,
                max_tokens: None,
            },
            false,
        );
        assert_eq!(body["system"], "你是助手");
        assert_eq!(body["messages"].as_array().unwrap().len(), 1);
        assert_eq!(body["messages"][0]["role"], "user");
    }
}
