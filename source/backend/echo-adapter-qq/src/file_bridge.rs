//! File bridge — makes a local file readable by NapCat (which usually runs in
//! a separate Docker container).
//!
//! The OneBot `upload_group_file` / `upload_private_file` actions require a
//! path that is visible to the OneBot implementation (i.e. inside the NapCat
//! container). The agent itself runs on the host, so a plain local path like
//! `/home/user/x/hello.py` is meaningless inside the container.
//!
//! This bridge resolves a local path into a `file` parameter NapCat can use,
//! trying strategies in order:
//!
//! 1. **Container path pass-through** — if the path already starts with the
//!    NapCat data directory (e.g. `/app/napcat/data/...`) it is used as-is.
//! 2. **Docker copy** — if the Docker CLI is available, copy the file into the
//!    NapCat container (`docker cp`) and return the in-container path.
//! 3. **Local HTTP fallback** — start a tiny local HTTP file server bound on
//!    `0.0.0.0` with a random per-file token, and return
//!    `http://<napcat_host>:<port>/f/<token>`. NapCat downloads the file from
//!    the host itself (the docker-compose setup maps `host.docker.internal`
//!    to the host gateway), so no Docker permission is required.
//!
//! Strategy 3 is the workhorse: it needs no Docker socket and no shared
//! volume, and works for any deployment where NapCat can reach the host.

use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::sync::OnceLock;
use std::time::{Duration, Instant};

use dashmap::DashMap;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

/// How long a registered file stays downloadable before being garbage
/// collected. Uploads complete in seconds; this is a safety net.
const FILE_TTL: Duration = Duration::from_secs(600);
/// Cleanup runs on every accepted connection, so no separate task is needed.
const MAX_REGISTERED_FILES: usize = 512;

/// Resolves local file paths into `file` parameters usable by NapCat.
pub struct FileBridge {
    /// OneBot HTTP API base (used only for a docker-capability probe; the
    /// actual upload goes through the WebSocket action as before).
    _onebot_url: String,
    /// Host name NapCat should use to reach this machine (e.g.
    /// `host.docker.internal` when NapCat runs in Docker).
    napcat_host: String,
    /// Docker container name for `docker cp` (e.g. `napcat`).
    container_name: String,
    /// In-container writable directory (e.g. `/app/napcat/data`).
    container_data_dir: String,
    /// Cached result of the Docker CLI availability probe.
    docker_ok: OnceLock<bool>,
    /// Lazily-started local HTTP file server (strategy 3).
    http_server: OnceLock<Arc<HttpFileServer>>,
}

/// Tiny HTTP/1.1 file server backed by a token → path map.
struct HttpFileServer {
    /// Bound address; the port is what NapCat connects to.
    addr: SocketAddr,
    /// token → (absolute local path, registration time).
    files: DashMap<String, (PathBuf, Instant)>,
}

impl FileBridge {
    pub fn new(
        onebot_url: &str,
        napcat_host: &str,
        container_name: &str,
        container_data_dir: &str,
    ) -> Self {
        Self {
            _onebot_url: onebot_url.to_string(),
            napcat_host: napcat_host.to_string(),
            container_name: container_name.to_string(),
            container_data_dir: container_data_dir.to_string(),
            docker_ok: OnceLock::new(),
            http_server: OnceLock::new(),
        }
    }

    /// Resolve a local path into a `file` parameter NapCat can read.
    ///
    /// `file_name` is the display name used when copying into the container.
    pub async fn resolve(&self, local_path: &str, file_name: &str) -> Result<String, String> {
        // Strategy 1: already a NapCat-visible path → pass through.
        let path = Path::new(local_path);
        let is_container_path = local_path.starts_with(&self.container_data_dir)
            || local_path.starts_with("/app/napcat/")
            || local_path.starts_with("/napcat/");
        if is_container_path {
            return Ok(local_path.to_string());
        }

        // Strategy 2: docker cp into the NapCat container.
        if let Some(remote) = self.try_docker_cp(path, file_name).await {
            tracing::info!(%local_path, %remote, "file copied into NapCat container");
            return Ok(remote);
        }

        // Strategy 3: local HTTP file server, NapCat pulls the URL itself.
        let url = self.http_url(path).await?;
        tracing::info!(%local_path, %url, "file served to NapCat over local HTTP");
        Ok(url)
    }

