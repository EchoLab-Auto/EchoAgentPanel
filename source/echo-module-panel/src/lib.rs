//! # echo-module-panel — 可选的进程内 Web Panel（实现完全归 Panel 仓）
//!
//! 本模块只做 **Core 模块生命周期 ↔ Panel 运行库** 的适配：HTTP/WS 路由、
//! 前端、上游与 SSH 隧道仍由 Panel 仓的 `echo-web-server` 拥有。独立
//! `echo-agent-panel` 外壳与本模块使用同一个运行库，避免两份实现漂移。
//!
//! ## 启用
//!
//! 编译进 Core 不等于开启服务。外部仓的可选模块默认 `enabled = false`
//! （组合根按 `BUILTIN_MODULE_IDS` 判定），必须显式在 `modules.toml` 中启用：
//!
//! ```toml
//! [[module]]
//! id = "echo-agent.panel.web"
//! kind = "builtin"
//! name = "Web Panel"
//! enabled = true
//!
//! [module.config]
//! # 全部可选——不写就按下面的解析顺序自动取值。
//! # bind = "127.0.0.1:8081"
//! # static_dir = "/absolute/path/to/web/dist"
//! # config_file = "/home/me/.config/echo-agent-panel/panel.toml"
//! ```
//!
//! ## 零配置能跑起来的三件事（2026-11 内嵌形态完善）
//!
//! 内嵌形态此前要求用户手填三样东西，任何一样缺了就是"启用了却起不来"：
//!
//! | 需要什么 | 此前 | 现在 |
//! |---|---|---|
//! | 前端目录 | 必须写绝对路径 | [`discover_static_dir`]：环境变量 → 可执行文件同级 → 已安装的独立 Panel → Core 配置目录 |
//! | 连自己的地址与令牌 | 必须再配一份 `*_secret_file` | 组合根注入 [`PanelDefaults`]（复用 `core.toml` 的 `management_address` / `management_access_token`） |
//! | 端口 | 默认 8080，与独立 Panel 撞车时只有一行 `address in use` | 预检 + 可操作错误（点名占用者与两条出路） |
//!
//! `config_file` 仍然指向独立 Panel 的 TOML：**多上游 / SSH / 联邦发现**这些
//! 部署事实只该有一份，内嵌与独立复用同一份配置（而不是复制到模块配置里，
//! 那样两份必然漂移）。
//!
//! ## 为什么仍然走 WS 中继
//!
//! 内嵌时 Panel 连的是**自己所在进程**的管理面（`ws://127.0.0.1:3132`），
//! 多一次 TCP 往返。改成宿主直接调用的收益（省一跳）远小于代价（管理面
//! 协议要分叉成进程内/进程外两套），因此这一版保留中继；换来的好处是
//! **内嵌与独立是同一条代码路径**，行为不会分叉。
//!
//! 令牌因此必须是**真令牌**：组合根注入的正是 `core.toml` 里那一份，所以
//! 内嵌形态不需要用户再抄一遍。

use std::path::{Path, PathBuf};
use std::sync::Arc;

use echo_module::{BuiltinModule, Module, ModuleManifest};
use echo_web_server::runtime::{PanelRuntime, PanelRuntimeConfig};

pub const MODULE_ID: &str = "echo-agent.panel.web";

/// 内嵌形态的**宿主默认值**：由组合根注入（它才知道自己的管理面地址与令牌）。
///
/// 为什么要这一层：`modules.toml` 的模块配置会出现在诊断/清单面，**不能放
/// 凭证**；而内嵌 Panel 连的就是本进程的管理面，那份令牌本来就在宿主手里。
/// 让用户为了"连自己"再配一个 `secret_file`，是把宿主的内部细节泄漏成用户
/// 负担。
#[derive(Debug, Clone, Default)]
pub struct PanelDefaults {
    /// 本进程管理面的 WS 地址（组合根负责把 `0.0.0.0` 收敛成回环地址）。
    pub core_url: String,
    /// 本进程管理面的访问令牌。
    pub core_access_token: String,
}

