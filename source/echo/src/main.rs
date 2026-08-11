//! EchoAgentPanel — TUI 前端。
//!
//! 通过 WebSocket 连接远程 EchoAgentCore（agent 核心服务），提供
//! opencode 风格终端 UI。Core 服务本身在独立的 EchoAgentCore 仓库中。

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::Result;
use clap::Parser;
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

mod config;

use config::PanelConfig;

/// EchoAgentPanel — TUI frontend for a remote EchoAgentCore.
#[derive(Debug, Parser)]
#[command(version, about)]
struct Args {
    /// Path to the TOML configuration file.
    /// Default: config/echo-agent-panel.toml
    #[arg(short, long)]
    config: Option<PathBuf>,
    /// Override the Core WebSocket address.
    /// e.g. `--connect ws://127.0.0.1:3132`
    #[arg(long)]
    connect: Option<String>,
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
    run_panel(args, cfg).await
}

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

/// TUI occupies stdout, so logging defaults to a rotating file.
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
