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
                    .map(|(name, url)| {
                        echo_web_server::upstreams::UpstreamConfig::direct(name, url, "")
                    })
                    .collect(),
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
            r#"{"broadcast":true,"frame":{"type":"command","payload":"RequestTeamsList"}}"#.into(),
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

/// 稳定性契约：配置了 2 个上游但只有 1 条在线时，**仍然加壳**——否则同一批
/// TeamsList 会一半有 core 一半没有，前端无法把 agent 归属到运行区域
/// （表现为"尚未选择 agent / 无法确定运行区域"）。
#[tokio::test]
async fn multi_stays_wrapped_when_one_upstream_offline() {
    let live = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let live_url = format!("ws://127.0.0.1:{}", live.local_addr().unwrap().port());
    tokio::spawn(fake_core(live));
    // 一个连不上的上游（端口 1 不会监听）。
    let dead_url = "ws://127.0.0.1:1".to_string();

    let panel_ws = spawn_panel_multi(vec![("core-a", live_url), ("dead-core", dead_url)]).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();

    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(10);
    let broadcast = r#"{"broadcast":true,"frame":{"type":"command","payload":"RequestTeamsList"}}"#;
    loop {
        assert!(
            tokio::time::Instant::now() < deadline,
            "no wrapped frame arrived"
        );
        ws.send(WsMessage::Text(broadcast.into())).await.unwrap();
        let text =
            match tokio::time::timeout(std::time::Duration::from_millis(800), next_text(&mut ws))
                .await
            {
                Ok(t) => t,
                Err(_) => continue, // 链路尚未就绪：重试
            };
        let value: serde_json::Value = serde_json::from_str(&text).unwrap();
        let core = value.get("core").and_then(|c| c.as_str());
        assert_eq!(
            core,
            Some("core-a"),
            "frame must be wrapped even with one upstream offline: {text}"
        );
        assert!(
            value.get("frame").is_some(),
            "wrapped frame must carry .frame"
        );
        break;
    }
    ws.close(None).await.unwrap();
}

/// 握手期广播补投（2026-10 修复）：浏览器在**页面加载的握手期**就广播
/// 发现命令（`RequestState` / `RequestTeamsList`），而链路是异步建立的——
/// 若广播先于某条链路建成到达路由泵，旧实现把该次请求**静默丢弃**，
/// 远端上游（跨网络、建链慢）尤其容易踩中：表现为该 core 的智能体/会话
/// 在面板中缺失（联邦配置流程「一套 Panel 管全联邦」因此时好时坏）。
/// 本测试：第二上游链路晚于广播建成，断言它建成后收到补投（幂等重放）。
#[tokio::test]
async fn broadcast_before_late_link_is_replayed() {
    // core-a：即时在线（浏览器链路先有可路由对象）。
    let l1 = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url1 = format!("ws://127.0.0.1:{}", l1.local_addr().unwrap().port());
    tokio::spawn(fake_core(l1));

    // core-b：先占端口拿地址后释放（首连必失败），稍后同端口重启
    // ——模拟"建链慢/晚就绪"的上游。
    let l2 = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port2 = l2.local_addr().unwrap().port();
    drop(l2);
    let url2 = format!("ws://127.0.0.1:{port2}");

    let panel_ws = spawn_panel_multi(vec![("core-a", url1), ("core-b", url2)]).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();

    // 握手期立即广播（此刻 core-b 链路必然尚未建成）。
    ws.send(WsMessage::Text(
        r#"{"broadcast":true,"frame":{"type":"command","payload":"RequestTeamsList"}}"#.into(),
    ))
    .await
    .unwrap();

    // 保活帧：定向 core-a 的只读命令（假 Core 原样回显，不干扰断言）。
    // 同进程其他测试会把"浏览器静默收割阈值"调小（全局 env），等待期间
    // 必须持续发帧，否则本测试的浏览器链路会被提前收割。
    let keepalive = r#"{"core":"core-a","frame":{"type":"command","payload":"RequestState"}}"#;

    // 让首连失败发生，然后在 core-b 端口上启动假 Core（中继 ~1s 退避后重连）。
    let start_listener_at = tokio::time::Instant::now() + std::time::Duration::from_millis(400);
    while tokio::time::Instant::now() < start_listener_at {
        ws.send(WsMessage::Text(keepalive.into())).await.unwrap();
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    let l2b = TcpListener::bind(("127.0.0.1", port2)).await.unwrap();
    tokio::spawn(fake_core(l2b));

    // 补投断言窗口：持续保活 + 每轮读一帧，直到看见 core-b 的补投回显
    // （假 Core 原样回显 → 中继加壳 → `{core:"core-b", ...RequestTeamsList...}`）。
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(15);
    loop {
        assert!(
            tokio::time::Instant::now() < deadline,
            "broadcast was not replayed to the late link"
        );
        ws.send(WsMessage::Text(keepalive.into())).await.unwrap();
        let text =
            match tokio::time::timeout(std::time::Duration::from_millis(120), next_text(&mut ws))
                .await
            {
                Ok(t) => t,
                Err(_) => continue,
            };
        let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) else {
            continue;
        };
        if value.get("core").and_then(|c| c.as_str()) == Some("core-b")
            && text.contains("RequestTeamsList")
        {
            break; // 补投成功
        }
    }
    ws.close(None).await.unwrap();
}