#[derive(Debug, Default, serde::Deserialize)]
#[serde(default, deny_unknown_fields)]
struct Config {
    /// 监听地址。缺省 `127.0.0.1:8080`（与独立 Panel 的默认一致）。
    bind: Option<String>,
    /// 前端目录（含 `index.html` 的 `web/dist`）。缺省走自动发现。
    static_dir: Option<PathBuf>,
    /// 管理面 WS 地址。缺省 = 宿主注入值。
    core: Option<String>,
    /// 管理面令牌（**不推荐**写在模块配置里：会进诊断面）。
    core_access_token: Option<String>,
    core_access_token_secret_file: Option<PathBuf>,
    /// 浏览器侧访问令牌（空 = 不认证）。
    access_token: Option<String>,
    access_token_secret_file: Option<PathBuf>,
    /// 是否强制认证（缺省 = 沿用 `config_file` 的值，再缺省 true）。
    require_token: Option<bool>,
    /// 独立 Panel 的 TOML：多上游 / SSH / 联邦发现的**唯一**来源。
    config_file: Option<PathBuf>,
    media_dir: Option<PathBuf>,
    media_cache_dir: Option<PathBuf>,
    /// 允许非回环监听（必须同时配置 access_token，否则拒绝启动）。
    allow_remote: bool,
}

/// `~` 展开：配置里写 `~/…` 是最常见的写法，而 `Path::new("~")` 不会自动展开。
fn expand_home(path: &Path) -> PathBuf {
    let rest = if path == Path::new("~") {
        Some(Path::new(""))
    } else {
        path.strip_prefix("~/").ok()
    };
    let Some(rest) = rest else {
        return path.to_path_buf();
    };
    match std::env::var_os("HOME") {
        Some(home) => PathBuf::from(home).join(rest),
        None => path.to_path_buf(),
    }
}

fn secret(path: Option<&Path>) -> anyhow::Result<String> {
    let Some(path) = path else {
        return Ok(String::new());
    };
    let expanded = expand_home(path);
    Ok(std::fs::read_to_string(&expanded)
        .map_err(|e| anyhow::anyhow!("read secret_file {}: {e}", expanded.display()))?
        .trim()
        .to_owned())
}

fn is_loopback(bind: &str) -> bool {
    bind.starts_with("127.0.0.1:")
        || bind.starts_with("localhost:")
        || bind.starts_with("[::1]:")
}

/// 前端目录的候选顺序（**第一个含 `index.html` 的胜出**）。
///
/// 顺序的设计依据是"离这次运行最近的事实优先"：
/// 1. 环境变量 `ECHO_PANEL_STATIC_DIR` —— 打包/测试显式指定；
/// 2. 可执行文件同级 `web/` —— 单目录分发的内嵌形态（`bin/` + `web/`）；
/// 3. `../libexec/echo-agent-panel/web` 与 `~/.local/libexec/echo-agent-panel/web`
///    —— 本机既有的**独立 Panel 安装布局**：内嵌形态直接复用同一份前端产物，
///    不必为了试一下内嵌而再拷一份 `web/dist`；
/// 4. Core 配置目录下的 `web/` —— 手工放一份的自定义部署。
fn static_dir_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(dir) = std::env::var_os("ECHO_PANEL_STATIC_DIR") {
        candidates.push(PathBuf::from(dir));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("web"));
            candidates.push(dir.join("panel-web"));
            // 安装布局：`<prefix>/bin/echo-agent-core` + `<prefix>/libexec/…`
            if let Some(prefix) = dir.parent() {
                candidates.push(prefix.join("libexec/echo-agent-panel/web"));
            }
        }
    }
    if let Some(home) = std::env::var_os("HOME") {
        let home = PathBuf::from(home);
        candidates.push(home.join(".local/libexec/echo-agent-panel/web"));
    }
    if let Some(config) = std::env::var_os("XDG_CONFIG_HOME") {
        candidates.push(PathBuf::from(config).join("echo-agent-panel/web"));
    } else if let Some(home) = std::env::var_os("HOME") {
        candidates.push(PathBuf::from(home).join(".config/echo-agent-panel/web"));
    }
    candidates
}

