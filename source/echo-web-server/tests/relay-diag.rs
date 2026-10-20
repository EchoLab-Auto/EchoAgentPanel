//! 中继丢帧诊断的端到端验证（2026-10）。
//!
//! 目标：确认加在 relay 读泵里的**序号连续性校验只观察、不改变转发行为**。
//! 上游丢帧时中继照旧把收到的每一帧都转给浏览器（浏览器按游标补拉），
//! 不能因为诊断而吞帧——那会把"可见的丢帧"变成"更隐蔽的丢帧"。
//!
//! 覆盖三条：seq 跳号、seq 回退（Core 重启归 1）、无 seq（旧版 Core）。

use axum::routing::get;
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::Message as WsMessage;

use echo_web_server::proxy::{ws_handler, AppState};

/// 假 Core：连上后主动推送给定帧（不 echo），然后挂住。
async fn push_core(listener: TcpListener, frames: Vec<String>) {
    let Ok((stream, _)) = listener.accept().await else {
        return;
    };
    let Ok(ws) = tokio_tungstenite::accept_async(stream).await else {
        return;
    };
    let (mut tx, mut rx) = ws.split();
    for frame in frames {
        if tx.send(WsMessage::Text(frame)).await.is_err() {
            return;
        }
    }
    // 保持连接：继续回 Pong，直到对端关。
    while let Some(Ok(message)) = rx.next().await {
        if let WsMessage::Ping(payload) = message {
            let _ = tx.send(WsMessage::Pong(payload)).await;
        }
    }
}

async fn spawn_panel(core_url: String) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(AppState::new(
            echo_web_server::upstreams::UpstreamRegistry::new(
                vec![echo_web_server::upstreams::UpstreamConfig::direct(
                    "core", core_url, "",
                )],
                None,
            ),
            "/nonexistent".into(),
            "/nonexistent-media".into(),
            "".into(),
            echo_web_server::ssh::SshTunnels::new(
                std::env::temp_dir().join("echo-panel-test-tunnels"),
            ),
        ));
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    format!("ws://127.0.0.1:{}/ws", address.port())
}

fn event_frame(session: &str, seq: Option<u64>) -> String {
    let mut v = serde_json::json!({
        "type": "event",
        "payload": { "AgentThinking": { "session_id": session, "team_id": null } },
    });
    if let Some(seq) = seq {
        v.as_object_mut()
            .unwrap()
            .insert("seq".into(), serde_json::Value::from(seq));
    }
    v.to_string()
}

/// 收下一条业务帧（跳过 Ping/Pong 心跳）。
async fn next_event<S>(ws: &mut S) -> Option<String>
where
    S: StreamExt<Item = Result<WsMessage, tokio_tungstenite::tungstenite::Error>> + Unpin,
{
    while let Some(Ok(message)) = ws.next().await {
        match message {
            WsMessage::Text(text) => return Some(text),
            WsMessage::Ping(_) | WsMessage::Pong(_) => continue,
            _ => return None,
        }
    }
    None
}

async fn collect_frames(frames: Vec<String>) -> Vec<Option<String>> {
    let core_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let core_url = format!(
        "ws://127.0.0.1:{}",
        core_listener.local_addr().unwrap().port()
    );
    let expected = frames.len();
    tokio::spawn(push_core(core_listener, frames));
    let panel_url = spawn_panel(core_url).await;
    let (mut browser, _) = tokio_tungstenite::connect_async(panel_url).await.unwrap();
    // 先发一条命令触发链路建立（relay 是懒连接的? —— 不是，但保持对称）。
    let mut got = Vec::new();
    for _ in 0..expected {
        match tokio::time::timeout(std::time::Duration::from_secs(5), next_event(&mut browser))
            .await
        {
            Ok(Some(text)) => got.push(Some(text)),
            _ => got.push(None),
        }
    }
    let _ = browser.close(None).await;
    got
}

#[tokio::test]
async fn relay_forwards_all_frames_despite_seq_gap() {
    // 上游故意跳号（缺 3、4）——中继必须照旧转发全部 3 帧，只写诊断日志。
    let frames = vec![
        event_frame("s1", Some(1)),
        event_frame("s1", Some(2)),
        event_frame("s1", Some(5)),
    ];
    let got = collect_frames(frames).await;
    let texts: Vec<String> = got.into_iter().flatten().collect();
    assert_eq!(texts.len(), 3, "跳号不影响转发：3 帧都应到达浏览器");
    // 单上游模式：原样透传（不加壳、seq 保留在顶层）。
    assert!(texts[0].contains("\"seq\":1"), "第一帧 seq 应原样保留");
    assert!(texts[2].contains("\"seq\":5"), "跳号后的帧也必须送达");
}

