//! 日志查看接口：读取 Panel / Core 的 systemd user 日志。

use std::process::Command;

use axum::extract::Query;
use axum::http::header::CONTENT_TYPE;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Deserialize;

/// 默认返回最近 300 行；`?lines=N` 可增量控制传输量（前端日志视图默认 100）。
const DEFAULT_LINES: u32 = 300;
const MAX_LINES: u32 = 2000;

#[derive(Debug, Default, Deserialize)]
pub struct LinesQuery {
    lines: Option<u32>,
}

fn clamp_lines(query: &LinesQuery) -> u32 {
    query.lines.unwrap_or(DEFAULT_LINES).clamp(50, MAX_LINES)
}

/// `GET /api/logs/panel?lines=N` — 最近的 Panel 日志。
pub async fn panel_logs(Query(query): Query<LinesQuery>) -> Response {
    let n = clamp_lines(&query);
    let text = tokio::task::spawn_blocking(move || {
        read_journal(&["echo-agent-panel-fixed", "echo-agent-panel"], n)
            .unwrap_or_else(|| "（未找到 Panel 日志，可能是前台进程启动）".to_string())
    })
    .await
    .unwrap_or_else(|_| "（日志读取线程异常）".to_string());
    text_response(text)
}

/// `GET /api/logs/core?lines=N` — 最近的 Core 日志。
pub async fn core_logs(Query(query): Query<LinesQuery>) -> Response {
    let n = clamp_lines(&query);
    let text = tokio::task::spawn_blocking(move || {
        read_journal(&["echo-agent-core-fixed", "echo-agent-core"], n)
            .unwrap_or_else(|| "（未找到 Core systemd 日志）".to_string())
    })
    .await
    .unwrap_or_else(|_| "（日志读取线程异常）".to_string());
    text_response(text)
}

fn read_journal(units: &[&str], lines: u32) -> Option<String> {
    for unit in units {
        let output = Command::new("journalctl")
            .args(["--user", "-u", unit, "-n", &lines.to_string(), "--no-pager", "-q"])
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
