//! 媒体库 HTTP 路由：`GET /media/{name}` → Core 落盘的入站图片。
//!
//! 背景（2026-09-24）：Core 把 QQ 入站图片与面板上传图片落盘到媒体目录
//! （`~/.local/share/echo-agent-core/media`，内容哈希命名），链路上只传
//! `/media/<id>` 引用。浏览器 `<img>` 从这里取图——同源、可懒加载、
//! 可长期强缓存（名字含内容哈希，字节永不变化）。
//!
//! 安全：id 字符集限定 `[A-Za-z0-9._-]`、拒绝 `.`/`..`、再做前缀包含检查。

use std::path::PathBuf;

use axum::extract::{Path, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};

use crate::proxy::AppState;

/// `GET /media/{name}`：按名读取媒体文件。
pub async fn media_handler(Path(name): Path<String>, State(state): State<AppState>) -> Response {
    if !valid_media_id(&name) {
        return not_found();
    }
    let root = PathBuf::from(state.media_dir.as_ref());
    let file = root.join(&name);
    if !file.starts_with(&root) {
        return not_found();
    }
    match tokio::fs::read(&file).await {
        Ok(bytes) => Response::builder()
            .header(CONTENT_TYPE, media_content_type(&file))
            .header(CACHE_CONTROL, "public, max-age=31536000, immutable")
            .body(axum::body::Body::from(bytes))
            .unwrap_or_else(|_| not_found()),
        Err(_) => not_found(),
    }
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
