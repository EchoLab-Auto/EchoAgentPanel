//! SSH 接入（2026-10）：Core 部署在"只有 SSH 端口"的云服务器上时，
//! Panel 以 [russh] 直连 SSH，并复用同一条连接做两件事：
//!
//! 1. **本地端口转发**（direct-tcpip）：`127.0.0.1:<本地端口>` →
//!    `127.0.0.1:<远端 management 端口>`。中继链路把本地端口当普通上游
//!    拨号——协议、Bearer 认证、重连逻辑全部零改动。
//! 2. **远程 exec**：`journalctl` 读远端 Core 日志（日志页）、`cat` 拉取
//!    媒体文件（[`SshTunnels::fetch_media`]，本地缓存后由 `/media/<id>`
//!    同源提供）。
//!
//! 生命周期：每个上下游一条隧道（[`SshTunnels::ensure`] 幂等创建/更新）；
//! 连接断开自动指数退避重连（1s→30s）；本地监听端口在隧道生命周期内**稳定**
//! （重连不换端口——中继的重连循环直接命中）。
//!
//! 主机密钥：默认走 `~/.ssh/known_hosts` 校验；首次连接按 TOFU 写入
//! （`accept_new_host_key`，默认 true），此后密钥变更一律拒绝（防 MITM）。
//!
//! 认证：私钥文件（`identity_file`）→ ssh-agent → `~/.ssh/id_ed25519`、
//! `~/.ssh/id_rsa` → 密码（`password`，最后兜底）。认证失败换下一个方式，
//! 全部失败时汇总原因上报（UI 可见）。

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;
use tokio::sync::{Mutex, RwLock};
use tracing::{info, warn};

/// 单条远程命令输出上限（防"cat 打错路径读到天量数据"打爆内存）。
const MAX_EXEC_BYTES: usize = 32 * 1024 * 1024;
/// 媒体拉取超时（大图 + 跨网络余量）。
const MEDIA_EXEC_TIMEOUT: Duration = Duration::from_secs(60);
/// 日志拉取超时。
const LOG_EXEC_TIMEOUT: Duration = Duration::from_secs(20);

// ── 配置 ───────────────────────────────────────────────────────────────────

/// `[[cores]]` 内的 `[cores.ssh]` 段：一个上游的 SSH 接入参数。
///
/// 出现该段即"接入方式 = SSH"——`url` 字段被忽略（隧道提供本地地址）。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct SshConfig {
    /// SSH 主机（域名或 IP）。
    pub host: String,
    /// SSH 端口（默认 22）。
    pub port: u16,
    /// SSH 用户（须为运行 Core 的用户——读日志/媒体依赖其权限）。
    pub user: String,
    /// 私钥文件路径（支持 `~`；空 = 走 ssh-agent / 默认密钥）。
    pub identity_file: String,
    /// 私钥口令（可选；私钥加密时用）。
    pub passphrase: String,
    /// 密码（**不推荐**；仅密钥/agent 均不可用时的兜底）。
    pub password: String,
    /// 远端 Core management 端口（默认 3132）。
    pub remote_port: u16,
    /// 远端媒体库目录（默认 `~/.local/share/echo-agent-core/media`，
    /// 与 Core 的 `$ECHO_MEDIA_DIR` 缺省一致）。
    pub remote_media_dir: String,
    /// 首次连接自动接受主机密钥并写入 known_hosts（TOFU；默认 true）。
    /// 置 false 时未记录的密钥一律拒绝。
    pub accept_new_host_key: bool,
    /// known_hosts 文件（空 = `~/.ssh/known_hosts`）。
    pub known_hosts_file: String,
}

impl Default for SshConfig {
    fn default() -> Self {
        Self {
            host: String::new(),
            port: 22,
            user: String::new(),
            identity_file: String::new(),
            passphrase: String::new(),
            password: String::new(),
            remote_port: 3132,
            remote_media_dir: String::new(),
            accept_new_host_key: true,
            known_hosts_file: String::new(),
        }
    }
}

