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

export function nextKey(state?: AppState): string {
  if (state) {
    state.msgSeq += 1;
    return `m${state.msgSeq}`;
  }
  // 模块级序号：无 state 上下文时（如 toDisplayMessage 单条转换）也保证唯一。
  globalSeq += 1;
  return `m${globalSeq}`;
}
let globalSeq = 0;

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

/** 单条 TimelineMessage → DisplayMessage（供全量重建与增量追加共用） */
export function toDisplayMessage(message: TimelineMessage): DisplayMessage {
  const base = {
    key: nextKey(),
    time: message.time,
    sessionId: message.session_id || undefined,
    // 历史回放：不播放入场/打字机动画，避免整屏滚动特效。
    animate: false,
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
    // 旧数据 backend 可能携带 reasoning 尾巴；toDisplayMessages 会拆分成
    // 独立 reasoning 条目。单条转换返回 backend 主体（reasoning 由上层拆分）。
    return { ...base, role: 'backend' as const, content: message.content };
  }
  if (message.kind === 'reasoning') {
    return { ...base, role: 'reasoning' as const, content: message.content };
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
}

/** 多条 TimelineMessage → DisplayMessage[]（后端 kind=reasoning 独立条目直接透传） */
export function toDisplayMessages(messages: TimelineMessage[]): DisplayMessage[] {
  const out: DisplayMessage[] = [];
  for (const message of messages) {
    if (message.kind === 'backend' && message.reasoning?.length) {
      const base = {
        key: nextKey(),
        time: message.time,
        sessionId: message.session_id || undefined,
        animate: false,
      };
      for (const reasoning of message.reasoning) {
        out.push({ ...base, role: 'reasoning' as const, content: reasoning });
      }
      out.push({ ...base, role: 'backend' as const, content: message.content });
    } else {
      out.push(toDisplayMessage(message));
    }
  }
  return out;
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

