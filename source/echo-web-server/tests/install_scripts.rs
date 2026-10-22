//! 脚本门禁：安装 / 卸载脚本的语法与关键接线。
//!
//! 这些脚本在 CI 里**不会被真正执行**（会改系统），所以语法错误与 flag 断线
//! 只有等用户在生产上跑才发现。这里用 `bash -n` 做语法门禁，并对"文档承诺
//! 的开关"做存在性守护——重命名 / 删码后帮助文本与 README 不会脱节。
//!
//! 同类门禁见 EchoAgentCore 的 `source/core/tests/install_script_flag.rs`。

use std::path::{Path, PathBuf};
use std::process::Command;

fn repo_root() -> PathBuf {
    // 本文件位于 source/echo-web-server/tests/ → echo-web-server → source → 仓库根
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("source/")
        .parent()
        .expect("repo root")
        .to_path_buf()
}

fn read_script(name: &str) -> String {
    let path = repo_root().join("scripts").join(name);
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()))
}

/// `bash -n`：只解析不执行。
fn assert_script_parses(name: &str) {
    let path = repo_root().join("scripts").join(name);
    let output = Command::new("bash")
        .arg("-n")
        .arg(&path)
        .output()
        .unwrap_or_else(|e| panic!("run bash -n {}: {e}", path.display()));
    assert!(
        output.status.success(),
        "scripts/{name} 语法错误：\n{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn installer_scripts_parse() {
    for name in ["install.sh", "uninstall.sh", "update.sh"] {
        assert_script_parses(name);
    }
}

/// 一键安装 / 卸载的**引导**接线：`curl … | bash` 时脚本不在 git 检出里，
/// 必须能自己克隆接力。这三处任一被误删，一键安装就静默退化成"无法运行"。
#[test]
fn one_liner_bootstrap_is_wired() {
    let install = read_script("install.sh");
    let uninstall = read_script("uninstall.sh");

    for (name, text) in [("install.sh", &install), ("uninstall.sh", &uninstall)] {
        assert!(
            text.contains("ECHO_PANEL_BOOTSTRAPPED"),
            "{name} 缺少 bootstrap 防重入标记（ECHO_PANEL_BOOTSTRAPPED）"
        );
        assert!(
            text.contains("git clone --depth 1"),
            "{name} 缺少浅克隆（curl|bash 时没有本地仓库可依）"
        );
        assert!(
            text.contains("exec bash \"$BOOTSTRAP_DIR/repo/scripts/"),
            "{name} 未把控制权交给克隆里的脚本"
        );
        // 管道执行时 BASH_SOURCE 不可用（set -u 下会直接崩）。
        assert!(
            text.contains("${BASH_SOURCE[0]:-${0:-}}"),
            "{name} 缺少 BASH_SOURCE 兜底——管道执行会 unbound variable"
        );
    }
}

/// 帮助文本承诺的开关必须真的被解析（否则用户按帮助传参会被当未知选项拒绝）。
#[test]
fn documented_flags_are_parsed() {
    let install = read_script("install.sh");
    for flag in ["--repository", "--no-start", "--no-deps", "--dry-run"] {
        assert!(
            install.contains(&format!("{flag})")),
            "install.sh 帮助里写了 {flag}，但 case 分支缺失"
        );
        assert!(install.contains(flag), "install.sh 缺少 {flag}");
    }

    let uninstall = read_script("uninstall.sh");
    for flag in ["--purge", "--dry-run"] {
        assert!(
            uninstall.contains(&format!("{flag})")),
            "uninstall.sh 帮助里写了 {flag}，但 case 分支缺失"
        );
    }
}

/// `--dry-run` 必须**无副作用**：它会强制 `NO_DEPS=1`，否则预览阶段就会
/// 触发包管理器安装（用户跑 dry-run 的意图恰恰是"先别动我的系统"）。
#[test]
fn dry_run_never_installs_anything() {
    let install = read_script("install.sh");
    assert!(
        install.contains("NO_DEPS=1"),
        "install.sh 的 --dry-run 应强制 NO_DEPS=1（预览不得改系统）"
    );
    // 依赖检查必须在 dry-run 输出之前跑完，否则预览看不到缺失项。
    let deps_pos = install
        .find("Checking prerequisites")
        .expect("install.sh 缺少依赖检查段");
    let dry_pos = install
        .find("EchoAgentPanel install plan")
        .expect("install.sh 缺少 dry-run 计划输出");
    assert!(
        deps_pos < dry_pos,
        "依赖检查应在 dry-run 输出之前（否则预览报不出 MISSING）"
    );
}

/// 依赖自动安装的入口函数不能无声消失——它们是"一键"名副其实的前提。
#[test]
fn dependency_auto_install_exists() {
    let install = read_script("install.sh");
    for symbol in ["ensure_rust", "pkg_install", "ensure_system_command"] {
        assert!(
            install.contains(&format!("{symbol}()")),
            "install.sh 缺少 {symbol}——干净机器上会直接卡在缺 cargo/npm"
        );
    }
    // rustup 是 cargo 的唯一自动安装路径。
    assert!(
        install.contains("rustup"),
        "install.sh 缺少 rustup（cargo 无法自动安装）"
    );
}

/// 安装器必须开启 **linger**：user 作用域服务的生命周期前提。
///
/// 背景（2026-10-22，A100 节点实测两次）：unit 装成 `--user` 作用域、挂在
/// `default.target`，而 `default.target` 属于 `user@<uid>.service`。该用户
/// 管理器由第一个登录会话拉起、最后一个会话消失后十秒被 logind 停掉——
/// `user@` 一停，其下所有单元（含 Panel）一并停止。于是：
///
/// - 运维 SSH 登出 3 秒后 Panel 死（实测 23:20:00、03:12:35 两次）；
/// - 下次有人登录 3 秒后 Panel 又活（重启时间与登录时间精确重合，
///   看起来像"远端自动重启"，实际是登录把它带起来的）；
/// - **机器重启后无人登录时 Panel 根本不会起来**（更隐蔽的那一半）。
///
/// `Restart=always` 在这里救不了：unit 不是失败退出，是被上层正常停止，
/// 而 systemd 语义里显式 stop 之后不自动重启。安装器此前全文没有一处
/// `linger`，因此**每一台按默认路径装出来的机器都带这个缺陷**。
#[test]
fn installer_enables_linger_for_the_user_unit() {
    let install = read_script("install.sh");
    assert!(
        install.contains("loginctl enable-linger"),
        "install.sh 必须调用 loginctl enable-linger：\n\
         缺它则 Panel 在最后一个登录会话结束时被停止，且开机不自启"
    );
    assert!(
        install.contains("ensure_service_linger"),
        "应通过 ensure_service_linger 统一处理（定义 + 调用点各一处）"
    );
    // 调用点必须在使用它的单元 enable 之后——顺序反了会在服务已启动后才
    // 补 linger，掩盖"装完就掉"的窗口。
    let enable_at = install
        .find("systemctl --user enable echo-agent-panel.service")
        .expect("install.sh 应 enable 单元");
    let linger_at = install
        .find("ensure_service_linger\n")
        .expect("install.sh 应调用 ensure_service_linger");
    assert!(
        linger_at > enable_at,
        "ensure_service_linger 应在单元 enable 之后调用（当前顺序反了）"
    );
    // 失败不得中断安装，但必须显式告警并给出修复命令。
    assert!(
        install.contains("loginctl enable-linger $user"),
        "失败告警里应给出可直接复制的修复命令"
    );
    assert!(
        install.contains("without linger it"),
        "失败告警应说明后果（否则用户会当作可忽略的噪音）"
    );
}

/// 卸载器与安装器在 **linger** 上必须对称：装时开、卸时**不擅自关**。
///
/// install.sh 现在会开 linger（见 `installer_enables_linger_for_the_user_unit`），
/// 于是卸载时产生一个诱人的"顺手清理"：把 linger 关回去。这是错的——
/// linger 是**用户级、机器级**开关，不是本服务的私有属性：这台机器上可能
/// 还有别的 user 作用域服务（用户自己跑的守护进程），关掉会让它们在最后
/// 一个登录会话结束时静默死亡，而卸载器既不知道、也无法补偿。
///
/// 正确行为：**默认保留并明确告知**，关必须走显式 `--disable-linger`。
#[test]
fn uninstaller_reports_linger_and_only_disables_it_on_request() {
    let uninstall = read_script("uninstall.sh");

    assert!(
        uninstall.contains("--disable-linger"),
        "uninstall.sh 应提供 --disable-linger（显式开关）"
    );
    assert!(
        uninstall.contains("DISABLE_LINGER=0"),
        "默认必须是「不关」——DISABLE_LINGER 初始为 0"
    );
    let disable_at = uninstall
        .find("loginctl disable-linger")
        .expect("应支持关闭 linger");
    let guard_at = uninstall
        .find("if ((DISABLE_LINGER)); then")
        .expect("disable-linger 必须被 DISABLE_LINGER 守卫");
    assert!(
        guard_at < disable_at,
        "loginctl disable-linger 必须位于 DISABLE_LINGER 守卫之内"
    );

    assert!(
        uninstall.contains("Keeping linger for"),
        "默认保留 linger 时应明确告知（否则用户以为卸干净了）"
    );
    assert!(
        uninstall.contains("loginctl disable-linger $current_user"),
        "保留时应给出关闭方式（可发现性）"
    );

    assert!(
        uninstall.contains("linger:"),
        "dry-run 计划里应有一行 linger 状态"
    );
}

/// 卸载器必须能清掉 **system 作用域** 的存量单元（服务器装法）。
///
/// install.sh 只写 user 作用域，但存量机器可能是手工或旧脚本装的
/// `/etc/systemd/system/echo-agent-panel*.service`（多节点部署常见）。静默
/// 跳过是最坏的：二进制被删了，systemd 下次开机仍会去拉起它。
#[test]
fn uninstaller_handles_system_scope_units() {
    let uninstall = read_script("uninstall.sh");
    assert!(
        uninstall.contains("SYSTEM_UNIT_DIR=/etc/systemd/system"),
        "应探测 /etc/systemd/system"
    );
    assert!(
        uninstall.contains("system-scope units present but this script is not running as root"),
        "非 root 时应告警，而不是静默跳过"
    );
    assert!(
        uninstall.contains("sudo systemctl disable --now"),
        "非 root 时应给出可直接复制的清理命令"
    );
    assert!(
        uninstall.contains("system:    "),
        "dry-run 计划里应有一行 system 作用域单元"
    );
}

/// 卸载器不得顺手删掉**用户数据**：默认只清受管产物。
///
/// Panel 的数据目录里除了源码检出还有 `media-cache/`（远端图床/MCP 图片的
/// 回源缓存）。此前 `remove_dir "$DATA_DIR"` 会把它一起删掉，而 help 里写的是
/// "配置默认保留"——用户读到的是"只删程序"，实际连缓存都没了。缓存虽可
/// 重新拉取，但口径必须与 Core 一致：**不带 --purge 就不碰**。
#[test]
fn uninstaller_keeps_user_data_unless_purged() {
    let uninstall = read_script("uninstall.sh");
    assert!(
        uninstall.contains(r#"remove_dir "$DATA_DIR/source""#),
        "默认应只删受管源码检出"
    );
    assert!(
        uninstall.contains("Keeping media cache"),
        "默认应保留 media-cache 并告知"
    );
    // --purge 才整体移除，且必须发生在 PURGE 分支里。
    let purge_guard = uninstall
        .find("if ((PURGE)); then")
        .expect("应有 PURGE 分支");
    let whole_dir = uninstall
        .find(r#"remove_dir "$DATA_DIR" "data directory"#)
        .expect("--purge 应整体移除数据目录");
    assert!(
        purge_guard < whole_dir,
        "整体移除数据目录必须在 PURGE 分支内"
    );
}
