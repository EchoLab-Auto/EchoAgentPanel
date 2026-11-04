//! Panel 的可嵌入运行库。
//!
//! `echo-agent-panel`（独立外壳）与 Core 的 `echo-plugin-panel`（进程内插件）
//! 共用这里，HTTP/WS、静态资源、多上游、SSH 与联邦发现只有一份实现。
//! 日志 subscriber 由外壳初始化，库绝不写进程级全局状态。

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::Result;
use axum::routing::get;
use axum::Router;
use tracing::{info, warn};

use crate::config::PanelConfig;

/// 两种运行形态共用的启动参数。
#[derive(Debug, Clone)]
pub struct PanelRuntimeConfig {
    /// 独立外壳的配置文件；Some = 完整多上游/SSH/联邦发现。
    pub config_file: Option<PathBuf>,
    pub bind: String,
    pub static_dir: PathBuf,
    pub core: String,
    pub core_access_token: String,
    pub access_token: String,
    pub media_dir: PathBuf,
    pub media_cache_dir: PathBuf,
}

impl PanelRuntimeConfig {
    /// 将独立外壳的完整 TOML 转成运行参数。
    pub fn from_panel_config(cfg: PanelConfig) -> Self {
        let media_dir = cfg.server.effective_media_dir();
        let media_cache_dir = cfg.server.effective_media_cache_dir();
        Self {
            config_file: None,
            bind: cfg.server.bind_address,
            static_dir: PathBuf::from(cfg.server.static_dir),
            core: cfg.core.connect_url,
            core_access_token: cfg.core.access_token,
            access_token: cfg.server.access_token,
            media_dir,
            media_cache_dir,
        }
    }
}

/// 正在运行的 Panel；drop/shutdown 会停止 listener 和后台任务。
pub struct RunningPanel {
    shutdown: Option<tokio::sync::oneshot::Sender<()>>,
    task: Option<tokio::task::JoinHandle<()>>,
    probe: Option<tokio::task::JoinHandle<()>>,
    local_addr: std::net::SocketAddr,
    tunnels: Arc<crate::ssh::SshTunnels>,
}

impl RunningPanel {
    pub fn local_addr(&self) -> std::net::SocketAddr {
        self.local_addr
    }

    /// 同步触发优雅停止；Core 的 Disposer 不能 await，故只发信号。
    /// 实际 listener 释放由后台 task 完成；可用 `stopped()` 等待。
    pub fn shutdown(mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }
    }

    /// 独立外壳或测试需要等待完全停止时使用。
    pub async fn stopped(mut self) {
        if let Some(task) = self.task.take() {
            let _ = task.await;
        }
        if let Some(probe) = self.probe.take() {
            let _ = probe.await;
        }
    }
}

impl Drop for RunningPanel {
    fn drop(&mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }
        if let Some(task) = &self.task {
            task.abort();
        }
        if let Some(probe) = &self.probe {
            probe.abort();
        }
        self.tunnels.shutdown();
    }
}

pub struct PanelRuntime;

impl PanelRuntime {
    /// 在既有 Tokio runtime 的任意 worker 线程中启动。
    ///
    /// 插件 mount 是同步接口，但宿主可能在多线程 runtime 的 worker 上调用；
    /// 直接 `Handle::block_on` 会 panic。将 listener 建立交给一个短生命周期的
    /// 独立 Tokio worker，启动完成后只把已 bind 的服务任务交给宿主 runtime。
    pub fn start(config: PanelRuntimeConfig) -> Result<RunningPanel> {
        let handle = tokio::runtime::Handle::try_current()
            .map_err(|e| anyhow::anyhow!("PanelRuntime::start must run inside Tokio: {e}"))?;
        std::thread::scope(|scope| {
            scope
                .spawn(|| {
                    let local = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .expect("temporary Panel startup runtime");
                    local.block_on(Self::start_async_in(handle, config))
                })
                .join()
                .map_err(|_| anyhow::anyhow!("Panel startup worker panicked"))?
        })
    }

    async fn start_async_in(
        handle: tokio::runtime::Handle,
        config: PanelRuntimeConfig,
    ) -> Result<RunningPanel> {
        let _guard = handle.enter();
        Self::start_async(config).await
    }

