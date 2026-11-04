//! EchoAgentPanel — Web 面板（Vue 3 前端 + Rust 后端）。
//!
//! 后端是一个 axum HTTP/WS 服务：托管构建后的前端静态文件，并把浏览器的
//! WebSocket 中继到 EchoAgentCore 的 management WS（`ws://127.0.0.1:3132`）。
//! 中继按原文转发帧，不解析、不落日志。

use anyhow::Result;
use clap::Parser;
use echo_web_server::config::PanelConfig;
use std::path::PathBuf;
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

    // 独立外壳与 Core 的进程内插件共用同一个运行库；这里只保留
    // CLI 覆盖、日志初始化与“等它停”的外壳职责。
    let mut runtime = echo_web_server::runtime::PanelRuntimeConfig::from_panel_config(cfg);
    runtime.config_file = Some(args.config_path());
    if let Some(bind) = args.bind {
        runtime.bind = bind;
    }
    if let Some(static_dir) = args.static_dir {
        runtime.static_dir = static_dir;
    }
    if let Some(core) = args.core {
        // --core 是临时单上游覆盖：不写回配置文件。
        runtime.config_file = None;
        runtime.core = core;
    }
    let running = echo_web_server::runtime::PanelRuntime::start_async(runtime).await?;
    running.stopped().await;
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
