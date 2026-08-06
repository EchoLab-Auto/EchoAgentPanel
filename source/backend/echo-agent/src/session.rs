//! Per-user conversation sessions with platform-aware keys.

use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;

use dashmap::DashMap;
use tokio::sync::Mutex;

use crate::event::SessionInfo;
use crate::llm::ChatMessage;

/// Structured session identity, replacing the old `user_{qq_number}` format.
///
/// ```text
/// format: {platform}:{scope}:{scope_id}:{user_id}
///
/// Examples:
///   qq:dm::123456           — QQ direct message, user 123456
///   qq:group:987654:123456  — QQ group 987654, user 123456
///   local:tui::local_user   — local TUI interaction
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SessionKey {
    /// Platform (e.g., "qq", "local").
    pub platform: String,
    /// Scope: "dm", "group", "tui".
    pub scope: String,
    /// Scope identifier (group_id for groups, empty for dm).
    pub scope_id: String,
    /// User identifier (platform-specific user ID as string).
    pub user_id: String,
}

impl SessionKey {
    /// Build the canonical session ID string.
    pub fn to_session_id(&self) -> String {
        format!(
            "{}:{}:{}:{}",
            self.platform, self.scope, self.scope_id, self.user_id
        )
    }

    /// Create a session key for local TUI use.
    pub fn local_tui() -> Self {
        SessionKey {
            platform: "local".into(),
            scope: "tui".into(),
            scope_id: String::new(),
            user_id: "local_user".into(),
        }
    }

    /// Parse a session ID string back into a key. Returns `None` on legacy
    /// `user_{id}` format (falls back to `local:tui:`) or malformed strings.
    pub fn parse(session_id: &str) -> Option<Self> {
        // Legacy format: user_{digits}
        if session_id.starts_with("user_") {
            let user_id = session_id.strip_prefix("user_")?;
            return Some(SessionKey {
                platform: "local".into(),
                scope: "tui".into(),
                scope_id: String::new(),
                user_id: user_id.to_string(),
            });
        }
        let parts: Vec<&str> = session_id.splitn(4, ':').collect();
        if parts.len() != 4 {
            return None;
        }
        Some(SessionKey {
            platform: parts[0].to_string(),
            scope: parts[1].to_string(),
            scope_id: parts[2].to_string(),
            user_id: parts[3].to_string(),
        })
    }
}

/// A conversation session scoped to one platform user/channel.
///
/// Cloneable: clones share the same history and activity clock.
#[derive(Debug, Clone)]
pub struct Session {
    pub id: String,
    pub session_key: SessionKey,
    pub nickname: String,
    pub group_name: Option<String>,
    last_active: Arc<AtomicI64>,
    /// Conversation history (bounded by `memory_limit`).
    pub history: Arc<Mutex<Vec<ChatMessage>>>,
    /// Serialise turns for this session to avoid interleaved history / out-of-order replies.
    pub turn_lock: Arc<tokio::sync::Mutex<()>>,
}

impl Session {
    pub fn new(key: &SessionKey, nickname: String, group_name: Option<String>) -> Self {
        Self::with_context(
            key,
            nickname,
            group_name,
            Arc::new(Mutex::new(Vec::new())),
            Arc::new(tokio::sync::Mutex::new(())),
        )
    }

    fn with_context(
        key: &SessionKey,
        nickname: String,
        group_name: Option<String>,
        history: Arc<Mutex<Vec<ChatMessage>>>,
        turn_lock: Arc<tokio::sync::Mutex<()>>,
    ) -> Self {
        Self {
            id: key.to_session_id(),
            session_key: key.clone(),
            nickname,
            group_name,
            last_active: Arc::new(AtomicI64::new(chrono::Utc::now().timestamp())),
            history,
            turn_lock,
        }
    }

    /// Record activity (shared across clones).
    pub fn touch(&self) {
        self.last_active
            .store(chrono::Utc::now().timestamp(), Ordering::Relaxed);
    }

