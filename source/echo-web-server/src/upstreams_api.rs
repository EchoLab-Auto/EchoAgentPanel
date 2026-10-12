//! 上游管理 HTTP API（多上游聚合视图，2026-10；SSH 接入 2026-10 末）：
//!
//! - `GET    /api/upstreams`        → 上游列表 + 各链路在线状态（token 脱敏）
//! - `POST   /api/upstreams`        → 新增/更新 `{name, url, access_token?, ssh?}`
//! - `DELETE /api/upstreams/{name}` → 删除
//!
//! 薄路由层：参数解析 + 调用 [`UpstreamRegistry`] + 状态码映射。
//! 在线状态由中继编排层（`proxy.rs`）经共享原子表上报，本层只读；
//! SSH 上游额外合并隧道状态（`ssh::SshTunnels`），隧道未在线时其状态
//! 优先展示（比"连接本地端口被拒"的链路错误信息量高）。
//!
//! 隧道生命周期**跟随配置**：upsert 成功后 ensure（幂等；配置未变复用），
//! 直连上游/删除时摘除。

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use tracing::warn;

use crate::proxy::AppState;
use crate::ssh::SshConfig;
use crate::upstreams::UpstreamConfig;

/// `GET /api/upstreams` 响应元素。
#[derive(serde::Serialize)]
pub struct UpstreamStatus {
    pub name: String,
    /// 直连地址（SSH 接入时为空串——展示走 `ssh` 字段）。
    pub url: String,
    pub token_set: bool,
    /// 接入方式：`direct`（直连）| `ssh`（SSH 隧道）。
    pub access: String,
    /// 当前是否有活跃中继链路（任一浏览器连接的任一上游链路在线即算）。
    pub online: bool,
    /// 连通性：`online` / `connecting` / `offline`。
    pub connectivity: String,
    /// 认证：`ok` / `failed` / `unknown`。
    pub auth: String,
    /// 最近一次连接错误描述（成功时 None）。
    pub last_error: Option<String>,
    /// 最近检查时间（unix 秒）。
    pub last_checked: u64,
    /// SSH 接入详情（`access = "ssh"` 时非空；**凭据不回传**——
    /// password/passphrase 仅以 `password_set` 标记存在与否）。
    pub ssh: Option<SshStatusView>,
}

/// SSH 接入的状态视图（脱敏）。
#[derive(serde::Serialize)]
pub struct SshStatusView {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub remote_port: u16,
    pub identity_file: String,
    pub password_set: bool,
    /// 远端媒体库目录（空 = 默认 `~/.local/share/echo-agent-core/media`）。
    pub remote_media_dir: String,
    /// 隧道阶段：`connecting` / `online` / `offline`。
    pub phase: String,
    /// 隧道最近错误（建连/认证失败原因）。
    pub error: Option<String>,
    /// 本地转发端口（展示用）。
    pub local_port: Option<u16>,
}

