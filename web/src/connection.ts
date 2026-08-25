//! WebSocket 连接单例：连接 `/ws`，把事件流交给 store，暴露命令发送。
//! （移植自 React 版的 ws.ts useAgentConnection hook。）

import { state, dispatch } from './store';
import { pushToast } from './state';
import {
  parseEvent,
  serializeCommand,
  serializeSudoPassword,
  type BackendCommand,
  type SudoPasswordSubmit,
} from './protocol';

let socket: WebSocket | null = null;
let started = false;

export function startConnection(): void {
  if (started) return;
  started = true;
  let retryMs = 500;

  const connect = () => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    socket = ws;

    ws.onopen = () => {
      state.connected = true;
      retryMs = 500;
      // 重连后清空运行期状态：Core 若已重启，运行中的分支/任务全部
      // 消失，残留的 tab 会永远卡在"运行中"（僵尸标签）。Timeline
      // 会由 RequestTrunkTimeline 重新加载。
      state.branchTabs = {};
      state.tasks = [];
      state.activities = {};
      // Bootstrap the panel state on (re)connect.
      const bootstrap: BackendCommand[] = [
        'RequestState',
        'RequestTrunkTimeline',
        'RequestAdapterStatus',
        'RequestQqFilterConfig',
        'RequestAgentsList',
      ];
      for (const command of bootstrap) {
        ws.send(serializeCommand(command));
      }
    };

    ws.onmessage = (message) => {
      const event = parseEvent(String(message.data));
      if (event) dispatch(event);
    };

    ws.onclose = () => {
      socket = null;
      state.connected = false;
      pushToast(state, '与后端断开，正在重连…', 'error');
      window.setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 30_000);
    };

    ws.onerror = () => {
      ws.close();
    };
  };

  connect();
}

export function sendCommand(command: BackendCommand): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(serializeCommand(command));
    return;
  }
  pushToast(state, '未连接到 Core，命令未发送', 'error');
}

export function sendSudoPassword(submit: SudoPasswordSubmit): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(serializeSudoPassword(submit));
  }
}