#[tokio::test]
async fn relay_forwards_frames_after_seq_reset() {
    // Core 重启场景：序号从 900 回落到 1——诊断只 debug，不丢帧。
    let frames = vec![
        event_frame("s1", Some(900)),
        event_frame("s1", Some(1)),
        event_frame("s1", Some(2)),
    ];
    let got = collect_frames(frames).await;
    let texts: Vec<String> = got.into_iter().flatten().collect();
    assert_eq!(texts.len(), 3, "回退不应丢帧");
    assert!(texts[1].contains("\"seq\":1"));
    assert!(texts[2].contains("\"seq\":2"));
}

/// 假 Core：第一段推送给定的帧后**主动断开**；第二段（重连）推送新的帧。
/// 用于验证中继重连后能算出"断开期间丢了 N 条"（`resume_gap`）。
async fn push_then_drop(listener: TcpListener, first: Vec<String>, second: Vec<String>) {
    // 第一段
    if let Ok((stream, _)) = listener.accept().await {
        if let Ok(ws) = tokio_tungstenite::accept_async(stream).await {
            let (mut tx, mut rx) = ws.split();
            for frame in first {
                if tx.send(WsMessage::Text(frame)).await.is_err() {
                    return;
                }
            }
            // 短暂保持，让中继把帧转出去，然后断开（drop 即断）。
            let _ = tokio::time::timeout(std::time::Duration::from_millis(150), async {
                while let Some(Ok(_)) = rx.next().await {}
            })
            .await;
        }
    }
    // 第二段（中继重连）
    if let Ok((stream, _)) = listener.accept().await {
        if let Ok(ws) = tokio_tungstenite::accept_async(stream).await {
            let (mut tx, mut rx) = ws.split();
            for frame in second {
                if tx.send(WsMessage::Text(frame)).await.is_err() {
                    return;
                }
            }
            while let Some(Ok(message)) = rx.next().await {
                if let WsMessage::Ping(payload) = message {
                    let _ = tx.send(WsMessage::Pong(payload)).await;
                }
            }
        }
    }
}

/// 断链重连：中继把"断开期间丢失的条数"算准，且不丢任何真正收到的帧。
///
/// 这里断链期间的缺口靠序号体现：第一段收到 1、2，第二段首帧是 10 →
/// 期间 Core 发了 3..=9 共 7 条而中继没接收方（日志里 `missed=7`）。
/// 中继本身只转发它**真的收到**的帧——缺席的那 7 条由浏览器按游标补拉。
#[tokio::test]
async fn relay_reports_gap_across_reconnect() {
    let core_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let core_url = format!(
        "ws://127.0.0.1:{}",
        core_listener.local_addr().unwrap().port()
    );
    tokio::spawn(push_then_drop(
        core_listener,
        vec![event_frame("s1", Some(1)), event_frame("s1", Some(2))],
        vec![event_frame("s1", Some(10)), event_frame("s1", Some(11))],
    ));
    let panel_url = spawn_panel(core_url).await;
    let (mut browser, _) = tokio_tungstenite::connect_async(panel_url).await.unwrap();
    let mut texts = Vec::new();
    // 收集 4 帧（两段各 2 帧）；中继重连后应继续转发。
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(8);
    while texts.len() < 4 && tokio::time::Instant::now() < deadline {
        match tokio::time::timeout(
            std::time::Duration::from_millis(500),
            next_event(&mut browser),
        )
        .await
        {
            Ok(Some(text)) => texts.push(text),
            Ok(None) => break,
            Err(_) => continue,
        }
    }
    let _ = browser.close(None).await;
    assert_eq!(texts.len(), 4, "两段连接的帧都应转发: {texts:?}");
    assert!(texts[0].contains("\"seq\":1"));
    assert!(texts[1].contains("\"seq\":2"));
    assert!(texts[2].contains("\"seq\":10"), "重连后继续转发");
    assert!(texts[3].contains("\"seq\":11"));
}

#[tokio::test]
async fn relay_forwards_frames_without_seq() {
    // 旧版 Core（无 seq）：校验跳过，转发照旧。
    let frames = vec![event_frame("s1", None), event_frame("s1", None)];
    let got = collect_frames(frames).await;
    let texts: Vec<String> = got.into_iter().flatten().collect();
    assert_eq!(texts.len(), 2, "无序号帧必须照常转发");
    assert!(!texts[0].contains("\"seq\""));
}
