//! 静态资源路由端到端：gzip 协商、ETag/304、分路径缓存策略与 SPA 兜底。

use std::io::Read;

use axum::Router;
use reqwest::StatusCode;
use tokio::net::TcpListener;

use echo_web_server::proxy::AppState;
use echo_web_server::static_files::static_handler;

async fn spawn_panel(static_dir: String) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let app = Router::new().fallback(static_handler).with_state(AppState {
        core_url: "ws://127.0.0.1:1".into(),
        core_access_token: "".into(),
        static_dir: static_dir.into(),
        media_dir: "/nonexistent".into(),
    });
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    format!("http://127.0.0.1:{}", address.port())
}

fn temp_static_dir(tag: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "echo-panel-static-test-{tag}-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    std::fs::create_dir_all(dir.join("assets")).unwrap();
    dir
}

fn gunzip(bytes: &[u8]) -> Vec<u8> {
    let mut decoder = flate2::read::GzDecoder::new(bytes);
    let mut out = Vec::new();
    decoder.read_to_end(&mut out).unwrap();
    out
}

#[tokio::test]
async fn gzip_is_negotiated_and_roundtrips() {
    let dir = temp_static_dir("gzip");
    // 3KB 可压缩文本（> GZIP_MIN_BYTES）。
    let body = "const x = '同一个字符串重复压缩效果最好';".repeat(80);
    std::fs::write(dir.join("assets/app-abc.js"), &body).unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;

    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{base}/assets/app-abc.js"))
        .header("accept-encoding", "gzip")
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(
        resp.headers()
            .get("content-encoding")
            .and_then(|v| v.to_str().ok()),
        Some("gzip"),
        "compressible asset must be gzipped"
    );
    assert_eq!(
        resp.headers().get("vary").and_then(|v| v.to_str().ok()),
        Some("accept-encoding")
    );
    let compressed = resp.bytes().await.unwrap();
    assert!(
        compressed.len() < body.len() / 2,
        "gzip must actually shrink the payload"
    );
    assert_eq!(gunzip(&compressed), body.as_bytes());

    // 不带 Accept-Encoding：原样返回，绝不发 gzip。
    let resp = client
        .get(format!("{base}/assets/app-abc.js"))
        .send()
        .await
        .unwrap();
    assert!(resp.headers().get("content-encoding").is_none());
    assert_eq!(resp.bytes().await.unwrap().as_ref(), body.as_bytes());

    // q=0 显式拒绝：同样原样返回。
    let resp = client
        .get(format!("{base}/assets/app-abc.js"))
        .header("accept-encoding", "gzip;q=0")
        .send()
        .await
        .unwrap();
    assert!(resp.headers().get("content-encoding").is_none());

    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn small_files_are_not_gzipped() {
    let dir = temp_static_dir("small");
    std::fs::write(dir.join("assets/tiny.js"), b"x").unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;
    let resp = reqwest::Client::new()
        .get(format!("{base}/assets/tiny.js"))
        .header("accept-encoding", "gzip")
        .send()
        .await
        .unwrap();
    assert!(resp.headers().get("content-encoding").is_none());
    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn etag_round_trips_to_304() {
    let dir = temp_static_dir("etag");
    std::fs::write(dir.join("assets/app-abc.js"), "console.log(1)".repeat(200)).unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;
    let client = reqwest::Client::new();
    let url = format!("{base}/assets/app-abc.js");

    let resp = client
        .get(&url)
        .header("accept-encoding", "gzip")
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let etag = resp
        .headers()
        .get("etag")
        .and_then(|v| v.to_str().ok())
        .expect("etag header present")
        .to_string();
    assert!(etag.starts_with("W/\""), "weak etag: {etag}");

    // 同一 ETag 再请求 → 304 空体，且 ETag 回带。
    let resp = client
        .get(&url)
        .header("accept-encoding", "gzip")
        .header("if-none-match", &etag)
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::NOT_MODIFIED);
    assert_eq!(
        resp.headers().get("etag").and_then(|v| v.to_str().ok()),
        Some(etag.as_str())
    );
    assert!(resp.bytes().await.unwrap().is_empty());

    // 内容变化（mtime/大小变了）→ 新 ETag，旧 ETag 不再命中。
    std::fs::write(dir.join("assets/app-abc.js"), "changed".repeat(400)).unwrap();
    let resp = client
        .get(&url)
        .header("if-none-match", &etag)
        .send()
        .await
        .unwrap();
    assert_eq!(
        resp.status(),
        StatusCode::OK,
        "stale etag must be revalidated"
    );

    let _ = std::fs::remove_dir_all(&dir);
}

#[tokio::test]
async fn cache_policy_follows_path() {
    let dir = temp_static_dir("cache");
    std::fs::write(dir.join("index.html"), "<html>shell</html>").unwrap();
    std::fs::write(dir.join("assets/app-abc.js"), "code".repeat(300)).unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;
    let client = reqwest::Client::new();

    // 哈希资源：一年 immutable。
    let resp = client
        .get(format!("{base}/assets/app-abc.js"))
        .send()
        .await
        .unwrap();
    let cc = resp
        .headers()
        .get("cache-control")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(cc.contains("immutable"), "assets cc: {cc}");

    // SPA shell：no-store。
    let resp = client.get(format!("{base}/")).send().await.unwrap();
    let cc = resp
        .headers()
        .get("cache-control")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(cc.contains("no-store"), "shell cc: {cc}");

    // 未知路由 → SPA 兜底（app shell）。
    let resp = client
        .get(format!("{base}/some/client/route"))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert!(resp.text().await.unwrap().contains("shell"));

    let _ = std::fs::remove_dir_all(&dir);
}
