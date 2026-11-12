//! 面板安全接口的端到端行为（2026-11）。
//!
//! 覆盖五个"做错了会把人锁在门外"的地方：
//!
//! 1. **读接口不回明文**：只给摘要，否则长期凭据会进 DOM / 前端状态；
//! 2. **`require_token && token 空` 不锁门**：否则"先勾开关再设令牌"这个
//!    自然顺序会立刻锁死面板；
//! 3. **轮换后旧令牌失效、新令牌生效**（同一进程内，不重启）；
//! 4. **生成只回一次明文**，之后只能看到摘要；
//! 5. **写回只动 `[server]` 的两个键**：`[[cores]]` 等段必须原样保留。
//!
//! 用真 listener + HTTP 请求（与本仓 `proxy.rs` / `media.rs` 测试同一路数），
//! 不用 `tower::ServiceExt`：那需要额外引入 `tower` 依赖，而这里要验的正是
//! 「中间件确实挂在路由上」——过一遍真实 HTTP 栈才有说服力。

use std::sync::Arc;

use axum::routing::get;
use axum::Router;
use reqwest::StatusCode;
use tokio::net::TcpListener;

use echo_web_server::proxy::AppState;
use echo_web_server::security::PanelAuth;
use echo_web_server::upstreams::UpstreamRegistry;

const TOKEN: &str = "0123456789abcdef0123456789abcdef";

/// 组装并启动一个只有安全路由的 Panel（随机端口）。
async fn spawn(auth: Arc<PanelAuth>, bind: &str) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let state = AppState::new(
        UpstreamRegistry::new(
            vec![echo_web_server::upstreams::UpstreamConfig::direct(
                "core",
                "ws://127.0.0.1:1",
                "",
            )],
            None,
        ),
        "/nonexistent".into(),
        "/nonexistent-media".into(),
        "".into(),
        echo_web_server::ssh::SshTunnels::new(std::env::temp_dir().join("echo-panel-sec-tunnels")),
    )
    .with_auth(auth, bind.to_string());
    let app = Router::new()
        .route(
            "/api/security",
            get(echo_web_server::security::get_security)
                .post(echo_web_server::security::post_security),
        )
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            echo_web_server::upstreams_api::require_auth,
        ))
        .with_state(state);
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    format!("http://127.0.0.1:{}", address.port())
}

async fn http_get(base: &str, token: Option<&str>) -> (StatusCode, serde_json::Value) {
    let client = reqwest::Client::new();
    let mut request = client.get(format!("{base}/api/security"));
    if let Some(token) = token {
        request = request.header("authorization", format!("Bearer {token}"));
    }
    let response = request.send().await.unwrap();
    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    (status, serde_json::from_str(&text).unwrap_or(serde_json::Value::Null))
}

async fn http_post(
    base: &str,
    token: Option<&str>,
    body: serde_json::Value,
) -> (StatusCode, serde_json::Value) {
    let client = reqwest::Client::new();
    let mut request = client
        .post(format!("{base}/api/security"))
        .header("content-type", "application/json")
        .body(body.to_string());
    if let Some(token) = token {
        request = request.header("authorization", format!("Bearer {token}"));
    }
    let response = request.send().await.unwrap();
    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    (status, serde_json::from_str(&text).unwrap_or(serde_json::Value::Null))
}

/// 认证开启时读接口要凭据，且**只回摘要**。
#[tokio::test]
async fn security_view_requires_auth_and_never_returns_the_token() {
    let auth = PanelAuth::new(TOKEN, true);
    let base = spawn(auth.clone(), "0.0.0.0:8080").await;

    let (status, _) = http_get(&base, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let (status, body) = http_get(&base, Some(TOKEN)).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["token_set"], true);
    assert_eq!(body["enforced"], true);
    assert_eq!(body["loopback"], false, "0.0.0.0 不是回环");
    let hint = body["token_hint"].as_str().unwrap_or_default();
    assert!(!hint.is_empty(), "{body}");
    assert!(!hint.contains(TOKEN), "读接口回显了明文令牌：{body}");
}