    // ---- strategy 2: docker cp ----

    async fn try_docker_cp(&self, local: &Path, file_name: &str) -> Option<String> {
        if !self.docker_available() {
            return None;
        }
        let name = sanitize_file_name(file_name).unwrap_or_else(|| {
            local
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_else(|| "file".into())
        });
        let dest = format!("{}/{}", self.container_data_dir.trim_end_matches('/'), name);
        let target = format!("{}:{dest}", self.container_name);
        let output = Command::new("docker")
            .args(["cp", local.to_str().unwrap_or_default(), &target])
            .output()
            .ok()?;
        if output.status.success() {
            Some(dest)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            tracing::debug!(%stderr, "docker cp failed — falling back to HTTP");
            None
        }
    }

    /// Probe whether the Docker CLI is usable. The result is cached because
    /// probing requires a subprocess round-trip.
    fn docker_available(&self) -> bool {
        *self.docker_ok.get_or_init(|| {
            Command::new("docker")
                .args(["info"])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        })
    }

    // ---- strategy 3: local HTTP server ----

    async fn http_url(&self, local: &Path) -> Result<String, String> {
        let local = local.canonicalize().map_err(|e| {
            format!("cannot resolve file '{}': {e}", local.display())
        })?;
        if !local.is_file() {
            return Err(format!("'{}' is not a regular file", local.display()));
        }
        let server = self.ensure_http_server().await?;
        let token = uuid::Uuid::new_v4().simple().to_string();
        server.files.insert(token.clone(), (local, Instant::now()));
        let host = if self.napcat_host.is_empty()
            || self.napcat_host == "127.0.0.1"
            || self.napcat_host == "localhost"
        {
            "127.0.0.1"
        } else {
            self.napcat_host.as_str()
        };
        Ok(format!("http://{host}:{}/f/{token}", server.addr.port()))
    }

    async fn ensure_http_server(&self) -> Result<Arc<HttpFileServer>, String> {
        if let Some(server) = self.http_server.get() {
            return Ok(server.clone());
        }
        // Bind on all interfaces: NapCat reaches us via the docker bridge
        // gateway (host.docker.internal), which does not hit loopback.
        let listener = TcpListener::bind("0.0.0.0:0")
            .await
            .map_err(|e| format!("cannot bind file server: {e}"))?;
        let addr = listener
            .local_addr()
            .map_err(|e| format!("cannot read file server address: {e}"))?;
        let server = Arc::new(HttpFileServer {
            addr,
            files: DashMap::new(),
        });
        let serve_files = server.clone();
        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((socket, _)) => {
                        let files = serve_files.files.clone();
                        tokio::spawn(async move {
                            let _ = handle_client(socket, files).await;
                        });
                    }
                    Err(e) => {
                        tracing::warn!(error = %e, "file server accept failed");
                        tokio::time::sleep(Duration::from_millis(200)).await;
                    }
                }
            }
        });
        let _ = self.http_server.set(server.clone());
        tracing::info!(port = addr.port(), "local file server listening for NapCat");
        Ok(server)
    }
}

// ---- HTTP handling ----

async fn handle_client(
    mut socket: TcpStream,
    files: DashMap<String, (PathBuf, Instant)>,
) -> std::io::Result<()> {
    cleanup_expired(&files);

    let mut buf = [0u8; 4096];
    let n = socket.read(&mut buf).await?;
    let head = String::from_utf8_lossy(&buf[..n]);
    let request_line = head.lines().next().unwrap_or("");
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("/");

    if method != "GET" {
        return write_response(&mut socket, 405, b"method not allowed").await;
    }
    let token = match path.strip_prefix("/f/") {
        Some(t) => t.trim(),
        None => return write_response(&mut socket, 404, b"not found").await,
    };

    let file_path = match files.get(token) {
        Some(entry) => entry.value().0.clone(),
        None => return write_response(&mut socket, 404, b"not found").await,
    };
    // Registrations are garbage-collected by TTL (see cleanup_expired), so a
    // download can be retried if NapCat needs to re-fetch the file.
    match tokio::fs::read(&file_path).await {
        Ok(data) => write_response(&mut socket, 200, &data).await,
        Err(e) => {
            tracing::warn!(error = %e, path = %file_path.display(), "file server read failed");
            write_response(&mut socket, 404, b"not found").await
        }
    }
}

