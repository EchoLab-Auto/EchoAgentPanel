//! TS 镜像 echo-protocol 的线格式（serde 外部标签枚举 + WsMessage 信封）。
//!
//! Core 的 `WsMessage` 序列化为 `{"type":"command|event","payload":{...}}`；
//! `BackendCommand` / `BackendEvent` 是外部标签枚举（变体名即标签）。

export type GateMode = 'none' | 'allowlist' | 'denylist';
export type ThinkingMode = 'enabled' | 'disabled';
export type ReasoningEffort = 'low' | 'high' | 'max';

/** 联邦 peer（`FederationStatus` 列表元素；线格式同 echo-protocol）。 */
export interface FederationPeerInfo {
  name: string;
  url: string;
  token_set: boolean;
  allow_tools: string[];
  allow_subagent: boolean;
  require_confirm: string[];
  /** 允许的只读查询种类（`*` = 全部；2026-10 与 Core 对齐）。 */
  allow_queries: string[];
  link: 'Online' | 'Offline';
  /** 节点负载（活跃 turn 数；P2 调度器输入，Core status_event 回传）。 */
  active_turns?: number;
}

/** 联邦状态快照（`FederationStatus` 事件）。 */
export interface FederationStatus {
  enabled: boolean;
  node_id: string;
  node_name?: string | null;
  listen: string;
  peers: FederationPeerInfo[];
}

export interface AdapterStatus {
  name: string;
  display_name: string;
  connected: boolean;
  running: boolean;
  self_id: string | null;
  bind_address: string;
  started_at: number | null;
  /** QQ 实例：归属人格 id（多实例；其他平台为空） */
  persona?: string | null;
  /** QQ 实例：NapCat 容器名 */
  container?: string | null;
  /** QQ 实例：NapCat WebUI 地址 */
  webui_url?: string | null;
  /** QQ 实例：OneBot HTTP API 地址 */
  onebot_url?: string | null;
}

/** 文件浏览器条目（文件或子目录；workspace 插件）。 */
export interface WorkspaceFileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

/** 工作区目录条目（线格式 untagged，2026-10）：
 * - 本机目录 = 纯字符串绝对路径；
 * - 跨机目录 = `{ path, node }`（node = 联邦节点名）。
 * 消费一律经 `workspace.ts` 的规范化助手（directoryPath / directoryNode）。 */
export type WorkspaceDirectoryEntry = string | { path: string; node?: string | null };

/** 目录选择器的浏览根（可进入浏览的位置）。 */
export interface BrowseRoot {
  /** 展示名（「家目录 (~)」「<工作区名>」或远程的同名标签）。 */
  label: string;
  /** 绝对路径（本机）或 `node://<peer>/<abs>`（远程）。 */
  path: string;
}

/** 工作区会话（workspace 插件）：名称 + 多个工作区目录。 */
export interface WorkspaceSessionInfo {
  /** 稳定 id（空 = 由 Core 依名称生成）。 */
  id: string;
  name: string;
  description?: string;
  /** 工作区目录列表（本机字符串 / 跨机 {path,node} 两种线格式）。 */
  directories?: WorkspaceDirectoryEntry[];
}

/** 一个工作区目录的 git 状态快照（只读采集）。 */
export interface WorkspaceGitInfo {
  directory: string;
  /** 是否是 git 仓库（工作树内）。 */
  is_repo: boolean;
  /** 当前分支（detached 时为 HEAD）。 */
  branch?: string | null;
  /** 相对上游的领先/落后提交数（无上游时为 0）。 */
  ahead?: number;
  behind?: number;
  /** 已暂存（索引区）文件数。 */
  staged?: number;
  /** 工作区已修改（未暂存）文件数。 */
  modified?: number;
  /** 未跟踪文件数。 */
  untracked?: number;
  /** 变更文件路径（前若干条）。 */
  changed_files?: string[];
  /** 最近一次提交摘要（`<short-hash> <subject>`）。 */
  last_commit?: string | null;
  /** 采集失败原因（目录不存在 / 不是 git 仓库等）。 */
  error?: string | null;
}

