//! 上游注册表（多上游聚合视图的管理面，2026-10）：`[[cores]]` 配置的
//! 运行时物化 + 原子持久化 + 变更广播。
//!
//! 解耦边界：
//! - 本模块**只**管「上游集合」的状态与持久化，不知道 WS 中继的存在；
//! - 中继编排（RelayHub，见 `proxy.rs`）订阅 [`UpstreamEvent`] 自行
//!   并入/摘除链路；
//! - HTTP 管理面（`upstreams_api.rs`）只做参数校验与调用。
//!
//! 持久化：写回 Panel 自己的配置文件（与 Core 的 ConfigStore 同策略：
//! tmp + rename 原子写；整文件读写，只动 `[[cores]]` 段，其余段原样保留
//! ——实现上用 toml::Table 整树操作，未知的其它键不受影响）。

use std::path::{Path, PathBuf};
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, RwLock};

use crate::ssh::SshConfig;

/// 一个上游 Core（运行时视图；与配置 `[[cores]]` 一一对应）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UpstreamConfig {
    /// 上游名（UI 展示 + 帧打标键；唯一）。
    pub name: String,
    /// 直连 management WS 地址（SSH 接入时被隧道地址取代、此处可为空）。
    pub url: String,
    /// Bearer token（**状态查询不回传明文**；仅 `token_set` 标记）。
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub access_token: String,
    /// SSH 接入参数（2026-10）：`Some` = "接入方式 = SSH"，`url` 被忽略，
    /// 中继拨号本地隧道端口。`None` = 直连。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ssh: Option<SshConfig>,
}

impl UpstreamConfig {
    /// 直连上游。
    pub fn direct(
        name: impl Into<String>,
        url: impl Into<String>,
        access_token: impl Into<String>,
    ) -> Self {
        Self {
            name: name.into(),
            url: url.into(),
            access_token: access_token.into(),
            ssh: None,
        }
    }

    /// 是否配置了可用端点（直连地址或 SSH）——中继接入/探活/加壳计数的
    /// 统一口径（此前直接判 `url.is_empty()`，SSH 模式下地址恒为空会误判）。
    pub fn has_endpoint(&self) -> bool {
        !self.url.trim().is_empty() || self.ssh.is_some()
    }
}

/// 上游变更事件（中继编排层订阅）。
///
/// `Upsert` 装箱：`UpstreamConfig` 含 SSH 段后体积 ~200B+，直接内联会让
/// 变体间尺寸悬殊（clippy large_enum_variant）且广播克隆白拷大块内存。
#[derive(Debug, Clone)]
pub enum UpstreamEvent {
    /// 新增/更新（url/token 变化时旧链路应摘除重连）。
    Upsert(Box<UpstreamConfig>),
    /// 删除。
    Removed { name: String },
}

/// 注册表句柄（`Arc` 共享）。
pub struct UpstreamRegistry {
    inner: RwLock<Vec<UpstreamConfig>>,
    /// 持久化路径（None = 不持久化——测试/纯内存形态）。
    persist: Option<PathBuf>,
    events: broadcast::Sender<UpstreamEvent>,
}

impl UpstreamRegistry {
    pub fn new(initial: Vec<UpstreamConfig>, persist: Option<PathBuf>) -> Arc<Self> {
        let (events, _) = broadcast::channel(64);
        Arc::new(Self {
            inner: RwLock::new(initial),
            persist,
            events,
        })
    }

    /// 当前上游集合快照。
    pub async fn list(&self) -> Vec<UpstreamConfig> {
        self.inner.read().await.clone()
    }

    /// 订阅变更（中继编排层）。
    pub fn subscribe(&self) -> broadcast::Receiver<UpstreamEvent> {
        self.events.subscribe()
    }

