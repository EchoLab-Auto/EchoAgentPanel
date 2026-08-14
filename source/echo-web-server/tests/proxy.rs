//! End-to-end relay test: a fake Core WS server ↔ the panel's `/ws` endpoint
//! ↔ a browser client. Verifies frames pass through verbatim in both
//! directions (commands + events, including secret-carrying sudo frames).

use axum::routing::get;
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::Message as WsMessage;

use echo_web_server::proxy::{ws_handler, AppState};

/// A fake Core management server: echoes every text frame back verbatim.
async fn fake_core(listener: TcpListener) {
    loop {
        let Ok((stream, _)) = listener.accept().await else {
            break;
        };
        tokio::spawn(async move {
            let Ok(ws) = tokio_tungstenite::accept_async(stream).await else {
                return;
            };
            let (mut tx, mut rx) = ws.split();
            while let Some(Ok(message)) = rx.next().await {
                let forwarded = match message {
                    WsMessage::Text(text) => tx.send(WsMessage::Text(text)).await,
                    WsMessage::Close(_) => break,
                    _ => Ok(()),
                };
                if forwarded.is_err() {
                    break;
                }
            }
        });
    }
}

async fn spawn_panel(core_url: String) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(AppState {
            core_url: core_url.into(),
            static_dir: "/nonexistent".into(),
        });
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    format!("ws://127.0.0.1:{}/ws", address.port())
}

#[tokio::test]
async fn relay_forwards_frames_both_ways() {
    let core_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let core_url = format!(
        "ws://127.0.0.1:{}",
        core_listener.local_addr().unwrap().port()
    );
    tokio::spawn(fake_core(core_listener));

    let panel_ws = spawn_panel(core_url).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();

    // Command frame (browser → core → echo back).
    let command = r#"{"type":"command","payload":{"SendMessage":{"session_id":"local:tui::local_user","content":"hi"}}}"#;
    ws.send(WsMessage::Text(command.into())).await.unwrap();
    let echoed = ws.next().await.unwrap().unwrap();
    assert_eq!(echoed.to_string(), command);

    // Event frame (core → browser), same verbatim round trip.
    let event = r#"{"type":"event","payload":{"AgentOutput":{"session_id":"x","content":"ok","branch_id":null}}}"#;
    ws.send(WsMessage::Text(event.into())).await.unwrap();
    let echoed = ws.next().await.unwrap().unwrap();
    assert_eq!(echoed.to_string(), event);

    // Sudo password frame — must pass through untouched (the relay never
    // parses or logs payloads).
    let sudo = r#"{"type":"sudo_password","payload":{"request_id":7,"password":"s3cret"}}"#;
    ws.send(WsMessage::Text(sudo.into())).await.unwrap();
    let echoed = ws.next().await.unwrap().unwrap();
    assert_eq!(echoed.to_string(), sudo);

    ws.close(None).await.unwrap();
}