impl SshConfig {
    /// 必要字段校验（upsert/启动物化共用）。
    pub fn validate(&self) -> Result<(), String> {
        if self.host.trim().is_empty() {
            return Err("SSH 主机不能为空".into());
        }
        if self.user.trim().is_empty() {
            return Err("SSH 用户不能为空".into());
        }
        if self.port == 0 {
            return Err("SSH 端口非法（1-65535）".into());
        }
        if self.remote_port == 0 {
            return Err("远端 management 端口非法（1-65535）".into());
        }
        Ok(())
    }
}

/// 隧道运行快照（管理 API / 健康合并用）。
#[derive(Debug, Clone, Default, Serialize)]
pub struct TunnelStatus {
    /// `connecting`（建连/认证中或断线重连中）/ `online` / `offline`。
    pub phase: String,
    /// 最近一次错误（建连/认证失败原因；成功时 None）。
    pub error: Option<String>,
    /// 本地转发端口（隧道创建后恒定）。
    pub local_port: Option<u16>,
}

/// 远程命令执行结果。
#[derive(Debug, Clone)]
pub struct ExecOutput {
    pub code: u32,
    pub stdout: Vec<u8>,
    #[allow(dead_code)] // 诊断用：错误路径才读；保留完整结构。
    pub stderr: Vec<u8>,
}

// ── 隧道表 ────────────────────────────────────────────────────────────────

/// 隧道管理器（AppState 持有；按上游名索引）。
pub struct SshTunnels {
    inner: Mutex<HashMap<String, Arc<Tunnel>>>,
    /// 媒体缓存根目录（`<cache>/<上游名>/<id>`）。
    cache_dir: PathBuf,
}

impl SshTunnels {
    pub fn new(cache_dir: PathBuf) -> Arc<Self> {
        Arc::new(Self {
            inner: Mutex::new(HashMap::new()),
            cache_dir,
        })
    }

    /// 确保 `name` 的隧道存在且配置为最新（幂等；配置变化 = 重建）。
    /// 返回本地转发端口——**端口即刻可用**（SSH 建连异步进行，
    /// 未连上时接受的连接会被直接关闭，中继自然重试）。
    pub async fn ensure(&self, name: &str, cfg: &SshConfig) -> Result<u16, String> {
        cfg.validate()?;
        let mut inner = self.inner.lock().await;
        if let Some(existing) = inner.get(name) {
            if existing.cfg == *cfg {
                return Ok(existing.local_port);
            }
            existing.shutdown();
            inner.remove(name);
        }
        // 分配本地端口（绑定 127.0.0.1:0，保留 listener——端口稳定）。
        let listener = TcpListener::bind(("127.0.0.1", 0))
            .await
            .map_err(|e| format!("分配本地转发端口失败: {e}"))?;
        let local_port = listener
            .local_addr()
            .map_err(|e| format!("读取本地端口失败: {e}"))?
            .port();
        let tunnel = Arc::new(Tunnel {
            name: name.to_string(),
            cfg: cfg.clone(),
            local_port,
            session: RwLock::new(None),
            home: RwLock::new(None),
            status: StdMutex::new(TunnelStatus {
                phase: "connecting".into(),
                error: None,
                local_port: Some(local_port),
            }),
            cache_dir: self.cache_dir.clone(),
            aborts: StdMutex::new(Vec::new()),
        });
        let runner = tokio::spawn(run_connection(tunnel.clone()));
        let acceptor = tokio::spawn(accept_loop(listener, tunnel.clone()));
        *tunnel.aborts.lock().unwrap() = vec![runner.abort_handle(), acceptor.abort_handle()];
        inner.insert(name.to_string(), tunnel.clone());
        info!(
            upstream = %name,
            ssh = %format!("{}@{}:{}", cfg.user, cfg.host, cfg.port),
            local_port,
            "ssh tunnel starting"
        );
        Ok(local_port)
    }