    pub fn last_active(&self) -> i64 {
        self.last_active.load(Ordering::Relaxed)
    }

    pub fn info(&self, last_message: String) -> SessionInfo {
        SessionInfo {
            id: self.id.clone(),
            platform: self.session_key.platform.clone(),
            scope: self.session_key.scope.clone(),
            user_id: self.session_key.user_id.clone(),
            nickname: self.nickname.clone(),
            group_name: self.group_name.clone(),
            last_active: self.last_active(),
            last_message,
        }
    }
}

/// Registry of all active sessions, keyed by session ID string.
pub struct SessionManager {
    sessions: Arc<DashMap<String, Session>>,
    memory_limit: usize,
    shared_context: bool,
    shared_history: Arc<Mutex<Vec<ChatMessage>>>,
    shared_turn_lock: Arc<tokio::sync::Mutex<()>>,
    persist_path: std::sync::Mutex<Option<std::path::PathBuf>>,
    dirty: std::sync::atomic::AtomicBool,
}

impl Clone for SessionManager {
    fn clone(&self) -> Self {
        Self {
            sessions: Arc::clone(&self.sessions),
            memory_limit: self.memory_limit,
            shared_context: self.shared_context,
            shared_history: Arc::clone(&self.shared_history),
            shared_turn_lock: Arc::clone(&self.shared_turn_lock),
            persist_path: std::sync::Mutex::new(
                self.persist_path.lock().expect("poisoned").clone(),
            ),
            dirty: std::sync::atomic::AtomicBool::new(
                self.dirty.load(std::sync::atomic::Ordering::Relaxed),
            ),
        }
    }
}

impl std::fmt::Debug for SessionManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SessionManager")
            .field("len", &self.len())
            .finish()
    }
}

/// Session idle TTL before eviction (24 hours, in milliseconds).
const SESSION_IDLE_TTL_MS: i64 = 24 * 60 * 60 * 1000;

impl SessionManager {
    pub fn new(memory_limit: usize) -> Self {
        Self::with_shared_context(memory_limit, false)
    }

    pub fn with_shared_context(memory_limit: usize, shared_context: bool) -> Self {
        Self {
            sessions: Arc::new(DashMap::new()),
            memory_limit,
            shared_context,
            shared_history: Arc::new(Mutex::new(Vec::new())),
            shared_turn_lock: Arc::new(tokio::sync::Mutex::new(())),
            persist_path: std::sync::Mutex::new(None),
            dirty: std::sync::atomic::AtomicBool::new(false),
        }
    }

    /// Set the file path for session persistence.
    pub fn set_persist_path(&self, path: impl Into<std::path::PathBuf>) {
        *self.persist_path.lock().expect("persist path poisoned") = Some(path.into());
    }

    /// Mark sessions as needing save.
    pub fn mark_dirty(&self) {
        self.dirty.store(true, std::sync::atomic::Ordering::Relaxed);
    }

    /// Save sessions to JSON file if dirty.
    pub async fn maybe_save(&self) {
        if !self.dirty.load(std::sync::atomic::Ordering::Relaxed) {
            return;
        }
        self.write_to_disk().await;
    }

    /// Force a save now, ignoring the dirty flag (used at shutdown).
    pub async fn save_now(&self) {
        self.write_to_disk().await;
    }

    /// Write sessions to disk. On failure the dirty flag stays set so the
    /// periodic task retries; failures are logged, not silently dropped.
    async fn write_to_disk(&self) {
        let path = {
            self.persist_path
                .lock()
                .expect("persist path poisoned")
                .clone()
        };
        let Some(ref path) = path else {
            self.dirty
                .store(false, std::sync::atomic::Ordering::Relaxed);
            return;
        };
        let Some(data) = self.serialize() else {
            // Serialization failure — nothing was written, retry next tick.
            return;
        };
        let tmp = format!("{}.tmp", path.display());
        if let Err(e) = tokio::fs::write(&tmp, &data).await {
            tracing::warn!(error = %e, path = %path.display(), "session save: tmp write failed, will retry");
            return;
        }
        if let Err(e) = tokio::fs::rename(&tmp, path).await {
            tracing::warn!(error = %e, path = %path.display(), "session save: rename failed, will retry");
            let _ = tokio::fs::remove_file(&tmp).await;
            return;
        }
        self.dirty
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }

