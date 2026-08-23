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
  const converted: DisplayMessage[] = messages.map((message) => {
    const base = {
      key: nextKey(state),
      time: message.time,
      sessionId: message.session_id || undefined,
    };
    if (message.kind === 'user') {
      return {
        ...base,
        role: 'user' as const,
        content: message.content,
        source: message.source ?? null,
        images: message.images && message.images.length ? message.images : undefined,
      };
    }
    if (message.kind === 'backend') {
      return {
        ...base,
        role: 'backend' as const,
        content: message.content,
        reasoning: message.reasoning && message.reasoning.length ? message.reasoning : undefined,
      };
    }
    if (message.kind === 'tool') {
      const tool = message.tool;
      return {
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
      };
    }
    return { ...base, role: 'system' as const, content: message.content };
  });
  state.trunk = converted;
}

// ── main reducer ───────────────────────────────────────────────────────────

