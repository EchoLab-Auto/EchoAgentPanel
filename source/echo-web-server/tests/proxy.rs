//! End-to-end relay test: a fake Core WS server ↔ the panel's `/ws` endpoint
//! ↔ a browser client. Verifies frames pass through verbatim in both
//! directions (commands + events, verbatim).

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

async fn spawn_panel_multi(upstreams: Vec<(&str, String)>) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(AppState::new(
            echo_web_server::upstreams::UpstreamRegistry::new(
                upstreams
                    .into_iter()
                    .map(|(name, url)| echo_web_server::upstreams::UpstreamConfig {
                        name: name.to_string(),
                        url,
                        access_token: String::new(),
                    })
                    .collect(),
                None,
            ),
            "/nonexistent".into(),
            "/nonexistent-media".into(),
            "".into(),
        ));
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    format!("ws://127.0.0.1:{}/ws", address.port())
}

async fn spawn_panel(core_url: String) -> String {
    spawn_panel_multi(vec![("core", core_url)]).await
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

/// 多上游：链路是异步建立的，中继必须在下线/上线时刷新"加壳开关"——
/// 否则事件永远不带 `{core, frame}` 外壳，前端把多个 core 的 TeamsList
/// 合并成一份、后者覆盖前者（表现为部分 agent 消失）。
#[tokio::test]
async fn multi_upstream_frames_are_core_wrapped() {
    let l1 = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let l2 = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url1 = format!("ws://127.0.0.1:{}", l1.local_addr().unwrap().port());
    let url2 = format!("ws://127.0.0.1:{}", l2.local_addr().unwrap().port());
    tokio::spawn(fake_core(l1));
    tokio::spawn(fake_core(l2));

    let panel_ws = spawn_panel_multi(vec![("core-a", url1), ("core-b", url2)]).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();

    // 反复广播直到收到来自两个 core 的外壳帧（链路异步建立）。
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(10);
    let mut seen = std::collections::BTreeSet::new();
    while seen.len() < 2 {
        assert!(
            tokio::time::Instant::now() < deadline,
            "both cores never wrapped: {seen:?}"
        );
        ws.send(WsMessage::Text(
            r#"{"broadcast":true,"frame":{"type":"command","payload":"RequestTeamsList"}}"#
                .to_string()
                .into(),
        ))
        .await
        .unwrap();
        let text = next_text(&mut ws).await;
        let value: serde_json::Value = serde_json::from_str(&text).unwrap();
        if let Some(core) = value.get("core").and_then(|c| c.as_str()) {
            assert!(
                value.get("frame").is_some(),
                "wrapped frame must carry .frame: {text}"
            );
            seen.insert(core.to_string());
        }
    }
    assert_eq!(
        seen.into_iter().collect::<Vec<_>>(),
        vec!["core-a", "core-b"]
    );
    ws.close(None).await.unwrap();
}
