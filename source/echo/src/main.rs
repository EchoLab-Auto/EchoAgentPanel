//! EchoAgentPanel — extensible agent framework with optional platform adapters.
//!
//! Default (no adapters): terminal UI only.
//! Add `[adapters.qq] enabled = true` to your config to enable QQ.

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use clap::Parser;
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

mod config;
mod handlers;
mod management;

use config::load;
use echo_adapter::traits::Adapter;
use echo_server::ConnectionTracker;

/// EchoAgentPanel — extensible agent with optional platform adapters.
#[derive(Debug, Parser)]
#[command(version, about)]
struct Args {
    /// Path to the TOML configuration file.
    #[arg(short, long, default_value = "config/echo-agent-panel.toml")]
    config: PathBuf,
    /// Run without the terminal UI (server only).
    #[arg(long)]
    headless: bool,
    /// Connect to a remote Core via WebSocket instead of running in-process.
    /// e.g. `--connect ws://127.0.0.1:3132`
    #[arg(long)]
    connect: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // ── Panel-only mode: connect to remote Core via WS, run TUI ──
    if let Some(ref core_url) = args.connect {
        init_tracing_simple()?;
        let theme = echo_tui::Theme::dark();
        match echo_tui::Backend::connect_ws(core_url).await {
            Ok(backend) => {
                if let Err(e) = echo_tui::run_tui_ws(backend, theme).await {
                    tracing::warn!(error = %e, "tui terminated");
                }
            }
            Err(e) => {
                tracing::warn!(error = %e, "failed to connect to Core");
                anyhow::bail!("Cannot connect to Core at {core_url}: {e}");
            }
        }
        return Ok(());
    }

