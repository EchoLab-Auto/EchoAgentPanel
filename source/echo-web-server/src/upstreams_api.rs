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
}

pub async fn list_upstreams(State(state): State<AppState>) -> impl IntoResponse {
    let list = state.registry.list().await;
    let online = state.online_upstreams();
    let out: Vec<UpstreamStatus> = list
        .into_iter()
        .map(|u| UpstreamStatus {
            online: online.contains(&u.name),
            token_set: !u.access_token.is_empty(),
            name: u.name,
            url: u.url,
        })
        .collect();
    Json(out)
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

// 保持 Arc 链接（文档用）
#[allow(dead_code)]
fn _assert_arc(_: Arc<UpstreamConfig>) {}
