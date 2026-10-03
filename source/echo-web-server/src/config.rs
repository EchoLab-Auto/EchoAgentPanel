//! Panel 侧 TOML 配置加载。
//!
//! [`PanelConfig`] — `config/echo-agent-panel.toml`，Web 面板启动时加载
//! （`[logging]` / `[server]` 监听与静态目录 / `[core]` 的 Core 连接地址）。
//! Core 侧配置由 EchoAgentCore 仓库自行定义。
//!
//! 旧配置中的遗留 `[qq]` 段（早期 Panel 直连 NapCat 用）被 serde 静默忽略，
//! 不影响加载——该能力已由 Core 代理（WS 命令）取代。

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
    /// 媒体库目录（Core 落盘的入站图片；`/media/<id>` 路由从这里读）。
    /// 留空 = 默认 `~/.local/share/echo-agent-core/media`（与 Core 的
    /// `$ECHO_MEDIA_DIR` 缺省一致；两进程同机部署时开箱即用）。
    pub media_dir: String,
    /// 访问令牌（2026-10 安全收紧）：非空时全站（WS/HTTP API/媒体）
    /// 要求 `Authorization: Bearer <token>` 或 `?token=` 查询参数；
    /// 静态前端资源豁免（登录页可加载）。空 = 无认证（仅建议绑
    /// 127.0.0.1 场景使用）。
    #[serde(default)]
    pub access_token: String,
}

impl Default for ServerSection {
    fn default() -> Self {
        Self {
            bind_address: "0.0.0.0:8080".to_string(),
            static_dir: "web/dist".to_string(),
            media_dir: String::new(),
            access_token: String::new(),
        }
    }
}

impl ServerSection {
    /// 媒体库目录（配置为空时回退 Core 数据根；HOME 不可用则工作目录）。
    pub fn effective_media_dir(&self) -> std::path::PathBuf {
        let configured = self.media_dir.trim();
        if !configured.is_empty() {
            return std::path::PathBuf::from(configured);
        }
        match std::env::var_os("ECHO_MEDIA_DIR") {
            Some(dir) if !dir.is_empty() => std::path::PathBuf::from(dir),
            _ => match std::env::var_os("HOME") {
                Some(home) => {
                    std::path::PathBuf::from(home).join(".local/share/echo-agent-core/media")
                }
                None => std::path::PathBuf::from("media"),
            },
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct CoreSection {
    /// EchoAgentCore management WebSocket 地址（单上游形态）。
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

/// `[[cores]]` 条目（多上游形态，2026-10 聚合视图）。
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct UpstreamSection {
    /// 上游名（UI 展示 + 帧打标键）。
    pub name: String,
    pub url: String,
    #[serde(default)]
    pub access_token: String,
}

/// Panel 侧配置：日志、HTTP 服务与 Core 连接。
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct PanelConfig {
    pub logging: LoggingSection,
    pub server: ServerSection,
    pub core: CoreSection,
    /// 多上游列表（`[[cores]]`）。
    pub cores: Vec<UpstreamSection>,
    /// `cores` 键是否在配置中出现过（serde 捕获——区分「未配置」与
    /// 「显式空数组」：前者兜底 [core]，后者尊重在线管理的清空）。
    #[serde(skip)]
    pub cores_touched: bool,
}

impl PanelConfig {
    /// 物化上游列表：`cores` 键**出现过**（哪怕空数组——在线管理写
    /// 过的标记）即用之；否则 `[core]` 单上游物化为一条（名为 "core"）。
    /// 命令行 `--core` 覆盖在最后应用（main.rs）。
    pub fn upstreams(&self) -> Vec<UpstreamSection> {
        if self.cores_touched {
            return self.cores.clone();
        }
        vec![UpstreamSection {
            name: "core".to_string(),
            url: self.core.connect_url.clone(),
            access_token: self.core.access_token.clone(),
        }]
    }
}

impl PanelConfig {
    /// Load the Panel config file.
    pub fn load(path: &Path) -> Result<Self> {
        let raw = std::fs::read_to_string(path)
            .with_context(|| format!("failed to read config file {}", path.display()))?;
        let mut config: PanelConfig = toml::from_str(&raw)
            .with_context(|| format!("invalid config in {}", path.display()))?;
        // `cores` 键是否出现过（serde 无法自捕获——逐行判非注释表头；
        // 纯文本 contains 会被注释掉的示例 `# [[cores]]` 误命中，导致
        // [core] 兜底静默失效）。
        config.cores_touched = raw.lines().any(|line| {
            let line = line.trim_start();
            line.starts_with("[[cores]]")
        });
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
mod cores_touched_tests {
    use super::PanelConfig;

    /// 注释掉的 `# [[cores]]` 示例不得触发 cores_touched（否则 [core]
    /// 兜底静默失效——种子配置即含注释示例）。
    #[test]
    fn commented_cores_header_does_not_touch() {
        let dir = std::env::temp_dir().join(format!("echo-cfg-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("panel.toml");
        std::fs::write(
            &path,
            "[core]\nconnect_url = \"ws://x:1\"\n# [[cores]]\n# name = \"a\"\n",
        )
        .unwrap();
        let cfg = PanelConfig::load(&path).unwrap();
        assert!(!cfg.cores_touched);
        assert_eq!(cfg.upstreams()[0].url, "ws://x:1");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn explicit_empty_cores_is_touched() {
        let dir = std::env::temp_dir().join(format!("echo-cfg-test2-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("panel.toml");
        std::fs::write(
            &path,
            "[core]\nconnect_url = \"ws://x:1\"\n[[cores]]\nname=\"a\"\nurl=\"ws://y:2\"\n",
        )
        .unwrap();
        let cfg = PanelConfig::load(&path).unwrap();
        assert!(cfg.cores_touched);
        assert_eq!(cfg.upstreams()[0].url, "ws://y:2");
        std::fs::remove_dir_all(&dir).ok();
    }
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
    fn legacy_qq_section_is_ignored() {
        // 旧配置文件可能仍带 [qq] 段（早期 Panel 直连 NapCat 用）。
        // 该段已从 schema 移除，但必须保持向后兼容：serde 静默忽略，加载不报错。
        let dir = std::env::temp_dir();
        let path = dir.join("echo-panel-legacyqq-test.toml");
        std::fs::write(
            &path,
            r#"
[server]
bind_address = "127.0.0.1:8081"

[qq]
napcat_container = "napcat"
napcat_onebot_url = "http://localhost:3000"
napcat_webui_url = "http://localhost:6099"
"#,
        )
        .unwrap();
        let config = PanelConfig::load(&path).expect("legacy [qq] section must not break loading");
        assert_eq!(config.server.bind_address, "127.0.0.1:8081");
        std::fs::remove_file(&path).ok();
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