    /// 摘除隧道（上游删除/改为直连时）。
    pub async fn remove(&self, name: &str) {
        let removed = self.inner.lock().await.remove(name);
        if let Some(tunnel) = removed {
            tunnel.shutdown();
            info!(upstream = %name, "ssh tunnel removed");
        }
    }

    /// 本地转发端口（None = 该上游未配置 SSH 隧道）。
    pub async fn local_port(&self, name: &str) -> Option<u16> {
        self.inner.lock().await.get(name).map(|t| t.local_port)
    }

    /// 隧道状态快照。
    pub async fn status(&self, name: &str) -> Option<TunnelStatus> {
        let tunnel = self.inner.lock().await.get(name).cloned()?;
        let snapshot = tunnel.status.lock().unwrap().clone();
        Some(snapshot)
    }

    /// 通过隧道执行远程命令（日志/媒体等）。
    pub async fn exec(
        &self,
        name: &str,
        command: &str,
        timeout: Duration,
    ) -> Result<ExecOutput, String> {
        let tunnel = self
            .inner
            .lock()
            .await
            .get(name)
            .cloned()
            .ok_or_else(|| format!("上游 {name} 未配置 SSH 接入"))?;
        tunnel.exec(command, timeout).await
    }

    /// 远端 Core 日志（journalctl，`echo-agent-core-fixed` → `echo-agent-core`
    /// 逐单元尝试，均无输出时返回明确文案）。
    pub async fn remote_core_logs(&self, name: &str, lines: u32) -> Result<String, String> {
        let output = self
            .exec(name, &build_journal_command(lines), LOG_EXEC_TIMEOUT)
            .await?;
        if output.code == 0 {
            let text = String::from_utf8_lossy(&output.stdout).into_owned();
            if text.trim().is_empty() {
                return Ok("（远端 Core 暂无日志）".to_string());
            }
            return Ok(text);
        }
        Err(format!("（未找到远端 Core 日志；exit {}）", output.code))
    }

    /// 经 SSH 拉取远端媒体文件（本地缓存；命中缓存直接返回路径）。
    ///
    /// 内容哈希命名 = 同名必同内容，缓存天然幂等；`id` 按媒体库规则
    /// 校验（字符集 + 非 `..`），远端路径再做单引号转义。
    pub async fn fetch_media(&self, name: &str, id: &str) -> Result<PathBuf, String> {
        if !crate::media::valid_media_id(id) {
            return Err("非法媒体 id".into());
        }
        let tunnel = self
            .inner
            .lock()
            .await
            .get(name)
            .cloned()
            .ok_or_else(|| format!("上游 {name} 未配置 SSH 接入"))?;
        let dir = tunnel.cache_dir.join(&tunnel.name);
        let path = dir.join(id);
        if tokio::fs::try_exists(&path).await.unwrap_or(false) {
            return Ok(path);
        }
        let home = tunnel.home.read().await.clone();
        let command = build_cat_command(&tunnel.cfg, home.as_deref(), id);
        let output = tunnel.exec(&command, MEDIA_EXEC_TIMEOUT).await?;
        if output.code != 0 || output.stdout.is_empty() {
            return Err(format!("远端读取失败（exit {}）", output.code));
        }
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| format!("创建媒体缓存目录失败: {e}"))?;
        // tmp + rename：并发读方永远看到完整文件。
        let tmp = dir.join(format!(".{id}.{}.tmp", std::process::id()));
        tokio::fs::write(&tmp, &output.stdout)
            .await
            .map_err(|e| format!("写媒体缓存失败: {e}"))?;
        tokio::fs::rename(&tmp, &path)
            .await
            .map_err(|e| format!("落盘媒体缓存失败: {e}"))?;
        Ok(path)
    }
}

// ── 单条隧道 ──────────────────────────────────────────────────────────────

type SshHandle = russh::client::Handle<ClientHandler>;

