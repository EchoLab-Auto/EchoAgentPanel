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
  /** per-peer 共享密钥**明文**（仅在发送 `SaveFederationPeer` 时携带；
   *  Core 状态快照回传永不包含明文——用 `token_set` 标记是否已配置，
   *  故接收侧该字段通常缺失）。 */
  token?: string;
  token_set: boolean;
  allow_tools: string[];
  allow_subagent: boolean;
  require_confirm: string[];
  /** 允许的只读查询种类（`*` = 全部；2026-10 与 Core 对齐）。 */
  allow_queries: string[];
  link: 'Online' | 'Offline';
  /** 节点负载（活跃 turn 数；P2 调度器输入，Core status_event 回传）。 */
  active_turns?: number;
  /** 对端 node_id（链路在线时 Core 回填；离线/旧 Core 缺失——2026-10
   * 组建向导用于「已互联」精确判定与拓扑渲染，缺失时按名字兜底）。 */
  node_id?: string | null;
  /** 连续拨号失败次数（成功建链清零；2026-10 地址漂移事故新增——
   * 面板把"持续连不上"显性化）。 */
  consecutive_failures?: number;
  /** 最近一次拨号失败原因（在线/从未失败时缺失）。 */
  last_error?: string | null;
  /** 最近一次成功建链时间（unix 秒；从未成功 = null）。 */
  last_online_at?: number | null;
  /** 最近一次从对端 Hello 学到的可拨地址（跨断链保留）——与配置 url
   * 不同且离线时，UI 提示"对端最近宣告了 X，一键改用"。 */
  last_advertise?: string | null;
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
  /** @deprecated 适配器泛化迁移期保留（02a §4.2）；使用点见 03b S6 删除清单；删除归 §1-D3 阶段 3。（QQ 实例：NapCat 容器名） */
  container?: string | null;
  /** @deprecated 同上（QQ 实例：NapCat WebUI 地址）。 */
  webui_url?: string | null;
  /** @deprecated 同上（QQ 实例：OneBot HTTP API 地址）。 */
  onebot_url?: string | null;
  /** 通用 KV 元数据（02a §4.2 / 01a §1.1；旧 core 缺失时 undefined）。 */
  metadata?: Array<{ key: string; label: string; value: string }>;
  /** 平台标识（02a §4.2；旧 core 缺失 = undefined）。 */
  platform?: string | null;
  /** 描述符 v1（02a §4.2 / 00 §二；无 ui ⇒ descriptor 为 null，渲染器区域不显示）。 */
  ui?: unknown;
  /** 会话标签映射（02a §4.2；platform/session → 展示标签）。 */
  session_labels?: Record<string, string> | null;
}

/** 适配器管理方法名（02a §4.1；Panel 侧防拼写便利类型，不要求 core 同步）。
 *  与 00 §四 的 12 个 custom method + `get_state`（D2 首屏路径）对齐。 */
export type AdapterOpMethod =
  | 'set_gate_mode'
  | 'get_gate_mode'
  | 'update_allowlist'
  | 'update_denylist'
  | 'get_filter_config'
  | 'set_owner'
  | 'get_owner'
  | 'login_status'
  | 'login_qrcode'
  | 'get_groups'
  | 'get_friends'
  | 'instance_info'
  | 'get_state';

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

/** 工作区内的一条对话（2026-10 多对话）：名称 + 通道 id 派生标记。
 *
 * 每条对话对应一条独立的本地通道会话（独立上下文/预算/压缩清理）：
 * - `legacy = true`：存量通道 id `local:workspace:<ws>:local_user`（每工作区
 *   至多一条；旧数据的首条对话——事件日志 append-only，id 不可改写）；
 * - 其余对话：`local:workspace:<ws>/<conv>:local_user`。 */
export interface WorkspaceConversationInfo {
  /** 稳定 id（slug；工作区内唯一，不含 `/`）。 */
  id: string;
  name: string;
  /** 通道 id 是否为存量裸 ws 格式（见类型注释）。 */
  legacy: boolean;
  /** 会话级 API 覆盖（2026-10）：`Some(name)` = 该对话的 LLM 请求走
   * 全局供应商池中该 profile 的 provider；`None` = 跟随 persona 级。 */
  api_profile?: string | null;
}

