//! SSH 隧道端到端：进程内假 sshd（russh server）← `SshTunnels` 客户端。
//!
//! 覆盖：
//! - direct-tcpip 本地转发（TCP 往返字节一致）；
//! - 远程 exec（假 sshd 在本机 `sh -c` 执行命令，验证 stdout/退出码）；
//! - 媒体拉取（远端目录 → 本地缓存；缺失文件报错；缓存命中）；
//! - known_hosts TOFU（首次自动记录）；
//! - 认证失败（拒绝的公钥 → 隧道 offline + 原因上报）；
//! - ensure 幂等/配置变化重建/移除。

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use russh::keys::PrivateKey;
use russh::server::{Auth, Msg, Session};
use russh::{Channel, ChannelId};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use echo_web_server::ssh::{SshConfig, SshTunnels};

// ── 假 sshd ───────────────────────────────────────────────────────────────

/// 单连接处理器：接受任意公钥（`reject_user` 例外）；exec 在本机执行
/// `sh -c <命令>` 回传 stdout/退出码；direct-tcpip 连本地目标并双向转发。
struct FakeHandler {
    reject_user: Option<String>,
}

impl russh::server::Handler for FakeHandler {
    type Error = russh::Error;

    async fn auth_publickey(
        &mut self,
        user: &str,
        _key: &russh::keys::ssh_key::PublicKey,
    ) -> Result<Auth, Self::Error> {
        if self.reject_user.as_deref() == Some(user) {
            Ok(Auth::reject())
        } else {
            Ok(Auth::Accept)
        }
    }

    async fn channel_open_session(
        &mut self,
        _channel: Channel<Msg>,
        reply: russh::server::ChannelOpenHandle,
        _session: &mut Session,
    ) -> Result<(), Self::Error> {
        reply.accept().await;
        Ok(())
    }

    async fn exec_request(
        &mut self,
        channel: ChannelId,
        data: &[u8],
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        let _ = session.channel_success(channel);
        let command = String::from_utf8_lossy(data).to_string();
        let handle = session.handle();
        tokio::spawn(async move {
            let result = tokio::process::Command::new("sh")
                .arg("-c")
                .arg(&command)
                .output()
                .await;
            match result {
                Ok(output) => {
                    let _ = handle.data(channel, output.stdout).await;
                    let code = output.status.code().unwrap_or(255).max(0) as u32;
                    let _ = handle.exit_status_request(channel, code).await;
                    let _ = handle.eof(channel).await;
                    let _ = handle.close(channel).await;
                }
                Err(_) => {
                    let _ = handle.exit_status_request(channel, 127).await;
                    let _ = handle.eof(channel).await;
                }
            }
        });
        Ok(())
    }

    async fn channel_open_direct_tcpip(
        &mut self,
        channel: Channel<Msg>,
        host_to_connect: &str,
        port_to_connect: u32,
        _originator_address: &str,
        _originator_port: u32,
        reply: russh::server::ChannelOpenHandle,
        _session: &mut Session,
    ) -> Result<(), Self::Error> {
        reply.accept().await;
        let host = host_to_connect.to_string();
        let port = port_to_connect as u16;
        tokio::spawn(async move {
            if let Ok(mut tcp) = tokio::net::TcpStream::connect((host.as_str(), port)).await {
                let mut ssh_stream = channel.into_stream();
                let _ = tokio::io::copy_bidirectional(&mut tcp, &mut ssh_stream).await;
            }
        });
        Ok(())
    }
}

/// 启动假 sshd（手动 accept + `run_stream`——全部 owned，可 spawn），
/// 返回监听端口。
async fn start_fake_sshd(reject_user: Option<String>) -> u16 {
    let host_key = PrivateKey::random(&mut rand::rng(), russh::keys::Algorithm::Ed25519).unwrap();
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let config = Arc::new(russh::server::Config {
        keys: vec![host_key],
        inactivity_timeout: Some(Duration::from_secs(600)),
        auth_rejection_time: Duration::from_millis(10),
        auth_rejection_time_initial: Some(Duration::from_millis(0)),
        ..Default::default()
    });
    tokio::spawn(async move {
        loop {
            let Ok((stream, _peer)) = listener.accept().await else {
                break;
            };
            let config = config.clone();
            let handler = FakeHandler {
                reject_user: reject_user.clone(),
            };
            tokio::spawn(async move {
                if let Ok(session) = russh::server::run_stream(config, stream, handler).await {
                    let _ = session.await;
                }
            });
        }
    });
    port
}