struct Tunnel {
    name: String,
    cfg: SshConfig,
    /// 本地监听端口（隧道生命周期内稳定）。
    local_port: u16,
    /// 当前 SSH 会话（None = 未连接/断开重连中）。
    session: RwLock<Option<Arc<SshHandle>>>,
    /// 远端 $HOME（建连后探测；媒体路径用）。
    home: RwLock<Option<String>>,
    status: StdMutex<TunnelStatus>,
    cache_dir: PathBuf,
    aborts: StdMutex<Vec<tokio::task::AbortHandle>>,
}

impl Tunnel {
    fn shutdown(&self) {
        let handles: Vec<_> = self.aborts.lock().unwrap().drain(..).collect();
        for handle in handles {
            handle.abort();
        }
    }

    fn set_status(&self, phase: &str, error: Option<String>) {
        let mut status = self.status.lock().unwrap();
        status.phase = phase.to_string();
        status.error = error;
    }

    fn offline_reason(&self) -> String {
        let status = self.status.lock().unwrap();
        match &status.error {
            Some(error) => format!("SSH 隧道未连接（{error}）"),
            None => "SSH 隧道未连接".to_string(),
        }
    }

    /// 执行远程命令（经当前会话；无会话即报明确错误）。
    async fn exec(&self, command: &str, timeout: Duration) -> Result<ExecOutput, String> {
        let session = {
            let guard = self.session.read().await;
            guard.clone()
        };
        let Some(session) = session else {
            return Err(self.offline_reason());
        };
        let run = async move {
            let mut channel = session
                .channel_open_session()
                .await
                .map_err(|e| format!("打开 SSH 通道失败: {e}"))?;
            channel
                .exec(true, command)
                .await
                .map_err(|e| format!("执行远程命令失败: {e}"))?;
            let mut stdout = Vec::new();
            let mut stderr = Vec::new();
            let mut code: Option<u32> = None;
            while let Some(message) = channel.wait().await {
                match message {
                    russh::ChannelMsg::Data { data } => {
                        if stdout.len() + data.len() > MAX_EXEC_BYTES {
                            return Err("远程输出超过上限".to_string());
                        }
                        stdout.extend_from_slice(&data);
                    }
                    russh::ChannelMsg::ExtendedData { data, .. } => {
                        if stderr.len() + data.len() <= MAX_EXEC_BYTES {
                            stderr.extend_from_slice(&data);
                        }
                    }
                    russh::ChannelMsg::ExitStatus { exit_status } => {
                        code = Some(exit_status);
                    }
                    _ => {}
                }
            }
            Ok(ExecOutput {
                code: code.unwrap_or(255),
                stdout,
                stderr,
            })
        };
        tokio::time::timeout(timeout, run)
            .await
            .map_err(|_| "远程命令超时".to_string())?
    }
}

/// 建连/认证维护循环（常驻；隧道被移除时随任务 abort 退出）。
async fn run_connection(tunnel: Arc<Tunnel>) {
    let mut backoff = Duration::from_secs(1);
    loop {
        tunnel.set_status("connecting", None);
        match connect_and_auth(&tunnel).await {
            Ok(session) => {
                *tunnel.session.write().await = Some(Arc::new(session));
                // 远端 $HOME 探测（媒体默认路径用；失败不致命——cat 命令
                // 退回远端 shell 内联展开 "$HOME"）。
                let home = tunnel
                    .exec("printf '%s' \"$HOME\"", Duration::from_secs(10))
                    .await
                    .ok()
                    .filter(|output| output.code == 0 && !output.stdout.is_empty())
                    .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
                    .filter(|home| !home.is_empty());
                *tunnel.home.write().await = home;
                tunnel.set_status("online", None);
                info!(upstream = %tunnel.name, "ssh tunnel online");
                backoff = Duration::from_secs(1);
                // 看门狗：轮询会话存活（russh keepalive 负责探死；此处
                // 捕获服务端断开/网络闪断导致的会话关闭）。
                loop {
                    tokio::time::sleep(Duration::from_secs(3)).await;
                    let closed = {
                        let guard = tunnel.session.read().await;
                        match guard.as_ref() {
                            Some(session) => session.is_closed(),
                            None => true,
                        }
                    };
                    if closed {
                        break;
                    }
                }
                *tunnel.session.write().await = None;
                tunnel.set_status("offline", Some("SSH 连接已断开，正在重连".into()));
                info!(upstream = %tunnel.name, "ssh tunnel disconnected, reconnecting");
            }
            Err(message) => {
                warn!(upstream = %tunnel.name, %message, "ssh connect failed");
                tunnel.set_status("offline", Some(message));
                tokio::time::sleep(backoff).await;
                backoff = (backoff * 2).min(Duration::from_secs(30));
            }
        }
    }
}

