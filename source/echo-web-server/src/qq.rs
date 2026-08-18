//! QQ 登录辅助接口：查询 OneBot 登录状态、读取 NapCat 容器内二维码。
//!
//! 与 TUI 的 `/qq login` 能力对齐。Panel 后端直接访问本机 OneBot HTTP API
//! 和 `docker exec`，前端 QqPanel 通过这些接口展示扫码登录。

use std::io::Write as _;
use std::process::{Command, Stdio};

use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

use crate::proxy::AppState;

/// `GET /api/qq/login-status` — 返回 `{"online":bool,"user_id":...,"nickname":...}`
pub async fn login_status(State(state): State<AppState>) -> Response {
    let onebot_url = state.qq.napcat_onebot_url.clone();
    let result = tokio::task::spawn_blocking(move || {
        let url = format!("{}/get_login_info", onebot_url.trim_end_matches('/'));
        let output = std::process::Command::new("curl")
            .args(["-s", "-m", "5", &url])
            .args(["-d", "{}"])
            .args(["-H", "Content-Type: application/json"])
            .output()
            .map_err(|e| format!("无法执行 curl: {e}"))?;

        if !output.status.success() {
            return Err(format!("curl 查询失败: {}", output.status));
        }
        let body: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("OneBot 返回解析失败: {e}"))?;
        let data = &body["data"];
        let user_id = data["user_id"].as_i64().map(|id| id.to_string());
        let nickname = data["nickname"].as_str().map(str::to_string);
        Ok(json!({
            "online": user_id.is_some() && user_id.as_deref() != Some("0"),
            "user_id": user_id,
            "nickname": nickname,
        }))
    })
    .await;

    match result {
        Ok(Ok(payload)) => json_response(StatusCode::OK, &payload),
        // OneBot HTTP may not be ready before QQ login; treat as not-logged-in
        // instead of an HTTP error so the panel can still show the QR flow.
        Ok(Err(message)) => {
            tracing::debug!(%message, "NapCat OneBot login-status unavailable");
            json_response(
                StatusCode::OK,
                &json!({ "online": false, "user_id": null, "nickname": null, "error": "OneBot 接口暂未就绪，请直接扫码登录" }),
            )
        }
        Err(_) => json_response(
            StatusCode::OK,
            &json!({ "online": false, "user_id": null, "nickname": null, "error": "登录状态查询暂不可用，请直接扫码登录" }),
        ),
    }
}

/// `GET /api/qq/qrcode` — 返回 NapCat 容器中的登录二维码 PNG 字节。
/// 如果二维码文件超过 90 秒未更新，先通过 NapCat WebUI 刷新二维码。
pub async fn qrcode(State(state): State<AppState>) -> Response {
    let container = state.qq.napcat_container.clone();
    let webui_url = state.qq.napcat_webui_url.clone();
    let result = tokio::task::spawn_blocking(move || {
        let qr_path = "/app/napcat/cache/qrcode.png";

        // Refresh stale QR so a click always yields a scannable code.
        if let Some(mtime) = file_mtime_in_container(&container, qr_path) {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            if now.saturating_sub(mtime) > 90 {
                if let Err(error) = refresh_napcat_qrcode(&container, &webui_url) {
                    tracing::debug!(%error, "NapCat QR refresh failed; returning existing file");
                } else {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                }
            }
        }

        let output = Command::new("docker")
            .args(["exec", &container, "cat", qr_path])
            .output()
            .map_err(|e| format!("无法执行 docker: {e}"))?;

        if !output.status.success() {
            return Err(format!(
                "无法读取容器二维码: {}",
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }
        if output.stdout.is_empty() {
            return Err("QR 码尚未生成，NapCat 可能正在启动中，请稍后重试".to_string());
        }
        Ok(output.stdout)
    })
    .await;

    match result {
        Ok(Ok(png)) => Response::builder()
            .header(CONTENT_TYPE, "image/png")
            .body(axum::body::Body::from(png))
            .unwrap_or_else(|_| {
                json_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    &json!({ "error": "构建二维码响应失败" }),
                )
            }),
        Ok(Err(message)) => json_response(StatusCode::NOT_FOUND, &json!({ "error": message })),
        Err(_) => json_response(
            StatusCode::SERVICE_UNAVAILABLE,
            &json!({ "error": "二维码读取线程异常" }),
        ),
    }
}

fn file_mtime_in_container(container: &str, path: &str) -> Option<i64> {
    let output = Command::new("docker")
        .args(["exec", container, "stat", "-c", "%Y", path])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout.trim().parse::<i64>().ok()
}

fn webui_token_from_container(container: &str) -> Result<String, String> {
    let output = Command::new("docker")
        .args(["exec", container, "cat", "/app/napcat/config/webui.json"])
        .output()
        .map_err(|e| format!("无法读取 webui.json: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "无法读取 webui.json: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    let body: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("webui.json 解析失败: {e}"))?;
    body.get("token")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .ok_or_else(|| "webui.json 缺少 token".to_string())
}

fn sha256_hex(input: &str) -> Result<String, String> {
    let mut child = Command::new("sha256sum")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("无法执行 sha256sum: {e}"))?;
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(input.as_bytes());
    }
    let output = child
        .wait_with_output()
        .map_err(|e| format!("sha256sum 执行失败: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let hash = stdout.split_whitespace().next().unwrap_or("").to_string();
    if hash.is_empty() {
        return Err("sha256sum 输出为空".to_string());
    }
    Ok(hash)
}

fn refresh_napcat_qrcode(container: &str, webui_url: &str) -> Result<(), String> {
    let base = webui_url.trim_end_matches('/');
    let token = webui_token_from_container(container)?;
    let hash = sha256_hex(&format!("{token}.napcat"))?;

    let login_url = format!("{base}/api/auth/login");
    let login_body = json!({ "hash": hash, "totpCode": "" }).to_string();
    let login_output = Command::new("curl")
        .args(["-s", "-m", "5", "-X", "POST", &login_url])
        .args(["-H", "Content-Type: application/json"])
        .args(["-d", &login_body])
        .output()
        .map_err(|e| format!("无法登录 NapCat WebUI: {e}"))?;
    let login_json: serde_json::Value = serde_json::from_slice(&login_output.stdout)
        .map_err(|e| format!("NapCat WebUI 登录响应解析失败: {e}"))?;
    let credential = login_json
        .pointer("/data/Credential")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "NapCat WebUI 登录响应缺少 Credential".to_string())?;

    let refresh_url = format!("{base}/api/QQLogin/RefreshQRcode");
    let auth = format!("Authorization: Bearer {credential}");
    let refresh_output = Command::new("curl")
        .args(["-s", "-m", "5", "-X", "POST", &refresh_url])
        .args(["-H", &auth, "-H", "Content-Type: application/json"])
        .args(["-d", "{}"])
        .output()
        .map_err(|e| format!("无法刷新 NapCat 二维码: {e}"))?;
    if !refresh_output.status.success() {
        return Err(format!(
            "刷新 NapCat 二维码失败: {}",
            String::from_utf8_lossy(&refresh_output.stderr).trim()
        ));
    }
    Ok(())
}

fn json_response(status: StatusCode, value: &serde_json::Value) -> Response {
    Response::builder()
        .status(status)
        .header(CONTENT_TYPE, "application/json; charset=utf-8")
        .body(axum::body::Body::from(value.to_string()))
        .unwrap_or_else(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(CONTENT_TYPE, "text/plain; charset=utf-8")],
                "internal error",
            )
                .into_response()
        })
}