/** 工作区会话（workspace 插件）：名称 + 多个工作区目录。 */
export interface WorkspaceSessionInfo {
  /** 稳定 id（空 = 由 Core 依名称生成）。 */
  id: string;
  name: string;
  description?: string;
  /** 工作区目录列表（本机字符串 / 跨机 {path,node} 两种线格式）。 */
  directories?: WorkspaceDirectoryEntry[];
  /** 工作区内的对话列表（2026-10 多对话）。缺省/空 = 仅存量主对话
   * （Core 读取期惰性补位 `{id:"main", name:"主对话", legacy:true}`）。 */
  conversations?: WorkspaceConversationInfo[];
  /** 最后使用的对话 id（激活工作区不带对话时进入它）。 */
  last_conversation?: string | null;
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
  /** 缓存命中 tokens（prompt 内子集；DeepSeek 口径；旧数据缺省 0）。 */
  cache_hit_tokens?: number;
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
  /** 工具调用精确配对 id（core 随 ToolCall/ToolResult 恒下发） */
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
  | {
      SetSessionApi: {
        team_id: string;
        session_id: string;
        profile: string;
      };
    }
  | { ClearSessionApi: { team_id: string; session_id: string } }
  | { RequestRemoteApiProfiles: { peer: string } }
  | { TestApi: { name: string } }
  | { QueryApiBalance: { name: string } }
  | { QueryApiMetrics: { name: string } }
  | 'RequestSkillsList'
  | 'ReloadSkills'
  | 'RequestToolsList'
  | { DeleteApi: { name: string } }
  | { RenameApi: { from: string; to: string } }
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
  | {
      ArchiveHistory: {
        team_id?: string | null;
        /** 归档范围（2026-10）：会话 id —— 仅归档并清空该会话（其他会话
         *  不受影响；Core 随归档自动重发剩余时间线）。**必填**：Core 对
         *  缺失/null 直接拒绝（fail-closed）——旧语义的降级执行是"整档
         *  归档 + 全量清空"，误清不可恢复；面板「归档」此前不带 session_id，
         *  走的即旧的全量清空（已修复，并加发送前守卫）。 */
        session_id?: string | null;
      };
    }
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
  | {
      ClearHistory: {
        team_id?: string | null;
        /** 清理范围（2026-10）：会话 id —— 仅清该会话；缺省/null = 清空该
         *  人格全部会话（显式全清的管理语义）。Core 此前只有 team 维度，
         *  面板「清理历史记忆」把同人格下所有会话一并清掉（已修复）。 */
        session_id?: string | null;
      };
    }
  | { CancelRequestedWork: { session_id: string; all: boolean; team_id?: string | null } }
  | { StartAdapter: { name: string } }
  | { StopAdapter: { name: string } }
  | { RestartAdapter: { name: string } }
  | 'RequestAdapterStatus'
  // ── 适配器泛化（02a · 2026-10）：统一 custom op 命令（core echo-protocol）──
  // 旧命令的可选 `adapter` 字段升级为必填顶层 `adapter`；method 见 AdapterOpMethod。
  | { InvokeAdapterOp: { adapter: string; method: string; payload: Record<string, unknown> } }
  /** @deprecated 适配器泛化迁移期保留（02a §4.3）；使用点见 03b S6 删除清单；类型删除归 §1-D3 阶段 3。 */
  | { RequestGroupList: { adapter?: string | null } }
  /** @deprecated 同上（新路径 method `get_friends`）。 */
  | { RequestFriendList: { adapter?: string | null } }
  /** @deprecated 同上（新路径 method `login_status`）。 */
  | { RequestQqLoginStatus: { adapter?: string | null } }
  /** @deprecated 同上（新路径 method `login_qrcode`）。 */
  | { RequestQqQrcode: { adapter?: string | null } }
  | { RequestWorkspaceSessions: { team_id?: string | null } }
  | { SaveWorkspaceSession: { team_id?: string | null; session: WorkspaceSessionInfo } }
  | { DeleteWorkspaceSession: { team_id?: string | null; id: string } }
  | { RequestWorkspaceGitStatus: { team_id?: string | null; session_id: string } }
  | {
      ActivateWorkspaceSession: {
        team_id?: string | null;
        id?: string | null;
        /** 工作区内的对话 id（2026-10 多对话；缺省/null = 进入该工作区的
         * `last_conversation` / 首条对话）。`id = null`（取消激活）时忽略。 */
        conversation?: string | null;
      };
    }
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
  /** @deprecated 适配器泛化迁移期保留（02a §4.3）；使用点见 03b S6 删除清单；类型删除归 §1-D3 阶段 3。 */
  | { UpdateQqAllowlist: { user_ids: number[]; group_ids: number[]; adapter?: string | null } }
  /** @deprecated 同上（新路径 method `update_denylist`，整对象发送见 02a §2）。 */
  | { UpdateQqDenylist: { user_ids: number[]; group_ids: number[]; adapter?: string | null } }
  /** @deprecated 同上（新路径 method `get_filter_config`）。 */
  | { RequestQqFilterConfig: { adapter?: string | null } }
  /** @deprecated 同上（新路径 method `set_gate_mode`）。 */
  | { SetQqGateMode: { mode: GateMode; adapter?: string | null } }
  | 'RequestSelfUpdate'
  | 'RequestSelfUpdateStatus'
  | { MigrateSession: { session_id: string; team_id?: string | null; target_peer: string } }
  /** @deprecated 同上（新路径 method `get_owner`）。 */
  | { RequestQqOwner: { adapter?: string | null } }
  /** @deprecated 同上（新路径 method `set_owner`）。 */
  | { SetQqOwner: { owner_qq: number; adapter?: string | null } }
  // ── 联邦管理（federation Phase 4；Frontend-only）──────────────────
  // 2026-10 补齐：此前 4 条命令靠双重断言绕过类型系统（echo-protocol/
  // command.rs 已定义，serde 亦兼容 `{X:null}` 形态；但绕过 = 无编译期
  // 保护）。unit 变体统一用字符串形态（与 `'RequestSystemPrompt'` 等
  // 既有约定一致）。守护：protocol-sync 测试禁止生产代码再出现该模式。
  | { SaveFederationPeer: { peer: FederationPeerInfo } }
  | { DeleteFederationPeer: { name: string } }
  | 'RequestFederationStatus'
  | 'RequestFederationInvite';

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
  // 流式推理增量（`AgentReasoning` 的逐段版本；终值全量收敛，前端对账替换）
  | { AgentReasoningDelta: { session_id: string; branch_id: string; delta: string; team_id?: string | null } }
  // 流式正文增量（`AgentOutput` 的逐段版本；终值全量收敛，前端对账替换）
  | { AgentContentDelta: { session_id: string; branch_id: string; delta: string; team_id?: string | null } }
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
        /** 快照归属的会话 id（多会话，2026-09；未指定时缺省） */
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
  // ── 适配器泛化（02a · 2026-10）：统一 custom op 事件（core echo-protocol）──
  // `AdapterOpResult.result` 线上 null 时省略（故可选）；`error` 缺省不存在，
  // 消费侧统一读 `error ?? null`。`AdapterState.state` = 适配器状态文档整文档。
  | { AdapterOpResult: { adapter: string; method: string; result?: unknown; error?: string | null } }
  | { AdapterState: { adapter: string; state: unknown } }
  /** @deprecated 适配器泛化迁移期保留（02a §4.3）；使用点见 03b S6 删除清单；类型删除归 §1-D3 阶段 3。 */
  | { GroupList: { groups: GroupInfo[]; adapter?: string | null } }
  /** @deprecated 同上（旧 QQ 过滤配置事件；新状态文档路径见 AdapterState）。 */
  | {
      QqFilterConfig: {
        allowlist_users: number[];
        allowlist_groups: number[];
        denylist_users: number[];
        denylist_groups: number[];
        adapter?: string | null;
      };
    }
  /** @deprecated 同上（旧 QQ 门禁模式事件）。 */
  | { QqGateMode: { mode: GateMode; adapter?: string | null } }
  /** @deprecated 同上（旧 QQ owner 事件）。 */
  | { QqOwner: { owner_qq: number; adapter?: string | null } }
  /** @deprecated 同上（旧 QQ 登录状态事件）。 */
  | {
      QqLoginStatus: {
        adapter: string;
        online: boolean;
        user_id?: string | null;
        nickname?: string | null;
      };
    }
  /** @deprecated 同上（旧 QQ 二维码事件；新路径只进 image 节点局部，02a §2）。 */
  | { QqQrcode: { adapter: string; png_base64: string; error?: string | null } }
  | {
      WorkspaceSessions: {
        team_id?: string | null;
        sessions: WorkspaceSessionInfo[];
        active?: string | null;
        /** 当前激活对话 id（2026-10 多对话；`active` 仍为工作区 id）。 */
        active_conversation?: string | null;
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
  /** @deprecated 适配器泛化迁移期保留（02a §4.3）；使用点见 03b S6 删除清单；类型删除归 §1-D3 阶段 3。 */
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
