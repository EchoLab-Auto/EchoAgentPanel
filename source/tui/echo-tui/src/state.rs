//! Application state — data types, [`AppState`], and its methods.
//!
//! Extracted from the old `app.rs` god file.

use std::collections::HashMap;
use std::time::Duration;

use echo_agent::{BackendCommand, SessionInfo};

use crate::components::form_overlay::FormOverlay;
use crate::components::settings_popup::SettingsForm;
use crate::keybindings::Keybindings;
use crate::slash_commands::SlashAction;
use crate::theme::Theme;
use crate::util;

const MAX_ORCHESTRATION_HISTORY: usize = 128;
pub const PRIMARY_SESSION_ID: &str = "local:tui::local_user";
/// The global trunk timeline. Every conversation message from all sources
/// (QQ private, QQ group, TUI, timers, background tasks) is mirrored here in
/// one ordered stream. It is pinned to the top of the session list.
pub const TRUNK_SESSION_ID: &str = "trunk";
/// Cap on trunk timeline entries so a long-running panel stays bounded.
const TRUNK_MAX_MESSAGES: usize = 1024;

// ── Message types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MsgRole {
    User,
    Backend,
    Tool,
    System,
}

#[derive(Debug, Clone)]
pub struct DisplayMessage {
    pub role: MsgRole,
    pub content: String,
    pub time: i64,
    pub metadata: Option<MessageMetadata>,
}

impl DisplayMessage {
    pub fn plain(role: MsgRole, content: impl Into<String>, time: i64) -> Self {
        Self {
            role,
            content: content.into(),
            time,
            metadata: None,
        }
    }
}

fn history_display_content(content: &str) -> String {
    let trimmed = content.trim();
    let payload = [
        ("qq_message_hook", "content"),
        ("backend_message_hook", "content"),
        ("timer_event", "task"),
        ("background_task_event", "objective"),
    ]
    .into_iter()
    .find_map(|(tag, field)| {
        let body = trimmed
            .strip_prefix(&format!("<{tag}>"))?
            .strip_suffix(&format!("</{tag}>"))?
            .trim();
        serde_json::from_str::<serde_json::Value>(body).ok()?[field]
            .as_str()
            .map(str::to_string)
    });
    payload.unwrap_or_else(|| content.to_string())
}

#[derive(Debug, Clone)]
pub enum MessageMetadata {
    Tool(ToolMessage),
    Inbound(InboundMessage),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InboundMessage {
    pub adapter_name: String,
    pub platform: String,
    pub user_id: String,
    pub user_name: String,
    pub channel: String,
    pub group_name: Option<String>,
    pub received_at_ms: i64,
    pub message_sequence: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToolMessageStatus {
    Running,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone)]
pub struct ToolMessage {
    pub name: String,
    pub input: String,
    pub output: Option<String>,
    pub status: ToolMessageStatus,
    pub started_at: std::time::Instant,
    pub elapsed: Option<Duration>,
}

// ── Agent execution state ──────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentPhase {
    Thinking,
    Tool,
    Subagent,
    Completed,
    Failed,
}

impl AgentPhase {
    pub fn is_busy(self) -> bool {
        matches!(self, Self::Thinking | Self::Tool | Self::Subagent)
    }
}

#[derive(Debug, Clone)]
pub struct AgentActivity {
    pub phase: AgentPhase,
    pub detail: Option<String>,
    pub turn_started_at: std::time::Instant,
    pub phase_started_at: std::time::Instant,
    pub finished_elapsed: Option<Duration>,
    pub tools_completed: usize,
    pub subagents_completed: usize,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
}

impl AgentActivity {
    pub fn new() -> Self {
        let now = std::time::Instant::now();
        Self {
            phase: AgentPhase::Thinking,
            detail: None,
            turn_started_at: now,
            phase_started_at: now,
            finished_elapsed: None,
            tools_completed: 0,
            subagents_completed: 0,
            prompt_tokens: 0,
            completion_tokens: 0,
        }
    }

    pub fn transition(&mut self, phase: AgentPhase, detail: Option<String>) {
        self.phase = phase;
        self.detail = detail;
        self.phase_started_at = std::time::Instant::now();
        self.finished_elapsed = matches!(phase, AgentPhase::Completed | AgentPhase::Failed)
            .then(|| self.turn_started_at.elapsed());
    }

    pub fn total_elapsed(&self) -> Duration {
        self.finished_elapsed
            .unwrap_or_else(|| self.turn_started_at.elapsed())
    }

    pub fn phase_elapsed(&self) -> Duration {
        self.phase_started_at.elapsed()
    }
}

impl Default for AgentActivity {
    fn default() -> Self {
        Self::new()
    }
}

// ── Branch / subagent execution state ─────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrchestrationKind {
    Background,
    Parallel,
    Subagent,
    ReplyBranch,
}

impl OrchestrationKind {
    pub fn label(self) -> &'static str {
        match self {
            Self::Background => "后台",
            Self::Parallel => "并行",
            Self::Subagent => "Subagent",
            Self::ReplyBranch => "临时回复",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrchestrationStatus {
    Running,
    AwaitingIntegration,
    Completed,
    Integrated,
    Failed,
    Cancelled,
}

impl OrchestrationStatus {
    pub fn label(self) -> &'static str {
        match self {
            Self::Running => "运行中",
            Self::AwaitingIntegration => "等待整合",
            Self::Completed => "已完成",
            Self::Integrated => "已整合",
            Self::Failed => "失败",
            Self::Cancelled => "已取消",
        }
    }

    pub fn is_active(self) -> bool {
        matches!(self, Self::Running | Self::AwaitingIntegration)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BranchStatus {
    Running,
    Completed,
    Succeeded,
    Failed,
    Cancelled,
}

impl BranchStatus {
    pub fn label(self) -> &'static str {
        match self {
            Self::Running => "运行中",
            Self::Completed => "已完成",
            Self::Succeeded => "成功",
            Self::Failed => "失败",
            Self::Cancelled => "已取消",
        }
    }
}

#[derive(Debug, Clone)]
pub struct BranchActivity {
    pub branch_id: String,
    pub task: String,
    pub target: String,
    pub status: BranchStatus,
    pub started_at_ms: i64,
    pub completed_at_ms: Option<i64>,
    pub result: Option<String>,
}

#[derive(Debug, Clone)]
pub struct OrchestrationActivity {
    pub id: String,
    pub sequence: Option<u64>,
    pub session_id: String,
    pub kind: OrchestrationKind,
    pub objective: String,
    pub status: OrchestrationStatus,
    pub created_at_ms: i64,
    pub completed_at_ms: Option<i64>,
    pub integrated_at_ms: Option<i64>,
    pub branches: Vec<BranchActivity>,
    pub updated_at: std::time::Instant,
}

impl OrchestrationActivity {
    pub fn completed_branches(&self) -> usize {
        self.branches
            .iter()
            .filter(|branch| branch.status != BranchStatus::Running)
            .count()
    }

    pub fn elapsed(&self) -> Duration {
        let end = self
            .integrated_at_ms
            .or(self.completed_at_ms)
            .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());
        Duration::from_millis(end.saturating_sub(self.created_at_ms).max(0) as u64)
    }
}

/// A condensed view of one still-active temporary branch for the trunk
/// overview (task inspector header / status bar).
#[derive(Debug, Clone)]
pub struct ActiveBranchSummary {
    pub kind: OrchestrationKind,
    /// Short stable label (#sequence, S<n>, or the first 8 chars of the id).
    pub label: String,
    /// Delivery target or source label (e.g. "QQ 私聊 100", "源会话").
    pub target: String,
    pub status: OrchestrationStatus,
    pub created_at_ms: i64,
    pub objective: String,
}

#[derive(Debug, Clone)]
struct PendingBackgroundTask {
    kind: OrchestrationKind,
    objective: String,
    branches: Vec<BranchActivity>,
}

// ── Toast ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToastKind {
    Info,
    Success,
    Error,
}

