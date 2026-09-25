//! WebSocket 连接单例：连接 `/ws`，把事件流交给 store，暴露命令发送。
//! （移植自 React 版的 ws.ts useAgentConnection hook。）
//!
//! 韧性设计：
//! - 断线退避重连（500ms 起 ×2，上限 30s，无限重试）
//! - 自愈（heal）：页面回到前台（visibilitychange）或网络恢复（online）时
//!   主动评估连接——已断开则立即重连（不等可能被浏览器冻结的退避定时器）；
//!   显示 OPEN 也可能半死（设备休眠期间对端已消失而本端未察觉），发探测帧，
//!   5s 内无任何下行帧则判死、走标准重连。

import { state, dispatch } from './store';
import { pushToast } from './state';
import {
  parseEvent,
  serializeCommand,
  serializeMenuAnswer,
  serializeSudoPassword,
  type BackendCommand,
  type MenuAnswerSubmit,
  type SudoPasswordSubmit,
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
const pendingCommands: string[] = [];
/** 队列上限：握手期正常只有个位数条；上限只用于防御性封顶。 */
const PENDING_LIMIT = 128;

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
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    socket = ws;

    ws.onopen = () => {
      if (socket !== ws) {
        ws.close(); // 迟到的旧连接：直接丢弃
        return;
      }
      state.connected = true;
      retryMs = 500;
      lastFrameAt = Date.now();
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
      // Timeline 按上次使用的 Agent（localStorage）加载，刷新/重连后不跳回默认。
      let savedTeam: string | null = null;
      try {
        savedTeam = localStorage.getItem('echo-panel-active-team');
      } catch {
        // ignore storage errors (private mode)
      }
      // 有缓存（内存/磁盘还原）→ 只拉缺口（Core 的缺口检测保证安全）；
      // 无缓存 → 全量（since_seq 0）。
      const cachedSeq = savedTeam ? (state.teamTimelines[savedTeam]?.seq ?? 0) : 0;
      const bootstrap: BackendCommand[] = [
        'RequestState',
        // 去主智能体后 team_id 必填：没有保存过的 Agent 时不发（发了必被
        // Core 拒绝）；等 TeamsList 到达后由 App 的 watcher 用列表首个发起。
        ...(savedTeam
          ? [{ RequestTrunkTimeline: { team_id: savedTeam, since_seq: cachedSeq } } as BackendCommand]
          : []),
        'RequestAdapterStatus',
        // QQ 过滤配置不在这里预取：面板打开时 QqPanel/QqLoginSection 会按实例
        // 自行刷新；无 QQ（或多实例未指定实例）时预取必被 Core 拒绝，平白
        // 弹出"QQ 适配器未找到"提示。
        'RequestTeamsList',
        { RequestShellSessions: {} },
      ];
      for (const command of bootstrap) {
        ws.send(serializeCommand(command));
      }
      // 补发握手期暂存的命令（见 pendingCommands 注释）。
      for (const payload of pendingCommands) {
        ws.send(payload);
      }
      pendingCommands.length = 0;
    };

    ws.onmessage = (message) => {
      lastFrameAt = Date.now();
      const event = parseEvent(String(message.data));
      if (event) dispatch(event);
    };

    ws.onclose = () => {
      if (socket !== ws) return; // 旧连接的迟到事件，忽略
      socket = null;
      state.connected = false;
      pushToast(state, '与后端断开，正在重连…', 'error');
      retryTimer = window.setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 30_000);
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
      current.send(serializeCommand('RequestTeamsList'));
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

  connect();
}

export function sendCommand(command: BackendCommand): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(serializeCommand(command));
    return;
  }
  if (socket && socket.readyState === WebSocket.CONNECTING) {
    // 握手期（页面刚加载/重连窗口）：静默排队，连接建立后补发。
    if (pendingCommands.length < PENDING_LIMIT) {
      pendingCommands.push(serializeCommand(command));
    }
    return;
  }
  pushToast(state, '未连接到 Core，命令未发送', 'error');
}

export function sendSudoPassword(submit: SudoPasswordSubmit): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(serializeSudoPassword(submit));
  }
}

export function sendMenuAnswer(answer: MenuAnswerSubmit): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(serializeMenuAnswer(answer));
  }
}
