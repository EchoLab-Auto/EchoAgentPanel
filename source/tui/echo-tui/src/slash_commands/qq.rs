//! /qq login — QQ QR code login.
//!
//! Checks NapCat login status via OneBot API first.
//! If already logged in, shows QQ user info.
//! Otherwise reads QR PNG and renders it.

use echo_agent::BackendCommand;
use crate::app::{AppState, ToastKind};
use crate::backend::Backend;
use qrcode::QrCode;

pub fn login(state: &mut AppState, backend: &Backend) {
    backend.send(BackendCommand::RequestAdapterStatus);

    // 0. Check if NapCat is already logged in via OneBot API.
    if let Ok(info) = check_onebot_login() {
        if info.online {
            state.toast(format!(
                "── QQ 已登录 ──\n\n  QQ: {} ({})\n\n无需扫码。",
                info.user_id.as_deref().unwrap_or("?"),
                info.nickname.as_deref().unwrap_or("?")
            ), ToastKind::Success);
            return;
        }
    }

    // Not logged in — try QR code.
    let container = "elastic_merkle";
    let qr_path = "/app/napcat/cache/qrcode.png";

    let png = match std::process::Command::new("docker")
        .args(["exec", container, "cat", qr_path])
        .output()
    {
        Ok(o) if o.status.success() && !o.stdout.is_empty() => o.stdout,
        _ => {
            state.toast(format!(
                "QR 码尚未生成。NapCat 可能正在启动中。\n请稍后重试 /qq login\nWebUI: http://localhost:6099"
            ), ToastKind::Error);
            return;
        }
    };

    let mut stale = false;
    if let Ok(out) = std::process::Command::new("docker")
        .args(["exec", container, "stat", "-c", "%Y", qr_path])
        .output()
    {
        if out.status.success() {
            if let Ok(mtime_str) = String::from_utf8(out.stdout) {
                if let Ok(mtime) = mtime_str.trim().parse::<i64>() {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64;
                    if now - mtime > 120 { stale = true; }
                }
            }
        }
    }

    let tmp = std::env::temp_dir().join(format!("napcat_qr_{}.png", std::process::id()));
    if std::fs::write(&tmp, &png).is_err() {
        state.toast("临时文件写入失败", ToastKind::Error);
        return;
    }

    let url = match rxing::helpers::detect_multiple_in_file(&tmp.to_string_lossy()) {
        Ok(results) if !results.is_empty() => results[0].getText().to_string(),
        _ => {
            let _ = std::fs::remove_file(&tmp);
            state.toast("无法解码 QR 内容。请打开 WebUI 扫码: http://localhost:6099", ToastKind::Error);
            return;
        }
    };
    let _ = std::fs::remove_file(&tmp);

    match QrCode::new(url.as_bytes()) {
        Ok(qr) => state.toast(render(&qr, container, stale).join("\n"), ToastKind::Info),
        Err(e) => state.toast(format!("QR 生成失败: {e}"), ToastKind::Error),
    }
}

/// Check if NapCat is logged in via the OneBot HTTP API.
struct LoginInfo {
    online: bool,
    user_id: Option<String>,
    nickname: Option<String>,
}

fn check_onebot_login() -> Result<LoginInfo, String> {
    let output = std::process::Command::new("curl")
        .args(["-s", "http://localhost:3000/get_login_info"])
        .args(["-d", "{}"])
        .args(["-H", "Content-Type: application/json"])
        .output()
        .map_err(|e| format!("curl error: {e}"))?;
    if !output.status.success() { return Err("curl failed".into()); }
    let body: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("json parse: {e}"))?;
    let data = &body["data"];
    let user_id = data["user_id"].as_i64().map(|id: i64| id.to_string());
    let nickname = data["nickname"].as_str().map(|s: &str| s.to_string());
    Ok(LoginInfo {
        online: user_id.is_some() && user_id.as_deref() != Some("0"),
        user_id,
        nickname,
    })
}

fn render(qr: &QrCode, container: &str, stale: bool) -> Vec<String> {
    let border = 2;
    let inner: Vec<String> = qr.render::<qrcode::render::unicode::Dense1x2>()
        .build().lines().map(|s| s.to_string()).collect();
    let out_w = inner.first().map(|l| l.len()).unwrap_or(0) + border * 2;
    let blank = " ".repeat(out_w);
    let pad = " ".repeat(border);
    let mut lines = vec!["── QQ 扫码登录 ──".into(), "".into()];
    if stale { lines.push("⚠ QR 码可能已过期，如扫码失败请重新 /qq login".into()); lines.push("".into()); }
    for _ in 0..border { lines.push(blank.clone()); }
    for line in &inner { lines.push(format!("{pad}{line}{pad}")); }
    for _ in 0..border { lines.push(blank.clone()); }
    lines.push("".into());
    lines.push("用手机 QQ 扫描上方二维码登录".into());
    lines.push("QR 有效期约 2 分钟，过期后重新 /qq login".into());
    lines.push(format!("WebUI: http://localhost:6099 (容器: {container})").into());
    lines
}