/// 解析前端目录：显式配置 → 自动发现 → 可读的错误（列出试过的每一个路径）。
fn discover_static_dir(explicit: Option<&Path>) -> anyhow::Result<PathBuf> {
    discover_static_dir_with(explicit, &static_dir_candidates())
}

/// 同上，但候选列表由调用方给（单测要能构造"哪儿都没有"的场景——
/// 本机装了独立 Panel 时，真实候选永远能命中，测不到失败分支）。
fn discover_static_dir_with(
    explicit: Option<&Path>,
    candidates: &[PathBuf],
) -> anyhow::Result<PathBuf> {
    if let Some(dir) = explicit {
        let dir = expand_home(dir);
        if !dir.join("index.html").is_file() {
            anyhow::bail!(
                "内嵌 Panel 的 static_dir 里没有 index.html：{}（要指向构建好的 web/dist）",
                dir.display()
            );
        }
        return Ok(dir);
    }
    for candidate in candidates {
        if candidate.join("index.html").is_file() {
            return Ok(candidate.clone());
        }
    }
    let tried = candidates
        .iter()
        .map(|p| format!("\n  - {}", p.display()))
        .collect::<String>();
    anyhow::bail!(
        "内嵌 Panel 找不到前端目录（需要一个含 index.html 的 web/dist）。\
         请在 `[module.config] static_dir` 显式指定，或设 `ECHO_PANEL_STATIC_DIR`。\
         已尝试：{tried}"
    )
}

/// 管理面地址 → 本机可连的 WS URL。
///
/// `0.0.0.0:3132` 是**监听**地址，不能直接当客户端目标（部分平台连不上，
/// 且语义上等价于"连自己"）。内嵌形态永远是本机自连，所以统一收敛到回环。
fn loopback_url(address: &str) -> String {
    let trimmed = address.trim();
    if trimmed.is_empty() {
        return "ws://127.0.0.1:3132".into();
    }
    let port = trimmed.rsplit(':').next().unwrap_or("3132");
    if let Some(rest) = trimmed.strip_prefix("0.0.0.0:") {
        return format!("ws://127.0.0.1:{rest}");
    }
    if let Some(rest) = trimmed.strip_prefix("[::]:") {
        return format!("ws://127.0.0.1:{rest}");
    }
    if trimmed.starts_with("ws://") || trimmed.starts_with("wss://") {
        return trimmed.to_string();
    }
    if trimmed.contains(':') {
        format!("ws://{trimmed}")
    } else {
        format!("ws://127.0.0.1:{port}")
    }
}