    let config = load(&args.config)?;
    init_tracing(&config.logging, config.tui.enabled && !args.headless)?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);
    let tracker = ConnectionTracker::default();

    // ---- agent framework ----
    let skills = echo_agent::SkillRegistry::discover(&config.agent.skills_dir)
        .map_err(|e| anyhow::anyhow!("failed to load skills: {e}"))?;
    info!(skills = ?skills.names(), "skills discovered");

    let mut provider_cfg = config.agent.clone();
    provider_cfg.apply_active_profile();
    // Fallback: if top-level provider is still empty but profiles exist, use the first one.
    if provider_cfg.provider.is_empty() {
        if let Some(first) = provider_cfg.api_profiles.first() {
            provider_cfg.provider = first.provider.clone();
            provider_cfg.model = first.model.clone();
            provider_cfg.base_url = first.base_url.clone();
            provider_cfg.api_key = first.api_key.clone();
            info!(name = %first.name, "auto-applied first API profile");
        }
    }
    provider_cfg.api_key = provider_cfg.effective_api_key();
    provider_cfg.base_url = provider_cfg.effective_base_url();

    if provider_cfg.api_key.is_empty() {
        let env_var = match provider_cfg.provider.as_str() {
            "deepseek" => "DEEPSEEK_API_KEY",
            "anthropic" | "claude" => "ANTHROPIC_API_KEY",
            _ => "OPENAI_API_KEY",
        };
        warn!("API key not set — use /api key <key> in TUI or set {env_var} env var");
    } else {
        info!("API key is configured (length={})", provider_cfg.api_key.len());
    }

    let provider = echo_agent::llm::create_provider(&provider_cfg)?;
    info!(provider = %provider_cfg.provider, model = %provider_cfg.model, "llm provider ready");

    // Tools — platform-independent.
    let mut tools = echo_agent::ToolRegistry::new();

    // Adapter registry.
    let mut adapter_registry = echo_adapter::AdapterRegistry::new();

    // ---- QQ adapter (always registered, auto-started only when enabled) ----
    let qq_adapter: Arc<echo_adapter_qq::QqAdapter> =
        Arc::new(echo_adapter_qq::QqAdapter::new(config.qq_adapter.clone()));
    echo_adapter_qq::register_qq_tools(&mut tools, qq_adapter.clone());
    adapter_registry.register(qq_adapter.clone());
    if config.qq_adapter.enabled {
        info!("QQ adapter configured — will auto-start");
    } else {
        info!("QQ adapter registered — use /adapters → [s] start in TUI");
    }

    let adapters = Arc::new(adapter_registry);

    // Register built-in tools (needs adapter registry for adapter management tools).
    let workspace = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    echo_agent::tool::builtin::register_all(&mut tools, adapters.clone(), workspace);

    // Create the agent.
    let agent = echo_agent::Agent::new(
        Arc::from(provider),
        config.agent.clone(),
        skills,
        tools,
        adapters,
    );
    agent.set_config_path(args.config.clone());

    // ---- Frontend bridge (TUI / management WS) ----
    let needs_bridge = config.tui.enabled || args.headless;
    let (bridge, handle): (Option<Arc<echo_agent::BackendBridge>>, _) = if needs_bridge {
        let (b, h) = echo_agent::create_bridge();
        (Some(Arc::new(b)), Some(Arc::new(h)))
    } else {
        (None, None)
    };

    if let Some(handle) = handle {
        agent.attach(handle);
    }

    let agent = Arc::new(agent);
    // Restore persisted sessions and start periodic save.
    let restored = agent.load_sessions().await;
    if restored > 0 {
        info!(restored, "sessions restored from disk");
    }
    agent.start_session_save_task();

    // ---- Wire agent into QQ adapter ----
    qq_adapter.set_config_path(args.config.to_string_lossy().to_string());
    qq_adapter.set_agent(agent.clone());
    qq_adapter.add_handler(Box::new(handlers::EchoHandler::new(&config.bot.command_prefix)));
    qq_adapter.add_handler(Box::new(handlers::HelpHandler::new(&config.bot.command_prefix)));
    qq_adapter.add_handler(Box::new(handlers::AdminHandler::new(
        &config.bot.command_prefix,
        config.bot.owner_qq,
        shutdown_tx,
        tracker.clone(),
    )));

    // ---- Command pump ----
    let pump_agent = agent.clone();
    let pump = tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(100));
        loop {
            interval.tick().await;
            while let Some(cmd) = pump_agent.try_recv_command() {
                pump_agent.apply_command(cmd).await;
            }
        }
    });

    // ---- Auto-start QQ adapter if enabled ----
    if config.qq_adapter.enabled {
        qq_adapter.start().await.map_err(|e| anyhow::anyhow!("QQ adapter start failed: {e}"))?;
    }

    // ---- Management WS server (for remote Panel in headless mode) ----
    if args.headless {
        let mgmt_addr = config.core.management_address.clone();
        let mgmt_agent = agent.clone();
        let mgmt_bridge = bridge.clone();
        tokio::spawn(async move {
            if let Some(b) = mgmt_bridge {
                if let Err(e) = management::serve(&mgmt_addr, b, mgmt_agent).await {
                    warn!(error = %e, "management WS server stopped");
                }
            }
        });
    }

    // ---- TUI ----
    let tui_theme = if config.tui.theme == "light" {
        echo_tui::Theme::light()
    } else {
        echo_tui::Theme::dark()
    };

    let tui_task = bridge.map(|bridge| tokio::spawn(async move {
            if let Err(e) = echo_tui::run_tui(bridge, tui_theme).await {
                warn!(error = %e, "tui terminated");
            }
        }));

    // ---- Main loop ----
    let tui_exit = async {
        if let Some(t) = tui_task {
            let _ = t.await;
        } else {
            std::future::pending::<()>().await
        }
    };

    tokio::select! {
        _ = shutdown_signal() => info!("shutdown signal received, exiting"),
        _ = shutdown_rx.changed() => info!("shutdown requested by admin command, exiting"),
        _ = tui_exit => info!("tui exited, shutting down"),
    }

    drop(pump);
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c().await.expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

/// TUI occupies stdout, so logs must avoid it: TUI mode → file, headless → stdout.
/// Minimal tracing setup for Panel-only mode (logs to stderr).
fn init_tracing_simple() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .init();
    Ok(())
}

fn init_tracing(cfg: &config::LoggingSection, tui_running: bool) -> Result<()> {
    use anyhow::Context as _;
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&cfg.level));
    if tui_running {
        let path = if cfg.log_file.is_empty() {
            PathBuf::from("logs/echo-agent-panel.log")
        } else {
            PathBuf::from(&cfg.log_file)
        };
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).ok();
        }
        let file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .with_context(|| format!("failed to open log file {}", path.display()))?;
        eprintln!("logging to: {}", path.display());
        init_subscriber(cfg, filter, std::sync::Mutex::new(file), false)
    } else {
        init_subscriber(cfg, filter, std::io::stdout, true)
    }
}

fn init_subscriber<W>(
    cfg: &config::LoggingSection,
    filter: EnvFilter,
    writer: W,
    ansi: bool,
) -> Result<()>
where
    W: for<'a> tracing_subscriber::fmt::MakeWriter<'a> + 'static + Send + Sync,
{
    let builder = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .with_ansi(ansi)
        .with_writer(writer);
    match cfg.format.as_str() {
        "json" => builder.json().try_init().map_err(anyhow::Error::msg)?,
        _ => builder.try_init().map_err(anyhow::Error::msg)?,
    }
    Ok(())
}