#[derive(Debug, Clone)]
pub struct Toast {
    pub text: String,
    pub kind: ToastKind,
    pub created: std::time::Instant,
}

// ── Adapter status ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct AdapterStatusEntry {
    pub name: String,
    pub display_name: String,
    pub connected: bool,
    pub running: bool,
    pub self_id: Option<String>,
    pub bind_address: String,
    pub started_at: Option<i64>,
}

#[derive(Debug, Clone, Default)]
pub struct StatusInfo {
    pub adapters: Vec<AdapterStatusEntry>,
    pub model: String,
    pub provider: String,
    pub base_url: String,
    pub skills: Vec<String>,
    pub system_prompt: String,
}

impl StatusInfo {
    /// Upsert an adapter status entry.
    pub fn set_adapter_state(&mut self, entry: AdapterStatusEntry) {
        if let Some(existing) = self.adapters.iter_mut().find(|a| a.name == entry.name) {
            *existing = entry;
        } else {
            self.adapters.push(entry);
        }
    }

    pub fn is_connected(&self) -> bool {
        self.adapters.iter().any(|a| a.connected)
    }
}

// ── Mode enums ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteMode {
    Commands,
    Sessions,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConversationMode {
    Normal,
    ApiConfig,
}

// ── Constants ──────────────────────────────────────────────────────────────

pub const SPINNER: [char; 8] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'];

// ── QQ filter cache ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct QqFilterCache {
    pub allowlist_users: Vec<i64>,
    pub allowlist_groups: Vec<i64>,
    pub denylist_users: Vec<i64>,
    pub denylist_groups: Vec<i64>,
}

// ── Checklist panel ─────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct ChecklistItemEntry {
    pub text: String,
    pub done: bool,
}

#[derive(Debug, Clone, Default)]
pub struct ChecklistEntry {
    pub name: String,
    pub items: Vec<ChecklistItemEntry>,
    pub done: usize,
    pub total: usize,
}

impl ChecklistEntry {
    pub fn progress(&self) -> String {
        format!("{}/{}", self.done, self.total)
    }
}

// ── AppState ───────────────────────────────────────────────────────────────

pub struct AppState {
    pub running: bool,
    pub theme: Theme,
    pub keybindings: Keybindings,
    pub active_session_id: Option<String>,
    pub sessions: Vec<SessionInfo>,
    pub messages: HashMap<String, Vec<DisplayMessage>>,
    pub show_palette: bool,
    pub palette_mode: PaletteMode,
    pub show_help: bool,
    pub show_settings: bool,
    pub settings: SettingsForm,
    pub palette_selection: usize,
    pub status: StatusInfo,
    pub chat_scroll: usize,
    pub pending_submit: Option<String>,
    pub pending_command: Option<BackendCommand>,
    pub show_slash: bool,
    pub slash_filter: String,
    pub slash_selection: usize,
    pub pending_slash: Option<SlashAction>,
    pub pending_slash_text: String,
    pub leader_active: bool,
    pub leader_pressed_at: std::time::Instant,
    pub quit_armed: bool,
    pub quit_armed_at: std::time::Instant,
    pub anim_tick: u64,
    /// Per-session execution lifecycle. Sessions can run concurrently.
    pub agent_activities: HashMap<String, AgentActivity>,
    /// Detached branches and synchronous subagents, oldest first.
    pub orchestration_tasks: Vec<OrchestrationActivity>,
    pending_background_tasks: HashMap<String, PendingBackgroundTask>,
    next_subagent_sequence: u64,
    pub show_task_inspector: bool,
    pub task_inspector_selection: usize,
    pub task_inspector_scroll: u16,
    pub task_bar_area: ratatui::layout::Rect,
    pub chat_flash_until: Option<std::time::Instant>,
    pub mode: ConversationMode,
    pub form_overlay: FormOverlay,
    pub pending_action: Option<String>,
    pub menu_msg_idx: isize,
    pub qq_filter: QqFilterCache,
    /// Current QQ gate mode.
    pub qq_gate_mode: echo_adapter::GateMode,
    /// Cached QQ group list (fetched from adapter on request).
    pub qq_groups: Vec<(i64, String)>,
    /// Whether the group list has been fetched at least once.
    pub qq_groups_loaded: bool,
    /// Cached QQ friend list (for allowlist/denylist picker).
    pub qq_friends: Vec<(i64, String)>,
    /// Whether the friend list has been fetched at least once.
    pub qq_friends_loaded: bool,
    // Mouse text selection
    pub selecting: bool,
    pub sel_anchor: Option<(usize, usize)>,
    pub sel_other: Option<(usize, usize)>,
    pub conv_text: Vec<String>,
    pub conv_area: ratatui::layout::Rect,
    pub conv_top: usize,
    /// Checklist tool state snapshots (latest from each agent run).
    pub checklists: Vec<ChecklistEntry>,
    pub show_checklist_panel: bool,
    pub checklist_selection: usize,
    pub checklist_scroll: u16,
}

impl AppState {
    pub fn new(theme: Theme, keybindings: Keybindings) -> Self {
        Self {
            running: true,
            theme,
            keybindings,
            active_session_id: None,
            sessions: Vec::new(),
            messages: HashMap::new(),
            show_palette: false,
            palette_mode: PaletteMode::Commands,
            show_help: false,
            show_settings: false,
            settings: SettingsForm::default(),
            palette_selection: 0,
            status: StatusInfo::default(),
            chat_scroll: 0,
            pending_submit: None,
            pending_command: None,
            show_slash: false,
            slash_filter: String::new(),
            slash_selection: 0,
            pending_slash: None,
            pending_slash_text: String::new(),
            leader_active: false,
            leader_pressed_at: std::time::Instant::now(),
            quit_armed: false,
            quit_armed_at: std::time::Instant::now(),
            anim_tick: 0,
            agent_activities: HashMap::new(),
            orchestration_tasks: Vec::new(),
            pending_background_tasks: HashMap::new(),
            next_subagent_sequence: 0,
            show_task_inspector: false,
            task_inspector_selection: 0,
            task_inspector_scroll: 0,
            task_bar_area: ratatui::layout::Rect::default(),
            chat_flash_until: None,
            mode: ConversationMode::Normal,
            form_overlay: Default::default(),
            pending_action: None,
            menu_msg_idx: -1,
            qq_filter: QqFilterCache::default(),
            qq_gate_mode: echo_adapter::GateMode::None,
            qq_groups: Vec::new(),
            qq_groups_loaded: false,
            qq_friends: Vec::new(),
            qq_friends_loaded: false,
            selecting: false,
            sel_anchor: None,
            sel_other: None,
            conv_text: Vec::new(),
            conv_area: ratatui::layout::Rect::default(),
            conv_top: 0,
            checklists: Vec::new(),
            show_checklist_panel: false,
            checklist_selection: 0,
            checklist_scroll: 0,
        }
    }