    /// 新增/更新一个上游（按 name upsert）。校验：name 非空且不含
    /// 空白/冒号（帧打标键卫生）、url 为 ws(s):// 或空、SSH 段必要
    /// 字段齐全。编辑场景**留空保留旧密**：access_token / SSH password /
    /// passphrase 新值留空 = 沿用旧值（"不改密钥"与"清空"不做区分）。
    ///
    /// 返回**合并后的有效配置**（含保留的旧密）——调用方（管理 API）
    /// 据此建 SSH 隧道，保证隧道拿到的是最终凭据。
    pub async fn upsert(&self, config: UpstreamConfig) -> Result<UpstreamConfig, String> {
        let name = config.name.trim().to_string();
        if name.is_empty() {
            return Err("上游名称不能为空".into());
        }
        if name.chars().any(|c| c.is_whitespace() || c == ':') {
            return Err("上游名称不能含空白或冒号".into());
        }
        let url = config.url.trim().to_string();
        if !url.is_empty() && !url.starts_with("ws://") && !url.starts_with("wss://") {
            return Err("地址需为 ws:// 或 wss:// 形式".into());
        }
        if let Some(ssh) = &config.ssh {
            ssh.validate()?;
        }
        let config = UpstreamConfig {
            name,
            access_token: config.access_token,
            url,
            ssh: config.ssh,
        };
        let effective = {
            let mut inner = self.inner.write().await;
            // 先快照旧状态——persist 失败时回滚内存，保持内存/磁盘一致
            // （此前 persist 失败返回 Err 但内存已改，重启即丢且三方分叉）。
            let backup = inner.clone();
            let mut effective = config.clone();
            match inner.iter_mut().find(|u| u.name == config.name) {
                Some(existing) => {
                    // token 留空 = 保留旧值（编辑场景）。
                    if effective.access_token.is_empty() {
                        effective.access_token = existing.access_token.clone();
                    }
                    // SSH 密文（password/passphrase）留空 = 保留旧值。
                    if let (Some(new_ssh), Some(old_ssh)) =
                        (effective.ssh.as_mut(), existing.ssh.as_ref())
                    {
                        if new_ssh.password.is_empty() {
                            new_ssh.password = old_ssh.password.clone();
                        }
                        if new_ssh.passphrase.is_empty() {
                            new_ssh.passphrase = old_ssh.passphrase.clone();
                        }
                    }
                    *existing = effective.clone();
                }
                None => inner.push(effective.clone()),
            }
            if let Err(e) = self.persist_locked(&inner) {
                *inner = backup;
                return Err(e);
            }
            effective
        };
        // 事件携带**合并后的有效配置**（此前发的是原始入参——编辑 token
        // 留空时中继会拿到空 token 去连，认证失败直到下次变更）。
        let _ = self
            .events
            .send(UpstreamEvent::Upsert(Box::new(effective.clone())));
        Ok(effective)
    }

    /// 删除一个上游。
    pub async fn remove(&self, name: &str) -> Result<bool, String> {
        let removed = {
            let mut inner = self.inner.write().await;
            let before = inner.len();
            let backup = inner.clone();
            inner.retain(|u| u.name != name);
            let removed = inner.len() != before;
            if removed {
                if let Err(e) = self.persist_locked(&inner) {
                    *inner = backup;
                    return Err(e);
                }
            }
            removed
        };
        if removed {
            let _ = self.events.send(UpstreamEvent::Removed {
                name: name.to_string(),
            });
        }
        Ok(removed)
    }

    /// 原子写回配置文件（整树操作，只重建 `cores` 数组，其余段原样）。
    fn persist_locked(&self, inner: &[UpstreamConfig]) -> Result<(), String> {
        let Some(path) = self.persist.as_deref() else {
            return Ok(());
        };
        persist_to_file(path, inner)
    }
}

/// 整树写回：读 → 替换 `cores` 数组 → tmp+rename。
/// 读不到/解析失败时**绝不从空树起步覆写**——那会静默抹掉
/// [server]/[core]/[logging] 等其他段。宁可本次持久化失败（内存态
/// 仍生效），把决定权留给下一次变更/人工介入。仅"文件不存在"才允许
/// 从空树起步（首次持久化场景）。
fn persist_to_file(path: &Path, upstreams: &[UpstreamConfig]) -> Result<(), String> {
    let mut root: toml::Table = match std::fs::read_to_string(path) {
        Ok(text) => toml::from_str(&text).map_err(|e| {
            format!(
                "parse {} for persist (refusing to clobber): {e}",
                path.display()
            )
        })?,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => toml::Table::new(),
        Err(e) => return Err(format!("read {} for persist: {e}", path.display())),
    };
    let array = toml::Value::Array(
        upstreams
            .iter()
            .map(|u| {
                let mut t = toml::Table::new();
                t.insert("name".into(), toml::Value::String(u.name.clone()));
                t.insert("url".into(), toml::Value::String(u.url.clone()));
                if !u.access_token.is_empty() {
                    t.insert(
                        "access_token".into(),
                        toml::Value::String(u.access_token.clone()),
                    );
                }
                if let Some(ssh) = &u.ssh {
                    t.insert("ssh".into(), toml::Value::Table(ssh_to_table(ssh)));
                }
                toml::Value::Table(t)
            })
            .collect(),
    );
    root.insert("cores".into(), array);
    let text = toml::to_string_pretty(&root).map_err(|e| format!("配置序列化失败: {e}"))?;
    let tmp = path.with_extension("toml.tmp");
    std::fs::write(&tmp, text).map_err(|e| format!("写入 {} 失败: {e}", tmp.display()))?;
    std::fs::rename(&tmp, path).map_err(|e| format!("替换 {} 失败: {e}", path.display()))?;
    Ok(())
}

