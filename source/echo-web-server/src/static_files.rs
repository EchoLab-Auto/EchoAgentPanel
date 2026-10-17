//! 静态资源路由：gzip 协商、弱 ETag/304 与分路径缓存策略。
//!
//! 背景（2026-09 刷新加速实测）：前端打包后 js/css 合计 1MB+，原先无压缩、
//! 无 ETag —— 缓存 5 分钟过期后或硬刷新时，浏览器每次都要重下全量，在
//! 局域网/慢机上肉眼可见地拖慢面板打开。本模块三件事：
//!
//! - **按路径分级的缓存策略**：`assets/` 下的文件名含内容哈希，字节永不
//!   变化 → `max-age=31536000, immutable`（更新即换名，无需过期重下）；
//!   HTML（SPA shell）保持 `no-store`；其余给短缓存 + ETag 兜底。
//! - **gzip 协商**：≥1KB 的文本资源（js/css/html/json/svg/map）在
//!   `Accept-Encoding: gzip` 时压缩发送；压缩结果按 (路径, mtime, 大小)
//!   进程内缓存，命中零开销。
//! - **弱 ETag + `If-None-Match` → 304**：协商缓存让"缓存过期但内容未变"
//!   的场景不再重下字节。

use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::{OriginalUri, State};
use axum::http::header::{
    ACCEPT_ENCODING, CACHE_CONTROL, CONTENT_ENCODING, CONTENT_TYPE, ETAG, IF_NONE_MATCH, VARY,
};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};

use crate::proxy::AppState;

/// 小于该大小的文件不做 gzip（省不了多少，还多一层解压开销）。
const GZIP_MIN_BYTES: u64 = 1024;
/// gzip 产出缓存的条目上限（静态目录文件数有限，防御性封顶）。
const GZIP_CACHE_MAX: usize = 128;

struct GzipEntry {
    modified: SystemTime,
    plain_len: u64,
    body: Arc<Vec<u8>>,
}

fn gzip_cache() -> &'static Mutex<HashMap<PathBuf, GzipEntry>> {
    static CACHE: OnceLock<Mutex<HashMap<PathBuf, GzipEntry>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// `GET /<path>` —— 静态文件；找不到时回退 SPA shell（客户端路由）。
