//! 部署维护门控端到端契约。
//!
//! 覆盖：无 env/无门控旧行为不变、合法文件暴露只读身份、维护开关热切换、
//! 配置损坏时 API/WS/写请求/静态页全部 fail closed、`/api/deployment` 与
//! 现有 `route_layer(require_auth)` 同一套认证、以及维护中拒绝**新** WS
//! 握手。测试一律用构造的 [`DeploymentGate`] 路径，不读写进程环境变量。

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use axum::Router;
use reqwest::StatusCode;
use tokio::net::TcpListener;

use echo_web_server::deployment::DeploymentGate;
use echo_web_server::proxy::AppState;
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
            "echo-panel-deploy-{tag}-{}-{unique}-{}",
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

    fn path(&self) -> &Path {
        &self.path
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

fn state_with_auth(static_dir: &Path, token: &str, require: bool) -> AppState {
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
        PanelAuth::new(token.to_owned(), require),
        "127.0.0.1:0".to_owned(),
    )
}

/// 测试默认关闭认证：门控测试不该被 401 干扰；认证本身由专门用例覆盖。
fn open_state(static_dir: &Path) -> AppState {
    state_with_auth(static_dir, "", false)
}

async fn spawn(app: Router) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    format!("http://{address}")
}

async fn deployment_status(
    client: &reqwest::Client,
    base: &str,
) -> (StatusCode, serde_json::Value) {
    let response = client
        .get(format!("{base}/api/deployment"))
        .send()
        .await
        .unwrap();
    let status = response.status();
    let body: serde_json::Value = serde_json::from_str(&response.text().await.unwrap()).unwrap();
    (status, body)
}

#[tokio::test]
async fn disabled_gate_keeps_legacy_behavior() {
    let dir = TempDir::new("disabled");
    let app = router_with_gate(open_state(&dir.static_dir()), DeploymentGate::disabled());
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // 静态与 API 都与旧版本一致。
    let response = client.get(format!("{base}/")).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.text().await.unwrap(), "<html>shell</html>");

    let response = client
        .get(format!("{base}/api/security"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let (status, body) = deployment_status(&client, &base).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["configured"], serde_json::json!(false));
    assert_eq!(body["state"], serde_json::json!("disabled"));
    assert_eq!(body["ready"], serde_json::json!(true));
    assert_eq!(body["fail_closed"], serde_json::json!(false));
    assert_eq!(body["maintenance"], serde_json::json!(false));
    assert_eq!(body["identity_source"], serde_json::json!("none"));
    assert_eq!(body["identity_available"], serde_json::json!(false));
    assert_eq!(
        body["existing_websockets_disconnected"],
        serde_json::json!(false)
    );
    assert_eq!(
        body["new_websocket_connections"],
        serde_json::json!("accepted")
    );
}

#[tokio::test]
async fn valid_gate_reports_declared_identity_and_toggles_without_restart() {
    let dir = TempDir::new("valid");
    dir.write_valid_gate(false);
    let gate_path = dir.gate_path();
    let app = router_with_gate(
        open_state(&dir.static_dir()),
        DeploymentGate::at(gate_path.clone()),
    );
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    let (status, body) = deployment_status(&client, &base).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["configured"], serde_json::json!(true));
    assert_eq!(body["state"], serde_json::json!("serving"));
    assert_eq!(body["ready"], serde_json::json!(true));
    assert_eq!(body["maintenance"], serde_json::json!(false));
    assert_eq!(
        body["identity_source"],
        serde_json::json!("deployment_file")
    );
    assert_eq!(body["identity_available"], serde_json::json!(true));
    // 关键诚实性：release_id 只是部署器声明，不是二进制 build id。
    assert_eq!(
        body["identity_is_binary_build_id"],
        serde_json::json!(false)
    );
    assert_eq!(body["schema_version"], serde_json::json!(1));
    assert_eq!(body["instance_id"], serde_json::json!("panel-prod-1"));
    assert_eq!(body["release_id"], serde_json::json!("2026.11.14-1"));
    assert_eq!(
        body["management_protocol"],
        serde_json::json!("echo-management/1")
    );
    assert_eq!(body["gate_error"], serde_json::Value::Null);
    assert_eq!(
        body["existing_websockets_disconnected"],
        serde_json::json!(false)
    );
    assert_eq!(
        body["new_websocket_connections"],
        serde_json::json!("accepted")
    );
    assert!(body["release_identity_note"]
        .as_str()
        .unwrap()
        .contains("not a verified build id"));

    // 非维护时 API 与静态都正常。
    assert_eq!(
        client
            .get(format!("{base}/api/security"))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        client
            .get(format!("{base}/"))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );

    // 同一个 router，仅改文件：立刻进入维护。
    dir.write_valid_gate(true);

    let response = client.get(format!("{base}/")).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        response
            .headers()
            .get("cache-control")
            .and_then(|v| v.to_str().ok()),
        Some("no-store"),
        "维护页必须禁止缓存，避免旧 UI 继续活跃"
    );
    assert!(
        response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or_default()
            .starts_with("text/html"),
        "静态维护页应是 HTML"
    );
    let page = response.text().await.unwrap();
    assert!(page.contains("维护"), "维护页应明确说明维护中");

    let response = client
        .get(format!("{base}/api/security"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        response
            .headers()
            .get("cache-control")
            .and_then(|v| v.to_str().ok()),
        Some("no-store")
    );

    let response = client
        .post(format!("{base}/api/upstreams"))
        .header("content-type", "application/json")
        .body("{}")
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::SERVICE_UNAVAILABLE,
        "维护中任何写请求都必须 503"
    );

    let response = client
        .get(format!("{base}/media/foo.png"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);

    let response = client.get(format!("{base}/ws")).send().await.unwrap();
    assert_eq!(
        response.status(),
        StatusCode::SERVICE_UNAVAILABLE,
        "维护中 /ws 的新请求也必须 503"
    );

    // 状态端点仍可被（已认证的）部署器读取，并如实报告维护态与声明身份。
    let (status, body) = deployment_status(&client, &base).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["state"], serde_json::json!("maintenance"));
    assert_eq!(body["ready"], serde_json::json!(false));
    assert_eq!(body["fail_closed"], serde_json::json!(true));
    assert_eq!(body["maintenance"], serde_json::json!(true));
    assert_eq!(body["release_id"], serde_json::json!("2026.11.14-1"));
    assert_eq!(
        body["new_websocket_connections"],
        serde_json::json!("rejected")
    );
    assert_eq!(
        body["existing_websockets_disconnected"],
        serde_json::json!(false),
        "middleware 不能声称旧 WS 已断开"
    );

    // 翻回 false：无需重启，静态立即恢复。
    dir.write_valid_gate(false);
    assert_eq!(
        client
            .get(format!("{base}/"))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
}

