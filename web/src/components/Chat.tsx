import { useEffect, useRef, useState } from 'react';
import type { AppState, DisplayMessage } from '../state';

export function Chat({
  state,
  connected,
  sessionId,
  onSend,
  onCancel,
}: {
  state: AppState;
  connected: boolean;
  sessionId: string;
  onSend: (content: string) => void;
  onCancel: () => void;
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
        <div className="chat-meta">
          <span className="chat-session muted" title="当前会话">
            {sessionId}
          </span>
          <button className="chat-cancel" onClick={onCancel} disabled={!connected} title="取消当前进行中的任务">
            取消任务
          </button>
        </div>
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — ignore
    }
  };
  return (
    <button className="msg-copy" onClick={copy} title="复制">
      {copied ? '✓' : '⧉'}
    </button>
  );
}

function MessageView({ message }: { message: DisplayMessage }) {
  // 工具调用详情（参数 + 输出）默认折叠
  const [showToolDetails, setShowToolDetails] = useState(false);
  // 分支合并块默认折叠
  const [showBranchDetail, setShowBranchDetail] = useState(false);
  const roleClass = `msg msg-${message.role}`;
  const time = new Date(message.time * 1000).toLocaleTimeString('zh-CN', { hour12: false });

  if (message.role === 'tool') {
    const tool = message.tool;
    const input = tool?.input ?? '';
    const output = tool?.output ?? '';
    const total = input.length + output.length;
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
          {output && <CopyButton text={output} />}
          {total > 0 && (
            <button
              className="msg-collapse"
              onClick={() => setShowToolDetails(!showToolDetails)}
              title={showToolDetails ? '折叠调用详情' : '展开调用详情'}
            >
              {showToolDetails ? '▾ 收起详情' : `▸ 详情 ${total} 字符`}
            </button>
          )}
        </div>
        {showToolDetails && tool?.input && <pre className="msg-input">{tool.input}</pre>}
        {showToolDetails && tool?.output && <pre className="msg-output">{tool.output}</pre>}
      </div>
    );
  }

  if (message.role === 'branch' && message.branch) {
    const branch = message.branch;
    const shortId = branch.branchId.length > 8 ? branch.branchId.slice(0, 8) : branch.branchId;
    const toolCount = branch.msgs.filter((m) => m.kind === 'tool').length;
    const reasoningCount = branch.msgs.filter((m) => m.kind === 'reasoning').length;
    return (
      <div className={roleClass}>
        <div className="msg-head">
          <span className="msg-role">分支合并</span>
          <span className="msg-name">{shortId}</span>
          <span className="msg-time">{time}</span>
          <CopyButton text={JSON.stringify(branch.msgs, null, 2)} />
          <button
            className="msg-collapse"
            onClick={() => setShowBranchDetail(!showBranchDetail)}
            title={showBranchDetail ? '折叠分支详情' : '展开分支详情'}
          >
            {showBranchDetail ? '▾ 收起' : `▸ ${toolCount} 工具 · ${reasoningCount} 推理`}
          </button>
        </div>
        <div className="msg-content">{branch.summary}</div>
        {showBranchDetail && (
          <div className="branch-detail">
            {branch.msgs.map((m, index) => (
              <div key={index} className={`branch-msg branch-msg-${m.kind}`}>
                {m.kind === 'tool' && (
                  <>
                    <div className="branch-msg-head">
                      <span className="msg-name">工具 · {m.toolName}</span>
                      {m.status && <span className={`tool-status ${m.status}`}>{m.status === 'running' ? '运行中' : m.status === 'succeeded' ? '成功' : '失败'}</span>}
                    </div>
                    {m.input && <pre className="msg-input">{m.input}</pre>}
                    {m.output && <pre className="msg-output">{m.output}</pre>}
                  </>
                )}
                {m.kind === 'reasoning' && <details className="reasoning"><summary>推理</summary><p>{m.text}</p></details>}
                {m.kind === 'content' && <div className="msg-content">{m.text}</div>}
                {m.kind === 'notice' && <div className="muted">{m.text}</div>}
              </div>
            ))}
            {branch.msgs.length === 0 && <div className="muted">（分支无详细活动记录）</div>}
          </div>
        )}
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
        {message.content && <CopyButton text={message.content} />}
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
