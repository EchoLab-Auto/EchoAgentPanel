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
//! ## 一次判定 = 一份策略快照（2026-11 二轮修复）
//!
//! 令牌、是否强制、凭据代次是**一个整体**：[`PanelAuth::update`] 用一把
//! `RwLock` 一次性替换整份策略，[`PanelAuth::authorize_handshake`] 一次
//! `read()` 拿到一份快照并在其上完成判定，返回的代次就是这份快照的代次。
//! 不存在「token 已换、代次还没推」的中间态可以被握手看见，也就不存在
//! "用最终代次 + 旧凭据"握手成功、之后永远不会被踢的连接。
//!
//! 同时，`update` 的「读快照 → 校验 → 写盘 → 发布」由一把更新闸全程串行：
//! 并发轮换不会互相覆盖（否则后提交的会把先提交的轮换写回旧令牌，而
//! "令牌没变就不推进代次"会让旧凭据在最终代次上继续有效），磁盘与内存的
//! 提交顺序也只有一个。
//!
//! ## 令牌从不回显
//!
//! 读取接口只回 `token_hint`（前 4 + 后 4），绝不回明文：面板是长期开着的
//! 管理面，把长期凭据塞进 DOM、前端状态与浏览器历史里没有收益——用户要么
//! 记得自己填的值，要么点「生成」当场看到一次（`token_once`，只在生成的那
//! 次响应里出现）。
//!
//! ## 轮换/收紧会踢掉现有连接
//!
//! 令牌值变化、或 `require` 由 false 变 true（认证开始真正拦截）时，通过
//! 内部的凭据代次机制推进代次：每个浏览器连接在下一次轮询
//! 里看到代次变化即主动断开，重连时必须出示有效凭据。
//! 不做这件事的话，轮换只是"新来的要用新令牌"——用旧令牌建立的连接会一直
//! 活着，而这正是轮换想解决的问题。
//!
//! 唯一需要小心的是**发起轮换的那个浏览器自己也会被踢**：前端在收到响应后
//! 立即把新令牌写入 localStorage（见 `PanelSecuritySettings.vue`），随后的
//! 自动重连用的就是新凭据，所以用户看到的是"面板轻轻闪一下"。

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard, RwLock, RwLockReadGuard, RwLockWriteGuard};

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

/// 一份**不可分割**的认证策略：令牌值、是否强制、凭据代次。
///
/// 2026-11 二轮修复（Alix 验收）：这三个字段此前是三个独立的同步原语
/// （`RwLock<String>` + `AtomicBool` + `AtomicU64`），一次请求判定要分三次读，
/// 并发更新可以插在三次读之间，判定就会拿到「新 token + 旧代次」这种
/// **从未存在过的组合**。更糟的是 [`PanelAuth::update`] 本身是读-改-写：
/// 两个并发 update 各自基于同一份旧快照计算，后提交的那个会把先提交的
/// 轮换**写回旧令牌**，而它「令牌没变」的判断又不推进代次——旧凭据于是在
/// 最终代次上继续有效，握手拿到的正是最终代次，那条连接永远不会被踢。
///
/// 所以把三者收进同一个值，由一把 `RwLock` 保护：读者一次 `read()` 得到
/// 某个**已提交版本**的完整快照，写着一次 `*guard = next` 整体替换。
#[derive(Debug, Clone)]
struct AuthPolicy {
    /// 访问令牌（空 = 没有令牌可用）。
    token: String,
    /// 是否**要求**认证（`[server] require_token`）。
    ///
    /// 与令牌值分开是刻意的：`require=true + token 空` 是"想开但还没给令牌"
    /// 的中间态——此时 [`Self::enforced`] 为 false（不锁门），管理面在
    /// `/api/security` 里把这件事作为 `enforced: false` 明说，前端据此提示
    /// "未设置令牌，认证不会生效"。反过来把这种状态做成"谁也进不去"就等于
    /// 把用户挡在自己的面板外面。
    require: bool,
    /// 凭据代次：令牌每变一次 +1，收紧（未强制 → 强制）也 +1。中继连接
    /// 每 2s 比对一次，代次变了就主动断开。
    ///
    /// 为什么是"代次 + 轮询"而不是广播通道：中继连接的读循环在 `select!`
    /// 里，广播接收端在发送端消失后会立刻返回 `Closed`——直接放进 select
    /// 就是忙循环，要用 `Option` 包一层再屏蔽，而那段借用与 `select!` 的
    /// 组合比它解决的问题更绕。一个 `u64` 的读 + 2s 的定时器达到同样
    /// 效果，且没有"关闭语义"要解释。2s 足够：轮换是低频管理动作，
    /// 连接晚 2s 断开没有任何实际影响。
    epoch: u64,
}

