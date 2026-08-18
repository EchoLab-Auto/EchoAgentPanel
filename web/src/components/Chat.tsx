import { useEffect, useRef, useState } from 'react';
import type { AppState, BranchMsg, DisplayMessage, ToolMsg } from '../state';

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
  const [showJumpDown, setShowJumpDown] = useState(false);

  // 按会话过滤：全局视图显示全部；具体会话只显示归属该会话的消息。
  const visibleMessages =
    sessionId === 'global'
      ? state.trunk
      : state.trunk.filter((m) => m.sessionId === sessionId);
  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const containerRef = useRef<HTMLDivElement>(null);

  // 仅在用户位于底部附近时自动滚动，避免打断向上翻阅历史。
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    setShowJumpDown(!nearBottom);
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    // Re-scroll when a new message arrives or the last tool output updates.
  }, [visibleMessages.length, lastMessage?.tool?.output, lastMessage?.branch?.msgs.length]);

  const jumpToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowJumpDown(false);
  };

  const emptyHint =
    sessionId === 'global'
      ? '（暂无消息，从下方输入开始对话）'
      : `（会话 ${sessionId} 暂无消息，从下方输入开始对话）`;

  const submit = () => {
    const content = input.trim();
    if (!connected || !content) return;
    onSend(content);
    setInput('');
  };

  return (
    <div className="chat">
      <div
        className="chat-messages"
        ref={containerRef}
        onScroll={() => {
          const container = containerRef.current;
          if (!container) return;
          const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
          setShowJumpDown(!nearBottom);
        }}
      >
        {visibleMessages.length === 0 && <div className="muted empty-hint">{emptyHint}</div>}
        {visibleMessages.map((message) => (
          <MessageView key={message.key} message={message} />
        ))}
        <div ref={bottomRef} />
        {showJumpDown && (
          <button className="jump-bottom" onClick={jumpToBottom} title="跳转到最新消息">
            ↓
          </button>
        )}
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

function fmtTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleTimeString('zh-CN', { hour12: false });
}

// 工具调用详情（参数 + 输出可折叠）——与一般对话框中的工具消息排版一致。
function ToolCallView({
  name,
  input,
  output,
  status,
  time,
}: {
  name: string;
  input?: string;
  output?: string;
  status?: ToolMsg['status'];
  time?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const inputText = input ?? '';
  const outputText = output ?? '';
  const total = inputText.length + outputText.length;
  return (
    <div className="msg msg-tool">
      <div className="msg-head">
        <span className="msg-role">工具</span>
        <span className="msg-name">{name}</span>
        {time && <span className="msg-time">{time}</span>}
        {status && (
          <span className={`tool-status ${status}`}>
            {status === 'running' ? '运行中' : status === 'succeeded' ? '成功' : '失败'}
          </span>
        )}
        {outputText && <CopyButton text={outputText} />}
        {total > 0 && (
          <button
            className="msg-collapse"
            onClick={() => setShowDetails(!showDetails)}
            title={showDetails ? '折叠调用详情' : '展开调用详情'}
          >
            {showDetails ? '▾ 收起详情' : `▸ 详情 ${total} 字符`}
          </button>
        )}
      </div>
      {showDetails && inputText && <pre className="msg-input">{inputText}</pre>}
      {showDetails && outputText && <pre className="msg-output">{outputText}</pre>}
    </div>
  );
}

// 推理过程块——与一般对话框中的推理折叠一致。
function ReasoningView({ parts, time }: { parts: string[]; time?: string }) {
  return (
    <details className="reasoning" open>
      <summary>
        推理过程（{parts.length} 段）
        {time && <span className="msg-time"> · {time}</span>}
      </summary>
      {parts.map((part, index) => (
        <p key={index}>{part}</p>
      ))}
    </details>
  );
}

// 分支合并框：展开后嵌套展示分支内部的完整交互记录（推理 / 工具调用 / 内容），
// 排版与一般对话一致，只是多了一层"分支合并"外框。
function BranchMergeView({ message }: { message: DisplayMessage }) {
  const [showDetail, setShowDetail] = useState(false);
  const branch = message.branch!;
  const shortId = branch.branchId.length > 8 ? branch.branchId.slice(0, 8) : branch.branchId;
  const toolCount = branch.msgs.filter((m) => m.kind === 'tool').length;
  const reasoningCount = branch.msgs.filter((m) => m.kind === 'reasoning').length;

  // 把相邻的 reasoning 片段合并成一段段，模拟一般消息的 reasoning 数组。
  const entries = useBranchEntries(branch.msgs);

  return (
    <div className="msg msg-branch">
      <div className="branch-merge-head" onClick={() => setShowDetail(!showDetail)}>
        <span className="msg-role">分支合并</span>
        <span className="msg-name">{shortId}</span>
        <span className="msg-time">{fmtTime(message.time)}</span>
        <span className="msg-collapse">
          {showDetail ? '▾ 收起' : `▸ ${toolCount} 工具 · ${reasoningCount} 推理`}
        </span>
      </div>
      <div className="msg-content">{branch.summary}</div>
      {showDetail && (
        <div className="branch-merge-inner">
          {entries.length === 0 && <div className="muted">（分支无详细活动记录）</div>}
          {entries.map((entry, index) => {
            if (entry.kind === 'tool') {
              return (
                <ToolCallView
                  key={index}
                  name={entry.toolName ?? entry.text}
                  input={entry.input}
                  output={entry.output}
                  status={entry.status}
                  time={fmtTime(entry.time)}
                />
              );
            }
            if (entry.kind === 'reasoning') {
              return <ReasoningView key={index} parts={[entry.text]} time={fmtTime(entry.time)} />;
            }
            if (entry.kind === 'content') {
              return (
                <div className="msg msg-backend" key={index}>
                  <div className="msg-head">
                    <span className="msg-role">Agent</span>
                    <span className="msg-time">{fmtTime(entry.time)}</span>
                  </div>
                  <div className="msg-content">{entry.text}</div>
                </div>
              );
            }
            return (
              <div className="muted branch-entry-notice" key={index}>
                {entry.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function useBranchEntries(msgs: BranchMsg[]): BranchMsg[] {
  // 合并连续 reasoning 片段为一段（与主会话 reasoning 数组一致）。
  const merged: BranchMsg[] = [];
  for (const m of msgs) {
    const last = merged[merged.length - 1];
    if (m.kind === 'reasoning' && last && last.kind === 'reasoning') {
      last.text += '\n\n' + m.text;
    } else {
      merged.push({ ...m });
    }
  }
  return merged;
}

function MessageView({ message }: { message: DisplayMessage }) {
  const roleClass = `msg msg-${message.role}`;
  const time = fmtTime(message.time);

  if (message.role === 'tool' && message.tool) {
    return (
      <ToolCallView
        name={message.content}
        input={message.tool.input ?? undefined}
        output={message.tool.output ?? undefined}
        status={message.tool.status}
        time={time}
      />
    );
  }

  if (message.role === 'branch' && message.branch) {
    return <BranchMergeView message={message} />;
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
        <ReasoningView parts={message.reasoning} />
      )}
      <div className="msg-content">{message.content}</div>
    </div>
  );
}
