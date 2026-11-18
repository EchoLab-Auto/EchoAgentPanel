//! Panel 的可嵌入运行库。
//!
//! `echo-agent-panel`（独立外壳）与 Core 的 `agent-module-panel`（进程内模块）
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
    /// 访问令牌是否**强制**（`[server] require_token`；缺省 true）。
    ///
    /// 与 `access_token` 分开：可以先存令牌、稍后再开强制（见
    /// `config::ServerSection::require_token` 的说明）。
    pub require_token: bool,
    /// 是否跑在 Core 进程内（`agent-module-panel`）而不是独立外壳。
    ///
    /// 前端据此区分形态：内嵌时「Panel 自身」的版本/更新/重启都由 Core 负责，
    /// 独立时才是这个二进制自己的事。运行期行为**不因它分叉**——两条形态共用
    /// 同一条中继代码路径（见模块文档）。
    pub embedded: bool,
    /// 应用基址（`[server] base_path`，恒以 `/` 结尾）。
    ///
    /// 根部署是 `/`。子路径部署（反向代理挂在 `/agent-panel`）时所有路由与
    /// 静态资源都移到这里，**前端也必须用同一个值构建**（`PANEL_BASE`）。
    pub base_path: String,
    /// 子路径部署时是否**同时**接受根路径入口（`[server] serve_root`）。
    ///
    /// 基址描述的是「被反代挂在哪个前缀下」，不是「这个进程只认这个前缀」：
    /// 直连监听端口的请求不经过反代，那条链路上根路径才是本源地址。
    pub serve_root: bool,
}

