import { useEffect, useRef, useState } from 'react';
import type { AppState, DisplayMessage } from '../state';

export function Chat({
  state,
  connected,
  onSend,
}: {
  state: AppState;
  connected: boolean;
  onSend: (content: string) => void;
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastMessage = state.trunk[state.trunk.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Re-scroll when a new message arrives or the last tool output updates.
  }, [state.trunk.length, lastMessage?.tool?.output]);

  const submit = () => {
    const content = input.trim();
    if (!connected || !content) return;
    onSend(content);
    setInput('');
  };

  return (
    <div className="chat">
      <div className="chat-messages">
        {state.trunk.length === 0 && <div className="muted empty-hint">（暂无消息，从下方输入开始对话）</div>}
        {state.trunk.map((message) => (
          <MessageView key={message.key} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <textarea
          className="chat-input"
          value={input}
          placeholder={connected ? "输入消息，Enter 发送（Shift+Enter 换行）" : "未连接到 Core，暂时无法发送"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            const composing = e.nativeEvent.isComposing || e.key === 'Process' || e.keyCode === 229;
            if (e.key === 'Enter' && !e.shiftKey && !composing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button className="send-button" onClick={submit} disabled={!connected || !input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
}

function MessageView({ message }: { message: DisplayMessage }) {
  const roleClass = `msg msg-${message.role}`;
  const time = new Date(message.time * 1000).toLocaleTimeString('zh-CN', { hour12: false });

  if (message.role === 'tool') {
    const tool = message.tool;
    return (
      <div className={roleClass}>
        <div className="msg-head">
          <span className="msg-role">工具</span>
          <span className="msg-name">{message.content}</span>
          <span className="msg-time">{time}</span>
          {tool && (
            <span className={`tool-status ${tool.status}`}>
              {tool.status === 'running' ? '运行中' : tool.status === 'succeeded' ? '成功' : '失败'}
            </span>
          )}
        </div>
        {tool?.input && <div className="msg-input">{tool.input}</div>}
        {tool?.output && <pre className="msg-output">{tool.output}</pre>}
      </div>
    );
  }

  return (
    <div className={roleClass}>
      <div className="msg-head">
        <span className="msg-role">
          {message.role === 'user' ? '用户' : message.role === 'backend' ? 'Agent' : '系统'}
        </span>
        {message.source && (
          <span className="msg-source">
            {message.source.adapter_name}
            {message.source.channel.startsWith('group') ? ` · 群 ${message.source.channel}` : ''}
            {message.source.user_name ? ` · ${message.source.user_name}` : ''}
          </span>
        )}
        <span className="msg-time">{time}</span>
      </div>
      {message.reasoning && message.reasoning.length > 0 && (
        <details className="reasoning">
          <summary>推理过程（{message.reasoning.length} 段）</summary>
          {message.reasoning.map((part, index) => (
            <p key={index}>{part}</p>
          ))}
        </details>
      )}
      <div className="msg-content">{message.content}</div>
    </div>
  );
}
