//! WebSocket 连接 hook：连接 `/ws`，把事件流交给 reducer，暴露命令发送。

import { useCallback, useEffect, useRef, useState } from 'react';
import { initialState, type AppState, reduce, pushToast } from './state';
import { parseEvent, serializeCommand, serializeSudoPassword, type BackendCommand, type SudoPasswordSubmit } from './protocol';

export interface AgentConnection {
  state: AppState;
  connected: boolean;
  sendCommand: (command: BackendCommand) => void;
  sendSudoPassword: (submit: SudoPasswordSubmit) => void;
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
    }
  }, []);

  const sendSudoPassword = useCallback((submit: SudoPasswordSubmit) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(serializeSudoPassword(submit));
    }
  }, []);

  return { state, connected, sendCommand, sendSudoPassword };
}
