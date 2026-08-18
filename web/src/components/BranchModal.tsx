import { useEffect, useRef } from 'react';
import type { BranchTab } from '../state';

/**
 * 临时分支查看器：展示分支运行期间的实时活动
 * （推理、工具调用、临时内容、最终输出）。
 */
export function BranchModal({
  tab,
  branchId,
  onClose,
}: {
  tab: BranchTab | null;
  branchId: string;
  onClose: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab?.msgs.length]);

  const shortId = branchId.length > 8 ? branchId.slice(0, 8) : branchId;
  const statusLabel =
    tab?.status === 'running'
      ? '运行中'
      : tab?.status === 'completed'
        ? '已完成'
        : tab?.status === 'cancelled'
          ? '已取消'
          : '失败';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal branch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            临时分支 · {shortId}
            {tab && (
              <span className={`branch-status ${tab.status}`}>{statusLabel}</span>
            )}
          </h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!tab && <div className="muted">（分支已结束并合并到主会话）</div>}
          {tab && (
            <>
              <div className="branch-meta muted">
                <div>任务：{tab.task}</div>
                <div>目标：{tab.target} · 会话：{tab.sessionId}</div>
              </div>
              <div className="branch-viewer">
                {tab.msgs.length === 0 && (
                  <div className="muted">（暂无活动，等待分支执行…）</div>
                )}
                {tab.msgs.map((m, index) => (
                  <div key={index} className={`branch-msg branch-msg-${m.kind}`}>
                    {m.kind === 'tool' && (
                      <>
                        <div className="branch-msg-head">
                          <span className="msg-name">工具 · {m.toolName}</span>
                          {m.status && (
                            <span className={`tool-status ${m.status}`}>
                              {m.status === 'running' ? '运行中' : m.status === 'succeeded' ? '成功' : '失败'}
                            </span>
                          )}
                        </div>
                        {m.input && <pre className="msg-input">{m.input}</pre>}
                        {m.output && <pre className="msg-output">{m.output}</pre>}
                      </>
                    )}
                    {m.kind === 'reasoning' && (
                      <details className="reasoning" open>
                        <summary>推理</summary>
                        <p>{m.text}</p>
                      </details>
                    )}
                    {m.kind === 'content' && <div className="msg-content">{m.text}</div>}
                    {m.kind === 'notice' && <div className="muted">{m.text}</div>}
                  </div>
                ))}
                {tab.status === 'running' && <div className="branch-running-hint muted">分支执行中…</div>}
                <div ref={bottomRef} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