pub async fn static_handler(
    uri: OriginalUri,
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Response {
    let root = PathBuf::from(state.static_dir.as_ref());
    let requested = uri.path().trim_start_matches('/');
    let relative = if requested.is_empty() {
        "index.html"
    } else {
        requested
    };
    let file = root.join(relative);
    // Guard against path traversal outside the static root.
    if !file.starts_with(&root) || file.is_dir() {
        return not_found();
    }
    // 读不到（不存在）→ SPA 兜底：未知**路由**给 app shell；但看起来是
    // 静态资源的路径（`assets/` 前缀或带非 html 扩展名）必须 404——
    // 否则部署后旧标签页请求旧哈希 chunk 会拿到 200 text/html，动态
    // import 失败、异步组件永久空白（2026-10 弹层空白故障根因）。
    let served = if tokio::fs::metadata(&file).await.is_ok() {
        file
    } else {
        if looks_like_asset(relative) {
            return missing_asset();
        }
        let shell = root.join("index.html");
        if !shell.starts_with(&root) {
            return not_found();
        }
        shell
    };
    serve_file(&root, served, &headers).await
}

async fn serve_file(root: &Path, file: PathBuf, headers: &HeaderMap) -> Response {
    let metadata = match tokio::fs::metadata(&file).await {
        Ok(metadata) => metadata,
        Err(_) => return not_found(),
    };
    let modified = metadata.modified().unwrap_or(UNIX_EPOCH);
    let plain_len = metadata.len();
    let etag = etag_for(modified, plain_len);
    let in_assets = file
        .strip_prefix(root)
        .map(|relative| relative.starts_with("assets"))
        .unwrap_or(false);
    let is_html = file.extension().and_then(|ext| ext.to_str()) == Some("html");
    let cache_control = if is_html {
        // HTML（SPA shell）禁止任何缓存：no-store 避免浏览器启发式缓存旧壳。
        "no-store, no-cache, must-revalidate"
    } else if in_assets {
        // 内容哈希文件名 → 永久强缓存；新构建换名，天然免过期。
        "public, max-age=31536000, immutable"
    } else {
        "public, max-age=300"
    };

    // 条件请求命中：304 空体（协商缓存），ETag/Cache-Control 照常回带。
    if let Some(if_none_match) = headers.get(IF_NONE_MATCH).and_then(|v| v.to_str().ok()) {
        if etag_matches(if_none_match, &etag) {
            return Response::builder()
                .status(StatusCode::NOT_MODIFIED)
                .header(ETAG, &etag)
                .header(CACHE_CONTROL, cache_control)
                .header(VARY, "accept-encoding")
                .body(axum::body::Body::empty())
                .unwrap_or_else(|_| not_found());
        }
    }

    let compressible =
        accepts_gzip(headers) && compressible_ext(&file) && plain_len >= GZIP_MIN_BYTES;
    if compressible {
        if let Some(body) = gzipped_body(&file, modified, plain_len).await {
            return Response::builder()
                .header(CONTENT_TYPE, content_type(&file))
                .header(CONTENT_ENCODING, "gzip")
                .header(VARY, "accept-encoding")
                .header(ETAG, &etag)
                .header(CACHE_CONTROL, cache_control)
                .body(axum::body::Body::from((*body).clone()))
                .unwrap_or_else(|_| not_found());
        }
    }

    match tokio::fs::read(&file).await {
        Ok(bytes) => Response::builder()
            .header(CONTENT_TYPE, content_type(&file))
            .header(VARY, "accept-encoding")
            .header(ETAG, &etag)
            .header(CACHE_CONTROL, cache_control)
            .body(axum::body::Body::from(bytes))
            .unwrap_or_else(|_| not_found()),
        Err(_) => not_found(),
    }
}

/// 取 gzip 产物：进程内缓存命中（路径 + mtime + 大小一致）则直接复用，
/// 否则现压并写入缓存。
async fn gzipped_body(file: &Path, modified: SystemTime, plain_len: u64) -> Option<Arc<Vec<u8>>> {
    if let Ok(cache) = gzip_cache().lock() {
        if let Some(entry) = cache.get(file) {
            if entry.modified == modified && entry.plain_len == plain_len {
                return Some(Arc::clone(&entry.body));
            }
        }
    }
    let plain = tokio::fs::read(file).await.ok()?;
    let compressed = gzip_bytes(&plain)?;
    let body = Arc::new(compressed);
    if let Ok(mut cache) = gzip_cache().lock() {
        if cache.len() >= GZIP_CACHE_MAX {
            cache.clear();
        }
        cache.insert(
            file.to_path_buf(),
            GzipEntry {
                modified,
                plain_len,
                body: Arc::clone(&body),
            },
        );
    }
    Some(body)
}

fn gzip_bytes(plain: &[u8]) -> Option<Vec<u8>> {
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::new(6));
    encoder.write_all(plain).ok()?;
    encoder.finish().ok()
}

/// 弱 ETag：`W/"<hex 长度>-<hex mtime 纳秒>"`。跨表示（gzip/identity）共用
/// 合规——弱校验只要求语义等价。
fn etag_for(modified: SystemTime, len: u64) -> String {
    let nanos = modified
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    format!("W/\"{len:x}-{nanos:x}\"")
}

/// `If-None-Match` 与当前 ETag 匹配（支持 `*`、多值列表与 W/ 前缀差异）。
fn etag_matches(header_value: &str, etag: &str) -> bool {
    header_value.split(',').any(|candidate| {
        let candidate = candidate.trim();
        if candidate == "*" {
            return true;
        }
        candidate == etag || candidate.trim_start_matches("W/") == etag.trim_start_matches("W/")
    })
}