    pub fn active_session(&self) -> Option<&SessionInfo> {
        let id = self.active_session_id.as_deref()?;
        self.sessions.iter().find(|s| s.id == id)
    }

    /// Establish the TUI's local primary conversation before remote sessions
    /// arrive. Incoming QQ sessions then remain background sessions until the
    /// user explicitly switches to them.
    pub fn ensure_primary_session(&mut self) {
        if !self
            .sessions
            .iter()
            .any(|session| session.id == PRIMARY_SESSION_ID)
        {
            self.sessions.push(SessionInfo {
                id: PRIMARY_SESSION_ID.into(),
                platform: "local".into(),
                scope: "tui".into(),
                user_id: "local_user".into(),
                nickname: "EchoAgent".into(),
                group_name: None,
                last_active: 0,
                last_message: String::new(),
            });
        }
        self.active_session_id = Some(PRIMARY_SESSION_ID.into());
    }

    /// Ensure the global trunk timeline session exists. It is a virtual
    /// session (not a real platform identity) pinned to the top of the
    /// session list; every source's messages are mirrored into it.
    pub fn ensure_trunk_session(&mut self) {
        if !self
            .sessions
            .iter()
            .any(|session| session.id == TRUNK_SESSION_ID)
        {
            self.sessions.push(SessionInfo {
                id: TRUNK_SESSION_ID.into(),
                platform: "local".into(),
                scope: "trunk".into(),
                user_id: "trunk".into(),
                nickname: "全局 Trunk".into(),
                group_name: None,
                last_active: 0,
                last_message: String::new(),
            });
        }
    }

    pub fn active_messages(&self) -> &[DisplayMessage] {
        match &self.active_session_id {
            Some(id) => self.messages.get(id).map(|v| v.as_slice()).unwrap_or(&[]),
            None => &[],
        }
    }

    pub fn active_activity(&self) -> Option<&AgentActivity> {
        self.active_session_id
            .as_deref()
            .and_then(|id| self.agent_activities.get(id))
    }

    pub fn busy_session_count(&self) -> usize {
        self.agent_activities
            .values()
            .filter(|activity| activity.phase.is_busy())
            .count()
    }

    pub fn start_agent_activity(&mut self, session_id: &str) {
        self.agent_activities
            .insert(session_id.to_string(), AgentActivity::new());
    }

    pub fn activity_mut(&mut self, session_id: &str) -> &mut AgentActivity {
        self.agent_activities
            .entry(session_id.to_string())
            .or_default()
    }

    pub fn stage_orchestration_tool(&mut self, session_id: &str, tool_name: &str, arguments: &str) {
        if !matches!(tool_name, "spawn_background_task" | "spawn_parallel_task") {
            return;
        }
        let Ok(value) = serde_json::from_str::<serde_json::Value>(arguments) else {
            return;
        };
        let now = chrono::Utc::now().timestamp_millis();
        let pending = if tool_name == "spawn_parallel_task" {
            let objective = value["objective"]
                .as_str()
                .unwrap_or("并行任务")
                .to_string();
            let branches = value["branches"]
                .as_array()
                .into_iter()
                .flatten()
                .enumerate()
                .map(|(index, branch)| BranchActivity {
                    branch_id: branch["branch_id"]
                        .as_str()
                        .map(str::to_string)
                        .unwrap_or_else(|| format!("branch-{}", index + 1)),
                    task: branch["task"].as_str().unwrap_or("分支任务").to_string(),
                    target: target_label(branch.get("target"), session_id),
                    status: BranchStatus::Running,
                    started_at_ms: now,
                    completed_at_ms: None,
                    result: None,
                })
                .collect();
            PendingBackgroundTask {
                kind: OrchestrationKind::Parallel,
                objective,
                branches,
            }
        } else {
            let task = value["task"].as_str().unwrap_or("后台任务").to_string();
            PendingBackgroundTask {
                kind: OrchestrationKind::Background,
                objective: task.clone(),
                branches: vec![BranchActivity {
                    branch_id: "main".into(),
                    task,
                    target: target_label(value.get("target"), session_id),
                    status: BranchStatus::Running,
                    started_at_ms: now,
                    completed_at_ms: None,
                    result: None,
                }],
            }
        };
        self.pending_background_tasks
            .insert(session_id.to_string(), pending);
    }

    pub fn start_background_task(
        &mut self,
        session_id: &str,
        task_id: &str,
        sequence: u64,
        branch_count: usize,
        objective: &str,
        created_at_ms: i64,
    ) {
        let pending = self.pending_background_tasks.remove(session_id);
        let kind = pending
            .as_ref()
            .map(|task| task.kind)
            .unwrap_or(if branch_count > 1 {
                OrchestrationKind::Parallel
            } else {
                OrchestrationKind::Background
            });
        let pending_objective = pending.as_ref().map(|task| task.objective.clone());
        let mut branches = pending.map(|task| task.branches).unwrap_or_else(|| {
            (0..branch_count.max(1))
                .map(|index| BranchActivity {
                    branch_id: format!("branch-{}", index + 1),
                    task: String::new(),
                    target: "源会话".into(),
                    status: BranchStatus::Running,
                    started_at_ms: created_at_ms,
                    completed_at_ms: None,
                    result: None,
                })
                .collect()
        });
        for branch in &mut branches {
            branch.started_at_ms = created_at_ms;
        }
        self.push_orchestration(OrchestrationActivity {
            id: task_id.to_string(),
            sequence: Some(sequence),
            session_id: session_id.to_string(),
            kind,
            objective: if objective.trim().is_empty() {
                pending_objective.unwrap_or_else(|| "后台任务".into())
            } else {
                objective.to_string()
            },
            status: OrchestrationStatus::Running,
            created_at_ms,
            completed_at_ms: None,
            integrated_at_ms: None,
            branches,
            updated_at: std::time::Instant::now(),
        });
    }

    pub fn complete_background_task(&mut self, task_id: &str, success: bool, completed_at_ms: i64) {
        let Some(task) = self
            .orchestration_tasks
            .iter_mut()
            .find(|task| task.id == task_id)
        else {
            return;
        };
        task.status = OrchestrationStatus::AwaitingIntegration;
        task.completed_at_ms = Some(completed_at_ms);
        task.updated_at = std::time::Instant::now();
        for branch in &mut task.branches {
            if branch.status == BranchStatus::Running {
                branch.status = if success {
                    BranchStatus::Succeeded
                } else {
                    BranchStatus::Completed
                };
                branch.completed_at_ms = Some(completed_at_ms);
            }
        }
    }

