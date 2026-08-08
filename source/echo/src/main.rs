//! EchoAgentPanel — extensible agent framework with optional platform adapters.
//!
//! 分离部署：
//! - `--panel`（默认）: 终端 UI，通过 WebSocket 连接远程 Core。
//! - `--core`: Agent 核心，运行 QQ 适配器与 management WebSocket 服务。

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
mod qq_tools;

use config::{CoreConfig, PanelConfig};
use echo_adapter::traits::Adapter;
use echo_server::ConnectionTracker;

/// EchoAgentPanel — extensible agent with optional platform adapters.
#[derive(Debug, Parser)]
#[command(version, about)]
struct Args {
    /// Path to the TOML configuration file.
    /// Default: config/echo-agent-panel.toml (Panel) / echo-agent-core.toml (Core).
    #[arg(short, long)]
    config: Option<PathBuf>,
    /// Run as Core: agent + QQ adapter + management WS server (no TUI).
    #[arg(long, group = "mode")]
    core: bool,
    /// Run as Panel: TUI connecting to a remote Core (default).
    #[arg(long, group = "mode")]
    panel: bool,
    /// Override the Core WebSocket address (Panel mode).
    /// e.g. `--connect ws://127.0.0.1:3132`
    #[arg(long)]
    connect: Option<String>,
}

impl Args {
    /// Resolve the config path for the selected mode.
    fn config_path(&self) -> PathBuf {
        self.config.clone().unwrap_or_else(|| {
            if self.core {
                PathBuf::from("config/echo-agent-core.toml")
            } else {
                PathBuf::from("config/echo-agent-panel.toml")
            }
        })
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let path = args.config_path();
    if args.core {
        let cfg = CoreConfig::load(&path)?;
        run_core(args, cfg).await
    } else {
        let cfg = PanelConfig::load(&path)?;
        run_panel(args, cfg).await
    }
}

// ── Panel 模式：TUI + 远程 Core ────────────────────────────────────────────

async fn run_panel(args: Args, cfg: PanelConfig) -> Result<()> {
    init_tracing(&cfg.logging, cfg.tui.enabled)?;

    let core_url = args.connect.unwrap_or(cfg.core.connect_url);
    let theme = if cfg.tui.theme == "light" {
        echo_tui::Theme::light()
    } else {
        echo_tui::Theme::dark()
    };

    info!(core = %core_url, theme = %cfg.tui.theme, "connecting to Core");
    match echo_tui::Backend::connect_ws(&core_url).await {
        Ok(backend) => {
            if let Err(e) = echo_tui::run_tui_ws(backend, theme).await {
                warn!(error = %e, "tui terminated");
            }
        }
        Err(e) => {
            warn!(error = %e, "failed to connect to Core");
            anyhow::bail!("Cannot connect to Core at {core_url}: {e}");
        }
    }
    Ok(())
}

// ── Core 模式：Agent + QQ 适配器 + management WS 服务 ──────────────────────

async fn run_core(args: Args, cfg: CoreConfig) -> Result<()> {
    init_tracing(&cfg.logging, false)?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);
    let tracker = ConnectionTracker::default();

    // ---- agent framework ----
    let skills = echo_agent::SkillRegistry::discover(&cfg.agent.skills_dir)
        .map_err(|e| anyhow::anyhow!("failed to load skills: {e}"))?;
    info!(skills = ?skills.names(), "skills discovered");