    /// Load sessions from JSON file. Returns count of restored sessions.
    pub async fn load_from_file(&self) -> usize {
        let path = {
            self.persist_path
                .lock()
                .expect("persist path poisoned")
                .clone()
        };
        let Some(ref path) = path else {
            return 0;
        };
        let data = match tokio::fs::read_to_string(path).await {
            Ok(d) => d,
            Err(_) => return 0,
        };
        self.deserialize(&data)
    }

    /// Serialize all sessions. Returns `None` on failure so the caller can
    /// skip the write instead of silently replacing the file with garbage.
    fn serialize(&self) -> Option<String> {
        if self.shared_context {
            let history = self.shared_history.try_lock().ok()?;
            let sessions = self.all().iter().map(session_metadata).collect::<Vec<_>>();
            return serde_json::to_string_pretty(&serde_json::json!({
                "version": 2,
                "shared_context": true,
                "shared_history": serialize_messages(&history),
                "sessions": sessions,
            }))
            .map_err(|error| {
                tracing::error!(%error, "session serialization failed, skipping save");
                error
            })
            .ok();
        }

        let sessions: Vec<serde_json::Value> = self
            .all()
            .iter()
            .filter_map(|s| {
                let history = s.history.try_lock().ok()?;
                let mut value = session_metadata(s);
                value["history"] = serde_json::Value::Array(serialize_messages(&history));
                Some(value)
            })
            .collect();
        match serde_json::to_string_pretty(&sessions) {
            Ok(s) => Some(s),
            Err(e) => {
                tracing::error!(error = %e, "session serialization failed, skipping save");
                None
            }
        }
    }

    fn deserialize(&self, data: &str) -> usize {
        let Ok(root) = serde_json::from_str::<serde_json::Value>(data) else {
            return 0;
        };
        let (sessions, persisted_shared_history) = match &root {
            serde_json::Value::Array(sessions) => (sessions.as_slice(), None),
            serde_json::Value::Object(_) => {
                let Some(sessions) = root["sessions"].as_array() else {
                    return 0;
                };
                (sessions.as_slice(), root["shared_history"].as_array())
            }
            _ => return 0,
        };
        let mut count = 0;
        let mut legacy_histories = Vec::new();
        for s in sessions {
            let Some(_id) = s["id"].as_str() else {
                continue;
            };
            let key = crate::session::SessionKey {
                platform: s["platform"].as_str().unwrap_or("local").into(),
                scope: s["scope"].as_str().unwrap_or("tui").into(),
                scope_id: s["scope_id"].as_str().unwrap_or("").into(),
                user_id: s["user_id"].as_str().unwrap_or("0").into(),
            };
            let nickname = s["nickname"].as_str().unwrap_or("").into();
            let group_name = s["group_name"].as_str().map(|g| g.to_string());
            let session = self.get_or_create(&key, nickname, group_name);
            if let Some(last_active) = s["last_active"].as_i64() {
                session.last_active.store(last_active, Ordering::Relaxed);
            }
            if !self.shared_context {
                let history = persisted_shared_history.or_else(|| s["history"].as_array());
                let msgs = history.map_or_else(Vec::new, |history| deserialize_messages(history));
                if let Ok(mut hist) = session.history.try_lock() {
                    *hist = msgs;
                }
            } else if persisted_shared_history.is_none() {
                if let Some(history) = s["history"].as_array() {
                    legacy_histories.push((
                        s["last_active"].as_i64().unwrap_or_default(),
                        deserialize_messages(history),
                    ));
                }
            }
            count += 1;
        }

        if self.shared_context {
            let mut history = persisted_shared_history
                .map(|history| deserialize_messages(history))
                .unwrap_or_else(|| merge_legacy_histories(legacy_histories));
            if history.len() > self.memory_limit {
                history.drain(..history.len() - self.memory_limit);
            }
            if let Ok(mut shared) = self.shared_history.try_lock() {
                *shared = history;
            }
        }
        count
    }

