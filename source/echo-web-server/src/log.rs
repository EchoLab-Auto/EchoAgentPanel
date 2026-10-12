//! 日志查看接口：读取 Panel / Core 的 systemd user 日志。
//!
//! Core 日志（2026-10 SSH 接入）：`?core=<上游名>` 且该上游为 SSH 接入
//! 时，经隧道在远端执行 journalctl（不再读本机 journal——远程 Core 的
//! 日志本就不在本机）；缺省/直连上游维持本机读取（同机部署行为不变）。

use std::process::Command;

use axum::extract::{Query, State};
use axum::http::header::CONTENT_TYPE;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Deserialize;

use crate::proxy::AppState;

/// 默认返回最近 300 行；`?lines=N` 可增量控制传输量（前端日志视图默认 100）。
const DEFAULT_LINES: u32 = 300;
const MAX_LINES: u32 = 2000;

#[derive(Debug, Default, Deserialize)]
pub struct LinesQuery {
    lines: Option<u32>,
    /// 目标上游名（SSH 上游 → 远端 journalctl；其余 → 本机 journal）。
    core: Option<String>,
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

/// `GET /api/logs/core?lines=N&core=<上游名>` — 最近的 Core 日志。
pub async fn core_logs(Query(query): Query<LinesQuery>, State(state): State<AppState>) -> Response {
    let n = clamp_lines(&query);
    // SSH 上游：远端 journalctl（本机 journal 里本就没有它的日志）。
    if let Some(core) = query.core.as_deref().filter(|core| !core.is_empty()) {
        let is_ssh = state
            .registry
            .list()
            .await
            .iter()
            .any(|u| u.name == core && u.ssh.is_some());
        if is_ssh {
            return match state.tunnels.remote_core_logs(core, n).await {
                Ok(text) => text_response(text),
                Err(message) => text_response(format!(
                    "（无法读取远端 Core 日志：{message}）\n提示：确认 SSH 隧道在线（设置·Core 连接），\
                     且 SSH 用户有 journalctl --user 读取权限（通常为运行 Core 的同一用户）。"
                )),
            };
        }
    }
    let text = tokio::task::spawn_blocking(move || {
        read_journal(&["echo-agent-core-fixed", "echo-agent-core"], n)
            .unwrap_or_else(|| "（未找到 Core systemd 日志）".to_string())
    })
    .await
    .unwrap_or_else(|_| "（日志读取线程异常）".to_string());
    text_response(text)
}

/// 读取多个单元名的**合并**日志（最近 N 行）。
///
/// 合并而非逐单元取首个非空（2026-10 修复）：`-fixed` 后缀是历史安装的
/// 单元名——单元删除后其旧日志仍留在 journal 里，逐单元策略会命中
/// 「有历史日志但早已停用」的旧单元，把现役单元的日志整个遮蔽
/// （本机实测：面板日志停留在两个月前）。单次合并查询取的是跨单元
/// 的**时间最新 N 行**，现役/历史单元名并存时都能给出正确结果。
fn read_journal(units: &[&str], lines: u32) -> Option<String> {
    let mut args: Vec<String> = vec!["--user".into()];
    for unit in units {
        args.push("-u".into());
        args.push((*unit).into());
    }
    args.push("-n".into());
    args.push(lines.to_string());
    args.push("--no-pager".into());
    args.push("-q".into());
    let output = Command::new("journalctl").args(&args).output().ok()?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if !stdout.trim().is_empty() {
            return Some(stdout.to_string());
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
