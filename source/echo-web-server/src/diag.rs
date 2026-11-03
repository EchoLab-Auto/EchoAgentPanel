//! 前端诊断数据回收端点（2026-11）。
//!
//! 背景：手机上「软键盘弹起后输入区错位」这类问题只能在真机复现，而真机
//! 上既没法开 DevTools、也没法把几十个坐标值口述回来。此前几轮靠「让用户
//! 报两三个数字」定位，关键词一缺就得多跑一轮，代价极高。
//!
//! 这个端点让前端把**完整快照**直接 POST 上来，落成 JSONL 文件，排查者
//! 在本机 `tail` 一下就有全部字段（含 computed style），不需要任何口述。
//!
//! 安全边界：
//!   - 只在 `?diag` 诊断模式下由前端调用，正常使用不会产生流量；
//!   - 只写固定文件、单行上限 8 KiB，超出截断（防误用写爆磁盘）；
//!   - 写入前把换行压平，避免一条记录被拆成多行破坏 JSONL 结构；
//!   - 与静态前端一样豁免 Bearer 认证（挂载点在 route_layer 之前），
//!     因为它的设计目标就是「用户手机能直接打上来」；数据本身不含凭据。
//!
//! 落盘位置固定为 `<state_dir>/keyboard-diag.jsonl`，本机直接可读；
//! `DELETE /api/diag` 清空，便于一次干净的复现。

use std::path::PathBuf;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;

use crate::proxy::AppState;

/// 单条记录上限：够装 40 个字段，又不至于被恶意请求撑爆磁盘。
const MAX_BODY: usize = 8 * 1024;

/// 诊断文件的固定落点。放在 `/tmp` 而不是 state 目录：这类数据只在
/// 一次排查期间有效，重启即弃，不占用户数据目录。
fn diag_path() -> PathBuf {
    PathBuf::from("/tmp/panel-keyboard-diag.jsonl")
}

/// `POST /api/diag` — 追加一条诊断快照。
///
/// 请求体按 UTF-8 文本处理（前端直接发 JSON 字符串），逐行校验长度后
/// 追加写入，每条独立一行。返回 204：前端不关心结果，也不该因此报错。
pub async fn post_diag(body: Bytes) -> impl IntoResponse {
    // 非 UTF-8 直接拒绝（前端只会发 JSON，不该出现二进制）
    let Ok(text) = std::str::from_utf8(&body) else {
        return (StatusCode::BAD_REQUEST, "body must be utf-8");
    };
    // 换行压平：一条记录必须落成一行，否则 JSONL 结构就断了。
    let mut line = text.replace(['\r', '\n'], " ");
    if line.len() > MAX_BODY {
        line.truncate(MAX_BODY);
        line.push_str("…(truncated)");
    }
    // 时间戳由服务端打：前端时钟在真机上未必可信，且能对上 systemd 日志。
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let record = format!("{{\"ts\":{ts},\"data\":{line}}}\n");

    match tokio::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(diag_path())
        .await
    {
        Ok(mut f) => {
            use tokio::io::AsyncWriteExt;
            if f.write_all(record.as_bytes()).await.is_err() {
                return (StatusCode::INTERNAL_SERVER_ERROR, "write failed");
            }
            (StatusCode::NO_CONTENT, "")
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "open failed"),
    }
}

/// `DELETE /api/diag` — 清空诊断文件（开始一次干净的复现）。
pub async fn clear_diag() -> impl IntoResponse {
    let _ = tokio::fs::remove_file(diag_path()).await;
    (StatusCode::NO_CONTENT, "")
}

/// `GET /api/diag` — 回读（本机排查用；顺带方便用户自查是否写进去了）。
pub async fn get_diag(State(_state): State<AppState>) -> impl IntoResponse {
    match tokio::fs::read_to_string(diag_path()).await {
        Ok(text) => (StatusCode::OK, text),
        Err(_) => (StatusCode::OK, String::new()),
    }
}
