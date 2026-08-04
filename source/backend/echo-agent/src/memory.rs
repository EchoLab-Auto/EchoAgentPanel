//! Conversation memory.

use async_trait::async_trait;

use crate::llm::ChatMessage;

#[async_trait]
pub trait MemoryStore: Send + Sync {
    /// Append a message to the session's history.
    async fn add_message(&self, session_id: &str, msg: ChatMessage);

    /// Read the last `limit` messages of the session.
    async fn get_history(&self, session_id: &str, limit: usize) -> Vec<ChatMessage>;

    /// Replace the history of a session (used by compaction).
    async fn set_history(&self, session_id: &str, messages: Vec<ChatMessage>);

    /// Persist a summary for the session.
    async fn summarize(&self, session_id: &str, summary: String);

    /// Read the session summary, if any.
    async fn get_summary(&self, session_id: &str) -> Option<String>;

    /// Clear the session.
    async fn clear(&self, session_id: &str);
}

/// Default in-memory store: a shared map of per-session histories plus an
/// optional summary line.
#[derive(Debug, Default, Clone)]
pub struct InMemoryStore {
    inner: std::sync::Arc<dashmap::DashMap<String, MemoryEntry>>,
}

#[derive(Debug, Default)]
struct MemoryEntry {
    messages: Vec<ChatMessage>,
    summary: Option<String>,
}

#[async_trait]
impl MemoryStore for InMemoryStore {
    async fn add_message(&self, session_id: &str, msg: ChatMessage) {
        self.inner.entry(session_id.to_string()).or_default().messages.push(msg);
    }

    async fn get_history(&self, session_id: &str, limit: usize) -> Vec<ChatMessage> {
        match self.inner.get(session_id) {
            Some(entry) => {
                let msgs = &entry.value().messages;
                let start = msgs.len().saturating_sub(limit);
                msgs[start..].to_vec()
            }
            None => Vec::new(),
        }
    }

    async fn set_history(&self, session_id: &str, messages: Vec<ChatMessage>) {
        self.inner.entry(session_id.to_string()).or_default().messages = messages;
    }

    async fn summarize(&self, session_id: &str, summary: String) {
        self.inner.entry(session_id.to_string()).or_default().summary = Some(summary);
    }

    async fn get_summary(&self, session_id: &str) -> Option<String> {
        self.inner.get(session_id).and_then(|e| e.value().summary.clone())
    }

    async fn clear(&self, session_id: &str) {
        self.inner.remove(session_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn history_is_bounded_by_limit() {
        let store = InMemoryStore::default();
        for i in 0..10 {
            store.add_message("s1", ChatMessage::user(format!("msg{i}"))).await;
        }
        let hist = store.get_history("s1", 4).await;
        assert_eq!(hist.len(), 4);
        assert_eq!(hist[0].content, "msg6");
        assert_eq!(hist[3].content, "msg9");
    }

    #[tokio::test]
    async fn summary_roundtrip() {
        let store = InMemoryStore::default();
        store.summarize("s2", "summary here".to_string()).await;
        assert_eq!(store.get_summary("s2").await.as_deref(), Some("summary here"));
        store.clear("s2").await;
        assert!(store.get_summary("s2").await.is_none());
    }
}