impl AuthPolicy {
    /// 这份策略是否真的在拦截请求（`require && token 非空`）。
    fn enforced(&self) -> bool {
        self.require && !self.token.is_empty()
    }

    /// 在**这一份**策略快照上校验凭据：未强制认证时恒放行；否则比对
    /// Bearer 头或 `?token=`（WS 握手场景浏览器无法自定义头）。
    fn authenticates(&self, headers: &axum::http::HeaderMap, query_token: Option<&str>) -> bool {
        if !self.enforced() {
            return true;
        }
        let bearer = headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "));
        bearer == Some(self.token.as_str()) || query_token == Some(self.token.as_str())
    }
}

/// 「发布前钩子」的类型（测试用）。
#[cfg(test)]
type PublishHook = std::sync::Arc<dyn Fn(&AuthPolicy) + Send + Sync>;

/// 测试钩子：把并发窗口钉成确定性时序（仅 `cfg(test)`，不进生产二进制）。
#[cfg(test)]
#[derive(Default)]
struct TestHooks {
    /// 已写盘、尚未发布新策略时调用（参数 = 即将发布的策略）。
    ///
    /// 对应旧实现里「token 已换、`require` / 代次还没跟上」那个窗口；现在
    /// 调用点上对外仍是一份完整一致的**旧**策略，发布是一次整体替换。
    before_publish: Option<PublishHook>,
}

#[cfg(test)]
impl std::fmt::Debug for TestHooks {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TestHooks")
            .field("before_publish", &self.before_publish.is_some())
            .finish()
    }
}

/// Panel 访问安全的运行期状态。
#[derive(Debug)]
pub struct PanelAuth {
    /// 当前认证策略（token / require / epoch 一体）。一次 `read()` 即一份快照。
    policy: RwLock<AuthPolicy>,
    /// **更新闸**：一次 [`PanelAuth::update`] 的「读快照 → 校验 → 写盘 → 发布」
    /// 全程独占。
    ///
    /// 没有它，两个并发 update 会各自基于旧快照写盘/写内存：磁盘与内存的提交
    /// 顺序可能相反（重启后令牌变回旧值），"令牌没变就不推进代次"的判断还会
    /// 把另一次轮换悄悄回滚。写盘是阻塞 IO，所以用 `std::sync::Mutex`
    /// （`update` 是同步函数，锁不跨 `.await`）。
    update_gate: Mutex<()>,
    /// 可写回的配置文件（`panel.toml`）。None = 只在本进程内生效。
    config_path: RwLock<Option<PathBuf>>,
    /// 测试钩子（见 [`TestHooks`]）。
    #[cfg(test)]
    hooks: Mutex<TestHooks>,
}

impl PanelAuth {
    pub fn new(token: impl Into<String>, require: bool) -> std::sync::Arc<Self> {
        std::sync::Arc::new(Self {
            policy: RwLock::new(AuthPolicy {
                token: token.into(),
                require,
                epoch: 0,
            }),
            update_gate: Mutex::new(()),
            config_path: RwLock::new(None),
            #[cfg(test)]
            hooks: Mutex::new(TestHooks::default()),
        })
    }

