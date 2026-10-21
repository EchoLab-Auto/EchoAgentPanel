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
    /// 来源（P2 自动发现，2026-11）：`""`/`manual` = 人工配置；
    /// `discovered` = 由 Core 的 `FederationDirectory` 派生。
    ///
    /// 派生条目的两条特殊语义：
    /// 1. **凭据来自 Panel 身份**——创建时若未给 token，自动填
    ///    `[federation] panel_key`（不是任何节点的管理令牌）；
    /// 2. **可被自动撤销**——人工条目永不被自动删/覆盖（见 `upsert` 的冲突
    ///    规则与 `remove_discovered`）。
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub source: String,
}

impl UpstreamConfig {
    /// 是否自动发现派生（人工条目一律 false）。
    pub fn is_discovered(&self) -> bool {
        self.source == "discovered"
    }

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
            source: String::new(),
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
    /// **Panel 身份密钥**（P2，2026-11；`[federation] panel_key`）。
    ///
    /// 自动发现的接入点创建时用它作 Bearer（而不是任何节点的管理令牌）。
    /// 单独放注册表而不是塞进每个 `UpstreamConfig`：这是**一份**身份，
    /// 轮换时只改一处（下次发现即用新密钥重建链路）。
    panel_key: std::sync::RwLock<String>,
    /// 是否启用自动发现（`[federation] discover`，默认 true）。
    ///
    /// 与 `panel_key` 分开：密钥是**凭据**，开关是**意愿**。运维可能想保留
    /// 密钥（手工加派生条目时也用得上）但暂时关掉自动派生——例如目标节点
    /// 正在滚动升级。
    discover: std::sync::atomic::AtomicBool,
}

impl UpstreamRegistry {
    pub fn new(initial: Vec<UpstreamConfig>, persist: Option<PathBuf>) -> Arc<Self> {
        let (events, _) = broadcast::channel(64);
        Arc::new(Self {
            inner: RwLock::new(initial),
            persist,
            events,
            panel_key: std::sync::RwLock::new(String::new()),
            discover: std::sync::atomic::AtomicBool::new(true),
        })
    }

    /// 设置 Panel 身份密钥（启动装配期一次；轮换时可再调）。
    pub fn set_panel_key(&self, key: impl Into<String>) {
        if let Ok(mut slot) = self.panel_key.write() {
            *slot = key.into().trim().to_string();
        }
    }

    /// 当前 Panel 身份密钥（空 = 不做自动发现）。
    pub fn panel_key(&self) -> String {
        self.panel_key
            .read()
            .map(|slot| slot.clone())
            .unwrap_or_default()
    }

    /// 设置自动发现开关（`[federation] discover`）。
    pub fn set_discover(&self, enabled: bool) {
        self.discover
            .store(enabled, std::sync::atomic::Ordering::Relaxed);
    }