/// 单上游握手期（无壳）命令的链路就绪等待：命令可能先于链路建成到达
/// （页面加载即打引导请求），旧实现直接静默丢弃。本测试：链路晚于
/// 命令建成（首连失败、1s 退避后重连），断言命令被有界等待后投递。
#[tokio::test]
async fn unwrapped_command_waits_for_link_and_is_delivered() {
    // 先占端口拿地址后释放（首连必失败），稍后同端口重启。
    let l = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = l.local_addr().unwrap().port();
    drop(l);
    let core_url = format!("ws://127.0.0.1:{port}");

    let panel_ws = spawn_panel(core_url).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();

    // 握手期立即发无壳命令（此刻链路必然尚未建成）。
    let command = r#"{"type":"command","payload":"RequestTeamsList"}"#;
    ws.send(WsMessage::Text(command.into())).await.unwrap();

    // 保活（同进程其他测试可能调小收割阈值）并稍后启动假 Core。
    let keepalive = r#"{"type":"command","payload":"RequestState"}"#;
    let start_listener_at = tokio::time::Instant::now() + std::time::Duration::from_millis(300);
    while tokio::time::Instant::now() < start_listener_at {
        ws.send(WsMessage::Text(keepalive.into())).await.unwrap();
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    let l2 = TcpListener::bind(("127.0.0.1", port)).await.unwrap();
    tokio::spawn(fake_core(l2));

    // 中继 ~1s 退避后重连成功，等待中的命令应被投递（假 Core 回显）。
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(10);
    loop {
        assert!(
            tokio::time::Instant::now() < deadline,
            "unwrapped command was not delivered after link became ready"
        );
        ws.send(WsMessage::Text(keepalive.into())).await.unwrap();
        let text =
            match tokio::time::timeout(std::time::Duration::from_millis(120), next_text(&mut ws))
                .await
            {
                Ok(t) => t,
                Err(_) => continue,
            };
        if text == command {
            break; // 命令原样回显（直达投递成功）
        }
    }
    ws.close(None).await.unwrap();
}

/// 定向命令的链路就绪等待：握手期（远端链路跨网络建链慢）定向命令可能先于
/// 链路建成到达，旧实现静默丢弃——表现为「生成邀请/刷新没反应」式抖动。
/// 本测试：core-b 的监听晚于命令 300ms 启动（首连必失败、退避重连），
/// 定向到 core-b 的命令应被有界等待后投递（假 Core 原样回显）。
#[tokio::test]
async fn targeted_command_waits_for_link_and_is_delivered() {
    // core-a 即时在线；core-b 先占端口拿地址后释放（首连必失败）。
    let l1 = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url1 = format!("ws://127.0.0.1:{}", l1.local_addr().unwrap().port());
    tokio::spawn(fake_core(l1));
    let lb = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port_b = lb.local_addr().unwrap().port();
    drop(lb);
    let url2 = format!("ws://127.0.0.1:{port_b}");

    let panel_ws = spawn_panel_multi(vec![("core-a", url1), ("core-b", url2)]).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();

    // 握手期立即定向发送到 core-b（此刻其链路必然尚未建成）。
    let command = r#"{"type":"command","payload":{"Probe":"late-link"}}"#;
    let targeted = format!(r#"{{"core":"core-b","frame":{command}}}"#);
    ws.send(WsMessage::Text(targeted)).await.unwrap();

    // 保活（同进程其他测试可能调小收割阈值）并稍后启动 core-b。
    let keepalive = r#"{"core":"core-a","frame":{"type":"command","payload":"RequestState"}}"#;
    let start_listener_at = tokio::time::Instant::now() + std::time::Duration::from_millis(300);
    while tokio::time::Instant::now() < start_listener_at {
        ws.send(WsMessage::Text(keepalive.into())).await.unwrap();
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    let l2b = TcpListener::bind(("127.0.0.1", port_b)).await.unwrap();
    tokio::spawn(fake_core(l2b));

    // core-b 链路建成后，等待中的定向命令应被补投（原样回显）。
    let expected: serde_json::Value = serde_json::from_str(command).unwrap();
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(15);
    loop {
        assert!(
            tokio::time::Instant::now() < deadline,
            "targeted command was not delivered after link became ready"
        );
        ws.send(WsMessage::Text(keepalive.into())).await.unwrap();
        let text =
            match tokio::time::timeout(std::time::Duration::from_millis(120), next_text(&mut ws))
                .await
            {
                Ok(t) => t,
                Err(_) => continue,
            };
        let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) else {
            continue;
        };
        if value.get("core").and_then(|c| c.as_str()) == Some("core-b")
            && value.get("frame") == Some(&expected)
        {
            break; // 定向命令已在链路就绪后投递
        }
    }
    ws.close(None).await.unwrap();
}

/// 面板实例 + **AppState 句柄**（测试内轮询健康表用；其余同
/// `spawn_panel_multi`）。
async fn spawn_panel_with_state(upstreams: Vec<(&str, String)>) -> (String, AppState) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let registry = echo_web_server::upstreams::UpstreamRegistry::new(
        upstreams
            .into_iter()
            .map(|(name, url)| echo_web_server::upstreams::UpstreamConfig::direct(name, url, ""))
            .collect(),
        None,
    );
    let state = AppState::new(
        registry,
        "/nonexistent".into(),
        "/nonexistent-media".into(),
        "".into(),
        echo_web_server::ssh::SshTunnels::new(std::env::temp_dir().join("echo-panel-test-tunnels")),
    );
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(state.clone());
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    (format!("ws://127.0.0.1:{}/ws", address.port()), state)
}

/// 面板实例 + **注册表句柄**（测试内运行时改上游配置用；其余同
/// `spawn_panel_multi`）。
async fn spawn_panel_with_registry(
    upstreams: Vec<(&str, String)>,
) -> (
    String,
    std::sync::Arc<echo_web_server::upstreams::UpstreamRegistry>,
) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let registry = echo_web_server::upstreams::UpstreamRegistry::new(
        upstreams
            .into_iter()
            .map(|(name, url)| echo_web_server::upstreams::UpstreamConfig::direct(name, url, ""))
            .collect(),
        None,
    );
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(AppState::new(
            registry.clone(),
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
    (format!("ws://127.0.0.1:{}/ws", address.port()), registry)
}

/// 配置变更中止旧重连循环（2026-10 修复）：上游处于**失败重试中**时把地址
/// 改掉，旧地址必须停止被尝试——此前失败重试中的循环无从中止（links 里
/// 只有已连上链路的 reader），改址后旧循环继续拨旧地址：面板持续显示旧
/// 地址的错误（"改了端口仍报 Connection refused"）、健康表在新旧错误间
/// 抖动；浏览器关闭后僵尸循环仍无限重试。
#[tokio::test]
async fn upsert_aborts_stale_retry_loop() {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc as StdArc;

    /// 「接受即断开」的假端口：计数每个连接尝试（上游永远连不成）。
    fn counting_listener() -> (u16, StdArc<AtomicUsize>) {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        listener.set_nonblocking(true).unwrap();
        let count = StdArc::new(AtomicUsize::new(0));
        let count2 = count.clone();
        tokio::spawn(async move {
            let listener = TcpListener::from_std(listener).unwrap();
            // 接受即断开 → 上游握手失败、进入重试。
            while let Ok((socket, _)) = listener.accept().await {
                count2.fetch_add(1, Ordering::SeqCst);
                drop(socket);
            }
        });
        (port, count)
    }

    let (stale_port, stale_count) = counting_listener();
    let (fresh_port, fresh_count) = counting_listener();

    let (panel_ws, registry) =
        spawn_panel_with_registry(vec![("a", format!("ws://127.0.0.1:{stale_port}"))]).await;
    let (mut ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();
    // 保活：浏览器静默会被（可能被同进程其他测试调小的）收割阈值断开，
    // 桥接死在半途则本测试失去意义。Ping 帧即可刷新浏览器侧活跃时间。
    let keepalive = tokio::spawn(async move {
        loop {
            if ws.send(WsMessage::Ping(Vec::new())).await.is_err() {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(120)).await;
        }
    });

    // 旧地址先被尝试至少一次。
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(8);
    while stale_count.load(Ordering::SeqCst) == 0 {
        assert!(tokio::time::Instant::now() < deadline, "旧地址从未被尝试");
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    // 改址（模拟面板「编辑上游」）。
    registry
        .upsert(echo_web_server::upstreams::UpstreamConfig::direct(
            "a",
            format!("ws://127.0.0.1:{fresh_port}"),
            "",
        ))
        .await
        .unwrap();

    // 新地址接管。
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(5);
    while fresh_count.load(Ordering::SeqCst) == 0 {
        assert!(tokio::time::Instant::now() < deadline, "新地址未被尝试");
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    // 旧地址此后不得再被尝试（窗口覆盖旧循环的下一次退避重试：1s 起步）。
    let stale_after = stale_count.load(Ordering::SeqCst);
    tokio::time::sleep(std::time::Duration::from_secs(4)).await;
    assert_eq!(
        stale_count.load(Ordering::SeqCst),
        stale_after,
        "改址后旧地址仍被重试（旧重连循环未被中止）"
    );

    keepalive.abort();
}

/// 握手期静默断开（没有任何 HTTP 响应）→ 健康表给出**可操作提示**
/// （令牌 / 映射两个嫌疑），而非裸的 "Handshake not finished"。
///
/// 背景（2026-10 云机端口映射实况）：对端在 WS 握手完成前 EOF 的情况与
/// 「Core 配置了 management_access_token 但面板令牌缺失/不符」症状完全
/// 一致（旧版 Core 的未授权拒绝路径不发送响应），也与「端口映射指向非
/// Core 服务」一致——错误文案必须把两种可能都点出来。
#[tokio::test]
async fn silent_handshake_close_reports_actionable_hint() {
    // 假「Core」：读到握手请求后直接关闭（0 字节响应）。
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    tokio::spawn(async move {
        while let Ok((mut stream, _)) = listener.accept().await {
            tokio::spawn(async move {
                use tokio::io::AsyncReadExt as _;
                let mut buf = [0u8; 1024];
                let _ = stream.read(&mut buf).await;
                drop(stream); // 静默断开（没有任何 HTTP 响应）
            });
        }
    });

    let (panel_ws, state) =
        spawn_panel_with_state(vec![("cloud", format!("ws://127.0.0.1:{port}"))]).await;
    let (ws, _) = tokio_tungstenite::connect_async(&panel_ws).await.unwrap();
    // 保活：同进程其他测试可能把收割阈值调小，浏览器静默会被断开。
    let keepalive = tokio::spawn(async move {
        let mut ws = ws;
        loop {
            if ws.send(WsMessage::Ping(Vec::new())).await.is_err() {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
    });

    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(8);
    loop {
        if let Some(health) = state.upstream_health().get("cloud") {
            if let Some(error) = &health.last_error {
                assert!(
                    error.contains("访问令牌"),
                    "handshake-incomplete 错误应含令牌排查提示: {error}"
                );
                assert!(
                    error.contains("端口映射"),
                    "handshake-incomplete 错误应含映射排查提示: {error}"
                );
                break;
            }
        }
        assert!(
            tokio::time::Instant::now() < deadline,
            "health 未在超时内更新"
        );
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
    }
    keepalive.abort();
}