    let mut provider_cfg = cfg.agent.clone();
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
        warn!("API key not set — use /api key <key> in Panel or set {env_var} env var");
    } else {
        info!(
            "API key is configured (length={})",
            provider_cfg.api_key.len()
        );
    }

    let provider = echo_agent::llm::create_provider(&provider_cfg)?;
    info!(provider = %provider_cfg.provider, model = %provider_cfg.model, "llm provider ready");

    // Tools — platform-independent.
    let mut tools = echo_agent::ToolRegistry::new();

    // Adapter registry.
    let mut adapter_registry = echo_adapter::AdapterRegistry::new();

    // ---- QQ adapter (always registered, auto-started only when enabled) ----
    let qq_adapter: Arc<echo_adapter_qq::QqAdapter> =
        Arc::new(echo_adapter_qq::QqAdapter::new(cfg.qq_adapter.clone()));
    crate::qq_tools::register_qq_tools(&mut tools, qq_adapter.clone());
    adapter_registry.register(qq_adapter.clone());
    if cfg.qq_adapter.enabled {
        info!("QQ adapter configured — will auto-start");
    } else {
        info!("QQ adapter registered — use /adapters → [s] start in Panel");
    }

    let adapters = Arc::new(adapter_registry);

    // Register built-in tools (needs adapter registry for adapter management tools).
    let workspace = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    echo_agent::tool::builtin::register_all(&mut tools, adapters.clone(), workspace);

    // The configured QQ owner is also an update administrator. Additional
    // administrators can be listed under `[agent.self_update]`.
    let mut agent_config = cfg.agent.clone();
    if cfg.qq_adapter.owner_qq > 0 {
        let owner = cfg.qq_adapter.owner_qq as u64;
        if !agent_config.self_update.allowed_qq_users.contains(&owner) {
            agent_config.self_update.allowed_qq_users.push(owner);
        }
    }
    info!(
        memory_limit_tokens = agent_config.effective_memory_limit_tokens(),
        "agent context policy: single global trunk (token-budget trimmed)"
    );

    // Create the agent.
    let agent = echo_agent::Agent::new(Arc::from(provider), agent_config, skills, tools, adapters);
    // One shared ConfigStore: Agent (`[agent]`) and QqAdapter
    // (`[adapters.qq]`) persist through the same store, so concurrent TOML
    // writes cannot lose each other's sections.
    let config_store = echo_adapter::ConfigStore::new(args.config_path());
    agent.set_config_store(config_store.clone());

    // ---- Frontend bridge (management WS) ----
    let (bridge, handle) = echo_agent::create_bridge();
    let bridge = Arc::new(bridge);
    agent.attach(Arc::new(handle));

    let agent = Arc::new(agent);
    // Restore persisted sessions and start periodic save.
    let restored = agent.load_sessions().await;
    if restored > 0 {
        info!(restored, "sessions restored from disk");
    }
    agent.start_session_save_task();
    agent.start_skill_reload_task().await;
    agent.start_orchestration_task();

    // ---- Wire agent into QQ adapter ----
    qq_adapter.set_config_store(config_store.clone());
    // QQ events enter through a one-way hook. Outbound messages require tools.
    qq_adapter.set_message_hook(Arc::new(echo_agent::AgentMessageHook::new(agent.clone())));
    qq_adapter.add_handler(Box::new(handlers::EchoHandler::new(
        &cfg.bot.command_prefix,
    )));
    qq_adapter.add_handler(Box::new(handlers::HelpHandler::new(
        &cfg.bot.command_prefix,
    )));
    qq_adapter.add_handler(Box::new(handlers::AdminHandler::new(
        &cfg.bot.command_prefix,
        cfg.bot.owner_qq,
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
                if matches!(&cmd, echo_agent::BackendCommand::SendMessage { .. }) {
                    let branch_agent = Arc::clone(&pump_agent);
                    tokio::spawn(async move {
                        branch_agent.apply_command(cmd).await;
                    });
                } else {
                    pump_agent.apply_command(cmd).await;
                }
            }
        }
    });

    // ---- Auto-start QQ adapter if enabled ----
    if cfg.qq_adapter.enabled {
        qq_adapter
            .start()
            .await
            .map_err(|e| anyhow::anyhow!("QQ adapter start failed: {e}"))?;
    }

    // ---- Management WS server (for remote Panel) ----
    let mgmt_addr = cfg.core.management_address.clone();
    let mgmt_agent = agent.clone();
    let mgmt_bridge = bridge.clone();
    tokio::spawn(async move {
        if let Err(e) = management::serve(&mgmt_addr, mgmt_bridge, mgmt_agent).await {
            warn!(error = %e, "management WS server stopped");
        }
    });

    // ---- Main loop ----
    tokio::select! {
        _ = shutdown_signal() => info!("shutdown signal received, exiting"),
        _ = shutdown_rx.changed() => info!("shutdown requested by admin command, exiting"),
    }

    // Graceful shutdown: stop the command pump and QQ adapter, cancel
    // background tasks, and flush sessions to disk.
    pump.abort();
    let _ = qq_adapter.stop().await;
    agent.shutdown().await;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
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

#[derive(Clone)]
struct RotatingLogWriter {
    state: Arc<std::sync::Mutex<RotatingLogState>>,
}

struct RotatingLogState {
    path: PathBuf,
    file: std::fs::File,
    bytes_written: u64,
    max_bytes: u64,
    max_files: usize,
}

struct RotatingLogGuard {
    state: Arc<std::sync::Mutex<RotatingLogState>>,
}

