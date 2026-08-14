import type { ContextSnapshotData } from '../state';

export function ContextModal({
  snapshot,
  onClose,
}: {
  snapshot: ContextSnapshotData | null;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal context-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            上下文快照
            {snapshot && (
              <span className="muted">
                {' '}
                · {snapshot.total_tokens}/{snapshot.limit_tokens} tokens · {snapshot.messages.length} 条
              </span>
            )}
          </h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!snapshot && <div className="muted">（暂无快照，可在聊天中发送 /context 获取）</div>}
          {snapshot?.messages.map((message, index) => (
            <div key={index} className="context-row">
              <span className={`context-role ${message.role}`}>{message.role}</span>
              <span className="context-tokens">{message.tokens}t</span>
              <span className="context-content">{message.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