/// `Accept-Encoding` 是否接受 gzip（显式 `q=0` 视为拒绝）。
fn accepts_gzip(headers: &HeaderMap) -> bool {
    let Some(value) = headers.get(ACCEPT_ENCODING).and_then(|v| v.to_str().ok()) else {
        return false;
    };
    value.split(',').any(|part| {
        let mut bits = part.trim().split(';');
        let name = bits.next().unwrap_or("").trim();
        if !name.eq_ignore_ascii_case("gzip") {
            return false;
        }
        let rejected = bits.any(|param| {
            let param = param.trim().replace(' ', "");
            param
                .strip_prefix("q=")
                .and_then(|q| q.parse::<f32>().ok())
                .map(|q| q <= 0.0)
                .unwrap_or(false)
        });
        !rejected
    })
}

fn compressible_ext(file: &Path) -> bool {
    matches!(
        file.extension().and_then(|ext| ext.to_str()),
        Some("js" | "css" | "html" | "json" | "webmanifest" | "svg" | "map" | "txt" | "xml")
    )
}

fn content_type(file: &Path) -> HeaderValue {
    let mime = match file.extension().and_then(|ext| ext.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") | Some("map") => "application/json",
        // PWA manifest（XR 巨幕模式 / 独立应用运行的清单）：浏览器推荐注册的
        // 专用 MIME；缺省 application/octet-stream 会被部分实现拒绝解析。
        Some("webmanifest") => "application/manifest+json",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("ico") => "image/x-icon",
        Some("woff2") => "font/woff2",
        _ => "application/octet-stream",
    };
    HeaderValue::from_static(mime)
}

/// 请求路径是否「看起来是静态资源」：`assets/` 前缀，或最后一段带
/// 扩展名且不是 html。路由式路径（`/`、`/settings`）返回 false。
fn looks_like_asset(relative: &str) -> bool {
    if relative.starts_with("assets/") || relative == "assets" {
        return true;
    }
    let last = relative.rsplit('/').next().unwrap_or("");
    match Path::new(last).extension().and_then(|ext| ext.to_str()) {
        Some(ext) => !ext.eq_ignore_ascii_case("html"),
        None => false,
    }
}

/// 缺失静态资源的 404：`no-store` 防止 404 被强缓存（新部署后同名
/// 资源出现时可立即生效）。
fn missing_asset() -> Response {
    let mut response = not_found();
    response
        .headers_mut()
        .insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
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
    fn webmanifest_is_manifest_json_and_gzip_capable() {
        // PWA manifest：浏览器要求（推荐）application/manifest+json；
        // 作为文本资源参与 gzip 协商（XR 巨幕模式的清单依赖此类型）。
        assert_eq!(
            content_type(Path::new("manifest.webmanifest"))
                .to_str()
                .unwrap(),
            "application/manifest+json"
        );
        assert!(compressible_ext(Path::new("manifest.webmanifest")));
    }

    #[test]
    fn existing_types_and_gzip_rules_stay_stable() {
        assert_eq!(
            content_type(Path::new("assets/app.js")).to_str().unwrap(),
            "text/javascript; charset=utf-8"
        );
        assert_eq!(
            content_type(Path::new("index.html")).to_str().unwrap(),
            "text/html; charset=utf-8"
        );
        assert_eq!(
            content_type(Path::new("icons/icon-192.png"))
                .to_str()
                .unwrap(),
            "image/png"
        );
        assert!(compressible_ext(Path::new("assets/app.css")));
        assert!(!compressible_ext(Path::new("icons/icon-192.png")));
    }

    #[test]
    fn asset_like_paths_are_detected() {
        assert!(looks_like_asset("assets/missing-abc.js"));
        assert!(looks_like_asset("assets/sub/dir"));
        assert!(looks_like_asset("icons/icon-old.png"));
        assert!(looks_like_asset("manifest.webmanifest"));
        assert!(!looks_like_asset("some/unknown/route"));
        assert!(!looks_like_asset("settings"));
        assert!(!looks_like_asset("page.html"));
        assert!(!looks_like_asset("assetsfoo/route"));
    }
}