    /// 绑定可写回的配置文件（独立外壳 / 内嵌且配了 `config_file` 时）。
    pub fn attach_config(&self, path: Option<PathBuf>) {
        *self.config_path.write().unwrap_or_else(|e| e.into_inner()) = path;
    }

    /// 读一份**完整**策略快照。
    ///
    /// 锁中毒按"最后一次完整提交"恢复：发布是整体替换（`*guard = next`），
    /// 不会留下半份状态，所以 `into_inner` 里的值仍然自洽。
    fn read_policy(&self) -> RwLockReadGuard<'_, AuthPolicy> {
        self.policy.read().unwrap_or_else(|e| e.into_inner())
    }

    fn write_policy(&self) -> RwLockWriteGuard<'_, AuthPolicy> {
        self.policy.write().unwrap_or_else(|e| e.into_inner())
    }

    fn lock_update_gate(&self) -> MutexGuard<'_, ()> {
        self.update_gate.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn snapshot(&self) -> AuthPolicy {
        self.read_policy().clone()
    }

    fn config_writable(&self) -> bool {
        self.config_path
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .is_some()
    }

    pub fn token(&self) -> String {
        self.read_policy().token.clone()
    }

    pub fn require_token(&self) -> bool {
        self.read_policy().require
    }

    /// 认证此刻是否**真的**在拦截请求（`require && token 非空`）。
    pub fn enforced(&self) -> bool {
        self.read_policy().enforced()
    }

    /// 令牌摘要：够用来确认"这是哪一把"，不足以还原。空令牌返回空串。
    pub fn token_hint(&self) -> String {
        hint_of(&self.read_policy().token)
    }

    /// 校验请求凭据：未强制认证时恒放行；否则比对 Bearer 头或 `?token=`。
    pub fn authorized(&self, headers: &axum::http::HeaderMap, query_token: Option<&str>) -> bool {
        self.read_policy().authenticates(headers, query_token)
    }

    /// WS 握手专用：认证通过的**同时**返回凭据代次快照。
    ///
    /// 判定与代次取自**同一次** `read()`——这就是"认证策略快照"。旧实现用
    /// 两次独立 epoch 读夹住 `authorized`，只能发现"我判定期间代次变过"，
    /// 既挡不住「token 已换、代次还没推」的窗口，也挡不住一次判定跨越两个
    /// 并发 update（最终 token 与最后代次可以不一致）。
    ///
    /// 现在只有两种结果：按旧策略整体通过（返回旧代次——轮换者会在 2s 内把
    /// 这条连接踢掉，让它带新凭据重连），或按新策略整体通过（返回新代次）。
    /// 不存在"拿最终代次、凭据却是旧的"第三种状态。
    /// `None` = 拒绝（凭据不通过）。
    pub fn authorize_handshake(
        &self,
        headers: &axum::http::HeaderMap,
        query_token: Option<&str>,
    ) -> Option<u64> {
        let policy = self.read_policy();
        policy
            .authenticates(headers, query_token)
            .then_some(policy.epoch)
    }

    /// 当前凭据代次（中继连接用它判断"我这条连接的凭据还有效吗"）。
    pub fn epoch(&self) -> u64 {
        self.read_policy().epoch
    }

    /// 应用一次变更：先写盘（成功才发布），发布是整份策略的一次替换。
    ///
    /// 返回 `persisted`：false = 没有可写回的配置文件，仅本进程内生效。
    fn update(&self, change: Change) -> Result<bool, String> {
        // 整段串行：并发 update 不允许交叉，否则磁盘与内存的提交顺序会分叉，
        // 且「令牌没变」的判断会把另一次轮换回滚（旧凭据于是在最终代次上
        // 继续有效）。闸在函数结束（含错误返回）时自动释放。
        let _gate = self.lock_update_gate();
        let current = self.snapshot();
        let next_token = match change.token {
            // `None` = 不改令牌；`Some("")` = 清空。
            None => current.token.clone(),
            Some(value) => value,
        };
        let next_require = change.require_token.unwrap_or(current.require);
        if next_require {
            validate_token(&next_token)?;
        } else if !next_token.is_empty() {
            // 关掉认证时令牌仍需合法（它可能随时被重新启用）。
            validate_token(&next_token)?;
        }
        // 写盘期间**不持有** policy 锁：判定（每个请求都要走）不会被磁盘 IO
        // 卡住。写盘与发布都在这把更新闸里，所以磁盘顺序 == 内存顺序。
        let config_path = self
            .config_path
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone();
        let persisted = match config_path {
            Some(path) => {
                persist_to_file(&path, &next_token, next_require)?;
                true
            }
            None => false,
        };
        // 收紧（未强制 → 强制）同样必须作废旧连接：它们是在"不需要凭据"
        // 时建立的，不能因为"令牌没变"就继续活着。放宽（true→false）
        // 不影响已认证连接，不必踢。
        let enforced_now = next_require && !next_token.is_empty();
        let revoke = next_token != current.token || (enforced_now && !current.enforced());
        let next = AuthPolicy {
            token: next_token,
            require: next_require,
            epoch: current.epoch + u64::from(revoke),
        };
        #[cfg(test)]
        {
            self.run_before_publish_hook(&next);
        }
        // 一次整体替换：读者要么看到旧策略（旧令牌 + 旧代次），要么看到
        // 新策略（新令牌 + 新代次），不存在中间态。
        *self.write_policy() = next;
        Ok(persisted)
    }

    #[cfg(test)]
    fn run_before_publish_hook(&self, next: &AuthPolicy) {
        let hooks = self.hooks.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(hook) = &hooks.before_publish {
            hook(next);
        }
    }

    #[cfg(test)]
    fn set_before_publish_hook(&self, hook: Option<PublishHook>) {
        self.hooks
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .before_publish = hook;
    }

    /// 更新闸是否正被持有：确定性并发断言用（不靠 sleep 碰运气）。
    #[cfg(test)]
    fn update_in_flight(&self) -> bool {
        self.update_gate.try_lock().is_err()
    }

    /// 一次读出完整策略三元组（测试用：断言没有半发布状态）。
    #[cfg(test)]
    fn policy_snapshot(&self) -> (String, bool, u64) {
        let policy = self.read_policy();
        (policy.token.clone(), policy.require, policy.epoch)
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
            let name = trimmed.trim_start_matches('[').trim_end_matches(']').trim();
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
            inserts.sort_by_key(|a| std::cmp::Reverse(a.0));
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
    // 四个判定字段取自**同一份**策略快照：否则并发更新时可能拼出
    // 「token_set=true 但 enforced=false」这类从未存在过的组合。
    let policy = auth.read_policy();
    SecurityView {
        token_set: !policy.token.is_empty(),
        token_hint: hint_of(&policy.token),
        require_token: policy.require,
        enforced: policy.enforced(),
        bind_address: bind.to_string(),
        loopback: bind.starts_with("127.0.0.1:")
            || bind.starts_with("localhost:")
            || bind.starts_with("[::1]:"),
        config_writable: auth.config_writable(),
    }
}

