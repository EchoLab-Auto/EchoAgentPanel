//! Error types for the connection layer.

#[derive(Debug, thiserror::Error)]
pub enum EchoServerError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("WebSocket error: {0}")]
    WebSocket(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("invalid handshake: {0}")]
    Handshake(&'static str),
    #[error("authentication failed")]
    AuthFailed,
    #[error("connection closed")]
    ConnectionClosed,
    #[error("no heartbeat from peer within the timeout")]
    HeartbeatTimeout,
    #[error("API response timed out")]
    ApiTimeout,
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}