async fn assert_invalid_gate(tag: &str, gate_path: PathBuf, expected_error: &str) {
    let dir = TempDir::new(tag);
    let app = router_with_gate(open_state(&dir.static_dir()), DeploymentGate::at(gate_path));
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // 静态 GET：503 维护页 + no-store（fail closed，不能继续服务旧 UI）。
    let response = client.get(format!("{base}/")).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        response
            .headers()
            .get("cache-control")
            .and_then(|v| v.to_str().ok()),
        Some("no-store")
    );
    let page = response.text().await.unwrap();
    assert!(page.contains("维护"));
    assert!(
        !page.contains(dir.path().to_string_lossy().as_ref()),
        "公开维护页不得泄漏 gate 路径"
    );

    // API GET 同样 fail closed。
    let response = client
        .get(format!("{base}/api/security"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        response
            .headers()
            .get("cache-control")
            .and_then(|v| v.to_str().ok()),
        Some("no-store")
    );

    // 状态端点：503 + 固定失败类别（不含路径/OS 错误），供部署器诊断。
    let (status, body) = deployment_status(&client, &base).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["configured"], serde_json::json!(true));
    assert_eq!(body["state"], serde_json::json!("invalid"));
    assert_eq!(body["ready"], serde_json::json!(false));
    assert_eq!(body["fail_closed"], serde_json::json!(true));
    assert_eq!(body["maintenance"], serde_json::json!(false));
    assert_eq!(
        body["identity_source"],
        serde_json::json!("deployment_file")
    );
    assert_eq!(body["identity_available"], serde_json::json!(false));
    assert_eq!(body["gate_error"], serde_json::json!(expected_error));
    assert_eq!(
        body["existing_websockets_disconnected"],
        serde_json::json!(false)
    );
    let serialized = body.to_string();
    assert!(
        !serialized.contains(dir.path().to_string_lossy().as_ref()),
        "状态响应不得泄漏 gate 路径"
    );
}

