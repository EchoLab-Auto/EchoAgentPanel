import type { AgentActivity, AgentPhase, OrchActivity, AppState } from '../state';
// ── activity helpers ───────────────────────────────────────────────

/**
 * 取/建活动态。`key` 必须是复合会话键 `sessionKey(core, session_id)`——
 * 同名会话（如每个 core 都有的 `local:tui::local_user`）跨 core 时不能互相
 * 覆盖运行态。
 */
export function activity(state: AppState, key: string): AgentActivity {
  let act = state.activities[key];
  if (!act) {
    act = {
      phase: 'thinking',
      detail: null,
      startedAt: Date.now(),
      toolsCompleted: 0,
      subagentsCompleted: 0,
      promptTokens: 0,
      completionTokens: 0,
    };
    state.activities[key] = act;
  }
  return act;
}

export function setPhase(state: AppState, key: string, phase: AgentPhase, detail: string | null) {
  const act = activity(state, key);
  act.phase = phase;
  act.detail = detail;
}

// ── orchestration helpers ──────────────────────────────────────────────────

export function pushTask(state: AppState, task: OrchActivity) {
  state.tasks.push(task);
  if (state.tasks.length > 128) {
    state.tasks.splice(0, state.tasks.length - 128);
  }
}

export function startSubagent(state: AppState, sessionId: string, core: string | null, task: string) {
  state.nextSubagentSeq += 1;
  const now = Date.now();
  const sequence = state.nextSubagentSeq;
  pushTask(state, {
    id: `subagent-${sequence}`,
    sequence: null,
    sessionId,
    core,
    kind: 'subagent',
    objective: task,
    status: 'running',
    createdAtMs: now,
    completedAtMs: null,
    branches: [
      {
        branchId: 'subagent',
        task,
        target: '父 Agent',
        status: 'running',
        startedAtMs: now,
        completedAtMs: null,
        result: null,
      },
    ],
  });
}

export function completeSubagent(
  state: AppState,
  sessionId: string,
  core: string | null,
  success: boolean,
) {
  for (let i = state.tasks.length - 1; i >= 0; i--) {
    const task = state.tasks[i];
    if (
      task.sessionId === sessionId &&
      (task.core ?? null) === core &&
      task.kind === 'subagent' &&
      task.status === 'running'
    ) {
      task.status = success ? 'completed' : 'failed';
      task.completedAtMs = Date.now();
      const branch = task.branches[0];
      if (branch) {
        branch.status = success ? 'succeeded' : 'failed';
        branch.completedAtMs = task.completedAtMs;
      }
      return;
    }
  }
}

export function startReplyBranch(
  state: AppState,
  sessionId: string,
  core: string | null,
  branchId: string,
  messageSequence: number,
  taskText: string,
  target: string,
  startedAtMs: number,
) {
  pushTask(state, {
    id: branchId,
    sequence: messageSequence,
    sessionId,
    core,
    kind: 'reply',
    objective: taskText,
    status: 'running',
    createdAtMs: startedAtMs,
    completedAtMs: null,
    branches: [
      {
        branchId: 'reply',
        task: taskText,
        target,
        status: 'running',
        startedAtMs,
        completedAtMs: null,
        result: null,
      },
    ],
  });
}

export function completeReplyBranch(
  state: AppState,
  branchId: string,
  success: boolean,
  cancelled: boolean,
  completedAtMs: number,
) {
  const task = state.tasks.find((t) => t.id === branchId);
  if (!task) return;
  task.status = cancelled ? 'cancelled' : success ? 'completed' : 'failed';
  task.completedAtMs = completedAtMs;
  const branch = task.branches[0];
  if (branch) {
    branch.status = cancelled ? 'cancelled' : success ? 'succeeded' : 'failed';
    branch.completedAtMs = completedAtMs;
  }
}

