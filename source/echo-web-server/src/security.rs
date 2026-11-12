//! Panel 自身的访问安全（2026-11）：访问令牌 + 是否强制认证。
//!
//! ## 为什么单独成一个模块
//!
//! 此前这两件事只能改 `panel.toml` 再重启服务：令牌写在 `[server]
//! access_token`，是否生效由"字符串非空"隐式决定。结果是两个实际困境：
//!
//! 1. **轮换要停机**：令牌泄漏是"现在就要处理"的事，而改配置 + 重启
//!    中间有一段既没有旧凭据也没有新凭据的窗口；
//! 2. **"启用认证"不是一个可表达的状态**：想先配好令牌、等所有浏览器都
//!    拿到再统一开认证——用"非空即生效"就做不到（存进去的那一刻就锁门了，
//!    而旧浏览器还没有令牌）。
//!
//! 所以把「令牌值」与「是否强制」拆成两个独立事实，并且都支持运行期修改。
//!
//! ## 判定与持久化的顺序
//!
//! [`PanelAuth::update`] 先写盘、成功了才改内存：写盘失败时内存保持原值，
//! 避免出现"界面显示已改、重启后变回去"的分叉（与上游注册表的 rollback
//! 同一原则）。没有可写回的配置文件时（内嵌形态未配 `config_file`）**仍然
//! 生效**，但响应里 `persisted: false`——把这件事实交给调用方去展示，而不是
//! 假装成功。
//!
//! ## 令牌从不回显
//!
//! 读取接口只回 `token_hint`（前 4 + 后 4），绝不回明文：面板是长期开着的
//! 管理面，把长期凭据塞进 DOM、前端状态与浏览器历史里没有收益——用户要么
//! 记得自己填的值，要么点「生成」当场看到一次（`token_once`，只在生成的那
//! 次响应里出现）。
//!
//! ## 轮换会踢掉现有连接
//!
//! 令牌值变化时通过 [`PanelAuth::revoke_receiver`] 通知正在运行的中继：每个
//! 浏览器连接在下一次 select 里看到该信号即主动断开，重连时必须出示新凭据。
//! 不做这件事的话，轮换只是"新来的要用新令牌"——用旧令牌建立的连接会一直
//! 活着，而这正是轮换想解决的问题。
//!
//! 唯一需要小心的是**发起轮换的那个浏览器自己也会被踢**：前端在收到响应后
//! 立即把新令牌写入 localStorage（见 `PanelSecuritySettings.vue`），随后的
//! 自动重连用的就是新凭据，所以用户看到的是"面板轻轻闪一下"。

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::RwLock;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::proxy::AppState;

/// 令牌最短长度。太短的令牌（`1234`）在"能扫就扫"的威胁模型下等于没有：
/// 面板端口经常被映射到公网，暴力枚举 4 位数字是分钟级的事。
pub const MIN_TOKEN_LEN: usize = 16;

/// 生成令牌用的随机字节数（32 字节 → 64 位十六进制）。
const TOKEN_BYTES: usize = 32;

/// Panel 访问安全的运行期状态。
#[derive(Debug)]
pub struct PanelAuth {
    /// 访问令牌（空 = 没有令牌可用）。
    token: RwLock<String>,
    /// 是否**要求**认证（`[server] require_token`）。
    ///
    /// 与令牌值分开是刻意的：`require=true + token 空` 是"想开但还没给令牌"
    /// 的中间态——此时 [`Self::enforced`] 为 false（不锁门），管理面在
    /// `/api/security` 里把这件事作为 `enforced: false` 明说，前端据此提示
    /// "未设置令牌，认证不会生效"。反过来把这种状态做成"谁也进不去"就等于
    /// 把用户挡在自己的面板外面。
    require: AtomicBool,
    /// 可写回的配置文件（`panel.toml`）。None = 只在本进程内生效。
    config_path: RwLock<Option<PathBuf>>,
    /// 凭据代次：令牌每变一次 +1。中继连接周期性比对，代次变了就主动断开。
    ///
    /// 为什么是"代次 + 轮询"而不是广播通道：中继连接的读循环在 `select!`
    /// 里，广播接收端在发送端消失后会立刻返回 `Closed`——直接放进 select
    /// 就是忙循环，要用 `Option` 包一层再屏蔽，而那段借用与 `select!` 的
    /// 组合比它解决的问题更绕。一个 `u64` 的原子读 + 2s 的定时器达到同样
    /// 效果，且没有"关闭语义"要解释。
    ///
    /// 2s 足够：轮换是低频管理动作，连接晚 2s 断开没有任何实际影响。
    epoch: AtomicU64,
}