pub async fn list_upstreams(State(state): State<AppState>) -> impl IntoResponse {
    let list = state.registry.list().await;
    let health = state.upstream_health();
    let mut out: Vec<UpstreamStatus> = Vec::with_capacity(list.len());
    for u in list {
        let h = health.get(&u.name);
        let mut connectivity = h
            .map(|x| x.connectivity.clone())
            .unwrap_or_else(|| "offline".into());
        let mut auth = h
            .map(|x| x.auth.clone())
            .unwrap_or_else(|| "unknown".into());
        let mut last_error = h.and_then(|x| x.last_error.clone());
        let mut last_checked = h.map(|x| x.last_checked).unwrap_or(0);

        let ssh = match &u.ssh {
            Some(cfg) => {
                let tunnel = state.tunnels.status(&u.name).await;
                // 隧道非在线时其状态优先（链路错误只是"本地端口被拒"的表象）。
                if let Some(tunnel) = &tunnel {
                    if tunnel.phase != "online" {
                        if tunnel.phase == "connecting" {
                            connectivity = "connecting".into();
                        } else {
                            connectivity = "offline".into();
                        }
                        auth = "unknown".into();
                        last_error = tunnel.error.clone().map(|error| format!("SSH: {error}"));
                        last_checked = now_unix();
                    }
                }
                Some(SshStatusView {
                    host: cfg.host.clone(),
                    port: cfg.port,
                    user: cfg.user.clone(),
                    remote_port: cfg.remote_port,
                    identity_file: cfg.identity_file.clone(),
                    password_set: !cfg.password.is_empty(),
                    remote_media_dir: cfg.remote_media_dir.clone(),
                    phase: tunnel
                        .as_ref()
                        .map(|t| t.phase.clone())
                        .unwrap_or_else(|| "connecting".into()),
                    error: tunnel.as_ref().and_then(|t| t.error.clone()),
                    local_port: tunnel.as_ref().and_then(|t| t.local_port),
                })
            }
            None => None,
        };
        out.push(UpstreamStatus {
            online: connectivity == "online",
            connectivity,
            auth,
            last_error,
            last_checked,
            token_set: !u.access_token.is_empty(),
            access: if ssh.is_some() {
                "ssh".into()
            } else {
                "direct".into()
            },
            name: u.name,
            url: sanitize_url(&u.url),
            ssh,
        });
    }
    Json(out)
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// URL 凭据脱敏：`ws://user:pass@host` → `ws://***@host`——凭据
/// 绝不回传给任何能打开面板的人（🟡 修复）。
fn sanitize_url(url: &str) -> String {
    match url.split_once("://") {
        Some((scheme, rest)) => match rest.split_once('@') {
            Some((_creds, host)) => format!("{scheme}://***@{host}"),
            None => url.to_string(),
        },
        None => url.to_string(),
    }
}

/// `POST /api/upstreams` 请求体。
#[derive(serde::Deserialize)]
pub struct UpsertBody {
    pub name: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub access_token: String,
    /// SSH 接入段（出现即"接入方式 = SSH"；编辑时 password/passphrase
    /// 留空 = 保留旧值）。
    #[serde(default)]
    pub ssh: Option<SshConfig>,
}

pub async fn upsert_upstream(
    State(state): State<AppState>,
    Json(body): Json<UpsertBody>,
) -> impl IntoResponse {
    match state
        .registry
        .upsert(UpstreamConfig {
            name: body.name,
            url: body.url,
            access_token: body.access_token,
            ssh: body.ssh,
        })
        .await
    {
        Ok(effective) => {
            // 隧道生命周期跟随配置：SSH 上游 ensure（幂等；配置未变直接复用），
            // 直连上游摘除残留隧道。
            if let Some(ssh) = &effective.ssh {
                if let Err(message) = state.tunnels.ensure(&effective.name, ssh).await {
                    warn!(upstream = %effective.name, %message, "ssh tunnel ensure failed");
                    return (StatusCode::INTERNAL_SERVER_ERROR, message).into_response();
                }
            } else {
                state.tunnels.remove(&effective.name).await;
            }
            StatusCode::NO_CONTENT.into_response()
        }
        Err(message) => (StatusCode::BAD_REQUEST, message).into_response(),
    }
}

pub async fn delete_upstream(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> impl IntoResponse {
    match state.registry.remove(&name).await {
        Ok(true) => {
            state.tunnels.remove(&name).await;
            StatusCode::NO_CONTENT.into_response()
        }
        Ok(false) => (StatusCode::NOT_FOUND, format!("上游 {name} 不存在")).into_response(),
        Err(message) => (StatusCode::INTERNAL_SERVER_ERROR, message).into_response(),
    }
}

/// 路由定义（无状态绑定——由调用方在主 Router 的静态兜底前
/// merge，共享同一 AppState）。
pub fn routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route(
            "/api/upstreams",
            axum::routing::get(list_upstreams).post(upsert_upstream),
        )
        .route(
            "/api/upstreams/{name}",
            axum::routing::delete(delete_upstream),
        )
}

/// Bearer 认证中间件（2026-10 安全收紧）：token 非空时校验
/// `Authorization: Bearer` 或 `?token=`，未通过 401。由 main.rs 挂载
/// 到 /api/*、/media、/logs 路由（WS 握手在 handler 内单独校验）。
pub async fn require_auth(
    State(state): State<AppState>,
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let token = req
        .uri()
        .query()
        .and_then(|q| q.split('&').find_map(|kv| kv.strip_prefix("token=")))
        .map(str::to_string);
    if !state.authorized(req.headers(), token.as_deref()) {
        return axum::http::StatusCode::UNAUTHORIZED.into_response();
    }
    next.run(req).await
}

// 保持 Arc 链接（文档用）
#[allow(dead_code)]
fn _assert_arc(_: Arc<UpstreamConfig>) {}
