//! QQ-specific tools that the LLM can invoke.
//!
//! These tools delegate to `QqAdapter` for actual QQ API calls.

use std::sync::Arc;

use async_trait::async_trait;
use echo_adapter::traits::Adapter;
use echo_adapter::types::{ChannelType, MessageTarget};
use serde_json::{json, Value};

use crate::QqAdapter;

/// Register QQ tools into an echo-agent `ToolRegistry`.
///
/// Called from the binary layer (main.rs) where both echo-agent and
/// echo-adapter-qq crates are visible.
pub fn register_qq_tools(
    registry: &mut echo_agent::ToolRegistry,
    qq_adapter: Arc<QqAdapter>,
) {
    let qq = qq_adapter.clone();
    registry.register(Arc::new(QqToolWrapper {
        name: "send_group_msg".into(),
        description: "Send a text message to a QQ group. Requires group_id and content.".into(),
        parameters: json!({
            "type": "object",
            "properties": {
                "group_id": {"type": "integer", "description": "QQ group ID"},
                "content": {"type": "string", "description": "Message content"}
            },
            "required": ["group_id", "content"]
        }),
        adapter: qq,
    }));

    let qq = qq_adapter.clone();
    registry.register(Arc::new(QqToolWrapper {
        name: "send_private_msg".into(),
        description: "Send a text message to a QQ user privately. Requires user_id and content.".into(),
        parameters: json!({
            "type": "object",
            "properties": {
                "user_id": {"type": "integer", "description": "QQ user ID"},
                "content": {"type": "string", "description": "Message content"}
            },
            "required": ["user_id", "content"]
        }),
        adapter: qq,
    }));

    let qq = qq_adapter.clone();
    registry.register(Arc::new(QqToolWrapper {
        name: "get_group_member_info".into(),
        description: "Get QQ group member information. Requires group_id and user_id.".into(),
        parameters: json!({
            "type": "object",
            "properties": {
                "group_id": {"type": "integer", "description": "QQ group ID"},
                "user_id": {"type": "integer", "description": "QQ user ID"}
            },
            "required": ["group_id", "user_id"]
        }),
        adapter: qq,
    }));

    let qq = qq_adapter.clone();
    registry.register(Arc::new(QqToolWrapper {
        name: "get_group_list".into(),
        description: "List all QQ groups the bot has joined. Returns group IDs and names.".into(),
        parameters: json!({
            "type": "object",
            "properties": {}
        }),
        adapter: qq,
    }));
}

// ---------------------------------------------------------------------------
// Internal wrapper
// ---------------------------------------------------------------------------

struct QqToolWrapper {
    name: String,
    description: String,
    parameters: Value,
    adapter: Arc<QqAdapter>,
}

#[async_trait]
impl echo_agent::Tool for QqToolWrapper {
    fn name(&self) -> &str {
        &self.name
    }
    fn description(&self) -> &str {
        &self.description
    }
    fn parameters(&self) -> Value {
        self.parameters.clone()
    }
    async fn execute(&self, arguments: Value) -> Result<String, echo_agent::tool::ToolError> {
        use echo_agent::tool::ToolError;

        match self.name.as_str() {
            "send_group_msg" => {
                let group_id = arguments["group_id"]
                    .as_i64()
                    .ok_or_else(|| ToolError::InvalidArguments("group_id required".into()))?;
                let content = arguments["content"]
                    .as_str()
                    .ok_or_else(|| ToolError::InvalidArguments("content required".into()))?;
                let target = MessageTarget {
                    adapter_name: "qq".into(),
                    channel: ChannelType::Group { group_id: group_id.to_string() },
                    user_id: String::new(),
                };
                match self.adapter.send_message(&target, content).await {
                    Ok(result) => {
                        if result.success {
                            Ok(format!(
                                "group message sent, message_id={}",
                                result.message_id.as_deref().unwrap_or("?")
                            ))
                        } else {
                            Err(ToolError::Execution(
                                result.error.unwrap_or_else(|| "unknown error".into()),
                            ))
                        }
                    }
                    Err(e) => Err(ToolError::Execution(e.to_string())),
                }
            }
            "send_private_msg" => {
                let user_id = arguments["user_id"]
                    .as_i64()
                    .ok_or_else(|| ToolError::InvalidArguments("user_id required".into()))?;
                let content = arguments["content"]
                    .as_str()
                    .ok_or_else(|| ToolError::InvalidArguments("content required".into()))?;
                let target = MessageTarget {
                    adapter_name: "qq".into(),
                    channel: ChannelType::Direct,
                    user_id: user_id.to_string(),
                };
                match self.adapter.send_message(&target, content).await {
                    Ok(result) => {
                        if result.success {
                            Ok(format!(
                                "private message sent, message_id={}",
                                result.message_id.as_deref().unwrap_or("?")
                            ))
                        } else {
                            Err(ToolError::Execution(
                                result.error.unwrap_or_else(|| "unknown error".into()),
                            ))
                        }
                    }
                    Err(e) => Err(ToolError::Execution(e.to_string())),
                }
            }
            "get_group_member_info" => {
                let group_id = arguments["group_id"]
                    .as_i64()
                    .ok_or_else(|| ToolError::InvalidArguments("group_id required".into()))?;
                let user_id = arguments["user_id"]
                    .as_i64()
                    .ok_or_else(|| ToolError::InvalidArguments("user_id required".into()))?;
                match self.adapter.get_group_member_info(group_id, user_id).await {
                    Ok(info) => Ok(info),
                    Err(e) => Err(ToolError::Execution(e)),
                }
            }
            "get_group_list" => {
                match self.adapter.get_group_list().await {
                    Ok(groups) => {
                        let lines: Vec<String> = groups
                            .iter()
                            .map(|(gid, name)| format!("  {gid}: {name}"))
                            .collect();
                        if lines.is_empty() {
                            Ok("no groups joined".into())
                        } else {
                            Ok(format!("{} groups:\n{}", groups.len(), lines.join("\n")))
                        }
                    }
                    Err(e) => Err(ToolError::Execution(e)),
                }
            }
            other => Err(ToolError::Execution(format!("unknown QQ tool: {other}"))),
        }
    }
}