/// 本地接受循环：每条本地连接开一个 direct-tcpip 通道转发到远端。
async fn accept_loop(listener: TcpListener, tunnel: Arc<Tunnel>) {
    loop {
        let (mut tcp, _) = match listener.accept().await {
            Ok(pair) => pair,
            Err(error) => {
                warn!(upstream = %tunnel.name, %error, "ssh tunnel accept error");
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }
        };
        let tunnel = tunnel.clone();
        tokio::spawn(async move {
            let session = {
                let guard = tunnel.session.read().await;
                guard.clone()
            };
            let Some(session) = session else {
                // 隧道未连上：直接断开（中继按自己的退避重试）。
                return;
            };
            let (origin_host, origin_port) = tcp
                .peer_addr()
                .map(|addr| (addr.ip().to_string(), addr.port() as u32))
                .unwrap_or_else(|_| ("127.0.0.1".to_string(), 0));
            let channel = match session
                .channel_open_direct_tcpip(
                    "127.0.0.1",
                    tunnel.cfg.remote_port as u32,
                    origin_host,
                    origin_port,
                )
                .await
            {
                Ok(channel) => channel,
                Err(error) => {
                    warn!(upstream = %tunnel.name, %error, "ssh direct-tcpip failed");
                    return;
                }
            };
            let mut ssh_stream = channel.into_stream();
            let _ = tokio::io::copy_bidirectional(&mut tcp, &mut ssh_stream).await;
        });
    }
}

// ── 连接与认证 ────────────────────────────────────────────────────────────

/// 客户端事件处理器：主机密钥校验（known_hosts + TOFU）。
struct ClientHandler {
    host: String,
    port: u16,
    known_hosts: PathBuf,
    accept_new: bool,
    /// 校验失败的具体原因（check_server_key 只能回 bool——原因存这里，
    /// 建连失败后读出上报）。
    note: Arc<StdMutex<Option<String>>>,
}

impl russh::client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &russh::keys::PublicKeyOrCertificate,
    ) -> Result<bool, Self::Error> {
        // PublicKeyOrCertificate::public_key() 返回 owned（证书场景内部
        // 取 cert 公钥重组）。
        let pubkey = server_public_key.public_key();
        match russh::keys::check_known_hosts_path(&self.host, self.port, &pubkey, &self.known_hosts)
        {
            Ok(true) => Ok(true),
            Ok(false) if self.accept_new => {
                match russh::keys::known_hosts::learn_known_hosts_path(
                    &self.host,
                    self.port,
                    &pubkey,
                    &self.known_hosts,
                ) {
                    Ok(()) => {
                        info!(
                            host = %self.host,
                            port = self.port,
                            path = %self.known_hosts.display(),
                            "learned new ssh host key (TOFU)"
                        );
                        Ok(true)
                    }
                    Err(error) => {
                        *self.note.lock().unwrap() =
                            Some(format!("写入 known_hosts 失败: {error}"));
                        Ok(false)
                    }
                }
            }
            Ok(false) => {
                *self.note.lock().unwrap() = Some(format!(
                    "主机密钥未记录在 known_hosts（{}:{}）且未允许自动接受",
                    self.host, self.port
                ));
                Ok(false)
            }
            Err(error) => {
                *self.note.lock().unwrap() =
                    Some(format!("主机密钥校验失败（密钥变更？）: {error}"));
                Ok(false)
            }
        }
    }
}