fn bad_request(message: impl Into<String>) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({ "error": message.into() })),
    )
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
        assert!(
            text.contains("access_token = \"0123456789abcdef\""),
            "{text}"
        );
        assert!(!text.contains("old-token-value-here"), "{text}");
        // 缺的键插进本段，不跑到别的段里
        let server_part = text.split("[federation]").next().unwrap();
        assert!(server_part.contains("require_token = true"), "{text}");
        std::fs::remove_dir_all(&dir).ok();
    }

    /// 段里没有这两个键 → 插进去；没有 `[server]` 段 → 追加一段。
    #[test]
    fn missing_keys_and_section_are_added() {
        let with_section =
            rewrite_server_section("[server]\nstatic_dir = \"web/dist\"\n", "tok", false);
        assert!(
            with_section.contains("access_token = \"tok\""),
            "{with_section}"
        );
        assert!(
            with_section.contains("require_token = false"),
            "{with_section}"
        );
        assert!(
            with_section.contains("static_dir = \"web/dist\""),
            "{with_section}"
        );

        let without = rewrite_server_section("[logging]\nlevel = \"info\"\n", "tok", true);
        assert!(without.contains("[server]"), "{without}");
        assert!(without.contains("[logging]"), "{without}");
        // 生成的文本必须是合法 TOML
        let parsed: toml::Table = toml::from_str(&without).expect("valid toml");
        assert_eq!(parsed["server"]["access_token"].as_str(), Some("tok"));
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

    /// 收紧认证（require false → true）必须作废现有连接：旧连接是在
    /// "不需要凭据"时建立的，不能靠"令牌没变"就继续活着。
    #[test]
    fn tightening_require_bumps_the_epoch() {
        let auth = auth("0123456789abcdef", false);
        let before = auth.epoch();
        auth.update(Change {
            token: None,
            require_token: Some(true),
        })
        .unwrap();
        assert!(
            auth.epoch() > before,
            "require false→true 后没有作废现有连接"
        );
    }

    /// 放宽认证（require true → false，令牌不变）不动代次：已经通过
    /// 认证的页面不该被无谓断开。
    #[test]
    fn loosening_require_without_rotation_keeps_sessions() {
        let auth = auth("0123456789abcdef", true);
        let before = auth.epoch();
        auth.update(Change {
            token: None,
            require_token: Some(false),
        })
        .unwrap();
        assert_eq!(auth.epoch(), before, "放宽开关不该断开现有连接");
    }

    /// 握手拿到的代次在"随后收紧"后必须被视为过期：bridge 用握手快照
    /// 比较当前代次，因此不会出现"握手后 bridge 才取快照 → 旧连接免疫"。
    #[test]
    fn handshake_epoch_snapshot_becomes_stale_after_tightening() {
        let token = "0123456789abcdef0123456789abcdef";
        let auth = auth(token, false);
        let epoch = auth
            .authorize_handshake(&axum::http::HeaderMap::new(), None)
            .expect("未强制时握手应通过");
        auth.update(Change {
            token: None,
            require_token: Some(true),
        })
        .unwrap();
        assert_ne!(auth.epoch(), epoch, "收紧后握手代次必须已过期");
    }

    #[test]
    fn handshake_snapshots_epoch_only_for_valid_credentials() {
        let token = "0123456789abcdef0123456789abcdef";
        let required = auth(token, true);
        assert_eq!(
            required.authorize_handshake(&axum::http::HeaderMap::new(), None),
            None
        );
        assert_eq!(
            required.authorize_handshake(&axum::http::HeaderMap::new(), Some(token)),
            Some(required.epoch())
        );
        // 未强制认证：无凭据也放行，并带出当前代次。
        let open = auth(token, false);
        assert_eq!(
            open.authorize_handshake(&axum::http::HeaderMap::new(), None),
            Some(open.epoch())
        );
    }

    // ── 并发：策略快照 + 更新串行（2026-11 二轮修复） ──────────────────────
    //
    // 这几个测试**不靠 sleep 碰运气**：要么用 channel 把"更新停在发布前"
    // 钉成确定性时序（主线程检查完才放行），要么只用 Barrier 对齐起点 +
    // 精确不变式断言。

    use std::collections::HashMap;
    use std::sync::{mpsc, Arc, Barrier, Mutex};

    /// 32 位同字符令牌（≥ `MIN_TOKEN_LEN`，无空白）。
    fn token_of(ch: char) -> String {
        ch.to_string().repeat(32)
    }

    fn bearer(token: &str) -> axum::http::HeaderMap {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            axum::http::header::AUTHORIZATION,
            format!("Bearer {token}").parse().unwrap(),
        );
        headers
    }

    /// 更新串行 + 发布原子：一次 `update` 的「写盘 → 发布」全程占着更新闸，
    /// 第二个 update 进不来；发布前对外仍是完整一致的旧策略，发布是一次
    /// 整体替换。
    ///
    /// 旧实现没有这把闸：两个 update 可以同时做「读快照 → 写盘 → 写内存」，
    /// 后提交的会把先提交的轮换写回旧令牌，并且因为"令牌没变"不推进代次。
    #[test]
    fn update_gate_serializes_and_publish_is_one_atomic_swap() {
        let token_a = token_of('a');
        let token_b = token_of('b');
        let auth = auth(&token_a, true);
        let (paused_tx, paused_rx) = mpsc::channel();
        let (release_tx, release_rx) = mpsc::channel::<()>();
        let release_rx = Mutex::new(release_rx);
        auth.set_before_publish_hook(Some(Arc::new(move |_next| {
            paused_tx.send(()).unwrap();
            let _ = release_rx.lock().unwrap().recv();
        })));
        let updater = {
            let auth = auth.clone();
            let token_b = token_b.clone();
            std::thread::spawn(move || {
                auth.update(Change {
                    token: Some(token_b),
                    require_token: None,
                })
            })
        };
        paused_rx.recv().expect("更新线程没走到发布点");
        // 1) 更新闸被持有：第二个 update 不可能插进来。
        assert!(
            auth.update_in_flight(),
            "update 没有串行化：并发更新可以交叉执行（丢更新 / 回滚轮换的入口）"
        );
        // 2) 发布前对外是**一份完整的旧策略**，不是「新 token + 旧代次」。
        assert_eq!(auth.policy_snapshot(), (token_a.clone(), true, 0));
        assert_eq!(auth.authorize_handshake(&bearer(&token_a), None), Some(0));
        assert_eq!(auth.authorize_handshake(&bearer(&token_b), None), None);
        release_tx.send(()).unwrap();
        updater.join().unwrap().expect("更新失败");
        // 3) 发布是一次整体替换：新令牌与新代次同时可见；旧令牌在最终代次
        //    上不可能再通过（"老凭据拿最终代次免疫"的反面）。
        assert_eq!(auth.policy_snapshot(), (token_b.clone(), true, 1));
        assert_eq!(auth.authorize_handshake(&bearer(&token_b), None), Some(1));
        assert_eq!(auth.authorize_handshake(&bearer(&token_a), None), None);
        assert!(!auth.update_in_flight(), "更新结束后更新闸没有释放");
    }

    /// 只改开关的 update 不能把并发轮换回滚成旧令牌。
    ///
    /// 旧实现里只改开关的更新（如 `{require_token: true}`，令牌不变）会把
    /// 自己读到的旧 token 原样写回：如果另一个线程刚轮换过，轮换就被抹掉，
    /// 而且因为"令牌没变"不推进代次——旧令牌在最终代次上继续有效，握手拿到
    /// 的正是最终代次，于是这条连接永久免疫。现在两次 update 串行，开关更新
    /// 基于上一次已提交的令牌，写回的就是新令牌。
    #[test]
    fn require_only_update_cannot_roll_back_a_rotation() {
        let token_a = token_of('a');
        let token_b = token_of('b');
        let auth = auth(&token_a, true);
        let (paused_tx, paused_rx) = mpsc::channel();
        let (release_tx, release_rx) = mpsc::channel::<()>();
        let release_rx = Mutex::new(release_rx);
        // 只停**第一个** update（纯开关那个）；随后轮到轮换 update 时钩子
        // 直接放行（否则它也会停在同一个钩子上等一个不会来的放行信号）。
        let first = std::sync::atomic::AtomicBool::new(true);
        auth.set_before_publish_hook(Some(Arc::new(move |_next| {
            if first.swap(false, std::sync::atomic::Ordering::SeqCst) {
                paused_tx.send(()).unwrap();
                let _ = release_rx.lock().unwrap().recv();
            }
        })));
        let noop = {
            let auth = auth.clone();
            std::thread::spawn(move || {
                auth.update(Change {
                    token: None,
                    require_token: Some(true), // require 本来就是 true：纯开关更新
                })
            })
        };
        paused_rx.recv().expect("开关更新没走到发布点");
        let rotate = {
            let auth = auth.clone();
            let token_b = token_b.clone();
            std::thread::spawn(move || {
                auth.update(Change {
                    token: Some(token_b),
                    require_token: None,
                })
            })
        };
        release_tx.send(()).unwrap();
        noop.join().unwrap().unwrap();
        rotate.join().unwrap().unwrap();
        assert_eq!(
            auth.policy_snapshot(),
            (token_b.clone(), true, 1),
            "并发开关更新把轮换回滚了"
        );
        assert_eq!(
            auth.authorize_handshake(&bearer(&token_a), None),
            None,
            "旧令牌在最终代次上仍然可用（握手会拿到最终代次 → 永久免疫）"
        );
        assert_eq!(auth.authorize_handshake(&bearer(&token_b), None), Some(1));
    }

    /// 并发轮换：内存、磁盘、代次三者必须同步推进。
    ///
    /// 旧实现里两个 update 可以各自基于旧快照写盘/写内存，磁盘顺序与内存
    /// 顺序可能相反（重启后令牌变回旧值）；"令牌没变"的判断还会漏推代次。
    #[test]
    fn concurrent_rotations_keep_memory_disk_and_epoch_in_step() {
        const THREADS: usize = 4;
        const ROUNDS: usize = 3;
        let dir = std::env::temp_dir().join(format!(
            "panel-security-race-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("panel.toml");
        std::fs::write(&path, "[server]\nbind_address = \"0.0.0.0:8080\"\n").unwrap();
        let auth = auth("", false);
        auth.attach_config(Some(path.clone()));
        let barrier = Arc::new(Barrier::new(THREADS));
        let mut threads = Vec::new();
        for thread_index in 0..THREADS {
            let auth = auth.clone();
            let barrier = barrier.clone();
            threads.push(std::thread::spawn(move || {
                barrier.wait();
                for round in 0..ROUNDS {
                    // 每个线程/轮次一把独立令牌（≥16 位、无空白）。
                    let token =
                        format!("{thread_index:02x}{round:02x}0123456789abcdef0123456789abcdef");
                    auth.update(Change {
                        token: Some(token),
                        require_token: None,
                    })
                    .expect("并发轮换失败");
                }
            }));
        }
        for thread in threads {
            thread.join().unwrap();
        }
        let (token, require, epoch) = auth.policy_snapshot();
        assert!(!require);
        assert_eq!(
            epoch,
            (THREADS * ROUNDS) as u64,
            "每次轮换必须恰好推进一次代次（丢了或重复推了）"
        );
        // 磁盘与内存必须是同一次提交：否则重启后面板换成另一把令牌，
        // 用户刚存进浏览器的凭据当场失效。
        let text = std::fs::read_to_string(&path).unwrap();
        let parsed: toml::Table = toml::from_str(&text).expect("写出来的必须是合法 TOML");
        assert_eq!(
            parsed["server"]["access_token"].as_str(),
            Some(token.as_str()),
            "磁盘与内存分叉：{text}"
        );
        assert_eq!(
            auth.authorize_handshake(&bearer(&token), None),
            Some(epoch),
            "最终令牌必须恰好对应最终代次"
        );
        std::fs::remove_dir_all(&dir).ok();
    }

    /// 并发轮换下的握手不变式：**握手返回的代次，必须就是它校验的那份
    /// 策略的代次**（该代次对应的令牌 == 送验的令牌）。
    ///
    /// 旧实现的两次 epoch 读只能识别"判定期间代次变过"，挡不住一次判定
    /// 跨越两个并发 update：可能出现「最终令牌 + 旧代次」或「旧令牌 + 最终
    /// 代次」。这里每个代次 → 令牌的对应关系在发布**之前**登记，读者拿到的
    /// 任何 `Some(epoch)` 都必须与登记表一致。
    #[test]
    fn handshake_epoch_always_matches_the_token_it_validated() {
        const WRITERS: usize = 2;
        const ROTATIONS: usize = 20;
        const READERS: usize = 4;
        const READS: usize = 500;
        let initial = token_of('0');
        let auth = auth(&initial, true);
        let mut all_tokens = vec![initial.clone()];
        for writer in 0..WRITERS {
            for round in 0..ROTATIONS {
                all_tokens.push(format!(
                    "{writer:02x}{round:02x}fedcba9876543210fedcba9876543210"
                ));
            }
        }
        let all_tokens = Arc::new(all_tokens);
        // epoch → 该代次的令牌。写在发布之前（同一把更新闸内），所以任何
        // 能看到代次 E 的读者都查得到 E 对应的令牌。
        let published: Arc<Mutex<HashMap<u64, String>>> =
            Arc::new(Mutex::new(HashMap::from([(0u64, initial)])));
        let mirror = published.clone();
        auth.set_before_publish_hook(Some(Arc::new(move |next: &AuthPolicy| {
            mirror
                .lock()
                .unwrap()
                .insert(next.epoch, next.token.clone());
        })));
        let barrier = Arc::new(Barrier::new(WRITERS + READERS));
        let mut threads = Vec::new();
        for writer in 0..WRITERS {
            let auth = auth.clone();
            let barrier = barrier.clone();
            threads.push(std::thread::spawn(move || {
                barrier.wait();
                for round in 0..ROTATIONS {
                    let token = format!("{writer:02x}{round:02x}fedcba9876543210fedcba9876543210");
                    auth.update(Change {
                        token: Some(token),
                        require_token: None,
                    })
                    .expect("轮换失败");
                }
            }));
        }
        for reader in 0..READERS {
            let auth = auth.clone();
            let barrier = barrier.clone();
            let published = published.clone();
            let all_tokens = all_tokens.clone();
            threads.push(std::thread::spawn(move || {
                barrier.wait();
                let mut seed = 0x9e37_79b9_7f4a_7c15u64 ^ (reader as u64);
                for _ in 0..READS {
                    // 简单 LCG：不引依赖，也不靠线程调度碰运气。
                    seed = seed
                        .wrapping_mul(6364136223846793005)
                        .wrapping_add(1442695040888963407);
                    let token = &all_tokens[(seed >> 33) as usize % all_tokens.len()];
                    if let Some(epoch) = auth.authorize_handshake(&bearer(token), None) {
                        let published = published.lock().unwrap();
                        assert_eq!(
                            published.get(&epoch).map(String::as_str),
                            Some(token.as_str()),
                            "代次 {epoch} 上接受了不属于该代次的令牌"
                        );
                    }
                }
            }));
        }
        for thread in threads {
            thread.join().unwrap();
        }
        // 收尾：最终代次对应最终令牌，其余令牌全部拒绝。
        let (token, _, epoch) = auth.policy_snapshot();
        assert_eq!(epoch, (WRITERS * ROTATIONS) as u64);
        assert_eq!(auth.authorize_handshake(&bearer(&token), None), Some(epoch));
        for other in all_tokens.iter() {
            if other != &token {
                assert_eq!(
                    auth.authorize_handshake(&bearer(other), None),
                    None,
                    "轮换掉的令牌仍然可用：{other}"
                );
            }
        }
    }
}
