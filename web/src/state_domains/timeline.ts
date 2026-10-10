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

let globalSeq = 0;

/** 模块级单调计数器：跨 trunk 重建 / team 切换永不清零，保证 Vue keyed
 * v-for 的 key 全局唯一。
 * （旧版 state.msgSeq 与 globalSeq 双计数器都从 0 开始，同一列表里会出现
 * 重复 key，Vue 复用错误组件导致显示错乱。） */
export function nextKey(): string {
  globalSeq += 1;
  return `m${globalSeq}`;
}

/** hook 输入的展示文本：`<xxx_hook>{json}</xxx_hook>` 结构化输入只显示
 * payload 的 content 字段（会话里不糊原始 JSON）；非 hook 输入原样返回。
 * 实时事件（state.ts reduceMessage）与历史回放共用同一剥离。 */
export function displayContentOf(content: string): string {
  const match = content.match(/^<[a-z_]+_hook>\s*(\{.*?\})\s*<\/[a-z_]+_hook>$/s);
  if (!match) return content;
  try {
    const payload = JSON.parse(match[1]) as { content?: unknown };
    return typeof payload.content === 'string' && payload.content.trim()
      ? payload.content
      : content;
  } catch {
    return content;
  }
}

export function pushTo(state: AppState, role: MsgRole, content: string, time: number, extra?: Partial<DisplayMessage>) {
  pushMessage(state, { key: nextKey(), role, content, time, ...extra });
}

/** `<subagent_event>`（子代理完成合并钩子）的结构化载荷。 */
export interface SubagentEventInfo {
  /** 子任务 id（Core 受理时分配，如 `task-…`） */
  id: string;
  /** 委派时的任务描述（自含背景） */
  task: string;
  success: boolean;
  /** 子代理的结论正文（合并进主对话的核心内容） */
  result: string;
  completedAtMs: number | null;
  /**
   * 运行中：`SubagentStarted` 时插入的合成行（执行过程可见）；
   * 完成钩子（`<subagent_event>`）到达时就地改写为结果行（保留派发位置）。
   */
  running?: boolean;
}

/**
 * 子代理开始执行（`SubagentStarted`）→ 插入一行"运行中"（就地可见执行过程）。
 *
 * 该行是**派发位置的工作卡片**：完成钩子到达时由 [`finishSubagentRun`]
 * 就地改写（任务 → 结果），不在合并回合重复出行——一份委派始终一行。
 */
export function startSubagentRun(state: AppState, sessionId: string, task: string): void {
  const line = task.replace(/\s+/g, ' ').trim();
  if (!line) return;
  pushTo(state, 'subagent', line, Math.floor(Date.now() / 1000), {
    sessionId,
    subagent: {
      id: '',
      task: line,
      success: true,
      result: '',
      completedAtMs: null,
      running: true,
    },
  });
}

/**
 * 子代理完成钩子到达 → 就地把该会话最老的"运行中"行改写为结果行。
 * 返回是否命中；未命中（行已被窗口裁掉/刷新后无合成行）由调用方追加新行。
 */
export function finishSubagentRun(
  state: AppState,
  sessionId: string,
  info: SubagentEventInfo,
): boolean {
  for (const message of state.trunk) {
    if (
      message.role === 'subagent' &&
      message.sessionId === sessionId &&
      message.subagent?.running
    ) {
      message.subagent = { ...info, running: false };
      message.content = info.task || message.content;
      return true;
    }
  }
  return false;
}

/**
 * 解析 `<subagent_event>{json}</subagent_event>` 钩子（子代理完成后经
 * `dispatch_subagent_hook` 注入的**新入站分支**）。
 *
 * 该钩子此前以原始 JSON 直接渲染为 user 气泡（一条数千字符的 JSON，
 * 既占屏又难读）；结构化解析后由 `SubagentEventBlock` 以一行摘要 +
 * 可展开结果呈现。非该钩子 / JSON 损坏返回 null，调用方按普通消息降级。
 */
