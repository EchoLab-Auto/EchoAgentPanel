//! TS 镜像 echo-protocol 的线格式（serde 外部标签枚举 + WsMessage 信封）。
//!
//! Core 的 `WsMessage` 序列化为 `{"type":"command|event","payload":{...}}`；
//! `BackendCommand` / `BackendEvent` 是外部标签枚举（变体名即标签）。

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
  /** 本节点是否接受**联邦级 Panel 身份**（P1，2026-11；旧 Core 缺失 =
   *  不支持，按未开放展示）。 */
  panel_ready?: boolean;
  /** 授予 Panel 身份的级别：off / readonly / operate / admin。 */
  panel_access?: string;
}

/** 联邦节点目录里的一个邻居（`FederationDirectory.nodes[]`，P2 2026-11）。 */
export interface FederatedNodeInfo {
  /** 该节点在本机（应答 Core）配置里的 peer 名。 */
  name: string;
  /** 对端 node_id（从未连上过时为空串）。 */
  node_id?: string;
  node_name?: string | null;
  /** 应答 Core 视角的拨号地址（可能是内网/VPN——Panel 未必可达）。 */
  url?: string;
  /** 对端最近宣告的可拨地址（握手学到；Panel **优先用它**试连）。 */
  advertise?: string | null;
  online?: boolean;
  /** 对端是否开放 Panel 身份（来自 Hello 能力声明）。 */
  panel_ready?: boolean;
}

/** 联邦节点目录（`RequestFederationDirectory` 响应；P2 自动发现）。
 *
 *  只含**直接邻居**：拓扑由 Panel 汇总多个节点的目录得到（联邦不做 gossip）。
 *  Panel 拿到后逐个用 Panel 身份密钥试连，成功即纳入聚合视图。 */
export interface FederationDirectory {
  node_id: string;
  node_name?: string | null;
  listen?: string;
  panel_ready?: boolean;
  panel_access?: string;
  nodes: FederatedNodeInfo[];
}

export interface InstanceStatus {
  name: string;
  display_name: string;
  connected: boolean;
  running: boolean;
  self_id: string | null;
  bind_address: string;
  started_at: number | null;
  /** 归属人格 id（概念中立；多实例部署下为实例绑定的人格，未绑定 = 全局实例）。 */
  persona?: string | null;
  /** 通用 KV 元数据（02a §4.2 / 01a §1.1；旧 core 缺失时 undefined）。 */
  metadata?: Array<{ key: string; label: string; value: string }>;
  /** 平台标识（02a §4.2；旧 core 缺失 = undefined）。 */
  platform?: string | null;
  /** 描述符 v1（02a §4.2 / 00 §二；无 ui ⇒ descriptor 为 null，渲染器区域不显示）。 */
  ui?: unknown;
  /** 会话标签映射（02a §4.2；platform/session → 展示标签）。 */
  session_labels?: Record<string, string> | null;
}

/** 实例管理方法名（02a §4.1；Panel 侧防拼写便利类型，不要求 core 同步）。
 *  与 00 §四 的 12 个 custom method + `get_state`（D2 首屏路径）对齐。 */
export type InstanceOpMethod =
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
  /** 变更文件路径（前若干条；老 Core / 跨机老对端的兼容视图）。 */
  changed_files?: string[];
  /**
   * 变更文件明细（路径 + 两列状态字符，2026-10）。
   *
   * 分组展示要的是「哪个文件属于已暂存 / 已修改 / 未跟踪」，扁平路径表给不出，
   * 所以由 Core 带状态一起回传。两列原样保留（`MM` 同时属两类），归类在前端。
   * 老 Core 不发此字段 → 空表，卡片退回 `changed_files` 的扁平显示。
   */
  changed_entries?: WorkspaceChangedEntry[];
  /** 最近一次提交摘要（`<short-hash> <subject>`）。 */
  last_commit?: string | null;
  /** 采集失败原因（目录不存在 / 不是 git 仓库等）。 */
  error?: string | null;
}