impl PanelRuntimeConfig {
    /// 将独立外壳的完整 TOML 转成运行参数。
    pub fn from_panel_config(cfg: PanelConfig) -> Self {
        let media_dir = cfg.server.effective_media_dir();
        let media_cache_dir = cfg.server.effective_media_cache_dir();
        // 基址在移动 `cfg.server.access_token` 之前取（String 不是 Copy）。
        let base_path = cfg.server.effective_base_path();
        let serve_root = cfg.server.serve_root;
        Self {
            config_file: None,
            bind: cfg.server.bind_address,
            static_dir: PathBuf::from(cfg.server.static_dir),
            core: cfg.core.connect_url,
            core_access_token: cfg.core.access_token,
            access_token: cfg.server.access_token,
            media_dir,
            media_cache_dir,
            require_token: cfg.server.require_token,
            // 面板前端与后端必须用同一个基址，所以这里取的是**配置值**而不是
            // 重新推导：前端构建时用 PANEL_BASE，后端用 [server] base_path，
            // 两者不一致就是「HTML 拿到了、JS 全 404」。
            base_path,
            serve_root,
            // 独立外壳（`echo-agent-panel`）走这条构造：不是内嵌。
            embedded: false,
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

/// 组装 Panel 的完整 HTTP 路由（独立外壳与内嵌形态共用）。
///
/// 注意：`route_layer(require_auth)` 只覆盖显式注册的 API/WS/媒体路由；
/// **静态 fallback 是公开的**（登录页/SPA shell 必须无凭据可加载）。
/// 它的越界防护由 `static_files` 自身完成，不能依赖认证中间件。
///
/// 部署门控的路径来自**本函数被调用时**读取一次的 `ECHO_DEPLOY_GATE_FILE`
/// （不是每个请求读进程环境）；文件内容则由 middleware 每次请求重读，部署器
/// 翻转 `maintenance` 无需重启。没有该环境变量时 `DeploymentGate::disabled()`，
/// 行为与旧版本一致。
pub fn router(state: crate::proxy::AppState) -> Router {
    router_with_gate(state, crate::deployment::DeploymentGate::from_env())
}

/// 与 [`router`] 相同，但由调用方显式提供门控句柄（测试/嵌入方使用）。
///
/// 门控 middleware 挂在整个 Router 的**最外层**（含静态 fallback），因此
/// 维护/配置损坏时静态 GET 也会得到 `503 no-store` 维护页，而不是继续提供
/// 缓存中的旧 UI。`/api/deployment` 的 GET/HEAD 被门控放行、由端点按状态回
/// `200/503`，认证仍走同一个 `route_layer(require_auth)`。
pub fn router_with_gate(
    state: crate::proxy::AppState,
    gate: crate::deployment::DeploymentGate,
) -> Router {
    // 基址在这里只取一次：`nest` 用不带尾斜杠的形态（axum 的 nest 不接受
    // 尾斜杠），静态处理器用的是 state 里那份带尾斜杠的（浏览器解析相对引用
    // 需要它）。两者由同一个规范化结果派生。
    let base = state.base_path().trim_end_matches('/').to_string();
    let serve_root = state.serve_root;

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
        .route("/api/deployment", get(crate::deployment::deployment_status))
        .merge(crate::upstreams_api::routes())
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::upstreams_api::require_auth,
        ))
        .fallback(crate::static_files::static_handler)
        .layer(axum::middleware::from_fn_with_state(
            gate,
            crate::deployment::guard,
        ))
        .with_state(state);

    if base.is_empty() {
        // 根部署：与历史完全一致，不套前缀。
        return app;
    }
    mount_under(app, base, serve_root)
}

/// 把 [app] 挂到 `prefix`（不带尾斜杠）之下。
///
/// # 为什么不用 `Router::nest`
///
/// axum 的 `nest("/agent-panel", …)` **不匹配** `/agent-panel/`（前缀加尾斜杠、
/// 后面什么都没有）—— 实测返回 404。而那个形态恰恰是最常用的两个入口：
///
/// - 浏览器把 `/agent-panel` 里解析出来的相对引用变成 `/agent-panel/…`；
/// - `manifest.webmanifest` 的 `start_url` 归一化后就带尾斜杠（装到桌面打开）；
/// - 反向代理转发时通常原样带着尾斜杠。
///
/// 少了它，「手敲不带斜杠能开、带斜杠 404 / PWA 打开 404」，而且这类 404 只在
/// 真浏览器里才看得见。所以这里自己判定前缀：**按路径段**剥，剥完把 URI 改写成
/// 内层那个坐标系（`/`、`/ws`、`/assets/…`），其余交给内层原样路由。
///
/// 前缀之外的处置由 `serve_root` 决定（`[server] serve_root`，缺省 true）：
/// 打开时原样交给内层根坐标系 —— 直连监听端口的请求根本不经过反向代理，
/// 那条链路上根路径才是本源地址；关掉时一律 404（外层域名上的其它路径属于
/// 别的应用，面板不该接管）。
///
/// `OriginalUri` 保持不变（完整路径）—— 静态处理器靠它 + 基址还原目录内路径，
/// 见 `static_files::strip_base`。
fn mount_under(app: Router, base: String, serve_root: bool) -> Router {
    Router::new()
        .fallback_service(app)
        .layer(axum::middleware::from_fn(
            move |mut request: axum::extract::Request, next: axum::middleware::Next| {
                let base = base.clone();
                async move {
                    let path = request.uri().path().to_string();
                    let rest = match path.strip_prefix(base.as_str()) {
                        // 整段匹配：`/agent-panel` 与 `/agent-panel/…` 命中，
                        // `/agent-panelx` 不命中。
                        Some(rest) if rest.is_empty() || rest.starts_with('/') => rest.to_string(),
                        // 前缀之外：`serve_root` 打开时原样交给内层（根坐标系），
                        // 关掉时一律 404。理由见 `config::ServerSection::serve_root`。
                        _ if serve_root => return next.run(request).await,
                        _ => {
                            return axum::response::IntoResponse::into_response(
                                axum::http::StatusCode::NOT_FOUND,
                            )
                        }
                    };
                    let inner_path = if rest.is_empty() { "/".to_string() } else { rest };
                    let path_and_query = match request.uri().query() {
                        Some(query) => format!("{inner_path}?{query}"),
                        None => inner_path,
                    };
                    let mut parts = request.uri().clone().into_parts();
                    match path_and_query.parse() {
                        Ok(value) => parts.path_and_query = Some(value),
                        Err(_) => return axum::response::IntoResponse::into_response(axum::http::StatusCode::BAD_REQUEST),
                    }
                    match axum::http::Uri::from_parts(parts) {
                        Ok(uri) => *request.uri_mut() = uri,
                        Err(_) => return axum::response::IntoResponse::into_response(axum::http::StatusCode::BAD_REQUEST),
                    }
                    next.run(request).await
                }
            },
        ))
}

pub struct PanelRuntime;

impl PanelRuntime {
    /// 在既有 Tokio runtime 的任意 worker 线程中启动。
    ///
    /// 模块 mount 是同步接口，但宿主可能在多线程 runtime 的 worker 上调用；
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
                if let Err(reason) = crate::upstreams::validate_upstream_name(&u.name) {
                    warn!(name = %u.name, %reason, "invalid upstream name in config, skipped");
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
        // 访问安全：令牌 + 是否强制，运行期可改（改完写回 config_file）。
        //
        // `config_file` 是**唯一**可写回的落点：内嵌形态没配它时，改动只在本
        // 进程内生效，`POST /api/security` 会如实回 `persisted: false`。
        let auth =
            crate::security::PanelAuth::new(config.access_token.clone(), config.require_token);
        auth.attach_config(config.config_file.clone());
        let state = crate::proxy::AppState::new(
            registry,
            Arc::from(config.static_dir.to_string_lossy().into_owned().as_str()),
            Arc::from(config.media_dir.to_string_lossy().into_owned().as_str()),
            Arc::from(""),
            tunnels,
        )
        .with_auth(auth, config.bind.clone())
        .with_embedded(config.embedded)
        .with_base_path(config.base_path.clone())
        .with_serve_root(config.serve_root);
        if config.require_token && !config.access_token.is_empty() {
            info!("access token auth enabled for WS/HTTP API");
        } else if config.require_token && config.access_token.is_empty() {
            warn!(
                "require_token = true but access_token is empty — auth is NOT enforced \
                 (set a token in 设置·面板 → 安全)"
            );
        } else if !config.bind.starts_with("127.0.0.1") && !config.bind.starts_with("localhost") {
            warn!("no access token configured and not bound to localhost — panel is OPEN to the network; set access_token");
        }
        let probe = tokio::spawn(crate::proxy::probe_pump(state.clone()));
        let app = router(state.clone());
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
            require_token: true,
            embedded: false,
            base_path: "/".to_string(),
            serve_root: true,
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
