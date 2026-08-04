//! OneBot v11 actions (API calls) and their responses.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// An API request sent to the OneBot implementation.
///
/// Serialized as `{"action": "...", "params": {...}, "echo": "..."}`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiRequest {
    pub action: String,
    #[serde(default)]
    pub params: Value,
    /// Correlation id; the implementation echoes it back in the response.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub echo: Option<String>,
}

impl ApiRequest {
    pub fn new(action: impl Into<String>, params: Value) -> Self {
        Self {
            action: action.into(),
            params,
            echo: None,
        }
    }
}

/// The implementation's response, correlated with the request via `echo`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ApiResponse {
    /// `ok` or `failed`。部分实现只发 retcode，缺省时按 retcode==0 推导。
    #[serde(default)]
    pub status: String,
    /// 0 for success; other values are implementation-specific errors.
    #[serde(default)]
    pub retcode: i32,
    #[serde(default)]
    pub data: Value,
    #[serde(default)]
    pub echo: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub wording: Option<String>,
}

impl ApiResponse {
    pub fn is_ok(&self) -> bool {
        self.status == "ok" || self.retcode == 0
    }

    /// Human-readable error description if the call failed.
    pub fn error_message(&self) -> Option<String> {
        self.message.clone().or_else(|| self.wording.clone())
    }
}

/// Typed builders for common OneBot v11 actions.
pub mod actions {
    use super::ApiRequest;
    use serde_json::{json, Value};

    /// Send a message to a private chat.
    pub fn send_private_msg(user_id: i64, message: Vec<crate::segment::Segment>) -> ApiRequest {
        ApiRequest::new(
            "send_private_msg",
            json!({ "user_id": user_id, "message": message }),
        )
    }

    /// Send a message to a group.
    pub fn send_group_msg(group_id: i64, message: Vec<crate::segment::Segment>) -> ApiRequest {
        ApiRequest::new(
            "send_group_msg",
            json!({ "group_id": group_id, "message": message }),
        )
    }

    /// Send a message to either a group or a private chat.
    pub fn send_msg(message_type: &str, target_id: i64, message: Vec<crate::segment::Segment>) -> ApiRequest {
        let params = if message_type == "group" {
            json!({ "message_type": "group", "group_id": target_id, "message": message })
        } else {
            json!({ "message_type": "private", "user_id": target_id, "message": message })
        };
        ApiRequest::new("send_msg", params)
    }

    /// Recall a message.
    pub fn delete_msg(message_id: i64) -> ApiRequest {
        ApiRequest::new("delete_msg", json!({ "message_id": message_id }))
    }

    /// Send a group message built from node segments (forward chain).
    pub fn send_group_forward_msg(group_id: i64, nodes: Vec<Value>) -> ApiRequest {
        ApiRequest::new("send_group_forward_msg", json!({ "group_id": group_id, "messages": nodes }))
    }

    /// Info about the logged-in bot account.
    pub fn get_login_info() -> ApiRequest {
        ApiRequest::new("get_login_info", json!({}))
    }

    pub fn get_group_info(group_id: i64) -> ApiRequest {
        ApiRequest::new("get_group_info", json!({ "group_id": group_id }))
    }

    /// List all groups the bot has joined.
    pub fn get_group_list() -> ApiRequest {
        ApiRequest::new("get_group_list", json!({}))
    }

    pub fn get_group_member_info(group_id: i64, user_id: i64) -> ApiRequest {
        ApiRequest::new(
            "get_group_member_info",
            json!({ "group_id": group_id, "user_id": user_id }),
        )
    }

    pub fn set_group_kick(group_id: i64, user_id: i64, reject_add_request: bool) -> ApiRequest {
        ApiRequest::new(
            "set_group_kick",
            json!({ "group_id": group_id, "user_id": user_id, "reject_add_request": reject_add_request }),
        )
    }

    pub fn set_group_ban(group_id: i64, user_id: i64, duration: i64) -> ApiRequest {
        ApiRequest::new(
            "set_group_ban",
            json!({ "group_id": group_id, "user_id": user_id, "duration": duration }),
        )
    }

    pub fn set_group_card(group_id: i64, user_id: i64, card: &str) -> ApiRequest {
        ApiRequest::new(
            "set_group_card",
            json!({ "group_id": group_id, "user_id": user_id, "card": card }),
        )
    }

    pub fn get_friend_list() -> ApiRequest {
        ApiRequest::new("get_friend_list", json!({}))
    }

    /// Implementation version info (`impl`, `version`, `onebot_version`).
    pub fn get_version() -> ApiRequest {
        ApiRequest::new("get_version", json!({}))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Segment;

    #[test]
    fn request_serialization() {
        let req = actions::send_group_msg(
            30001,
            vec![Segment::at("20001"), Segment::text("hi")],
        );
        let json = serde_json::to_value(&req).unwrap();
        assert_eq!(json["action"], "send_group_msg");
        assert_eq!(json["params"]["group_id"], 30001);
        assert_eq!(json["params"]["message"][0]["type"], "at");
        assert!(json.get("echo").is_none());

        let mut req = req;
        req.echo = Some("abc".into());
        let json = serde_json::to_value(&req).unwrap();
        assert_eq!(json["echo"], "abc");
    }

    #[test]
    fn response_parsing() {
        let resp: ApiResponse = serde_json::from_str(
            r#"{"status":"ok","retcode":0,"data":{"message_id":123},"echo":"abc"}"#,
        )
        .unwrap();
        assert!(resp.is_ok());
        assert_eq!(resp.echo.as_deref(), Some("abc"));
        assert_eq!(resp.data["message_id"], 123);

        let failed: ApiResponse = serde_json::from_str(
            r#"{"status":"failed","retcode":100,"data":null,"message":"bad"}"#,
        )
        .unwrap();
        assert!(!failed.is_ok());
        assert_eq!(failed.error_message().as_deref(), Some("bad"));
    }
}