async fn connect_and_auth(tunnel: &Arc<Tunnel>) -> Result<SshHandle, String> {
    let cfg = &tunnel.cfg;
    let note = Arc::new(StdMutex::new(None));
    let handler = ClientHandler {
        host: cfg.host.clone(),
        port: cfg.port,
        known_hosts: known_hosts_path(cfg),
        accept_new: cfg.accept_new_host_key,
        note: note.clone(),
    };
    let config = russh::client::Config {
        keepalive_interval: Some(Duration::from_secs(15)),
        keepalive_max: 3,
        nodelay: true,
        ..Default::default()
    };
    let mut session =
        russh::client::connect(Arc::new(config), (cfg.host.as_str(), cfg.port), handler)
            .await
            .map_err(|error| map_connect_error(&error, &note))?;

    let user = cfg.user.clone();
    // 无初值：所有非返回路径在末尾读取前必然赋值（clippy unused_assignments）。
    let mut last_error: Option<String>;

    // 1) 显式私钥文件。
    if !cfg.identity_file.is_empty() {
        let path = expand_home(&cfg.identity_file);
        match russh::keys::load_secret_key(
            &path,
            (!cfg.passphrase.is_empty()).then_some(cfg.passphrase.as_str()),
        ) {
            Ok(key) => match authenticate_with_key(&mut session, &user, key).await {
                Ok(true) => return Ok(session),
                Ok(false) => last_error = Some(format!("公钥认证被拒绝（{}）", path.display())),
                Err(error) => last_error = Some(error),
            },
            Err(error) => last_error = Some(format!("读取私钥 {} 失败: {error}", path.display())),
        }
    } else {
        // 2) ssh-agent。
        match authenticate_with_agent(&mut session, &user).await {
            Ok(true) => return Ok(session),
            Ok(false) => last_error = Some("ssh-agent 身份均被拒绝".into()),
            Err(error) => last_error = Some(error),
        }
        // 3) 默认密钥路径。
        for path in default_key_paths() {
            if !path.exists() {
                continue;
            }
            let Ok(key) = russh::keys::load_secret_key(&path, None) else {
                continue;
            };
            match authenticate_with_key(&mut session, &user, key).await {
                Ok(true) => return Ok(session),
                Ok(false) => last_error = Some(format!("公钥认证被拒绝（{}）", path.display())),
                Err(error) => last_error = Some(error),
            }
        }
    }

    // 4) 密码兜底。
    if !cfg.password.is_empty() {
        let result = session
            .authenticate_password(&user, cfg.password.clone())
            .await
            .map_err(|error| format!("密码认证失败: {error}"))?;
        if result.success() {
            return Ok(session);
        }
        last_error = Some("密码认证被拒绝".into());
    }

    Err(match last_error {
        Some(reason) => format!("认证失败：{reason}"),
        None => format!(
            "认证失败：没有可用凭据（请配置私钥路径、启动 ssh-agent 或设置密码）——当前用户 {user}"
        ),
    })
}

/// 私钥认证（RSA 时按服务端能力协商 SHA-1/2 签名哈希）。
async fn authenticate_with_key(
    session: &mut SshHandle,
    user: &str,
    key: russh::keys::PrivateKey,
) -> Result<bool, String> {
    let hash = session
        .best_supported_rsa_hash()
        .await
        .map_err(|e| format!("RSA 哈希协商失败: {e}"))?
        .flatten();
    let result = session
        .authenticate_publickey(
            user,
            russh::keys::PrivateKeyWithHashAlg::new(Arc::new(key), hash),
        )
        .await
        .map_err(|e| format!("公钥认证失败: {e}"))?;
    Ok(result.success())
}

