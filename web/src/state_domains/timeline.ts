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

// ── 流式消息（2026-10）──────────────────────────────────────────────
//
// provider 增量（`AgentContentDelta` / `AgentReasoningDelta`）逐段进入主
// 时间线；终值（`AgentOutput` / `AgentReasoning` 全量）到达时**对账替换**
// 流式行内容（丢帧/乱序可自愈，展示以终值为准）。
//
// 生命周期标记（DisplayMessage.streamState）：
//   'streaming' —— 增量拼接中（可继续追加、可被终值替换）
//   'frozen'    —— 已冻结：工具调用开始（该步为中间叙述，不再有终值）或
//                  取消/错误——保留已显示文本，不再接受增量与替换
//   undefined   —— 非流式消息，或已终值对账
// 分支归属（streamBranch）参与对账：turn 的 branch id 跨 step 不变，故
// 「工具开始 → 冻结当前行 → 下一步增量新建一行」是分步切分的关键。

/// 增量追加：同 (session, branch, role) 的流式行追加；无则新建一行。
export function appendStreamDelta(
  state: AppState,
  role: 'backend' | 'reasoning',
  sessionId: string,
  branch: string,
  delta: string,
) {
  const want = branch ?? '';
  for (let i = state.trunk.length - 1; i >= 0; i--) {
    const msg = state.trunk[i];
    if (
      msg.role === role &&
      msg.sessionId === sessionId &&
      msg.streamState === 'streaming' &&
      (msg.streamBranch ?? '') === want
    ) {
      msg.content += delta;
      return;
    }
  }
  pushTo(state, role, delta, Math.floor(Date.now() / 1000), {
    sessionId,
    animate: false, // 真流式：文字实时生长，不再叠客户端打字动画
    streamState: 'streaming',
    streamBranch: want,
  });
}

/// 终值对账：把流式行替换为全量文本（并清除流式标记）。
///
/// 匹配：先按精确分支；分支缺失（`AgentOutput.branch_id = null` 的后端
/// 路径）时取该会话最新一条仍在流式的行。命中返回 true；未命中（无流式
/// 行，调用方走普通 push 路径）返回 false。
export function settleStream(
  state: AppState,
  role: 'backend' | 'reasoning',
  sessionId: string,
  branch: string | null | undefined,
  fullText: string,
): boolean {
  const want = branch ?? '';
  const settle = (msg: DisplayMessage) => {
    msg.content = fullText;
    msg.streamState = undefined;
    msg.streamBranch = undefined;
  };
  // 1) 精确分支匹配。
  for (let i = state.trunk.length - 1; i >= 0; i--) {
    const msg = state.trunk[i];
    if (msg.role !== role || msg.sessionId !== sessionId || msg.streamState !== 'streaming') {
      continue;
    }
    if ((msg.streamBranch ?? '') === want) {
      settle(msg);
      return true;
    }
  }
  // 2) 分支缺失：无约束取最新流式行（后端 SendMessage 路径）。
  if (want === '') {
    for (let i = state.trunk.length - 1; i >= 0; i--) {
      const msg = state.trunk[i];
      if (msg.role !== role || msg.sessionId !== sessionId || msg.streamState !== 'streaming') {
        continue;
      }
      settle(msg);
      return true;
    }
  }
  return false;
}