/// 组装运行参数（纯函数，便于单测；不触碰端口与文件系统之外的副作用）。
fn runtime_config(
    ctx: &echo_module::MountContext,
    defaults: &PanelDefaults,
) -> anyhow::Result<PanelRuntimeConfig> {
    let cfg: Config = if ctx.config().is_null() {
        Config::default()
    } else {
        serde_json::from_value(ctx.config().clone())
            .map_err(|e| anyhow::anyhow!("invalid {MODULE_ID} config: {e}"))?
    };
    // 独立 Panel 的完整配置（可选）：多上游 / SSH / 联邦发现的唯一来源。
    let panel = match &cfg.config_file {
        Some(path) => Some(echo_web_server::config::PanelConfig::load(&expand_home(
            path,
        ))?),
        None => None,
    };
    // 逐项解析：模块配置 > Panel TOML > 宿主注入 > 内置缺省。
    // **逐项**而不是"整份覆盖"：此前用 `cfg.bind == Config::default().bind` 判断
    // "用户有没有显式写"，于是显式写默认值时会被 TOML 反覆盖——一个只在
    // 特定值上出现的 bug。Option 化之后语义是"没写就是 None"。
    let bind = cfg
        .bind
        .clone()
        .or_else(|| panel.as_ref().map(|p| p.server.bind_address.clone()))
        .unwrap_or_else(|| "127.0.0.1:8080".into());
    let static_dir = discover_static_dir(
        cfg.static_dir
            .as_deref()
            .or_else(|| panel.as_ref().map(|p| Path::new(&p.server.static_dir))),
    )?;
    let core = cfg
        .core
        .clone()
        .or_else(|| panel.as_ref().map(|p| p.core.connect_url.clone()))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| loopback_url(&defaults.core_url));
    let core_access_token = cfg
        .core_access_token
        .clone()
        .filter(|value| !value.is_empty())
        .or_else(|| {
            panel
                .as_ref()
                .map(|p| p.core.access_token.clone())
                .filter(|value| !value.is_empty())
        })
        .unwrap_or_else(|| defaults.core_access_token.clone());
    let core_access_token = if core_access_token.is_empty() {
        secret(cfg.core_access_token_secret_file.as_deref())?
    } else {
        core_access_token
    };
    let access_token = cfg
        .access_token
        .clone()
        .filter(|value| !value.is_empty())
        .or_else(|| {
            panel
                .as_ref()
                .map(|p| p.server.access_token.clone())
                .filter(|value| !value.is_empty())
        })
        .unwrap_or_default();
    let access_token = if access_token.is_empty() {
        secret(cfg.access_token_secret_file.as_deref())?
    } else {
        access_token
    };
    let media_dir = cfg
        .media_dir
        .clone()
        .or_else(|| panel.as_ref().map(|p| p.server.effective_media_dir()))
        .unwrap_or_default();
    let media_cache_dir = cfg
        .media_cache_dir
        .clone()
        .or_else(|| panel.as_ref().map(|p| p.server.effective_media_cache_dir()))
        .unwrap_or_default();
    // 安全边界：非回环必须显式放行**且**配了令牌，否则拒绝启动。
    if !cfg.allow_remote && !is_loopback(&bind) {
        anyhow::bail!(
            "内嵌 Panel 的 bind {bind:?} 不是回环地址；要对外暴露请同时配置 \
             access_token_secret_file 与 allow_remote=true"
        );
    }
    if cfg.allow_remote && access_token.is_empty() {
        anyhow::bail!("内嵌 Panel 拒绝在没有 access_token_secret_file 的情况下对外监听");
    }
    let require_token = cfg
        .require_token
        .or_else(|| panel.as_ref().map(|p| p.server.require_token))
        .unwrap_or(true);
    Ok(PanelRuntimeConfig {
        config_file: cfg.config_file.map(|path| expand_home(&path)),
        bind,
        static_dir,
        core,
        core_access_token,
        access_token,
        media_dir,
        media_cache_dir,
        require_token,
        // 内嵌形态的标识：前端据此显示"内嵌于 Core"，也说明为什么
        // 「Panel 自更新」这类动作在本形态下没有意义。
        embedded: true,
    })
}

/// 端口占用预检：把内核的 `address in use` 换成能照着做的错误。
///
/// 只在**已经能解析出 bind** 之后调用；预检本身失败不影响后续（真正 bind
/// 由运行库做，那里才是权威），这里只负责把最常见的一种失败说清楚——
/// 内嵌形态几乎总是撞上"独立 Panel 已经占着 8080"。
fn preflight_bind(bind: &str) -> anyhow::Result<()> {
    match std::net::TcpListener::bind(bind) {
        Ok(listener) => {
            drop(listener);
            Ok(())
        }
        Err(error) => anyhow::bail!(
            "内嵌 Panel 无法监听 {bind}：{error}\n\
             最常见的原因是**独立 Panel 正在占用同一个端口**。两条出路：\n\
             1. 停掉独立 Panel（`systemctl --user stop echo-agent-panel`）；\n\
             2. 给内嵌 Panel 换端口：`[module.config] bind = \"127.0.0.1:8081\"`。"
        ),
    }
}

/// 构造模块（无宿主默认值：只能靠 `modules.toml` 或 `config_file` 提供连接信息）。
pub fn module(version: &str) -> Arc<dyn Module> {
    module_with_defaults(version, None)
}

