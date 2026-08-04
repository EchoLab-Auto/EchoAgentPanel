//! `/help` — list available commands.

use async_trait::async_trait;
use echo_core::Event;
use echo_server::{Context, HandleResult, Handler};

#[derive(Debug, Clone)]
pub struct HelpHandler {
    prefix: String,
}

impl HelpHandler {
    pub fn new(prefix: &str) -> Self {
        Self {
            prefix: prefix.to_string(),
        }
    }
}

#[async_trait]
impl Handler for HelpHandler {
    fn name(&self) -> &str {
        "help"
    }

    async fn handle(&self, ctx: &Context, event: &Event) -> HandleResult {
        let Some(msg) = event.as_message() else {
            return HandleResult::Pass;
        };
        if super::parse_command(&msg.plain_text(), &self.prefix, "help").is_none() {
            return HandleResult::Pass;
        }

        let help = format!(
            "EchoAgentPanel 命令列表:\n{}echo <文本> — 复读文本\n{}help — 显示本帮助\n{}status — 运行状态 (仅管理员)\n{}shutdown — 关闭机器人 (仅管理员)",
            self.prefix, self.prefix, self.prefix, self.prefix
        );
        let _ = ctx.reply_to(msg, help).await;
        HandleResult::Handled
    }
}
