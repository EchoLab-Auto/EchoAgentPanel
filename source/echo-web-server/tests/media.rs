//! 媒体库路由端到端：`GET /media/{name}` 从媒体目录取文件（Core 落盘的图片），
//! 目录穿越/非法 id 一律 404。

use axum::routing::get;
use axum::Router;
use reqwest::StatusCode;
use tokio::net::TcpListener;

use echo_web_server::media::media_handler;
use echo_web_server::proxy::AppState;

async fn spawn_panel(media_dir: String) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let app = Router::new()
        .route("/media/{name}", get(media_handler))
        .with_state(AppState {
            core_url: "ws://127.0.0.1:1".into(),
            core_access_token: "".into(),
            static_dir: "/nonexistent".into(),
            media_dir: media_dir.into(),
        });
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
