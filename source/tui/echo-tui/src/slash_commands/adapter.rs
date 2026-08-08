//! /adapter and /adapters commands.

use crate::backend::Backend;
use crate::state::{AppState, ToastKind};
use echo_agent::BackendCommand;

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
                lines.push(format!(
                    "    状态: ● 已连接  self: {}",
                    a.self_id.as_deref().unwrap_or("?")
                ));
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::state::AdapterStatusEntry;
    use crate::theme::Theme;

    fn toast_text(st: &AppState) -> String {
        st.messages
            .get(crate::state::TRUNK_SESSION_ID)
            .map(|msgs| msgs.iter().map(|m| m.content.clone()).collect())
            .unwrap_or_default()
    }

    #[tokio::test]
    async fn status_requests_refresh_and_reports_empty() {
        let (bridge, handle) = echo_agent::create_bridge();
        let backend = Backend::new(std::sync::Arc::new(bridge));
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        status(&mut st, &backend);
        assert_eq!(
            handle.try_recv_command(),
            Some(BackendCommand::RequestAdapterStatus)
        );
        assert!(toast_text(&st).contains("无适配器"));
    }

    #[tokio::test]
    async fn status_shows_connected_self_id() {
        let (bridge, _handle) = echo_agent::create_bridge();
        let backend = Backend::new(std::sync::Arc::new(bridge));
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        st.status.set_adapter_state(AdapterStatusEntry {
            name: "qq".into(),
            display_name: "QQ/OneBot".into(),
            connected: true,
            running: true,
            self_id: Some("10001".into()),
            bind_address: String::new(),
            started_at: None,
        });
        status(&mut st, &backend);
        let text = toast_text(&st);
        assert!(text.contains("QQ/OneBot"));
        assert!(text.contains("已连接"));
        assert!(text.contains("10001"));
    }

    #[tokio::test]
    async fn status_shows_waiting_hints_when_disconnected() {
        let (bridge, _handle) = echo_agent::create_bridge();
        let backend = Backend::new(std::sync::Arc::new(bridge));
        let mut st = AppState::new(Theme::dark(), Keybindings::default());
        st.status.set_adapter_state(AdapterStatusEntry {
            name: "qq".into(),
            display_name: "QQ/OneBot".into(),
            connected: false,
            running: true,
            self_id: None,
            bind_address: "0.0.0.0:3131".into(),
            started_at: None,
        });
        status(&mut st, &backend);
        let text = toast_text(&st);
        assert!(text.contains("等待客户端连接"));
        assert!(text.contains("ws://0.0.0.0:3131"));
        assert!(text.contains("docker ps"));
    }
}