/// 冻结流式行：保留已显示文本，不再接受增量与终值替换。
///
/// - `role`：限定角色（工具开始的中间叙述只冻结 backend 行）；
/// - `branch`：限定分支（undefined = 不限，取消/错误场景按会话冻结）。
export function freezeStreams(
  state: AppState,
  sessionId: string,
  opts: { role?: 'backend' | 'reasoning'; branch?: string } = {},
) {
  for (const msg of state.trunk) {
    if (msg.streamState !== 'streaming' || msg.sessionId !== sessionId) continue;
    if (opts.role && msg.role !== opts.role) continue;
    if (opts.branch !== undefined && (msg.streamBranch ?? '') !== (opts.branch ?? '')) continue;
    msg.streamState = 'frozen';
  }
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
 * 既占屏又难读）；结构化解析后并入工作 chip 行（2026-10），以子代理 chip +
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

/** 在时间线里找一条「还在运行」的工具行。
 *
 * 配对优先级（2026-10 修复「工具行一直读秒到刷新」）：
 * 1. `toolCallId` 精确配对——core 恒下发，同名并行调用不会配错；
 * 2. **名字兜底**：id 缺失（旧 core / 某些供应商不回 id）或 id 对不上时，
 *    若该工具名恰好只有一条 running，就用它。core 侧 timeline 的
 *    `ToolResult` 回填早已是同一套兜底（按 name 匹配 output 为空的条目），
 *    分支 tab 侧也有，只有主时间线此前缺这一步：id 缺失时 `finishToolMessage`
 *    直接 continue 到底 → 原 running 行永远留着（ticker 一直在读秒），
 *    同时 fallback 又追加一条完成行 → 重复行。
 * 3. 同名多条并发 running → 不猜（返回 null，走 append，宁可重复不配错）。
 *
 * 另外把 `unknown`（回合结束兜底收尾态，见 `settleRunningTools`）也当作
 * "未定"参与配对：并发 turn 时先结束的那一轮可能误把另一轮在跑的工具收尾
 * 成 unknown，迟到的 ToolResult 必须还能把它修正回来（否则又会多出一条
 * 重复行 + 一条永远"未收到回执"）。
 */
function findRunningTool(
  list: DisplayMessage[],
  toolName: string,
  toolCallId?: string,
): DisplayMessage | null {
  const open = (m: DisplayMessage): boolean =>
    m.role === 'tool' && (m.tool?.status === 'running' || m.tool?.status === 'unknown');
  if (toolCallId) {
    for (let i = list.length - 1; i >= 0; i--) {
      const msg = list[i];
      if (!open(msg)) continue;
      if (msg.tool?.toolCallId === toolCallId) return msg;
    }
  }
  let candidate: DisplayMessage | null = null;
  for (let i = list.length - 1; i >= 0; i--) {
    const msg = list[i];
    if (!open(msg)) continue;
    if (msg.tool?.name !== toolName) continue;
    if (candidate) return null; // 同名多条在跑：不猜
    candidate = msg;
  }
  return candidate;
}

/** 工具结果回填：按 toolCallId 精确配对（同名并行调用不再配错对）——
 * id 恒由 core 随 ToolCall/ToolResult 提供；缺失/失配时按名字兜底（见
 * `findRunningTool`）。
 * timedOut（外圈超时守卫中止）与 error: 前缀一样渲染为失败。 */
export function finishToolMessage(state: AppState, toolName: string, result: string, toolCallId?: string, timedOut?: boolean, elapsedMs?: number) {
  const failed = timedOut === true || result.trimStart().startsWith('error:');
  const target = findRunningTool(state.trunk, toolName, toolCallId);
  if (target && target.tool) {
    target.tool.output = bounded(result, 4000);
    target.tool.status = failed ? 'failed' : 'succeeded';
    // 总耗时：core 随 ToolResult 上报（毫秒）。
    target.tool.elapsedMs = elapsedMs;
    // 兜底配对时补上 id（后续同 id 的增量/修补即可精确命中）。
    if (!target.tool.toolCallId && toolCallId) target.tool.toolCallId = toolCallId;
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

/** 回合结束兜底：把残留的「运行中」工具行收尾（2026-10）。
 *
 * 任何一次 `ToolResult` 丢失（连接重建窗口、中继抖动、标签页后台节流、
 * id 不匹配被跳过……）都会让该行永久停在 running：WorkRunGroup 的
 * `hasRunning` 恒为真 → 50ms ticker 一直把耗时往上读，只有刷新页面（全量
 * 重建 timeline，按 `output != null` 判完成）才恢复。
 *
 * 回合结束（AgentCompleted / Error）是"这一轮不可能再有工具在跑"的确定
 * 信号，此时仍未回执的行按 `unknown` 收尾：不再读秒、不再计入活动态，
 * 详情里明确写出"未收到执行回执"，避免误报成失败。
 *
 * 只在没有并发分支/任务在跑时收尾——子代理与 reply 分支各有独立会话与
 * 结束事件，不能因为主会话一轮结束就掐掉它们的时间线。
 */
export function settleRunningTools(state: AppState, sessionId?: string): number {
  let settled = 0;
  for (const msg of state.trunk) {
    if (msg.role !== 'tool' || msg.tool?.status !== 'running') continue;
    if (sessionId && msg.sessionId && msg.sessionId !== sessionId) continue;
    msg.tool.status = 'unknown';
    msg.tool.output =
      msg.tool.output ?? '（未收到执行回执：本次调用的结果事件没有到达前端，可能因连接中断）';
    msg.tool.elapsedMs =
      typeof msg.tool.startedAtMs === 'number'
        ? Math.max(0, Date.now() - msg.tool.startedAtMs)
        : msg.tool.elapsedMs;
    settled += 1;
  }
  return settled;
}
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
    // 条目级序号：会话历史（SessionHistory 快照 ⊕ 窗口增量）合并水位线用。
    seq: message.seq,
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
        seq: message.seq,
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
  if (!tool) return false;
  if (tool.toolCallId) {
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
  // 无 id 的条目（旧 core / 供应商未回 id）：只有「完成态增量」才按名字
  // 就地修补——按名字把运行中条目替换成另一条运行中条目毫无意义，还会
  // 抹掉 startedAtMs 让计时跳变。
  if (tool.output == null) return false;
  for (let i = list.length - 1; i >= 0; i--) {
    const existing = list[i];
    if (existing.role !== 'tool' || existing.tool?.name !== tool.name) continue;
    if (existing.tool.status !== 'running') continue;
    existing.tool = { ...tool, toolCallId: existing.tool.toolCallId };
    existing.content = incoming.content;
    return true;
  }
  return false;
}

export function loadTimeline(state: AppState, messages: TimelineMessage[]) {
  state.trunk = toDisplayMessages(messages);
}