/// 构造模块，并注入**宿主默认值**（内嵌形态的零配置路径）。
///
/// 组合根知道自己管理面的地址与令牌，而模块配置面不能放凭证——这两个事实
/// 决定了必须有这个入口。
pub fn module_with_defaults(version: &str, defaults: Option<PanelDefaults>) -> Arc<dyn Module> {
    let manifest = ModuleManifest::builtin(
        MODULE_ID,
        "Web Panel",
        version,
        "panel",
        "panel",
        "可选的进程内 Web Panel：HTTP/WS、前端、多上游；独立 Panel 外壳继续可用",
    );
    let defaults = defaults.unwrap_or_default();
    Arc::new(BuiltinModule::new(manifest, move |ctx| {
        let config = runtime_config(ctx, &defaults)
            .map_err(|e| echo_module::ModuleMountError::Mount(e.to_string()))?;
        preflight_bind(&config.bind).map_err(|e| echo_module::ModuleMountError::Mount(e.to_string()))?;
        let running = PanelRuntime::start(config).map_err(|e| {
            echo_module::ModuleMountError::Mount(format!("start embedded Panel: {e}"))
        })?;
        Ok(vec![echo_context::Disposer::from_fn(move || {
            running.shutdown();
        })])
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx_with(config: serde_json::Value) -> echo_module::MountContext {
        echo_module::MountContext::default().with_config(config)
    }

    #[test]
    fn identity_is_a_process_scoped_builtin() {
        let module = module("0.0.0-test");
        assert_eq!(module.manifest().id, MODULE_ID);
        assert_eq!(module.manifest().kind, "panel");
        assert!(module.manifest().builtin);
    }

    /// 哪儿都找不到前端目录 → 错误里必须点名"怎么给"，而不是只报缺字段。
    #[test]
    fn missing_static_dir_names_the_ways_to_fix_it() {
        let error = discover_static_dir_with(None, &[])
            .unwrap_err()
            .to_string();
        assert!(error.contains("static_dir"), "{error}");
        assert!(error.contains("ECHO_PANEL_STATIC_DIR"), "{error}");
    }

    /// 显式配置指向没有 `index.html` 的目录 → 立刻点名，不静默回落。
    #[test]
    fn explicit_static_dir_without_index_is_rejected() {
        let dir = std::env::temp_dir().join("embedded-panel-no-index");
        std::fs::create_dir_all(&dir).unwrap();
        let error = discover_static_dir(Some(&dir)).unwrap_err().to_string();
        std::fs::remove_dir_all(&dir).ok();
        assert!(error.contains("index.html"), "{error}");
    }

    /// 自动发现：候选里第一个含 `index.html` 的胜出（顺序即优先级）。
    #[test]
    fn discovery_picks_the_first_candidate_with_index_html() {
        let root = std::env::temp_dir().join("embedded-panel-discovery");
        let empty = root.join("empty");
        let good = root.join("good");
        std::fs::create_dir_all(&empty).unwrap();
        std::fs::create_dir_all(&good).unwrap();
        std::fs::write(good.join("index.html"), "x").unwrap();
        let found = discover_static_dir_with(None, &[empty.clone(), good.clone()]).unwrap();
        std::fs::remove_dir_all(&root).ok();
        assert_eq!(found, good);
    }

    #[test]
    fn remote_bind_is_fail_closed_without_explicit_authentication() {
        let dir = std::env::temp_dir().join("embedded-panel-remote-check");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("index.html"), "x").unwrap();
        let error = runtime_config(
            &ctx_with(serde_json::json!({
                "bind": "0.0.0.0:18080",
                "static_dir": dir,
            })),
            &PanelDefaults::default(),
        )
        .unwrap_err()
        .to_string();
        std::fs::remove_dir_all(&dir).ok();
        assert!(error.contains("allow_remote=true"), "{error}");
    }

    /// 宿主注入的令牌与地址必须**在不写任何配置**的情况下生效（内嵌零配置）。
    #[test]
    fn host_defaults_supply_core_url_and_token() {
        let dir = std::env::temp_dir().join("embedded-panel-defaults");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("index.html"), "x").unwrap();
        let config = runtime_config(
            &ctx_with(serde_json::json!({ "static_dir": dir, "bind": "127.0.0.1:0" })),
            &PanelDefaults {
                core_url: "0.0.0.0:3132".into(),
                core_access_token: "host-token".into(),
            },
        )
        .unwrap();
        std::fs::remove_dir_all(&dir).ok();
        assert_eq!(config.core, "ws://127.0.0.1:3132");
        assert_eq!(config.core_access_token, "host-token");
        assert!(config.embedded);
    }

    /// 显式配置优先于宿主默认值（用户想连别的 Core 时必须能覆盖）。
    #[test]
    fn explicit_config_beats_host_defaults() {
        let dir = std::env::temp_dir().join("embedded-panel-explicit");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("index.html"), "x").unwrap();
        let config = runtime_config(
            &ctx_with(serde_json::json!({
                "static_dir": dir,
                "bind": "127.0.0.1:0",
                "core": "ws://10.0.0.9:3132",
                "core_access_token": "explicit",
            })),
            &PanelDefaults {
                core_url: "0.0.0.0:3132".into(),
                core_access_token: "host-token".into(),
            },
        )
        .unwrap();
        std::fs::remove_dir_all(&dir).ok();
        assert_eq!(config.core, "ws://10.0.0.9:3132");
        assert_eq!(config.core_access_token, "explicit");
    }

    /// `0.0.0.0` / `[::]` / 裸端口都要收敛成可连的回环 URL。
    #[test]
    fn loopback_url_rewrites_wildcard_binds() {
        assert_eq!(loopback_url("0.0.0.0:3132"), "ws://127.0.0.1:3132");
        assert_eq!(loopback_url("[::]:3132"), "ws://127.0.0.1:3132");
        assert_eq!(loopback_url("127.0.0.1:3132"), "ws://127.0.0.1:3132");
        assert_eq!(loopback_url("3132"), "ws://127.0.0.1:3132");
        assert_eq!(loopback_url("ws://127.0.0.1:9"), "ws://127.0.0.1:9");
        assert_eq!(loopback_url(""), "ws://127.0.0.1:3132");
    }
}

