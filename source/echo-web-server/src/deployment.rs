//! 部署维护门控（deployment gate）。
//!
//! 外部部署器通过管理员显式设置的 `ECHO_DEPLOY_GATE_FILE` 指向一个**严格
//! JSON** 文件（部署器原子写入，Panel 只读）：
//!
//! ```json
//! {
//!   "schema_version": 1,
//!   "instance_id": "panel-prod-1",
//!   "maintenance": false,
//!   "release_id": "2026.11.14-1",
//!   "management_protocol": "echo-management/1"
//! }
//! ```
//!
//! 没有设置这个环境变量时，门控完全禁用，路由行为与旧版本一致。设置了
//! 环境变量后，每次请求都重新读取该文件（部署器翻 `maintenance` 不需要重启
//! Panel）；读取/校验失败一律 **fail closed**，而不是假设"没写就是没维护"。
//!
//! # 行为矩阵（门控配置了，但文件读不到 / JSON 坏 / 符号链接 / 相对路径）
//!
//! | 请求 | 结果 |
//! |---|---|
//! | `GET/HEAD /api/deployment` | 放行到状态端点；端点回 `503` + 非敏感诊断 |
//! | 其他 `/api/*`、`/ws`、`/media/*` | `503`（JSON，`no-store`） |
//! | 任何非 `GET/HEAD`（写请求） | `503`（JSON，`no-store`） |
//! | 静态 `GET/HEAD` | `503` 维护页（HTML，`no-store`，避免旧 UI 继续活跃） |
//!
//! 维护中（文件合法且 `maintenance = true`）走同一套拒绝逻辑，区别只是
//! `/api/deployment` 能如实报告 `maintenance: true` 与部署器声明的身份。
//!
//! # `/api/deployment`
//!
//! 只返回非敏感状态：门控是否配置、当前状态、是否 ready、部署器声明的
//! instance/release/protocol、失败类别（固定枚举字符串，不含路径/OS 错误）。
//! 它和其余 API 一样由 `runtime::router` 的 `route_layer(require_auth)` 保护，
//! 认证规则不另起一套。
//!
//! **`release_id` 是部署选择器文件里的声明，不是正在运行的二进制自身的
//! build id。** 本模块不做（也无法做）二进制构建指纹校验，所以状态里固定
//! `identity_source = "deployment_file"`、`identity_is_binary_build_id = false`。
//!
//! # 已知边界：旧 WebSocket 不会被本门控断开
//!
//! axum middleware 只能拦住**新请求**。维护开关翻起时：
//!   - 新的 `/ws` 握手被 `503` 拒绝；
//!   - **已经建立的** `/ws` 长连接会继续存活，直到客户端重连、网络断开或
//!     Panel 进程重启；
//!   - 本模块不持有连接表，也不修改 `proxy`/`AppState`，因此没有任何能力
//!     主动关闭旧连接。
//!
//! `/api/deployment` 因此永远回报 `existing_websockets_disconnected: false`。
//! 部署器若要求"维护期间零旧连接"，必须在 Panel 之外断流（反向代理/防火墙）
//! 或重启进程；不能声称本门控完成了旧连接断开。

use std::io::Read;
use std::path::{Path, PathBuf};

use axum::extract::{Request, State};
use axum::http::{header, HeaderValue, Method, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::{Extension, Json};
use serde::{Deserialize, Serialize};

/// 管理员显式开启部署门控的环境变量。
pub const ENV_DEPLOY_GATE_FILE: &str = "ECHO_DEPLOY_GATE_FILE";

/// 唯一支持的 gate 文件 schema。
pub const SUPPORTED_SCHEMA_VERSION: u32 = 1;

/// gate 文件上限：正常只有几百字节；上限防止误指到日志/镜像文件。
const MAX_GATE_FILE_BYTES: u64 = 64 * 1024;
const MAX_ID_BYTES: usize = 128;
const MAX_PROTOCOL_BYTES: usize = 64;

const IDENTITY_SOURCE_FILE: &str = "deployment_file";
const IDENTITY_SOURCE_NONE: &str = "none";
const RELEASE_IDENTITY_NOTE: &str = "release_id/instance_id are declarations from the deployment selector file; they are not a verified build id of the running binary";

/// 部署器写入的严格 JSON。未知字段、缺字段、类型不符都由 serde 拒绝。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
struct GateFile {
    schema_version: u32,
    instance_id: String,
    maintenance: bool,
    release_id: String,
    management_protocol: String,
}

/// 从 gate 文件解析出的、部署器声明的运行身份。
///
/// 注意：这是**声明**，不是对二进制构建产物的验证。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GateIdentity {
    pub schema_version: u32,
    pub instance_id: String,
    pub release_id: String,
    pub management_protocol: String,
    pub maintenance: bool,
}

