//! Panel 侧 TOML 配置加载。
//!
//! [`PanelConfig`] — `config/echo-agent-panel.toml`，TUI 启动时加载
//! （`[logging]` / `[tui]` / `[core]` 中的 Core 连接地址）。
//! Core 侧配置由 EchoAgentCore 仓库自行定义。

use std::path::Path;

use anyhow::{Context as _, Result};
use serde::Deserialize;

// ── 共享 section ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct LoggingSection {
    pub level: String,
    pub format: String,
    pub log_file: String,
    pub max_file_size_mb: u64,
    pub max_files: usize,
}

impl Default for LoggingSection {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            format: "text".to_string(),
            log_file: String::new(),
            max_file_size_mb: 20,
            max_files: 5,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct TuiSection {
    pub enabled: bool,
    pub theme: String,
}

impl Default for TuiSection {
    fn default() -> Self {
        Self {
            enabled: true,
            theme: "dark".to_string(),
        }
    }
}

// ── Panel 配置 ─────────────────────────────────────────────────────────────

/// Panel 侧配置：只负责 TUI 外观与连接远程 Core。
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct PanelConfig {
    pub logging: LoggingSection,
    pub tui: TuiSection,
    pub core: PanelCoreSection,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct PanelCoreSection {
    /// 远程 Core 的 management WebSocket 地址（`--connect` 可覆盖）。
    pub connect_url: String,
}

impl Default for PanelCoreSection {
    fn default() -> Self {
        Self {
            connect_url: "ws://127.0.0.1:3132".into(),
        }
    }
}

impl PanelConfig {
    /// Load the Panel config file.
    pub fn load(path: &Path) -> Result<Self> {
        let raw = std::fs::read_to_string(path)
            .with_context(|| format!("failed to read config file {}", path.display()))?;
        let config: PanelConfig = toml::from_str(&raw)
            .with_context(|| format!("invalid config in {}", path.display()))?;
        validate_logging_level(&config.logging)?;
        Ok(config)
    }
}

fn validate_logging_level(logging: &LoggingSection) -> Result<()> {
    const LOG_LEVELS: &[&str] = &["trace", "debug", "info", "warn", "error"];
    if !LOG_LEVELS.contains(&logging.level.as_str()) {
        anyhow::bail!(
            "[logging] level invalid: \"{}\" (options: {})",
            logging.level,
            LOG_LEVELS.join("/")
        );
    }
    if logging.max_file_size_mb == 0 {
        anyhow::bail!("[logging] max_file_size_mb must be greater than zero");
    }
    if logging.max_files == 0 {
        anyhow::bail!("[logging] max_files must be greater than zero");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panel_config_loads_theme_and_connect_url() {
        let dir = std::env::temp_dir();
        let path = dir.join("echo-panel-test.toml");
        std::fs::write(
            &path,
            r#"
[tui]
theme = "light"

[core]
connect_url = "ws://192.168.1.10:3132"
"#,
        )
        .unwrap();
        let config = PanelConfig::load(&path).unwrap();
        assert_eq!(config.tui.theme, "light");
        assert_eq!(config.core.connect_url, "ws://192.168.1.10:3132");
        std::fs::remove_file(&path).ok();
    }
}