    pub fn integrate_background_task(
        &mut self,
        task_id: &str,
        success: bool,
        integrated_at_ms: i64,
    ) {
        let Some(task) = self
            .orchestration_tasks
            .iter_mut()
            .find(|task| task.id == task_id)
        else {
            return;
        };
        task.status = if success {
            OrchestrationStatus::Integrated
        } else {
            OrchestrationStatus::Failed
        };
        task.integrated_at_ms = Some(integrated_at_ms);
        task.updated_at = std::time::Instant::now();
    }

    /// Update branch outcomes from the structured background hook.
    pub fn apply_background_hook(&mut self, content: &str) -> bool {
        let Some(json) = content
            .trim()
            .strip_prefix("<background_task_event>")
            .and_then(|value| value.strip_suffix("</background_task_event>"))
        else {
            return false;
        };
        let Ok(value) = serde_json::from_str::<serde_json::Value>(json) else {
            return false;
        };
        let Some(task_id) = value["task_id"].as_str() else {
            return false;
        };
        let Some(task) = self
            .orchestration_tasks
            .iter_mut()
            .find(|task| task.id == task_id)
        else {
            return false;
        };
        if let Some(objective) = value["objective"].as_str() {
            task.objective = objective.to_string();
        }
        task.completed_at_ms =
            rfc3339_millis(value["completed_at"].as_str()).or(task.completed_at_ms);
        let cancelled = value["cancelled"].as_bool().unwrap_or(false);
        task.status = if cancelled {
            OrchestrationStatus::Cancelled
        } else {
            OrchestrationStatus::AwaitingIntegration
        };
        for delivery in value["deliveries"].as_array().into_iter().flatten() {
            let Some(branch_id) = delivery["branch_id"].as_str() else {
                continue;
            };
            let index = task
                .branches
                .iter()
                .position(|branch| branch.branch_id == branch_id)
                .unwrap_or_else(|| {
                    task.branches.push(BranchActivity {
                        branch_id: branch_id.to_string(),
                        task: String::new(),
                        target: String::new(),
                        status: BranchStatus::Completed,
                        started_at_ms: task.created_at_ms,
                        completed_at_ms: task.completed_at_ms,
                        result: None,
                    });
                    task.branches.len() - 1
                });
            let branch = &mut task.branches[index];
            branch.target = target_label(delivery.get("target"), &task.session_id);
            branch.status = if cancelled {
                BranchStatus::Cancelled
            } else if delivery["success"].as_bool().unwrap_or(false) {
                BranchStatus::Succeeded
            } else {
                BranchStatus::Failed
            };
            branch.started_at_ms =
                rfc3339_millis(delivery["started_at"].as_str()).unwrap_or(branch.started_at_ms);
            branch.completed_at_ms =
                rfc3339_millis(delivery["completed_at"].as_str()).or(branch.completed_at_ms);
            branch.result = delivery["result"]
                .as_str()
                .map(|result| bounded(result, 4_000));
        }
        task.updated_at = std::time::Instant::now();
        true
    }

    pub fn start_subagent(&mut self, session_id: &str, task: &str) {
        self.next_subagent_sequence = self.next_subagent_sequence.saturating_add(1);
        let now = chrono::Utc::now().timestamp_millis();
        let sequence = self.next_subagent_sequence;
        self.push_orchestration(OrchestrationActivity {
            id: format!("subagent-{sequence}"),
            sequence: None,
            session_id: session_id.to_string(),
            kind: OrchestrationKind::Subagent,
            objective: task.to_string(),
            status: OrchestrationStatus::Running,
            created_at_ms: now,
            completed_at_ms: None,
            integrated_at_ms: None,
            branches: vec![BranchActivity {
                branch_id: "subagent".into(),
                task: task.to_string(),
                target: "父 Agent".into(),
                status: BranchStatus::Running,
                started_at_ms: now,
                completed_at_ms: None,
                result: None,
            }],
            updated_at: std::time::Instant::now(),
        });
    }

    pub fn start_reply_branch(
        &mut self,
        session_id: &str,
        branch_id: &str,
        message_sequence: u64,
        task: &str,
        target: &str,
        started_at_ms: i64,
    ) {
        self.push_orchestration(OrchestrationActivity {
            id: branch_id.to_string(),
            sequence: Some(message_sequence),
            session_id: session_id.to_string(),
            kind: OrchestrationKind::ReplyBranch,
            objective: task.to_string(),
            status: OrchestrationStatus::Running,
            created_at_ms: started_at_ms,
            completed_at_ms: None,
            integrated_at_ms: None,
            branches: vec![BranchActivity {
                branch_id: "reply".into(),
                task: task.to_string(),
                target: target.to_string(),
                status: BranchStatus::Running,
                started_at_ms,
                completed_at_ms: None,
                result: None,
            }],
            updated_at: std::time::Instant::now(),
        });
    }

    pub fn complete_reply_branch(
        &mut self,
        branch_id: &str,
        success: bool,
        cancelled: bool,
        completed_at_ms: i64,
    ) {
        let Some(task) = self
            .orchestration_tasks
            .iter_mut()
            .find(|task| task.id == branch_id)
        else {
            return;
        };
        task.status = if cancelled {
            OrchestrationStatus::Cancelled
        } else if success {
            OrchestrationStatus::Completed
        } else {
            OrchestrationStatus::Failed
        };
        task.completed_at_ms = Some(completed_at_ms);
        task.updated_at = std::time::Instant::now();
        if let Some(branch) = task.branches.first_mut() {
            branch.status = if cancelled {
                BranchStatus::Cancelled
            } else if success {
                BranchStatus::Succeeded
            } else {
                BranchStatus::Failed
            };
            branch.completed_at_ms = Some(completed_at_ms);
        }
    }

    pub fn attach_reply_branch_content(&mut self, branch_id: &str, content: &str) {
        let Some(task) = self
            .orchestration_tasks
            .iter_mut()
            .find(|task| task.id == branch_id && task.kind == OrchestrationKind::ReplyBranch)
        else {
            return;
        };
        if let Some(branch) = task.branches.first_mut() {
            branch.result = Some(bounded(content, 4_000));
        }
        task.updated_at = std::time::Instant::now();
    }

    pub fn has_running_reply_branches(&self, session_id: &str) -> bool {
        self.orchestration_tasks.iter().any(|task| {
            task.session_id == session_id
                && task.kind == OrchestrationKind::ReplyBranch
                && task.status == OrchestrationStatus::Running
        })
    }