export interface SessionInfo {
  id: string;
  /** 归属上游区域（非线上字段：由 store.dispatch 从信封注入，供前端分组/路由）。 */
  core?: string | null;
  /** 来源节点身份（federation NodeId；多节点聚合时区分同名会话）。 */
  node_id?: string | null;
  /** 运行区域展示名（`[core].region_name`；空 = 回退上游名）。 */
  region_name?: string | null;
  team_id?: string | null;
  platform: string;
  scope: string;
  user_id: string;
  nickname: string;
  group_name: string | null;
  last_active: number;
  last_message: string;
}

export interface GroupInfo {
  group_id: number;
  group_name: string;
}

export interface FriendInfo {
  user_id: number;
  nickname: string;
}

export interface SkillInfo {
  name: string;
  description: string;
  keywords: string[];
  always: boolean;
  enabled: boolean;
  category: string;
  package?: string;
  content: string;
  /** 系统提示词 skill（system: true）：内容注入 base 区 */
  system?: boolean;
  /** 外部 Git 来源（安装的 skill；内置为 undefined） */
  source?: { url: string; rev: string; branch?: string; installed_at?: string } | null;
}

export interface ToolInfo {
  name: string;
  description: string;
  parameters: unknown;
  category: string;
  enabled: boolean;
  package?: string;
}

export interface TeamInfo {
  id: string;
  /** 来源节点身份（federation NodeId；多节点聚合时人格身份 = (node_id, id)）。 */
  node_id?: string | null;
  /** 运行区域展示名（`[core].region_name`；空 = 回退上游名）。 */
  region_name?: string | null;
  name: string;
  description: string;
  /**
   * 归属上游 core 名（多上游聚合视图下由 store.dispatch 注入；null = 单上游
   * 裸帧 / 未标注）。同一 id 可能出现在多个 core 上，人格身份是 (core, id)。
   */
  core?: string | null;
  enabled: boolean;
  sessions: number;
  system_prompt?: string;
  disabled_tools?: string[];
  disabled_skills?: string[];
  enabled_plugins?: string[];
  enabled_tools?: string[];
  enabled_skills?: string[];
  memory_limit_tokens?: number | null;
  context_window_tokens?: number | null;
  /** Persona 级 API 供应商引用（None/空 = 跟随全局默认配置） */
  api_profile?: string | null;
  /** 该 agent 系统提示词由哪些 skill 组成（空 = 用 system_prompt 字段） */
  system_skills?: string[];
  /**
   * 循环模式（互斥循环插件推导）：single = 单会话（会话内 turn 串行排队、
   * 无会话管理 UI、回执分支不可见）；parallel = 并行多会话（会话卡/全局分组/
   * 可见分支）。缺省视为 single（默认模式）。
   */
  loop_mode?: LoopMode;
}

export type LoopMode = 'single' | 'parallel';

/** 循环模式读取：`loop_mode` 缺省 single（默认）。 */
export function loopModeOf(team?: TeamInfo | null): LoopMode {
  if (!team) return 'single';
  return team.loop_mode ?? 'single';
}

/** 循环模式插件 id（编辑器写入 enabled_plugins 白名单用，二选一） */
export const LOOP_SINGLE_PLUGIN_ID = 'echo-agent.loop.single';
export const LOOP_PARALLEL_PLUGIN_ID = 'echo-agent.loop.parallel';

/** 后台 shell 会话摘要（Shell 面板终端可视化） */
export interface ShellSessionInfo {
  session_id: string;
  team_id?: string | null;
  /** 归属上游 core（多上游聚合；store.dispatch 注入）。 */
  core?: string | null;
  workdir: string;
  created_at_ms: number;
  last_active_ms: number;
  exec_count: number;
  running: boolean;
  last_output?: string | null;
}