/// ssh-agent 认证：逐个身份尝试（RSA 身份按服务端能力给哈希）。
async fn authenticate_with_agent(session: &mut SshHandle, user: &str) -> Result<bool, String> {
    use russh::keys::agent::client::AgentClient;
    use russh::keys::agent::AgentIdentity;

    let mut agent = AgentClient::connect_env()
        .await
        .map_err(|e| format!("ssh-agent 不可用: {e}"))?;
    let identities = agent
        .request_identities()
        .await
        .map_err(|e| format!("读取 ssh-agent 身份失败: {e}"))?;
    if identities.is_empty() {
        return Err("ssh-agent 无可用身份".into());
    }
    for identity in identities {
        let AgentIdentity::PublicKey { key, .. } = identity else {
            continue;
        };
        let hash = if matches!(key.algorithm(), russh::keys::Algorithm::Rsa { .. }) {
            session
                .best_supported_rsa_hash()
                .await
                .ok()
                .flatten()
                .flatten()
        } else {
            None
        };
        match session
            .authenticate_publickey_with(user, key, hash, &mut agent)
            .await
        {
            Ok(result) if result.success() => return Ok(true),
            Ok(_) => {}
            Err(error) => {
                // 单个身份的签名错误不致命：继续尝试下一个。
                warn!(%error, "ssh-agent identity signing failed, trying next");
            }
        }
    }
    Ok(false)
}

fn map_connect_error(error: &russh::Error, note: &Arc<StdMutex<Option<String>>>) -> String {
    if let Some(note) = note.lock().unwrap().clone() {
        return note;
    }
    match error {
        russh::Error::IO(io) => format!("无法连接 SSH 服务: {io}"),
        russh::Error::UnknownKey => "服务器主机密钥被拒绝".into(),
        other => format!("SSH 连接失败: {other}"),
    }
}

// ── 路径与命令构造（纯函数，便于测试）─────────────────────────────────────

/// `~` 展开（home 由调用方给——本地为 env HOME，远端为探测值）。
pub fn expand_tilde(path: &str, home: Option<&str>) -> PathBuf {
    let path = path.trim();
    if path == "~" {
        return home
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("~"));
    }
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = home {
            return PathBuf::from(home).join(rest);
        }
    }
    PathBuf::from(path)
}

fn local_home() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .filter(|home| !home.is_empty())
        .map(PathBuf::from)
}

/// 本机路径的 `~` 展开。
fn expand_home(path: &str) -> PathBuf {
    expand_tilde(path, local_home().as_deref().and_then(Path::to_str))
}

fn default_key_paths() -> Vec<PathBuf> {
    let Some(home) = local_home() else {
        return Vec::new();
    };
    vec![home.join(".ssh/id_ed25519"), home.join(".ssh/id_rsa")]
}

fn known_hosts_path(cfg: &SshConfig) -> PathBuf {
    let configured = cfg.known_hosts_file.trim();
    if !configured.is_empty() {
        return expand_home(configured);
    }
    match local_home() {
        Some(home) => home.join(".ssh/known_hosts"),
        None => PathBuf::from(".ssh/known_hosts"),
    }
}

/// 单引号 shell 转义（`'` → `'\''`）——远程路径注入防护。
pub fn sh_single_quote(value: &str) -> String {
    let mut out = String::with_capacity(value.len() + 2);
    out.push('\'');
    for ch in value.chars() {
        if ch == '\'' {
            out.push_str("'\\''");
        } else {
            out.push(ch);
        }
    }
    out.push('\'');
    out
}