impl PanelAuth {
    pub fn new(token: impl Into<String>, require: bool) -> std::sync::Arc<Self> {
        std::sync::Arc::new(Self {
            token: RwLock::new(token.into()),
            require: AtomicBool::new(require),
            config_path: RwLock::new(None),
            epoch: AtomicU64::new(0),
        })
    }

    /// 绑定可写回的配置文件（独立外壳 / 内嵌且配了 `config_file` 时）。
    pub fn attach_config(&self, path: Option<PathBuf>) {
        if let Ok(mut slot) = self.config_path.write() {
            *slot = path;
        }
    }

    pub fn token(&self) -> String {
        self.token.read().map(|t| t.clone()).unwrap_or_default()
    }

    pub fn require_token(&self) -> bool {
        self.require.load(Ordering::Relaxed)
    }

    /// 认证此刻是否**真的**在拦截请求（`require && token 非空`）。
    pub fn enforced(&self) -> bool {
        self.require_token() && !self.token().is_empty()
    }

    /// 令牌摘要：够用来确认"这是哪一把"，不足以还原。空令牌返回空串。
    pub fn token_hint(&self) -> String {
        let token = self.token();
        hint_of(&token)
    }

    /// 校验请求凭据：未强制认证时恒放行；否则比对 Bearer 头或 `?token=`
    /// （WS 握手场景浏览器无法自定义头）。
    pub fn authorized(
        &self,
        headers: &axum::http::HeaderMap,
        query_token: Option<&str>,
    ) -> bool {
        if !self.enforced() {
            return true;
        }
        let expected = self.token();
        let bearer = headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "));
        bearer == Some(expected.as_str()) || query_token == Some(expected.as_str())
    }

    /// 当前凭据代次（中继连接用它判断"我这条连接的凭据还有效吗"）。
    pub fn epoch(&self) -> u64 {
        self.epoch.load(Ordering::Relaxed)
    }

    /// 轮换后作废现有连接：推进代次，各连接在下一个轮询周期自行断开。
    fn revoke_sessions(&self) {
        self.epoch.fetch_add(1, Ordering::Relaxed);
    }

    /// 应用一次变更：先写盘（成功才改内存），再按需踢连接。
    ///
    /// 返回 `persisted`：false = 没有可写回的配置文件，仅本进程内生效。
    fn update(&self, change: Change) -> Result<bool, String> {
        let current_token = self.token();
        let current_require = self.require_token();
        let next_token = match change.token {
            // `None` = 不改令牌；`Some("")` = 清空。
            None => current_token.clone(),
            Some(value) => value,
        };
        let next_require = change.require_token.unwrap_or(current_require);
        if next_require {
            validate_token(&next_token)?;
        } else if !next_token.is_empty() {
            // 关掉认证时令牌仍需合法（它可能随时被重新启用）。
            validate_token(&next_token)?;
        }
        let persisted = match self.config_path.read().ok().and_then(|p| p.clone()) {
            Some(path) => {
                persist_to_file(&path, &next_token, next_require)?;
                true
            }
            None => false,
        };
        if let Ok(mut slot) = self.token.write() {
            *slot = next_token.clone();
        }
        self.require.store(next_require, Ordering::Relaxed);
        if next_token != current_token {
            self.revoke_sessions();
        }
        Ok(persisted)
    }
}

/// 令牌摘要：`abcd…wxyz`（长度不足时全掩码，避免"短令牌等于回显"）。
fn hint_of(token: &str) -> String {
    if token.is_empty() {
        return String::new();
    }
    // 前后各留 4 位需要至少 16 位长度，否则露出的比例太高。
    if token.chars().count() < MIN_TOKEN_LEN {
        return "•".repeat(token.chars().count().min(12));
    }
    let head: String = token.chars().take(4).collect();
    let tail: String = token
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    format!("{head}…{tail}")
}

