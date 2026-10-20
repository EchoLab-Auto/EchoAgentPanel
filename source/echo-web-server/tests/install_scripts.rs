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