    pub async fn start_async(config: PanelRuntimeConfig) -> Result<RunningPanel> {
        if config.static_dir.as_os_str().is_empty() {
            anyhow::bail!("Panel static_dir is required");
        }
        let (upstream_list, persist_path, panel_key, discover) =
            if let Some(path) = &config.config_file {
                let panel = PanelConfig::load(path)?;
                (
                    panel.upstreams(),
                    Some(path.clone()),
                    panel.federation.panel_key,
                    panel.federation.discover,
                )
            } else {
                (
                    vec![crate::config::UpstreamSection {
                        name: "core".into(),
                        url: config.core.clone(),
                        access_token: config.core_access_token,
                        ssh: None,
                        source: String::new(),
                    }],
                    None,
                    String::new(),
                    false,
                )
            };
        let mut seen = std::collections::HashSet::new();
        let upstream_list: Vec<_> = upstream_list
            .into_iter()
            .filter_map(|u| {
                if u.name.is_empty() || u.name.chars().any(|c| c.is_whitespace() || c == ':') {
                    warn!(name = %u.name, "invalid upstream name in config, skipped");
                    return None;
                }
                if !seen.insert(u.name.clone()) {
                    warn!(name = %u.name, "duplicate upstream name in config, kept first");
                    return None;
                }
                Some(crate::upstreams::UpstreamConfig {
                    name: u.name,
                    url: u.url,
                    access_token: u.access_token,
                    ssh: u.ssh,
                    source: u.source,
                })
            })
            .collect();
        let upstream_desc = if upstream_list.is_empty() {
            "(none — 在设置·Core 连接中添加)".to_string()
        } else {
            upstream_list
                .iter()
                .map(|u| match &u.ssh {
                    Some(ssh) => format!("{}=ssh://{}@{}:{}", u.name, ssh.user, ssh.host, ssh.port),
                    None => format!("{}={}", u.name, u.url),
                })
                .collect::<Vec<_>>()
                .join(", ")
        };
        let registry = crate::upstreams::UpstreamRegistry::new(upstream_list, persist_path);
        registry.set_discover(discover);
        if !panel_key.is_empty() {
            registry.set_panel_key(panel_key);
        }
        let tunnels = crate::ssh::SshTunnels::new(config.media_cache_dir.clone());
        for upstream in registry.list().await {
            if let Some(ssh) = &upstream.ssh {
                if let Err(message) = tunnels.ensure(&upstream.name, ssh).await {
                    warn!(upstream = %upstream.name, %message, "ssh upstream disabled (invalid config)");
                }
            }
        }
        let state = crate::proxy::AppState::new(
            registry,
            Arc::from(config.static_dir.to_string_lossy().into_owned().as_str()),
            Arc::from(config.media_dir.to_string_lossy().into_owned().as_str()),
            Arc::from(config.access_token.as_str()),
            tunnels,
        );
        if !config.access_token.is_empty() {
            info!("access token auth enabled for WS/HTTP API");
        } else if !config.bind.starts_with("127.0.0.1") && !config.bind.starts_with("localhost") {
            warn!("no access token configured and not bound to localhost — panel is OPEN to the network; set access_token");
        }
        let probe = tokio::spawn(crate::proxy::probe_pump(state.clone()));
        let app = Router::new()
            .route("/ws", get(crate::proxy::ws_handler))
            .route("/media/{name}", get(crate::media::media_handler))
            .route("/api/logs/panel", get(crate::log::panel_logs))
            .route("/api/logs/core", get(crate::log::core_logs))
            .route(
                "/api/diag",
                get(crate::diag::get_diag)
                    .post(crate::diag::post_diag)
                    .delete(crate::diag::clear_diag),
            )
            .merge(crate::upstreams_api::routes())
            .route_layer(axum::middleware::from_fn_with_state(
                state.clone(),
                crate::upstreams_api::require_auth,
            ))
            .fallback(crate::static_files::static_handler)
            .with_state(state.clone());
        let listener = tokio::net::TcpListener::bind(&config.bind)
            .await
            .map_err(|e| anyhow::anyhow!("cannot bind {}: {e}", config.bind))?;
        let local_addr = listener.local_addr()?;
        info!(bind = %local_addr, upstreams = %upstream_desc, static_dir = %config.static_dir.display(), "Panel runtime listening");
        let (shutdown, mut shutdown_rx) = tokio::sync::oneshot::channel();
        let task = tokio::spawn(async move {
            let result = axum::serve(
                listener,
                app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
            )
            .with_graceful_shutdown(async move {
                let _ = (&mut shutdown_rx).await;
            })
            .await;
            if let Err(error) = result {
                tracing::error!(%error, "Panel HTTP server failed");
            }
        });
        Ok(RunningPanel {
            shutdown: Some(shutdown),
            task: Some(task),
            probe: Some(probe),
            local_addr,
            tunnels: state.tunnels.clone(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> PanelRuntimeConfig {
        PanelRuntimeConfig {
            config_file: None,
            bind: "127.0.0.1:0".into(),
            static_dir: PathBuf::from("web/dist"),
            core: "ws://127.0.0.1:9".into(),
            core_access_token: String::new(),
            access_token: String::new(),
            media_dir: std::env::temp_dir(),
            media_cache_dir: std::env::temp_dir(),
        }
    }

    #[tokio::test]
    async fn start_and_shutdown_release_the_port() {
        let running = PanelRuntime::start_async(config()).await.unwrap();
        let address = running.local_addr();
        assert!(tokio::net::TcpStream::connect(address).await.is_ok());
        running.shutdown();
        // shutdown 是同步信号，等 listener 真正关闭后再断言重绑。
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
        tokio::net::TcpListener::bind(address).await.unwrap();
    }
}