/** 单条命令在终端中的条目（回显 + 流式输出） */
export interface ShellTerminalEntry {
  seq: number;
  command: string;
  status: 'running' | 'done' | 'failed' | 'timeout';
  output: string;
  elapsed_ms?: number;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  kind: string;
  description: string;
  entry: string;
  author: string;
  enabled: boolean;
  builtin: boolean;
  /** 所属包 id（横跨 plugin+tool+skill 的组合标签；未声明 = 插件 id） */
  package?: string;
}

export interface ApiProfileInfo {
  name: string;
  provider: string;
  model: string;
  base_url: string;
  api_key_set: boolean;
  thinking: ThinkingMode;
  reasoning_effort: ReasoningEffort;
}

/** API 指标时间序列（`ApiMetrics` 事件；近 7 天窗口）。 */
export interface ApiMetricsEntry {
  /** 配置名（空 = 顶层默认配置）。 */
  name: string;
  /** 余额快照序列（成功采样；时间升序）。 */
  balance: ApiBalancePoint[];
  /** token 用量序列（小时 × 模型聚合；时间升序）。 */
  usage: ApiUsagePoint[];
  /** 费用估算币种（如 'CNY'；无估算时为空串）。 */
  cost_currency?: string;
}

export interface ApiBalancePoint {
  /** Unix 毫秒。 */
  ts_ms: number;
  /** 总余额（含赠送）。 */
  total: number;
  /** 赠送余额。 */
  granted: number;
  /** 充值余额。 */
  topped_up: number;
  /** 币种（如 'CNY'）。 */
  currency?: string;
}

export interface ApiUsagePoint {
  /** 小时桶起点（Unix 毫秒）。 */
  ts_ms: number;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  calls: number;
  /** 估算费用（按 Core 定价表；无匹配价格 = null / undefined）。 */
  est_cost?: number | null;
}

export interface ContextMessageInfo {
  role: string;
  content: string;
  tokens: number;
  sequence: number | null;
}

export interface ContextBlockInfo {
  key: string;
  label: string;
  kind: string;
  tokens: number;
  chars: number;
  content: string;
}

export interface TimelineSource {
  adapter_name: string;
  platform: string;
  user_id: string;
  user_name: string;
  channel: string;
  group_name: string | null;
  received_at_ms: number;
  message_sequence: number;
}

export interface TimelineTool {
  name: string;
  input: string;
  output: string | null;
  failed: boolean;
  /** 工具调用精确配对 id（新 core 提供；旧 core 无此字段，回退按名配对） */
  tool_call_id?: string;
  /** 执行被外圈超时守卫中止 */
  timed_out?: boolean;
  /** 工具开始执行的 epoch 毫秒（新 core 提供；重放显示实时/总耗时用） */
  started_at_ms?: number;
  /** 工具执行总耗时（毫秒；新 core 提供） */
  elapsed_ms?: number;
}

export interface TimelineMessage {
  kind: string;
  content: string;
  session_id?: string;
  time: number;
  source?: TimelineSource | null;
  reasoning?: string[] | null;
  tool?: TimelineTool | null;
  images?: string[];
  /** 条目级单调序号（新 core 提供；就地更新的工具条目带新 seq 重新投递） */
  seq?: number;
}

export interface ChecklistState {
  lists: Array<{
    name: string;
    done: number;
    total: number;
    items: Array<{ text: string; done: boolean }>;
  }>;
}

// ── BackendCommand（外部标签枚举）──────────────────────────────────────────

export interface RemoteApiProfileEntry {
  name: string;
  provider: string;
  model: string;
  base_url?: string;
  key_set?: boolean;
}