#[tokio::test]
async fn broken_gate_configuration_fails_closed() {
    let scratch = TempDir::new("broken-scratch");

    // 文件不存在。
    assert_invalid_gate(
        "missing",
        scratch.path().join("missing.json"),
        "gate_file_read_error",
    )
    .await;

    // JSON 语法坏。
    let syntax = scratch.path().join("syntax.json");
    std::fs::write(&syntax, "{\"schema_version\":1,").unwrap();
    assert_invalid_gate("syntax", syntax, "gate_file_invalid_json").await;

    // 未知字段（严格 schema）。
    let unknown = scratch.path().join("unknown.json");
    std::fs::write(
        &unknown,
        serde_json::json!({
            "schema_version": 1,
            "instance_id": "panel-1",
            "maintenance": false,
            "release_id": "r1",
            "management_protocol": "echo-management/1",
            "deployer": "extra"
        })
        .to_string(),
    )
    .unwrap();
    assert_invalid_gate("unknown", unknown, "gate_file_invalid_json").await;

    // schema 版本不支持。
    let schema = scratch.path().join("schema.json");
    std::fs::write(
        &schema,
        serde_json::json!({
            "schema_version": 2,
            "instance_id": "panel-1",
            "maintenance": false,
            "release_id": "r1",
            "management_protocol": "echo-management/1"
        })
        .to_string(),
    )
    .unwrap();
    assert_invalid_gate("schema", schema, "gate_schema_unsupported").await;

    // 类型不符（maintenance 必须是 bool）。
    let wrong_type = scratch.path().join("wrong-type.json");
    std::fs::write(
        &wrong_type,
        serde_json::json!({
            "schema_version": 1,
            "instance_id": "panel-1",
            "maintenance": "false",
            "release_id": "r1",
            "management_protocol": "echo-management/1"
        })
        .to_string(),
    )
    .unwrap();
    assert_invalid_gate("wrong-type", wrong_type, "gate_file_invalid_json").await;

    // 尾部垃圾不是"严格 JSON"。
    let trailing = scratch.path().join("trailing.json");
    std::fs::write(
        &trailing,
        format!(
            "{}{}",
            serde_json::json!({
                "schema_version": 1,
                "instance_id": "panel-1",
                "maintenance": false,
                "release_id": "r1",
                "management_protocol": "echo-management/1"
            }),
            " garbage"
        ),
    )
    .unwrap();
    assert_invalid_gate("trailing", trailing, "gate_file_invalid_json").await;

    // 身份字段为空。
    let empty_id = scratch.path().join("empty-id.json");
    std::fs::write(
        &empty_id,
        serde_json::json!({
            "schema_version": 1,
            "instance_id": "",
            "maintenance": false,
            "release_id": "r1",
            "management_protocol": "echo-management/1"
        })
        .to_string(),
    )
    .unwrap();
    assert_invalid_gate("empty-id", empty_id, "gate_instance_id_invalid").await;

    // 路径是目录。
    let directory = scratch.path().join("gate-dir");
    std::fs::create_dir_all(&directory).unwrap();
    assert_invalid_gate("directory", directory, "gate_file_not_regular").await;

    // 相对路径：管理员配置错误，必须 fail closed 而不是按 CWD 猜。
    assert_invalid_gate(
        "relative",
        PathBuf::from("relative-gate.json"),
        "gate_path_not_absolute",
    )
    .await;
}

#[cfg(unix)]
#[tokio::test]
async fn symlinked_gate_file_fails_closed() {
    let scratch = TempDir::new("symlink-scratch");
    let target = scratch.path().join("real-gate.json");
    std::fs::write(
        &target,
        serde_json::json!({
            "schema_version": 1,
            "instance_id": "panel-1",
            "maintenance": false,
            "release_id": "r1",
            "management_protocol": "echo-management/1"
        })
        .to_string(),
    )
    .unwrap();
    let link = scratch.path().join("gate-link.json");
    std::os::unix::fs::symlink(&target, &link).unwrap();

    assert_invalid_gate("symlink", link, "gate_file_symlink").await;
}

#[tokio::test]
async fn deployment_status_uses_the_shared_route_auth() {
    const TOKEN: &str = "0123456789abcdef0123456789abcdef";
    let dir = TempDir::new("auth");
    dir.write_valid_gate(false);
    let app = router_with_gate(
        state_with_auth(&dir.static_dir(), TOKEN, true),
        DeploymentGate::at(dir.gate_path()),
    );
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // 与现有 API 一样：没有凭据就是 401，不因为它是部署端点而豁免。
    let response = client
        .get(format!("{base}/api/deployment"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // 查询参数令牌（WS/浏览器兼容路径）。
    let response = client
        .get(format!("{base}/api/deployment?token={TOKEN}"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Bearer 头。
    let response = client
        .get(format!("{base}/api/deployment"))
        .bearer_auth(TOKEN)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // 静态 fallback 仍然公开（登录页必须能加载）。
    assert_eq!(
        client
            .get(format!("{base}/"))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );

    // 维护中：没有凭据仍是 401（认证先于状态语义），有凭据才拿到 503 诊断。
    dir.write_valid_gate(true);
    let response = client
        .get(format!("{base}/api/deployment"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let response = client
        .get(format!("{base}/api/deployment"))
        .bearer_auth(TOKEN)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body: serde_json::Value = serde_json::from_str(&response.text().await.unwrap()).unwrap();
    assert_eq!(body["maintenance"], serde_json::json!(true));
}

#[tokio::test]
async fn maintenance_rejects_new_websocket_handshakes() {
    let dir = TempDir::new("ws");
    dir.write_valid_gate(true);
    let app = router_with_gate(
        open_state(&dir.static_dir()),
        DeploymentGate::at(dir.gate_path()),
    );
    let base = spawn(app).await;
    let ws_url = format!("ws://{}/ws", base.trim_start_matches("http://"));

    match tokio_tungstenite::connect_async(&ws_url).await {
        Err(tokio_tungstenite::tungstenite::Error::Http(response)) => {
            assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
        }
        Err(other) => panic!("expected HTTP 503 during maintenance, got {other:?}"),
        Ok(_) => panic!("maintenance gate let a new WebSocket handshake through"),
    }
}