    pub fn complete_subagent(&mut self, session_id: &str, success: bool) {
        let Some(task) = self.orchestration_tasks.iter_mut().rev().find(|task| {
            task.session_id == session_id
                && task.kind == OrchestrationKind::Subagent
                && task.status == OrchestrationStatus::Running
        }) else {
            return;
        };
        let now = chrono::Utc::now().timestamp_millis();
        task.status = if success {
            OrchestrationStatus::Completed
        } else {
            OrchestrationStatus::Failed
        };
        task.completed_at_ms = Some(now);
        task.updated_at = std::time::Instant::now();
        if let Some(branch) = task.branches.first_mut() {
            branch.status = if success {
                BranchStatus::Succeeded
            } else {
                BranchStatus::Failed
            };
            branch.completed_at_ms = Some(now);
        }
    }

    pub fn attach_subagent_result(&mut self, session_id: &str, result: &str) {
        let Some(task) =
            self.orchestration_tasks.iter_mut().rev().find(|task| {
                task.session_id == session_id && task.kind == OrchestrationKind::Subagent
            })
        else {
            return;
        };
        if let Some(branch) = task.branches.first_mut() {
            branch.result = Some(bounded(result, 4_000));
        }
        task.updated_at = std::time::Instant::now();
    }

    pub fn discard_staged_background(&mut self, session_id: &str) {
        self.pending_background_tasks.remove(session_id);
    }

    pub fn selected_orchestration(&self) -> Option<&OrchestrationActivity> {
        self.orchestration_tasks
            .iter()
            .rev()
            .nth(self.task_inspector_selection)
    }

    pub fn active_orchestration_count(&self) -> usize {
        self.orchestration_tasks
            .iter()
            .filter(|task| task.status.is_active())
            .count()
    }

    pub fn point_in_task_bar(&self, x: u16, y: u16) -> bool {
        let area = self.task_bar_area;
        area.width > 0
            && x >= area.x
            && x < area.x.saturating_add(area.width)
            && y >= area.y
            && y < area.y.saturating_add(area.height)
    }

    fn push_orchestration(&mut self, task: OrchestrationActivity) {
        self.orchestration_tasks.push(task);
        if self.orchestration_tasks.len() > MAX_ORCHESTRATION_HISTORY {
            let excess = self.orchestration_tasks.len() - MAX_ORCHESTRATION_HISTORY;
            self.orchestration_tasks.drain(..excess);
        }
        self.task_inspector_selection = self
            .task_inspector_selection
            .min(self.orchestration_tasks.len().saturating_sub(1));
    }

    pub fn push_message(&mut self, session_id: &str, msg: DisplayMessage) {
        let is_active = self.active_session_id.as_deref() == Some(session_id);
        self.messages
            .entry(session_id.to_string())
            .or_default()
            .push(msg.clone());
        if is_active {
            self.chat_scroll = 0;
            self.chat_flash_until = Some(std::time::Instant::now() + Duration::from_millis(700));
        }
        // Mirror into the global trunk timeline so the Trunk view shows every
        // source's conversation in one ordered stream. The trunk itself is not
        // mirrored (that would duplicate its own entries).
        if session_id != TRUNK_SESSION_ID {
            let trunk = self
                .messages
                .entry(TRUNK_SESSION_ID.to_string())
                .or_default();
            trunk.push(msg);
            if trunk.len() > TRUNK_MAX_MESSAGES {
                trunk.drain(..trunk.len() - TRUNK_MAX_MESSAGES);
            }
        }
    }

    /// Push or update the interactive form as a chat message.
    pub fn refresh_menu_msg(&mut self) {
        if !self.form_overlay.is_active() {
            return;
        }
        let sid = self
            .active_session_id
            .clone()
            .unwrap_or_else(|| "local:tui::local_user".into());
        if self.active_session_id.is_none() {
            self.active_session_id = Some(sid.clone());
        }
        let text = self.form_overlay.render_text();

        if self.menu_msg_idx >= 0 {
            if let Some(msgs) = self.messages.get_mut(&sid) {
                let idx = self.menu_msg_idx as usize;
                if idx < msgs.len() {
                    msgs[idx].content = text;
                    msgs[idx].time = chrono::Utc::now().timestamp();
                    return;
                }
            }
        }
        self.push_message(
            &sid,
            DisplayMessage::plain(MsgRole::System, text, chrono::Utc::now().timestamp()),
        );
        self.menu_msg_idx = (self.messages.get(&sid).map(|m| m.len()).unwrap_or(1) - 1) as isize;
    }

    // ── Mouse selection helpers ────────────────────────────────────────

    pub fn point_in_conv(&self, x: u16, y: u16) -> bool {
        let a = self.conv_area;
        x >= a.x
            && x < a.x.saturating_add(a.width)
            && y >= a.y.saturating_add(1)
            && y < a.y.saturating_add(a.height)
    }

    pub fn row_index_from_screen(&self, my: u16) -> Option<usize> {
        if self.conv_text.is_empty() {
            return None;
        }
        let a = self.conv_area;
        let inner_h = a.height.saturating_sub(1) as i16;
        if inner_h <= 0 {
            return None;
        }
        let iy0 = a.y + 1;
        let y = my.clamp(iy0, iy0 + inner_h as u16 - 1);
        let mut idx = self.conv_top + (y - iy0) as usize;
        let last = self.conv_text.len() - 1;
        if idx > last {
            idx = last;
        }
        Some(idx)
    }
    pub fn no_modal(&self) -> bool {
        !self.show_palette
            && !self.show_help
            && !self.show_settings
            && !self.show_slash
            && !self.show_task_inspector
            && !self.show_checklist_panel
    }
    /// Replace checklist state from a `ChecklistUpdated` event snapshot.
    pub fn apply_checklist_state(&mut self, state: &serde_json::Value) {
        let Some(lists) = state["lists"].as_array() else {
            return;
        };
        let parsed = lists
            .iter()
            .filter_map(|list| {
                let name = list["name"].as_str()?.to_string();
                let items = list["items"]
                    .as_array()?
                    .iter()
                    .filter_map(|item| {
                        Some(ChecklistItemEntry {
                            text: item["text"].as_str()?.to_string(),
                            done: item["done"].as_bool().unwrap_or(false),
                        })
                    })
                    .collect::<Vec<_>>();
                let done = items.iter().filter(|item| item.done).count();
                Some(ChecklistEntry {
                    name,
                    total: items.len(),
                    done,
                    items,
                })
            })
            .collect::<Vec<_>>();
        self.checklists = parsed;
        self.checklist_selection = self
            .checklist_selection
            .min(self.checklists.len().saturating_sub(1));
        self.checklist_scroll = 0;
    }
    pub fn col_from_screen(&self, mx: u16) -> usize {
        let inner_w = self.conv_area.width.max(1) as i64;
        let offset = (mx as i64) - (self.conv_area.x as i64);
        (offset.max(0) as usize).min((inner_w - 1).max(0) as usize)
    }

    pub fn begin_selection(&mut self, mx: u16, my: u16) {
        if let Some(row) = self.row_index_from_screen(my) {
            let col = self.col_from_screen(mx);
            self.sel_anchor = Some((row, col));
            self.sel_other = Some((row, col));
            self.selecting = true;
        }
    }

    pub fn update_selection(&mut self, mx: u16, my: u16) {
        if let Some(row) = self.row_index_from_screen(my) {
            let col = self.col_from_screen(mx);
            self.sel_other = Some((row, col));
        }
    }

