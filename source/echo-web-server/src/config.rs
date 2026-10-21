//! Panel 侧 TOML 配置加载。
//!
//! [`PanelConfig`] — `config/echo-agent-panel.toml`，Web 面板启动时加载
//! （`[logging]` / `[server]` 监听与静态目录 / `[core]` 的 Core 连接地址）。
//! Core 侧配置由 EchoAgentCore 仓库自行定义。
//!

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
    /// 远端媒体缓存目录（SSH 接入时经隧道拉取的图片落这里；`/media/<id>`
    /// 远端命中不到本地媒体库时从这里读/写入）。留空 = 默认
    /// `~/.local/share/echo-agent-panel/media-cache`。
    pub media_cache_dir: String,
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
            media_cache_dir: String::new(),
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

    /// 远端媒体缓存目录（SSH 拉取的图片；留空 =
    /// `~/.local/share/echo-agent-panel/media-cache`）。
    pub fn effective_media_cache_dir(&self) -> std::path::PathBuf {
        let configured = self.media_cache_dir.trim();
        if !configured.is_empty() {
            return std::path::PathBuf::from(configured);
        }
        match std::env::var_os("HOME") {
            Some(home) if !home.is_empty() => {
                std::path::PathBuf::from(home).join(".local/share/echo-agent-panel/media-cache")
            }
            _ => std::path::PathBuf::from("media-cache"),
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

/// `[[cores]]` 条目（多上游形态，2026-10 聚合视图；SSH 接入 2026-10 末）。
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct UpstreamSection {
    /// 上游名（UI 展示 + 帧打标键）。
    pub name: String,
    pub url: String,
    #[serde(default)]
    pub access_token: String,
    /// SSH 接入参数（出现该段即"接入方式 = SSH"，`url` 被忽略）。
    #[serde(default)]
    pub ssh: Option<crate::ssh::SshConfig>,
    /// 该接入点的来源（P2 自动发现，2026-11）：`manual`（默认，人工配置）
    /// 或 `discovered`（由 Core 的 `FederationDirectory` 派生）。
    ///
    /// 为什么要在配置里留标记：自动派生的条目必须能被**安全移除**（邻居
    /// 从目录里消失后清理），而人工配置的一条都不能自动删。凭"最近是否
    /// 见过"推断不够——重启后面板会把人工条目误判成派生。
    #[serde(default)]
    pub source: String,
}

/// Panel 侧配置：日志、HTTP 服务与 Core 连接。
/// `[federation]` 段（P2 自动发现，2026-11）。
///
/// 只放**Panel 自己的**联邦身份，不放拓扑：拓扑从 Core 的目录事件派生。
#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct PanelFederationSection {
    /// **Panel 身份密钥**（Core 侧 `[federation] panel_keys` 之一）。
    ///
    /// 自动发现的接入点用这一把密钥连入（而不是各节点的
    /// `management_access_token`）——这正是"一个 Panel 接入全网"的凭据面。
    /// 空 = 不做自动发现（只用手工接入点）。
    pub panel_key: String,
    /// 是否启用自动发现（默认 true；有 `panel_key` 时才真正生效）。
    ///
    /// 关掉它 = 保持"只连我配的那几台"的旧行为（多上游手工维护）。
    pub discover: bool,
}

impl Default for PanelFederationSection {
    fn default() -> Self {
        Self {
            panel_key: String::new(),
            discover: true,
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct PanelConfig {
    pub logging: LoggingSection,
    pub server: ServerSection,
    pub core: CoreSection,
    /// 联邦（Panel 身份密钥 + 自动发现开关）。
    pub federation: PanelFederationSection,
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
            ssh: None,
            source: String::new(),
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
            // 表头判定：[[ 开头、]] 结尾、中间内容 trim 后恰为 "cores"
            // （兼容 TOML 合法的空格变体 `[[ cores ]]`；注释行 # 开头不命中）。
            line.starts_with("[[")
                && line.ends_with("]]")
                && line[2..line.len() - 2].trim() == "cores"
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
    fn spaced_cores_header_is_touched() {
        let dir = std::env::temp_dir().join(format!("echo-cfg-test3-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("panel.toml");
        // TOML 合法的 [[ cores ]]（带空格）必须判定 touched——否则静默回退 [core]。
        std::fs::write(
            &path,
            "[core]
connect_url = \"ws://x:1\"
[[ cores ]]
name=\"a\"
url=\"ws://y:2\"
",
        )
        .unwrap();
        let cfg = PanelConfig::load(&path).unwrap();
        assert!(cfg.cores_touched);
        assert_eq!(cfg.upstreams()[0].url, "ws://y:2");
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
    fn invalid_logging_level_is_rejected() {
        let dir = std::env::temp_dir();
        let path = dir.join("echo-panel-badlog-test.toml");
        std::fs::write(&path, "[logging]\nlevel = \"loud\"\n").unwrap();
        assert!(PanelConfig::load(&path).is_err());
        std::fs::remove_file(&path).ok();
    }

    /// `[[cores]]` 的 `[cores.ssh]` 段解析：默认值 + 覆盖。
    #[test]
    fn upstream_ssh_section_parses() {
        let dir = std::env::temp_dir().join(format!("echo-cfg-ssh-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("panel.toml");
        std::fs::write(
            &path,
            r#"
[[cores]]
name = "cloud"
access_token = "tok"

[cores.ssh]
host = "203.0.113.7"
user = "root"
identity_file = "~/.ssh/cloud"

[[cores]]
name = "direct"
url = "ws://10.0.0.5:3132"
"#,
        )
        .unwrap();
        let cfg = PanelConfig::load(&path).unwrap();
        let upstreams = cfg.upstreams();
        assert_eq!(upstreams.len(), 2);
        let ssh = upstreams[0].ssh.as_ref().expect("ssh section");
        assert_eq!(ssh.host, "203.0.113.7");
        assert_eq!(ssh.user, "root");
        assert_eq!(ssh.port, 22); // 默认值
        assert_eq!(ssh.remote_port, 3132); // 默认值
        assert!(ssh.accept_new_host_key);
        assert!(upstreams[1].ssh.is_none());
        std::fs::remove_dir_all(&dir).ok();
    }
}
