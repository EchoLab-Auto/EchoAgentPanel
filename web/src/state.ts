import { oneLine, truncate, summarizeArguments, summarizeTimerEvent, bounded } from './state_domains/helpers';
import {
  activity,
  setPhase,
  startSubagent,
  completeSubagent,
  startReplyBranch,
  completeReplyBranch,
} from './state_domains/orchestration';
import { pushTo, finishToolMessage, toDisplayMessage, toDisplayMessages, patchToolMessage, displayContentOf, parseSubagentEvent, startSubagentRun, finishSubagentRun, appendStreamDelta, settleStream, freezeStreams, type SubagentEventInfo } from './state_domains/timeline';
import { sendCommand } from './connection';
import { adapterOpKey, settleAdapterOp } from './adapterOps';
import { settleAdapterOpsOfCore } from './pending';

//! 前端应用状态与 reducer（移植自 EchoAgentTui 的 state.rs + events.rs）。
//! 事件流从 `/ws` 进来，reducer 把它映射成 React 可渲染的状态。

import type {
  AdapterOpMethod,
  AdapterStatus,
  ApiMetricsEntry,
  ApiProfileInfo,
  BackendEvent,
  ContextBlockInfo,
  ContextMessageInfo,
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

import { checklistKey, scopedKey, sessionKey, teamKey } from './keys';
import { hasRecentLocalActivateIntent } from './workspace';

export const TRUNK_SESSION_ID = 'trunk';

/** 运行区域的展示名（缺省回落上游名）。 */
export function regionLabel(state: AppState, region: string | null | undefined): string {
  if (!region) return '本机';
  return state.regions[region]?.name || region;
}

/** 某 team id 出现在哪些 core 上（去重；null = 单上游/未标注）。 */
export function teamCores(state: AppState, teamId: string): Array<string | null> {
  const out: Array<string | null> = [];
  for (const t of state.teams) {
    if (t.id !== teamId) continue;
    const c = t.core ?? null;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

/**
 * 解析某 team 应路由到哪个 core：优先 activeRegion（同名跨 core 时消歧），
 * 否则取首个带明确 core 的条目；team 未出现在列表返回 undefined。
 */
export function coreForTeam(
  state: AppState,
  teamId: string,
  preferCore?: string | null,
): string | null | undefined {
  const matches = state.teams.filter((t) => t.id === teamId);
  if (!matches.length) return undefined;
  const preferred = preferCore ?? state.activeRegion;
  if (preferred != null && matches.some((t) => (t.core ?? null) === preferred)) {
    return preferred;
  }
  const withCore = matches.find((t) => t.core != null);
  return (withCore?.core ?? matches[0].core) ?? null;
}

/** 实时事件是否属于当前显示的 team 时间线。
 * Panel 的 activeTeamId 用 null 表示主/默认 agent；事件未带 team_id（旧
 * core）或 TeamsList 尚未到达时不过滤。多上游下同名 team 跨 core，必须同时
 * 比较来源 core（`core` 由 store.dispatch 注入），否则 A/B core 的推送会串显。 */
/**
 * 当前**运行区域**：优先 `activeRegion`（已由 agent 选择/TeamsList 校正写入），
 * 否则从当前 agent（或首个带归属的 agent）派生。绝不落回某个"管理目标"变量。
 */
export function currentRegion(state: AppState): string | null {
  if (state.activeRegion) return state.activeRegion;
  const id = state.activeTeamId;
  const matches = id ? state.teams.filter((t) => t.id === id) : [];
  return (
    matches.find((t) => t.core != null)?.core ??
    state.teams.find((t) => t.core != null)?.core ??
    null
  );
}

/**
 * 当前选中的人格条目：优先 (activeTeamId, activeRegion) 精确匹配，其次
 * 同 id 的首个；同名 team 跨 core 时不会取错 core 的画像（能力门控/循环模式）。
 */
export function activeTeam(state: AppState): TeamInfo | null {
  const id = state.activeTeamId;
  if (!id) return state.teams[0] ?? null;
  const matches = state.teams.filter((t) => t.id === id);
  if (!matches.length) return null;
  if (state.activeRegion != null) {
    return matches.find((t) => (t.core ?? null) === state.activeRegion) ?? matches[0];
  }
  return matches[0];
}

export function belongsToActiveTeam(
  state: AppState,
  teamId: string | null | undefined,
  core?: string | null,
): boolean {
  if (teamId === undefined) return true;
  if (state.teams.length === 0) return true;
  // 去主智能体（2026-09）：没有"主 agent"归属；未指定 active 时按列表首个。
  const active = state.activeTeamId ?? state.teams[0]?.id ?? null;
  if (active === null) return true;
  if (teamId !== active) return false;
  // 多上游：同名 team 跨 core 时靠 activeRegion 区分；事件未带 core
  // （单上游无信封）时不过滤。
  if (core != null && state.activeRegion != null && core !== state.activeRegion) {
    return false;
  }
  return true;
}

/** 事件载荷的来源 core（dispatch 注入；单上游 → null）。 */
function evtCore(e: unknown): string | null {
  return (e as { core?: string | null } | null | undefined)?.core ?? null;
}

/** 从整帧事件里取载荷的 core（管理面过滤用，早于具体 cast）。 */
function payloadCore(event: unknown): string | null {
  const body = Object.values(event as Record<string, unknown>)[0];
  return (body as { core?: string | null } | null | undefined)?.core ?? null;
}

/**
 * 管理面事件是否属于当前选中 core（多上游）。单上游 / 未指定 activeRegion 时
 * 放行；这样"设置页看到的配置"始终是 activeRegion 那一份，不会被广播响应里
 * 其他 core 的配置覆盖。
 */
function managementCoreCurrent(state: AppState, core: string | null): boolean {
  return core == null || state.activeRegion == null || core === state.activeRegion;
}

/** 切换 activeRegion 时清空"单值管理面"缓存，避免短暂显示上一个 core 的值。 */
export function resetManagementState(state: AppState): void {
  state.api = null;
  state.skills = [];
  state.tools = [];
  state.plugins = [];
  state.adapters = [];
  state.federation = null;
  state.federationInvite = null;
  state.apiTests = {};
  state.apiBalances = {};
  state.apiMetrics = {};
  state.checklists = {};
}

export type MsgRole = 'user' | 'backend' | 'reasoning' | 'tool' | 'system' | 'branch' | 'subagent';
export type ToolStatus = 'running' | 'succeeded' | 'failed';

export interface ToolMsg {
  name: string;
  input: string;
  output: string | null;
  status: ToolStatus;
  /** 工具调用精确配对 id（新 core 提供；同名并行调用据此配对） */
  toolCallId?: string;
  /** 执行开始时间（epoch ms；core 提供，运行中实时计时用） */
  startedAtMs?: number;
  /** 执行总耗时（ms；core 上报或按开始时间回算） */
  elapsedMs?: number;
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
  /** 显示时间线条目序号；会话历史合并水位线用（`SessionHistory` 快照与窗口
   * 增量对账：seq > baseSeq 的窗口条目才是快照未覆盖的新条目）。 */
  seq?: number;
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
  /** 子代理完成回报（role='subagent' 时的结构化载荷）。 */
  subagent?: SubagentEventInfo;
  /** 流式状态（2026-10）：'streaming' = 增量拼接中；'frozen' = 已冻结
   *（工具开始/取消/错误）；undefined = 非流式或已终值对账。 */
  streamState?: 'streaming' | 'frozen';
  /** 流式归属分支（对账用；终值替换后清除）。 */
  streamBranch?: string;
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
  /** 执行开始时间（epoch ms；core 提供，运行中实时计时用） */
  startedAtMs?: number;
  /** 执行总耗时（ms；core 上报） */
  elapsedMs?: number;
}

/** 运行中的临时回复分支（侧边临时会话标签） */
export interface BranchTab {
  sessionId: string;
  /** 归属上游 core（多上游；null = 单上游/未标注）。 */
  core?: string | null;
  task: string;
  target: string;
  startedAtMs: number;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  finalContent: string | null;
  msgs: BranchMsg[];
}

export type AgentPhase = 'thinking' | 'tool' | 'subagent' | 'completed' | 'failed';

/** 联邦 peer 与状态快照：线格式归 protocol.ts（2026-10 巡检——
 * 此前定义在 state.ts，federation 事件联合类型引用不到）。
 * re-export 保持既有 `import type { FederationPeerInfo } from '../state'`
 * 调用点（FederationSettings 等）零改动。 */
export type { FederationPeerInfo, FederationStatus } from './protocol';
import type { FederationStatus } from './protocol';

export interface AgentActivity {
  phase: AgentPhase;
  detail: string | null;
  startedAt: number;
  toolsCompleted: number;
  subagentsCompleted: number;
  promptTokens: number;
  completionTokens: number;
}

export type OrchKind = 'subagent' | 'reply';
export type OrchStatus = 'running' | 'completed' | 'failed' | 'cancelled';

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
  /** 归属上游 core（多上游聚合；null = 单上游/未标注）。 */
  core?: string | null;
  kind: OrchKind;
  objective: string;
  status: OrchStatus;
  createdAtMs: number;
  completedAtMs: number | null;
  branches: BranchActivity[];
}

export interface ChecklistEntry {
  name: string;
  items: Array<{ text: string; done: boolean }>;
  done: number;
  total: number;
}

/** 读某会话的清单快照（`(core, team, session)` 复合键；2026-10）：
 * 同一 core 内多 persona 的同名会话（各自的 `local:tui::local_user`）
 * 不互相覆盖。写入侧见 reduce 的 ChecklistUpdated 分支。 */
export function checklistsForSession(state: AppState, sessionId: string): ChecklistEntry[] {
  return state.checklists[checklistKey(state.activeRegion, state.activeTeamId, sessionId)] ?? [];
}

/** 会话消息 = 派生历史快照 ⊕ 窗口增量（工具条目按 tool_call_id 就地补丁）。
 * 无历史快照时退回窗口过滤（现行为）。共享显示窗口（每人格 1024 条 FIFO）
 * 淘汰旧会话条目后，快照让无近期活动的会话仍能显示完整历史（2026-10）。 */
export function sessionMessagesFor(state: AppState, sessionId: string, teamId: string | null): DisplayMessage[] {
  const key = checklistKey(state.activeRegion, teamId, sessionId);
  const hist = state.sessionHistory[key];
  const windowMsgs = state.trunk.filter((m) => m.sessionId === sessionId);
  if (!hist) return windowMsgs;
  const out = hist.messages.map((m) => ({ ...m })); // 浅拷贝：补丁不得污染快照
  for (const w of windowMsgs) {
    const seq = w.seq ?? 0;
    if (seq > 0 && seq <= hist.baseSeq) continue; // 已被快照覆盖
    if (!patchToolMessage(out, w)) out.push(w);
  }
  return out;
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

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

export interface ContextSnapshotData {
  /** 快照归属的会话 id（多会话，2026-09；未指定时为 undefined） */
  session_id?: string | null;
  /** 来源上游 core（多上游聚合；store.dispatch 注入）。 */
  core?: string | null;
  messages: ContextMessageInfo[];
  blocks: ContextBlockInfo[];
  total_tokens: number;
  limit_tokens: number;
}

/// 一个上游 Core 的连接状态（Panel 后端 `/api/upstreams` 的元素）。
export interface UpstreamStatus {
  name: string;
  /// 直连地址（SSH 接入时为空串——展示走 ssh 字段）。
  url: string;
  token_set: boolean;
  /// 接入方式：direct（直连）| ssh（SSH 隧道，2026-10 末）。
  access: 'direct' | 'ssh';
  /// SSH 接入详情（access = 'ssh' 时非空；凭据仅以 password_set 标记）。
  ssh: UpstreamSshStatus | null;
  online: boolean;
  connectivity: 'online' | 'connecting' | 'offline';
  auth: 'ok' | 'failed' | 'unknown';
  last_error: string | null;
  last_checked: number;
}

/// SSH 接入的运行状态（面板「Core 连接」页展示隧道阶段与失败原因）。
export interface UpstreamSshStatus {
  host: string;
  port: number;
  user: string;
  remote_port: number;
  identity_file: string;
  password_set: boolean;
  remote_media_dir: string;
  /// 隧道阶段：connecting / online / offline。
  phase: 'connecting' | 'online' | 'offline';
  error: string | null;
  local_port: number | null;
}

/// 一个"运行区域"（= 一个承载 agent 的 Core）。
export interface RegionInfo {
  /// 区域 id（= Core 的 NodeId；未学习到 NodeId 时退化为上游名）。
  id: string;
  /// 展示名（`[core].region_name`；缺省 = 上游名）。
  name: string;
}

export interface AppState {
  connected: boolean;
  /**
   * 本次连接是否已收到过 TrunkTimeline（聊天区首屏加载态判定，2026-09-30）。
   * onopen 重置为 false；任一 TrunkTimeline 到达置 true——为空时区分
   * 「还在加载」与「确实无消息」。
   */
  timelineArrivedOnce: boolean;
  sessions: (SessionInfo & { core?: string | null })[];
  trunk: DisplayMessage[];
  activities: Record<string, AgentActivity>;
  /// 联邦状态快照（`FederationStatus` 事件；None = 未加载或联邦关闭）。
  /// 仅保存"当前运行区域"那一份（activate 区域切换清空）；多 Core 视角见
  /// `federations`。
  federation: FederationStatus | null;
  /// 各 Core 的联邦状态（键 = 上游名；`''` = 单上游/未加壳事件）。
  /// 联邦是 **Core 之间**的网络：管理页按 Core 逐张卡片展示，不跟随当前
  /// Agent/运行区域；单值 `federation` 仍服务区域相关视图（自更新/调度等）。
  federations: Record<string, FederationStatus>;
  /** 自更新状态（`SelfUpdateStatus` 事件；None = 未加载）。 */
  selfUpdateStatus: { state: string; phase?: string | null; revision?: string | null; message?: string | null; updated_at?: string | null } | null;
  /// 本机邀请串（`FederationInvite` 响应；一次性展示，离开联邦页清除）。
  federationInvite: string | null;
  /// 各 Core 最近生成的邀请串（键 = 上游名；`''` = 单上游）。
  federationInvites: Record<string, string>;
  knownCores: Set<string>;
  /// 上游 Core 连接状态（`/api/upstreams` 周期轮询；连接状态卡逐 core 展示）。
  upstreams: UpstreamStatus[];
  /// 上游名 → 运行区域信息（从载荷内建 node_id/region_name 学习）。
  /// 这是 Panel 的"区域注册表"：agent 的「运行区域」即其 `core` 对应的区域名。
  regions: Record<string, RegionInfo>;
  tasks: OrchActivity[];
  adapters: AdapterStatus[];
  api: ApiConfig | null;
  // model / systemPrompt 字段已删除（2026-10 巡检：死状态——事件写入后
  // 零读取方；LlmRequest 的模型名可由 api/会话归属推导，SystemPrompt 的
  // 回推文本仅面向调试，无消费方）。

  /**
   * 通用适配器状态文档（02a §3.1）：`scopedKey(core, adapter)` → `AdapterState`
   * 事件的 `state` 原始文档（**整文档替换**，不做字段 merge）。
   *
   * 值类型 `unknown`：Panel 不校验形状——core 的适配器状态文档 schema v1
   * （00 §三）是唯一引用标准；bind 取值容错由渲染器（03a §2.0）负责。
   */
  adapterUiByKey: Record<string, unknown>;

  /**
   * 各会话的清单快照（复合键 `(core, session_id)` → 清单列表，2026-10 多上游修复）。
   *
   * ⚠️ 曾是全局单值槽：多 core 下 A/B core 的 `ChecklistUpdated` 互相覆盖
   * （清单面板在两端之间跳变）。事件本就带 `session_id`，按会话隔离本来就是
   * 正确语义。读取方按当前选中会话的复合键取值（见 ChecklistSidebar）。
   */
  checklists: Record<string, ChecklistEntry[]>;
  /** 按会话派生的显示历史（`SessionHistory` 事件；key = checklistKey(core, team, session)）。
   * 合并策略：历史快照 + 窗口增量（seq > baseSeq 的窗口条目；工具按 tool_call_id 就地补丁）。 */
  sessionHistory: Record<string, { messages: DisplayMessage[]; total: number; truncated: boolean; baseSeq: number }>;
  toasts: Toast[];
  /** 目录选择器浏览结果（RequestBrowseDirectories 响应，2026-10）：
   * 键 = 复合 (activeRegion, 请求 path \u0000 '' 表示根列表) → 结果。
   * 每次浏览（进目录/换位置）一次请求一次响应（乱序到达按 path 键隔离）。 */
  browseDirectories: Record<
    string,
    {
      roots: import('./protocol').BrowseRoot[];
      entries: import('./protocol').WorkspaceFileEntry[];
      error: string | null;
    }
  >;
  /** 最近一次联邦远端供应商池查询结果（RequestRemoteApiProfiles 响应；
   * ApiSettings「从节点导入」消费；peer → 响应）。 */
  remoteApiProfiles: Record<
    string,
    { active?: Record<string, unknown> | null; profiles: import('./protocol').RemoteApiProfileEntry[]; error: string | null }
  >;
  /** API 连通性测试结果（name(空=默认) → { ok, message, latencyMs }） */
  apiTests: Record<string, { ok: boolean; message: string; latencyMs: number }>;
  /** API 余额查询结果（name(空=默认) → 余额信息） */
  apiBalances: Record<
    string,
    {
      ok: boolean;
      available: boolean;
      total: string;
      currency: string;
      message: string;
      /** 赠送余额（granted_balance；失败时为空串）。 */
      granted: string;
      /** 充值余额（topped_up_balance；失败时为空串）。 */
      topped_up: string;
    }
  >;
  /** API 指标时间序列（name → 近 7 天余额/用量；`ApiMetrics` 事件填充） */
  apiMetrics: Record<string, ApiMetricsEntry>;
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
  /** 激活的工作区对话 id（2026-10 多对话；旧 Core 恒 null） */
  workspaceActiveConversation: string | null;
  workspaceTeamId: string | null;
  /** 上述列表归属的 core（多上游；与 workspaceTeamId 一起判定新鲜度）。 */
  workspaceCore: string | null;
  /** 工作区列表请求代数：拒绝切换 team/core 后到达的旧快照。 */
  workspaceGeneration: number;
  /** 各会话目录 git 状态的缓存（session_id → 目录结果） */
  workspaceGitBySession: Record<string, WorkspaceGitInfo[]>;
  /** 文件浏览器缓存（目录绝对路径 → 条目/错误；workspace 插件） */
  workspaceFiles: Record<string, { entries: WorkspaceFileEntry[]; error: string | null }>;
  /** 会话级 API 覆盖（session_id → profile 名；2026-10）。空值 = 跟随
   * persona 级。Panel 从工作区对话的 api_profile 推导（WorkspaceSessions
   * 事件回推时同步）。 */
  sessionApiOverrides: Record<string, string>;
  /** 当前激活 team（null = default/未指定），用于实时事件隔离 */
  activeTeamId: string | null;
  /**
   * 当前选中 agent 的**运行区域**（= 承载它的上游 core；多上游聚合视图）。
   *
   * 这是**派生量**：只在 agent 选择/TeamsList 校正时由 agent 的归属写入，
   * 不存在独立的"管理目标"开关。所有命令的路由、事件过滤、QQ/设置/联邦等
   * 管理面归属都由它决定——选 agent 即选区域。
   * null = 单上游裸帧 / 未标注。
   */
  activeRegion: string | null;
  /** 后台 shell 会话列表（Shell 面板） */
  shellSessions: import('./protocol').ShellSessionInfo[];
  /** 每会话的终端条目（seq → entry），Shell 面板流式输出 */
  shellTerminals: Record<string, import('./protocol').ShellTerminalEntry[]>;
  /**
   * 各会话的上下文快照（复合键 `(core, session_id)` → 快照，2026-10 多上游修复）。
   *
   * ⚠️ 曾是全局单值槽：多 core 下不同 core 的 `ContextSnapshot` 响应互相覆盖。
   * 按复合键存后写入天然正确；`session_id` 缺失（全局口径请求）时键为
   * `sessionKey(core, '')`。
   */
  contexts: Record<string, ContextSnapshotData>;
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
  // pendingReasoning/completedReasoning 已删除（2026-10 巡检：死状态，
  // 无任何写入/读取方——reasoning 展示由消息条目自带的 reasoning 字段承载）。
  nextSubagentSeq: number;
}

export function initialState(): AppState {
  return {
    connected: false,
    timelineArrivedOnce: false,
    sessions: [],
    trunk: [],
    activities: {},
    federation: null,
    federations: {},
    selfUpdateStatus: null,
    federationInvite: null,
    federationInvites: {},
    knownCores: new Set(),
    upstreams: [],
    regions: {},
    tasks: [],
    adapters: [],
    api: null,
    adapterUiByKey: {},
    checklists: {},
    sessionHistory: {},
    toasts: [],
    browseDirectories: {},
    remoteApiProfiles: {},
    apiTests: {},
    apiBalances: {},
    apiMetrics: {},
    skills: [],
    tools: [],
    plugins: [],
    teams: [],
    workspaceSessions: [],
    workspaceActive: null,
    workspaceActiveConversation: null,
    workspaceTeamId: null,
    workspaceCore: null,
    workspaceGeneration: 0,
    workspaceGitBySession: {},
    workspaceFiles: {},
    sessionApiOverrides: {},
    activeTeamId: null,
    activeRegion: null,
    shellSessions: [],
    shellTerminals: {},
    contexts: {},
    branchTabs: {},
    teamTimelines: {},
    trunkTeamId: null,

    nextSubagentSeq: 0,
  };
}

export function reduce(state: AppState, event: BackendEvent): AppState {
  switch (Object.keys(event)[0]) {
    case 'AdapterStateChanged': {
      if (!managementCoreCurrent(state, payloadCore(event))) return state;
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
      if (!managementCoreCurrent(state, payloadCore(event))) return state;
      // 启停/重启销账（03b §2.2 收尾）：Core 完成 Start/Stop/RestartAdapter
      // 后必重发本事件 → 事件到达即结算该 core 的 `adapter:<op>:<core>:<name>`
      // 登记（core 段精确匹配，见 pending.ts::settleAdapterOpsOfCore）。
      settleAdapterOpsOfCore(payloadCore(event));
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
            active_conversation?: string | null;
            core?: string | null;
          };
        }
      ).WorkspaceSessions;
      // 响应必须属于当前运行区域；重连/切换 core 后到达的旧响应不能
      // 覆盖新鲜列表（单上游/旧 Core 的 core=null 仍兼容放行）。
      if (e.core != null && state.activeRegion != null && e.core !== state.activeRegion) return state;
      // 响应必须属于当前 **agent**（2026-10 多窗口审计）：workspace store 是
      // per-persona，`WorkspaceSessions` 广播经进程级 EventSink 发给所有 Panel
      // 连接并携带 `team_id`。工作区状态在 Panel 是**单槽**——不过滤时：
      // · 另一窗口（或模型的 use 工具）在别的 agent 上激活工作区 → 通播覆盖
      //   本窗口的单槽 → `workspaceTeamId !== activeTeamId`，文件浏览器卡
      //   门控失败、`localLanding` 落点错、`workspacePickIntent` 每次都发激活
      //   （点一下就把全局 active 抢走，反过来影响另一窗口）；
      // · 同窗口切 agent 时，旧 agent 的迟到响应/广播污染新 agent 的快照。
      // 放行条件：team_id 缺省（旧 Core 帧）或本端尚未确定 agent（等 TeamsList
      // 校正后 App 会按新 agent 重拉）。
      if (e.team_id != null && state.activeTeamId != null && e.team_id !== state.activeTeamId) {
        return state;
      }
      state.workspaceSessions = e.sessions ?? [];
      state.workspaceActive = e.active ?? null;
      state.workspaceActiveConversation = e.active_conversation ?? null;
      state.workspaceTeamId = e.team_id ?? null;
      state.workspaceCore = e.core ?? null;
      state.workspaceGeneration += 1;
      // 推导 sessionApiOverrides（session_id → profile 名）。
      // 只替换 `local:workspace:` 键：非工作区会话（QQ 等）的乐观覆盖值不在
      // 本事件的权威范围内，保留不动（此前整体替换会误清它们）。
      const overrides: Record<string, string> = {};
      for (const [key, value] of Object.entries(state.sessionApiOverrides)) {
        if (!key.startsWith('local:workspace:')) overrides[key] = value;
      }
      for (const ws of state.workspaceSessions) {
        for (const conv of ws.conversations ?? []) {
          if (conv.api_profile) {
            const scope = conv.legacy ? ws.id : `${ws.id}/${conv.id}`;
            overrides[`local:workspace:${scope}:local_user`] = conv.api_profile;
          }
        }
      }
      state.sessionApiOverrides = overrides;
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
      state.workspaceGitBySession[sessionKey(evtCore(e), e.session_id)] = e.directories ?? [];
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
      state.workspaceFiles[scopedKey(evtCore(e), e.path)] = {
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
      if (!belongsToActiveTeam(state, e.team_id, evtCore(e))) return state;
      activity(state, sessionKey(evtCore(e), e.session_id));
      return state;
    }
    case 'ActiveTurnsSnapshot': {
      // 刷新恢复（2026-10）：运行状态本是瞬时事件流，刷新重连后 Core 在
      // TrunkTimeline 之后补发本快照。按列表重建 running 集合——本地已有
      // 但快照中不存在的 activity 置 completed（多为刷新前已结束的残留）。
      const e = (event as { ActiveTurnsSnapshot: { session_ids: string[]; team_id?: string | null } }).ActiveTurnsSnapshot;
      if (!belongsToActiveTeam(state, e.team_id, evtCore(e))) return state;
      const core = evtCore(e);
      // activity 键是复合 (core, session_id)：同名跨 core 不互相误杀。
      const running = new Set(e.session_ids.map(id => sessionKey(core, id)));
      // 快照范围：只覆盖"本 core 的该 team"会话的 activity（其他 team/core
      // 正在运行的活动不能被误杀）。
      const scopeOf = (session: { id: string; team_id?: string | null; core?: string | null }) =>
        sessionKey(session.core ?? null, session.id);
      const sameCore = (session: { core?: string | null }) =>
        core == null || (session.core ?? null) === core;
      const scopedIds = e.team_id
        ? new Set(
            state.sessions
              .filter(s => (s.team_id ?? null) === (e.team_id ?? null) && sameCore(s))
              .map(scopeOf),
          )
        : core != null
          ? new Set(state.sessions.filter(sameCore).map(scopeOf))
          : null;
      for (const [key, act] of Object.entries(state.activities)) {
        if (running.has(key)) {
          if (act.phase === 'completed' || act.phase === 'failed') {
            act.phase = 'thinking';
            act.detail = null;
          }
        } else if (
          (act.phase === 'thinking' || act.phase === 'tool' || act.phase === 'subagent') &&
          (scopedIds === null || scopedIds.has(key))
        ) {
          act.phase = 'completed';
          act.detail = null;
        }
      }
      for (const sessionId of e.session_ids) {
        activity(state, sessionKey(core, sessionId));
      }
      return state;
    }
    case 'SelfUpdateStatus': {
      if (!managementCoreCurrent(state, payloadCore(event))) return state;
      state.selfUpdateStatus = (event as { SelfUpdateStatus: AppState['selfUpdateStatus'] }).SelfUpdateStatus;
      return state;
    }
    case 'FederationStatus': {
      const e = (event as { FederationStatus: FederationStatus }).FederationStatus;
      // 按来源 core 归档（联邦是 Core 之间的网络：多 Core 各存一份，
      // 管理页逐 Core 展示，不跟随当前 Agent/运行区域）。
      state.federations[payloadCore(event) ?? ''] = e;
      // 单值字段仍服务"运行区域相关"视图（自更新/调度/目录浏览等）。
      if (managementCoreCurrent(state, payloadCore(event))) state.federation = e;
      return state;
    }
    case 'FederationInvite': {
      const e = (event as { FederationInvite: { invite: string } }).FederationInvite;
      state.federationInvites[payloadCore(event) ?? ''] = e.invite;
      if (managementCoreCurrent(state, payloadCore(event))) state.federationInvite = e.invite;
      return state;
    }
    case 'LlmRequest': {
      const e = (event as { LlmRequest: { session_id: string } }).LlmRequest;
      setPhase(state, sessionKey(evtCore(e), e.session_id), 'thinking', null);
      return state;
    }
    case 'LlmResponse': {
      const e = (event as { LlmResponse: { session_id: string; prompt_tokens: number; completion_tokens: number } }).LlmResponse;
      const act = activity(state, sessionKey(evtCore(e), e.session_id));
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
      if (belongsToActiveTeam(state, e.team_id, evtCore(e))) {
        // 流式对账：本步推理已按增量实时展示过 → 全量替换该行（不再第二遍
        // 打字动画）；无流式行（非流式路径）→ 既有整段 + 打字动画。
        if (!settleStream(state, 'reasoning', e.session_id, e.branch_id, content)) {
          pushTo(state, 'reasoning', content, Math.floor(Date.now() / 1000), {
            sessionId: e.session_id,
            animate: true,
          });
        }
      }
      const tab = state.branchTabs[scopedKey(evtCore(e), e.branch_id)];
      if (tab) {
        tab.msgs.push({ kind: 'reasoning', text: content, time: Math.floor(Date.now() / 1000) });
      }
      return state;
    }
    case 'AgentContentDelta': {
      const e = (event as { AgentContentDelta: { session_id: string; branch_id: string; delta: string; team_id?: string | null } }).AgentContentDelta;
      // 流式正文增量：实时追加到流式行（终值 AgentOutput 到达时全量对账）。
      if (e.delta && belongsToActiveTeam(state, e.team_id, evtCore(e))) {
        appendStreamDelta(state, 'backend', e.session_id, e.branch_id, e.delta);
      }
      return state;
    }
    case 'AgentReasoningDelta': {
      const e = (event as { AgentReasoningDelta: { session_id: string; branch_id: string; delta: string; team_id?: string | null } }).AgentReasoningDelta;
      // 流式推理增量：实时追加到流式行（终值 AgentReasoning 到达时全量对账）。
      if (e.delta && belongsToActiveTeam(state, e.team_id, evtCore(e))) {
        appendStreamDelta(state, 'reasoning', e.session_id, e.branch_id, e.delta);
      }
      return state;
    }
    case 'SubagentStarted': {
      const e = (event as { SubagentStarted: { session_id: string; task: string } }).SubagentStarted;
      const core = evtCore(e);
      startSubagent(state, e.session_id, core, e.task);
      // 派发位置插一行"子代理运行中"（执行过程就地可见；完成时就地改写为结果）。
      startSubagentRun(state, e.session_id, e.task);
      setPhase(state, sessionKey(core, e.session_id), 'subagent', truncate(oneLine(e.task), 72));
      return state;
    }
    case 'SubagentCompleted': {
      const e = (event as { SubagentCompleted: { session_id: string; success: boolean } }).SubagentCompleted;
      const core = evtCore(e);
      completeSubagent(state, e.session_id, core, e.success);
      const act = activity(state, sessionKey(core, e.session_id));
      if (e.success) act.subagentsCompleted += 1;
      setPhase(state, sessionKey(core, e.session_id), 'thinking', e.success ? '正在整合 subagent 结果' : 'subagent 失败，正在恢复');
      return state;
    }
    case 'ReplyBranchStarted': {
      const e = (event as { ReplyBranchStarted: { session_id: string; branch_id: string; message_sequence: number; task: string; target: string; started_at_ms: number } }).ReplyBranchStarted;
      startReplyBranch(state, e.session_id, evtCore(e), e.branch_id, e.message_sequence, e.task, e.target, e.started_at_ms);
      // 单开一个侧边临时会话标签：分支运行期间的活动都路由到这里，
      // 不进入主会话 trunk。
      state.branchTabs[scopedKey(evtCore(e), e.branch_id)] = {
        sessionId: e.session_id,
        core: evtCore(e),
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
      const tab = state.branchTabs[scopedKey(evtCore(e), e.branch_id)];
      if (tab) {
        tab.msgs.push({ kind: 'content', text: e.content, time: Math.floor(Date.now() / 1000) });
      }
      return state;
    }
    case 'ReplyBranchCompleted': {
      const e = (event as { ReplyBranchCompleted: { session_id: string; branch_id: string; success: boolean; cancelled: boolean; completed_at_ms: number } }).ReplyBranchCompleted;
      completeReplyBranch(state, e.branch_id, e.success, e.cancelled, e.completed_at_ms);
      const core = evtCore(e);
      if (
        !state.tasks.some(
          (t) =>
            t.sessionId === e.session_id &&
            (t.core ?? null) === core &&
            t.kind === 'reply' &&
            t.status === 'running',
        )
      ) {
        setPhase(state, sessionKey(core, e.session_id), 'completed', null);
      }
      // 分支结束：主时间线已实时展示推理/工具/回答（时序交错），
      // 不再归档折叠合并块（避免重复内容）；仅清理临时标签。
      const tab = state.branchTabs[scopedKey(evtCore(e), e.branch_id)];
      if (tab) {
        tab.status = e.cancelled ? 'cancelled' : e.success ? 'completed' : 'failed';
        delete state.branchTabs[scopedKey(evtCore(e), e.branch_id)];
      }
      return state;
    }
    case 'ToolCall': {
      const e = (event as { ToolCall: { session_id: string; tool_name: string; arguments: string; tool_call_id?: string; branch_id?: string; team_id?: string | null; started_at_ms?: number } }).ToolCall;
      const startedAtMs = typeof e.started_at_ms === 'number' ? e.started_at_ms : Date.now();
      setPhase(state, sessionKey(evtCore(e), e.session_id), e.tool_name === 'run_subagent' ? 'subagent' : 'tool', e.tool_name);
      // 流式分步切分：工具开始 = 该步内容为中间叙述（此后不再有终值到达）
      // ——冻结当前正文流式行（保留已显示文本）；下一步的增量将新建一行。
      freezeStreams(state, e.session_id, {
        role: 'backend',
        branch: e.branch_id || undefined,
      });
      // 工具调用实时进主时间线（与推理交错）；分支 tab 同步记录供详情查看。
      // 仅当事件属于当前 team 时才进主时间线（跨 agent 不串显）。
      const tab = e.branch_id ? state.branchTabs[scopedKey(evtCore(e), e.branch_id)] : undefined;
      if (belongsToActiveTeam(state, e.team_id, evtCore(e))) {
        pushTo(state, 'tool', e.tool_name, Math.floor(Date.now() / 1000), {
          sessionId: e.session_id,
          animate: true,
          tool: {
            name: e.tool_name,
            input: summarizeArguments(e.arguments),
            output: null,
            status: 'running',
            toolCallId: e.tool_call_id || undefined,
            startedAtMs,
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
          startedAtMs,
        });
      }
      return state;
    }
    case 'ToolResult': {
      const e = (event as { ToolResult: { session_id: string; tool_name: string; result: string; tool_call_id?: string; timed_out?: boolean; branch_id?: string; team_id?: string | null; elapsed_ms?: number } }).ToolResult;
      // 工具结果实时回填主时间线（与 ToolCall 精确配对）；分支 tab 同步更新。
      const tab = e.branch_id ? state.branchTabs[scopedKey(evtCore(e), e.branch_id)] : undefined;
      if (belongsToActiveTeam(state, e.team_id, evtCore(e))) {
        finishToolMessage(state, e.tool_name, e.result, e.tool_call_id, e.timed_out, e.elapsed_ms);
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
          msg.elapsedMs =
            typeof e.elapsed_ms === 'number'
              ? e.elapsed_ms
              : msg.startedAtMs != null
                ? Math.max(0, Date.now() - msg.startedAtMs)
                : undefined;
          break;
        }
      }
      const act = activity(state, sessionKey(evtCore(e), e.session_id));
      if (e.tool_name !== 'run_subagent') act.toolsCompleted += 1;
      setPhase(state, sessionKey(evtCore(e), e.session_id), 'thinking', null);
      return state;
    }
    case 'ChecklistUpdated': {
      const e = (event as { ChecklistUpdated: { session_id: string; team_id?: string | null; state: { lists: Array<{ name: string; items: Array<{ text: string; done: boolean }> }> } } }).ChecklistUpdated;
      // 按 (core, team_id, session_id) 复合键隔离（2026-10）：多 core 下同名
      // 会话不互相覆盖；同一 core 内多 persona 的同名会话（各自的
      // local:tui::local_user）也不互相覆盖。
      const key = checklistKey(evtCore(e), e.team_id ?? null, e.session_id);
      state.checklists[key] = (e.state.lists ?? [])
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
      // 按 (core, session_id) 复合键存：多 core 下不同 core 的响应不互相
      // 覆盖。session_id 缺失（旧 Core 全局口径）时归入 `sessionKey(core, '')`。
      const key = sessionKey(evtCore(e), e.session_id ?? '');
      state.contexts[key] = e;
      return state;
    }
    case 'TrunkTimeline': {
      const e = (event as { TrunkTimeline: { messages: TimelineMessage[]; seq?: number; team_id?: string | null; full?: boolean; core?: string | null } }).TrunkTimeline;
      // 多上游：同名 team 跨 core 时只接受当前 activeRegion 的响应——
      // 广播请求（TeamsList 尚未到达时）会让多个 core 各回一份，key 相同
      // 会互相覆盖/串显。core 未标注（单上游/旧 core）时不过滤。
      if (e.core != null && state.activeRegion != null && e.core !== state.activeRegion) {
        return state;
      }
      // 首屏加载态：收到过即说明 Core 已回（哪怕为空）——「暂无消息」只在此时展示。
      state.timelineArrivedOnce = true;
      // ⚠️ 响应归属由后端标注（team_id = 请求值），绝不能拿当前
      // activeTeamId 猜测：其他 agent 的兜底请求若按当前视图路由会
      // 污染 trunk（串显 alix 会话/误清空 self-coding 内容）。
      const seq = e.seq ?? 0;
      // 归属键用复合 (core, team_id)：同名 team 跨 core 时缓存不互相覆盖。
      const key = teamKey(e.core, e.team_id ?? null);
      const cached = state.teamTimelines[key];

      if (e.full === undefined && cached && seq === cached.seq && e.messages.length === 0) {
        // 空增量：仅游标对齐（无变化）。
        return state;
      }
      const isFull = e.full !== undefined ? e.full : !(cached && seq > cached.seq);

      if (!isFull && cached) {
        // 增量：追加新条目。core 对运行中工具条目的就地更新会带新 seq
        // 重新投递完成态——按 tool_call_id 原地修补，不追加重复行。
        //
        // **seq 去重**（2026-10 多窗口）：`TrunkTimeline` 是广播事件——本窗口
        // 请求的响应，**其他所有窗口**也会收到（`RequestTrunkTimeline` 由各
        // 窗口按自己的游标发，Core 只 emit 一次全量广播）。若本窗口游标比
        // 请求方新，同一批条目会被再 push 一遍 → 消息列表出现重复行、key 全
        // 换、看起来像"列表被刷新/换了会话"。用游标以下界过滤即可幂等。
        const floor = cached.seq;
        for (const message of e.messages) {
          const msgSeq = message.seq ?? 0;
          if (msgSeq > 0 && msgSeq <= floor) continue; // 已经见过这一条
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
      if (key === teamKey(state.activeRegion, state.activeTeamId)) {
        state.trunkTeamId = key;
        state.trunk = [...converted];
      }
      return state;
    }
    case 'SessionHistory': {
      const e = (event as { SessionHistory: { team_id?: string | null; session_id: string; messages: TimelineMessage[]; total: number; truncated?: boolean; max_seq?: number; core?: string | null } }).SessionHistory;
      if (e.core != null && state.activeRegion != null && e.core !== state.activeRegion) return state;
      const key = checklistKey(evtCore(e), e.team_id ?? null, e.session_id);
      // baseSeq（合并水位线）：优先取服务端下发的 max_seq（派生时快照水位，
      // 避免「派生后~到达前」的新条目被误跳过）；缺失时回退按当前窗口计算。
      const fallbackBase = state.trunk.reduce((max, m) => (m.sessionId === e.session_id && (m.seq ?? 0) > max ? (m.seq ?? 0) : max), 0);
      state.sessionHistory[key] = {
        messages: toDisplayMessages(e.messages),
        total: e.total,
        truncated: !!e.truncated,
        baseSeq: e.max_seq ?? fallbackBase,
      };
      const keys = Object.keys(state.sessionHistory);
      if (keys.length > 64) delete state.sessionHistory[keys[0]];
      return state;
    }
    case 'AgentOutput': {
      const e = (event as { AgentOutput: { session_id: string; content: string; branch_id: string | null; team_id?: string | null } }).AgentOutput;
      // 正式回答仅当属于当前 team 时进主时间线（跨 agent 不串显）。
      // 回答丢失的历史问题由 AgentCompleted 的兜底拉取补齐（core 的
      // full 标志 + 条目级 seq 使兜底拉取不再重复/串显）。
      if (belongsToActiveTeam(state, e.team_id, evtCore(e))) {
        // 正式回答实时进主时间线（推理已按序穿插，无需再附加尾巴）。
        // 流式对账：全量替换流式行（branch_id 缺失=后端路径时取最新流式
        // 行）；无流式行（非流式路径）→ 既有整段 + 入场动画。
        if (!settleStream(state, 'backend', e.session_id, e.branch_id ?? null, e.content)) {
          pushTo(state, 'backend', e.content, Math.floor(Date.now() / 1000), {
            sessionId: e.session_id,
            animate: true,
          });
        }
      }
      if (e.branch_id) {
        const tab = state.branchTabs[scopedKey(evtCore(e), e.branch_id)];
        if (tab) {
          tab.finalContent = e.content;
          tab.msgs.push({ kind: 'content', text: e.content, time: Math.floor(Date.now() / 1000) });
        }
      }
      const act = state.activities[sessionKey(evtCore(e), e.session_id)];
      if (act && act.phase !== 'completed' && act.phase !== 'failed') {
        act.phase = 'completed';
        act.detail = null;
      }
      return state;
    }
    case 'AgentCompleted': {
      const e = (event as { AgentCompleted: { session_id: string; core?: string | null } }).AgentCompleted;
      const core = evtCore(e);
      if (
        !state.tasks.some(
          (t) =>
            t.sessionId === e.session_id &&
            (t.core ?? null) === core &&
            t.kind === 'reply' &&
            t.status === 'running',
        )
      ) {
        setPhase(state, sessionKey(core, e.session_id), 'completed', null);
      }
      // 兜底：turn 完成时若该会话仍无任何 backend（回答缺失），主动拉取
      // 时间线对齐——推理/工具已实时显示但回答丢失时保证补齐。
      //
      // 两个防误触发（2026-10 滚动 bug 修复）：
      // 1. 判定从「最后一条不是 backend」改为「连一条 backend/branch 都
      //    没有」——工具回合/系统行收尾时 AgentOutput 已在 trunk 里但不是
      //    最后一条，旧判定会**每轮对话结束都误触发**兜底；
      // 2. 兜底请求带 since_seq（缓存游标）——不带时 Core 回 full:true
      //    全量，前端 trunk 整体替换、消息 key 全部重建，DOM 回顶（用户
      //    看到的「对话框滑到最上面」）。带游标走增量路径：追加不重建。
      const trunk = state.trunk.filter((m) => m.sessionId === e.session_id || m.sessionId === undefined);
      const hasAnswer = trunk.some((m) => m.role === 'backend' || m.role === 'branch');
      if (!hasAnswer) {
        // ⚠️ 兜底请求必须带当前 team_id：team_id: null 会拉回主 agent 的
        // timeline 并污染当前视图（self-coding 下串显 alix 会话）。
        const sinceSeq =
          state.teamTimelines[teamKey(state.activeRegion, state.activeTeamId)]?.seq ?? 0;
        sendCommand({
          RequestTrunkTimeline: { team_id: state.activeTeamId, since_seq: sinceSeq },
        });
      }
      return state;
    }
    case 'SessionUpdated': {
      const e = (event as { SessionUpdated: { session: SessionInfo } }).SessionUpdated;
      // 会话身份 = (id, team_id)；`core` 只是**归属标注**，不是身份的一部分。
      // ⚠️ 曾经的 bug：去重要求 core 精确相等，于是中继加壳抖动期间同一会话
      // 会以 `core=null` 与 `core='core'` 两份并存 → 切换器出现同名重复会话。
      // 现在：无归属的旧副本被"收编"（替换为带归属的），或收到无归属副本时
      // 直接丢弃（已有带归属的同名会话）；同时清掉同身份的多余副本。
      const teamOf = (session: SessionInfo) => session.team_id ?? null;
      const coreOf = (session: SessionInfo & { core?: string | null }) => session.core ?? null;
      const isSame = (s: SessionInfo & { core?: string | null }) =>
        s.id === e.session.id && teamOf(s) === teamOf(e.session);
      const incomingCore = coreOf(e.session);
      const same = state.sessions.filter(isSame);
      const adoptIdx = (() => {
        const exact = same.find((s) => coreOf(s) === incomingCore);
        if (exact) return state.sessions.indexOf(exact);
        const orphan = same.find((s) => coreOf(s) == null);
        if (orphan) return state.sessions.indexOf(orphan);
        return -1;
      })();
      if (adoptIdx >= 0) {
        state.sessions = state.sessions
          .map((s, index) => (index === adoptIdx ? e.session : s))
          .filter((s, index) => index === adoptIdx || !isSame(s));
      } else if (incomingCore != null || same.length === 0) {
        state.sessions.push(e.session);
      }
      return state;
    }
    case 'ApiConfigUpdated': {
      if (!managementCoreCurrent(state, payloadCore(event))) return state;
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
      if (!managementCoreCurrent(state, payloadCore(event))) return state;
      const e = (event as { ApiProfilesUpdated: { active_api: string; profiles: ApiProfileInfo[] } }).ApiProfilesUpdated;
      if (state.api) {
        state.api.active_api = e.active_api;
        state.api.profiles = e.profiles;
      }
      return state;
    }
    case 'BrowseDirectories': {
      const e = (event as {
        BrowseDirectories: {
          path?: string | null;
          roots?: import('./protocol').BrowseRoot[];
          entries?: import('./protocol').WorkspaceFileEntry[];
          error?: string | null;
        };
      }).BrowseDirectories;
      // 键与 DirectoryPicker 的请求键一致：请求 path 为 None（根列表）时
      // 键为空串——同一 activeRegion 下 local 根（''）与 peer 根
      // （'node://peer'）天然不冲突。
      const key = scopedKey(state.activeRegion, e.path ?? '');
      state.browseDirectories[key] = {
        roots: e.roots ?? [],
        entries: e.entries ?? [],
        error: e.error ?? null,
      };
      return state;
    }
    case 'RemoteApiProfiles': {
      const e = (event as {
        RemoteApiProfiles: {
          peer: string;
          active?: Record<string, unknown> | null;
          profiles?: import('./protocol').RemoteApiProfileEntry[];
          error?: string | null;
        };
      }).RemoteApiProfiles;
      state.remoteApiProfiles[e.peer] = {
        active: e.active ?? null,
        profiles: e.profiles ?? [],
        error: e.error ?? null,
      };
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
            granted: string;
            topped_up: string;
          };
        }
      ).ApiBalanceResult;
      state.apiBalances[e.name] = {
        ok: e.ok,
        available: e.available,
        total: e.total,
        currency: e.currency,
        message: e.message,
        granted: e.granted,
        topped_up: e.topped_up,
      };
      return state;
    }
    case 'ApiMetrics': {
      const e = (event as { ApiMetrics: { entries: ApiMetricsEntry[] } }).ApiMetrics;
      // 逐目标覆盖（"" = 顶层默认；请求单目标时只更新该目标，其余保留）。
      for (const entry of e.entries ?? []) {
        state.apiMetrics[entry.name] = entry;
      }
      return state;
    }
    case 'SkillsList': {
      if (!managementCoreCurrent(state, payloadCore(event))) return state;
      const e = (event as { SkillsList: { skills: SkillInfo[] } }).SkillsList;
      state.skills = e.skills;
      return state;
    }
    case 'ToolsList': {
      if (!managementCoreCurrent(state, payloadCore(event))) return state;
      const e = (event as { ToolsList: { tools: ToolInfo[] } }).ToolsList;
      state.tools = e.tools;
      return state;
    }
    case 'PluginsList': {
      if (!managementCoreCurrent(state, payloadCore(event))) return state;
      const e = (event as { PluginsList: { plugins: PluginInfo[] } }).PluginsList;
      state.plugins = e.plugins;
      return state;
    }
    case 'TeamsList': {
      const e = (event as { TeamsList: { teams: TeamInfo[] } }).TeamsList;
      // 多上游聚合：每份 TeamsList 只代表一个来源 core 的人格集合，按
      // (core, id) 合并——整体覆盖会让 A/B 两 core 的列表互相顶掉，选中态
      // 与路由随之错乱（把 A core 的 default 发给 B core →
      // 「智能体 default 不存在」）。单上游时 core 恒为 null，等价于整体替换。
      const incoming = e.teams;
      const incomingCores = new Set<unknown>();
      for (const t of incoming) incomingCores.add(t.core ?? null);
      const kept = state.teams.filter((t) => !incomingCores.has(t.core ?? null));
      const seen = new Set<string>();
      const merged: TeamInfo[] = [];
      for (const t of [...kept, ...incoming]) {
        const key = `${t.core ?? ''}\u0000${t.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(t);
      }
      // 当前 active core 的条目排前：`teams[0]` 兜底默认时不会跳到别的 core。
      const activeRegion = state.activeRegion;
      if (activeRegion != null) {
        merged.sort((a, b) => {
          const ac = (a.core ?? null) === activeRegion ? 0 : 1;
          const bc = (b.core ?? null) === activeRegion ? 0 : 1;
          return ac - bc;
        });
      }
      state.teams = merged;
      return state;
    }
    case 'ShellSessionsList': {
      const e = (event as {
        ShellSessionsList: {
          sessions: import('./protocol').ShellSessionInfo[];
          core?: string | null;
        };
      }).ShellSessionsList;
      // 会话 id 是 per-core 的 `sh-{seq}`（每个 core 都从 sh-1 起）：按
      // core 合并，只替换本 core 的切片，避免清掉其他 core 的 shell。
      const cores = new Set<unknown>();
      for (const s of e.sessions) cores.add(s.core ?? null);
      if (cores.size === 0) cores.add(e.core ?? null);
      const kept = state.shellSessions.filter(
        (s) => !cores.has((s as { core?: string | null }).core ?? null),
      );
      state.shellSessions = [...kept, ...e.sessions];
      const live = new Set(e.sessions.map((s) => sessionKey(s.core, s.session_id)));
      for (const key of Object.keys(state.shellTerminals)) {
        const coreOf = key.includes('\u0000') ? key.slice(0, key.indexOf('\u0000')) : null;
        if (cores.has(coreOf) && !live.has(key)) delete state.shellTerminals[key];
      }
      return state;
    }
    case 'ShellSessionStarted': {
      const e = (event as { ShellSessionStarted: { session: import('./protocol').ShellSessionInfo } }).ShellSessionStarted;
      const core = e.session.core ?? null;
      const idx = state.shellSessions.findIndex(
        (s) => s.session_id === e.session.session_id && (s.core ?? null) === core,
      );
      if (idx >= 0) state.shellSessions[idx] = e.session;
      else state.shellSessions.push(e.session);
      state.shellTerminals[sessionKey(core, e.session.session_id)] ??= [];
      return state;
    }
    case 'ShellExecStarted': {
      const e = (event as { ShellExecStarted: { session_id: string; seq: number; command: string; core?: string | null } }).ShellExecStarted;
      const entries = (state.shellTerminals[sessionKey(evtCore(e), e.session_id)] ??= []);
      entries.push({ seq: e.seq, command: e.command, status: 'running', output: '' });
      return state;
    }
    case 'ShellExecOutput': {
      const e = (event as { ShellExecOutput: { session_id: string; seq: number; chunk: string; core?: string | null } }).ShellExecOutput;
      const entries = state.shellTerminals[sessionKey(evtCore(e), e.session_id)];
      if (!entries) return state;
      const entry = entries.find((t) => t.seq === e.seq);
      if (entry) entry.output += e.chunk;
      return state;
    }
    case 'ShellExecDone': {
      const e = (event as { ShellExecDone: { session_id: string; seq: number; success: boolean; elapsed_ms: number; core?: string | null } }).ShellExecDone;
      const entries = state.shellTerminals[sessionKey(evtCore(e), e.session_id)];
      const entry = entries?.find((t) => t.seq === e.seq);
      if (entry) {
        entry.status = entry.output.includes('timeout after') ? 'timeout' : e.success ? 'done' : 'failed';
        entry.elapsed_ms = e.elapsed_ms;
      }
      return state;
    }
    case 'ShellSessionClosed': {
      const e = (event as { ShellSessionClosed: { session_id: string; reason: string; core?: string | null } }).ShellSessionClosed;
      const core = evtCore(e);
      state.shellSessions = state.shellSessions.filter(
        (s) => !(s.session_id === e.session_id && (s.core ?? null) === core),
      );
      delete state.shellTerminals[sessionKey(core, e.session_id)];
      return state;
    }
    // ── 适配器泛化（02a §6.2）：统一 op 结果配对与状态文档写入 ────────────
    // 二者都**不**经 managementCoreCurrent 过滤：op 可发往非活跃 core，
    // 且多 core 聚合靠 scopedKey 隔离（过滤会让非活跃 core 的文档永远进不来）。
    // 顺序：两臂互不依赖、各自幂等（结果与状态到达顺序无保证，03a §4.2）。
    case 'AdapterOpResult': {
      const e = (event as {
        AdapterOpResult: {
          adapter: string;
          method: string;
          result?: unknown;
          error?: string | null;
          core?: string | null;
        };
      }).AdapterOpResult;
      // 键配对（无线协议无请求 id，02a §1-D1）：resolve 在途 Promise 并放行
      // 同键 FIFO 的下一个；无命中的迟到结果由服务层静默丢弃。
      settleAdapterOp(adapterOpKey(evtCore(e), e.adapter, e.method as AdapterOpMethod), {
        result: e.result ?? null,
        error: e.error ?? null,
      });
      return state;
    }
    case 'AdapterState': {
      const e = (event as {
        AdapterState: { adapter: string; state: unknown; core?: string | null };
      }).AdapterState;
      // 整文档替换，不做字段 merge（02a §3.1）。
      state.adapterUiByKey[scopedKey(evtCore(e), e.adapter)] = e.state;
      return state;
    }
    case 'SessionMigrated': {
      const e = (event as {
        SessionMigrated: {
          session_id: string;
          target_peer: string;
          message: string;
          success: boolean;
        };
      }).SessionMigrated;
      // 迁移受理 + 终态两条事件都经此提示；成功/失败给不同语气。
      pushToast(state, e.message, e.success ? 'success' : 'error');
      return state;
    }
    case 'Error': {
      const e = (event as { Error: { session_id: string | null; message: string } }).Error;
      // 流式：错误中断当前步——冻结该会话流式行（保留已显示的部分文本）。
      if (e.session_id) freezeStreams(state, e.session_id);
      // 工作区激活/取消的成功提示：Core 用 `Error{session_id:null}` 广播给
      // **所有**连接（`workspace/commands.rs`）。不过滤的话，A 窗口点一下
      // 工作区通道，B 窗口也弹出「已激活工作区会话：X」——多窗口串台
      // （2026-10）。只在本窗口刚发起激活时显示（提示对本窗口有意义，
      // 对其他窗口是噪音且会被误读成"我也被切过去了"）。
      if (!e.session_id && isWorkspaceActivationNotice(e.message) && !hasRecentLocalActivateIntent()) {
        return state;
      }
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
  if (!belongsToActiveTeam(state, e.team_id, evtCore(e))) return state;
  if (e.adapter_name === 'timer') {
    pushTo(state, 'system', summarizeTimerEvent(e.content), e.timestamp, {
      sessionId: e.session_id,
    });
  } else if (e.adapter_name === 'subagent' && parseSubagentEvent(e.content)) {
    // 子代理完成回报：就地把派发位置的"运行中"行改写为结果行（一份委派一行）；
    // 未命中（行已裁掉/刷新后无合成行）则追加，避免结果丢失。
    const subagent = parseSubagentEvent(e.content) as SubagentEventInfo;
    if (!finishSubagentRun(state, e.session_id, subagent)) {
      pushTo(state, 'subagent', subagent.task, e.timestamp, {
        sessionId: e.session_id,
        subagent,
        animate: true,
      });
    }
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

/** 乐观取消：立即中断当前会话的活动动画/任务/工具运行态，
 * 不等后端确认（后端随后会发 AgentCompleted/ReplyBranchCompleted 对齐）。 */
export function cancelSessionWork(state: AppState, sessionId: string, core: string | null = null) {
  // 0) 流式：取消即冻结——保留已显示的部分文本，不再等待终值。
  freezeStreams(state, sessionId);
  // 1) 活动 phase → completed：活动浮条/取消按钮立即消失
  //    活动态键是复合 (core, session_id)：同名跨 core 不误伤。
  const act = state.activities[sessionKey(core, sessionId)];
  if (act && act.phase !== 'completed' && act.phase !== 'failed') {
    act.phase = 'completed';
    act.detail = null;
  }
  // 2) 运行中的任务（reply/后台/子代理）→ cancelled
  for (const task of state.tasks) {
    if (task.sessionId === sessionId && (task.core ?? null) === core && task.status === 'running') {
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
    if (tab.sessionId === sessionId && (tab.core ?? null) === core && tab.status === 'running') {
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

/** 上游删除的会话清理（2026-10 🟡 修复）：该 core 名下的会话、
 * 活动、选中态一并移除——此前侧栏残留死会话且不会自行消失。 */
export function removeSessionsOfCore(state: AppState, core: string): void {
  // 该 core 下线/移除：人格列表、会话、活动、选中态一并清理——否则残留的
  // 人格条目会让路由继续把命令发往已消失的 core（「智能体 X 不存在」）。
  state.teams = state.teams.filter(t => (t.core ?? null) !== core);
  delete state.regions[core];
  if (state.activeRegion === core) state.activeRegion = null;
  const removed = state.sessions.filter(s => (s as { core?: string | null }).core === core);
  const removedIds = new Set(removed.map(s => s.id));
  state.sessions = state.sessions.filter(s => !removedIds.has(s.id));
  for (const id of removedIds) {
    delete state.activities[sessionKey(core, id)];
  }
  // 该 core 的任务与 timeline 缓存（复合键前缀）一并清理，避免残留死条目。
  const prefix = `${core}\u0000`;
  state.tasks = state.tasks.filter(t => (t.core ?? null) !== core);
  for (const key of Object.keys(state.teamTimelines)) {
    if (key.startsWith(prefix)) delete state.teamTimelines[key];
  }
  if (state.trunkTeamId?.startsWith(prefix)) state.trunkTeamId = null;
  // 适配器状态文档（02a §5.4-2）：该 core 前缀清理——删除路径不等轮询窗，
  // 立即生效（离线路径的清理钩子在 upstreams.ts，见 adapterOps）。
  for (const key of Object.keys(state.adapterUiByKey)) {
    if (key.startsWith(prefix)) delete state.adapterUiByKey[key];
  }
}

/**
 * 是否为「工作区激活/取消」的成功提示（Core 侧 `workspace/commands.rs` 的
 * `BackendEvent::Error{session_id: None, message}`）。
 *
 * 用前缀匹配而非精确串：文案带工作区名/对话名（`已激活工作区会话：{id}（对话 {conv}）`）。
 */
function isWorkspaceActivationNotice(message: string): boolean {
  return message.startsWith('已激活工作区会话') || message.startsWith('已取消工作区会话激活');
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
