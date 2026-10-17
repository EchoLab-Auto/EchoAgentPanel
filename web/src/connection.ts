//! WebSocket 连接单例：连接 `/ws`，把事件流交给 store，暴露命令发送。
//! （移植自 React 版的 ws.ts useAgentConnection hook。）
//!
//! 韧性设计：
//! - 断线退避重连（500ms 起 ×2，无限重试）：页面可见时上限 3s（部署/重启
//!   后几秒内即恢复，不再「连接中…」卡半分钟）；不可见时上限 30s（省电）
//! - 自愈（heal）：页面回到前台（visibilitychange）或网络恢复（online）时
//!   主动评估连接——已断开则立即重连（不等可能被浏览器冻结的退避定时器）；
//!   显示 OPEN 也可能半死（设备休眠期间对端已消失而本端未察觉），发探测帧，
//!   5s 内无任何下行帧则判死、走标准重连。

import { state, dispatch } from './store';
import { coreForTeam, currentRegion, pushToast } from './state';
import { teamKey } from './keys';
import { trackRequest } from './pending';
import { observeEventSeq, resetEventSeq } from './event-seq';
import {
  parseEvent,
  serializeCommand,
  type BackendCommand,
  type SessionInfo,
} from './protocol';

let socket: WebSocket | null = null;
let started = false;
let retryTimer: number | undefined;
let probeTimer: number | undefined;
/** 最近一次收到下行帧的时间（onopen/onmessage 更新） */
let lastFrameAt = 0;

/**
 * 握手期暂存队列（2026-09-18）。
 *
 * 刷新页面后组件挂载（ShellList/ContextView 等的 onMounted / watch immediate）
 * 会立刻发请求，此时 WS 还在 CONNECTING（实测 t≈43ms，握手完成 t≈81ms）——
 * 旧实现直接判"未连接"弹错并丢弃，于是**每次刷新都弹"未连接到 Core，命令未发送"**，
 * 且这些请求真的丢了。改为握手期静默排队、onopen 引导命令之后按序补发：
 * 既不再误报，也不丢请求（这些请求都幂等，重复发无副作用）。
 */
const pendingCommands: BackendCommand[] = [];
/** 队列上限：握手期正常只有个位数条；上限只用于防御性封顶。 */
const PENDING_LIMIT = 128;

/** 断线重连退避上限：可见时 3s（尽快恢复），不可见时 30s（省电/省资源）。 */
export const RETRY_CAP_VISIBLE_MS = 3_000;
export const RETRY_CAP_HIDDEN_MS = 30_000;

/** 下一档退避：翻倍，上限按页面可见性取。 */
export function nextRetryMs(current: number, visible: boolean): number {
  return Math.min(current * 2, visible ? RETRY_CAP_VISIBLE_MS : RETRY_CAP_HIDDEN_MS);
}

function pageVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