/** 一条工作区变更（`git status --porcelain` v1 的两列状态 + 路径）。 */
export interface WorkspaceChangedEntry {
  /** 仓库相对路径（porcelain 原样，重命名形态是 `旧 -> 新`）。 */
  path: string;
  /** 索引区（第 1 列）状态字符：M/A/D/R/C/U；空格 = 索引区无变更。 */
  index?: string;
  /** 工作区（第 2 列）状态字符；`?` = 未跟踪。 */
  worktree?: string;
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
  /** true = Core 编译内置；false = 外部插件。旧 Core 缺失时按 true 兼容。 */
  builtin?: boolean;
  /**
   * 运行形态：`in_process` = 实现编译在 Core 进程内；`subprocess` = 实现由
   * 独立子进程提供（Core 侧只有启停门控，如 QQ 实例）。
   *
   * 与 `builtin` **正交**：`builtin` 说来源，`runtime` 说代码在哪跑。旧 Core
   * 缺失该字段 = 进程内。
   */
  runtime?: string;
  /** 插件所属 Core，由 Panel 多节点中继注入。 */
  core?: string | null;
  /** 所属包 id（横跨 plugin+tool+skill 的组合标签；未声明 = 插件 id） */
  package?: string;
  /**
   * 挂载失败原因（Core 的 `PluginDescriptor::error`）。
   *
   * 区分「用户主动禁用」与「装配失败被跳过」——两者 `enabled` 都是 false，
   * 但后者需要人去看原因。旧 Core 不发该字段。
   */
  error?: string | null;
  /**
   * 声明该插件的**配置层**（`plugins.toml` / `base.toml · layer 0`）。
   *
   * 空串/缺失 = 配置未提及（编译内置的缺省行为）。回答「这行为什么长这样、
   * 要去哪一层改它」——与 Core 的 `dump-config` 同源。
   */
  config_origin?: string;
  /**
   * 运行态（子进程插件）：`pending` / `ready` / `draining` / `stopped` /
   * `failed`。空/缺失 = 进程内实现（没有独立生命周期）。
   *
   * 与 `enabled` 正交：`enabled = true` + `state = 'failed'` 是「配置开了、
   * 进程起不来」——和「用户关掉了」完全不同，不能混为一谈。
   */
  state?: string;
  /** 崩溃后已自动重启次数（子进程插件）。 */
  restarts?: number;
  /** 连接代际（每次就绪自增；子进程插件）。 */
  generation?: number;
  /**
   * 插件**定义文件**路径（`plugins.toml` / 数据插件的 `plugin.toml`）；
   * 空 = 编译内置（没有外部定义文件）。
   */
  source_path?: string;
  /** 子进程启动命令（空 = 进程内实现）。 */
  command?: string;
  /** 启动参数。 */
  args?: string[];
  /** 环境变量**键名**（值 Core 不下发——常含 token / 密钥）。 */
  env_keys?: string[];
  /**
   * 本插件**要求的服务键**（`Inject::required`；空/缺失 = 无要求）。
   *
   * 与 `error` 配合回答「这个插件为什么不挂载」：Core 在挂载前逐个校验
   * 服务键是否已注册，缺失即拒绝挂载（mount 副作用不会发生）。旧 Core
   * 不发该字段，故为可选。
   */
  required_services?: string[];
  /** 本插件的**软依赖**（`Inject::optional`；缺失不阻止挂载）。 */
  optional_services?: string[];
  /**
   * 眼下**还缺**的硬依赖（空/缺失 = 不缺）。
   *
   * 与 `error` 的区别：`error` 是「上次挂载尝试的结果」，这里是「此刻的
   * 事实」——Core 的 `reconcile` 会在依赖到位后自动挂上并清空它。
   */
  pending_services?: string[];
  /** 订阅的事件名（`Contribution::Events` 的进程内等价物；空 = 不订阅）。 */
  subscribed_events?: string[];
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
  instance_name: string;
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
  /**
   * 位置序号（Core push 时分配，此后**永不改变**；0 = 旧条目/未赋值）。
   *
   * 与 `seq` 的分工：`seq` 服务增量同步（就地更新会推进它 → 非单调）；
   * `ord` 服务分页锚点（严格随 push 递增、永不变更）。按 `ord` 定位才
   * 既稳定又能二分——用 `seq` 会因非单调而漏条目。
   */
  ord?: number;
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
  | { RestartPlugin: { id: string } }
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
  | {
      CompactHistory: {
        team_id?: string | null;
        /** 必填：只压缩当前会话；Core 对缺失值 fail-closed。 */
        session_id?: string | null;
        keep_recent?: number;
      };
    }
  | 'RequestState'
  | { RequestContext: { team_id?: string | null; session_id?: string | null } }
  | {
      RequestTrunkTimeline: {
        team_id?: string | null;
        since_seq?: number;
        /** 首屏窗口上限（只回最新 N 条）；缺省/null = 不限（旧行为）。 */
        limit?: number | null;
      };
    }
  // 向上翻页取更早的时间线（2026-10 分页）。与 `RequestTrunkTimeline` 分开
  // 是因为语义不同：翻页只把更早的条目**前插**到已加载列表头部，不动同步
  // 游标；而 `TrunkTimeline.full` 的语义是"替换缓存"。
  | {
      RequestTimelineEarlier: {
        team_id?: string | null;
        /**
         * 已加载的**最老条目的 `ord`**（跳过它之后的条目不可靠——用 `ord`
         * 是因为时间线的 `seq` 非单调：运行中的工具条目被就地更新时 `seq`
         * 会被推进、位置不变；而"已加载条数"又会被分页期间的新增影响）。
         * `ord` 只在 push 时分配、永不变更且严格递增 → 稳定锚点。
         */
        before_ord: number;
        limit?: number | null;
      };
    }
  // 按会话派生显示历史（2026-10）：共享显示窗口（每人格 1024 条 FIFO）会淘汰
  // 无近期活动的会话条目——面板激活会话时改从事件日志派生完整历史（Core 响应
  // `SessionHistory`）。limit 缺省/null = Core 默认上限。
  | { RequestSessionHistory: { team_id?: string | null; session_id: string; limit?: number | null } }
  | { InstallSkillFromGit: { url: string; name?: string | null; branch?: string | null } }
  | { UpdateSkillFromGit: { name: string } }
  | { RemoveSkillSource: { name: string } }
  | { RequestShellSessions: { team_id?: string | null } }
  // shell 命令带 `team_id`（2026-10 作用域普查）：新会话的归属人格 / 操作者
  // 人格——Core 据此把会话记到正确的人格下，并拒绝跨人格操作别人的 shell。
  | { ShellStart: { workdir?: string | null; team_id?: string | null } }
  | {
      ShellExec: {
        session_id: string;
        command: string;
        timeout_secs?: number;
        team_id?: string | null;
      };
    }
  | { ShellStop: { session_id: string; team_id?: string | null } }
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
  | { StartInstance: { name: string } }
  | { StopInstance: { name: string } }
  | { RestartInstance: { name: string } }
  | 'RequestInstanceStatus'
  // ── 实例泛化（02a · 2026-10）：统一 custom op 命令（core echo-protocol）──
  // 旧命令的可选 `instance` 字段升级为必填顶层 `instance`；method 见 InstanceOpMethod。
  | { InvokeInstanceOp: { instance: string; method: string; payload: Record<string, unknown> } }
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
  | 'StartAllInstances'
  | 'StopAllInstances'
  | 'RequestSelfUpdate'
  | 'RequestSelfUpdateStatus'
  | { MigrateSession: { session_id: string; team_id?: string | null; target_peer: string } }
  // ── 联邦管理（federation Phase 4；Frontend-only）──────────────────
  // 2026-10 补齐：此前 4 条命令靠双重断言绕过类型系统（echo-protocol/
  // command.rs 已定义，serde 亦兼容 `{X:null}` 形态；但绕过 = 无编译期
  // 保护）。unit 变体统一用字符串形态（与 `'RequestSystemPrompt'` 等
  // 既有约定一致）。守护：protocol-sync 测试禁止生产代码再出现该模式。
  | { SaveFederationPeer: { peer: FederationPeerInfo } }
  | { DeleteFederationPeer: { name: string } }
  | 'RequestFederationStatus'
  /** 联邦节点目录（P2 自动发现）：本机身份 + 直接邻居地址清单。 */
  | 'RequestFederationDirectory'
  | 'RequestFederationInvite';

// ── BackendEvent（外部标签枚举）────────────────────────────────────────────

/**
 * 压缩 / 归档的阶段。与 Core 的 `CompactionPhase` 一一对应
 * （`echo-session/src/compaction.rs::CompactionPhase::as_str`）——
 * 是**线上契约**，改名要两端同步。
 */
export type CompactionPhase =
  | 'preview'
  | 'archive'
  | 'summarize'
  | 'apply'
  | 'done'
  | 'failed';

/** 终态：面板据此停止转圈（`apply` 之后还有 `done`，不能提前收）。 */
export function isCompactionTerminal(phase: CompactionPhase): boolean {
  return phase === 'done' || phase === 'failed';
}

export type BackendEvent =
  | { InstanceStateChanged: { instance_name: string; connected: boolean; self_id: string | null } }
  | {
      MessageReceived: {
        session_id: string;
        instance_name: string;
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
        /** 本节点是否接受联邦级 Panel 身份（P1；旧 Core 缺失）。 */
        panel_ready?: boolean;
        /** 授予 Panel 身份的级别（off/readonly/operate/admin）。 */
        panel_access?: string;
      };
    }
  /** 联邦节点目录（P2 自动发现；只含应答节点的**直接邻居**）。 */
  | { FederationDirectory: FederationDirectory }
  | {
      SelfUpdateStatus: {
        state: string;
        phase?: string | null;
        revision?: string | null;
        message?: string | null;
        updated_at?: string | null;
      };
    }
  // 压缩 / 归档的**进度**（Core 在 `CompactHistory` / `ArchiveHistory` 执行
  // 期间推送，可能持续数分钟）。`phase` 走线固定：
  // `preview → archive → summarize → apply → done`（失败时最后一步 `failed`）；
  // `total === 0` 表示该阶段长度不确定（画不确定进度条），否则画 `done/total`。
  //
  // 注：注释写在 `| {` **之前**，不要在 arm 内部加注释——`protocol-sync`
  // 测试的变体提取正则假设名字紧跟 `{`（57 个 arm 全部如此）。
  | {
      CompactionProgress: {
        team_id?: string | null;
        session_id?: string | null;
        phase: CompactionPhase;
        done: number;
        total: number;
        sessions: number;
        message: string;
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
  | {
      TrunkTimeline: {
        messages: TimelineMessage[];
        seq?: number;
        team_id?: string | null;
        full?: boolean;
        /** 快照是否被窗口上限截断（还有更早的可翻页）。缺省 false。 */
        has_more?: boolean;
      };
    }
  // 更早的一页时间线（`RequestTimelineEarlier` 响应；2026-10 分页）：
  // 前端把 messages **前插**到已加载列表头部，不动同步游标。
  | { TimelineEarlier: { team_id?: string | null; messages: TimelineMessage[]; has_more?: boolean } }
  // 按会话派生的显示历史（`RequestSessionHistory` 响应；2026-10）：
  // messages = 事件日志派生的完整历史；total = 总条目数；truncated = limit 截断；
  // max_seq = 派生时快照水位（合并窗口增量用，见 state.ts::sessionMessagesFor）。
  | { SessionHistory: { team_id?: string | null; session_id: string; messages: TimelineMessage[]; total: number; truncated: boolean; max_seq?: number } }
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
  // **插件事件**（plugin-framework v0.7 的事件通道）：插件运行期 `emit` 的
  // 东西 + 注册表自己的 `plugin.mounted` / `plugin.unmounted`。`name` /
  // `payload` 是插件与 Core 自行约定的词汇，前端**不解释**、只当活动日志
  // 展示（新增插件事件不必改前端）。注释放在联合分支**之外**：本文件的
  // 变体提取按 `| { Name:` 的形状解析，块注释夹在中间会让它漏数。
  | {
      PluginEvent: {
        /** 来源插件 id（Core 自身发出的为空串）。 */
        plugin: string;
        name: string;
        payload?: unknown;
        /** 服务端毫秒时间戳（排序用，不信任客户端时钟）。 */
        at_ms?: number;
      };
    }
  | {
      PluginOpResult: {
        id: string;
        /** `enable` / `disable` / `restart`。 */
        op: string;
        ok: boolean;
        message: string;
      };
    }
  | { TeamsList: { teams: TeamInfo[] } }
  | { SystemPrompt: { text: string } }
  | { Error: { session_id: string | null; message: string } }
  // 会话级**操作回执**（清理 / 归档 / 压缩 / 会话 API 切换）。与 `Error`
  // 分开：回执不代表回合失败（不冻结流式行），且带 `session_id`——面板只在
  // 本窗口、本会话展示，其他窗口不再弹出"别人的会话被压缩了"（2026-10 用户
  // 报告的多窗口串台）。`session_id` 为空 = 人格级/全局回执，所有窗口可见。
  | {
      Notice: {
        team_id?: string | null;
        session_id?: string | null;
        /** 操作是否成功（面板据此选 toast 配色，不解析文案）。 */
        ok?: boolean;
        message: string;
      };
    }
  | {
      SessionMigrated: {
        session_id: string;
        target_peer: string;
        new_session_id?: string | null;
        message: string;
        success: boolean;
      };
    }
  | { InstanceList: { instances: InstanceStatus[] } }
  // ── 实例泛化（02a · 2026-10）：统一 custom op 事件（core echo-protocol）──
  // `InstanceOpResult.result` 线上 null 时省略（故可选）；`error` 缺省不存在，
  // 消费侧统一读 `error ?? null`。`InstanceState.state` = 实例状态文档整文档。
  | { InstanceOpResult: { instance: string; method: string; result?: unknown; error?: string | null } }
  | { InstanceState: { instance: string; state: unknown } }
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
    };

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