    /// Evict sessions idle longer than TTL. Called periodically from a background task.
    pub fn evict_idle(&self) {
        let now = chrono::Utc::now().timestamp_millis();
        self.sessions
            .retain(|_, s| now - s.last_active() * 1000 < SESSION_IDLE_TTL_MS);
    }

    /// Get or create a session for the given key.
    ///
    /// Uses entry API so concurrent callers for the same key see only one session.
    pub fn get_or_create(
        &self,
        key: &SessionKey,
        nickname: String,
        group_name: Option<String>,
    ) -> Session {
        let session_id = key.to_session_id();
        match self.sessions.entry(session_id) {
            dashmap::mapref::entry::Entry::Occupied(e) => {
                e.get().touch();
                e.get().clone()
            }
            dashmap::mapref::entry::Entry::Vacant(v) => {
                let session = if self.shared_context {
                    Session::with_context(
                        key,
                        nickname,
                        group_name,
                        Arc::clone(&self.shared_history),
                        Arc::clone(&self.shared_turn_lock),
                    )
                } else {
                    Session::new(key, nickname, group_name)
                };
                v.insert(session.clone());
                session
            }
        }
    }

    pub fn get(&self, session_id: &str) -> Option<Session> {
        self.sessions.get(session_id).map(|s| s.clone())
    }

    pub async fn clear(&self, session_id: &str) -> bool {
        match self.sessions.get(session_id) {
            Some(s) => {
                s.value().history.lock().await.clear();
                s.value().touch();
                true
            }
            None => false,
        }
    }

    pub fn all(&self) -> Vec<Session> {
        self.sessions.iter().map(|e| e.value().clone()).collect()
    }

    pub fn len(&self) -> usize {
        self.sessions.len()
    }

    pub fn is_empty(&self) -> bool {
        self.sessions.is_empty()
    }

    pub fn memory_limit(&self) -> usize {
        self.memory_limit
    }

    pub fn shared_context_enabled(&self) -> bool {
        self.shared_context
    }
}

fn session_metadata(session: &Session) -> serde_json::Value {
    serde_json::json!({
        "id": session.id,
        "platform": session.session_key.platform,
        "scope": session.session_key.scope,
        "scope_id": session.session_key.scope_id,
        "user_id": session.session_key.user_id,
        "nickname": session.nickname,
        "group_name": session.group_name,
        "last_active": session.last_active(),
    })
}

fn serialize_messages(history: &[ChatMessage]) -> Vec<serde_json::Value> {
    history
        .iter()
        .map(|message| {
            serde_json::json!({
                "role": match message.role {
                    crate::llm::ChatRole::System => "system",
                    crate::llm::ChatRole::User => "user",
                    crate::llm::ChatRole::Assistant => "assistant",
                    crate::llm::ChatRole::Tool => "tool",
                },
                "content": message.content,
            })
        })
        .collect()
}

fn deserialize_messages(history: &[serde_json::Value]) -> Vec<ChatMessage> {
    history
        .iter()
        .filter_map(|message| {
            Some(ChatMessage {
                role: match message["role"].as_str()? {
                    "system" => crate::llm::ChatRole::System,
                    "user" => crate::llm::ChatRole::User,
                    "assistant" => crate::llm::ChatRole::Assistant,
                    "tool" => crate::llm::ChatRole::Tool,
                    _ => return None,
                },
                content: message["content"].as_str()?.into(),
                tool_calls: None,
                tool_call_id: None,
            })
        })
        .collect()
}

