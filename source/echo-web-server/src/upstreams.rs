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

/// 一个上游 Core（运行时视图；与配置 `[[cores]]` 一一对应）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UpstreamConfig {
    /// 上游名（UI 展示 + 帧打标键；唯一）。
    pub name: String,
    pub url: String,
    /// Bearer token（**状态查询不回传明文**；仅 `token_set` 标记）。
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub access_token: String,
}

/// 上游变更事件（中继编排层订阅）。
#[derive(Debug, Clone)]
pub enum UpstreamEvent {
    /// 新增/更新（url/token 变化时旧链路应摘除重连）。
    Upsert(UpstreamConfig),
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
    /// 空白/冒号（帧打标键卫生）、url 为 ws(s):// 或空。
    pub async fn upsert(&self, config: UpstreamConfig) -> Result<(), String> {
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
        let config = UpstreamConfig {
            name,
            access_token: config.access_token,
            url,
        };
        {
            let mut inner = self.inner.write().await;
            // 先快照旧状态——persist 失败时回滚内存，保持内存/磁盘一致
            // （此前 persist 失败返回 Err 但内存已改，重启即丢且三方分叉）。
            let backup = inner.clone();
            match inner.iter_mut().find(|u| u.name == config.name) {
                // token 留空 = 保留旧值（编辑场景）。
                Some(existing) => {
                    let token = if config.access_token.is_empty() {
                        existing.access_token.clone()
                    } else {
                        config.access_token.clone()
                    };
                    *existing = UpstreamConfig {
                        access_token: token,
                        ..config.clone()
                    };
                }
                None => inner.push(config.clone()),
            }
            if let Err(e) = self.persist_locked(&inner) {
                *inner = backup;
                return Err(e);
            }
        }
        let _ = self.events.send(UpstreamEvent::Upsert(config));
        Ok(())
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
            .upsert(UpstreamConfig {
                name: "".into(),
                url: "ws://x:1".into(),
                access_token: String::new(),
            })
            .await
            .is_err());
        assert!(reg
            .upsert(UpstreamConfig {
                name: "a b".into(),
                url: "ws://x:1".into(),
                access_token: String::new(),
            })
            .await
            .is_err());
        assert!(reg
            .upsert(UpstreamConfig {
                name: "a".into(),
                url: "http://x".into(),
                access_token: String::new(),
            })
            .await
            .is_err());

        reg.upsert(UpstreamConfig {
            name: "a".into(),
            url: "ws://127.0.0.1:3132".into(),
            access_token: "tok".into(),
        })
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
        reg.upsert(UpstreamConfig {
            name: "a".into(),
            url: "ws://127.0.0.1:9999".into(),
            access_token: String::new(),
        })
        .await
        .unwrap();
        let list = reg.list().await;
        assert_eq!(list[0].access_token, "tok");
        assert_eq!(list[0].url, "ws://127.0.0.1:9999");

        std::fs::remove_file(&path).ok();
    }

    #[tokio::test]
    async fn remove_emits_event_and_persists() {
        let path = temp_path("remove");
        let reg = UpstreamRegistry::new(
            vec![UpstreamConfig {
                name: "a".into(),
                url: "ws://x:1".into(),
                access_token: String::new(),
            }],
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
        reg.upsert(UpstreamConfig {
            name: "a".into(),
            url: "ws://y:2".into(),
            access_token: String::new(),
        })
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
