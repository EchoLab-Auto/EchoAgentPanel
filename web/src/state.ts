import { oneLine, truncate, summarizeArguments, summarizeTimerEvent, bounded, targetLabel } from './state_domains/helpers';
import {
  activity,
  setPhase,
  startSubagent,
  completeSubagent,
  startReplyBranch,
  completeReplyBranch,
  startBackgroundTask,
  completeBackgroundTask,
  integrateBackgroundTask,
  stageOrchestrationTool,
} from './state_domains/orchestration';
import { pushTo, finishToolMessage, toDisplayMessage, toDisplayMessages, patchToolMessage, displayContentOf } from './state_domains/timeline';
import { sendCommand } from './connection';

//! 前端应用状态与 reducer（移植自 EchoAgentTui 的 state.rs + events.rs）。
//! 事件流从 `/ws` 进来，reducer 把它映射成 React 可渲染的状态。

import type {
  AdapterStatus,
  ApiProfileInfo,
  BackendEvent,
  ContextBlockInfo,
  ContextMessageInfo,
  GateMode,
  SessionInfo,
  SkillInfo,
  ThinkingMode,
  WorkspaceFileEntry,
  ReasoningEffort,
  TimelineMessage,
  ToolInfo,
  PluginInfo,
  TeamInfo,
  WorkspaceGitInfo,
  WorkspaceSessionInfo,
} from './protocol';

export const TRUNK_SESSION_ID = 'trunk';

/** 实时事件是否属于当前显示的 team 时间线。
 * Panel 的 activeTeamId 用 null 表示主/默认 agent；core 端 team_id 为
 * null 或默认 team id 都归一化为主 agent（与入口行会话切换的
 * sessionBelongsToActiveTeam 同一套归一化）。事件未带 team_id（旧 core）
 * 或 TeamsList 尚未到达时不过滤。 */
export function belongsToActiveTeam(state: AppState, teamId: string | null | undefined): boolean {
  if (teamId === undefined) return true;
  if (state.teams.length === 0) return true;
  // 去主智能体（2026-09）：没有"主 agent"归属；未指定 active 时按列表首个。
  const active = state.activeTeamId ?? state.teams[0]?.id ?? null;
  if (active === null) return true;
  return teamId === active;
}

export type MsgRole = 'user' | 'backend' | 'reasoning' | 'tool' | 'system' | 'branch';
export type ToolStatus = 'running' | 'succeeded' | 'failed';

export interface ToolMsg {
  name: string;
  input: string;
  output: string | null;
  status: ToolStatus;
  /** 工具调用精确配对 id（新 core 提供；同名并行调用据此配对） */
  toolCallId?: string;
}

export interface DisplayMessage {
  key: string;
  role: MsgRole;
  content: string;
  time: number;
  /** 实时到达的消息打上标记：渲染层对这类消息播放入场动画（历史回放不播）。 */
  animate?: boolean;
  /** 归属会话 key（空 = 全局/未知） */
  sessionId?: string;
  reasoning?: string[];
  tool?: ToolMsg;
  /** 多模态附件（图片 URL / data URI） */
  images?: string[];
  /** 临时回复分支的合并块（分支结束后插入主会话） */
  branch?: {
    branchId: string;
    summary: string;
    msgs: BranchMsg[];
  };
  source?: {
    adapter_name: string;
    platform: string;
    user_id: string;
    user_name: string;
    channel: string;
    group_name: string | null;
  } | null;
}

/** 临时回复分支内部的单条活动记录 */
export interface BranchMsg {
  kind: 'reasoning' | 'tool' | 'content' | 'notice';
  text: string;
  time: number;
  toolName?: string;
  toolCallId?: string;
  input?: string;
  output?: string;
  status?: ToolStatus;
}

/** 运行中的临时回复分支（侧边临时会话标签） */
export interface BranchTab {
  sessionId: string;
  task: string;
  target: string;
  startedAtMs: number;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  finalContent: string | null;
  msgs: BranchMsg[];
}

export type AgentPhase = 'thinking' | 'tool' | 'subagent' | 'completed' | 'failed';

/// QQ 实例管理态的空白初值（多实例面板按实例填充）。
export function defaultQqInstanceState() {
  return {
    filter: {
      allowlist_users: [] as number[],
      allowlist_groups: [] as number[],
      denylist_users: [] as number[],
      denylist_groups: [] as number[],
    },
    gateMode: 'none' as GateMode,
    owner: 0,
    groups: [] as Array<[number, string]>,
    friends: [] as Array<[number, string]>,
    online: false,
    selfId: null as string | null,
  };
}

export interface AgentActivity {
  phase: AgentPhase;
  detail: string | null;
  startedAt: number;
  toolsCompleted: number;
  subagentsCompleted: number;
  promptTokens: number;
  completionTokens: number;
}

export type OrchKind = 'background' | 'parallel' | 'subagent' | 'reply';
export type OrchStatus =
  | 'running'
  | 'awaiting'
  | 'completed'
  | 'integrated'
  | 'failed'
  | 'cancelled';

export interface BranchActivity {
  branchId: string;
  task: string;
  target: string;
  status: 'running' | 'succeeded' | 'completed' | 'failed' | 'cancelled';
  startedAtMs: number;
  completedAtMs: number | null;
  result: string | null;
}

