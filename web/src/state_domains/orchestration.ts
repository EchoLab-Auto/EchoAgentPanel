import type { AgentActivity, AgentPhase, OrchActivity, OrchKind, AppState } from '../state';
import { targetLabel } from './helpers';
// ── activity helpers ───────────────────────────────────────────────

export function activity(state: AppState, sessionId: string): AgentActivity {
  let act = state.activities[sessionId];
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
    state.activities[sessionId] = act;
  }
  return act;
}

export function setPhase(state: AppState, sessionId: string, phase: AgentPhase, detail: string | null) {
  const act = activity(state, sessionId);
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

export function startSubagent(state: AppState, sessionId: string, task: string) {
  state.nextSubagentSeq += 1;
  const now = Date.now();
  const sequence = state.nextSubagentSeq;
  pushTask(state, {
    id: `subagent-${sequence}`,
    sequence: null,
    sessionId,
    kind: 'subagent',
    objective: task,
    status: 'running',
    createdAtMs: now,
    completedAtMs: null,
    integratedAtMs: null,
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

export function completeSubagent(state: AppState, sessionId: string, success: boolean) {
  for (let i = state.tasks.length - 1; i >= 0; i--) {
    const task = state.tasks[i];
    if (
      task.sessionId === sessionId &&
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
    kind: 'reply',
    objective: taskText,
    status: 'running',
    createdAtMs: startedAtMs,
    completedAtMs: null,
    integratedAtMs: null,
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

export function startBackgroundTask(
  state: AppState,
  sessionId: string,
  taskId: string,
  sequence: number,
  branchCount: number,
  objective: string,
  createdAtMs: number,
) {
  const pending = state.pendingBackground[sessionId];
  delete state.pendingBackground[sessionId];
  const kind: OrchKind = pending
    ? pending.kind
    : branchCount > 1
      ? 'parallel'
      : 'background';
  const branches = pending
    ? pending.branches
    : Array.from({ length: Math.max(branchCount, 1) }, (_, index) => ({
        branchId: `branch-${index + 1}`,
        task: '',
        target: '源会话',
        status: 'running' as const,
        startedAtMs: createdAtMs,
        completedAtMs: null,
        result: null,
      }));
  branches.forEach((branch) => (branch.startedAtMs = createdAtMs));
  pushTask(state, {
    id: taskId,
    sequence,
    sessionId,
    kind,
    objective: objective.trim() ? objective : pending ? pending.objective : '后台任务',
    status: 'running',
    createdAtMs,
    completedAtMs: null,
    integratedAtMs: null,
    branches,
  });
}

export function completeBackgroundTask(
  state: AppState,
  taskId: string,
  success: boolean,
  completedAtMs: number,
) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.status = 'awaiting';
  task.completedAtMs = completedAtMs;
  task.branches.forEach((branch) => {
    if (branch.status === 'running') {
      branch.status = success ? 'succeeded' : 'completed';
      branch.completedAtMs = completedAtMs;
    }
  });
}

export function integrateBackgroundTask(
  state: AppState,
  taskId: string,
  success: boolean,
  integratedAtMs: number,
) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.status = success ? 'integrated' : 'failed';
  task.integratedAtMs = integratedAtMs;
}

export function stageOrchestrationTool(state: AppState, sessionId: string, toolName: string, argumentsJson: string) {
  if (toolName !== 'spawn_background_task' && toolName !== 'spawn_parallel_task') return;
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(argumentsJson) as Record<string, unknown>;
  } catch {
    return;
  }
  const now = Date.now();
  if (toolName === 'spawn_parallel_task') {
    const objective = String(value['objective'] ?? '并行任务');
    const branches = (value['branches'] as unknown[]) ?? [];
    state.pendingBackground[sessionId] = {
      kind: 'parallel',
      objective,
      branches: branches.map((raw, index) => {
        const branch = (raw ?? {}) as Record<string, unknown>;
        return {
          branchId: String(branch['branch_id'] ?? `branch-${index + 1}`),
          task: String(branch['task'] ?? '分支任务'),
          target: targetLabel(branch['target'], sessionId),
          status: 'running' as const,
          startedAtMs: now,
          completedAtMs: null,
          result: null,
        };
      }),
    };
  } else {
    const task = String(value['task'] ?? '后台任务');
    state.pendingBackground[sessionId] = {
      kind: 'background',
      objective: task,
      branches: [
        {
          branchId: 'main',
          task,
          target: targetLabel(value['target'], sessionId),
          status: 'running',
          startedAtMs: now,
          completedAtMs: null,
          result: null,
        },
      ],
    };
  }
}

