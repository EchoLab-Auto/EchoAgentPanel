//! Agent-native orchestration tools.
//!
//! These tools need the current session or LLM provider, so they are owned by
//! [`Agent`](super::Agent) instead of the platform-independent `ToolRegistry`.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, SecondsFormat, Utc};
use serde::Deserialize;
use serde_json::{json, Value};
use tokio::sync::{mpsc, Mutex};
use tokio_util::sync::CancellationToken;

use crate::llm::ToolDefinition;

const MAX_TIMER_DELAY: Duration = Duration::from_secs(31 * 24 * 60 * 60);
const MAX_TASK_CHARS: usize = 8_000;

#[derive(Debug, Clone)]
pub(super) struct TimerEvent {
    pub id: String,
    pub session_id: String,
    pub task: String,
    pub due_at: DateTime<Utc>,
}

#[derive(Debug)]
struct TimerEntry {
    session_id: String,
    task: String,
    due_at: DateTime<Utc>,
    cancel: CancellationToken,
}

/// In-memory timer storage and delivery queue.
pub(super) struct TimerScheduler {
    timers: Arc<Mutex<HashMap<String, TimerEntry>>>,
    event_tx: mpsc::UnboundedSender<TimerEvent>,
    event_rx: Mutex<Option<mpsc::UnboundedReceiver<TimerEvent>>>,
    shutdown: CancellationToken,
}

impl TimerScheduler {
    pub fn new(shutdown: CancellationToken) -> Self {
        let (event_tx, event_rx) = mpsc::unbounded_channel();
        Self {
            timers: Arc::new(Mutex::new(HashMap::new())),
            event_tx,
            event_rx: Mutex::new(Some(event_rx)),
            shutdown,
        }
    }

    pub fn take_receiver(&self) -> Option<mpsc::UnboundedReceiver<TimerEvent>> {
        self.event_rx.try_lock().ok()?.take()
    }

    pub async fn schedule(&self, session_id: &str, arguments: Value) -> Result<String, String> {
        let args: ScheduleTimerArgs = serde_json::from_value(arguments)
            .map_err(|error| format!("invalid timer arguments: {error}"))?;
        validate_task(&args.task)?;
        let due_at = resolve_due_at(&args)?;
        let delay = due_at
            .signed_duration_since(Utc::now())
            .to_std()
            .unwrap_or(Duration::ZERO);
        if delay > MAX_TIMER_DELAY {
            return Err("timer cannot be scheduled more than 31 days ahead".into());
        }

        let id = uuid::Uuid::new_v4().to_string();
        let timer_cancel = CancellationToken::new();
        self.timers.lock().await.insert(
            id.clone(),
            TimerEntry {
                session_id: session_id.to_string(),
                task: args.task.clone(),
                due_at,
                cancel: timer_cancel.clone(),
            },
        );

        let event = TimerEvent {
            id: id.clone(),
            session_id: session_id.to_string(),
            task: args.task,
            due_at,
        };
        let event_tx = self.event_tx.clone();
        let timers = Arc::clone(&self.timers);
        let shutdown = self.shutdown.clone();
        tokio::spawn(async move {
            tokio::select! {
                _ = tokio::time::sleep(delay) => {
                    if event_tx.send(event.clone()).is_err() {
                        timers.lock().await.remove(&event.id);
                    }
                }
                _ = timer_cancel.cancelled() => {}
                _ = shutdown.cancelled() => {}
            }
        });

        Ok(json!({
            "timer_id": id,
            "due_at": due_at.to_rfc3339_opts(SecondsFormat::Secs, true),
            "status": "scheduled"
        })
        .to_string())
    }

    pub async fn list(&self, session_id: &str) -> String {
        let timers = self.timers.lock().await;
        let mut rows: Vec<_> = timers
            .iter()
            .filter(|(_, timer)| timer.session_id == session_id)
            .map(|(id, timer)| {
                json!({
                    "timer_id": id,
                    "due_at": timer.due_at.to_rfc3339_opts(SecondsFormat::Secs, true),
                    "task": timer.task
                })
            })
            .collect();
        rows.sort_by(|left, right| left["due_at"].as_str().cmp(&right["due_at"].as_str()));
        json!({ "timers": rows }).to_string()
    }

    pub async fn cancel(&self, session_id: &str, arguments: Value) -> Result<String, String> {
        let args: CancelTimerArgs = serde_json::from_value(arguments)
            .map_err(|error| format!("invalid cancel arguments: {error}"))?;
        let mut timers = self.timers.lock().await;
        let belongs_to_session = timers
            .get(&args.timer_id)
            .is_some_and(|timer| timer.session_id == session_id);
        if !belongs_to_session {
            return Err("timer not found in the current session".into());
        }
        let timer = timers
            .remove(&args.timer_id)
            .expect("timer existence checked above");
        timer.cancel.cancel();
        Ok(json!({ "timer_id": args.timer_id, "status": "cancelled" }).to_string())
    }

