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
    let app = Router::new()
        .fallback(static_handler)
        .with_state(AppState::new(
            echo_web_server::upstreams::UpstreamRegistry::new(
                vec![echo_web_server::upstreams::UpstreamConfig::direct(
                    "core",
                    "ws://127.0.0.1:1",
                    "",
                )],
                None,
            ),
            static_dir.into(),
            "/nonexistent".into(),
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
    // 带内容哈希（8 位）→ 可 immutable。
    std::fs::write(dir.join("assets/app-BXr0LlrB.js"), "code".repeat(300)).unwrap();
    // 固定名共享入口（import map 指向、名字不能变）→ 只能协商。
    std::fs::create_dir_all(dir.join("assets/ui-frame")).unwrap();
    std::fs::write(
        dir.join("assets/ui-frame/NeumorphismButton.js"),
        "code".repeat(300),
    )
    .unwrap();
    std::fs::write(dir.join("assets/panel-vue.js"), "code".repeat(300)).unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;
    let client = reqwest::Client::new();

    // 哈希资源：一年 immutable。
    let resp = client
        .get(format!("{base}/assets/app-BXr0LlrB.js"))
        .send()
        .await
        .unwrap();
    let cc = resp
        .headers()
        .get("cache-control")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(cc.contains("immutable"), "assets cc: {cc}");

    // 固定名共享入口：**必须**可协商。immutable 会让老访客长期拿旧模块
    // 配新 CSS（scoped 样式 data-v-* 不匹配 → 控件退化成裸元素）。
    for path in [
        "assets/ui-frame/NeumorphismButton.js",
        "assets/panel-vue.js",
    ] {
        let resp = client.get(format!("{base}/{path}")).send().await.unwrap();
        let cc = resp
            .headers()
            .get("cache-control")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        assert!(
            !cc.contains("immutable"),
            "{path} 是固定名共享入口，不能 immutable：{cc}"
        );
        assert!(cc.contains("no-cache"), "{path} 应为 no-cache 协商：{cc}");
    }

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

#[tokio::test]
async fn missing_assets_are_404_not_spa_shell() {
    // 部署后旧标签页请求旧哈希 chunk：必须 404（非 html），否则动态
    // import 拿到 index.html → MIME 错误 → 异步组件永久空白。
    let dir = temp_static_dir("missing");
    std::fs::write(dir.join("index.html"), "<html>shell</html>").unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;
    let client = reqwest::Client::new();

    for path in [
        "assets/missing-abc.js",
        "assets/x-old.css",
        "favicon-old.png",
    ] {
        let resp = client.get(format!("{base}/{path}")).send().await.unwrap();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND, "{path}");
        let ct = resp
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        assert!(!ct.contains("html"), "{path} content-type: {ct}");
        let cc = resp
            .headers()
            .get("cache-control")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        assert!(cc.contains("no-store"), "{path} cache-control: {cc}");
        assert!(!resp.text().await.unwrap().contains("shell"));
    }

    // 路由式路径（无扩展名 / .html）仍走 SPA 兜底。
    for path in ["some/unknown/route", "settings", "foo/page.html"] {
        let resp = client.get(format!("{base}/{path}")).send().await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK, "{path}");
        let ct = resp
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        assert!(ct.contains("text/html"), "{path} content-type: {ct}");
        assert!(resp.text().await.unwrap().contains("shell"));
    }

    let _ = std::fs::remove_dir_all(&dir);
}

/// 原始 TCP 请求：reqwest/URL 解析会把 `/../` 规范化掉，必须自己发字节
/// 才能把「路径穿越」送到 Panel 的路由层。
async fn raw_get(base: &str, path: &str) -> (u16, Vec<u8>) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let addr = base.strip_prefix("http://").unwrap();
    let mut stream = tokio::net::TcpStream::connect(addr).await.unwrap();
    let request = format!("GET {path} HTTP/1.1\r\nHost: {addr}\r\nConnection: close\r\n\r\n");
    stream.write_all(request.as_bytes()).await.unwrap();
    let mut buf = Vec::new();
    stream.read_to_end(&mut buf).await.unwrap();
    let split = buf
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .expect("HTTP response headers");
    let head = String::from_utf8_lossy(&buf[..split]);
    let status = head
        .split_whitespace()
        .nth(1)
        .and_then(|code| code.parse().ok())
        .expect("HTTP status");
    (status, buf[split + 4..].to_vec())
}