    pub fn clear_selection(&mut self) {
        self.selecting = false;
        self.sel_anchor = None;
        self.sel_other = None;
    }

    pub fn selection_rect(&self) -> Option<(usize, usize, usize, usize)> {
        if !self.selecting {
            return None;
        }
        let a = self.sel_anchor?;
        let b = self.sel_other?;
        if self.conv_text.is_empty() {
            return None;
        }
        let last = self.conv_text.len() - 1;
        let (ar, ac) = (a.0.min(last), a.1);
        let (br, bc) = (b.0.min(last), b.1);
        if (ar, ac) <= (br, bc) {
            Some((ar, ac, br, bc))
        } else {
            Some((br, bc, ar, ac))
        }
    }

    pub fn finish_selection(&mut self) {
        let Some((sr, sc, er, ec)) = self.selection_rect() else {
            self.clear_selection();
            return;
        };
        let lines = &self.conv_text;
        let text = if sr == er {
            let s = &lines[sr];
            s[util::col_to_byte(s, sc)..util::col_to_byte(s, ec)].to_string()
        } else {
            let mut parts: Vec<String> = Vec::new();
            let s0 = &lines[sr];
            parts.push(s0[util::col_to_byte(s0, sc)..].to_string());
            parts.extend(lines[sr + 1..er].iter().cloned());
            let sn = &lines[er];
            parts.push(sn[..util::col_to_byte(sn, ec)].to_string());
            parts.join("\n")
        };
        if !text.trim().is_empty() {
            crate::clipboard::copy_to_clipboard(&text);
        }
        self.clear_selection();
    }

    /// Load session messages from the persistence file.
    pub fn load_session_messages(&mut self, session_id: &str) {
        use std::path::PathBuf;
        let path = PathBuf::from("echo-sessions.json");
        if !path.exists() {
            let path = PathBuf::from("config/echo-sessions.json");
            if !path.exists() {
                return;
            }
            self.load_from_file(&path, session_id);
        } else {
            self.load_from_file(&path, session_id);
        }
    }

    fn load_from_file(&mut self, path: &std::path::PathBuf, session_id: &str) {
        let Ok(data) = std::fs::read_to_string(path) else {
            return;
        };
        let Ok(root) = serde_json::from_str::<serde_json::Value>(&data) else {
            return;
        };
        let Some((sessions, shared_history)) = (match &root {
            serde_json::Value::Array(sessions) => Some((sessions, None)),
            serde_json::Value::Object(_) => root["sessions"]
                .as_array()
                .map(|sessions| (sessions, root["shared_history"].as_array())),
            _ => None,
        }) else {
            return;
        };
        for s in sessions {
            let Some(id) = s["id"].as_str() else { continue };
            if id != session_id {
                continue;
            }
            let Some(history) = shared_history.or_else(|| s["history"].as_array()) else {
                continue;
            };
            let msgs = self.messages.entry(session_id.to_string()).or_default();
            msgs.clear();
            for m in history {
                let role = match m["role"].as_str().unwrap_or("user") {
                    "user" => MsgRole::User,
                    "assistant" => MsgRole::Backend,
                    "tool" => MsgRole::Tool,
                    _ => MsgRole::System,
                };
                let content = history_display_content(m["content"].as_str().unwrap_or(""));
                msgs.push(DisplayMessage::plain(role, content, 0));
            }
            return;
        }
    }

    pub fn toast(&mut self, text: impl Into<String>, _kind: ToastKind) {
        let text: String = text.into();
        let text: String = text.chars().take(4096).collect();
        let session_id = self
            .active_session_id
            .clone()
            .unwrap_or_else(|| "local:tui::local_user".into());
        if self.active_session_id.is_none() {
            self.active_session_id = Some(session_id.clone());
        }
        if !self.sessions.iter().any(|s| s.id == session_id) {
            self.sessions.push(SessionInfo {
                id: session_id.clone(),
                platform: "local".into(),
                scope: "tui".into(),
                user_id: "local_user".into(),
                nickname: "EchoAgent".into(),
                group_name: None,
                last_active: chrono::Utc::now().timestamp(),
                last_message: text.clone(),
            });
        }
        self.push_message(
            &session_id,
            DisplayMessage::plain(MsgRole::System, text, chrono::Utc::now().timestamp()),
        );
    }

    /// Switch to a session by id — resets scroll and deactivates form.
    pub fn do_session_switch(&mut self, session_id: &str) {
        self.active_session_id = Some(session_id.to_string());
        self.chat_scroll = 0;
        self.form_overlay.deactivate();
        self.menu_msg_idx = -1;
    }

    /// Exit any active config mode.
    pub fn exit_config_mode(&mut self) {
        self.mode = ConversationMode::Normal;
        self.menu_msg_idx = -1;
    }

    /// All sessions sorted by last_active descending; the global trunk
    /// timeline is always pinned to the top.
    pub fn sorted_sessions(&self) -> Vec<SessionInfo> {
        let mut sessions = self.sessions.clone();
        sessions.sort_by(|a, b| b.last_active.cmp(&a.last_active));
        if let Some(index) = sessions.iter().position(|s| s.id == TRUNK_SESSION_ID) {
            let trunk = sessions.remove(index);
            sessions.insert(0, trunk);
        }
        sessions
    }

    /// Number of messages currently held in the global trunk timeline.
    pub fn trunk_message_count(&self) -> usize {
        self.messages.get(TRUNK_SESSION_ID).map_or(0, Vec::len)
    }

    /// Condensed list of still-active temporary branches for the trunk
    /// overview. Reply branches and subagents are one entry; background and
    /// parallel tasks list every still-running sub-branch.
    pub fn active_branches(&self) -> Vec<ActiveBranchSummary> {
        let mut out = Vec::new();
        for task in &self.orchestration_tasks {
            if !task.status.is_active() {
                continue;
            }
            match task.kind {
                OrchestrationKind::ReplyBranch | OrchestrationKind::Subagent => {
                    out.push(ActiveBranchSummary {
                        kind: task.kind,
                        label: task_short_label(task),
                        target: task
                            .branches
                            .first()
                            .map(|branch| branch.target.clone())
                            .unwrap_or_default(),
                        status: task.status,
                        created_at_ms: task.created_at_ms,
                        objective: task.objective.clone(),
                    });
                }
                OrchestrationKind::Background | OrchestrationKind::Parallel => {
                    for branch in task
                        .branches
                        .iter()
                        .filter(|branch| branch.status == BranchStatus::Running)
                    {
                        out.push(ActiveBranchSummary {
                            kind: task.kind,
                            label: branch.branch_id.clone(),
                            target: branch.target.clone(),
                            status: task.status,
                            created_at_ms: task.created_at_ms,
                            objective: task.objective.clone(),
                        });
                    }
                }
            }
        }
        out
    }
}

fn task_short_label(task: &OrchestrationActivity) -> String {
    if let Some(sequence) = task.sequence {
        format!("#{sequence}")
    } else if let Some(sequence) = task.id.strip_prefix("subagent-") {
        format!("S{sequence}")
    } else {
        task.id.get(..8).unwrap_or(&task.id).to_string()
    }
}

