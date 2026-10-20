//! EchoAgentPanel — Web 面板（Vue 3 前端 + Rust 后端）。
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
use tracing::{info, warn};
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
    let media_cache_dir = cfg.server.effective_media_cache_dir();
    // 上游列表同样在任何部分移动前物化（见下「上游物化」注释）。
    let upstream_list = cfg.upstreams();
    let config_path_for_persist = args.config_path();
    let cli_core: Option<String> = args.core.clone();
    let cli_override = cli_core.is_some();
    let bind = args.bind.unwrap_or(cfg.server.bind_address);
    let static_dir = args
        .static_dir
        .unwrap_or_else(|| PathBuf::from(&cfg.server.static_dir));
    // 上游注册表（管理面 + 运行时唯一事实来源，2026-10）：命令行
    // --core 覆盖全部配置（单上游，且**不**写回配置文件——临时覆盖语义）；
    // 否则 [[cores]]（可空 = 零上游部署，设置页在线添加）；[core] 单上游
    // 物化为名为 "core" 的一条。
    let initial: Vec<echo_web_server::upstreams::UpstreamConfig> = match cli_core {
        Some(url) => vec![echo_web_server::upstreams::UpstreamConfig {
            name: "core".to_string(),
            url,
            access_token: cfg.core.access_token.clone(),
            ssh: None,
        }],
        None => {
            // 启动物化校验：空名/非法名拒绝、重名去重（保留首条）——
            // 重名上游会让 links 表互相覆盖、清理任务误删活者表项。
            let mut seen = std::collections::HashSet::new();
            upstream_list
                .into_iter()
                .filter_map(|u| {
                    if u.name.is_empty() || u.name.chars().any(|c| c.is_whitespace() || c == ':') {
                        warn!(name = %u.name, "invalid upstream name in config, skipped");
                        return None;
                    }
                    if !seen.insert(u.name.clone()) {
                        warn!(name = %u.name, "duplicate upstream name in config, kept first");
                        return None;
                    }
                    Some(echo_web_server::upstreams::UpstreamConfig {
                        name: u.name,
                        url: u.url,
                        access_token: u.access_token,
                        ssh: u.ssh,
                    })
                })
                .collect()
        }
    };
    let upstream_desc = if initial.is_empty() {
        "(none — 在设置·Core 连接中添加)".to_string()
    } else {
        initial
            .iter()
            .map(|u| match &u.ssh {
                Some(ssh) => format!("{}=ssh://{}@{}:{}", u.name, ssh.user, ssh.host, ssh.port),
                None => format!("{}={}", u.name, u.url),
            })
            .collect::<Vec<_>>()
            .join(", ")
    };
    // 命令行 --core 为临时覆盖：不写回配置（persist = None）。
    let persist_path = if cli_override {
        None
    } else {
        Some(config_path_for_persist)
    };
    let registry = echo_web_server::upstreams::UpstreamRegistry::new(initial, persist_path);

    // SSH 接入（2026-10）：为每个 SSH 上游预建隧道——本地转发端口即时
    // 可拨（中继异步重连），SSH 建连/认证在后台进行，状态经健康表/管理
    // API 上报。无效配置仅告警（面板仍可在线修正）。
    let tunnels = echo_web_server::ssh::SshTunnels::new(media_cache_dir);
    for upstream in registry.list().await {
        if let Some(ssh) = &upstream.ssh {
            if let Err(message) = tunnels.ensure(&upstream.name, ssh).await {
                warn!(upstream = %upstream.name, %message, "ssh upstream disabled (invalid config)");
            }
        }
    }

    let state = proxy::AppState::new(
        registry,
        Arc::from(static_dir.to_string_lossy().into_owned().as_str()),
        Arc::from(media_dir.to_string_lossy().into_owned().as_str()),
        Arc::from(cfg.server.access_token.as_str()),
        tunnels,
    );
    if !cfg.server.access_token.is_empty() {
        info!("access token auth enabled for WS/HTTP API");
    } else if !bind.starts_with("127.0.0.1") && !bind.starts_with("localhost") {
        warn!("no access token configured and not bound to localhost — panel is OPEN to the network; set [server] access_token");
    }

    // 注册表级常驻探活（健康表真实可达性，不依赖浏览器连接）。
    tokio::spawn(proxy::probe_pump(state.clone()));

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
        .merge(echo_web_server::upstreams_api::routes())
        // Bearer 认证（token 非空时；静态前端豁免以加载登录页）。
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            echo_web_server::upstreams_api::require_auth,
        ))
        .fallback(echo_web_server::static_files::static_handler)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .unwrap_or_else(|error| panic!("cannot bind {bind}: {error}"));
    info!(%bind, upstreams = %upstream_desc, static_dir = %static_dir.display(), "EchoAgentPanel web server listening");
    axum::serve(listener, app).await?;
    Ok(())
}

fn init_tracing(logging: &echo_web_server::config::LoggingSection) -> Result<()> {
    install_panic_hook();
    // 面板只有 stdout/journald 一个出口：`log_file` 在 Panel 侧尚未实现
    // 轮转写入（Core 有）。配了却静默失效最坑排障，所以明确提示一次。
    if !logging.log_file.is_empty() {
        eprintln!(
            "warning: [logging].log_file = \"{}\" is not supported by panel; \
             logs go to stdout/journald (use `journalctl --user -u echo-agent-panel`)",
            logging.log_file
        );
    }
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&logging.level));
    // ANSI 只在真正的终端上开：journald / 重定向到文件时着色只会把结构化
    // 字段拆成转义序列（`grep error=` 直接失效）。
    let builder = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .with_ansi(std::io::IsTerminal::is_terminal(&std::io::stdout()));
    match logging.format.as_str() {
        "json" => builder.json().try_init(),
        _ => builder.try_init(),
    }
    .map_err(|error| anyhow::anyhow!("failed to init tracing: {error}"))?;
    Ok(())
}

/// panic 兜底：panic 先转一条 `ERROR` 事件再走默认钩子（保留 stderr 追溯）。
fn install_panic_hook() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        tracing::error!(panic = %info, "panic caught by logging hook");
        default_hook(info);
    }));
}