/// SSH 段 → TOML 表（空值省略；accept_new_host_key 仅 false 时写出，
/// 保持常见配置文件简洁且往返默认可读）。
fn ssh_to_table(ssh: &SshConfig) -> toml::Table {
    let mut s = toml::Table::new();
    s.insert("host".into(), toml::Value::String(ssh.host.clone()));
    s.insert("port".into(), toml::Value::Integer(ssh.port as i64));
    s.insert("user".into(), toml::Value::String(ssh.user.clone()));
    s.insert(
        "remote_port".into(),
        toml::Value::Integer(ssh.remote_port as i64),
    );
    if !ssh.identity_file.is_empty() {
        s.insert(
            "identity_file".into(),
            toml::Value::String(ssh.identity_file.clone()),
        );
    }
    if !ssh.password.is_empty() {
        s.insert("password".into(), toml::Value::String(ssh.password.clone()));
    }
    if !ssh.passphrase.is_empty() {
        s.insert(
            "passphrase".into(),
            toml::Value::String(ssh.passphrase.clone()),
        );
    }
    if !ssh.remote_media_dir.is_empty() {
        s.insert(
            "remote_media_dir".into(),
            toml::Value::String(ssh.remote_media_dir.clone()),
        );
    }
    if !ssh.accept_new_host_key {
        s.insert("accept_new_host_key".into(), toml::Value::Boolean(false));
    }
    if !ssh.known_hosts_file.is_empty() {
        s.insert(
            "known_hosts_file".into(),
            toml::Value::String(ssh.known_hosts_file.clone()),
        );
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(name: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!(
            "echo-upstreams-test-{}-{name}.toml",
            std::process::id()
        ));
        std::fs::remove_file(&p).ok();
        p
    }

    #[tokio::test]
    async fn upsert_validates_and_persists() {
        let path = temp_path("upsert");
        let reg = UpstreamRegistry::new(vec![], Some(path.clone()));
        assert!(reg
            .upsert(UpstreamConfig::direct("", "ws://x:1", ""))
            .await
            .is_err());
        assert!(reg
            .upsert(UpstreamConfig::direct("a b", "ws://x:1", ""))
            .await
            .is_err());
        assert!(reg
            .upsert(UpstreamConfig::direct("a", "http://x", ""))
            .await
            .is_err());

        reg.upsert(UpstreamConfig::direct("a", "ws://127.0.0.1:3132", "tok"))
            .await
            .unwrap();
        // 持久化后重载可见
        let reloaded = UpstreamRegistry::new(vec![], Some(path.clone()));
        // 手动从文件读（模拟重启：初始集合由调用方从文件物化）
        let text = std::fs::read_to_string(&path).unwrap();
        let root: toml::Table = toml::from_str(&text).unwrap();
        let cores = root.get("cores").and_then(|c| c.as_array()).unwrap();
        assert_eq!(cores.len(), 1);
        assert_eq!(cores[0].get("name").unwrap().as_str().unwrap(), "a");
        drop(reloaded);

        // 编辑 token 留空 = 保留旧值
        reg.upsert(UpstreamConfig::direct("a", "ws://127.0.0.1:9999", ""))
            .await
            .unwrap();
        let list = reg.list().await;
        assert_eq!(list[0].access_token, "tok");
        assert_eq!(list[0].url, "ws://127.0.0.1:9999");

        std::fs::remove_file(&path).ok();
    }

    /// SSH 上游：校验、持久化（含 ssh 表）与重启重载往返。
    #[tokio::test]
    async fn upsert_ssh_persists_and_round_trips() {
        let path = temp_path("ssh");
        let reg = UpstreamRegistry::new(vec![], Some(path.clone()));
        // 缺 host/user 的 SSH 配置被拒
        assert!(reg
            .upsert(UpstreamConfig {
                name: "cloud".into(),
                url: String::new(),
                access_token: "tok".into(),
                ssh: Some(SshConfig::default()),
            })
            .await
            .is_err());

        let ssh = SshConfig {
            host: "203.0.113.9".into(),
            user: "root".into(),
            identity_file: "~/.ssh/cloud".into(),
            password: "secret".into(),
            remote_media_dir: "/data/media".into(),
            ..SshConfig::default()
        };
        reg.upsert(UpstreamConfig {
            name: "cloud".into(),
            url: String::new(),
            access_token: "tok".into(),
            ssh: Some(ssh.clone()),
        })
        .await
        .unwrap();

        // 文件往返：其余段保留、ssh 表可读回
        let text = std::fs::read_to_string(&path).unwrap();
        let root: toml::Table = toml::from_str(&text).unwrap();
        let cores = root.get("cores").and_then(|c| c.as_array()).unwrap();
        let entry = cores[0].as_table().unwrap();
        let ssh_table = entry.get("ssh").and_then(|s| s.as_table()).unwrap();
        assert_eq!(
            ssh_table.get("host").unwrap().as_str().unwrap(),
            "203.0.113.9"
        );
        assert_eq!(ssh_table.get("user").unwrap().as_str().unwrap(), "root");
        assert_eq!(ssh_table.get("port").unwrap().as_integer().unwrap(), 22);
        assert_eq!(
            ssh_table.get("remote_port").unwrap().as_integer().unwrap(),
            3132
        );
        // 默认值不落盘（文件简洁）
        assert!(ssh_table.get("accept_new_host_key").is_none());

        // 编辑：password 留空 = 保留旧值；其他字段更新
        let mut edited = ssh.clone();
        edited.password = String::new();
        edited.host = "198.51.100.2".into();
        edited.remote_media_dir = String::new();
        reg.upsert(UpstreamConfig {
            name: "cloud".into(),
            url: String::new(),
            access_token: String::new(),
            ssh: Some(edited),
        })
        .await
        .unwrap();
        let list = reg.list().await;
        let stored = list[0].ssh.as_ref().unwrap();
        assert_eq!(stored.password, "secret"); // 保留
        assert_eq!(stored.host, "198.51.100.2"); // 更新
        assert_eq!(list[0].access_token, "tok"); // token 同样保留

        std::fs::remove_file(&path).ok();
    }

    /// 切换接入方式：直连 → SSH → 直连（ssh 段彻底清除）。
    #[tokio::test]
    async fn switch_between_direct_and_ssh() {
        let path = temp_path("switch");
        let reg = UpstreamRegistry::new(vec![], Some(path.clone()));
        let ssh = SshConfig {
            host: "h".into(),
            user: "u".into(),
            ..SshConfig::default()
        };
        reg.upsert(UpstreamConfig {
            name: "a".into(),
            url: String::new(),
            access_token: String::new(),
            ssh: Some(ssh),
        })
        .await
        .unwrap();
        assert!(reg.list().await[0].ssh.is_some());

        reg.upsert(UpstreamConfig::direct("a", "ws://10.0.0.1:3132", ""))
            .await
            .unwrap();
        let list = reg.list().await;
        assert!(list[0].ssh.is_none());
        assert!(list[0].has_endpoint());
        std::fs::remove_file(&path).ok();
    }

    #[tokio::test]
    async fn remove_emits_event_and_persists() {
        let path = temp_path("remove");
        let reg = UpstreamRegistry::new(
            vec![UpstreamConfig::direct("a", "ws://x:1", "")],
            Some(path.clone()),
        );
        let mut rx = reg.subscribe();
        assert!(reg.remove("a").await.unwrap());
        assert!(matches!(rx.try_recv(), Ok(UpstreamEvent::Removed { .. })));
        let text = std::fs::read_to_string(&path).unwrap();
        let root: toml::Table = toml::from_str(&text).unwrap();
        assert!(root
            .get("cores")
            .and_then(|c| c.as_array())
            .unwrap()
            .is_empty());
        assert!(!reg.remove("a").await.unwrap());
        std::fs::remove_file(&path).ok();
    }

    /// 整树写回不破坏其它配置段。
    #[tokio::test]
    async fn persist_preserves_other_sections() {
        let path = temp_path("preserve");
        std::fs::write(
            &path,
            "[server]\nbind_address = \"0.0.0.0:8080\"\n[core]\nconnect_url = \"ws://x:1\"\n",
        )
        .unwrap();
        let reg = UpstreamRegistry::new(vec![], Some(path.clone()));
        reg.upsert(UpstreamConfig::direct("a", "ws://y:2", ""))
            .await
            .unwrap();
        let text = std::fs::read_to_string(&path).unwrap();
        let root: toml::Table = toml::from_str(&text).unwrap();
        assert_eq!(
            root["server"]["bind_address"].as_str().unwrap(),
            "0.0.0.0:8080"
        );
        assert_eq!(root["core"]["connect_url"].as_str().unwrap(), "ws://x:1");
        std::fs::remove_file(&path).ok();
    }
}