/// `cat` 取媒体文件的远程命令。
///
/// - 默认目录：$HOME 已知则拼绝对路径；未知则让远端 shell 内联展开
///   `"$HOME/..."`（`id` 字符集已校验为 `[A-Za-z0-9._-]`，无注入面）。
/// - 自定义目录：`~` 用已知 home 展开后整体单引号转义。
pub fn build_cat_command(cfg: &SshConfig, home: Option<&str>, id: &str) -> String {
    let dir = cfg.remote_media_dir.trim();
    if dir.is_empty() {
        match home {
            Some(home) => {
                let path = PathBuf::from(home)
                    .join(".local/share/echo-agent-core/media")
                    .join(id);
                format!("cat -- {}", sh_single_quote(&path.to_string_lossy()))
            }
            None => format!("cat -- \"$HOME/.local/share/echo-agent-core/media/{id}\""),
        }
    } else {
        let path = expand_tilde(dir, home).join(id);
        format!("cat -- {}", sh_single_quote(&path.to_string_lossy()))
    }
}

/// 远端 Core 日志命令：两代单元名（历史 `-fixed` 与现役）**合并**查询，
/// 取跨单元的时间最新 N 行（与本地 read_journal 同策略——逐单元取首个
/// 命中的话，已停用旧单元的残留日志会遮蔽现役单元）。
pub fn build_journal_command(lines: u32) -> String {
    format!(
        "journalctl --user -u echo-agent-core-fixed -u echo-agent-core -n {lines} --no-pager -q"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ssh_config_defaults() {
        let cfg: SshConfig = toml::from_str("host = \"1.2.3.4\"\nuser = \"root\"\n").unwrap();
        assert_eq!(cfg.port, 22);
        assert_eq!(cfg.remote_port, 3132);
        assert!(cfg.accept_new_host_key);
        assert!(cfg.validate().is_ok());

        assert!(SshConfig::default().validate().is_err());
        assert!(SshConfig {
            host: "h".into(),
            ..SshConfig::default()
        }
        .validate()
        .is_err()); // user 缺失
        assert!(SshConfig {
            host: "h".into(),
            user: "u".into(),
            ..SshConfig::default()
        }
        .validate()
        .is_ok());
    }

    #[test]
    fn tilde_expansion() {
        assert_eq!(
            expand_tilde("~/k", Some("/home/a")),
            PathBuf::from("/home/a/k")
        );
        assert_eq!(expand_tilde("~", Some("/home/a")), PathBuf::from("/home/a"));
        assert_eq!(expand_tilde("~", None), PathBuf::from("~"));
        assert_eq!(
            expand_tilde("/abs/k", Some("/home/a")),
            PathBuf::from("/abs/k")
        );
    }

    #[test]
    fn single_quote_escaping() {
        assert_eq!(sh_single_quote("abc"), "'abc'");
        assert_eq!(sh_single_quote("a'b"), "'a'\\''b'");
        assert_eq!(sh_single_quote("a b$c"), "'a b$c'");
    }

    #[test]
    fn cat_command_default_dir() {
        let mut cfg = SshConfig {
            host: "h".into(),
            user: "u".into(),
            ..SshConfig::default()
        };
        // home 已知 → 绝对路径 + 转义
        let cmd = build_cat_command(&cfg, Some("/home/echo"), "abc123.png");
        assert_eq!(
            cmd,
            "cat -- '/home/echo/.local/share/echo-agent-core/media/abc123.png'"
        );
        // home 未知 → 远端展开 $HOME
        let cmd = build_cat_command(&cfg, None, "abc123.png");
        assert_eq!(
            cmd,
            "cat -- \"$HOME/.local/share/echo-agent-core/media/abc123.png\""
        );
        // 自定义目录 + ~ + 特殊字符
        cfg.remote_media_dir = "~/my media".into();
        let cmd = build_cat_command(&cfg, Some("/home/echo"), "x.webp");
        assert_eq!(cmd, "cat -- '/home/echo/my media/x.webp'");
    }

    #[test]
    fn journal_command_shape() {
        let cmd = build_journal_command(120);
        // 单次合并查询（两代单元名同现）——不得退化为逐单元循环
        assert!(cmd.contains("journalctl --user"));
        assert!(cmd.contains("-u echo-agent-core-fixed"));
        assert!(cmd.contains("-u echo-agent-core "));
        assert!(cmd.contains("-n 120"));
        assert!(!cmd.contains("for u in"));
    }
}
