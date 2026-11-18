//! 子路径部署（`[server] base_path`）的端到端契约。
//!
//! 为什么值得单独一组：这条路径上同时有两个坐标系 —— 浏览器看到的（带前缀）
//! 与静态目录里的（无前缀）。搞错一个的表现分别是「页面白屏」与「404」，而两者
//! 都不会在单元测试里露头。这里用真 Router + 真 HTTP 客户端把它们钉住。
//!
//! 覆盖：
//! - 带前缀与不带前缀两种入口（`/agent-panel` 与 `/agent-panel/`）都要能开 ——
//!   前者是手敲/反向代理可能发出的形态，后者是浏览器解析相对引用的形态（也是
//!   PWA manifest 的 `start_url`）。
//! - 静态资源与 SPA 兜底都在前缀下。
//! - 前缀段之外一律不归这个进程管（`/`、`/assets/…` 必须是 404，否则外层代理
//!   把整个域名指过来时会把别人的路径吃进静态目录）。
//! - 前缀不是「字符串前缀」而是「路径段前缀」：`/agent-panelx` 不算命中。

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
            "echo-panel-base-{tag}-{}-{unique}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let static_dir = path.join("static");
        std::fs::create_dir_all(static_dir.join("assets")).unwrap();
        std::fs::write(static_dir.join("index.html"), "<html>shell</html>").unwrap();
        std::fs::write(static_dir.join("assets/app.js"), "console.log('app')").unwrap();
        Self { path }
    }

    fn static_dir(&self) -> PathBuf {
        self.path.join("static")
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

/// 关闭认证与门控：这组测试只关心路径空间，不该被 401/503 干扰。
fn open_state(static_dir: &Path, base_path: &str) -> AppState {
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
    .with_base_path(base_path)
}

async fn spawn(app: Router) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    format!("http://{address}")
}

async fn status(client: &reqwest::Client, url: &str) -> StatusCode {
    client.get(url).send().await.unwrap().status()
}

#[tokio::test]
async fn subpath_base_serves_shell_and_assets_under_prefix() {
    let dir = TempDir::new("subpath");
    let app = router_with_gate(
        open_state(&dir.static_dir(), "/agent-panel"),
        DeploymentGate::disabled(),
    );
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // ① 不带尾斜杠：反向代理/手敲最可能发出的形态。
    let response = client.get(format!("{base}/agent-panel")).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.text().await.unwrap().contains("shell"));

    // ② 带尾斜杠：浏览器对 `/agent-panel` 做相对解析会落到这里，PWA manifest
    //    的 start_url 也是这个形态。**必须**同样可用，否则「装到桌面打不开」。
    assert_eq!(
        status(&client, &format!("{base}/agent-panel/")).await,
        StatusCode::OK,
        "带尾斜杠的入口不能 404"
    );

    // ③ 静态资源：目录里的相对路径 + 基址。
    assert_eq!(
        status(&client, &format!("{base}/agent-panel/assets/app.js")).await,
        StatusCode::OK
    );

    // ④ SPA 兜底：未知**路由**给 shell（客户端路由）。
    assert_eq!(
        status(&client, &format!("{base}/agent-panel/settings")).await,
        StatusCode::OK
    );

    // ⑤ 看起来是静态资源的缺失路径必须 404，不能回 shell ——
    //    否则旧标签页请求旧哈希 chunk 会拿到 200 text/html，
    //    动态 import 失败、异步组件永久空白。
    assert_eq!(
        status(&client, &format!("{base}/agent-panel/assets/missing-abc.js")).await,
        StatusCode::NOT_FOUND
    );
}

#[tokio::test]
async fn subpath_base_leaves_the_rest_of_the_site_alone() {
    let dir = TempDir::new("outside");
    let app = router_with_gate(
        open_state(&dir.static_dir(), "/agent-panel"),
        DeploymentGate::disabled(),
    );
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // 前缀之外一律不接管：外层代理会把同一个域名的其它路径留给别的应用。
    for path in ["/", "/assets/app.js", "/ws", "/api/deployment", "/settings"] {
        assert_eq!(
            status(&client, &format!("{base}{path}")).await,
            StatusCode::NOT_FOUND,
            "{path} 不该被面板接管"
        );
    }

    // 前缀必须是**路径段**，不是字符串前缀。
    assert_eq!(
        status(&client, &format!("{base}/agent-panelx/assets/app.js")).await,
        StatusCode::NOT_FOUND,
        "/agent-panelx 不是 /agent-panel 的子路径"
    );
}

#[tokio::test]
async fn root_base_keeps_the_historical_layout() {
    let dir = TempDir::new("root");
    let app = router_with_gate(
        open_state(&dir.static_dir(), "/"),
        DeploymentGate::disabled(),
    );
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // 不配 base_path 的部署必须与改造前完全一致：根上就是面板。
    assert_eq!(status(&client, &format!("{base}/")).await, StatusCode::OK);
    assert_eq!(
        status(&client, &format!("{base}/assets/app.js")).await,
        StatusCode::OK
    );
    assert_eq!(
        status(&client, &format!("{base}/settings")).await,
        StatusCode::OK
    );
}
