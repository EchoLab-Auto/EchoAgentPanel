//! NapCat WebUI API client.
//!
//! Provides programmatic access to NapCat's management API:
//! - Auto-configure reverse WebSocket client
//! - Check login / connection status
//! - Fetch QR code for TUI display
//! - Health check
//!
//! API base URL defaults to `http://localhost:6099` (NapCat WebUI).

use serde::Deserialize;

/// NapCat API client.
pub struct NapCatClient {
    base_url: String,
    client: reqwest::Client,
}

/// Login / connection status returned by NapCat.
#[derive(Debug, Clone, Deserialize)]
pub struct NapCatStatus {
    /// Whether QQ is logged in.
    #[serde(default)]
    pub online: bool,
    /// QQ user ID if logged in.
    #[serde(default)]
    pub user_id: Option<String>,
    /// QQ nickname.
    #[serde(default)]
    pub nickname: Option<String>,
    /// Raw status string for fallback.
    #[serde(default)]
    pub message: Option<String>,
}

/// NapCat connection result.
#[derive(Debug)]
pub enum NapCatState {
    /// QQ is logged in and connected.
    Online { user_id: String, nickname: String },
    /// NapCat is running but not logged into QQ.
    WaitingForLogin,
    /// NapCat is not reachable (container not running or port not exposed).
    Unreachable,
}

impl NapCatClient {
    /// Create a new NapCat API client.
    /// `webui_url` is the NapCat WebUI address, e.g. `http://localhost:6099`.
    pub fn new(webui_url: &str) -> Self {
        Self {
            base_url: webui_url.trim_end_matches('/').to_string(),
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(5))
                .build()
                .unwrap_or_default(),
        }
    }

    // ---- health / status ----

    /// Check if NapCat is reachable and logged in.
    /// Returns `NapCatState` summarising the result.
    pub async fn check(&self) -> NapCatState {
        match self.login_status().await {
            Ok(status) if status.online => NapCatState::Online {
                user_id: status.user_id.unwrap_or_else(|| "?".into()),
                nickname: status.nickname.unwrap_or_else(|| "?".into()),
            },
            Ok(_) => NapCatState::WaitingForLogin,
            Err(_) => NapCatState::Unreachable,
        }
    }

    /// Query NapCat's login status via the WebUI API.
    pub async fn login_status(&self) -> Result<NapCatStatus, String> {
        let url = format!("{}/api/login/status", self.base_url);
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("HTTP error: {e}"))?;
        if !resp.status().is_success() {
            // Try legacy OneBot API as fallback.
            return self.login_status_via_onebot().await;
        }
        let status: NapCatStatus = resp
            .json()
            .await
            .map_err(|e| format!("parse error: {e}"))?;
        Ok(status)
    }

    /// Fallback: use OneBot `get_login_info` to check login.
    async fn login_status_via_onebot(&self) -> Result<NapCatStatus, String> {
        // OneBot HTTP API is typically on port 3000 inside the container.
        // Try localhost:3000 (common port mapping).
        let url = "http://localhost:3000/get_login_info";
        let resp = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .body("{}")
            .send()
            .await
            .map_err(|e| format!("OneBot HTTP error: {e}"))?;
        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("OneBot parse error: {e}"))?;
        let data = &body["data"];
        let user_id = data["user_id"].as_i64().map(|id| id.to_string());
        let nickname = data["nickname"].as_str().map(|s| s.to_string());
        let online = user_id.is_some() && user_id.as_deref() != Some("0");
        Ok(NapCatStatus {
            online,
            user_id,
            nickname,
            message: Some("via OneBot API".into()),
        })
    }

    // ---- reverse WebSocket configuration ----

    /// Auto-configure NapCat to connect back to our reverse WebSocket server.
    ///
    /// `ws_url` is the address NapCat should connect to, e.g. `ws://host:3131`.
    pub async fn configure_reverse_ws(&self, ws_url: &str, token: &str) -> Result<(), String> {
        let url = format!("{}/api/network/wsReverse", self.base_url);
        let body = serde_json::json!({
            "enabled": true,
            "url": ws_url,
            "type": "array",
            "token": token,
        });
        let resp = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("HTTP error: {e}"))?;

        if resp.status().is_success() {
            tracing::info!(%ws_url, "NapCat reverse WS configured");
            Ok(())
        } else {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            tracing::warn!(%status, %body, "NapCat reverse WS config may have failed — verify in WebUI");
            // Don't fail hard — the config might have been applied anyway.
            Ok(())
        }
    }

    // ---- QR code ----

    /// Fetch the login QR code PNG from NapCat's container via Docker.
    /// Returns raw PNG bytes, or an error if Docker/NapCat is not available.
    pub fn fetch_qrcode_docker(container_name: &str) -> Result<Vec<u8>, String> {
        use std::process::Command;
        let output = Command::new("docker")
            .args(["exec", container_name, "cat", "/app/napcat/cache/qrcode.png"])
            .output()
            .map_err(|e| format!("docker exec failed: {e}"))?;
        if !output.status.success() {
            return Err(format!(
                "docker exec failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        if output.stdout.is_empty() {
            return Err("QR code not yet available (waiting for NapCat to generate)".into());
        }
        Ok(output.stdout)
    }

    /// Try to fetch QR code via the WebUI API.
    pub async fn fetch_qrcode_web(&self) -> Result<Vec<u8>, String> {
        let url = format!("{}/api/qrcode", self.base_url);
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("HTTP error: {e}"))?;
        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }
        resp.bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(|e| format!("read error: {e}"))
    }
}