fn validate_token(token: &str) -> Result<(), String> {
    if token.is_empty() {
        return Err("启用访问令牌认证前必须设置令牌".into());
    }
    if token.len() < MIN_TOKEN_LEN {
        return Err(format!(
            "令牌太短（{} 位，至少 {MIN_TOKEN_LEN} 位）：面板端口常被映射到公网，\
             短令牌是分钟级可枚举的",
            token.len()
        ));
    }
    if token.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err("令牌不能包含空白或控制字符（复制粘贴时容易夹带）".into());
    }
    Ok(())
}

/// 生成新令牌：`/dev/urandom` → 32 字节 → 十六进制。
///
/// 不自己拼"时间 + pid + 计数器"这种伪随机兜底：那看起来像随机、实际熵极低，
/// 而这里生成的是**唯一一把门钥匙**。读不到系统随机源就报错，让用户改用
/// 自己生成的强随机串。
fn generate_token() -> Result<String, String> {
    use std::io::Read;
    let mut bytes = [0u8; TOKEN_BYTES];
    std::fs::File::open("/dev/urandom")
        .and_then(|mut file| file.read_exact(&mut bytes))
        .map_err(|e| format!("读取系统随机源失败（/dev/urandom）：{e}"))?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}

/// 写回配置文件：**按行改写** `[server]` 的两个键 → 校验 → tmp+rename。
///
/// ## 为什么不是 `toml::Table` 往返
///
/// 那样会把整份文件重排并**丢掉所有注释**（实测：一次保存把 `panel.toml` 里
/// "为什么必须开认证"那段说明整块抹掉了）。配置文件里的注释是运维文档的
/// 一部分，改一个键不该销毁它。所以这里只做行级替换：命中 `access_token`
/// / `require_token` 两行就换掉，缺了就插在该段里，其余每一行——注释、
/// 空行、其他键、其他段——**逐字不动**。
///
/// 改完先做一次 TOML 解析校验：手写行编辑万一破坏了结构（例如文件里
/// 本身就有重复的 `[server]` 段），宁可报错不写，也不要留下一个起不来的
/// 配置文件。
fn persist_to_file(path: &Path, token: &str, require: bool) -> Result<(), String> {
    let original = match std::fs::read_to_string(path) {
        Ok(text) => text,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(e) => return Err(format!("读取 {} 失败：{e}", path.display())),
    };
    let updated = rewrite_server_section(&original, token, require);
    toml::from_str::<toml::Table>(&updated).map_err(|e| {
        format!(
            "改写 {} 后不是合法 TOML（已放弃写入，原文件未动）：{e}",
            path.display()
        )
    })?;
    let tmp = path.with_extension("toml.tmp");
    std::fs::write(&tmp, updated).map_err(|e| format!("写入 {} 失败：{e}", tmp.display()))?;
    std::fs::rename(&tmp, path).map_err(|e| format!("替换 {} 失败：{e}", path.display()))?;
    Ok(())
}

/// TOML 基本字符串的转义（只需处理 `\` 与 `"`；令牌已拒绝控制字符）。
fn toml_string(value: &str) -> String {
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{escaped}\"")
}

/// 在 `[server]` 段里替换/插入两个键，其余行逐字保留。
fn rewrite_server_section(text: &str, token: &str, require: bool) -> String {
    let mut lines: Vec<String> = text.lines().map(str::to_string).collect();
    let mut header: Option<usize> = None;
    let mut in_server = false;
    let mut token_at: Option<usize> = None;
    let mut require_at: Option<usize> = None;

    for (index, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        // 段头：`[server]` / `[ server ]`。其余段头只用来结束本段。
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            let name = trimmed
                .trim_start_matches('[')
                .trim_end_matches(']')
                .trim();
            in_server = name == "server";
            if in_server && header.is_none() {
                header = Some(index);
            }
            continue;
        }
        if !in_server {
            continue;
        }
        let Some((key, _)) = trimmed.split_once('=') else {
            continue;
        };
        match key.trim() {
            "access_token" => token_at = Some(index),
            "require_token" => require_at = Some(index),
            _ => {}
        }
    }

    let token_line = format!("access_token = {}", toml_string(token));
    let require_line = format!("require_token = {require}");

    match header {
        Some(section) => {
            // 就地替换
            if let Some(at) = token_at {
                lines[at] = token_line.clone();
            }
            if let Some(at) = require_at {
                lines[at] = require_line.clone();
            }
            // 缺的键插在另一个键之后（都在缺时插在段头之后），保持可读顺序。
            let mut inserts: Vec<(usize, String)> = Vec::new();
            if token_at.is_none() {
                let after = require_at.unwrap_or(section);
                inserts.push((after, token_line.clone()));
            }
            if require_at.is_none() {
                let after = token_at.unwrap_or(section);
                inserts.push((after, require_line.clone()));
            }
            // 从后往前插，避免下标漂移；同一位置时保持（access_token, require_token）。
            inserts.sort_by(|a, b| b.0.cmp(&a.0));
            for (after, line) in inserts {
                lines.insert(after + 1, line);
            }
        }
        None => {
            // 没有 `[server]` 段：追加一个（前面留一个空行，别贴住上一段）。
            if lines.last().is_some_and(|line| !line.trim().is_empty()) {
                lines.push(String::new());
            }
            lines.push("[server]".to_string());
            lines.push(token_line);
            lines.push(require_line);
        }
    }

    let mut out = lines.join("\n");
    out.push('\n');
    out
}

