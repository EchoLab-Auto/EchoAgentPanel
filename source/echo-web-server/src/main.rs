//! EchoAgentPanel — Web 面板（React 前端 + Rust 后端）。
//!
//! 后端是一个 axum HTTP/WS 服务：托管构建后的前端静态文件，并把浏览器的
//! WebSocket 中继到 EchoAgentCore 的 management WS（`ws://127.0.0.1:3132`）。
//! 中继按原文转发帧，不解析、不落日志。

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::Result;
use axum::routing::get;
use axum::Router;
use clap::Parser;
use echo_web_server::config::PanelConfig;
use echo_web_server::log;
use echo_web_server::proxy;
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

    // 媒体目录要在 `cfg.server` 被部分移动前解析（effective_media_dir 借用）。
    let media_dir = cfg.server.effective_media_dir();
    let bind = args.bind.unwrap_or(cfg.server.bind_address);
    let core_url = args.core.unwrap_or(cfg.core.connect_url);
    let static_dir = args
        .static_dir
        .unwrap_or_else(|| PathBuf::from(&cfg.server.static_dir));

    let state = proxy::AppState {
        core_url: Arc::from(core_url.as_str()),
        core_access_token: Arc::from(cfg.core.access_token.as_str()),
        static_dir: Arc::from(static_dir.to_string_lossy().into_owned().as_str()),
        media_dir: Arc::from(media_dir.to_string_lossy().into_owned().as_str()),
    };

    let app = Router::new()
        .route("/ws", get(proxy::ws_handler))
        // 媒体库：Core 落盘的入站图片（`/media/<id>`）。必须在静态 fallback
        // 之前注册，否则会被 SPA shell 兜底吞掉。
        .route("/media/{name}", get(echo_web_server::media::media_handler))
        // HTTP 旁路仅有日志两条；QQ 登录状态/二维码自 2026-09-13 起由
        // Core 代理（WS 命令 RequestQqLoginStatus / RequestQqQrcode），
        // 无 /api/qq/* 路由。
        .route("/api/logs/panel", get(log::panel_logs))
        .route("/api/logs/core", get(log::core_logs))
        .fallback(echo_web_server::static_files::static_handler)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .unwrap_or_else(|error| panic!("cannot bind {bind}: {error}"));
    info!(%bind, %core_url, static_dir = %static_dir.display(), "EchoAgentPanel web server listening");
    axum::serve(listener, app).await?;
    Ok(())
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
