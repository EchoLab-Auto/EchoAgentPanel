//! WebSocket 连接 hook：连接 `/ws`，把事件流交给 reducer，暴露命令发送。

import { useCallback, useEffect, useRef, useState } from 'react';
import { dismissToast as removeToast, initialState, type AppState, reduce, pushToast } from './state';
import { parseEvent, serializeCommand, serializeSudoPassword, type BackendCommand, type SudoPasswordSubmit } from './protocol';

export interface AgentConnection {
  state: AppState;
  connected: boolean;
  sendCommand: (command: BackendCommand) => void;
  sendSudoPassword: (submit: SudoPasswordSubmit) => void;
  dismissToast: (id: number) => void;
}

export function useAgentConnection(): AgentConnection {
  const [state, setState] = useState<AppState>(initialState);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let retryMs = 500;
    let timer: number | undefined;

    const connect = () => {
      if (closed) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${proto}//${window.location.host}/ws`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (closed) return;
        setConnected(true);
        retryMs = 500;
        // 重连后清空运行期状态：Core 若已重启，运行中的分支/任务全部
        // 消失，残留的 tab 会永远卡在"运行中"（僵尸标签）。Timeline
        // 会由 RequestTrunkTimeline 重新加载。
        setState((previous) => {
          const next = { ...previous, trunk: [...previous.trunk] };
          next.branchTabs = {};
          next.tasks = [];
          next.activities = {};
          return next;
        });
        // Bootstrap the panel state on (re)connect.
        for (const command of [
          'RequestState' as BackendCommand,
          'RequestTrunkTimeline' as BackendCommand,
          'RequestAdapterStatus' as BackendCommand,
          'RequestQqFilterConfig' as BackendCommand,
        ]) {
          socket.send(serializeCommand(command));
        }
      };

      socket.onmessage = (message) => {
        const event = parseEvent(String(message.data));
        if (!event) return;
        setState((previous) => {
          const next = { ...previous, trunk: [...previous.trunk] };
          return reduce(next, event);
        });
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (closed) return;
        setConnected(false);
        setState((previous) => {
          const next = { ...previous, connected: false };
          pushToast(next, '与后端断开，正在重连…', 'error');
          return next;
        });
        timer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 30_000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();
    return () => {
      closed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      socketRef.current?.close();
    };
  }, []);

  const sendCommand = useCallback((command: BackendCommand) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(serializeCommand(command));
      return;
    }
    setState((previous) => {
      const next = { ...previous, trunk: [...previous.trunk] };
      pushToast(next, '未连接到 Core，命令未发送', 'error');
      return next;
    });
  }, []);

  const sendSudoPassword = useCallback((submit: SudoPasswordSubmit) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(serializeSudoPassword(submit));
    }
  }, []);

  const dismissToast = useCallback((id: number) => {
    setState((previous) => {
      const next = { ...previous, trunk: [...previous.trunk] };
      removeToast(next, id);
      return next;
    });
  }, []);

  return { state, connected, sendCommand, sendSudoPassword, dismissToast };
}