// ── HTTP 面 ───────────────────────────────────────────────────────────────

/// 安全设置视图（**不含令牌明文**）。
#[derive(Debug, Clone, Serialize)]
pub struct SecurityView {
    /// 是否已设置令牌。
    pub token_set: bool,
    /// 令牌摘要（`abcd…wxyz`）；未设置时为空串。
    pub token_hint: String,
    /// 是否要求认证（配置意图）。
    pub require_token: bool,
    /// 认证此刻是否真在拦截（`require_token && token_set`）。
    pub enforced: bool,
    /// 监听地址（提示"对外暴露但没开认证"用）。
    pub bind_address: String,
    /// 是否绑在回环地址上（false = 局域网/公网可达）。
    pub loopback: bool,
    /// 是否可以写回配置文件（false = 改动只在本次运行内生效）。
    pub config_writable: bool,
}

#[derive(Debug, Deserialize)]
pub struct SecurityUpdate {
    /// 新的令牌值。缺省 = 不改；`""` = 清空。
    #[serde(default)]
    pub token: Option<String>,
    /// 是否要求认证。缺省 = 不改。
    #[serde(default)]
    pub require_token: Option<bool>,
    /// 生成一个随机令牌（32 字节）；生成的值只在本次响应里出现一次。
    #[serde(default)]
    pub generate: bool,
}

#[derive(Debug, Serialize)]
pub struct SecurityUpdateResponse {
    #[serde(flatten)]
    pub view: SecurityView,
    /// 仅 `generate = true` 时出现：新生成的令牌明文（**只此一次**）。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_once: Option<String>,
    /// 本次改动是否已写回配置文件。
    pub persisted: bool,
}

struct Change {
    token: Option<String>,
    require_token: Option<bool>,
}

fn view_of(auth: &PanelAuth, bind: &str) -> SecurityView {
    SecurityView {
        token_set: !auth.token().is_empty(),
        token_hint: auth.token_hint(),
        require_token: auth.require_token(),
        enforced: auth.enforced(),
        bind_address: bind.to_string(),
        loopback: bind.starts_with("127.0.0.1:")
            || bind.starts_with("localhost:")
            || bind.starts_with("[::1]:"),
        config_writable: auth.config_path.read().map(|p| p.is_some()).unwrap_or(false),
    }
}

