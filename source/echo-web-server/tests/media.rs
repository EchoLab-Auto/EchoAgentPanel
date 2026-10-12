//! 媒体库路由端到端：`GET /media/{name}` 从媒体目录取文件（Core 落盘的图片），
//! 目录穿越/非法 id 一律 404。

use axum::routing::get;
use axum::Router;
use reqwest::StatusCode;
use tokio::net::TcpListener;

use echo_web_server::media::media_handler;
use echo_web_server::proxy::AppState;

async fn spawn_panel(media_dir: String) -> String {
    spawn_panel_with(
        media_dir,
        vec![echo_web_server::upstreams::UpstreamConfig::direct(
            "core",
            "ws://127.0.0.1:1",
            "",
        )],
    )
    .await
}

/// 指定上游集合的面板实例（SSH 上游取图测试用）。
async fn spawn_panel_with(
    media_dir: String,
    upstreams: Vec<echo_web_server::upstreams::UpstreamConfig>,
) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let app = Router::new()
        .route("/media/{name}", get(media_handler))
        .with_state(AppState::new(
            echo_web_server::upstreams::UpstreamRegistry::new(upstreams, None),
            "/nonexistent".into(),
            media_dir.into(),
            "".into(),
            echo_web_server::ssh::SshTunnels::new(
                std::env::temp_dir().join("echo-panel-test-tunnels"),
            ),
        ));
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    format!("http://127.0.0.1:{}", address.port())
}

fn temp_dir(tag: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!(
        "echo-panel-media-test-{tag}-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ))
}

#[tokio::test]
async fn serves_media_file_with_cache_headers() {
    let dir = temp_dir("serve");
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(dir.join("abc.png"), b"PNGDATA").unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;

    let resp = reqwest::get(format!("{base}/media/abc.png")).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(
        resp.headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok()),
        Some("image/png")
    );
    assert!(resp
        .headers()
        .get(reqwest::header::CACHE_CONTROL)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .contains("immutable"));
    assert_eq!(resp.bytes().await.unwrap().as_ref(), b"PNGDATA");

    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn rejects_traversal_and_unknown_files() {
    let dir = temp_dir("reject");
    std::fs::create_dir_all(&dir).unwrap();
    // 目录外放一个"机密"文件，穿越尝试必须取不到。
    let outside = dir.parent().unwrap().join("echo-panel-media-outside.txt");
    std::fs::write(&outside, b"secret").unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;

    for path in [
        "/media/missing.png",
        "/media/..%2fecho-panel-media-outside.txt",
        "/media/%2e%2e%2fecho-panel-media-outside.txt",
    ] {
        let resp = reqwest::get(format!("{base}{path}")).await.unwrap();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND, "{path}");
    }

    let _ = std::fs::remove_dir_all(&dir);
    let _ = std::fs::remove_file(&outside);
}

/// SSH 上游但隧道没建起来（未 ensure）时：远端取图静默失败 → 404
/// （与改造前"远端图不可见"行为一致，不得 500）。
#[tokio::test]
async fn ssh_upstream_without_tunnel_returns_404() {
    let dir = temp_dir("ssh-miss");
    std::fs::create_dir_all(&dir).unwrap();
    let ssh = echo_web_server::ssh::SshConfig {
        host: "127.0.0.1".into(),
        user: "nobody".into(),
        ..echo_web_server::ssh::SshConfig::default()
    };
    let base = spawn_panel_with(
        dir.to_string_lossy().into_owned(),
        vec![echo_web_server::upstreams::UpstreamConfig {
            name: "cloud".into(),
            url: String::new(),
            access_token: String::new(),
            ssh: Some(ssh),
        }],
    )
    .await;
    let resp = reqwest::get(format!("{base}/media/missing.png?core=cloud"))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    std::fs::remove_dir_all(&dir).ok();
}
