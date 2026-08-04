//! /adapter and /adapters commands.

use echo_agent::BackendCommand;
use crate::state::{AppState, ToastKind};
use crate::backend::Backend;

/// /adapters — show adapter status with connection details.
pub fn status(state: &mut AppState, backend: &Backend) {
    backend.send(BackendCommand::RequestAdapterStatus);
    let adapters = &state.status.adapters;
    let mut lines: Vec<String> = vec!["── 适配器状态 ──".into()];
    if adapters.is_empty() {
        lines.push("  无适配器".into());
        lines.push("  配置 [adapters.qq] enabled = true 启用 QQ".into());
    } else {
        for a in adapters {
            lines.push(format!("  {}", a.display_name));
            if !a.running {
                lines.push("    状态: ○ 已停止".into());
            } else if a.connected {
                lines.push(format!("    状态: ● 已连接  self: {}", a.self_id.as_deref().unwrap_or("?")));
            } else {
                lines.push("    状态: ◐ 等待客户端连接…".into());
                if !a.bind_address.is_empty() {
                    lines.push(format!("    监听地址: ws://{}", a.bind_address));
                }
                lines.push("".into());
                lines.push("    NapCat 未连接到此地址。请检查:".into());
                lines.push("    1. NapCat 容器是否运行: docker ps | grep napcat".into());
                lines.push("    2. NapCat WebUI → 网络配置 → WebSocket 客户端".into());
                if !a.bind_address.is_empty() {
                    lines.push(format!("    3. 地址是否设为 ws://{}", a.bind_address));
                }
                lines.push("    4. NapCat 是否已扫码登录 (http://localhost:6099)".into());
            }
        }
        lines.push("".into());
        lines.push("  /adapter start  — 启动  /adapter stop  — 停止".into());
        lines.push("  /qq login       — 扫码登录".into());
    }
    state.toast(lines.join("\n"), ToastKind::Info);
}