export function parseSubagentEvent(content: string): SubagentEventInfo | null {
  const match = content.match(/^<subagent_event>\s*([\s\S]*?)\s*<\/subagent_event>$/);
  if (!match) return null;
  try {
    const payload = JSON.parse(match[1]) as Record<string, unknown>;
    if (payload['event'] !== 'subagent_event') return null;
    return {
      id: typeof payload['subagent_id'] === 'string' ? payload['subagent_id'] : '',
      task: typeof payload['task'] === 'string' ? payload['task'] : '',
      success: payload['success'] === true,
      result: typeof payload['result'] === 'string' ? payload['result'] : '',
      completedAtMs:
        typeof payload['completed_at_ms'] === 'number' ? payload['completed_at_ms'] : null,
    };
  } catch {
    return null;
  }
}

/** 工具结果回填：按 toolCallId 精确配对（同名并行调用不再配错对）——
 * id 恒由 core 随 ToolCall/ToolResult 提供。
 * timedOut（外圈超时守卫中止）与 error: 前缀一样渲染为失败。 */
export function finishToolMessage(state: AppState, toolName: string, result: string, toolCallId?: string, timedOut?: boolean, elapsedMs?: number) {
  const failed = timedOut === true || result.trimStart().startsWith('error:');
  for (let i = state.trunk.length - 1; i >= 0; i--) {
    const msg = state.trunk[i];
    if (msg.role !== 'tool' || !msg.tool || msg.tool.status !== 'running') continue;
    if (!toolCallId || msg.tool.toolCallId !== toolCallId) continue;
    msg.tool.output = bounded(result, 4000);
    msg.tool.status = failed ? 'failed' : 'succeeded';
    // 总耗时：core 随 ToolResult 上报（毫秒）。
    msg.tool.elapsedMs = elapsedMs;
    return;
  }
  // No running entry (e.g. restored timeline): append a completed entry.
  pushTo(state, 'tool', toolName, Math.floor(Date.now() / 1000), {
    tool: {
      name: toolName,
      input: '',
      output: bounded(result, 4000),
      status: failed ? 'failed' : 'succeeded',
      toolCallId: toolCallId || undefined,
      elapsedMs: typeof elapsedMs === 'number' ? elapsedMs : undefined,
    },
  });
}

/** TimelineTool（持久化条目）→ 前端 ToolMsg 状态映射。
 * output 为 null 且未失败 = 仍在运行（旧版误恢复为 succeeded）。 */
function toolStatusOf(tool: { output: string | null; failed: boolean; timed_out?: boolean }): 'running' | 'succeeded' | 'failed' {
  if (tool.failed || tool.timed_out === true) return 'failed';
  return tool.output == null ? 'running' : 'succeeded';
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
    // 子代理完成回报（合并钩子）：不作为用户气泡，走专用紧凑行。
    const subagent = parseSubagentEvent(message.content);
    if (subagent) {
      return { ...base, role: 'subagent' as const, content: subagent.task, subagent };
    }
    return {
      ...base,
      role: 'user' as const,
      content: displayContentOf(message.content),
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
            status: toolStatusOf(tool),
            toolCallId: tool.tool_call_id || undefined,
            startedAtMs: typeof tool.started_at_ms === 'number' ? tool.started_at_ms : undefined,
            elapsedMs: typeof tool.elapsed_ms === 'number' ? tool.elapsed_ms : undefined,
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

/** 增量投递的就地修补：core 对运行中的工具条目做就地更新后会带新 seq
 * 重新投递完成态；若条目已存在于列表中（按 tool_call_id 匹配），原地更新
 * 而不是追加，避免重复行。返回 true 表示已修补。 */
export function patchToolMessage(list: DisplayMessage[], incoming: DisplayMessage): boolean {
  const tool = incoming.tool;
  if (!tool?.toolCallId) return false;
  for (let i = list.length - 1; i >= 0; i--) {
    const existing = list[i];
    if (existing.role === 'tool' && existing.tool?.toolCallId === tool.toolCallId) {
      existing.tool = { ...tool };
      existing.content = incoming.content;
      return true;
    }
  }
  return false;
}

export function loadTimeline(state: AppState, messages: TimelineMessage[]) {
  state.trunk = toDisplayMessages(messages);
}