// ── 测试辅助 ──────────────────────────────────────────────────────────────

fn temp_dir(tag: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "echo-panel-ssh-test-{tag}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

/// 生成一个测试用 ed25519 私钥文件（OpenSSH 格式）。
fn write_test_key(dir: &std::path::Path) -> PathBuf {
    let key = PrivateKey::random(&mut rand::rng(), russh::keys::Algorithm::Ed25519).unwrap();
    let pem = key
        .to_openssh(russh::keys::ssh_key::LineEnding::LF)
        .unwrap();
    let path = dir.join("id_ed25519");
    std::fs::write(&path, pem.as_bytes()).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).unwrap();
    }
    path
}

/// 基础 SSH 配置（指向假 sshd）。
fn base_cfg(dir: &std::path::Path, sshd_port: u16, key: &std::path::Path) -> SshConfig {
    SshConfig {
        host: "127.0.0.1".into(),
        port: sshd_port,
        user: "tester".into(),
        identity_file: key.to_string_lossy().into_owned(),
        accept_new_host_key: true,
        known_hosts_file: dir.join("known_hosts").to_string_lossy().into_owned(),
        ..SshConfig::default()
    }
}

async fn wait_phase(tunnels: &SshTunnels, name: &str, want: &str, timeout: Duration) {
    let deadline = tokio::time::Instant::now() + timeout;
    loop {
        if let Some(status) = tunnels.status(name).await {
            if status.phase == want {
                return;
            }
        }
        if tokio::time::Instant::now() >= deadline {
            panic!(
                "等待隧道 {name} 到 {want} 超时（当前 {:?}）",
                tunnels.status(name).await
            );
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

// ── 测试 ──────────────────────────────────────────────────────────────────

/// direct-tcpip：本地隧道端口 ⇄ 假 sshd ⇄ 本地 echo 服务，字节往返一致；
/// known_hosts 按 TOFU 自动记录。
#[tokio::test]
async fn tunnel_forwards_tcp_through_ssh() {
    let sshd_port = start_fake_sshd(None).await;
    // 目标服务：echo。
    let echo = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let echo_port = echo.local_addr().unwrap().port();
    tokio::spawn(async move {
        loop {
            let Ok((mut socket, _)) = echo.accept().await else {
                break;
            };
            tokio::spawn(async move {
                let mut buf = [0u8; 1024];
                loop {
                    match socket.read(&mut buf).await {
                        Ok(0) | Err(_) => break,
                        Ok(n) => {
                            if socket.write_all(&buf[..n]).await.is_err() {
                                break;
                            }
                        }
                    }
                }
            });
        }
    });

    let dir = temp_dir("fwd");
    let key = write_test_key(&dir);
    let tunnels = SshTunnels::new(dir.join("cache"));
    let mut cfg = base_cfg(&dir, sshd_port, &key);
    cfg.remote_port = echo_port;
    let local_port = tunnels.ensure("a", &cfg).await.unwrap();
    wait_phase(&tunnels, "a", "online", Duration::from_secs(20)).await;

    let mut conn = tokio::net::TcpStream::connect(("127.0.0.1", local_port))
        .await
        .unwrap();
    conn.write_all(b"ping-through-tunnel").await.unwrap();
    let mut buf = vec![0u8; 64];
    let n = tokio::time::timeout(Duration::from_secs(5), conn.read(&mut buf))
        .await
        .unwrap()
        .unwrap();
    assert_eq!(&buf[..n], b"ping-through-tunnel");

    // TOFU：known_hosts 已写入（非 22 端口 → [host]:port 形式）。
    let known = std::fs::read_to_string(dir.join("known_hosts")).unwrap();
    assert!(
        known.contains(&format!("[127.0.0.1]:{sshd_port}")),
        "known_hosts 内容: {known}"
    );

    std::fs::remove_dir_all(&dir).ok();
}

/// 远程 exec 与媒体拉取：exec 走本机 `sh -c`；媒体文件从远端目录
/// `cat` 回本地缓存；缺失文件明确报错；重复拉取命中缓存。
#[tokio::test]
async fn exec_and_fetch_media_over_tunnel() {
    let sshd_port = start_fake_sshd(None).await;
    let dir = temp_dir("media");
    let remote_media = dir.join("remote-media");
    std::fs::create_dir_all(&remote_media).unwrap();
    std::fs::write(remote_media.join("abc.png"), b"PNGDATA-REMOTE").unwrap();
    let key = write_test_key(&dir);
    let tunnels = SshTunnels::new(dir.join("cache"));
    let mut cfg = base_cfg(&dir, sshd_port, &key);
    cfg.remote_media_dir = remote_media.to_string_lossy().into_owned();
    tunnels.ensure("a", &cfg).await.unwrap();
    wait_phase(&tunnels, "a", "online", Duration::from_secs(20)).await;

    // exec：stdout 与退出码。
    let output = tunnels
        .exec("a", "printf hello-remote", Duration::from_secs(10))
        .await
        .unwrap();
    assert_eq!(output.code, 0);
    assert_eq!(String::from_utf8_lossy(&output.stdout), "hello-remote");

    // exec：非零退出码原样上报。
    let output = tunnels
        .exec("a", "exit 3", Duration::from_secs(10))
        .await
        .unwrap();
    assert_eq!(output.code, 3);

    // 媒体拉取 → 本地缓存。
    let fetched = tunnels.fetch_media("a", "abc.png").await.unwrap();
    assert_eq!(std::fs::read(&fetched).unwrap(), b"PNGDATA-REMOTE");
    assert!(fetched.starts_with(dir.join("cache")));
    // 缓存命中（同一路径，不再走远端——实现上第二次是本地快路径）。
    let again = tunnels.fetch_media("a", "abc.png").await.unwrap();
    assert_eq!(again, fetched);
    // 远端缺失文件：明确报错，不产生缓存。
    assert!(tunnels.fetch_media("a", "missing.png").await.is_err());
    // 非法 id 直接拒绝（防目录穿越）。
    assert!(tunnels.fetch_media("a", "../etc/passwd").await.is_err());

    std::fs::remove_dir_all(&dir).ok();
}

/// 认证被拒：隧道进入 offline 且错误原因可见（不无限 connecting）。
#[tokio::test]
async fn auth_rejection_surfaces_in_status() {
    let sshd_port = start_fake_sshd(Some("deny".into())).await;
    let dir = temp_dir("auth");
    let key = write_test_key(&dir);
    let tunnels = SshTunnels::new(dir.join("cache"));
    let mut cfg = base_cfg(&dir, sshd_port, &key);
    cfg.user = "deny".into();
    tunnels.ensure("a", &cfg).await.unwrap();

    let deadline = tokio::time::Instant::now() + Duration::from_secs(20);
    loop {
        let status = tunnels.status("a").await.unwrap();
        if status.phase == "offline" {
            let error = status.error.unwrap_or_default();
            assert!(
                error.contains("认证失败"),
                "错误应为认证失败，实际: {error}"
            );
            break;
        }
        assert!(
            tokio::time::Instant::now() < deadline,
            "认证失败未在超时内上报（当前 {:?}）",
            tunnels.status("a").await
        );
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    // 未连接的隧道上 exec 报明确错误（而非挂起）。
    let exec = tunnels.exec("a", "true", Duration::from_secs(5)).await;
    assert!(exec.is_err());

    std::fs::remove_dir_all(&dir).ok();
}

/// ensure 幂等（同配置同端口）、配置变化重建（新端口）、remove 摘除。
#[tokio::test]
async fn ensure_is_idempotent_and_rebuilds_on_change() {
    let dir = temp_dir("ensure");
    let tunnels = SshTunnels::new(dir.join("cache"));
    // 指向一个没有 sshd 的端口：建连会失败重试，但端口分配与状态机照常。
    let cfg = SshConfig {
        host: "127.0.0.1".into(),
        port: 1,
        user: "u".into(),
        known_hosts_file: dir.join("known_hosts").to_string_lossy().into_owned(),
        ..SshConfig::default()
    };
    let first = tunnels.ensure("a", &cfg).await.unwrap();
    let second = tunnels.ensure("a", &cfg).await.unwrap();
    assert_eq!(first, second, "同配置 ensure 应复用隧道");

    let mut changed = cfg.clone();
    changed.host = "localhost".into();
    let third = tunnels.ensure("a", &changed).await.unwrap();
    assert_ne!(first, third, "配置变化应重建隧道（新端口）");

    tunnels.remove("a").await;
    assert!(tunnels.local_port("a").await.is_none());
    assert!(tunnels.status("a").await.is_none());

    // 无效配置明确报错。
    assert!(tunnels
        .ensure(
            "bad",
            &SshConfig {
                host: String::new(),
                ..SshConfig::default()
            }
        )
        .await
        .is_err());

    std::fs::remove_dir_all(&dir).ok();
}
