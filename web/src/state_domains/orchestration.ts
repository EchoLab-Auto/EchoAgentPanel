import type { AgentActivity, AgentPhase, AppState } from '../state';
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