export type BackendCommand =
  | { SendMessage: { session_id: string; content: string; images?: string[]; team_id?: string | null } }
  | { SwitchModel: { model: string } }
  | { SwitchProvider: { provider: string } }
  | { SetSystemPrompt: { prompt: string } }
  | 'RequestSystemPrompt'
  | {
      UpdateApiConfig: {
        name: string;
        provider: string;
        model: string;
        base_url: string;
        api_key: string;
        thinking?: ThinkingMode | null;
        reasoning_effort?: ReasoningEffort | null;
      };
    }
  | { SwitchApi: { name: string } }
  | { RequestRemoteApiProfiles: { peer: string } }
  | { TestApi: { name: string } }
  | { QueryApiBalance: { name: string } }
  | { QueryApiMetrics: { name: string } }
  | 'RequestSkillsList'
  | 'ReloadSkills'
  | 'RequestToolsList'
  | { DeleteApi: { name: string } }
  | { ToggleSkill: { name: string; enabled: boolean } }
  | { ToggleTool: { name: string; enabled: boolean } }
  | {
      SaveSkill: {
        name: string;
        description: string;
        keywords: string[];
        always: boolean;
        category: string;
        content: string;
        system?: boolean;
      };
    }
  | { DeleteSkill: { name: string } }
  | 'RequestPluginsList'
  | { TogglePlugin: { id: string; enabled: boolean } }
  | 'RequestTeamsList'
  | { ToggleTeam: { id: string; enabled: boolean } }
  | {
      SaveTeam: {
        id: string;
        name: string;
        description: string;
        system_prompt: string;
        enabled: boolean;
        system_skills?: string[];
        disabled_tools?: string[];
        disabled_skills?: string[];
        enabled_plugins?: string[];
        enabled_tools?: string[];
        enabled_skills?: string[];
        memory_limit_tokens?: number | null;
        context_window_tokens?: number | null;
        api_profile?: string | null;
      };
    }
  | { DeleteTeam: { id: string } }
  | { ArchiveHistory: { team_id?: string | null } }
  | { CompactHistory: { team_id?: string | null; keep_recent?: number } }
  | 'RequestState'
  | { RequestContext: { team_id?: string | null; session_id?: string | null } }
  | { RequestTrunkTimeline: { team_id?: string | null; since_seq?: number } }
  | { InstallSkillFromGit: { url: string; name?: string | null; branch?: string | null } }
  | { UpdateSkillFromGit: { name: string } }
  | { RemoveSkillSource: { name: string } }
  | { RequestShellSessions: { team_id?: string | null } }
  | { ShellStart: { workdir?: string | null } }
  | { ShellExec: { session_id: string; command: string; timeout_secs?: number } }
  | { ShellStop: { session_id: string } }
  | { ClearHistory: { team_id?: string | null } }
  | { CancelRequestedWork: { session_id: string; all: boolean; team_id?: string | null } }
  | { StartAdapter: { name: string } }
  | { StopAdapter: { name: string } }
  | { RestartAdapter: { name: string } }
  | 'RequestAdapterStatus'
  | { RequestGroupList: { adapter?: string | null } }
  | { RequestFriendList: { adapter?: string | null } }
  | { RequestQqLoginStatus: { adapter?: string | null } }
  | { RequestQqQrcode: { adapter?: string | null } }
  | { RequestWorkspaceSessions: { team_id?: string | null } }
  | { SaveWorkspaceSession: { team_id?: string | null; session: WorkspaceSessionInfo } }
  | { DeleteWorkspaceSession: { team_id?: string | null; id: string } }
  | { ActivateWorkspaceSession: { team_id?: string | null; id?: string | null } }
  | { RequestWorkspaceGitStatus: { team_id?: string | null; session_id: string } }
  | {
      RequestWorkspaceFiles: {
        team_id?: string | null;
        session_id: string;
        path: string;
      };
    }
  | { RequestBrowseDirectories: { path?: string | null } }
  | 'StartAllAdapters'
  | 'StopAllAdapters'
  | { UpdateQqAllowlist: { user_ids: number[]; group_ids: number[]; adapter?: string | null } }
  | { UpdateQqDenylist: { user_ids: number[]; group_ids: number[]; adapter?: string | null } }
  | { RequestQqFilterConfig: { adapter?: string | null } }
  | { SetQqGateMode: { mode: GateMode; adapter?: string | null } }
  | 'RequestSelfUpdate'
  | 'RequestSelfUpdateStatus'
  | { MigrateSession: { session_id: string; team_id?: string | null; target_peer: string } }
  | { RequestQqOwner: { adapter?: string | null } }
  | { SetQqOwner: { owner_qq: number; adapter?: string | null } };