fn merge_legacy_histories(mut histories: Vec<(i64, Vec<ChatMessage>)>) -> Vec<ChatMessage> {
    histories.sort_by_key(|(last_active, _)| *last_active);
    let Some((_, first)) = histories.first() else {
        return Vec::new();
    };
    if histories.iter().all(|(_, history)| history == first) {
        return first.clone();
    }
    histories
        .into_iter()
        .flat_map(|(_, history)| history)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        /// Round-trip for any key whose fields don't contain the `:` separator
        /// (the wire format's only structural character).
        #[test]
        fn session_key_roundtrip(
            platform in "[a-z0-9_]{1,10}",
            scope in "dm|group|tui",
            scope_id in "[0-9]{0,12}",
            user_id in "[0-9]{1,15}",
        ) {
            let key = SessionKey { platform, scope, scope_id, user_id };
            let id = key.to_session_id();
            let parsed = SessionKey::parse(&id).expect("roundtrip parse");
            prop_assert_eq!(parsed, key);
        }

        /// Arbitrary strings must never panic in parse; malformed input
        /// either parses to a key whose serialisation round-trips or is None.
        #[test]
        fn session_key_parse_never_panics(
            input in ".*",
        ) {
            if let Some(key) = SessionKey::parse(&input) {
                prop_assert_eq!(SessionKey::parse(&key.to_session_id()), Some(key));
            }
        }
    }

    #[test]
    fn session_key_format() {
        let key = SessionKey {
            platform: "qq".into(),
            scope: "dm".into(),
            scope_id: "".into(),
            user_id: "123".into(),
        };
        assert_eq!(key.to_session_id(), "qq:dm::123");
    }

    #[test]
    fn session_key_parse() {
        let key = SessionKey::parse("qq:group:456:789").unwrap();
        assert_eq!(key.platform, "qq");
        assert_eq!(key.scope, "group");
        assert_eq!(key.scope_id, "456");
        assert_eq!(key.user_id, "789");
    }

    #[test]
    fn session_key_parse_legacy() {
        let key = SessionKey::parse("user_12345").unwrap();
        assert_eq!(key.platform, "local");
        assert_eq!(key.scope, "tui");
        assert_eq!(key.user_id, "12345");
    }

    #[test]
    fn session_key_local_tui() {
        let key = SessionKey::local_tui();
        assert_eq!(key.to_session_id(), "local:tui::local_user");
    }

    #[test]
    fn session_key_parse_malformed() {
        assert!(SessionKey::parse("abc").is_none());
        assert!(SessionKey::parse("a:b").is_none());
    }

    #[tokio::test]
    async fn session_manager_get_or_create() {
        let mgr = SessionManager::new(10);
        let key = SessionKey::parse("qq:dm::111").unwrap();
        let s = mgr.get_or_create(&key, "alice".into(), None);
        assert_eq!(s.id, "qq:dm::111");
        assert_eq!(mgr.len(), 1);

        // Same key returns existing session.
        let s2 = mgr.get_or_create(&key, "bob".into(), None);
        assert_eq!(mgr.len(), 1);
        assert_eq!(s2.nickname, "alice"); // original nickname preserved
    }

    #[tokio::test]
    async fn shared_context_reuses_history_and_turn_lock_across_platforms() {
        let mgr = SessionManager::with_shared_context(10, true);
        let local = mgr.get_or_create(&SessionKey::local_tui(), "local".into(), None);
        let qq = mgr.get_or_create(
            &SessionKey::parse("qq:dm::123").unwrap(),
            "alice".into(),
            None,
        );

        local.history.lock().await.push(ChatMessage::user("shared"));

        assert!(Arc::ptr_eq(&local.history, &qq.history));
        assert!(Arc::ptr_eq(&local.turn_lock, &qq.turn_lock));
        assert_eq!(qq.history.lock().await[0].content, "shared");
        assert!(mgr.clear(&qq.id).await);
        assert!(local.history.lock().await.is_empty());
    }

    #[tokio::test]
    async fn isolated_context_keeps_platform_histories_separate() {
        let mgr = SessionManager::new(10);
        let local = mgr.get_or_create(&SessionKey::local_tui(), "local".into(), None);
        let qq = mgr.get_or_create(
            &SessionKey::parse("qq:dm::123").unwrap(),
            "alice".into(),
            None,
        );

        local.history.lock().await.push(ChatMessage::user("local"));

        assert!(!Arc::ptr_eq(&local.history, &qq.history));
        assert!(qq.history.lock().await.is_empty());
    }

    #[tokio::test]
    async fn session_info_has_platform_fields() {
        let mgr = SessionManager::new(5);
        let key = SessionKey::parse("qq:group:789:456").unwrap();
        let s = mgr.get_or_create(&key, "bob".into(), Some("TestGroup".into()));
        let info = s.info("last msg".into());
        assert_eq!(info.platform, "qq");
        assert_eq!(info.scope, "group");
        assert_eq!(info.user_id, "456");
        assert_eq!(info.group_name, Some("TestGroup".into()));
        assert_eq!(info.last_message, "last msg");
    }

    // ── Persistence ─────────────────────────────────────────────────────────

    fn temp_sessions_path(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("echo-sessions-{name}-{}.json", std::process::id()))
    }

    #[tokio::test]
    async fn save_and_load_roundtrip_restores_sessions() {
        let path = temp_sessions_path("roundtrip");
        let _ = std::fs::remove_file(&path);

        let mgr = SessionManager::new(10);
        mgr.set_persist_path(&path);
        let key = SessionKey::parse("qq:group:789:456").unwrap();
        let s = mgr.get_or_create(&key, "bob".into(), Some("TestGroup".into()));
        s.history
            .lock()
            .await
            .push(crate::llm::ChatMessage::user("你好"));
        s.history
            .lock()
            .await
            .push(crate::llm::ChatMessage::assistant("回复"));
        mgr.mark_dirty();
        mgr.save_now().await;
        assert!(path.exists(), "sessions file written");

        // A fresh manager restores everything.
        let mgr2 = SessionManager::new(10);
        mgr2.set_persist_path(&path);
        let restored = mgr2.load_from_file().await;
        assert_eq!(restored, 1, "one session restored");
        let s2 = mgr2.get_or_create(&key, "bob".into(), Some("TestGroup".into()));
        let hist = s2.history.lock().await.clone();
        assert_eq!(hist.len(), 2);
        assert_eq!(hist[0].content, "你好");
        assert_eq!(hist[1].content, "回复");

        let _ = std::fs::remove_file(&path);
    }

    #[tokio::test]
    async fn shared_context_persists_history_once_and_restores_it() {
        let path = temp_sessions_path("shared-roundtrip");
        let _ = std::fs::remove_file(&path);
        let mgr = SessionManager::with_shared_context(10, true);
        mgr.set_persist_path(&path);
        let local = mgr.get_or_create(&SessionKey::local_tui(), "local".into(), None);
        let qq_key = SessionKey::parse("qq:dm::123").unwrap();
        let _qq = mgr.get_or_create(&qq_key, "alice".into(), None);
        local.history.lock().await.extend([
            ChatMessage::user("from tui"),
            ChatMessage::assistant("shared reply"),
        ]);
        mgr.mark_dirty();
        mgr.save_now().await;

        let root: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(root["version"], 2);
        assert_eq!(root["shared_history"].as_array().unwrap().len(), 2);
        assert!(root["sessions"]
            .as_array()
            .unwrap()
            .iter()
            .all(|session| session.get("history").is_none()));

        let restored = SessionManager::with_shared_context(10, true);
        restored.set_persist_path(&path);
        assert_eq!(restored.load_from_file().await, 2);
        let local = restored.get("local:tui::local_user").unwrap();
        let qq = restored.get(&qq_key.to_session_id()).unwrap();
        assert!(Arc::ptr_eq(&local.history, &qq.history));
        assert_eq!(local.history.lock().await.len(), 2);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn shared_context_migrates_distinct_legacy_histories() {
        let mgr = SessionManager::with_shared_context(10, true);
        let restored = mgr.deserialize(
            r#"[
                {"id":"local:tui::local_user","platform":"local","scope":"tui","scope_id":"","user_id":"local_user","nickname":"local","last_active":1,"history":[{"role":"user","content":"local"}]},
                {"id":"qq:dm::123","platform":"qq","scope":"dm","scope_id":"","user_id":"123","nickname":"alice","last_active":2,"history":[{"role":"user","content":"qq"}]}
            ]"#,
        );

        assert_eq!(restored, 2);
        let history = mgr.shared_history.try_lock().unwrap();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].content, "local");
        assert_eq!(history[1].content, "qq");
    }

    #[tokio::test]
    async fn load_from_missing_file_returns_zero() {
        let mgr = SessionManager::new(10);
        mgr.set_persist_path(temp_sessions_path("missing"));
        assert_eq!(mgr.load_from_file().await, 0);
    }

    #[tokio::test]
    async fn load_handles_malformed_entries_leniently() {
        let path = temp_sessions_path("malformed");
        std::fs::write(
            &path,
            r#"[
                {"id": "ok", "platform": "qq", "scope": "dm", "scope_id": "", "user_id": "1", "nickname": "a", "history": []},
                {"id": "bad", "platform": "qq", "scope": "dm"},
                "not an object"
            ]"#,
        )
        .unwrap();
        let mgr = SessionManager::new(10);
        mgr.set_persist_path(&path);
        let restored = mgr.load_from_file().await;
        // Entries with an id are restored leniently (missing fields fall back
        // to defaults); non-object entries are skipped.
        assert_eq!(restored, 2);
        // The partially-populated entry falls back to defaults for the
        // missing fields only (scope_id/user_id → empty/0).
        let fallback = mgr.get("qq:dm::0").expect("lenient default session");
        assert_eq!(fallback.session_key.scope_id, "");
        assert_eq!(fallback.session_key.user_id, "0");
        let _ = std::fs::remove_file(&path);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn concurrent_get_or_create_yields_single_instance() {
        let mgr = SessionManager::new(10);
        let key = SessionKey::parse("qq:dm::999").unwrap();
        let key2 = key.clone();

        // 32 concurrent callers racing on the same key.
        let mut handles = Vec::new();
        for _ in 0..32 {
            let mgr = mgr.clone();
            let key = key.clone();
            handles.push(tokio::spawn(async move {
                mgr.get_or_create(&key, "alice".into(), None)
            }));
        }
        for h in handles {
            let _ = h.await.unwrap();
        }
        assert_eq!(mgr.len(), 1, "single session for concurrent callers");
        let _ = key2;
    }

    #[test]
    fn evict_idle_removes_stale_but_keeps_recent() {
        let mgr = SessionManager::new(10);
        let key = SessionKey::parse("qq:dm::111").unwrap();
        let stale = mgr.get_or_create(&key, "alice".into(), None);
        // Force last_active far in the past (2× TTL).
        let past = chrono::Utc::now().timestamp() - (SESSION_IDLE_TTL_MS / 1000) * 2;
        stale
            .last_active
            .store(past, std::sync::atomic::Ordering::Relaxed);

        let key2 = SessionKey::parse("qq:dm::222").unwrap();
        let recent = mgr.get_or_create(&key2, "bob".into(), None);
        recent.touch(); // now

        assert_eq!(mgr.len(), 2);
        mgr.evict_idle();
        assert_eq!(mgr.len(), 1);
        assert!(
            mgr.get(&key2.to_session_id()).is_some(),
            "recent session survives"
        );
    }
}
