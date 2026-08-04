//! Owner-only admin commands: `/status` and `/shutdown`.

use async_trait::async_trait;
use echo_core::Event;
use echo_server::{ConnectionTracker, Context, HandleResult, Handler};
use tokio::sync::watch;

#[derive(Debug)]
pub struct AdminHandler {
    prefix: String,
    owner_qq: i64,
    shutdown_tx: watch::Sender<bool>,
    tracker: ConnectionTracker,
    started_at: std::time::Instant,
}

impl AdminHandler {
    pub fn new(
        prefix: &str,
        owner_qq: i64,
        shutdown_tx: watch::Sender<bool>,
        tracker: ConnectionTracker,
    ) -> Self {
        Self {
            prefix: prefix.to_string(),
            owner_qq,
            shutdown_tx,
            tracker,
            started_at: std::time::Instant::now(),
        }
    }

    fn is_owner(&self, user_id: i64) -> bool {
        self.owner_qq > 0 && user_id == self.owner_qq
    }
}

#[async_trait]
impl Handler for AdminHandler {
    fn name(&self) -> &str {
        "admin"
    }

    async fn handle(&self, ctx: &Context, event: &Event) -> HandleResult {
        let Some(msg) = event.as_message() else {
            return HandleResult::Pass;
        };
        let text = msg.plain_text();
        let is_status = super::parse_command(&text, &self.prefix, "status").is_some();
        let is_shutdown = super::parse_command(&text, &self.prefix, "shutdown").is_some();
        if !is_status && !is_shutdown {
            return HandleResult::Pass;
        }

        if !self.is_owner(msg.user_id()) {
            let _ = ctx.reply_to(msg, "该命令仅限管理员使用").await;
            return HandleResult::Handled;
        }

        if is_shutdown {
            let _ = ctx.reply_to(msg, "正在关闭…").await;
            let _ = self.shutdown_tx.send(true);
        } else {
            let connections = self.tracker.connections();
            let status = format!(
                "运行状态\n- 机器人 QQ: {}\n- 连接数: {}\n- 累计事件: {}\n- 运行时长: {}s",
                ctx.self_id,
                connections.len(),
                self.tracker.total_events(),
                self.started_at.elapsed().as_secs()
            );
            let _ = ctx.reply_to(msg, status).await;
        }
        HandleResult::Handled
    }
}