/// `..` 必须在解析阶段被拒绝：旧实现的 `root.join(path).starts_with(root)`
/// 是**词法**比较，`/tmp/root/../secret` 仍以 `/tmp/root` 开头，于是
/// 静态根之外的文件被当作普通资源返回。
#[tokio::test]
async fn dot_dot_traversal_never_served() {
    let dir = temp_static_dir("dotdot");
    std::fs::write(dir.join("index.html"), "<html>shell</html>").unwrap();
    let secret_name = format!("echo-panel-static-secret-{}.txt", std::process::id());
    let secret = dir.parent().unwrap().join(&secret_name);
    std::fs::write(&secret, "TOP-SECRET-TRAVERSAL").unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;

    for path in [
        format!("/../{secret_name}"),
        format!("/assets/../../{secret_name}"),
    ] {
        let (status, body) = raw_get(&base, &path).await;
        assert_eq!(status, 404, "{path} 必须 404，得到 {status}");
        assert!(
            !String::from_utf8_lossy(&body).contains("TOP-SECRET-TRAVERSAL"),
            "{path} 泄漏了静态根之外的内容"
        );
    }

    let _ = std::fs::remove_file(&secret);
    let _ = std::fs::remove_dir_all(&dir);
}

/// 静态根内的符号链接指向外部时同样不能读取（词法 `starts_with` 看不见
/// 符号链接的真实目标）。
#[cfg(unix)]
#[tokio::test]
async fn symlinks_cannot_escape_the_static_root() {
    let dir = temp_static_dir("symlink");
    std::fs::write(dir.join("index.html"), "<html>shell</html>").unwrap();
    let secret = dir.parent().unwrap().join(format!(
        "echo-panel-static-symlink-secret-{}.txt",
        std::process::id()
    ));
    std::fs::write(&secret, "TOP-SECRET-SYMLINK").unwrap();
    std::os::unix::fs::symlink(&secret, dir.join("leak.txt")).unwrap();
    let base = spawn_panel(dir.to_string_lossy().into_owned()).await;

    let resp = reqwest::get(format!("{base}/leak.txt")).await.unwrap();
    assert_eq!(resp.status(), StatusCode::NOT_FOUND, "符号链接越界必须 404");
    assert!(!resp.text().await.unwrap().contains("TOP-SECRET-SYMLINK"));

    let _ = std::fs::remove_file(&secret);
    let _ = std::fs::remove_dir_all(&dir);
}

/// runtime 的真实路由：`route_layer(require_auth)` 只护 API，静态 fallback
/// 是公开的（登录页必须能加载）。公开不等于可越界——认证开启时静态根之外
/// 的文件依然不能被匿名读取，SPA 兜底保持可用。
#[tokio::test]
async fn runtime_public_fallback_keeps_spa_but_blocks_traversal() {
    const TOKEN: &str = "0123456789abcdef0123456789abcdef";
    let dir = temp_static_dir("runtime-fallback");
    std::fs::write(dir.join("index.html"), "<html>runtime-shell</html>").unwrap();
    let secret_name = format!("echo-panel-runtime-secret-{}.txt", std::process::id());
    let secret = dir.parent().unwrap().join(&secret_name);
    std::fs::write(&secret, "TOP-SECRET-RUNTIME").unwrap();

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let state = AppState::new(
        echo_web_server::upstreams::UpstreamRegistry::new(
            vec![echo_web_server::upstreams::UpstreamConfig::direct(
                "core",
                "ws://127.0.0.1:1",
                "",
            )],
            None,
        ),
        dir.to_string_lossy().into_owned().into(),
        "/nonexistent-media".into(),
        TOKEN.into(),
        echo_web_server::ssh::SshTunnels::new(
            std::env::temp_dir().join("echo-panel-runtime-test-tunnels"),
        ),
    );
    let app = echo_web_server::runtime::router(state);
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    let base = format!("http://127.0.0.1:{}", address.port());
    let client = reqwest::Client::new();

    // 公开 SPA：无凭据也能拿到 shell（登录页/客户端路由）。
    let resp = client.get(format!("{base}/settings")).send().await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK, "公开 SPA 兜底被误伤");
    assert!(resp.text().await.unwrap().contains("runtime-shell"));

    // 但 API 仍受认证保护（证明 require_auth 确实生效）。
    let resp = client
        .get(format!("{base}/api/security"))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);

    // 匿名路径穿越：必须在静态 handler 内被拒绝。
    let (status, body) = raw_get(&base, &format!("/../{secret_name}")).await;
    assert_eq!(status, 404, "公开 fallback 不得成为越界读取入口");
    assert!(!String::from_utf8_lossy(&body).contains("TOP-SECRET-RUNTIME"));

    let _ = std::fs::remove_file(&secret);
    let _ = std::fs::remove_dir_all(&dir);
}
