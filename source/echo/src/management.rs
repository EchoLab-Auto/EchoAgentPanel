//! Management WebSocket server for Panel (TUI) connections.
//!
//! Listens on a configurable address, accepts WS connections from Panel
//! instances, and bridges commands/events between the Panel and the Agent.

use std::sync::Arc;

use anyhow::Context;
use echo_agent::BackendBridge;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tracing::{info, warn};

/// Start the management WS server.
pub async fn serve(
    addr: &str,
    bridge: Arc<BackendBridge>,
    agent: Arc<echo_agent::Agent>,
) -> anyhow::Result<()> {
    let listener = TcpListener::bind(addr)
        .await
        .with_context(|| format!("bind management address {addr}"))?;
    info!("Panel management WS server listening on {addr}");

    loop {
        let (stream, peer) = match listener.accept().await {
            Ok(conn) => conn,
            Err(e) => {
                warn!(error = %e, "accept failed");
                continue;
            }
        };
        info!(%peer, "Panel connected");

        let bridge = bridge.clone();
        let agent = agent.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, bridge, agent).await {
                warn!(error = %e, "Panel connection error");
            }
        });
    }
}

async fn handle_connection(
    stream: tokio::net::TcpStream,
    bridge: Arc<BackendBridge>,
    _agent: Arc<echo_agent::Agent>,
) -> anyhow::Result<()> {
    let ws = tokio_tungstenite::accept_async(stream).await?;
    let (write, mut read) = ws.split();

    // Forward events from Agent → Panel.
    let write_lock = Arc::new(Mutex::new(write));
    let wl = write_lock.clone();
    let b = bridge.clone();
    tokio::spawn(async move {
        loop {
            {
                let mut rx = b.event_rx.lock().await;
                while let Ok(ev) = rx.try_recv() {
                    let text = echo_agent::bridge::serialize_event(&ev);
                    let _ = wl.lock().await
                        .send(tokio_tungstenite::tungstenite::Message::Text(text))
                        .await;
                }
            }
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
    });

    // Forward commands from Panel → Agent.
    while let Some(Ok(msg)) = read.next().await {
        match msg {
            tokio_tungstenite::tungstenite::Message::Text(text) => {
                if let Some(ws_msg) = echo_agent::bridge::deserialize_message(&text) {
                    if let echo_agent::bridge::WsMessage::Command(cmd) = ws_msg {
                        let _ = bridge.send_command(cmd);
                    }
                }
            }
            tokio_tungstenite::tungstenite::Message::Close(_) => break,
            _ => {}
        }
    }
    Ok(())
}