async fn write_response(
    socket: &mut TcpStream,
    status: u16,
    body: &[u8],
) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        404 => "Not Found",
        405 => "Method Not Allowed",
        _ => "Error",
    };
    let header = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/octet-stream\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    socket.write_all(header.as_bytes()).await?;
    socket.write_all(body).await?;
    socket.flush().await
}

fn cleanup_expired(files: &DashMap<String, (PathBuf, Instant)>) {
    if files.len() <= MAX_REGISTERED_FILES {
        // Only bother scanning when we are near the cap.
        return;
    }
    let now = Instant::now();
    files.retain(|_, (_, registered)| now.duration_since(*registered) < FILE_TTL);
}

/// Reduce an arbitrary display name to a safe file name for the container.
fn sanitize_file_name(file_name: &str) -> Option<String> {
    let base = Path::new(file_name).file_name()?.to_string_lossy().into_owned();
    if base.is_empty() || base == "." || base == ".." {
        None
    } else {
        Some(base)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn container_paths_pass_through_unchanged() {
        let bridge = FileBridge::new(
            "http://localhost:3000",
            "host.docker.internal",
            "napcat",
            "/app/napcat/data",
        );
        let remote = bridge
            .resolve("/app/napcat/data/x.pdf", "x.pdf")
            .await
            .unwrap();
        assert_eq!(remote, "/app/napcat/data/x.pdf");
    }

    #[test]
    fn sanitizes_display_names() {
        assert_eq!(sanitize_file_name("a.pdf").as_deref(), Some("a.pdf"));
        assert_eq!(sanitize_file_name("../evil.sh").as_deref(), Some("evil.sh"));
        assert_eq!(sanitize_file_name(".."), None);
        assert_eq!(sanitize_file_name("/"), None);
    }

    #[tokio::test]
    async fn http_fallback_serves_the_file_and_cleans_up() {
        // Docker is unavailable in CI, so strategy 3 kicks in.
        let dir = std::env::temp_dir();
        let path = dir.join(format!("echo-file-bridge-test-{}.txt", std::process::id()));
        std::fs::write(&path, b"hello from bridge").unwrap();

        let bridge = FileBridge::new(
            "http://localhost:3000",
            "127.0.0.1",
            "napcat",
            "/app/napcat/data",
        );
        let url = bridge
            .resolve(path.to_str().unwrap(), "note.txt")
            .await
            .unwrap();
        assert!(url.starts_with("http://127.0.0.1:"), "{url}");

        let port = url
            .split(':')
            .nth(2)
            .and_then(|p| p.split('/').next())
            .and_then(|p| p.parse::<u16>().ok())
            .expect("port in url");
        assert!(port > 0, "port must be a real ephemeral port, got {port}");

        let resp = reqwest::get(&url).await.expect("fetch works");
        assert_eq!(resp.status(), 200);
        let resp = reqwest::get(&url).await.expect("fetch works");
        assert_eq!(resp.status(), 200);
        let body = resp.text().await.unwrap();
        assert_eq!(body, "hello from bridge");

        // The token stays valid within its TTL, so re-fetching works.
        let again = reqwest::get(&url).await.unwrap();
        assert_eq!(again.status(), 200);

        // Unknown tokens are rejected: the URL is protected by its random token.
        let unknown = format!("http://127.0.0.1:{}/f/does-not-exist", port);
        let miss = reqwest::get(unknown).await.unwrap();
        assert_eq!(miss.status(), 404);
    }
    #[test]
    fn file_bridge_rejects_missing_files() {
        let bridge = FileBridge::new(
            "http://localhost:3000",
            "127.0.0.1",
            "napcat",
            "/app/napcat/data",
        );
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(bridge.resolve("/nonexistent/definitely-missing.bin", "m.bin"));
        assert!(result.is_err());
    }
}