/// 门控在某次请求时刻的状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GateState {
    /// 未配置 `ECHO_DEPLOY_GATE_FILE`：旧行为。
    Disabled,
    /// 文件合法且 `maintenance = false`：正常服务。
    Serving,
    /// 文件合法且 `maintenance = true`：维护中，拒绝新请求。
    Maintenance,
    /// 配置了环境变量，但路径/文件内容不可用：fail closed。
    Invalid,
}

impl GateState {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Disabled => "disabled",
            Self::Serving => "serving",
            Self::Maintenance => "maintenance",
            Self::Invalid => "invalid",
        }
    }
}

#[derive(Debug, Clone)]
enum Outcome {
    Disabled,
    Valid(GateIdentity),
    Invalid(&'static str),
}

/// 一次读取/校验的完整结果。middleware 把它塞进请求扩展，状态端点复用同一
/// 份快照（避免状态端点与门控判定之间再读一次文件而产生自相矛盾）。
#[derive(Debug, Clone)]
pub struct GateAssessment {
    configured: bool,
    outcome: Outcome,
}

impl GateAssessment {
    fn disabled() -> Self {
        Self {
            configured: false,
            outcome: Outcome::Disabled,
        }
    }

    fn invalid(reason: &'static str) -> Self {
        Self {
            configured: true,
            outcome: Outcome::Invalid(reason),
        }
    }

    pub fn configured(&self) -> bool {
        self.configured
    }

    pub fn state(&self) -> GateState {
        match &self.outcome {
            Outcome::Disabled => GateState::Disabled,
            Outcome::Valid(identity) if identity.maintenance => GateState::Maintenance,
            Outcome::Valid(_) => GateState::Serving,
            Outcome::Invalid(_) => GateState::Invalid,
        }
    }

    pub fn identity(&self) -> Option<&GateIdentity> {
        match &self.outcome {
            Outcome::Valid(identity) => Some(identity),
            _ => None,
        }
    }

    pub fn error(&self) -> Option<&'static str> {
        match &self.outcome {
            Outcome::Invalid(reason) => Some(reason),
            _ => None,
        }
    }

    pub fn maintenance(&self) -> bool {
        self.state() == GateState::Maintenance
    }

    /// 是否必须拒绝请求（维护中或配置不可用）。`/api/deployment` 例外：
    /// middleware 放行它，但它会按这里的值回 `503`。
    pub fn is_fail_closed(&self) -> bool {
        matches!(self.state(), GateState::Maintenance | GateState::Invalid)
    }

    /// 非敏感状态快照（`/api/deployment` 的响应体）。
    pub fn status(&self) -> DeploymentStatus {
        let state = self.state();
        let identity = self.identity();
        let ready = matches!(state, GateState::Disabled | GateState::Serving);
        DeploymentStatus {
            configured: self.configured,
            state: state.as_str(),
            ready,
            fail_closed: self.is_fail_closed(),
            maintenance: state == GateState::Maintenance,
            identity_source: if self.configured {
                IDENTITY_SOURCE_FILE
            } else {
                IDENTITY_SOURCE_NONE
            },
            identity_available: identity.is_some(),
            identity_is_binary_build_id: false,
            schema_version: identity.map(|i| i.schema_version),
            instance_id: identity.map(|i| i.instance_id.clone()),
            release_id: identity.map(|i| i.release_id.clone()),
            management_protocol: identity.map(|i| i.management_protocol.clone()),
            gate_error: self.error(),
            existing_websockets_disconnected: false,
            new_websocket_connections: if self.is_fail_closed() {
                "rejected"
            } else {
                "accepted"
            },
            release_identity_note: RELEASE_IDENTITY_NOTE,
        }
    }
}

/// `/api/deployment` 的响应体：只含非敏感信息与只读身份。
#[derive(Debug, Clone, Serialize)]
pub struct DeploymentStatus {
    pub configured: bool,
    /// `disabled` / `serving` / `maintenance` / `invalid`
    pub state: &'static str,
    /// 是否可接收流量（维护/配置坏时为 false）。
    pub ready: bool,
    pub fail_closed: bool,
    pub maintenance: bool,
    /// `deployment_file`（配置了门控）或 `none`（未配置）。
    pub identity_source: &'static str,
    pub identity_available: bool,
    /// 恒为 false：release_id 是部署器声明，不是二进制自身 build id。
    pub identity_is_binary_build_id: bool,
    pub schema_version: Option<u32>,
    pub instance_id: Option<String>,
    pub release_id: Option<String>,
    pub management_protocol: Option<String>,
    /// 固定失败类别（不含路径/OS 错误）；正常时为 null。
    pub gate_error: Option<&'static str>,
    /// 恒为 false：middleware 不会断开已建立的 WS（见模块文档）。
    pub existing_websockets_disconnected: bool,
    /// `accepted` / `rejected`（仅描述**新**握手）。
    pub new_websocket_connections: &'static str,
    pub release_identity_note: &'static str,
}

