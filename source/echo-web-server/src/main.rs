//! EchoAgentPanel — Web 面板（React 前端 + Rust 后端）。
//!
//! 后端是一个 axum HTTP/WS 服务：托管构建后的前端静态文件，并把浏览器的
//! WebSocket 中继到 EchoAgentCore 的 management WS（`ws://127.0.0.1:3132`）。
//! 中继按原文转发帧，sudo 密码帧不解析、不落日志。

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::Result;
use axum::extract::{OriginalUri, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use clap::Parser;
use echo_web_server::config::PanelConfig;
use echo_web_server::log;
use echo_web_server::proxy;
use echo_web_server::qq;
use tracing::info;
use tracing_subscriber::EnvFilter;

/// EchoAgentPanel — web UI server for a remote EchoAgentCore.
#[derive(Debug, Parser)]
#[command(version, about)]
struct Args {
    /// Path to the TOML configuration file.
    /// Default: config/echo-agent-panel.toml
    #[arg(short, long)]
    config: Option<PathBuf>,
    /// Override the HTTP/WS bind address (e.g. `127.0.0.1:8080`).
    #[arg(long)]
    bind: Option<String>,
    /// Override the Core management WebSocket address.
    /// e.g. `--core ws://127.0.0.1:3132`
    #[arg(long)]
    core: Option<String>,
    /// Override the static frontend directory (built `web/dist`).
    #[arg(long)]
    static_dir: Option<PathBuf>,
}

impl Args {
    fn config_path(&self) -> PathBuf {
        self.config
            .clone()
            .unwrap_or_else(|| PathBuf::from("config/echo-agent-panel.toml"))
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let path = args.config_path();
    let cfg = PanelConfig::load(&path)?;
    init_tracing(&cfg.logging)?;

    let bind = args.bind.unwrap_or(cfg.server.bind_address);
    let core_url = args.core.unwrap_or(cfg.core.connect_url);
    let static_dir = args
        .static_dir
        .unwrap_or_else(|| PathBuf::from(&cfg.server.static_dir));

    let state = proxy::AppState {
        core_url: Arc::from(core_url.as_str()),
        static_dir: Arc::from(static_dir.to_string_lossy().into_owned().as_str()),
        qq: cfg.qq.clone(),
    };

    let app = Router::new()
        .route("/ws", get(proxy::ws_handler))
        .route("/api/qq/login-status", get(qq::login_status))
        .route("/api/qq/qrcode", get(qq::qrcode))
        .route("/api/logs/panel", get(log::panel_logs))
        .route("/api/logs/core", get(log::core_logs))
        .fallback(static_handler)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .unwrap_or_else(|error| panic!("cannot bind {bind}: {error}"));
    info!(%bind, %core_url, static_dir = %static_dir.display(), "EchoAgentPanel web server listening");
    axum::serve(listener, app).await?;
    Ok(())
}

/// Serve a static file from the frontend build; `/` maps to `index.html`.
async fn static_handler(uri: OriginalUri, State(state): State<proxy::AppState>) -> Response {
    let root = PathBuf::from(state.static_dir.as_ref());
    let requested = uri.path().trim_start_matches('/');
    let relative = if requested.is_empty() {
        "index.html"
    } else {
        requested
    };
    let file = root.join(relative);
    // Guard against path traversal outside the static root.
    if !file.starts_with(&root) {
        return not_found();
    }
    if file.is_dir() {
        return not_found();
    }
    // HTML 永不缓存（SPA shell 每次最新）；带 hash 的静态资源（js/css）
    // 允许短缓存并附带 ETag 校验，更新后浏览器自动取新版本。
    let is_html = file.extension().and_then(|e| e.to_str()) == Some("html");
    let cache_control = if is_html {
        "no-cache"
    } else {
        "public, max-age=300"
    };
    match tokio::fs::read(&file).await {
        Ok(bytes) => Response::builder()
            .header(CONTENT_TYPE, content_type(&file))
            .header(CACHE_CONTROL, cache_control)
            .body(axum::body::Body::from(bytes))
            .unwrap_or_else(|_| not_found()),
        Err(_) => {
            // SPA fallback: unknown routes serve the app shell.
            match tokio::fs::read(root.join("index.html")).await {
                Ok(bytes) => Response::builder()
                    .header(CONTENT_TYPE, "text/html; charset=utf-8")
                    .header(CACHE_CONTROL, "no-cache")
                    .body(axum::body::Body::from(bytes))
                    .unwrap_or_else(|_| not_found()),
                Err(_) => not_found(),
            }
        }
    }
}

fn content_type(file: &std::path::Path) -> HeaderValue {
    let mime = match file.extension().and_then(|ext| ext.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("ico") => "image/x-icon",
        Some("woff2") => "font/woff2",
        Some("map") => "application/json",
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

fn init_tracing(logging: &echo_web_server::config::LoggingSection) -> Result<()> {
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&logging.level));
    let builder = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false);
    match logging.format.as_str() {
        "json" => builder.json().try_init(),
        _ => builder.try_init(),
    }
    .map_err(|error| anyhow::anyhow!("failed to init tracing: {error}"))?;
    Ok(())
}