    /// 是否启用自动发现（有身份密钥才谈得上"用同一把密钥接全网"）。
    pub fn can_discover(&self) -> bool {
        self.discover.load(std::sync::atomic::Ordering::Relaxed) && !self.panel_key().is_empty()
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
        let discovered = config.is_discovered();
        // 派生条目：凭据来自 **Panel 身份密钥**（不是任何节点的管理令牌）。
        // 空密钥时不建条目——否则会留下一条"永远 401"的僵尸接入点，比不发现
        // 更糟（用户以为连上了）。
        let mut token = config.access_token;
        if discovered && token.is_empty() {
            token = self.panel_key();
            if token.is_empty() {
                return Err(
                    "自动发现的接入点需要 [federation] panel_key（Panel 身份密钥）；\
                     当前未配置，已跳过该节点"
                        .into(),
                );
            }
        }
        let config = UpstreamConfig {
            name,
            access_token: token,
            url,
            ssh: config.ssh,
            source: if discovered {
                "discovered".to_string()
            } else {
                String::new()
            },
        };
        let effective = {
            let mut inner = self.inner.write().await;
            // 先快照旧状态——persist 失败时回滚内存，保持内存/磁盘一致
            // （此前 persist 失败返回 Err 但内存已改，重启即丢且三方分叉）。
            let backup = inner.clone();
            let mut effective = config.clone();
            match inner.iter_mut().find(|u| u.name == config.name) {
                Some(existing) => {
                    // **人工优先**（P2）：自动发现不得覆盖/降级人工配置的接入点。
                    // 否则用户手填的地址/令牌会被目录派生的一条悄悄改掉——那
                    // 是最难排查的一类"配置自己变了"。
                    if existing.is_discovered() != discovered {
                        return Err(format!(
                            "上游 `{}` 已由{}配置，忽略本次{}写入",
                            existing.name,
                            if existing.is_discovered() { "自动发现" } else { "手工" },
                            if discovered { "自动发现" } else { "手工" }
                        ));
                    }
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
        if effective.is_discovered() {
            tracing::info!(
                upstream = %effective.name,
                url = %effective.url,
                "discovered upstream added (Panel identity)"
            );
        }
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

    /// 清理**不再出现在目录里**的派生接入点（P2，2026-11）。
    ///
    /// 存活判据是**地址或名字任一对得上**：
    /// - `keep_urls`：目录里当前仍被提到的可拨地址（首选判据——派生条目的
    ///   名字是 Panel 本地派生的，邻居改别名后会变，但地址不会）；
    /// - `keep_names`：邻居名/node_name 的小写集合（兜底：邻居宣告地址变了
    ///   但身份没变）。
    ///
    /// 人工条目**永不**受影响（`source` 不是 `discovered` 的一律保留）——
    /// 这是自动清理的安全边界：网络抖动导致目录少报一台时，只丢派生条目，
    /// 用户手配的永远在。
    ///
    /// 返回被移除的名字（用于日志与前端提示）。
    pub async fn remove_discovered(
        &self,
        keep_urls: &std::collections::HashSet<String>,
        keep_names: &std::collections::HashSet<String>,
        drop_names: &std::collections::HashSet<String>,
    ) -> Vec<String> {
        let mut removed = Vec::new();
        {
            let mut inner = self.inner.write().await;
            let backup = inner.clone();
            inner.retain(|u| {
                let lower = u.name.to_lowercase();
                // ① 确认重复（2026-10）：同一台机器的另一个地址。这类条目在
                //    `keep_urls` 里是有主的（目录确实还提到那个地址），只按
                //    地址/名字判定永远清不掉，必须显式点名删除。
                if u.is_discovered() && drop_names.contains(&lower) {
                    removed.push(u.name.clone());
                    return false;
                }
                let alive = keep_urls.contains(u.url.trim_end_matches('/'))
                    || keep_names.contains(&lower);
                let drop = u.is_discovered() && !alive;
                if drop {
                    removed.push(u.name.clone());
                }
                !drop
            });
            if removed.is_empty() {
                return removed;
            }
            if let Err(error) = self.persist_locked(&inner) {
                // 持久化失败：回滚内存（与 upsert 同一条纪律），并放弃本次清理。
                *inner = backup;
                tracing::warn!(error = %error, "清理派生接入点失败（已回滚）");
                return Vec::new();
            }
        }
        for name in &removed {
            let _ = self.events.send(UpstreamEvent::Removed { name: name.clone() });
        }
        removed
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
                // 来源标记：`discovered` 必须落盘，否则重启后派生条目会
                // 变成"人工条目"，既不会被清理、也会挡住后续自动发现。
                if u.is_discovered() {
                    t.insert(
                        "source".into(),
                        toml::Value::String("discovered".into()),
                    );
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
                source: String::new(),
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
            source: String::new(),
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
            source: String::new(),
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
            source: String::new(),
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

    // ── P2 自动发现（2026-11）────────────────────────────────────────────

    /// 派生接入点的凭据来自 **Panel 身份密钥**，不是任何人的管理令牌。
    #[tokio::test]
    async fn discovered_upstream_uses_panel_identity_key() {
        let path = temp_path("discovered-token");
        let reg = UpstreamRegistry::new(vec![], Some(path.clone()));
        reg.set_panel_key("panel-key-1");
        assert!(reg.can_discover());

        let effective = reg
            .upsert(UpstreamConfig {
                name: "gpu-box".into(),
                url: "ws://10.0.0.9:3132".into(),
                access_token: String::new(), // 调用方不给凭据 → 用 Panel 身份
                ssh: None,
                source: "discovered".into(),
            })
            .await
            .unwrap();
        assert_eq!(effective.access_token, "panel-key-1");
        assert!(effective.is_discovered());

        // 落盘带来源标记（重启后仍能被识别为派生、可清理）。
        let text = std::fs::read_to_string(&path).unwrap();
        let root: toml::Table = toml::from_str(&text).unwrap();
        let entry = &root["cores"].as_array().unwrap()[0];
        assert_eq!(entry["source"].as_str(), Some("discovered"));
        std::fs::remove_file(&path).ok();
    }

    /// 没有 Panel 身份密钥时**不建**派生条目（否则是一条永远 401 的僵尸）。
    #[tokio::test]
    async fn discovered_upstream_requires_panel_key() {
        let reg = UpstreamRegistry::new(vec![], None);
        assert!(!reg.can_discover());
        let err = reg
            .upsert(UpstreamConfig {
                name: "gpu-box".into(),
                url: "ws://10.0.0.9:3132".into(),
                access_token: String::new(),
                ssh: None,
                source: "discovered".into(),
            })
            .await
            .expect_err("no panel key must refuse discovered upstream");
        assert!(err.contains("panel_key"), "{err}");
        assert!(reg.list().await.is_empty(), "失败的写入不得留下条目");
    }

    /// **人工优先**：自动发现不得覆盖人工条目；人工也不得把派生条目"洗白"
    /// （两个方向都拒绝，避免"配置自己变了"）。
    #[tokio::test]
    async fn discovered_and_manual_never_overwrite_each_other() {
        let reg = UpstreamRegistry::new(vec![UpstreamConfig::direct("a", "ws://x:1", "tok")], None);
        reg.set_panel_key("panel-key-1");

        // 派生 → 已存在的人工条目：拒绝。
        let err = reg
            .upsert(UpstreamConfig {
                name: "a".into(),
                url: "ws://other:1".into(),
                access_token: String::new(),
                ssh: None,
                source: "discovered".into(),
            })
            .await
            .expect_err("discovered must not overwrite manual");
        assert!(err.contains("手工"), "{err}");
        assert_eq!(reg.list().await[0].url, "ws://x:1", "人工地址必须原样保留");

        // 反向：手工写入同名派生条目 → 同样拒绝（否则清理逻辑会误删用户刚配的）。
        let discovered = reg
            .upsert(UpstreamConfig {
                name: "b".into(),
                url: "ws://y:1".into(),
                access_token: String::new(),
                ssh: None,
                source: "discovered".into(),
            })
            .await
            .unwrap();
        assert!(discovered.is_discovered());
        let err = reg
            .upsert(UpstreamConfig::direct("b", "ws://y:2", "tok"))
            .await
            .expect_err("manual must not silently take over a discovered entry");
        assert!(err.contains("自动发现"), "{err}");
    }

    /// 清理只影响派生条目：`keep` 之外的人工条目必须活着。
    #[tokio::test]
    async fn discovered_cleanup_never_touches_manual_entries() {
        let reg = UpstreamRegistry::new(vec![UpstreamConfig::direct("manual", "ws://m:1", "t")], None);
        reg.set_panel_key("panel-key-1");
        for name in ["gone", "stays"] {
            reg.upsert(UpstreamConfig {
                name: name.into(),
                url: format!("ws://{name}:1"),
                access_token: String::new(),
                ssh: None,
                source: "discovered".into(),
            })
            .await
            .unwrap();
        }
        // 存活判据：地址（首选）或名字。
        let mut keep_urls = std::collections::HashSet::new();
        keep_urls.insert("ws://stays:1".to_string());
        let keep_names = std::collections::HashSet::new();
        let drop_names = std::collections::HashSet::new();
        let removed = reg
            .remove_discovered(&keep_urls, &keep_names, &drop_names)
            .await;
        assert_eq!(removed, vec!["gone".to_string()]);
        let names: Vec<String> = reg.list().await.into_iter().map(|u| u.name).collect();
        assert_eq!(names, vec!["manual".to_string(), "stays".to_string()]);
    }

    /// 身份去重（2026-10）：`drop_names` 点名的派生条目**无视 keep 规则**删除
    /// ——同一台机器的另一个地址会被"目录里确实提到"保住，只靠 keep 集合永远
    /// 清不掉。人工条目即使被点名也必须留下（点了也不许动）。
    #[tokio::test]
    async fn duplicate_discovered_entries_are_dropped_even_when_kept() {
        let reg = UpstreamRegistry::new(
            vec![UpstreamConfig::direct("core", "ws://127.0.0.1:3132", "t")],
            None,
        );
        reg.set_panel_key("panel-key-1");
        for name in ["node-self", "unique"] {
            reg.upsert(UpstreamConfig {
                name: name.into(),
                url: format!("ws://{name}:3132"),
                access_token: String::new(),
                ssh: None,
                source: "discovered".into(),
            })
            .await
            .unwrap();
        }
        // 两个派生条目都在目录里（所以 keep 集合会保住它们）——这正是线上故障
        // 的形状：重复条目永远清不掉。
        let keep_urls: std::collections::HashSet<String> =
            ["ws://node-self:3132", "ws://unique:3132"]
                .into_iter()
                .map(String::from)
                .collect();
        let keep_names: std::collections::HashSet<String> =
            ["node-self", "unique"].into_iter().map(String::from).collect();
        // 前端认出 node-self 就是 core（同一 node_id），并要求删掉它；
        // 顺带把人工条目 "core" 也点名（必须被忽略）。
        let drop_names: std::collections::HashSet<String> =
            ["node-self", "core"].into_iter().map(String::from).collect();
        let removed = reg
            .remove_discovered(&keep_urls, &keep_names, &drop_names)
            .await;
        assert_eq!(removed, vec!["node-self".to_string()]);
        let names: Vec<String> = reg.list().await.into_iter().map(|u| u.name).collect();
        assert_eq!(names, vec!["core".to_string(), "unique".to_string()]);
    }
}