fn target_label(target: Option<&serde_json::Value>, origin_session: &str) -> String {
    let Some(target) = target else {
        return "源会话".into();
    };
    match target["kind"].as_str().unwrap_or_default() {
        "backend" => {
            let session = target["session_id"]
                .as_str()
                .or_else(|| target["id"].as_str())
                .unwrap_or(origin_session);
            if session == origin_session {
                "源会话".into()
            } else {
                format!("后台 {session}")
            }
        }
        "qq_private" => format!(
            "QQ 私聊 {}",
            target["user_id"]
                .as_str()
                .or_else(|| target["id"].as_str())
                .unwrap_or("未知")
        ),
        "qq_group" => format!(
            "QQ 群 {}",
            target["group_id"]
                .as_str()
                .or_else(|| target["id"].as_str())
                .unwrap_or("未知")
        ),
        "origin" => "源会话".into(),
        _ => "源会话".into(),
    }
}

fn rfc3339_millis(value: Option<&str>) -> Option<i64> {
    chrono::DateTime::parse_from_rfc3339(value?)
        .ok()
        .map(|time| time.timestamp_millis())
}

fn bounded(value: &str, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        value.to_string()
    } else {
        value.chars().take(max_chars).collect::<String>() + "…"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::keybindings::Keybindings;
    use crate::theme::Theme;

    fn state() -> AppState {
        AppState::new(Theme::dark(), Keybindings::default())
    }

    fn session(id: &str, last_active: i64) -> SessionInfo {
        SessionInfo {
            id: id.into(),
            platform: "qq".into(),
            nickname: id.into(),
            scope: "dm".into(),
            user_id: "1".into(),
            group_name: None,
            last_active,
            last_message: String::new(),
        }
    }

    #[test]
    fn active_messages_returns_empty_without_session() {
        let st = state();
        assert!(st.active_messages().is_empty());
        assert!(st.active_session().is_none());
    }

    #[test]
    fn primary_session_is_pinned_before_remote_sessions_arrive() {
        let mut st = state();
        st.ensure_primary_session();
        st.sessions.push(session("qq:dm::100", 10));
        assert_eq!(st.active_session_id.as_deref(), Some(PRIMARY_SESSION_ID));
        assert_eq!(st.active_session().unwrap().platform, "local");
    }

    #[test]
    fn completed_activity_freezes_total_elapsed_time() {
        let mut activity = AgentActivity::new();
        activity.turn_started_at = std::time::Instant::now() - Duration::from_secs(2);
        activity.transition(AgentPhase::Completed, None);
        let completed_elapsed = activity.total_elapsed();
        activity.turn_started_at -= Duration::from_secs(30);
        assert_eq!(activity.total_elapsed(), completed_elapsed);
    }

    #[test]
    fn push_message_scrolls_to_bottom_and_flashes() {
        let mut st = state();
        st.active_session_id = Some("s1".into());
        st.chat_scroll = 50;
        st.push_message("s1", DisplayMessage::plain(MsgRole::User, "hi", 0));
        assert_eq!(st.chat_scroll, 0, "new message snaps to bottom");
        assert!(st.chat_flash_until.is_some());
        assert_eq!(st.active_messages().len(), 1);
        assert_eq!(st.active_messages()[0].content, "hi");
    }

    #[test]
    fn background_message_does_not_move_the_primary_chat() {
        let mut st = state();
        st.ensure_primary_session();
        st.chat_scroll = 12;
        st.chat_flash_until = None;
        st.push_message(
            "qq:dm::100",
            DisplayMessage::plain(MsgRole::User, "background", 0),
        );
        assert_eq!(st.chat_scroll, 12);
        assert!(st.chat_flash_until.is_none());
        assert!(st.active_messages().is_empty());
    }

    #[test]
    fn active_session_finds_by_id() {
        let mut st = state();
        st.sessions.push(session("a", 1));
        st.sessions.push(session("b", 2));
        st.active_session_id = Some("b".into());
        assert_eq!(st.active_session().unwrap().id, "b");
        st.active_session_id = Some("missing".into());
        assert!(st.active_session().is_none());
    }

    #[test]
    fn refresh_menu_msg_inserts_or_updates() {
        let mut st = state();
        let mut fo = crate::components::form_overlay::FormOverlay::default();
        fo.activate(
            "t",
            vec![crate::components::form_overlay::SelectItem {
                label: "x".into(),
                value: "y".into(),
            }],
            crate::components::form_overlay::FormKind::QqFilter,
        );
        st.form_overlay = fo;
        st.refresh_menu_msg();
        assert_eq!(st.active_messages().len(), 1);
        assert_eq!(st.menu_msg_idx, 0);
        let first = st.active_messages()[0].content.clone();
        assert!(first.contains("t"));

        // Second refresh updates the same message instead of appending.
        st.refresh_menu_msg();
        assert_eq!(st.active_messages().len(), 1, "updated in place");
    }

    #[test]
    fn point_in_conv_uses_area_bounds() {
        let mut st = state();
        st.conv_area = ratatui::layout::Rect::new(0, 0, 80, 20);
        assert!(st.point_in_conv(10, 5));
        assert!(!st.point_in_conv(90, 5), "outside width");
        assert!(!st.point_in_conv(10, 0), "above header row");
        assert!(!st.point_in_conv(10, 25), "below area");
    }

    #[test]
    fn row_index_maps_screen_to_text_row() {
        let mut st = state();
        st.conv_area = ratatui::layout::Rect::new(0, 0, 80, 20);
        st.conv_text = (0..30).map(|i| format!("line {i}")).collect();
        st.conv_top = 10;
        // Row 5 on screen → text row 10 + (5 - header offset 1) = 14.
        assert_eq!(st.row_index_from_screen(5), Some(14));
        // Beyond the visible area clamps to the last visible row (28),
        // then selection_rect would clamp to the last text line.
        assert_eq!(st.row_index_from_screen(100), Some(28));
    }

    #[test]
    fn col_from_screen_clamps_to_width() {
        let mut st = state();
        st.conv_area = ratatui::layout::Rect::new(5, 0, 40, 10);
        assert_eq!(st.col_from_screen(5), 0);
        assert_eq!(st.col_from_screen(20), 15);
        assert_eq!(st.col_from_screen(100), 39, "clamped to inner width");
        assert_eq!(st.col_from_screen(0), 0, "clamped to 0");
    }

    #[test]
    fn selection_rect_normalizes_anchor_order() {
        let mut st = state();
        st.conv_area = ratatui::layout::Rect::new(0, 0, 80, 20);
        st.conv_text = vec!["aaa".into(), "bbb".into()];
        st.begin_selection(5, 3); // row 2? header offset → row 2-1=1
        st.update_selection(2, 2); // earlier row
        let rect = st.selection_rect().expect("selection active");
        // Anchor (later) and other (earlier) are normalised.
        assert!(rect.0 <= rect.2, "start row <= end row");
        assert!(st.selecting);
    }

    #[test]
    fn clear_selection_resets_state() {
        let mut st = state();
        st.conv_area = ratatui::layout::Rect::new(0, 0, 80, 20);
        st.conv_text = vec!["x".into()];
        st.begin_selection(1, 1);
        assert!(st.selecting);
        st.clear_selection();
        assert!(!st.selecting);
        assert!(st.selection_rect().is_none());
    }

    #[test]
    fn do_session_switch_resets_view_state() {
        let mut st = state();
        st.chat_scroll = 42;
        st.menu_msg_idx = 3;
        st.do_session_switch("s2");
        assert_eq!(st.active_session_id.as_deref(), Some("s2"));
        assert_eq!(st.chat_scroll, 0);
        assert!(!st.form_overlay.is_active());
        assert_eq!(st.menu_msg_idx, -1);
    }

    #[test]
    fn exit_config_mode_returns_to_normal() {
        let mut st = state();
        st.mode = ConversationMode::ApiConfig;
        st.menu_msg_idx = 5;
        st.exit_config_mode();
        assert_eq!(st.mode, ConversationMode::Normal);
        assert_eq!(st.menu_msg_idx, -1);
    }

    #[test]
    fn sorted_sessions_orders_by_recency() {
        let mut st = state();
        st.sessions.push(session("old", 100));
        st.sessions.push(session("new", 300));
        st.sessions.push(session("mid", 200));
        let sorted = st.sorted_sessions();
        assert_eq!(sorted[0].id, "new");
        assert_eq!(sorted[1].id, "mid");
        assert_eq!(sorted[2].id, "old");
    }

    #[test]
    fn trunk_session_is_pinned_to_the_top_of_the_list() {
        let mut st = state();
        st.ensure_trunk_session();
        st.sessions.push(session("qq:dm::1", 300));
        st.sessions.push(session("qq:dm::2", 200));
        let sorted = st.sorted_sessions();
        assert_eq!(sorted[0].id, TRUNK_SESSION_ID, "trunk always pinned on top");
        assert_eq!(sorted[1].id, "qq:dm::1");
    }

    #[test]
    fn push_message_mirrors_into_the_trunk_timeline() {
        let mut st = state();
        st.ensure_trunk_session();
        st.push_message("qq:dm::1", DisplayMessage::plain(MsgRole::User, "hello", 0));
        st.push_message("qq:dm::1", DisplayMessage::plain(MsgRole::Backend, "hi", 0));
        assert_eq!(st.trunk_message_count(), 2);
        // The trunk itself does not self-mirror.
        assert_eq!(st.trunk_message_count(), 2);
        // A message pushed directly to the trunk is counted once, not mirrored again.
        st.push_message(
            TRUNK_SESSION_ID,
            DisplayMessage::plain(MsgRole::System, "x", 0),
        );
        assert_eq!(st.trunk_message_count(), 3);
    }

    #[test]
    fn active_branches_lists_running_reply_and_parallel_branches() {
        let mut st = state();
        st.start_reply_branch("s1", "reply-1", 1, "t", "QQ 私聊 100", 1_700_000_000_000);
        st.start_background_task("s1", "task-1", 2, 2, "o", 1_700_000_000_000);
        let branches = st.active_branches();
        // reply branch (1) + 2 running parallel sub-branches.
        assert_eq!(branches.len(), 3);
        assert!(
            branches
                .iter()
                .any(|b| b.kind == OrchestrationKind::ReplyBranch),
            "reply branch present"
        );
        assert!(
            branches
                .iter()
                .any(|b| b.kind == OrchestrationKind::Parallel),
            "parallel branches present"
        );
    }

    #[test]
    fn no_modal_false_when_any_overlay_open() {
        let mut st = state();
        assert!(st.no_modal());
        st.show_palette = true;
        assert!(!st.no_modal());
        st.show_palette = false;
        st.show_help = true;
        assert!(!st.no_modal());
        st.show_help = false;
        st.show_task_inspector = true;
        assert!(!st.no_modal());
    }

    #[test]
    fn parallel_tool_and_hook_preserve_branch_details() {
        let mut st = state();
        st.stage_orchestration_tool(
            "qq:private:100",
            "spawn_parallel_task",
            r#"{
                "objective":"分别回复",
                "branches":[
                    {"branch_id":"alice","task":"回复 Alice","target":{"kind":"qq_private","id":"101"}},
                    {"branch_id":"team","task":"回复群组","target":{"kind":"qq_group","id":"202"}}
                ]
            }"#,
        );
        st.start_background_task(
            "qq:private:100",
            "task-1",
            1,
            2,
            "分别回复",
            1_700_000_000_000,
        );
        assert_eq!(st.orchestration_tasks[0].kind, OrchestrationKind::Parallel);
        assert_eq!(st.orchestration_tasks[0].branches[0].target, "QQ 私聊 101");

        let hook = r#"<background_task_event>{
            "task_id":"task-1",
            "objective":"分别回复",
            "completed_at":"2023-11-14T22:13:23.000Z",
            "cancelled":false,
            "deliveries":[
                {"branch_id":"alice","target":{"kind":"qq_private","user_id":"101"},"success":true,"result":"done alice","started_at":"2023-11-14T22:13:20.000Z","completed_at":"2023-11-14T22:13:22.000Z"},
                {"branch_id":"team","target":{"kind":"qq_group","group_id":"202"},"success":false,"result":"send failed","started_at":"2023-11-14T22:13:20.000Z","completed_at":"2023-11-14T22:13:23.000Z"}
            ]
        }</background_task_event>"#;
        assert!(st.apply_background_hook(hook));
        let task = &st.orchestration_tasks[0];
        assert_eq!(task.status, OrchestrationStatus::AwaitingIntegration);
        assert_eq!(task.branches[0].status, BranchStatus::Succeeded);
        assert_eq!(task.branches[0].result.as_deref(), Some("done alice"));
        assert_eq!(task.branches[1].status, BranchStatus::Failed);
        assert_eq!(task.branches[1].target, "QQ 群 202");
    }

    #[test]
    fn subagent_lifecycle_is_retained_for_inspection() {
        let mut st = state();
        st.start_subagent("s1", "比较方案");
        assert_eq!(st.active_orchestration_count(), 1);
        st.complete_subagent("s1", true);
        st.attach_subagent_result("s1", "方案 A 更稳妥");
        let task = st.orchestration_tasks.last().unwrap();
        assert_eq!(task.kind, OrchestrationKind::Subagent);
        assert_eq!(task.status, OrchestrationStatus::Completed);
        assert_eq!(task.branches[0].result.as_deref(), Some("方案 A 更稳妥"));
    }

    #[test]
    fn persisted_structured_hooks_render_their_human_content() {
        assert_eq!(
            history_display_content(
                r#"<backend_message_hook>{"message_sequence":7,"content":"hello"}</backend_message_hook>"#
            ),
            "hello"
        );
        assert_eq!(
            history_display_content(
                r#"<background_task_event>{"objective":"prepare report"}</background_task_event>"#
            ),
            "prepare report"
        );
    }
}
