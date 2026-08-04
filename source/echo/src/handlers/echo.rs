//! `/echo <text>` — reply with the same text.

use async_trait::async_trait;
use echo_core::Event;
use echo_server::{Context, HandleResult, Handler};

#[derive(Debug, Clone)]
pub struct EchoHandler {
    prefix: String,
}

impl EchoHandler {
    pub fn new(prefix: &str) -> Self {
        Self {
            prefix: prefix.to_string(),
        }
    }
}

#[async_trait]
impl Handler for EchoHandler {
    fn name(&self) -> &str {
        "echo"
    }

    fn priority(&self) -> i32 {
        200
    }

    async fn handle(&self, ctx: &Context, event: &Event) -> HandleResult {
        let Some(msg) = event.as_message() else {
            return HandleResult::Pass;
        };
        let Some(rest) = super::parse_command(&msg.plain_text(), &self.prefix, "echo") else {
            return HandleResult::Pass;
        };

        if rest.is_empty() {
            let _ = ctx.reply_to(msg, format!("用法: {}echo <文本>", self.prefix)).await;
        } else {
            let _ = ctx.reply_to(msg, rest).await;
        }
        HandleResult::Handled
    }
}