/// 门控句柄：`None` = 未配置（旧行为）；`Some(path)` = 每次请求读取该文件。
///
/// 路径来自**路由组装时**读取一次的 `ECHO_DEPLOY_GATE_FILE`，不在每个请求里
/// 碰进程环境（测试可直接用 [`DeploymentGate::at`] 构造，无需污染 env）。
#[derive(Debug, Clone, Default)]
pub struct DeploymentGate {
    path: Option<PathBuf>,
}

impl DeploymentGate {
    /// 未配置：完全保持旧行为。
    pub fn disabled() -> Self {
        Self { path: None }
    }

    /// 使用显式路径（测试/嵌入方使用；路径合法性在每次评估时检查）。
    pub fn at(path: impl Into<PathBuf>) -> Self {
        Self {
            path: Some(path.into()),
        }
    }

    /// 路由组装时读取一次环境变量。
    pub fn from_env() -> Self {
        match std::env::var_os(ENV_DEPLOY_GATE_FILE) {
            Some(value) => Self {
                path: Some(PathBuf::from(value)),
            },
            None => Self::disabled(),
        }
    }

    pub fn configured(&self) -> bool {
        self.path.is_some()
    }

    pub fn path(&self) -> Option<&Path> {
        self.path.as_deref()
    }

    /// 读取并校验当前 gate 文件。任何失败都归类为固定字符串，调用方据此
    /// fail closed；绝不把路径或 OS 错误文本带进公开响应。
    pub fn assess(&self) -> GateAssessment {
        let Some(path) = self.path.as_deref() else {
            return GateAssessment::disabled();
        };
        if !path.is_absolute() {
            return GateAssessment::invalid("gate_path_not_absolute");
        }
        match read_gate_file(path) {
            Ok(identity) => GateAssessment {
                configured: true,
                outcome: Outcome::Valid(identity),
            },
            Err(reason) => GateAssessment::invalid(reason),
        }
    }
}

fn read_gate_file(path: &Path) -> Result<GateIdentity, &'static str> {
    // 先拒绝符号链接与非常规文件：部署器必须写真实文件（原子 rename 即可）。
    let link_meta = std::fs::symlink_metadata(path).map_err(|_| "gate_file_read_error")?;
    if link_meta.file_type().is_symlink() {
        return Err("gate_file_symlink");
    }
    if !link_meta.is_file() {
        return Err("gate_file_not_regular");
    }
    if link_meta.len() > MAX_GATE_FILE_BYTES {
        return Err("gate_file_too_large");
    }

    let file = open_no_follow(path).map_err(|_| "gate_file_read_error")?;
    let meta = file.metadata().map_err(|_| "gate_file_read_error")?;
    if !meta.is_file() {
        return Err("gate_file_not_regular");
    }

    let mut raw = String::new();
    file.take(MAX_GATE_FILE_BYTES + 1)
        .read_to_string(&mut raw)
        .map_err(|_| "gate_file_read_error")?;
    if raw.len() as u64 > MAX_GATE_FILE_BYTES {
        return Err("gate_file_too_large");
    }

    // `from_str` 只接受单个 JSON 值（尾部只允许空白），坏 JSON 一律 fail closed。
    let parsed: GateFile = serde_json::from_str(&raw).map_err(|_| "gate_file_invalid_json")?;
    validate_gate_file(parsed)
}

/// Linux/macOS 上带 `O_NOFOLLOW | O_NONBLOCK` 打开：
///   - `O_NOFOLLOW` 堵住 `symlink_metadata` 与 `open` 之间的替换窗口；
///   - `O_NONBLOCK` 避免竞态中路径被换成 FIFO 时把请求线程永久挂住
///     （打开后立刻 `metadata()` 再确认真实类型）。
///
/// 其他平台退回普通 open（前面的 metadata 检查仍是兜底）。
fn open_no_follow(path: &Path) -> std::io::Result<std::fs::File> {
    let mut options = std::fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        #[cfg(target_os = "linux")]
        const OPEN_FLAGS: i32 = 0o400000 /* O_NOFOLLOW */ | 0o4000 /* O_NONBLOCK */;
        #[cfg(target_os = "macos")]
        const OPEN_FLAGS: i32 = 0x0100 /* O_NOFOLLOW */ | 0x0004 /* O_NONBLOCK */;
        #[cfg(not(any(target_os = "linux", target_os = "macos")))]
        const OPEN_FLAGS: i32 = 0;
        if OPEN_FLAGS != 0 {
            options.custom_flags(OPEN_FLAGS);
        }
    }
    options.open(path)
}

