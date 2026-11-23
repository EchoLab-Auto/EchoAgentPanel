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
//! - 直连监听端口时根路径**照样能用**（`[server] serve_root`，缺省 true）：
//!   `base_path` 描述的是「被反代挂在哪个前缀下」，不是「只认这个前缀」——
//!   否则本机 `http://10.0.0.5:8080/` 会莫名 404。
//! - 关掉 `serve_root` 时恢复严格模式：前缀之外一律 404（整个域名都指过来时
//!   不会把别人的路径吃进静态目录）。
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
fn open_state(static_dir: &Path, base_path: &str, serve_root: bool) -> AppState {
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
    .with_serve_root(serve_root)
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
        open_state(&dir.static_dir(), "/agent-panel", true),
        DeploymentGate::disabled(),
    );
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // ① 不带尾斜杠：反向代理/手敲最可能发出的形态。
    let response = client
        .get(format!("{base}/agent-panel"))
        .send()
        .await
        .unwrap();
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
        status(
            &client,
            &format!("{base}/agent-panel/assets/missing-abc.js")
        )
        .await,
        StatusCode::NOT_FOUND
    );
}

#[tokio::test]
async fn subpath_base_also_serves_the_root_for_direct_access() {
    let dir = TempDir::new("root-alias");
    let app = router_with_gate(
        open_state(&dir.static_dir(), "/agent-panel", true),
        DeploymentGate::disabled(),
    );
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // 直连监听端口时没有反向代理，根路径就是本源地址。
    let response = client.get(format!("{base}/")).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.text().await.unwrap().contains("shell"));

    for path in ["/index.html", "/assets/app.js", "/settings"] {
        assert_eq!(
            status(&client, &format!("{base}{path}")).await,
            StatusCode::OK,
            "{path} 应走根坐标系（直连场景）"
        );
    }

    // 缺失的静态资源在根坐标系下同样是 404，不能回 shell。
    assert_eq!(
        status(&client, &format!("{base}/assets/missing-abc.js")).await,
        StatusCode::NOT_FOUND
    );

    // 前缀入口不受影响：反代那条链路照旧。
    for path in [
        "/agent-panel",
        "/agent-panel/",
        "/agent-panel/assets/app.js",
    ] {
        assert_eq!(
            status(&client, &format!("{base}{path}")).await,
            StatusCode::OK,
            "{path} 是规范地址，必须一直可用"
        );
    }
}

#[tokio::test]
async fn serve_root_disabled_serves_only_the_prefix() {
    let dir = TempDir::new("strict");
    let app = router_with_gate(
        open_state(&dir.static_dir(), "/agent-panel", false),
        DeploymentGate::disabled(),
    );
    let base = spawn(app).await;
    let client = reqwest::Client::new();

    // 关掉 serve_root 时恢复严格模式：外层代理会把同一个域名的其它路径留给
    // 别的应用，面板不该接管。
    for path in ["/", "/assets/app.js", "/index.html", "/settings"] {
        assert_eq!(
            status(&client, &format!("{base}{path}")).await,
            StatusCode::NOT_FOUND,
            "{path} 不该被面板接管"
        );
    }

    assert_eq!(
        status(&client, &format!("{base}/agent-panel/")).await,
        StatusCode::OK
    );

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
        open_state(&dir.static_dir(), "/", true),
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
