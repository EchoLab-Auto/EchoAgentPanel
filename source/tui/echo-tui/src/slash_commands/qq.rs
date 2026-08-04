//! /qq — QQ adapter management commands.
//!
//! - /qq login — QR code login
//! - /qq allowlist — manage allowlist (add/remove users & groups)
//! - /qq denylist — manage denylist (add/remove users & groups)
//!
//! All allowlist/denylist changes take effect immediately at runtime.

use echo_agent::BackendCommand;
use crate::state::{AppState, ToastKind};
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
            state.toast("QR 码尚未生成。NapCat 可能正在启动中。\n请稍后重试 /qq login\nWebUI: http://localhost:6099".to_string(), ToastKind::Error);
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
    lines.push(format!("WebUI: http://localhost:6099 (容器: {container})"));
    lines
}

// ── Allowlist / Denylist management ──────────────────────────────────────

use crate::components::form_overlay::{FormKind, FormOverlay, SelectItem};

/// Open the QQ settings submenu with gate mode switch.
pub fn setting(state: &mut AppState, backend: &Backend) {
    tracing::info!("TUI: /qq setting opened");
    backend.send(BackendCommand::RequestQqFilterConfig);

    let mode = &state.qq_gate_mode;
    let mode_label = |m: &str, label: &str| -> String {
        if mode == m { format!("● {label}") } else { format!("○ {label}") }
    };

    let items = vec![
        SelectItem {
            label: "── 门控模式（互斥，选一） ──".into(),
            value: "__info__".into(),
        },
        SelectItem {
            label: mode_label("none", "无约束 — 所有人可用"),
            value: "gate_mode:none".into(),
        },
        SelectItem {
            label: mode_label("allowlist", "白名单模式 — 仅白名单用户/群可用"),
            value: "gate_mode:allowlist".into(),
        },
        SelectItem {
            label: mode_label("denylist", "黑名单模式 — 禁止黑名单用户/群"),
            value: "gate_mode:denylist".into(),
        },
        SelectItem {
            label: String::new(),
            value: "__info__".into(),
        },
        SelectItem {
            label: "── 名单管理 ──".into(),
            value: "__info__".into(),
        },
        SelectItem {
            label: "🔒 管理白名单".into(),
            value: "qq_allowlist".into(),
        },
        SelectItem {
            label: "🚫 管理黑名单".into(),
            value: "qq_denylist".into(),
        },
    ];

    let mut fo = FormOverlay::default();
    fo.activate("QQ 设置 (↑↓选择 Enter切换 Esc退出)", items, FormKind::QqFilter);
    state.form_overlay = fo;
    state.menu_msg_idx = -1;
    state.refresh_menu_msg();
}

/// Build a filter management form shared by allowlist and denylist.
fn open_filter_form(
    state: &mut AppState,
    backend: &Backend,
    is_deny: bool,
) {
    backend.send(BackendCommand::RequestQqFilterConfig);
    backend.send(BackendCommand::RequestGroupList);

    let cfg = &state.qq_filter;
    let (list_users, list_groups) = if is_deny {
        (&cfg.denylist_users, &cfg.denylist_groups)
    } else {
        (&cfg.allowlist_users, &cfg.allowlist_groups)
    };
    let (kind_label, prefix) = if is_deny {
        ("黑名单", "denylist")
    } else {
        ("白名单", "allowlist")
    };

    let list_set: std::collections::HashSet<i64> = list_groups.iter().cloned().collect();

    let mut items: Vec<SelectItem> = Vec::new();

    // ── Current users ──
    items.push(SelectItem {
        label: format!("── 当前{kind_label}用户 ({}个) ──", list_users.len()),
        value: "__info__".into(),
    });
    for uid in list_users {
        items.push(SelectItem {
            label: format!("  👤 {uid}"),
            value: format!("{prefix}_remove_user:{uid}"),
        });
    }
    if list_users.is_empty() {
        items.push(SelectItem {
            label: "  (无)".into(),
            value: "__info__".into(),
        });
    }
    items.push(SelectItem {
        label: String::new(),
        value: "__info__".into(),
    });

    // ── Current groups (toggle list from QQ) ──
    items.push(SelectItem {
        label: format!("── {kind_label}群列表 (Enter切换) ──"),
        value: "__info__".into(),
    });

    if state.qq_groups.is_empty() {
        items.push(SelectItem {
            label: "  (未获取到群列表，请确认 QQ 已连接)".into(),
            value: "__info__".into(),
        });
    } else {
        for (gid, gname) in &state.qq_groups {
            let in_list = list_set.contains(gid);
            let mark = if in_list { "✓" } else { " " };
            items.push(SelectItem {
                label: format!("  [{mark}] {gname} ({gid})"),
                value: format!("{prefix}_toggle_group:{gid}"),
            });
        }
    }

    items.push(SelectItem {
        label: String::new(),
        value: "__info__".into(),
    });

    // ── Manual user entry ──
    items.push(SelectItem {
        label: format!("[+] 手动输入QQ号添加用户到{kind_label}"),
        value: format!("{prefix}_add_user"),
    });
    items.push(SelectItem {
        label: format!("[×] 手动输入QQ号从{kind_label}移除用户"),
        value: format!("{prefix}_remove_user"),
    });

    items.push(SelectItem {
        label: String::new(),
        value: "__info__".into(),
    });
    let tip = if is_deny {
        "📋 黑名单为空则不禁用任何人"
    } else {
        "📋 白名单为空则所有人可通过"
    };
    items.push(SelectItem {
        label: tip.into(),
        value: "__info__".into(),
    });

    let title = format!("QQ {kind_label}管理 (↑↓选择 Enter切换 Esc退出)");
    let mut fo = FormOverlay::default();
    fo.activate(&title, items, FormKind::QqFilter);
    state.form_overlay = fo;
    state.menu_msg_idx = -1;
    state.refresh_menu_msg();
}

