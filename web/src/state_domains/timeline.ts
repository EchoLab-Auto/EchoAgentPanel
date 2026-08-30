import type { AppState, DisplayMessage, MsgRole } from '../state';
import type { TimelineMessage } from '../protocol';
import { bounded } from './helpers';
// ── timeline helpers ───────────────────────────────────────────────────────

export function pushMessage(state: AppState, msg: DisplayMessage) {
  state.trunk.push(msg);
  if (state.trunk.length > 1024) {
    state.trunk.splice(0, state.trunk.length - 1024);
  }
}

export function nextKey(state: AppState): string {
  state.msgSeq += 1;
  return `m${state.msgSeq}`;
}

export function pushTo(state: AppState, role: MsgRole, content: string, time: number, extra?: Partial<DisplayMessage>) {
  pushMessage(state, { key: nextKey(state), role, content, time, ...extra });
}

export function finishToolMessage(state: AppState, toolName: string, result: string) {
  const failed = result.trimStart().startsWith('error:');
  for (let i = state.trunk.length - 1; i >= 0; i--) {
    const msg = state.trunk[i];
    if (msg.role === 'tool' && msg.tool && msg.tool.name === toolName && msg.tool.status === 'running') {
      msg.tool.output = bounded(result, 4000);
      msg.tool.status = failed ? 'failed' : 'succeeded';
      return;
    }
  }
  // No running entry (e.g. restored timeline): append a completed entry.
  pushTo(state, 'tool', toolName, Math.floor(Date.now() / 1000), {
    tool: { name: toolName, input: '', output: bounded(result, 4000), status: failed ? 'failed' : 'succeeded' },
  });
}

export function loadTimeline(state: AppState, messages: TimelineMessage[]) {
  const converted: DisplayMessage[] = [];
  for (const message of messages) {
    const base = {
      key: nextKey(state),
      time: message.time,
      sessionId: message.session_id || undefined,
      // 历史回放：不播放入场/打字机动画，避免整屏滚动特效。
      animate: false,
    };
    if (message.kind === 'user') {
      converted.push({
        ...base,
        role: 'user' as const,
        content: message.content,
        source: message.source ?? null,
        images: message.images && message.images.length ? message.images : undefined,
      });
      continue;
    }
    if (message.kind === 'backend') {
      // 时序还原：推理先于回答插入（与实时路径一致），回答不再带尾巴。
      for (const reasoning of message.reasoning ?? []) {
        converted.push({
          ...base,
          role: 'reasoning' as const,
          content: reasoning,
        });
      }
      converted.push({
        ...base,
        role: 'backend' as const,
        content: message.content,
      });
      continue;
    }
    if (message.kind === 'reasoning') {
      // 后端新投影：推理为独立条目（按到达顺序，与工具交错）
      converted.push({
        ...base,
        role: 'reasoning' as const,
        content: message.content,
      });
      continue;
    }
    if (message.kind === 'tool') {
      const tool = message.tool;
      converted.push({
        ...base,
        role: 'tool' as const,
        content: tool ? tool.name : message.content,
        tool: tool
          ? {
              name: tool.name,
              input: tool.input,
              output: tool.output,
              status: tool.failed ? ('failed' as const) : ('succeeded' as const),
            }
          : undefined,
      });
      continue;
    }
    converted.push({ ...base, role: 'system' as const, content: message.content });
  }
  state.trunk = converted;
}

// ── main reducer ───────────────────────────────────────────────────────────