export interface OrchActivity {
  id: string;
  sequence: number | null;
  sessionId: string;
  kind: OrchKind;
  objective: string;
  status: OrchStatus;
  createdAtMs: number;
  completedAtMs: number | null;
  integratedAtMs: number | null;
  branches: BranchActivity[];
}

export interface ChecklistEntry {
  name: string;
  items: Array<{ text: string; done: boolean }>;
  done: number;
  total: number;
}

export interface ApiConfig {
  provider: string;
  model: string;
  base_url: string;
  api_key_set: boolean;
  thinking: ThinkingMode;
  reasoning_effort: ReasoningEffort;
  system_prompt: string;
  active_api: string;
  profiles: ApiProfileInfo[];
}

export interface SudoPrompt {
  request_id: number;
  command: string;
  session_id: string;
  input: string;
}

/** 选单弹层状态（MenuRequest 事件与 MenuResolved 结束事件之间存活）。 */
export interface MenuPrompt {
  request_id: number;
  session_id: string;
  title: string;
  description: string;
  options: Array<{ id: string; label: string; description: string }>;
  timeoutSecs: number;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

export interface ContextSnapshotData {
  /** 快照归属的会话 id（多会话，2026-09；旧 Core 缺省为 undefined） */
  session_id?: string | null;
  messages: ContextMessageInfo[];
  blocks: ContextBlockInfo[];
  total_tokens: number;
  limit_tokens: number;
}

export interface AppState {
  connected: boolean;
  sessions: SessionInfo[];
  trunk: DisplayMessage[];
  activities: Record<string, AgentActivity>;
  tasks: OrchActivity[];
  adapters: AdapterStatus[];
  model: string;
  api: ApiConfig | null;
  systemPrompt: string;
  qqFilter: {
    allowlist_users: number[];
    allowlist_groups: number[];
    denylist_users: number[];
    denylist_groups: number[];
  };
  /** 最近一次二维码回推（Core 代理登录；按实例过滤消费）。 */
  lastQrcode: { adapter: string; png_base64: string; error?: string | null } | null;
  /** 多实例（2026-09）：按 QQ 实例名存放的 QQ 管理态；单实例时键为 "qq"。 */
  qqByAdapter: Record<
    string,
    {
      filter: AppState['qqFilter'];
      gateMode: GateMode;
      owner: number;
      groups: Array<[number, string]>;
      friends: Array<[number, string]>;
      online: boolean;
      selfId: string | null;
    }
  >;
  qqGateMode: GateMode;
  qqOwner: number;
  qqGroups: Array<[number, string]>;
  qqFriends: Array<[number, string]>;
  checklists: ChecklistEntry[];
  sudoPrompt: SudoPrompt | null;
  menuPrompt: MenuPrompt | null;
  toasts: Toast[];
  /** API 连通性测试结果（name(空=默认) → { ok, message, latencyMs }） */
  apiTests: Record<string, { ok: boolean; message: string; latencyMs: number }>;
  /** API 余额查询结果（name(空=默认) → 余额信息） */
  apiBalances: Record<
    string,
    { ok: boolean; available: boolean; total: string; currency: string; message: string }
  >;
  /** 已发现并注册的技能列表 */
  skills: SkillInfo[];
  /** 已注册的工具定义列表 */
  tools: ToolInfo[];
  /** 已挂载插件列表 */
  plugins: PluginInfo[];
  /** Team 成员列表（多 agent） */
  teams: TeamInfo[];
  /** 工作区会话列表（workspace 插件；当前加载归属的 team 见 workspaceTeamId） */
  workspaceSessions: WorkspaceSessionInfo[];
  /** 激活的工作区会话 id（null = 未激活） */
  workspaceActive: string | null;
  /** 上述列表归属的 team id（用于切换 team 后判定新鲜度） */
  workspaceTeamId: string | null;
  /** 各会话目录 git 状态的缓存（session_id → 目录结果） */
  workspaceGitBySession: Record<string, WorkspaceGitInfo[]>;
  /** 文件浏览器缓存（目录绝对路径 → 条目/错误；workspace 插件） */
  workspaceFiles: Record<string, { entries: WorkspaceFileEntry[]; error: string | null }>;
  /** 当前激活 team（null = default/未指定），用于实时事件隔离 */
  activeTeamId: string | null;
  /** 后台 shell 会话列表（Shell 面板） */
  shellSessions: import('./protocol').ShellSessionInfo[];
  /** 每会话的终端条目（seq → entry），Shell 面板流式输出 */
  shellTerminals: Record<string, import('./protocol').ShellTerminalEntry[]>;
  context: ContextSnapshotData | null;
  /** 运行中的临时回复分支（branch_id → tab） */
  branchTabs: Record<string, BranchTab>;
  /**
   * 按 team 缓存的 timeline 全量快照（team_id → { seq, msgs }）。
   * 切换 agent 时先用缓存渲染（消除白屏/网络等待），再后台增量刷新。
   * key: null 表示主/默认 agent。
   */
  teamTimelines: Record<string, { seq: number; msgs: DisplayMessage[] }>;
  /** 当前 state.trunk 归属的 team（null = 主/默认），用于校验缓存一致性 */
  trunkTeamId: string | null;
  pendingBackground: Record<
    string,
    { kind: OrchKind; objective: string; branches: BranchActivity[] }
  >;
  pendingReasoning: Record<string, string[]>;
  completedReasoning: Record<string, string[]>;
  nextSubagentSeq: number;
}

export function initialState(): AppState {
  return {
    connected: false,
    sessions: [],
    trunk: [],
    activities: {},
    tasks: [],
    adapters: [],
    model: '',
    api: null,
    systemPrompt: '',
    qqFilter: {
      allowlist_users: [],
      allowlist_groups: [],
      denylist_users: [],
      denylist_groups: [],
    },
    qqGateMode: 'none',
    qqOwner: 0,
    qqGroups: [],
    qqFriends: [],
    lastQrcode: null,
    qqByAdapter: {},
    checklists: [],
    sudoPrompt: null,
    menuPrompt: null,
    toasts: [],
    apiTests: {},
    apiBalances: {},
    skills: [],
    tools: [],
    plugins: [],
    teams: [],
    workspaceSessions: [],
    workspaceActive: null,
    workspaceTeamId: null,
    workspaceGitBySession: {},
    workspaceFiles: {},
    activeTeamId: null,
    shellSessions: [],
    shellTerminals: {},
    context: null,
    branchTabs: {},
    teamTimelines: {},
    trunkTeamId: null,
    pendingBackground: {},
    pendingReasoning: {},
    completedReasoning: {},
    nextSubagentSeq: 0,
  };
}

export function reduce(state: AppState, event: BackendEvent): AppState {
  switch (Object.keys(event)[0]) {
    case 'AdapterStateChanged': {
      const e = (event as { AdapterStateChanged: { adapter_name: string; connected: boolean; self_id: string | null } }).AdapterStateChanged;
      upsertAdapter(state, {
        name: e.adapter_name,
        display_name: e.adapter_name,
        connected: e.connected,
        // `AdapterStateChanged` only fires while the adapter is running; a
        // disconnected client still means the adapter process is up.
        running: true,
        self_id: e.self_id,
        bind_address: '',
        started_at: null,
      });
      return state;
    }
    case 'AdapterList': {
      const e = (event as { AdapterList: { adapters: AdapterStatus[] } }).AdapterList;
      state.adapters = e.adapters;
      return state;
    }
    case 'WorkspaceSessions': {
      const e = (
        event as {
          WorkspaceSessions: {
            team_id?: string | null;
            sessions: WorkspaceSessionInfo[];
            active?: string | null;
          };
        }
      ).WorkspaceSessions;
      state.workspaceSessions = e.sessions ?? [];
      state.workspaceActive = e.active ?? null;
      state.workspaceTeamId = e.team_id ?? null;
      return state;
    }
    case 'WorkspaceGitStatus': {
      const e = (
        event as {
          WorkspaceGitStatus: {
            team_id?: string | null;
            session_id: string;
            directories: WorkspaceGitInfo[];
          };
        }
      ).WorkspaceGitStatus;
      state.workspaceGitBySession[e.session_id] = e.directories ?? [];
      return state;
    }
    case 'WorkspaceFiles': {
      const e = (
        event as {
          WorkspaceFiles: {
            session_id: string;
            path: string;
            entries: WorkspaceFileEntry[];
            error?: string | null;
          };
        }
      ).WorkspaceFiles;
      state.workspaceFiles[e.path] = {
        entries: e.entries ?? [],
        error: e.error ?? null,
      };
      return state;
    }
    case 'MessageReceived': {
      const e = (event as { MessageReceived: Parameters<typeof reduceMessage>[1] }).MessageReceived;
      return reduceMessage(state, e);
    }
    case 'AgentThinking': {
      const e = (event as { AgentThinking: { session_id: string; team_id?: string | null } }).AgentThinking;
      if (!belongsToActiveTeam(state, e.team_id)) return state;
      activity(state, e.session_id);
      return state;
    }
    case 'LlmRequest': {
      const e = (event as { LlmRequest: { session_id: string; model: string } }).LlmRequest;
      state.model = e.model;
      setPhase(state, e.session_id, 'thinking', null);
      return state;
    }
    case 'LlmResponse': {
      const e = (event as { LlmResponse: { session_id: string; prompt_tokens: number; completion_tokens: number } }).LlmResponse;
      const act = activity(state, e.session_id);
      act.promptTokens += e.prompt_tokens;
      act.completionTokens += e.completion_tokens;
      return state;
    }
    case 'AgentReasoning': {
      const e = (event as { AgentReasoning: { session_id: string; branch_id: string; content: string; team_id?: string | null } }).AgentReasoning;
      const content = e.content.trim();
      if (!content) return state;
      // 无论是否存在分支 tab：推理立即按真实时序插入主时间线——
      // 推理块会出现在之前/之后的工具调用之间，而不是等回复完成
      // 后附加在末尾（分支合并块因此不再需要在结束时归档）。
      // 仅当事件属于当前 team 时才进主时间线（跨 agent 不串显）。
      if (belongsToActiveTeam(state, e.team_id)) {
        pushTo(state, 'reasoning', content, Math.floor(Date.now() / 1000), {
          sessionId: e.session_id,
          animate: true,
        });
      }
      const tab = state.branchTabs[e.branch_id];
      if (tab) {
        tab.msgs.push({ kind: 'reasoning', text: content, time: Math.floor(Date.now() / 1000) });
      }
      return state;
    }
    case 'SubagentStarted': {
      const e = (event as { SubagentStarted: { session_id: string; task: string } }).SubagentStarted;
      startSubagent(state, e.session_id, e.task);
      setPhase(state, e.session_id, 'subagent', truncate(oneLine(e.task), 72));
      return state;
    }
    case 'SubagentCompleted': {
      const e = (event as { SubagentCompleted: { session_id: string; success: boolean } }).SubagentCompleted;
      completeSubagent(state, e.session_id, e.success);
      const act = activity(state, e.session_id);
      if (e.success) act.subagentsCompleted += 1;
      setPhase(state, e.session_id, 'thinking', e.success ? '正在整合 subagent 结果' : 'subagent 失败，正在恢复');
      return state;
    }
    case 'ReplyBranchStarted': {
      const e = (event as { ReplyBranchStarted: { session_id: string; branch_id: string; message_sequence: number; task: string; target: string; started_at_ms: number } }).ReplyBranchStarted;
      startReplyBranch(state, e.session_id, e.branch_id, e.message_sequence, e.task, e.target, e.started_at_ms);
      // 单开一个侧边临时会话标签：分支运行期间的活动都路由到这里，
      // 不进入主会话 trunk。
      state.branchTabs[e.branch_id] = {
        sessionId: e.session_id,
        task: e.task,
        target: e.target,
        startedAtMs: e.started_at_ms,
        status: 'running',
        finalContent: null,
        msgs: [],
      };
      return state;
    }
    case 'ReplyBranchContent': {
      const e = (event as { ReplyBranchContent: { branch_id: string; content: string } }).ReplyBranchContent;
      const task = state.tasks.find((t) => t.id === e.branch_id && t.kind === 'reply');
      if (task && task.branches[0]) {
        task.branches[0].result = bounded(e.content, 4000);
      }
      const tab = state.branchTabs[e.branch_id];
      if (tab) {
        tab.msgs.push({ kind: 'content', text: e.content, time: Math.floor(Date.now() / 1000) });
      }
      return state;
    }
    case 'ReplyBranchCompleted': {
      const e = (event as { ReplyBranchCompleted: { session_id: string; branch_id: string; success: boolean; cancelled: boolean; completed_at_ms: number } }).ReplyBranchCompleted;
      completeReplyBranch(state, e.branch_id, e.success, e.cancelled, e.completed_at_ms);
      if (!state.tasks.some((t) => t.sessionId === e.session_id && t.kind === 'reply' && t.status === 'running')) {
        setPhase(state, e.session_id, 'completed', null);
      }
      // 分支结束：主时间线已实时展示推理/工具/回答（时序交错），
      // 不再归档折叠合并块（避免重复内容）；仅清理临时标签。
      const tab = state.branchTabs[e.branch_id];
      if (tab) {
        tab.status = e.cancelled ? 'cancelled' : e.success ? 'completed' : 'failed';
        delete state.branchTabs[e.branch_id];
      }
      return state;
    }
    case 'BackgroundTaskStarted': {
      const e = (event as { BackgroundTaskStarted: { session_id: string; task_id: string; sequence: number; branch_count: number; objective: string; created_at_ms: number } }).BackgroundTaskStarted;
      startBackgroundTask(state, e.session_id, e.task_id, e.sequence, e.branch_count, e.objective, e.created_at_ms);
      pushTo(
        state,
        'system',
        `后台任务 #${e.sequence} 已挂起 · ${e.branch_count} 个分支 · ${truncate(oneLine(e.objective), 96)}`,
        Math.floor(e.created_at_ms / 1000),
      );
      return state;
    }
    case 'BackgroundTaskCompleted': {
      const e = (event as { BackgroundTaskCompleted: { task_id: string; success: boolean; completed_at_ms: number } }).BackgroundTaskCompleted;
      completeBackgroundTask(state, e.task_id, e.success, e.completed_at_ms);
      return state;
    }
    case 'BackgroundTaskIntegrated': {
      const e = (event as { BackgroundTaskIntegrated: { task_id: string; success: boolean; integrated_at_ms: number } }).BackgroundTaskIntegrated;
      integrateBackgroundTask(state, e.task_id, e.success, e.integrated_at_ms);
      return state;
    }
    case 'ToolCall': {
      const e = (event as { ToolCall: { session_id: string; tool_name: string; arguments: string; tool_call_id?: string; branch_id?: string; team_id?: string | null } }).ToolCall;
      stageOrchestrationTool(state, e.session_id, e.tool_name, e.arguments);
      setPhase(state, e.session_id, e.tool_name === 'run_subagent' ? 'subagent' : 'tool', e.tool_name);
      // 工具调用实时进主时间线（与推理交错）；分支 tab 同步记录供详情查看。
      // 仅当事件属于当前 team 时才进主时间线（跨 agent 不串显）。
      const tab = e.branch_id ? state.branchTabs[e.branch_id] : undefined;
      if (belongsToActiveTeam(state, e.team_id)) {
        pushTo(state, 'tool', e.tool_name, Math.floor(Date.now() / 1000), {
          sessionId: e.session_id,
          animate: true,
          tool: {
            name: e.tool_name,
            input: summarizeArguments(e.arguments),
            output: null,
            status: 'running',
            toolCallId: e.tool_call_id || undefined,
          },
        });
      }
      if (tab) {
        tab.msgs.push({
          kind: 'tool',
          text: e.tool_name,
          time: Math.floor(Date.now() / 1000),
          toolName: e.tool_name,
          toolCallId: e.tool_call_id || undefined,
          input: summarizeArguments(e.arguments),
          status: 'running',
        });
      }
      return state;
    }
    case 'ToolResult': {
      const e = (event as { ToolResult: { session_id: string; tool_name: string; result: string; tool_call_id?: string; timed_out?: boolean; branch_id?: string; team_id?: string | null } }).ToolResult;
      // 工具结果实时回填主时间线（与 ToolCall 精确配对）；分支 tab 同步更新。
      const tab = e.branch_id ? state.branchTabs[e.branch_id] : undefined;
      if (belongsToActiveTeam(state, e.team_id)) {
        finishToolMessage(state, e.tool_name, e.result, e.tool_call_id, e.timed_out);
      }
      if (tab) {
        const failed = e.timed_out === true || e.result.trimStart().startsWith('error:');
        for (let i = tab.msgs.length - 1; i >= 0; i--) {
          const msg = tab.msgs[i];
          if (msg.kind !== 'tool' || msg.status !== 'running') continue;
          const matched = e.tool_call_id
            ? msg.toolCallId === e.tool_call_id
            : msg.toolName === e.tool_name;
          if (!matched) continue;
          msg.output = bounded(e.result, 4000);
          msg.status = failed ? 'failed' : 'succeeded';
          break;
        }
      }
      const act = activity(state, e.session_id);
      if (e.tool_name !== 'run_subagent') act.toolsCompleted += 1;
      setPhase(state, e.session_id, 'thinking', null);
      return state;
    }
    case 'ChecklistUpdated': {
      const e = (event as { ChecklistUpdated: { state: { lists: Array<{ name: string; items: Array<{ text: string; done: boolean }> }> } } }).ChecklistUpdated;
      state.checklists = (e.state.lists ?? [])
        .filter((list) => list && Array.isArray(list.items))
        .map((list) => {
          const items = list.items;
          const done = items.filter((item) => item.done).length;
          return { name: list.name, items, done, total: items.length };
        });
      return state;
    }
    case 'ContextSnapshot': {
      const e = (event as { ContextSnapshot: ContextSnapshotData }).ContextSnapshot;
      // 只更新状态栏/详情弹窗用的快照数据，不再把快照作为系统消息写进聊天流。
      state.context = e;
      return state;
    }
    case 'TrunkTimeline': {
      const e = (event as { TrunkTimeline: { messages: TimelineMessage[]; seq?: number; team_id?: string | null; full?: boolean } }).TrunkTimeline;
      // ⚠️ 响应归属由后端标注（team_id = 请求值），绝不能拿当前
      // activeTeamId 猜测：其他 agent 的兜底请求若按当前视图路由会
      // 污染 trunk（串显 alix 会话/误清空 self-coding 内容）。
      const teamKey = String(e.team_id ?? '');
      const seq = e.seq ?? 0;
      // 旧 core（无 team_id 标注）沿用旧路由：按当前视图处理。
      const key = e.team_id !== undefined ? teamKey : String(state.activeTeamId ?? '');
      const cached = state.teamTimelines[key];

      if (e.full === undefined && cached && seq === cached.seq && e.messages.length === 0) {
        // 旧 core 空增量：仅游标对齐（无变化）。旧版误当全量重建会清空聊天。
        return state;
      }
      const isFull = e.full !== undefined ? e.full : !(cached && seq > cached.seq);

      if (!isFull && cached) {
        // 增量：追加新条目。core 对运行中工具条目的就地更新会带新 seq
        // 重新投递完成态——按 tool_call_id 原地修补，不追加重复行。
        for (const message of e.messages) {
          const display = toDisplayMessage(message);
          if (!patchToolMessage(cached.msgs, display)) cached.msgs.push(display);
          if (state.trunkTeamId === key) {
            // 两个列表各持一份副本（独立 key/对象），避免跨列表别名。
            const forTrunk = toDisplayMessage(message);
            if (!patchToolMessage(state.trunk, forTrunk)) state.trunk.push(forTrunk);
          }
        }
        cached.seq = Math.max(seq, cached.seq);
        return state;
      }

      // 全量（首载/full 标志/seq 回退/ClearHistory 等）：重建对应缓存。
      const converted = toDisplayMessages(e.messages);
      state.teamTimelines[key] = { seq, msgs: converted };
      // 仅当响应对应的正是当前查看的 team 时才替换实时视图；其他 team 的
      // 兜底响应只更新缓存。trunk 与缓存解除数组别名（[...converted]），
      // 否则实时推送会污染缓存、切换回来后经增量再投递一次（重复）。
      if (key === String(state.activeTeamId ?? '')) {
        state.trunkTeamId = key;
        state.trunk = [...converted];
      }
      return state;
    }
    case 'AgentOutput': {
      const e = (event as { AgentOutput: { session_id: string; content: string; branch_id: string | null; team_id?: string | null } }).AgentOutput;
      // 正式回答仅当属于当前 team 时进主时间线（跨 agent 不串显）。
      // 回答丢失的历史问题由 AgentCompleted 的兜底拉取补齐（core 的
      // full 标志 + 条目级 seq 使兜底拉取不再重复/串显）。
      if (belongsToActiveTeam(state, e.team_id)) {
        // 正式回答实时进主时间线（推理已按序穿插，无需再附加尾巴）。
        pushTo(state, 'backend', e.content, Math.floor(Date.now() / 1000), {
          sessionId: e.session_id,
          animate: true,
        });
      }
      if (e.branch_id) {
        const tab = state.branchTabs[e.branch_id];
        if (tab) {
          tab.finalContent = e.content;
          tab.msgs.push({ kind: 'content', text: e.content, time: Math.floor(Date.now() / 1000) });
        }
      }
      const act = state.activities[e.session_id];
      if (act && act.phase !== 'completed' && act.phase !== 'failed') {
        act.phase = 'completed';
        act.detail = null;
      }
      return state;
    }
    case 'AgentCompleted': {
      const e = (event as { AgentCompleted: { session_id: string } }).AgentCompleted;
      if (!state.tasks.some((t) => t.sessionId === e.session_id && t.kind === 'reply' && t.status === 'running')) {
        setPhase(state, e.session_id, 'completed', null);
      }
      // 兜底：turn 完成时若该会话最后一条仍未到 backend（回答缺失），
      // 主动拉取时间线对齐——推理/工具已实时显示但回答丢失时保证补齐。
      const trunk = state.trunk.filter((m) => m.sessionId === e.session_id || m.sessionId === undefined);
      const last = trunk[trunk.length - 1];
      if (!last || (last.role !== 'backend' && last.role !== 'branch')) {
        // ⚠️ 兜底请求必须带当前 team_id：team_id: null 会拉回主 agent 的
        // timeline 并污染当前视图（self-coding 下串显 alix 会话）。
        sendCommand({ RequestTrunkTimeline: { team_id: state.activeTeamId } });
      }
      return state;
    }
    case 'SessionUpdated': {
      const e = (event as { SessionUpdated: { session: SessionInfo } }).SessionUpdated;
      // 会话 id 在**团队维度**唯一（不同智能体各有自己的
      // `local:tui::local_user` 等）——按 (team_id, id) 复合键匹配，
      // 否则先到的智能体会话会被后到者覆盖（多会话下导致切换器/侧栏丢项）。
      const teamOf = (session: SessionInfo) => session.team_id ?? null;
      const index = state.sessions.findIndex(
        (s) => s.id === e.session.id && teamOf(s) === teamOf(e.session),
      );
      if (index >= 0) {
        state.sessions[index] = e.session;
      } else {
        state.sessions.push(e.session);
      }
      return state;
    }
    case 'ApiConfigUpdated': {
      const e = (event as { ApiConfigUpdated: ApiConfig }).ApiConfigUpdated;
      state.api = {
        provider: e.provider,
        model: e.model,
        base_url: e.base_url,
        api_key_set: e.api_key_set,
        thinking: e.thinking,
        reasoning_effort: e.reasoning_effort,
        system_prompt: e.system_prompt,
        active_api: e.active_api,
        profiles: e.profiles,
      };
      return state;
    }
    case 'ApiProfilesUpdated': {
      const e = (event as { ApiProfilesUpdated: { active_api: string; profiles: ApiProfileInfo[] } }).ApiProfilesUpdated;
      if (state.api) {
        state.api.active_api = e.active_api;
        state.api.profiles = e.profiles;
      }
      return state;
    }
    case 'ApiTestResult': {
      const e = (event as { ApiTestResult: { name: string; ok: boolean; message: string; latency_ms: number } }).ApiTestResult;
      state.apiTests[e.name] = {
        ok: e.ok,
        message: e.message,
        latencyMs: e.latency_ms,
      };
      return state;
    }
    case 'ApiBalanceResult': {
      const e = (
        event as {
          ApiBalanceResult: {
            name: string;
            ok: boolean;
            available: boolean;
            total: string;
            currency: string;
            message: string;
          };
        }
      ).ApiBalanceResult;
      state.apiBalances[e.name] = {
        ok: e.ok,
        available: e.available,
        total: e.total,
        currency: e.currency,
        message: e.message,
      };
      return state;
    }
    case 'SkillsList': {
      const e = (event as { SkillsList: { skills: SkillInfo[] } }).SkillsList;
      state.skills = e.skills;
      return state;
    }
    case 'ToolsList': {
      const e = (event as { ToolsList: { tools: ToolInfo[] } }).ToolsList;
      state.tools = e.tools;
      return state;
    }
    case 'PluginsList': {
      const e = (event as { PluginsList: { plugins: PluginInfo[] } }).PluginsList;
      state.plugins = e.plugins;
      return state;
    }
    case 'TeamsList': {
      const e = (event as { TeamsList: { teams: TeamInfo[] } }).TeamsList;
      state.teams = e.teams;
      return state;
    }
    case 'ShellSessionsList': {
      const e = (event as { ShellSessionsList: { sessions: import('./protocol').ShellSessionInfo[] } }).ShellSessionsList;
      state.shellSessions = e.sessions;
      // 清理已不存在的会话的终端
      for (const sid of Object.keys(state.shellTerminals)) {
        if (!e.sessions.some((s) => s.session_id === sid)) delete state.shellTerminals[sid];
      }
      return state;
    }
    case 'ShellSessionStarted': {
      const e = (event as { ShellSessionStarted: { session: import('./protocol').ShellSessionInfo } }).ShellSessionStarted;
      const idx = state.shellSessions.findIndex((s) => s.session_id === e.session.session_id);
      if (idx >= 0) state.shellSessions[idx] = e.session;
      else state.shellSessions.push(e.session);
      state.shellTerminals[e.session.session_id] ??= [];
      return state;
    }
    case 'ShellExecStarted': {
      const e = (event as { ShellExecStarted: { session_id: string; seq: number; command: string } }).ShellExecStarted;
      const entries = (state.shellTerminals[e.session_id] ??= []);
      entries.push({ seq: e.seq, command: e.command, status: 'running', output: '' });
      return state;
    }
    case 'ShellExecOutput': {
      const e = (event as { ShellExecOutput: { session_id: string; seq: number; chunk: string } }).ShellExecOutput;
      const entries = state.shellTerminals[e.session_id];
      if (!entries) return state;
      const entry = entries.find((t) => t.seq === e.seq);
      if (entry) entry.output += e.chunk;
      return state;
    }
    case 'ShellExecDone': {
      const e = (event as { ShellExecDone: { session_id: string; seq: number; success: boolean; elapsed_ms: number } }).ShellExecDone;
      const entries = state.shellTerminals[e.session_id];
      const entry = entries?.find((t) => t.seq === e.seq);
      if (entry) {
        entry.status = entry.output.includes('timeout after') ? 'timeout' : e.success ? 'done' : 'failed';
        entry.elapsed_ms = e.elapsed_ms;
      }
      return state;
    }
    case 'ShellSessionClosed': {
      const e = (event as { ShellSessionClosed: { session_id: string; reason: string } }).ShellSessionClosed;
      state.shellSessions = state.shellSessions.filter((s) => s.session_id !== e.session_id);
      return state;
    }
    case 'SystemPrompt': {
      const e = (event as { SystemPrompt: { text: string } }).SystemPrompt;
      state.systemPrompt = e.text;
      return state;
    }
    case 'QqFilterConfig': {
      const e = (event as { QqFilterConfig: AppState['qqFilter'] & { adapter?: string | null } })
        .QqFilterConfig;
      const { adapter: _a, ...filter } = e;
      state.qqFilter = filter;
      const key = e.adapter ?? 'qq';
      state.qqByAdapter[key] = {
        ...(state.qqByAdapter[key] ?? defaultQqInstanceState()),
        filter,
      };
      return state;
    }
    case 'QqGateMode': {
      const e = (event as { QqGateMode: { mode: GateMode; adapter?: string | null } }).QqGateMode;
      state.qqGateMode = e.mode;
      const key = e.adapter ?? 'qq';
      state.qqByAdapter[key] = {
        ...(state.qqByAdapter[key] ?? defaultQqInstanceState()),
        gateMode: e.mode,
      };
      return state;
    }
    case 'QqOwner': {
      const e = (event as { QqOwner: { owner_qq: number; adapter?: string | null } }).QqOwner;
      state.qqOwner = e.owner_qq;
      const key = e.adapter ?? 'qq';
      state.qqByAdapter[key] = {
        ...(state.qqByAdapter[key] ?? defaultQqInstanceState()),
        owner: e.owner_qq,
      };
      return state;
    }
    case 'QqQrcode': {
      const e = (event as {
        QqQrcode: { adapter: string; png_base64: string; error?: string | null };
      }).QqQrcode;
      state.lastQrcode = { ...e };
      return state;
    }
    case 'QqLoginStatus': {
      const e = (event as {
        QqLoginStatus: { adapter: string; online: boolean; user_id?: string | null };
      }).QqLoginStatus;
      state.qqByAdapter[e.adapter] = {
        ...(state.qqByAdapter[e.adapter] ?? defaultQqInstanceState()),
        online: e.online,
        selfId: e.user_id ?? null,
      };
      return state;
    }
    case 'GroupList': {
      const e = (event as {
        GroupList: { groups: Array<{ group_id: number; group_name: string }>; adapter?: string | null };
      }).GroupList;
      state.qqGroups = e.groups.map((g) => [g.group_id, g.group_name]);
      const key = e.adapter ?? 'qq';
      state.qqByAdapter[key] = {
        ...(state.qqByAdapter[key] ?? defaultQqInstanceState()),
        groups: state.qqGroups,
      };
      return state;
    }
    case 'FriendList': {
      const e = (event as { FriendList: { friends: Array<{ user_id: number; nickname: string }> } }).FriendList;
      state.qqFriends = e.friends.map((f) => [f.user_id, f.nickname]);
      return state;
    }
    case 'SudoRequest': {
      const e = (event as { SudoRequest: { request_id: number; command: string; session_id: string } }).SudoRequest;
      state.sudoPrompt = { request_id: e.request_id, command: e.command, session_id: e.session_id, input: '' };
      return state;
    }
    case 'SudoResolved': {
      const e = (event as { SudoResolved: { request_id: number; accepted: boolean; message: string } }).SudoResolved;
      if (state.sudoPrompt && state.sudoPrompt.request_id === e.request_id) {
        state.sudoPrompt = null;
      }
      pushToast(state, e.message, e.accepted ? 'success' : 'error');
      return state;
    }
    case 'MenuRequest': {
      const e = (event as {
        MenuRequest: {
          request_id: number;
          session_id: string;
          title: string;
          description?: string | null;
          options: Array<{ id: string; label: string; description?: string | null }>;
          timeout_secs?: number;
        };
      }).MenuRequest;
      state.menuPrompt = {
        request_id: e.request_id,
        session_id: e.session_id,
        title: e.title,
        description: e.description ?? '',
        options: e.options.map((o) => ({
          id: o.id,
          label: o.label,
          description: o.description ?? '',
        })),
        timeoutSecs: e.timeout_secs ?? 0,
      };
      return state;
    }
    case 'MenuResolved': {
      const e = (event as { MenuResolved: { request_id: number; accepted: boolean; message: string } }).MenuResolved;
      if (state.menuPrompt && state.menuPrompt.request_id === e.request_id) {
        state.menuPrompt = null;
      }
      // 选定由选项本身反馈（弹层关闭即信号）；取消/超时/中断才需要提示。
      if (!e.accepted) {
        pushToast(state, e.message, 'info');
      }
      return state;
    }
    case 'Error': {
      const e = (event as { Error: { session_id: string | null; message: string } }).Error;
      pushToast(state, e.message, 'info');
      return state;
    }
    default:
      return state;
  }
}

function upsertAdapter(state: AppState, entry: AdapterStatus) {
  const index = state.adapters.findIndex((a) => a.name === entry.name);
  if (index >= 0) {
    state.adapters[index] = { ...state.adapters[index], ...entry };
  } else {
    state.adapters.push(entry);
  }
}

function reduceMessage(
  state: AppState,
  e: {
    session_id: string;
    adapter_name: string;
    platform: string;
    user_id: string;
    user_name: string;
    channel: string;
    group_name: string | null;
    content: string;
    images?: string[];
    timestamp: number;
    received_at_ms: number;
    message_sequence: number;
    team_id?: string | null;
  },
) {
  // 其他 team 的实时消息不进当前主时间线（跨 agent 不串显）；
  // 其历史会在切换到对应 team 时由增量/全量同步补齐。
  if (!belongsToActiveTeam(state, e.team_id)) return state;
  if (e.adapter_name === 'timer') {
    pushTo(state, 'system', summarizeTimerEvent(e.content), e.timestamp, {
      sessionId: e.session_id,
    });
  } else if (e.adapter_name === 'background') {
    applyBackgroundHook(state, e.content);
  } else {
    pushTo(state, 'user', displayContentOf(e.content), e.timestamp, {
      sessionId: e.session_id,
      source: {
        adapter_name: e.adapter_name,
        platform: e.platform,
        user_id: e.user_id,
        user_name: e.user_name,
        channel: e.channel,
        group_name: e.group_name,
      },
      images: e.images && e.images.length ? e.images : undefined,
    });
  }
  return state;
}

function applyBackgroundHook(state: AppState, content: string) {
  const match = content.match(/<background_task_event>(.*?)<\/background_task_event>/s);
  if (!match) return;
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return;
  }
  const taskId = String(value['task_id'] ?? '');
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  if (typeof value['objective'] === 'string') task.objective = value['objective'];
  const cancelled = Boolean(value['cancelled']);
  task.status = cancelled ? 'cancelled' : 'awaiting';
  task.completedAtMs = Date.now();
  const deliveries = (value['deliveries'] as unknown[]) ?? [];
  for (const raw of deliveries) {
    const delivery = (raw ?? {}) as Record<string, unknown>;
    const branchId = String(delivery['branch_id'] ?? '');
    let branch = task.branches.find((b) => b.branchId === branchId);
    if (!branch) {
      branch = {
        branchId,
        task: '',
        target: '',
        status: 'completed',
        startedAtMs: task.createdAtMs,
        completedAtMs: task.completedAtMs,
        result: null,
      };
      task.branches.push(branch);
    }
    branch.target = targetLabel(delivery['target'], task.sessionId);
    branch.status = cancelled
      ? 'cancelled'
      : delivery['success']
        ? 'succeeded'
        : 'failed';
    if (typeof delivery['result'] === 'string') branch.result = bounded(delivery['result'], 4000);
  }
}