// ── BackendEvent（外部标签枚举）────────────────────────────────────────────

export type BackendEvent =
  | { AdapterStateChanged: { adapter_name: string; connected: boolean; self_id: string | null } }
  | {
      MessageReceived: {
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
      };
    }
  | { AgentThinking: { session_id: string; team_id?: string | null } }
  | { LlmRequest: { session_id: string; model: string } }
  | {
      LlmResponse: {
        session_id: string;
        model: string;
        prompt_tokens: number;
        completion_tokens: number;
      };
    }
  | { AgentReasoning: { session_id: string; branch_id: string; content: string; team_id?: string | null } }
  | { SubagentStarted: { session_id: string; task: string } }
  | { SubagentCompleted: { session_id: string; success: boolean } }
  | {
      ReplyBranchStarted: {
        session_id: string;
        branch_id: string;
        message_sequence: number;
        task: string;
        target: string;
        started_at_ms: number;
      };
    }
  | { ReplyBranchContent: { session_id: string; branch_id: string; content: string } }
  | {
      ReplyBranchCompleted: {
        session_id: string;
        branch_id: string;
        message_sequence: number;
        success: boolean;
        cancelled: boolean;
        completed_at_ms: number;
      };
    }
  | { ToolCall: { session_id: string; tool_name: string; arguments: string; tool_call_id?: string; branch_id?: string; team_id?: string | null; started_at_ms?: number } }
  | { ToolResult: { session_id: string; tool_name: string; result: string; tool_call_id?: string; timed_out?: boolean; branch_id?: string; team_id?: string | null; elapsed_ms?: number } }
  | { ChecklistUpdated: { session_id: string; state: ChecklistState; team_id?: string | null } }
  | { AgentOutput: { session_id: string; content: string; branch_id: string | null; team_id?: string | null } }
  | { AgentCompleted: { session_id: string } }
  | { SessionUpdated: { session: SessionInfo } }
  | { ActiveTurnsSnapshot: { session_ids: string[]; team_id?: string | null } }
  | { FederationInvite: { invite: string } }
  | {
      FederationStatus: {
        enabled: boolean;
        node_id: string;
        node_name?: string | null;
        listen: string;
        peers: FederationPeerInfo[];
      };
    }
  | {
      SelfUpdateStatus: {
        state: string;
        phase?: string | null;
        revision?: string | null;
        message?: string | null;
        updated_at?: string | null;
      };
    }
  | {
      ContextSnapshot: {
        /** 快照归属的会话 id（多会话，2026-09；旧 Core 缺省） */
        session_id?: string | null;
        messages: ContextMessageInfo[];
        blocks: ContextBlockInfo[];
        total_tokens: number;
        limit_tokens: number;
      };
    }
  | { TrunkTimeline: { messages: TimelineMessage[]; seq?: number; team_id?: string | null; full?: boolean } }
  | { ShellSessionsList: { sessions: ShellSessionInfo[]; team_id?: string | null } }
  | { ShellSessionStarted: { session: ShellSessionInfo } }
  | { ShellExecStarted: { session_id: string; seq: number; command: string } }
  | { ShellExecOutput: { session_id: string; seq: number; chunk: string } }
  | { ShellExecDone: { session_id: string; seq: number; success: boolean; elapsed_ms: number } }
  | { ShellSessionClosed: { session_id: string; reason: string } }
  | {
      ApiConfigUpdated: {
        provider: string;
        model: string;
        base_url: string;
        api_key_set: boolean;
        thinking: ThinkingMode;
        reasoning_effort: ReasoningEffort;
        system_prompt: string;
        active_api: string;
        profiles: ApiProfileInfo[];
      };
    }
  | {
      RemoteApiProfiles: {
        peer: string;
        active?: Record<string, unknown> | null;
        profiles?: RemoteApiProfileEntry[];
        error?: string | null;
      };
    }
  | {
      BrowseDirectories: {
        path?: string | null;
        roots?: BrowseRoot[];
        entries?: WorkspaceFileEntry[];
        error?: string | null;
      };
    }
  | { ApiProfilesUpdated: { active_api: string; profiles: ApiProfileInfo[] } }
  | {
      ApiTestResult: {
        name: string;
        ok: boolean;
        message: string;
        latency_ms: number;
      }
    }
  | {
      ApiBalanceResult: {
        name: string;
        ok: boolean;
        available: boolean;
        total: string;
        /** 赠送余额（granted_balance；失败时为空串）。 */
        granted: string;
        /** 充值余额（topped_up_balance；失败时为空串）。 */
        topped_up: string;
        currency: string;
        message: string;
      }
    }
  | { ApiMetrics: { entries: ApiMetricsEntry[] } }
  | { SkillsList: { skills: SkillInfo[] } }
  | { ToolsList: { tools: ToolInfo[] } }
  | { PluginsList: { plugins: PluginInfo[] } }
  | { TeamsList: { teams: TeamInfo[] } }
  | { SystemPrompt: { text: string } }
  | { Error: { session_id: string | null; message: string } }
  | {
      SessionMigrated: {
        session_id: string;
        target_peer: string;
        new_session_id?: string | null;
        message: string;
        success: boolean;
      };
    }
  | { AdapterList: { adapters: AdapterStatus[] } }
  | { GroupList: { groups: GroupInfo[]; adapter?: string | null } }
  | {
      QqFilterConfig: {
        allowlist_users: number[];
        allowlist_groups: number[];
        denylist_users: number[];
        denylist_groups: number[];
        adapter?: string | null;
      };
    }
  | { QqGateMode: { mode: GateMode; adapter?: string | null } }
  | { QqOwner: { owner_qq: number; adapter?: string | null } }
  | {
      QqLoginStatus: {
        adapter: string;
        online: boolean;
        user_id?: string | null;
        nickname?: string | null;
      };
    }
  | { QqQrcode: { adapter: string; png_base64: string; error?: string | null } }
  | {
      WorkspaceSessions: {
        team_id?: string | null;
        sessions: WorkspaceSessionInfo[];
        active?: string | null;
      };
    }
  | {
      WorkspaceGitStatus: {
        team_id?: string | null;
        session_id: string;
        directories: WorkspaceGitInfo[];
      };
    }
  | {
      WorkspaceFiles: {
        team_id?: string | null;
        session_id: string;
        path: string;
        entries: WorkspaceFileEntry[];
        error?: string | null;
      };
    }
  | { FriendList: { friends: FriendInfo[]; adapter?: string | null } };

// ── WsMessage 信封 ─────────────────────────────────────────────────────────

export type WsMessage =
  | { type: 'command'; payload: BackendCommand }
  | { type: 'event'; payload: BackendEvent };

export function serializeCommand(command: BackendCommand): string {
  return JSON.stringify({ type: 'command', payload: command });
}

export function parseEvent(text: string): BackendEvent | null {
  try {
    const parsed = JSON.parse(text) as WsMessage;
    if (parsed && parsed.type === 'event' && parsed.payload) {
      return parsed.payload;
    }
  } catch {
    // ignore malformed frames
  }
  return null;
}