fn bad_request(message: impl Into<String>) -> Response {
    (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": message.into() })))
        .into_response()
}

/// `GET /api/security` — 当前安全设置（令牌只回摘要）。
pub async fn get_security(State(state): State<AppState>) -> impl IntoResponse {
    Json(view_of(&state.auth, &state.bind))
}

/// `POST /api/security` — 改令牌 / 改是否强制认证 / 生成新令牌。
///
/// 请求体字段全可选，语义是"只改我给了的"：
/// - `{ "require_token": true }`：先开认证（令牌没变）
/// - `{ "token": "<新值>" }`：轮换令牌
/// - `{ "generate": true, "require_token": true }`：生成 + 启用，一步到位
pub async fn post_security(
    State(state): State<AppState>,
    Json(body): Json<SecurityUpdate>,
) -> Response {
    let generated = if body.generate {
        match generate_token() {
            Ok(token) => Some(token),
            Err(message) => return bad_request(message),
        }
    } else {
        None
    };
    let change = Change {
        token: generated.clone().or(body.token),
        require_token: body.require_token,
    };
    match state.auth.update(change) {
        Ok(persisted) => Json(SecurityUpdateResponse {
            view: view_of(&state.auth, &state.bind),
            token_once: generated,
            persisted,
        })
        .into_response(),
        Err(message) => bad_request(message),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn auth(token: &str, require: bool) -> std::sync::Arc<PanelAuth> {
        PanelAuth::new(token, require)
    }

    #[test]
    fn empty_token_means_no_auth_even_when_required() {
        let auth = auth("", true);
        assert!(auth.require_token());
        // "想开但还没给令牌"不能变成"谁也进不去"——那会把用户锁在自己面板外。
        assert!(!auth.enforced());
        assert!(auth.authorized(&axum::http::HeaderMap::new(), None));
    }

    #[test]
    fn enforcement_needs_both_flag_and_token() {
        let token = "0123456789abcdef0123456789abcdef";
        assert!(auth(token, true).enforced());
        // 令牌在、开关关 → 不拦截（保留令牌以便随时重新启用）。
        assert!(!auth(token, false).enforced());
    }

    #[test]
    fn authorization_accepts_bearer_or_query_token() {
        let token = "0123456789abcdef0123456789abcdef";
        let auth = auth(token, true);
        assert!(!auth.authorized(&axum::http::HeaderMap::new(), None));
        assert!(!auth.authorized(&axum::http::HeaderMap::new(), Some("wrong")));
        assert!(auth.authorized(&axum::http::HeaderMap::new(), Some(token)));
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            axum::http::header::AUTHORIZATION,
            format!("Bearer {token}").parse().unwrap(),
        );
        assert!(auth.authorized(&headers, None));
    }

    #[test]
    fn hint_never_reveals_the_whole_token() {
        let token = "0123456789abcdef0123456789abcdef";
        let hint = hint_of(token);
        assert_eq!(hint, "0123…cdef");
        assert!(!hint.contains(token));
        // 短令牌全掩码：露出 4+4 位对 16 位以下的串等于泄漏一半。
        assert_eq!(hint_of("short"), "•••••");
        assert_eq!(hint_of(""), "");
    }

    #[test]
    fn short_or_whitespace_tokens_are_rejected() {
        assert!(validate_token("1234").unwrap_err().contains("太短"));
        assert!(validate_token("0123456789abcdef!!\n")
            .unwrap_err()
            .contains("空白"));
        assert!(validate_token("").unwrap_err().contains("必须设置令牌"));
        assert!(validate_token("0123456789abcdef").is_ok());
    }

    #[test]
    fn generated_tokens_are_long_hex_and_unique() {
        let a = generate_token().expect("urandom");
        let b = generate_token().expect("urandom");
        assert_eq!(a.len(), TOKEN_BYTES * 2);
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
        assert_ne!(a, b);
    }

    /// 写回只改 `[server]` 的两个键，其他段（含 `[[cores]]`）原样保留。
    #[test]
    fn persist_keeps_other_sections_intact() {
        let dir = std::env::temp_dir().join(format!("panel-security-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("panel.toml");
        std::fs::write(
            &path,
            r#"
[server]
bind_address = "0.0.0.0:8080"
static_dir = "web/dist"

[[cores]]
name = "core"
url = "ws://127.0.0.1:3132"
"#,
        )
        .unwrap();
        persist_to_file(&path, "0123456789abcdef", true).unwrap();
        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("access_token = \"0123456789abcdef\""));
        assert!(text.contains("require_token = true"));
        // 其他键与段必须还在
        assert!(text.contains("bind_address = \"0.0.0.0:8080\""));
        assert!(text.contains("[[cores]]"));
        assert!(text.contains("ws://127.0.0.1:3132"));
        std::fs::remove_dir_all(&dir).ok();
    }

    /// **注释必须留着**（2026-11 实测事故）：早先的实现用 `toml::Table`
    /// 往返，一次保存就把 `panel.toml` 里"为什么必须开认证"那段说明整块
    /// 抹掉了——配置文件里的注释是运维文档的一部分。
    #[test]
    fn persist_preserves_comments_and_layout() {
        let dir = std::env::temp_dir().join(format!("panel-security-cmt-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("panel.toml");
        let original = r#"# 顶部说明：这份文件由人维护
[server]
bind_address = "0.0.0.0:8080"
# 访问令牌：非空时全站要求 Bearer
access_token = "old-token-value-here"
static_dir = "web/dist"

# 联邦：Panel 身份密钥
[federation]
discover = true
"#;
        std::fs::write(&path, original).unwrap();
        persist_to_file(&path, "0123456789abcdef", true).unwrap();
        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("# 顶部说明：这份文件由人维护"), "{text}");
        assert!(text.contains("# 访问令牌：非空时全站要求 Bearer"), "{text}");
        assert!(text.contains("# 联邦：Panel 身份密钥"), "{text}");
        // 被替换的那一行只换值，位置不变（注释仍紧跟在它上面）
        assert!(text.contains("access_token = \"0123456789abcdef\""), "{text}");
        assert!(!text.contains("old-token-value-here"), "{text}");
        // 缺的键插进本段，不跑到别的段里
        let server_part = text.split("[federation]").next().unwrap();
        assert!(server_part.contains("require_token = true"), "{text}");
        std::fs::remove_dir_all(&dir).ok();
    }

    /// 段里没有这两个键 → 插进去；没有 `[server]` 段 → 追加一段。
    #[test]
    fn missing_keys_and_section_are_added() {
        let with_section = rewrite_server_section("[server]\nstatic_dir = \"web/dist\"\n", "tok", false);
        assert!(with_section.contains("access_token = \"tok\""), "{with_section}");
        assert!(with_section.contains("require_token = false"), "{with_section}");
        assert!(with_section.contains("static_dir = \"web/dist\""), "{with_section}");

        let without = rewrite_server_section("[logging]\nlevel = \"info\"\n", "tok", true);
        assert!(without.contains("[server]"), "{without}");
        assert!(without.contains("[logging]"), "{without}");
        // 生成的文本必须是合法 TOML
        let parsed: toml::Table = toml::from_str(&without).expect("valid toml");
        assert_eq!(
            parsed["server"]["access_token"].as_str(),
            Some("tok")
        );
    }

    /// 令牌里的 `"` 与 `\\` 必须转义成合法 TOML（不然写出来的文件起不来）。
    #[test]
    fn tokens_with_quotes_are_escaped() {
        let text = rewrite_server_section("[server]\n", "a\"b\\c", true);
        let parsed: toml::Table = toml::from_str(&text).expect("valid toml");
        assert_eq!(parsed["server"]["access_token"].as_str(), Some("a\"b\\c"));
    }

    /// 没有可写回的配置文件时：改动仍生效，但如实返回 persisted=false。
    #[test]
    fn update_without_config_applies_in_memory_only() {
        let auth = auth("", false);
        let persisted = auth
            .update(Change {
                token: Some("0123456789abcdef".into()),
                require_token: Some(true),
            })
            .unwrap();
        assert!(!persisted, "没有配置文件时不该声称已持久化");
        assert!(auth.enforced());
    }

    /// 写盘失败 → 内存不动（不留"界面已改、重启变回去"的分叉）。
    #[test]
    fn failed_persist_leaves_memory_untouched() {
        let auth = auth("", false);
        // 指向一个目录：写入必然失败。
        auth.attach_config(Some(std::env::temp_dir()));
        let error = auth
            .update(Change {
                token: Some("0123456789abcdef".into()),
                require_token: Some(true),
            })
            .unwrap_err();
        assert!(!error.is_empty());
        assert!(!auth.enforced(), "写盘失败后不该改内存");
    }

    /// 轮换令牌推进代次 → 现有连接在下一个轮询周期断开（旧令牌不再有效）。
    #[test]
    fn rotating_the_token_bumps_the_epoch() {
        let auth = auth("0123456789abcdef", true);
        let before = auth.epoch();
        auth.update(Change {
            token: Some("fedcba9876543210".into()),
            require_token: None,
        })
        .unwrap();
        assert!(auth.epoch() > before, "轮换后没有作废现有连接");
    }

    /// 只改开关（令牌不变）不动代次——"先开认证"不该把当前页面断掉。
    #[test]
    fn toggling_require_without_rotation_keeps_sessions() {
        let auth = auth("0123456789abcdef", false);
        let before = auth.epoch();
        auth.update(Change {
            token: None,
            require_token: Some(true),
        })
        .unwrap();
        assert_eq!(auth.epoch(), before, "仅切换开关不该断开现有连接");
    }
}