fn validate_gate_file(file: GateFile) -> Result<GateIdentity, &'static str> {
    if file.schema_version != SUPPORTED_SCHEMA_VERSION {
        return Err("gate_schema_unsupported");
    }
    if !is_safe_identifier(&file.instance_id, MAX_ID_BYTES) {
        return Err("gate_instance_id_invalid");
    }
    if !is_safe_identifier(&file.release_id, MAX_ID_BYTES) {
        return Err("gate_release_id_invalid");
    }
    if !is_safe_identifier(&file.management_protocol, MAX_PROTOCOL_BYTES) {
        return Err("gate_management_protocol_invalid");
    }
    Ok(GateIdentity {
        schema_version: file.schema_version,
        instance_id: file.instance_id,
        release_id: file.release_id,
        management_protocol: file.management_protocol,
        maintenance: file.maintenance,
    })
}

/// 身份字段是部署器声明的短标识符，不是自由文本。限制字符集与长度，避免
/// 把任意内容（含控制字符）反射进状态响应。
fn is_safe_identifier(value: &str, max_bytes: usize) -> bool {
    !value.is_empty()
        && value.len() <= max_bytes
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric()
                || matches!(byte, b'-' | b'_' | b'.' | b':' | b'/' | b'+' | b'@')
        })
}

/// 全局门控 middleware（`runtime::router` 挂在最外层，覆盖 API 与静态
/// fallback）。`/api/deployment` 的 GET/HEAD 例外放行，由状态端点自己回
/// `200/503`，让部署器能区分 maintenance 与 invalid；它的认证仍由内层
/// `route_layer(require_auth)` 统一处理。
pub async fn guard(
    State(gate): State<DeploymentGate>,
    mut request: Request,
    next: Next,
) -> Response {
    let assessment = gate.assess();
    let path = request.uri().path().to_owned();
    let method = request.method().clone();

    if path == "/api/deployment" && matches!(method, Method::GET | Method::HEAD) {
        request.extensions_mut().insert(assessment);
        return next.run(request).await;
    }

    if !assessment.is_fail_closed() {
        return next.run(request).await;
    }

    // 写请求一律拒绝：维护期间不能让旧页面继续 POST/DELETE。
    if !matches!(method, Method::GET | Method::HEAD) {
        return api_unavailable(&assessment);
    }

    // API / WS / 媒体都是"应用面"，直接 503；静态 GET 给维护页（仍 503 且
    // no-store），避免浏览器继续使用缓存里的旧 UI。
    if path == "/ws" || path.starts_with("/api/") || path.starts_with("/media/") {
        return api_unavailable(&assessment);
    }

    maintenance_page()
}

/// `GET /api/deployment`：认证由现有 `route_layer` 统一负责。
pub async fn deployment_status(Extension(assessment): Extension<GateAssessment>) -> Response {
    let status = assessment.status();
    let code = if status.ready {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    let mut response = (code, Json(status)).into_response();
    apply_no_store(&mut response);
    response
}

#[derive(Serialize)]
struct GateRejection {
    error: &'static str,
    state: &'static str,
    maintenance: bool,
    fail_closed: bool,
}

fn api_unavailable(assessment: &GateAssessment) -> Response {
    let body = GateRejection {
        error: "deployment_gate_fail_closed",
        state: assessment.state().as_str(),
        maintenance: assessment.maintenance(),
        fail_closed: true,
    };
    let mut response = (StatusCode::SERVICE_UNAVAILABLE, Json(body)).into_response();
    apply_no_store(&mut response);
    response
}

fn maintenance_page() -> Response {
    let mut response = (
        StatusCode::SERVICE_UNAVAILABLE,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        MAINTENANCE_HTML,
    )
        .into_response();
    apply_no_store(&mut response);
    response
}

fn apply_no_store(response: &mut Response) {
    let headers = response.headers_mut();
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    headers.insert(header::PRAGMA, HeaderValue::from_static("no-cache"));
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
}

/// 自包含维护页：不引用任何外部资源，避免旧 UI 的缓存资源继续工作。
const MAINTENANCE_HTML: &str = r#"<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Panel 维护中</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;background:#0f1115;color:#e6e6e6}
main{max-width:34rem;padding:2rem}
h1{font-size:1.35rem;margin:0 0 .75rem}
p{margin:.35rem 0;color:#b9bec7}
</style>
</head>
<body>
<main>
<h1>Panel 正在部署维护</h1>
<p>服务暂时不可用，请稍后刷新。</p>
<p lang="en">The panel is temporarily unavailable for deployment maintenance.</p>
</main>
</body>
</html>
"#;