/** 乐观取消：立即中断当前会话的活动动画/任务/工具运行态，
 * 不等后端确认（后端随后会发 AgentCompleted/ReplyBranchCompleted 对齐）。 */
export function cancelSessionWork(state: AppState, sessionId: string) {
  // 1) 活动 phase → completed：活动浮条/取消按钮立即消失
  const act = state.activities[sessionId];
  if (act && act.phase !== 'completed' && act.phase !== 'failed') {
    act.phase = 'completed';
    act.detail = null;
  }
  // 2) 运行中的任务（reply/后台/子代理）→ cancelled
  for (const task of state.tasks) {
    if (task.sessionId === sessionId && task.status === 'running') {
      task.status = 'cancelled';
      task.completedAtMs = Date.now();
      for (const b of task.branches) {
        if (b.status === 'running') {
          b.status = 'cancelled';
          b.completedAtMs = Date.now();
        }
      }
    }
  }
  // 3) 主时间线 running 工具卡 → failed + “已取消”
  for (const msg of state.trunk) {
    if (msg.sessionId === sessionId && msg.tool && msg.tool.status === 'running') {
      msg.tool.status = 'failed';
      msg.tool.output = '（已取消）';
    }
  }
  // 4) 分支 tab 同步标记
  for (const tab of Object.values(state.branchTabs)) {
    if (tab.sessionId === sessionId && tab.status === 'running') {
      tab.status = 'cancelled';
      for (const m of tab.msgs) {
        if (m.kind === 'tool' && m.status === 'running') {
          m.status = 'failed';
          m.output = '（已取消）';
        }
      }
    }
  }
}

export function pushToast(state: AppState, text: string, kind: Toast['kind']) {
  state.toasts.push({ id: Date.now() + Math.random(), text: truncate(text, 512), kind });
  if (state.toasts.length > 8) {
    state.toasts.splice(0, state.toasts.length - 8);
  }
}

export function dismissToast(state: AppState, id: number) {
  const index = state.toasts.findIndex((toast) => toast.id === id);
  if (index >= 0) state.toasts.splice(index, 1);
}
