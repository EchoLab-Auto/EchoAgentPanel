//! Panel 侧 TOML 配置加载。
//!
//! [`PanelConfig`] — `config/echo-agent-panel.toml`，Web 面板启动时加载
//! （`[logging]` / `[server]` 监听与静态目录 / `[core]` 的 Core 连接地址）。
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
pub struct ServerSection {
    /// HTTP/WS 监听地址（默认 `0.0.0.0:8080`，允许局域网/外部访问）。
    pub bind_address: String,
    /// 前端静态文件目录（构建后的 `web/dist`）。
    pub static_dir: String,
}

impl Default for ServerSection {
    fn default() -> Self {
        Self {
            bind_address: "0.0.0.0:8080".to_string(),
            static_dir: "web/dist".to_string(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct CoreSection {
    /// EchoAgentCore management WebSocket 地址。
    pub connect_url: String,
    /// Optional bearer token expected by Core's management WebSocket.
    pub access_token: String,
}

impl Default for CoreSection {
    fn default() -> Self {
        Self {
            connect_url: "ws://127.0.0.1:3132".to_string(),
            access_token: String::new(),
        }
    }
}

/// QQ / NapCat 登录辅助配置：Panel 后端直接读取本机 OneBot API 和
/// NapCat 容器的二维码文件，用于 Web 端扫码登录模块。
#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct QqSection {
    /// NapCat Docker 容器名，用于 `docker exec ... cat qrcode.png`。
    pub napcat_container: String,
    /// OneBot HTTP API 地址，用于查询 `get_login_info`。
    pub napcat_onebot_url: String,
    /// NapCat WebUI 地址，用于展示扫码登录链接。
    pub napcat_webui_url: String,
}

impl Default for QqSection {
    fn default() -> Self {
        Self {
            napcat_container: "napcat".to_string(),
            napcat_onebot_url: "http://localhost:3000".to_string(),
            napcat_webui_url: "http://localhost:6099".to_string(),
        }
    }
}

/// Panel 侧配置：日志、HTTP 服务、Core 连接与 QQ 登录辅助。
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct PanelConfig {
    pub logging: LoggingSection,
    pub server: ServerSection,
    pub core: CoreSection,
    pub qq: QqSection,
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
    fn panel_config_loads_defaults_and_overrides() {
        let dir = std::env::temp_dir();
        let path = dir.join("echo-panel-config-test.toml");
        std::fs::write(
            &path,
            r#"
[server]
bind_address = "0.0.0.0:9000"

[core]
connect_url = "ws://10.0.0.5:3132"
"#,
        )
        .unwrap();
        let config = PanelConfig::load(&path).unwrap();
        assert_eq!(config.server.bind_address, "0.0.0.0:9000");
        assert_eq!(config.server.static_dir, "web/dist");
        assert_eq!(config.core.connect_url, "ws://10.0.0.5:3132");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn default_bind_allows_external_access() {
        let config = PanelConfig::default();
        assert_eq!(config.server.bind_address, "0.0.0.0:8080");
    }

    #[test]
    fn invalid_logging_level_is_rejected() {
        let dir = std::env::temp_dir();
        let path = dir.join("echo-panel-badlog-test.toml");
        std::fs::write(&path, "[logging]\nlevel = \"loud\"\n").unwrap();
        assert!(PanelConfig::load(&path).is_err());
        std::fs::remove_file(&path).ok();
    }
}