/// "勾了开关但没设令牌"不锁门——否则用户会被自己的面板挡在外面。
#[tokio::test]
async fn require_without_token_does_not_lock_the_panel() {
    let auth = PanelAuth::new("", true);
    let base = spawn(auth, "127.0.0.1:8080").await;
    let (status, body) = http_get(&base, None).await;
    assert_eq!(status, StatusCode::OK, "无令牌时不该拦截");
    assert_eq!(body["require_token"], true, "开关意图要如实上报");
    assert_eq!(body["enforced"], false, "但实际没有生效");
    assert_eq!(body["loopback"], true);
}

/// 运行期轮换：旧令牌立刻失效、新令牌立刻生效（不需要重启）。
#[tokio::test]
async fn rotating_the_token_takes_effect_immediately() {
    let auth = PanelAuth::new(TOKEN, true);
    let base = spawn(auth.clone(), "127.0.0.1:8080").await;
    let next = "fedcba9876543210fedcba9876543210";

    let (status, body) = http_post(&base, Some(TOKEN), serde_json::json!({ "token": next })).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["enforced"], true);
    // 没有配置文件 → 如实报 persisted=false（仅内存生效）
    assert_eq!(body["persisted"], false);

    let (status, _) = http_get(&base, Some(TOKEN)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED, "旧令牌必须失效");
    let (status, _) = http_get(&base, Some(next)).await;
    assert_eq!(status, StatusCode::OK, "新令牌必须立刻可用");
}

/// `generate` 生成的令牌**只在本次响应里出现一次**，并且当场生效。
#[tokio::test]
async fn generate_returns_the_token_once_and_enables_auth() {
    let auth = PanelAuth::new("", false);
    let base = spawn(auth.clone(), "127.0.0.1:8080").await;

    let (status, body) = http_post(
        &base,
        None,
        serde_json::json!({ "generate": true, "require_token": true }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let issued = body["token_once"].as_str().expect("token_once").to_string();
    assert!(issued.len() >= 32, "生成的令牌太短：{issued}");
    assert_eq!(body["enforced"], true);

    // 之后读接口不再回明文
    let (status, view) = http_get(&base, Some(&issued)).await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        view.get("token_once").is_none(),
        "读接口不该带明文：{view}"
    );
}

/// 过短的令牌被拒（面板端口常映射公网，4 位数字是分钟级可枚举）。
#[tokio::test]
async fn short_token_is_rejected_with_an_actionable_message() {
    let auth = PanelAuth::new("", false);
    let base = spawn(auth, "127.0.0.1:8080").await;
    let (status, body) = http_post(
        &base,
        None,
        serde_json::json!({ "token": "1234", "require_token": true }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let message = body["error"].as_str().unwrap_or_default();
    assert!(message.contains("太短"), "{message}");
}

/// 关掉认证但保留令牌：不拦截，且下次可以一键再开。
#[tokio::test]
async fn disabling_enforcement_keeps_the_token_for_later() {
    let auth = PanelAuth::new(TOKEN, true);
    let base = spawn(auth.clone(), "127.0.0.1:8080").await;
    let (status, body) = http_post(&base, Some(TOKEN), serde_json::json!({ "require_token": false })).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["token_set"], true, "令牌应当保留");
    assert_eq!(body["enforced"], false);
    let (status, _) = http_get(&base, None).await;
    assert_eq!(status, StatusCode::OK, "认证已关，无凭据也能读");
}

/// 有配置文件时写回**只动 [server] 的两个键**，其他段原样保留。
#[tokio::test]
async fn persist_rewrites_only_the_two_server_keys() {
    let dir = std::env::temp_dir().join(format!(
        "panel-security-api-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("panel.toml");
    std::fs::write(
        &path,
        "[server]\nbind_address = \"0.0.0.0:8080\"\n\n[[cores]]\nname = \"core\"\nurl = \"ws://127.0.0.1:3132\"\n",
    )
    .unwrap();

    let auth = PanelAuth::new("", false);
    auth.attach_config(Some(path.clone()));
    let base = spawn(auth, "0.0.0.0:8080").await;
    let (status, body) = http_post(
        &base,
        None,
        serde_json::json!({ "generate": true, "require_token": true }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["persisted"], true, "{body}");

    let text = std::fs::read_to_string(&path).unwrap();
    assert!(text.contains("require_token = true"), "{text}");
    assert!(text.contains("bind_address = \"0.0.0.0:8080\""), "{text}");
    assert!(text.contains("[[cores]]"), "其他段被抹掉了：{text}");
    std::fs::remove_dir_all(&dir).ok();
}
