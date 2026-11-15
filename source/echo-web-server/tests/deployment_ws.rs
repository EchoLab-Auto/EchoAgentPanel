//! 维护门控对**已建立** WebSocket 的断开契约。
//!
//! 与 `tests/deployment.rs` 分工：那里证明 maintenance / fail-closed 拒绝
//! **新**握手；这里证明 `proxy::ws_guard` 会把**已经升级**的连接主动关掉
//! （Close 1001 + 拆除中继），覆盖：
//!   - serving 时不误杀；
//!   - 运行中翻转 `maintenance` → 旧连接收到 Close；
//!   - 运行中 gate 配置损坏（文件消失）→ fail closed，旧连接收到 Close；
//!   - 门控未配置（`DeploymentGate::disabled`）永不影响旧连接。
//!
//! 所有 gate 都用显式路径注入（router 的 `Extension` / `DeploymentGate::at`），
//! **不读写进程环境变量**，也不连接真实 Core（上游指向 127.0.0.1:1）。

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use axum::extract::Extension;
use axum::Router;
use futures_util::StreamExt;
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode;
use tokio_tungstenite::tungstenite::Message as WsMessage;

use echo_web_server::deployment::DeploymentGate;
use echo_web_server::proxy::{ws_guard, AppState};
use echo_web_server::runtime::router_with_gate;
use echo_web_server::security::PanelAuth;
use echo_web_server::ssh::SshTunnels;
use echo_web_server::upstreams::{UpstreamConfig, UpstreamRegistry};

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

struct TempDir {
    path: PathBuf,
}

impl TempDir {
    fn new(tag: &str) -> Self {
        let unique = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "echo-panel-ws-gate-{tag}-{}-{unique}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(path.join("static")).unwrap();
        std::fs::write(path.join("static/index.html"), "<html>shell</html>").unwrap();
        Self { path }
    }

    fn static_dir(&self) -> PathBuf {
        self.path.join("static")
    }

    fn gate_path(&self) -> PathBuf {
        self.path.join("gate.json")
    }

    fn write_gate(&self, json: &str) {
        std::fs::write(self.gate_path(), json).unwrap();
    }

    fn write_valid_gate(&self, maintenance: bool) {
        self.write_gate(
            &serde_json::json!({
                "schema_version": 1,
                "instance_id": "panel-prod-1",
                "maintenance": maintenance,
                "release_id": "2026.11.14-1",
                "management_protocol": "echo-management/1"
            })
            .to_string(),
        );
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

/// 认证关闭的 Panel state；上游指向必然连不上的 127.0.0.1:1，测试不碰真实
/// Core（中继会自己重连，不影响浏览器侧连接）。
fn open_state(static_dir: &Path) -> AppState {
    let tunnels = SshTunnels::new(static_dir.parent().unwrap().join("tunnels"));
    AppState::new(
        UpstreamRegistry::new(
            vec![UpstreamConfig::direct("core", "ws://127.0.0.1:1", "")],
            None,
        ),
        Arc::from(static_dir.to_string_lossy().as_ref()),
        Arc::from("/nonexistent-media"),
        Arc::from(""),
        tunnels,
    )
    .with_auth(
        PanelAuth::new(String::new(), false),
        "127.0.0.1:0".to_owned(),
    )
}

async fn spawn(app: Router) -> std::net::SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    address
}

/// 建立一条已 upgrade 的浏览器连接，并在 `serving` 期间确认它不会被误杀。
async fn connect_while_serving(
    dir: &TempDir,
) -> tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>> {
    dir.write_valid_gate(false);
    let gate = DeploymentGate::at(dir.gate_path());
    // ws_handler 生产路径从环境读 gate；测试通过 Extension 注入同一个显式
    // gate（不污染 env），router 的 middleware 用的是同一个句柄。
    let app = router_with_gate(open_state(&dir.static_dir()), gate.clone()).layer(Extension(gate));
    let address = spawn(app).await;

    let (mut client, _) = tokio_tungstenite::connect_async(format!("ws://{address}/ws"))
        .await
        .expect("serving gate must accept a new websocket handshake");

    // 门控仍在 serving：已有连接必须保持安静（心跳 30s，测试窗口内无帧）。
    match tokio::time::timeout(Duration::from_millis(350), client.next()).await {
        Err(_) => {}
        Ok(Some(Ok(WsMessage::Close(frame)))) => {
            panic!("serving gate closed an established websocket: {frame:?}")
        }
        Ok(other) => panic!("unexpected frame while serving: {other:?}"),
    }
    client
}

/// 断言下一条消息是门控发出的 Close（1001 going away），而不是普通断开。
async fn expect_gate_close(
    client: &mut (impl StreamExt<Item = Result<WsMessage, tokio_tungstenite::tungstenite::Error>>
              + Unpin),
    needle: &str,
) {
    let message = tokio::time::timeout(Duration::from_secs(3), client.next())
        .await
        .expect("gate did not close the established websocket in time")
        .expect("websocket stream ended without a close frame")
        .expect("websocket error");
    match message {
        WsMessage::Close(Some(frame)) => {
            assert_eq!(
                frame.code,
                CloseCode::Away,
                "expected 1001 going away, got {:?}",
                frame.code
            );
            assert!(
                frame.reason.contains(needle),
                "close reason {:?} does not mention {needle:?}",
                frame.reason
            );
        }
        other => panic!("expected a close frame, got {other:?}"),
    }
}

#[tokio::test]
async fn ws_guard_polls_gate_file_without_env() {
    let dir = TempDir::new("guard");
    let gate = DeploymentGate::at(dir.gate_path());

    // serving：绝不触发。
    dir.write_valid_gate(false);
    assert!(
        tokio::time::timeout(Duration::from_millis(250), ws_guard(gate.clone()))
            .await
            .is_err(),
        "serving gate must not close existing websockets"
    );

    // 翻转 maintenance：一个检查周期内触发。
    dir.write_valid_gate(true);
    let reason = tokio::time::timeout(Duration::from_secs(2), ws_guard(gate.clone()))
        .await
        .expect("maintenance must trip the guard");
    assert!(reason.contains("maintenance"), "reason: {reason}");

    // 文件消失 = 配置不可用：fail closed，而不是假设"没写就是没维护"。
    std::fs::remove_file(dir.gate_path()).unwrap();
    let reason = tokio::time::timeout(Duration::from_secs(2), ws_guard(gate))
        .await
        .expect("broken gate configuration must fail closed");
    assert!(reason.contains("unavailable"), "reason: {reason}");

    // 未配置门控：旧行为——永不触发。
    assert!(
        tokio::time::timeout(
            Duration::from_millis(250),
            ws_guard(DeploymentGate::disabled())
        )
        .await
        .is_err(),
        "disabled gate must never affect existing websockets"
    );
}

#[tokio::test]
async fn established_websocket_is_closed_when_gate_enters_maintenance() {
    let dir = TempDir::new("maintenance");
    let mut client = connect_while_serving(&dir).await;

    // 部署器翻转 maintenance：已有连接在 ~100ms 检查周期内收到 Close。
    dir.write_valid_gate(true);
    expect_gate_close(&mut client, "maintenance").await;
}

#[tokio::test]
async fn established_websocket_fails_closed_when_gate_file_disappears() {
    let dir = TempDir::new("broken");
    let mut client = connect_while_serving(&dir).await;

    // 部署器把文件删坏（或写到一半时不可读）：旧连接也不能继续活着服务。
    std::fs::remove_file(dir.gate_path()).unwrap();
    expect_gate_close(&mut client, "unavailable").await;
}
