//! 日志查看接口：读取 Panel / Core 的 systemd user 日志。

use std::process::Command;

use axum::http::header::CONTENT_TYPE;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

/// `GET /api/logs/panel` — 最近的 Panel 日志。
pub async fn panel_logs() -> Response {
    let text = tokio::task::spawn_blocking(|| {
        read_journal(&["echo-agent-panel-fixed", "echo-agent-panel"])
            .unwrap_or_else(|| "（未找到 Panel 日志，可能是前台进程启动）".to_string())
    })
    .await
    .unwrap_or_else(|_| "（日志读取线程异常）".to_string());
    text_response(text)
}

/// `GET /api/logs/core` — 最近的 Core 日志。
pub async fn core_logs() -> Response {
    let text = tokio::task::spawn_blocking(|| {
        read_journal(&["echo-agent-core-fixed", "echo-agent-core"])
            .unwrap_or_else(|| "（未找到 Core systemd 日志）".to_string())
    })
    .await
    .unwrap_or_else(|_| "（日志读取线程异常）".to_string());
    text_response(text)
}

fn read_journal(units: &[&str]) -> Option<String> {
    for unit in units {
        let output = Command::new("journalctl")
            .args(["--user", "-u", unit, "-n", "300", "--no-pager", "-q"])
            .output()
            .ok()?;
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if !stdout.trim().is_empty() {
                return Some(stdout.to_string());
            }
        }
    }
    None
}

fn text_response(text: String) -> Response {
    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(axum::body::Body::from(text))
        .unwrap_or_else(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(CONTENT_TYPE, "text/plain; charset=utf-8")],
                "internal error",
            )
                .into_response()
        })
}
