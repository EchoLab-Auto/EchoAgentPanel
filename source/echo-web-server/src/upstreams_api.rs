//! 上游管理 HTTP API（多上游聚合视图，2026-10）：
//!
//! - `GET    /api/upstreams`        → 上游列表 + 各链路在线状态（token 脱敏）
//! - `POST   /api/upstreams`        → 新增/更新 `{name, url, access_token?}`
//! - `DELETE /api/upstreams/{name}` → 删除
//!
//! 薄路由层：参数解析 + 调用 [`UpstreamRegistry`] + 状态码映射。
//! 在线状态由中继编排层（`proxy::RelayHub`）经共享原子表上报，本层只读。

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

use crate::proxy::AppState;
use crate::upstreams::UpstreamConfig;

/// `GET /api/upstreams` 响应元素。
#[derive(serde::Serialize)]
pub struct UpstreamStatus {
    pub name: String,
    pub url: String,
    pub token_set: bool,
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
}

pub async fn list_upstreams(State(state): State<AppState>) -> impl IntoResponse {
    let list = state.registry.list().await;
    let health = state.upstream_health();
    let out: Vec<UpstreamStatus> = list
        .into_iter()
        .map(|u| {
            let h = health.get(&u.name);
            UpstreamStatus {
                online: h.map(|x| x.connectivity == "online").unwrap_or(false),
                connectivity: h
                    .map(|x| x.connectivity.clone())
                    .unwrap_or_else(|| "offline".into()),
                auth: h
                    .map(|x| x.auth.clone())
                    .unwrap_or_else(|| "unknown".into()),
                last_error: h.and_then(|x| x.last_error.clone()),
                last_checked: h.map(|x| x.last_checked).unwrap_or(0),
                token_set: !u.access_token.is_empty(),
                name: u.name,
                url: sanitize_url(&u.url),
            }
        })
        .collect();
    Json(out)
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
        })
        .await
    {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(message) => (StatusCode::BAD_REQUEST, message).into_response(),
    }
}

pub async fn delete_upstream(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> impl IntoResponse {
    match state.registry.remove(&name).await {
        Ok(true) => StatusCode::NO_CONTENT.into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, format!("上游 {name} 不存在")).into_response(),
        Err(message) => (StatusCode::INTERNAL_SERVER_ERROR, message).into_response(),
    }
}

/// 路由定义（无状态绑定——由调用方在主 Router 的  前
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