/// Open the allowlist management form.
pub fn allowlist(state: &mut AppState, backend: &Backend) {
    open_filter_form(state, backend, false);
}

/// Open the denylist management form.
pub fn denylist(state: &mut AppState, backend: &Backend) {
    open_filter_form(state, backend, true);
}

/// Refresh the allowlist/denylist form in-place (called after toggle).
pub fn allowlist_deny_refresh(state: &mut AppState, backend: &Backend, is_deny: bool) {
    open_filter_form(state, backend, is_deny);
}

/// Toggle a group in/out of the allowlist or denylist.  No text input needed.
pub fn handle_toggle_group(
    state: &mut AppState,
    backend: &Backend,
    action: &str,
    group_id: i64,
) {
    let cfg = &state.qq_filter;
    let is_deny = action.starts_with("denylist_");

    let (users, mut groups) = if is_deny {
        (cfg.denylist_users.clone(), cfg.denylist_groups.clone())
    } else {
        (cfg.allowlist_users.clone(), cfg.allowlist_groups.clone())
    };

    let kind_label = if is_deny { "黑名单" } else { "白名单" };
    let cmd = if is_deny {
        |u: Vec<i64>, g: Vec<i64>| BackendCommand::UpdateQqDenylist { user_ids: u, group_ids: g }
    } else {
        |u: Vec<i64>, g: Vec<i64>| BackendCommand::UpdateQqAllowlist { user_ids: u, group_ids: g }
    };

    if groups.contains(&group_id) {
        groups.retain(|g| *g != group_id);
        tracing::info!(%group_id, %kind_label, "TUI: remove group from filter");
        backend.send(cmd(users, groups));
        state.toast(format!("已将群 {group_id} 从{kind_label}移除 ✓"), ToastKind::Success);
    } else {
        groups.push(group_id);
        groups.sort();
        groups.dedup();
        tracing::info!(%group_id, %kind_label, "TUI: add group to filter");
        backend.send(cmd(users, groups));
        state.toast(format!("已将群 {group_id} 添加到{kind_label} ✓"), ToastKind::Success);
    }
    // Refresh the form with updated state.
    backend.send(BackendCommand::RequestQqFilterConfig);
}

/// Handle a QQ filter action from the form overlay.  Used for text-input
/// actions (add/remove user by QQ number).
pub fn handle_filter_action(state: &mut AppState, backend: &Backend, action: &str, qq_number: &str) {
    let qq: i64 = match qq_number.trim().parse() {
        Ok(n) => n,
        Err(_) => {
            state.toast("无效的 QQ 号，请输入数字", ToastKind::Error);
            return;
        }
    };

    let cfg = &state.qq_filter;

    let is_add = action.contains("_add_");
    let is_deny = action.starts_with("denylist_");
    let kind_label = if is_deny { "黑名单" } else { "白名单" };

    let (mut users, groups) = if is_deny {
        (cfg.denylist_users.clone(), cfg.denylist_groups.clone())
    } else {
        (cfg.allowlist_users.clone(), cfg.allowlist_groups.clone())
    };

    let already = users.contains(&qq);
    if is_add && already {
        state.toast(format!("用户 {qq} 已在{kind_label}中"), ToastKind::Info);
        return;
    }

    if is_add {
        users.push(qq);
        users.sort();
        users.dedup();
    } else {
        users.retain(|u| *u != qq);
    }

    let cmd = if is_deny {
        BackendCommand::UpdateQqDenylist { user_ids: users, group_ids: groups }
    } else {
        BackendCommand::UpdateQqAllowlist { user_ids: users, group_ids: groups }
    };
    tracing::info!(%qq, %kind_label, is_add, "TUI: user filter action");
    backend.send(cmd);

    let verb = if is_add { "添加到" } else { "从" };
    state.toast(format!("已将用户 {qq} {verb}{kind_label} ✓"), ToastKind::Success);
}
