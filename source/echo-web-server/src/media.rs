//! 媒体库 HTTP 路由：`GET /media/{name}` → Core 落盘的入站图片。
//!
//! 背景（2026-09-24）：Core 把 QQ 入站图片与面板上传图片落盘到媒体目录
//! （`~/.local/share/echo-agent-core/media`，内容哈希命名），链路上只传
//! `/media/<id>` 引用。浏览器 `<img>` 从这里取图——同源、可懒加载、
//! 可长期强缓存（名字含内容哈希，字节永不变化）。
//!
//! 安全：id 字符集限定 `[A-Za-z0-9._-]`、拒绝 `.`/`..`、再做前缀包含检查。

use std::path::{Path as FsPath, PathBuf};

use axum::extract::{Path, Query, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};

use crate::proxy::AppState;

/// `GET /media/{name}` 查询参数。
#[derive(Debug, Default, serde::Deserialize)]
pub struct MediaQuery {
    /// 媒体所属上游名（前端按消息来源 core 附加；缺省 = 按注册表顺序
    /// 尝试全部 SSH 上游）。仅作优先级提示——本地命中永远优先。
    pub core: Option<String>,
}

/// `GET /media/{name}`：按名读取媒体文件。
///
/// 取图顺序（2026-10 SSH 接入）：
/// 1. **本地媒体库**（同机 Core 落盘 / 之前拉取的缓存命中——缓存命中在
///    [`crate::ssh::SshTunnels::fetch_media`] 内部走快路径）；
/// 2. **SSH 上游远端拉取**（`?core=` 提示优先，其余 SSH 上游顺序兜底；
///    拉回后落本地缓存，后续请求直接命中）。
///
/// 未配置 SSH 的远端 Core 无法取图（既有约束：媒体目录只在 Core 本机）——
/// 与改造前行为一致（404）。
pub async fn media_handler(
    Path(name): Path<String>,
    Query(query): Query<MediaQuery>,
    State(state): State<AppState>,
) -> Response {
    if !valid_media_id(&name) {
        return not_found();
    }
    if let Some(response) = read_local(&state.media_dir, &name).await {
        return response;
    }
    if let Some(response) = fetch_remote(&state, &name, query.core.as_deref()).await {
        return response;
    }
    not_found()
}

/// 本地媒体库直读（目录穿越防护 + 强缓存头）。
async fn read_local(root: &str, name: &str) -> Option<Response> {
    let root = PathBuf::from(root);
    let file = root.join(name);
    if !file.starts_with(&root) {
        return None;
    }
    let bytes = tokio::fs::read(&file).await.ok()?;
    Some(serve_bytes(bytes, &file))
}

/// 经 SSH 隧道从远端上游拉取（按提示 core 优先，其余顺序兜底）。
async fn fetch_remote(state: &AppState, id: &str, hint: Option<&str>) -> Option<Response> {
    let upstreams = state.registry.list().await;
    let mut candidates: Vec<String> = Vec::new();
    if let Some(hint) = hint {
        if upstreams.iter().any(|u| u.name == hint && u.ssh.is_some()) {
            candidates.push(hint.to_string());
        }
    }
    for upstream in &upstreams {
        if upstream.ssh.is_some() && !candidates.iter().any(|name| name == &upstream.name) {
            candidates.push(upstream.name.clone());
        }
    }
    for name in candidates {
        match state.tunnels.fetch_media(&name, id).await {
            Ok(path) => {
                let bytes = tokio::fs::read(&path).await.ok()?;
                return Some(serve_bytes(bytes, &path));
            }
            Err(error) => {
                // 远端没有/读取失败 → 试下一个上游（未配置 SSH 的上游
                // 根本无法取图，不在此列）。
                tracing::debug!(upstream = %name, media = %id, %error, "remote media fetch failed");
            }
        }
    }
    None
}

fn serve_bytes(bytes: Vec<u8>, file: &FsPath) -> Response {
    Response::builder()
        .header(CONTENT_TYPE, media_content_type(file))
        .header(CACHE_CONTROL, "public, max-age=31536000, immutable")
        .body(axum::body::Body::from(bytes))
        .unwrap_or_else(|_| not_found())
}

/// 媒体 id 校验（字符集 + 非 `.`/`..`）。
pub fn valid_media_id(name: &str) -> bool {
    !name.is_empty()
        && name != "."
        && name != ".."
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
}

/// 媒体文件的 Content-Type（按扩展名；未知回退八位字节流）。
pub fn media_content_type(file: &std::path::Path) -> HeaderValue {
    let mime = match file
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("gif") => "image/gif",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("svg") => "image/svg+xml",
        Some("avif") => "image/avif",
        _ => "application/octet-stream",
    };
    HeaderValue::from_static(mime)
}

fn not_found() -> Response {
    (
        StatusCode::NOT_FOUND,
        [(CONTENT_TYPE, "text/plain; charset=utf-8")],
        "not found",
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn media_id_validation() {
        assert!(valid_media_id("abc123.png"));
        assert!(valid_media_id("a-b_c.9.webp"));
        assert!(!valid_media_id(""));
        assert!(!valid_media_id("."));
        assert!(!valid_media_id(".."));
        assert!(!valid_media_id("a/b.png"));
        assert!(!valid_media_id("..%2fetc"));
        assert!(!valid_media_id("a b.png"));
    }

    #[test]
    fn content_type_by_extension() {
        let cases = [
            ("a.png", "image/png"),
            ("a.gif", "image/gif"),
            ("a.jpg", "image/jpeg"),
            ("a.jpeg", "image/jpeg"),
            ("a.webp", "image/webp"),
            ("a.bin", "application/octet-stream"),
            ("noext", "application/octet-stream"),
        ];
        for (name, expected) in cases {
            assert_eq!(
                media_content_type(std::path::Path::new(name)),
                HeaderValue::from_static(expected),
                "{name}"
            );
        }
    }
}