export function startConnection(): void {
  if (started) return;
  started = true;
  let retryMs = 500;

  const connect = () => {
    if (retryTimer !== undefined) {
      window.clearTimeout(retryTimer);
      retryTimer = undefined;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Bearer 认证（2026-10）：token 存 localStorage，首访可用
    // ?token=<token> 播种（随后从 URL 擦除防泄漏）。
    const token = ensurePanelToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws${qs}`);
    socket = ws;

    ws.onopen = () => {
      if (socket !== ws) {
        ws.close(); // 迟到的旧连接：直接丢弃
        return;
      }
      state.connected = true;
      retryMs = 500;
      // 重置断开提示标志：下次掉线重新提示一次（2026-10 Toast 去风暴）。
      disconnectedNotified = false;
      lastFrameAt = Date.now();
      // 时间线到达标志按"本次连接"计：重连后若无缓存需要重新加载，
      // 聊天区据此显示「正在加载时间线…」而不是「暂无消息」（见 ChatView）。
      state.timelineArrivedOnce = false;
      // 新连接 = 新基线：Core 的序号是进程级连续的，但重连窗口里丢掉的帧
      // 由下面的 since_seq 补拉负责，不该在重连后第一帧被误判成"跳号"
      // （见 event-seq.ts）。
      resetEventSeq();
      // 重连后清空运行期状态：Core 若已重启，运行中的分支/任务全部
      // 消失，残留的 tab 会永远卡在"运行中"（僵尸标签）。
      state.branchTabs = {};
      state.tasks = [];
      state.activities = {};
      // 时间线**不再清空**（2026-09 刷新加速）：内存里的 teamTimelines 与
      // 磁盘缓存（trunk-cache）在页面加载时已还原，清空只会让刷新后的首屏
      // 白等一次全量。改为按游标请求增量（since_seq）：Core 侧对"窗口滚出/
      // 游标超前"都会回退全量（响应带 full 标志时这里整体替换），
      // 因此保留旧内容不会造成错配。
      // 工作区 git 状态与文件浏览器缓存照旧清空（打开面板时会按当前 team 重拉）。
      state.workspaceGitBySession = {};
      state.workspaceFiles = {};
      // Bootstrap the panel state on (re)connect.
      // 先广播只读发现命令（RequestState/RequestTeamsList）：必须发往全部在线
      // core，Panel 才能知道有哪些上游。timeline 见下方——core 未知时只能裸
      // 广播，TeamsList 到达后由 App 的 teams watcher 定向补拉（覆盖竞态结果）。
      const broadcastBootstrap: BackendCommand[] = [
        // 只读且需要"发现全部上游"：裸广播给所有在线 core（中继白名单放行）。
        'RequestState',
        // 适配器管理数据不在这里预取：打开通用适配器面板时按实例经
        // InvokeAdapterOp 自行刷新；无实例（或多实例未指定实例）时预取
        // 必被 Core 拒绝，平白弹出"适配器实例未找到"提示。
        'RequestTeamsList',
      ];
      for (const command of broadcastBootstrap) {
        ws.send(broadcastEnvelope(command));
      }
      // 定向引导（重连场景补发）：单值管理面（适配器/Shell 会话）仅当目标
      // 区域已解析时发送。首访（activeRegion 未定）跳过——多上游下这两条
      // 会因解析不出目标被拒发并弹「尚未选择 agent」误报 toast，且随后
      // TeamsList 到达时 App.vue 的 activeRegion watcher 会统一拉全
      // （含这两条），重发纯属重复请求（2026-10 审计修复）。
      if (currentRegion(state)) {
        sendCommand('RequestAdapterStatus');
        sendCommand({ RequestShellSessions: {} });
      }
      // 上次使用的 Agent 的 timeline：经 sendCommand 走统一路由（多上游下
      // core 已从 localStorage 还原/teams 已知时定向；未知则裸广播，
      // TeamsList 到达后 App watcher 会再定向补拉，覆盖竞态结果）。
      let savedTeam: string | null = null;
      let savedCore: string | null = null;
      try {
        savedTeam = localStorage.getItem('echo-panel-active-team');
        savedCore = localStorage.getItem('echo-panel-active-team-core');
      } catch {
        // ignore storage errors (private mode)
      }
      if (savedTeam) {
        const cachedSeq = state.teamTimelines[teamKey(savedCore, savedTeam)]?.seq ?? 0;
        sendCommand({ RequestTrunkTimeline: { team_id: savedTeam, since_seq: cachedSeq } });
      }
      // 补发握手期暂存的命令（见 pendingCommands 注释）：**重新解析**
      // 目标 core 再加壳发送——入队时的路由可能基于不完整的 teams/会话表。
      for (const queued of pendingCommands) {
        const core = resolveTargetCore(queued);
        const queuedPayload = core
          ? JSON.stringify({ core, frame: { type: 'command', payload: queued } })
          : serializeCommand(queued);
        ws.send(queuedPayload);
      }
      pendingCommands.length = 0;
    };

    ws.onmessage = (message) => {
      lastFrameAt = Date.now();
      // 多上游信封（聚合视图，2026-10）：`{core: "<上游名>", frame: <WsMessage>}`。
      // 单上游时中继不加壳，parseEvent 直接命中。
      const { core, event, seq } = parseFrame(String(message.data));
      if (event) {
        // 事件信封只用来登记"已知区域"。activeRegion（当前运行区域）是
        // **派生量**——由选中的 agent / 会话决定（App.vue 的 teams watcher
        // 与 onSessionPick），绝不随事件流漂移。
        if (core) state.knownCores.add(core);
        dispatch(event, core);
      }
      // 事件流连续性校验（2026-10，见 event-seq.ts）：序号跳号 = 中间有帧
      // 没到。先 dispatch（让本帧先落地、游标更准），再按游标补拉。
      const observation = observeEventSeq(core, seq);
      if (observation.kind === 'gap') {
        console.warn(
          `[events] 事件流跳号：core=${core ?? '(单上游)'} 缺 ${observation.missed} 条 ` +
            `(最新 seq=${observation.last})，按游标补拉 timeline`,
        );
        requestTimelineResync(core);
      }
    };

    ws.onclose = () => {
      if (socket !== ws) return; // 旧连接的迟到事件，忽略
      socket = null;
      state.connected = false;
      // Toast 去风暴（2026-10 巡检）：仅"已连接后掉线"的首次弹提示
      // ——此前每次 onclose 都弹（服务宕机时每 ≤30s 一条刷屏）。断开
      // 期间的重试不再提示；重连成功由 onopen 的「已连接」提示收尾。
      if (!disconnectedNotified) {
        disconnectedNotified = true;
        pushToast(state, '与后端断开，正在重连…', 'error');
      }
      // 可见时退避封顶 3s：本次等待也按当前可见性封顶（从后台切回前台时
      // 由 heal() 立即重连，不等旧的长定时器）。
      const visible = pageVisible();
      const wait = Math.min(retryMs, visible ? RETRY_CAP_VISIBLE_MS : RETRY_CAP_HIDDEN_MS);
      retryTimer = window.setTimeout(connect, wait);
      retryMs = nextRetryMs(retryMs, visible);
    };

    ws.onerror = () => {
      ws.close();
    };
  };

  // 立即重连：清空可能挂着的退避定时器并复位退避。
  const reconnectNow = () => {
    retryMs = 500;
    connect();
  };

  // 断开提示一次性标志（见 onclose；onopen 复位）。
  let disconnectedNotified = false;

  // 自愈评估：前台可见 / 网络恢复时调用。
  const heal = () => {
    const current = socket;
    if (!current || current.readyState === WebSocket.CLOSED) {
      // 已断开：退避定时器可能被浏览器冻结（标签页休眠），立即重连
      reconnectNow();
      return;
    }
    if (current.readyState !== WebSocket.OPEN) return; // CONNECTING/CLOSING 交给原生回调
    // OPEN 也可能半死：发轻量探测帧（RequestTeamsList 幂等且响应小），
    // 5s 内无任何下行帧 → 判死，主动关闭走标准重连（全量重建）。
    const sentAt = Date.now();
    try {
      current.send(broadcastEnvelope('RequestTeamsList'));
    } catch {
      current.close();
      return;
    }
    if (probeTimer !== undefined) window.clearTimeout(probeTimer);
    probeTimer = window.setTimeout(() => {
      probeTimer = undefined;
      if (socket === current && lastFrameAt < sentAt) current.close();
    }, 5000);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') heal();
  });
  window.addEventListener('online', heal);

  // 空闲看门狗（2026-10）：WebSocket 可能「半死」——readyState 仍是 OPEN，
  // 但一条帧也收不到（中继任务卡住 / NAT 静默丢弃 / 代理缓冲挂起）。此时
  // 既不触发 onclose（没有"断开"提示），也不会走上面的事件监听自愈：
  // 表现就是「问了之后工具行一直在读秒、等多久都不动，刷新才恢复」。
  //
  // 只要页面可见且超过 WATCHDOG_IDLE_MS 没有任何下行帧，就走 heal()
  // 的探测逻辑（发幂等 RequestTeamsList，5s 无响应即主动 close → 标准
  // 重连 + 按游标增量对账）。空闲会话也会每 45s 产生一次小请求，代价
  // 可忽略（core 侧每 30s 本来就发 Ping）。
  const WATCHDOG_TICK_MS = 30_000;
  const WATCHDOG_IDLE_MS = 45_000;
  window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (Date.now() - lastFrameAt < WATCHDOG_IDLE_MS) return;
    heal();
  }, WATCHDOG_TICK_MS);

  connect();
}

/**
 * 显式广播信封：只读发现命令（`RequestState`/`RequestTeamsList`）需要发往
 * 全部在线上游。中继不再按命令名猜只读，改由客户端声明 `broadcast: true`。
 */
function broadcastEnvelope(command: BackendCommand): string {
  return JSON.stringify({ broadcast: true, frame: { type: 'command', payload: command } });
}

/**
 * 发送一次「有响应等待」的请求：登记加载跟踪 + 发命令（见 pending.ts）。
 *
 * `key` 是视图本地命名（如 `'context'`、`'settings:teams'`），同一 key
 * 重复发送即覆盖（重试/切换重拉语义）。`targetCore` 显式指定路由目标
 * （02a S3：适配器 op 通道恒显式传 core）；缺省沿用命令自身解析。
 */
export function sendPending(command: BackendCommand, key: string, targetCore?: string): void {
  // 登记时带上解析出的目标 core：多上游下广播/竞态响应不会误销账别的 core
  // 的等待（见 pending.ts::resolvePendingEvent）。
  trackRequest(key, command, resolveTargetCore(command, targetCore) ?? null);
  sendCommand(command, targetCore);
}

/** 解一帧下行消息：多上游信封拆壳（core 名 + 内层事件），无壳 = 单上游。 */
function parseFrame(text: string): {
  core: string | null;
  event: ReturnType<typeof parseEvent>;
  seq: number | null;
} {
  try {
    const parsed = JSON.parse(text) as { core?: unknown; frame?: unknown };
    if (parsed && typeof parsed.core === 'string' && parsed.frame) {
      return {
        core: parsed.core,
        event: parseEvent(JSON.stringify(parsed.frame)),
        seq: seqOf(parsed.frame),
      };
    }
  } catch {
    // 非信封：按单上游原格式解析
  }
  return { core: null, event: parseEvent(text), seq: seqOf(text) };
}

/**
 * 从事件帧里取扇出序号（Core 侧 `serialize_event_sequenced` 附加的顶层
 * 字段）。`frame` 既可能是已解析的对象（多上游信封内层），也可能是原始
 * JSON 文本（单上游无壳）。取不到（旧版 Core / 非事件帧）返回 null ——
 * 校验据此跳过，保持向后兼容。
 */
function seqOf(frame: unknown): number | null {
  try {
    const value = typeof frame === 'string' ? (JSON.parse(frame) as unknown) : frame;
    const seq = (value as { seq?: unknown } | null)?.seq;
    return typeof seq === 'number' && Number.isFinite(seq) ? seq : null;
  } catch {
    return null;
  }
}

/** 命令的会话归属解析（2026-10 深度融合 P1）：命令 payload 里带
 * session_id 时，按会话所属 core 自动路由——不再依赖"先设目标"。 */
function coreForCommand(command: BackendCommand): string | null {
  const payload = command as unknown as Record<string, unknown>;
  // BackendCommand 是单键对象（{ CmdName: {...} }）——取第一个值里的
  // session_id / team_id。
  const body = Object.values(payload)[0] as Record<string, unknown> | undefined;
  const sessionId = body?.session_id;
  if (typeof sessionId === 'string' && sessionId) {
    const matches = state.sessions.filter(s => s.id === sessionId) as Array<
      SessionInfo & { core?: string | null }
    >;
    // 同名会话跨 core（每个 core 都有 local:tui::local_user）：优先当前
    // activeRegion 那一份，其次首个带 core 标注者——否则会发给错误的 core。
    const session =
      matches.find(s => s.core && s.core === state.activeRegion) ??
      matches.find(s => s.core) ??
      matches[0];
    if (session?.core) return session.core;
  }
  // 无会话归属（新会话/切换 agent）时按人格所属 core 路由——人格身份是
  // (core, id)，不能只凭裸 team_id 猜。
  const teamId = body?.team_id;
  if (typeof teamId === 'string' && teamId) {
    const owner = coreForTeam(state, teamId);
    if (owner != null) return owner;
  }
  return null;
}

/**
 * 切换到某个 core 后重新拉取"单值管理面"数据（配置/技能/工具/插件/适配器/
 * shell/联邦）。这些响应会被 `managementCoreCurrent` 过滤到 activeRegion，
 * 所以切 core 必须重拉一次，否则会短暂显示上一个 core 的值。
 *
 * `includeCatalogs`（2026-10 慢网络加载优化）：技能目录（~20KB）与工具
 * 目录（~16KB）是全部"管理面"响应里最大的两项，且**首屏没有任何消费方**
 * （仅设置页 / Agent 配置弹窗使用，二者打开时各自会拉）。首次区域确定
 * （首屏引导）传 `false` 跳过预取——慢网络下把带宽留给时间线等首屏数据；
 * 切换区域保持 `true`（设置页可能正开着，切完要立即看到新 core 的列表）。
 */
export function requestActiveRegionManagement(options?: { includeCatalogs?: boolean }): void {
  const includeCatalogs = options?.includeCatalogs ?? true;
  sendCommand('RequestState'); // → ApiConfigUpdated / ApiProfilesUpdated
  sendCommand('RequestSystemPrompt');
  sendCommand('RequestAdapterStatus');
  if (includeCatalogs) {
    sendCommand('RequestSkillsList');
    sendCommand('RequestToolsList');
  }
  sendCommand('RequestPluginsList');
  sendCommand({ RequestShellSessions: {} });
  sendCommand('RequestFederationStatus');
}

/**
 * 解析一条命令的目标 core（路由优先级 + 人格一致性守卫）。`sendCommand` 与
 * `sendPending`（等待态登记）共用，保证"发送目标"和"等待目标"一致。
 */
export function resolveTargetCore(
  command: BackendCommand,
  targetCore?: string,
): string | null | undefined {
  // 路由优先级：显式 targetCore > 会话归属 > 人格归属 > 当前运行区域。
  // 不再有"管理目标 core"这种自由变量，也不兜底首个上游——解析不出目标
  // 就明确拒发（见 sendCommand），绝不猜。
  let core = targetCore ?? coreForCommand(command) ?? currentRegion(state);
  // 一致性守卫：命令带 team_id 时目标 core 必须确实拥有该人格，否则重定向
  // 到拥有人格的 core。多上游下调度/会话归属若选到没有人格的节点，会把
  // A core 的 agent 发给 B core，B 回「智能体 X 不存在」——这里提前纠正。
  const body = Object.values(command as unknown as Record<string, unknown>)[0] as
    | Record<string, unknown>
    | undefined;
  const teamId = body?.team_id;
  if (typeof teamId === 'string' && teamId) {
    const matches = state.teams.filter(t => t.id === teamId);
    if (matches.length) {
      const targetHosts = core != null && matches.some(t => (t.core ?? null) === core);
      if (!targetHosts) {
        const owner = coreForTeam(state, teamId);
        if (owner !== undefined) core = owner;
      }
    }
  }
  return core;
}

/**
 * 发送命令。返回是否已发/已排队（02a S3）：`true` = 已发送或握手期已
 * 发送命令。返回是否已发/已排队（02a S3）：`true` = 已发送或握手期已
 * 排队；`false` = 拒发（多上游解析不出目标 / 未连接 / 握手队列已满）。
 * 返回值加宽是兼容变更，既有调用点可忽略（拒发路径仍弹 toast）。
 */
export function sendCommand(command: BackendCommand, targetCore?: string): boolean {
  const core = resolveTargetCore(command, targetCore);
  // 多上游下解析不出目标 = 没有可路由的 agent/区域：明确提示并拒发，
  // 绝不落到某个隐式的"默认 core"。
  if (core == null && state.knownCores.size > 1) {
    pushToast(state, '尚未选择 agent（无法确定运行区域），命令未发送', 'error');
    return false;
  }
  const payload = core
    ? JSON.stringify({ core, frame: { type: 'command', payload: command } })
    : serializeCommand(command);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(payload);
    return true;
  }
  if (socket && socket.readyState === WebSocket.CONNECTING) {
    // 握手期（页面刚加载/重连窗口）：静默排队，连接建立后补发。
    // ⚠️ 存的是原始命令而不是已加壳的 payload：入队时 teams 可能尚未到达，
    // 路由会落到 activeRegion/兜底——onopen 补发前必须**重新解析**目标 core，
    // 否则 TeamsList 校正后的归属救不回来（跨 core 误投，2026-10 修复）。
    if (pendingCommands.length < PENDING_LIMIT) {
      pendingCommands.push(command);
      return true;
    }
    return false; // 队列封顶：未排队成功（防御性上限，正常不可达）
  }
  pushToast(state, '未连接到 Core，命令未发送', 'error');
  return false;
}

/** 事件流跳号后的补拉节流窗口（2026-10）。 */
const RESYNC_MIN_INTERVAL_MS = 4000;
let lastResyncAtMs = 0;

/**
 * 按当前游标补拉一次 trunk timeline —— 事件流连续性校验的修复动作。
 *
 * 带 `since_seq` 走增量：不带游标时 Core 回 `full:true` 全量，前端 trunk
 * 整体替换、消息 key 全部重建、DOM 回顶（用户会看到「列表被刷新/换了
 * 会话」）。带游标则只追加缺失条目（工具完成态按 tool_call_id 就地修补）。
 *
 * 节流 4s：一次半死通常连着跳好几十号，逐帧补拉没有意义。
 */
function requestTimelineResync(core: string | null): void {
  const now = Date.now();
  if (now - lastResyncAtMs < RESYNC_MIN_INTERVAL_MS) return;
  lastResyncAtMs = now;
  const region = core ?? state.activeRegion;
  const sinceSeq = state.teamTimelines[teamKey(region, state.activeTeamId)]?.seq ?? 0;
  sendCommand(
    { RequestTrunkTimeline: { team_id: state.activeTeamId, since_seq: sinceSeq } },
    core ?? undefined,
  );
}

/** 面板访问令牌：URL ?token= 播种一次后存 localStorage；fetch 经
 * `panelFetch`（自动带 Authorization 头）。 */
export function ensurePanelToken(): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('token');
  if (fromUrl) {
    window.localStorage.setItem('echo-panel-token', fromUrl);
    params.delete('token');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
    return fromUrl;
  }
  return window.localStorage.getItem('echo-panel-token') ?? '';
}

/** 带认证头的 fetch（token 非空时自动加 Bearer）。 */
export function panelFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = window.localStorage.getItem('echo-panel-token');
  if (!token) return fetch(input, init);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
