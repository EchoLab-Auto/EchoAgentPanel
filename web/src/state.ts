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
import { pushTo, finishToolMessage, loadTimeline } from './state_domains/timeline';
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
  ReasoningEffort,
  TimelineMessage,
  ToolInfo,
  PluginInfo,
  AgentInfo,
} from './protocol';

export const TRUNK_SESSION_ID = 'trunk';

export type MsgRole = 'user' | 'backend' | 'tool' | 'system' | 'branch';
export type ToolStatus = 'running' | 'succeeded' | 'failed';

export interface ToolMsg {
  name: string;
  input: string;
  output: string | null;
  status: ToolStatus;
}

export interface DisplayMessage {
  key: string;
  role: MsgRole;
  content: string;
  time: number;
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

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

export interface ContextSnapshotData {
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
  qqGateMode: GateMode;
  qqOwner: number;
  qqGroups: Array<[number, string]>;
  qqFriends: Array<[number, string]>;
  checklists: ChecklistEntry[];
  sudoPrompt: SudoPrompt | null;
  toasts: Toast[];
  /** API 连通性测试结果（name(空=默认) → { ok, message, latencyMs }） */
  apiTests: Record<string, { ok: boolean; message: string; latencyMs: number }>;
  /** 已发现并注册的技能列表 */
  skills: SkillInfo[];
  /** 已注册的工具定义列表 */
  tools: ToolInfo[];
  /** 已挂载插件列表 */
  plugins: PluginInfo[];
  /** 多 agent 人格列表 */
  agents: AgentInfo[];
  context: ContextSnapshotData | null;
  /** 运行中的临时回复分支（branch_id → tab） */
  branchTabs: Record<string, BranchTab>;
  pendingBackground: Record<
    string,
    { kind: OrchKind; objective: string; branches: BranchActivity[] }
  >;
  pendingReasoning: Record<string, string[]>;
  completedReasoning: Record<string, string[]>;
  nextSubagentSeq: number;
  msgSeq: number;
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
    checklists: [],
    sudoPrompt: null,
    toasts: [],
    apiTests: {},
    skills: [],
    tools: [],
    plugins: [],
    agents: [],
    context: null,
    branchTabs: {},
    pendingBackground: {},
    pendingReasoning: {},
    completedReasoning: {},
    nextSubagentSeq: 0,
    msgSeq: 0,
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
    case 'MessageReceived': {
      const e = (event as { MessageReceived: Parameters<typeof reduceMessage>[1] }).MessageReceived;
      return reduceMessage(state, e);
    }
    case 'AgentThinking': {
      const e = (event as { AgentThinking: { session_id: string } }).AgentThinking;
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
      const e = (event as { AgentReasoning: { session_id: string; branch_id: string; content: string } }).AgentReasoning;
      const content = e.content.trim();
      if (!content) return state;
      const tab = state.branchTabs[e.branch_id];
      if (tab) {
        tab.msgs.push({ kind: 'reasoning', text: content, time: Math.floor(Date.now() / 1000) });
        return state;
      }
      const key = `${e.session_id}:${e.branch_id}`;
      (state.pendingReasoning[key] ??= []).push(content);
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
      if (e.success && !e.cancelled) {
        (state.completedReasoning[e.session_id] ??= []);
        if (!state.completedReasoning[e.session_id].includes(e.branch_id)) {
          state.completedReasoning[e.session_id].push(e.branch_id);
        }
      } else {
        const key = `${e.session_id}:${e.branch_id}`;
        delete state.pendingReasoning[key];
      }
      completeReplyBranch(state, e.branch_id, e.success, e.cancelled, e.completed_at_ms);
      if (!state.tasks.some((t) => t.sessionId === e.session_id && t.kind === 'reply' && t.status === 'running')) {
        setPhase(state, e.session_id, 'completed', null);
      }
      // 分支结束：临时标签消失，主会话以折叠合并块形式出现。
      const tab = state.branchTabs[e.branch_id];
      if (tab) {
        tab.status = e.cancelled ? 'cancelled' : e.success ? 'completed' : 'failed';
        const finalText = tab.finalContent ?? tab.msgs.filter((m) => m.kind === 'content').map((m) => m.text).join('\n');
        const summary = truncate(oneLine(finalText || tab.task || '临时分支'), 96);
        const shortId = e.branch_id.length > 8 ? e.branch_id.slice(0, 8) : e.branch_id;
        pushTo(state, 'branch', `分支 ${shortId} · ${summary}`, Math.floor(e.completed_at_ms / 1000), {
          sessionId: e.session_id,
          branch: {
            branchId: e.branch_id,
            summary,
            msgs: [...tab.msgs],
          },
        });
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
      const e = (event as { ToolCall: { session_id: string; tool_name: string; arguments: string; branch_id?: string } }).ToolCall;
      stageOrchestrationTool(state, e.session_id, e.tool_name, e.arguments);
      setPhase(state, e.session_id, e.tool_name === 'run_subagent' ? 'subagent' : 'tool', e.tool_name);
      const tab = e.branch_id ? state.branchTabs[e.branch_id] : undefined;
      if (tab) {
        // 分支运行期间：工具调用只进临时分支标签，不进主会话。
        tab.msgs.push({
          kind: 'tool',
          text: e.tool_name,
          time: Math.floor(Date.now() / 1000),
          toolName: e.tool_name,
          input: summarizeArguments(e.arguments),
          status: 'running',
        });
        return state;
      }
      pushTo(state, 'tool', e.tool_name, Math.floor(Date.now() / 1000), {
        sessionId: e.session_id,
        tool: { name: e.tool_name, input: summarizeArguments(e.arguments), output: null, status: 'running' },
      });
      return state;
    }
    case 'ToolResult': {
      const e = (event as { ToolResult: { session_id: string; tool_name: string; result: string; branch_id?: string } }).ToolResult;
      const tab = e.branch_id ? state.branchTabs[e.branch_id] : undefined;
      if (tab) {
        const failed = e.result.trimStart().startsWith('error:');
        for (let i = tab.msgs.length - 1; i >= 0; i--) {
          const msg = tab.msgs[i];
          if (msg.kind === 'tool' && msg.toolName === e.tool_name && msg.status === 'running') {
            msg.output = bounded(e.result, 4000);
            msg.status = failed ? 'failed' : 'succeeded';
            break;
          }
        }
        return state;
      }
      finishToolMessage(state, e.tool_name, e.result);
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
      const e = (event as { TrunkTimeline: { messages: TimelineMessage[] } }).TrunkTimeline;
      loadTimeline(state, e.messages);
      return state;
    }
    case 'AgentOutput': {
      const e = (event as { AgentOutput: { session_id: string; content: string; branch_id: string | null } }).AgentOutput;
      if (e.branch_id) {
        const tab = state.branchTabs[e.branch_id];
        if (tab) {
          // 分支运行期间：输出只进临时标签，绝不写入主会话；
          // 由 ReplyBranchCompleted 在结束后以折叠合并块形式归档。
          tab.finalContent = e.content;
          tab.msgs.push({ kind: 'content', text: e.content, time: Math.floor(Date.now() / 1000) });
          const act = state.activities[e.session_id];
          if (act && act.phase !== 'completed' && act.phase !== 'failed') {
            act.phase = 'completed';
            act.detail = null;
          }
          return state;
        }
        // tab 已不存在（如重连后状态清空）：回退到主会话输出，避免丢失。
      }
      const act = state.activities[e.session_id];
      if (act && act.phase !== 'completed' && act.phase !== 'failed') {
        act.phase = 'completed';
        act.detail = null;
      }
      const reasoning = takeReasoning(state, e.session_id, e.branch_id);
      pushTo(state, 'backend', e.content, Math.floor(Date.now() / 1000), {
        sessionId: e.session_id,
        reasoning: reasoning.length ? reasoning : undefined,
      });
      return state;
    }
    case 'AgentCompleted': {
      const e = (event as { AgentCompleted: { session_id: string } }).AgentCompleted;
      if (!state.tasks.some((t) => t.sessionId === e.session_id && t.kind === 'reply' && t.status === 'running')) {
        setPhase(state, e.session_id, 'completed', null);
      }
      // 兜底：若该会话的最后一条显示消息仍是用户消息（回复缺失），
      // 主动拉取时间线补齐，避免事件丢失导致"看不到回复"。
      const trunk = state.trunk.filter((m) => m.sessionId === e.session_id || m.sessionId === undefined);
      const last = trunk[trunk.length - 1];
      if (last && last.role === 'user') {
        sendCommand({ RequestTrunkTimeline: { agent_id: null } });
      }
      return state;
    }
    case 'SessionUpdated': {
      const e = (event as { SessionUpdated: { session: SessionInfo } }).SessionUpdated;
      const index = state.sessions.findIndex((s) => s.id === e.session.id);
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
    case 'AgentsList': {
      const e = (event as { AgentsList: { agents: AgentInfo[] } }).AgentsList;
      state.agents = e.agents;
      return state;
    }
    case 'SystemPrompt': {
      const e = (event as { SystemPrompt: { text: string } }).SystemPrompt;
      state.systemPrompt = e.text;
      return state;
    }
    case 'QqFilterConfig': {
      const e = (event as { QqFilterConfig: AppState['qqFilter'] }).QqFilterConfig;
      state.qqFilter = e;
      return state;
    }
    case 'QqGateMode': {
      const e = (event as { QqGateMode: { mode: GateMode } }).QqGateMode;
      state.qqGateMode = e.mode;
      return state;
    }
    case 'QqOwner': {
      const e = (event as { QqOwner: { owner_qq: number } }).QqOwner;
      state.qqOwner = e.owner_qq;
      return state;
    }
    case 'GroupList': {
      const e = (event as { GroupList: { groups: Array<{ group_id: number; group_name: string }> } }).GroupList;
      state.qqGroups = e.groups.map((g) => [g.group_id, g.group_name]);
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
  },
) {
  if (e.adapter_name === 'timer') {
    pushTo(state, 'system', summarizeTimerEvent(e.content), e.timestamp, {
      sessionId: e.session_id,
    });
  } else if (e.adapter_name === 'background') {
    applyBackgroundHook(state, e.content);
  } else {
    pushTo(state, 'user', e.content, e.timestamp, {
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

function takeReasoning(state: AppState, sessionId: string, branchId: string | null): string[] {
  if (branchId) {
    const completed = state.completedReasoning[sessionId];
    if (completed) {
      const index = completed.indexOf(branchId);
      if (index >= 0) completed.splice(index, 1);
    }
    const key = `${sessionId}:${branchId}`;
    const reasoning = state.pendingReasoning[key];
    delete state.pendingReasoning[key];
    return reasoning ?? [];
  }
  const completed = state.completedReasoning[sessionId];
  if (completed) {
    while (completed.length) {
      const id = completed.shift()!;
      const key = `${sessionId}:${id}`;
      const reasoning = state.pendingReasoning[key];
      delete state.pendingReasoning[key];
      if (reasoning && reasoning.length) return reasoning;
    }
  }
  return [];
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