#[cfg(test)]
mod lifecycle_tests {
    use super::*;

    /// 真正的模块 mount → HTTP 请求 → 内嵌标识 → unmount → 端口重新可绑。
    ///
    /// 覆盖内嵌形态的**端到端**契约：mount 之后能出前端、`/api/panel-identity`
    /// 报 `embedded: true`（前端据此显示"内嵌于 Core"）、unmount 释放端口。
    #[tokio::test(flavor = "current_thread")]
    async fn mount_serves_frontend_marks_embedded_and_unmount_releases_port() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);
        let dir = std::env::temp_dir().join(format!("embedded-panel-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("index.html"), "embedded-panel-ok").unwrap();
        let module = module("test");
        let disposers = module
            .mount(
                &echo_module::MountContext::default().with_config(serde_json::json!({
                    "bind": format!("127.0.0.1:{port}"),
                    "static_dir": dir,
                    // 指向一个必然连不上的端口：本用例只验 HTTP 面。
                    "core": "ws://127.0.0.1:9"
                })),
            )
            .expect("mount");
        let response = reqwest::get(format!("http://127.0.0.1:{port}/"))
            .await
            .unwrap()
            .text()
            .await
            .unwrap();
        assert!(response.contains("embedded-panel-ok"), "{response}");

        // 内嵌标识：前端据此把"Panel 自更新"这类动作标成"由 Core 负责"。
        // 用 text + serde_json 解析而不是 `Response::json()`——reqwest 在这个
        // 工作区是 `default-features = false`，`json` feature 没开。
        let identity_text = reqwest::get(format!(
            "http://127.0.0.1:{port}/api/panel-identity"
        ))
        .await
        .unwrap()
        .text()
        .await
        .unwrap();
        let identity: serde_json::Value =
            serde_json::from_str(&identity_text).expect("panel-identity is JSON");
        assert_eq!(identity.get("embedded"), Some(&serde_json::Value::Bool(true)), "{identity}");

        for disposer in disposers {
            disposer.dispose();
        }
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
        tokio::net::TcpListener::bind(("127.0.0.1", port))
            .await
            .expect("unmount releases listener");
        std::fs::remove_dir_all(dir).ok();
    }
}
