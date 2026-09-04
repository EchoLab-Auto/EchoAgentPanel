//! End-to-end relay test: a fake Core WS server ↔ the panel's `/ws` endpoint
//! ↔ a browser client. Verifies frames pass through verbatim in both
//! directions (commands + events, including secret-carrying sudo frames).

use axum::routing::get;
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::Message as WsMessage;

use echo_web_server::config::QqSection;
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
                    // 显式回 Pong 并立即 flush（tungstenite 的隐式应答不保证及时
                    // flush——真实 Core 因定期写心跳不会积压，假 Core 必须显式发）。
                    WsMessage::Ping(payload) => tx.send(WsMessage::Pong(payload)).await,
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
            qq: QqSection::default(),
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

/// 读取下一个文本帧（跳过中继心跳的 Ping/Pong 控制帧）。
async fn next_text<S>(ws: &mut S) -> String
where
    S: StreamExt<Item = Result<WsMessage, tokio_tungstenite::tungstenite::Error>> + Unpin,
{
    loop {
        match ws.next().await {
            Some(Ok(WsMessage::Text(text))) => return text.to_string(),
            Some(Ok(_)) => continue,
            other => panic!("link closed unexpectedly: {other:?}"),
        }
    }
}

/// 缩短中继心跳/收割周期（真实时间跑，毫秒级完成）。两个测试值相同，
/// 进程内并行设置无冲突。
fn fast_relay_env() {
    std::env::set_var("ECHO_RELAY_HEARTBEAT_MS", "100");
    std::env::set_var("ECHO_RELAY_REAP_AFTER_MS", "350");
}

/// 半死收割：浏览器侧超过收割阈值无任何帧（客户端不读不写，自动 Pong
/// 不 flush）→ 中继主动断开链路。
#[tokio::test]
async fn relay_reaps_half_dead_browser_side() {
    fast_relay_env();
    let core_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let core_url = format!(
        "ws://127.0.0.1:{}",
        core_listener.local_addr().unwrap().port()
    );
    tokio::spawn(fake_core(core_listener));
    let panel_ws = spawn_panel(core_url).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();

    let command = r#"{"type":"command","payload":"RequestTeamsList"}"#;
    // 打通链路（此帧刷新浏览器侧活跃时间）。
    ws.send(WsMessage::Text(command.into())).await.unwrap();
    let _ = next_text(&mut ws).await;

    // 客户端完全沉默（不读不写）。等待越过收割阈值后，链路应已被中继断开。
    tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
    // 读掉收割前缓冲的心跳 Ping，直到看到关闭。
    let deadline = tokio::time::sleep(std::time::Duration::from_millis(1000));
    tokio::pin!(deadline);
    loop {
        tokio::select! {
            _ = &mut deadline => panic!("link not reaped in time"),
            msg = ws.next() => match msg {
                Some(Ok(WsMessage::Close(_))) | None | Some(Err(_)) => break,
                Some(Ok(_)) => continue, // 缓冲的心跳 Ping/Pong
            },
        }
    }
}

/// 反向守护：有流量的连接在多个心跳周期后不被误收割。
#[tokio::test]
async fn relay_keeps_active_browser_side() {
    fast_relay_env();
    let core_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let core_url = format!(
        "ws://127.0.0.1:{}",
        core_listener.local_addr().unwrap().port()
    );
    tokio::spawn(fake_core(core_listener));
    let panel_ws = spawn_panel(core_url).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();

    let command = r#"{"type":"command","payload":"RequestTeamsList"}"#;
    // 每 100ms 一帧（小于 350ms 收割阈值），累计越过 12 个心跳周期。
    for _ in 0..12 {
        ws.send(WsMessage::Text(command.into())).await.unwrap();
        assert_eq!(next_text(&mut ws).await, command);
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    // 1.2s 后链路仍可用。
    ws.send(WsMessage::Text(command.into())).await.unwrap();
    assert_eq!(next_text(&mut ws).await, command);
    ws.close(None).await.unwrap();
}