    pub async fn mark_delivered(&self, timer_id: &str) {
        self.timers.lock().await.remove(timer_id);
    }
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ScheduleTimerArgs {
    task: String,
    #[serde(default)]
    delay_seconds: Option<u64>,
    #[serde(default)]
    run_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct CancelTimerArgs {
    timer_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct SubagentArgs {
    pub task: String,
    #[serde(default)]
    pub context: Option<String>,
}

pub(super) fn parse_subagent_args(arguments: Value) -> Result<SubagentArgs, String> {
    let args: SubagentArgs = serde_json::from_value(arguments)
        .map_err(|error| format!("invalid subagent arguments: {error}"))?;
    validate_task(&args.task)?;
    if args
        .context
        .as_ref()
        .is_some_and(|context| context.chars().count() > MAX_TASK_CHARS)
    {
        return Err(format!(
            "subagent context exceeds {MAX_TASK_CHARS} characters"
        ));
    }
    Ok(args)
}

fn validate_task(task: &str) -> Result<(), String> {
    if task.trim().is_empty() {
        return Err("task must not be empty".into());
    }
    if task.chars().count() > MAX_TASK_CHARS {
        return Err(format!("task exceeds {MAX_TASK_CHARS} characters"));
    }
    Ok(())
}

fn resolve_due_at(args: &ScheduleTimerArgs) -> Result<DateTime<Utc>, String> {
    match (args.delay_seconds, args.run_at.as_deref()) {
        (Some(_), Some(_)) => Err("provide exactly one of delay_seconds or run_at".into()),
        (None, None) => Err("provide exactly one of delay_seconds or run_at".into()),
        (Some(seconds), None) => Ok(Utc::now()
            + chrono::Duration::from_std(Duration::from_secs(seconds))
                .map_err(|_| "delay_seconds is too large")?),
        (None, Some(value)) => {
            let due_at = DateTime::parse_from_rfc3339(value)
                .map_err(|_| "run_at must be RFC 3339 with a timezone offset")?
                .with_timezone(&Utc);
            if due_at < Utc::now() {
                return Err("run_at must not be in the past".into());
            }
            Ok(due_at)
        }
    }
}

pub(super) fn tool_definitions() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "schedule_timer".into(),
            description: "Schedule a task for this conversation using exactly one of delay_seconds or run_at. When due, the task returns as a backend <timer_event>; use an explicit platform send tool if it must be delivered to QQ. Timers are in-memory and are lost when the process stops.".into(),
            parameters: Some(json!({
                "type": "object",
                "properties": {
                    "task": { "type": "string", "description": "What the agent should do when the timer fires" },
                    "delay_seconds": { "type": "integer", "minimum": 0, "maximum": 2678400, "description": "Delay from now in seconds" },
                    "run_at": { "type": "string", "description": "Absolute RFC 3339 time with timezone, for example 2030-01-02T20:00:00+08:00" }
                },
                "required": ["task"],
                "additionalProperties": false
            })),
        },
        ToolDefinition {
            name: "list_timers".into(),
            description: "List pending timers created in the current conversation.".into(),
            parameters: Some(json!({
                "type": "object",
                "properties": {},
                "additionalProperties": false
            })),
        },
        ToolDefinition {
            name: "cancel_timer".into(),
            description: "Cancel a pending timer in the current conversation.".into(),
            parameters: Some(json!({
                "type": "object",
                "properties": {
                    "timer_id": { "type": "string" }
                },
                "required": ["timer_id"],
                "additionalProperties": false
            })),
        },
        ToolDefinition {
            name: "run_subagent".into(),
            description: "Run one isolated subagent for a bounded research or reasoning task. It has no tools and cannot send platform messages; its result is returned privately to the parent agent.".into(),
            parameters: Some(json!({
                "type": "object",
                "properties": {
                    "task": { "type": "string", "description": "A complete, bounded task for the subagent" },
                    "context": { "type": "string", "description": "Only the background information the subagent needs" }
                },
                "required": ["task"],
                "additionalProperties": false
            })),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn orchestration_tool_names_are_stable() {
        let names: Vec<_> = tool_definitions()
            .into_iter()
            .map(|definition| definition.name)
            .collect();
        assert_eq!(
            names,
            [
                "schedule_timer",
                "list_timers",
                "cancel_timer",
                "run_subagent"
            ]
        );
    }

    #[test]
    fn timer_requires_one_time_mode() {
        let neither = ScheduleTimerArgs {
            task: "x".into(),
            delay_seconds: None,
            run_at: None,
        };
        assert!(resolve_due_at(&neither).is_err());
        let both = ScheduleTimerArgs {
            task: "x".into(),
            delay_seconds: Some(1),
            run_at: Some("2026-08-06T20:00:00+08:00".into()),
        };
        assert!(resolve_due_at(&both).is_err());
    }
}