impl RotatingLogWriter {
    fn open(path: PathBuf, max_bytes: u64, max_files: usize) -> Result<Self> {
        use anyhow::Context as _;
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)
                .with_context(|| format!("failed to create log directory {}", dir.display()))?;
        }
        let file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .with_context(|| format!("failed to open log file {}", path.display()))?;
        let bytes_written = file.metadata().map(|metadata| metadata.len()).unwrap_or(0);
        Ok(Self {
            state: Arc::new(std::sync::Mutex::new(RotatingLogState {
                path,
                file,
                bytes_written,
                max_bytes,
                max_files,
            })),
        })
    }
}

impl<'a> tracing_subscriber::fmt::MakeWriter<'a> for RotatingLogWriter {
    type Writer = RotatingLogGuard;

    fn make_writer(&'a self) -> Self::Writer {
        RotatingLogGuard {
            state: Arc::clone(&self.state),
        }
    }
}

impl std::io::Write for RotatingLogGuard {
    fn write(&mut self, buffer: &[u8]) -> std::io::Result<usize> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| std::io::Error::other("log writer mutex poisoned"))?;
        state.rotate_if_needed(buffer.len() as u64)?;
        let written = std::io::Write::write(&mut state.file, buffer)?;
        state.bytes_written = state.bytes_written.saturating_add(written as u64);
        Ok(written)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| std::io::Error::other("log writer mutex poisoned"))?;
        std::io::Write::flush(&mut state.file)
    }
}

impl RotatingLogState {
    fn rotate_if_needed(&mut self, incoming_bytes: u64) -> std::io::Result<()> {
        if self.bytes_written == 0
            || self.bytes_written.saturating_add(incoming_bytes) <= self.max_bytes
        {
            return Ok(());
        }
        std::io::Write::flush(&mut self.file)?;
        let oldest = rotated_log_path(&self.path, self.max_files);
        if oldest.exists() {
            std::fs::remove_file(oldest)?;
        }
        for index in (1..self.max_files).rev() {
            let source = rotated_log_path(&self.path, index);
            let destination = rotated_log_path(&self.path, index + 1);
            if source.exists() {
                let _ = std::fs::rename(source, destination);
            }
        }
        if self.path.exists() {
            std::fs::rename(&self.path, rotated_log_path(&self.path, 1))?;
        }
        self.file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&self.path)?;
        self.bytes_written = 0;
        Ok(())
    }
}

fn rotated_log_path(path: &std::path::Path, index: usize) -> PathBuf {
    let mut name = path.as_os_str().to_os_string();
    name.push(format!(".{index}"));
    PathBuf::from(name)
}

/// TUI occupies stdout, so it defaults to a rotating file. Core defaults to
/// stdout/journald, but honors an explicit `log_file` with the same rotation.
fn init_tracing(cfg: &config::LoggingSection, tui_running: bool) -> Result<()> {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&cfg.level));
    if tui_running || !cfg.log_file.is_empty() {
        let path = if cfg.log_file.is_empty() {
            PathBuf::from("logs/echo-agent-panel.log")
        } else {
            PathBuf::from(&cfg.log_file)
        };
        eprintln!("logging to: {}", path.display());
        let writer = RotatingLogWriter::open(
            path,
            cfg.max_file_size_mb.saturating_mul(1024 * 1024),
            cfg.max_files,
        )?;
        init_subscriber(cfg, filter, writer, false)
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
        .with_target(true)
        .with_thread_ids(true)
        .with_ansi(ansi)
        .with_writer(writer);
    match cfg.format.as_str() {
        "json" => builder.json().try_init().map_err(anyhow::Error::msg)?,
        _ => builder.try_init().map_err(anyhow::Error::msg)?,
    }
    Ok(())
}

#[cfg(test)]
mod logging_tests {
    use super::*;
    use std::io::Write as _;
    use tracing_subscriber::fmt::MakeWriter as _;

    #[test]
    fn rotating_writer_keeps_numbered_history() {
        let path = std::env::temp_dir().join(format!(
            "echo-agent-rotation-test-{}.log",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(rotated_log_path(&path, 1));
        let writer = RotatingLogWriter::open(path.clone(), 8, 2).unwrap();
        {
            let mut guard = writer.make_writer();
            guard.write_all(b"12345678").unwrap();
            guard.write_all(b"next").unwrap();
            guard.flush().unwrap();
        }
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "next");
        assert_eq!(
            std::fs::read_to_string(rotated_log_path(&path, 1)).unwrap(),
            "12345678"
        );
        drop(writer);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(rotated_log_path(&path, 1));
    }
}
