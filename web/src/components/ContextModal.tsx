import { useEffect, useState } from 'react';
import type { ContextSnapshotData } from '../state';
import type { ContextBlockInfo } from '../protocol';
import type { BackendCommand } from '../protocol';

const KIND_LABEL: Record<string, string> = {
  base: '基础',
  skills: '技能清单',
  skill: '常驻技能',
  triggered: '触发技能',
  orchestration: '编排',
  boundary: '边界',
  history: '历史',
};

const KIND_CLASS: Record<string, string> = {
  base: 'ctx-base',
  skills: 'ctx-skills',
  skill: 'ctx-skill',
  triggered: 'ctx-triggered',
  orchestration: 'ctx-orch',
  boundary: 'ctx-boundary',
  history: 'ctx-history',
};

function BlockRow({
  block,
  max,
  defaultOpen,
}: {
  block: ContextBlockInfo;
  max: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const pct = max > 0 ? Math.max(1, Math.round((block.tokens / max) * 100)) : 0;
  const kindLabel = KIND_LABEL[block.kind] ?? block.kind;
  return (
    <div className="ctx-block">
      <div className="ctx-block-head" onClick={() => setOpen(!open)}>
        <span className={`ctx-kind ${KIND_CLASS[block.kind] ?? ''}`}>{kindLabel}</span>
        <span className="ctx-block-label">{block.label}</span>
        <span className="ctx-block-tokens">{block.tokens}t</span>
        <span className="ctx-block-pct">{pct}%</span>
        <span className="ctx-block-caret">{open ? '▾' : '▸'}</span>
      </div>
      <div className="ctx-block-bar">
        <div className={`ctx-block-fill ${KIND_CLASS[block.kind] ?? ''}`} style={{ width: `${pct}%` }} />
      </div>
      {open && (
        <pre className="ctx-block-content">{block.content || '（空）'}</pre>
      )}
    </div>
  );
}

export function ContextModal({
  snapshot,
  onClose,
  sendCommand,
}: {
  snapshot: ContextSnapshotData | null;
  onClose: () => void;
  sendCommand: (command: BackendCommand) => void;
}) {
  const [showMessages, setShowMessages] = useState(false);

  // Refresh the snapshot every time the modal opens.
  useEffect(() => {
    sendCommand('RequestContext');
  }, []);
  const blocks = snapshot?.blocks ?? [];
  const maxBlockTokens = Math.max(1, ...blocks.map((b) => b.tokens));
  const pct = snapshot && snapshot.limit_tokens > 0
    ? Math.min(100, Math.round((snapshot.total_tokens / snapshot.limit_tokens) * 100))
    : 0;
  const promptTokens = blocks
    .filter((b) => b.kind !== 'history')
    .reduce((sum, b) => sum + b.tokens, 0);
  const historyTokens = blocks
    .filter((b) => b.kind === 'history')
    .reduce((sum, b) => sum + b.tokens, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal context-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            上下文分块
            {snapshot && (
              <span className="muted">
                {' '}
                · {snapshot.total_tokens}/{snapshot.limit_tokens} tokens · {snapshot.messages.length} 条
              </span>
            )}
          </h2>
          <button className="close" onClick={() => sendCommand('RequestContext')} title="刷新">↻</button>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!snapshot && <div className="muted">（暂无快照，可在聊天中发送 /context 获取）</div>}
          {snapshot && (
            <>
              <div className="ctx-summary">
                <div className="ctx-gauge">
                  <div
                    className={`ctx-gauge-fill ${pct >= 90 ? 'ctx-danger' : pct >= 70 ? 'ctx-warn' : ''}`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
                <div className="ctx-summary-stats">
                  <span>总占用 {pct}%</span>
                  <span>提示词 {promptTokens}t</span>
                  <span>历史 {historyTokens}t</span>
                  <span>上限 {snapshot.limit_tokens}t</span>
                </div>
              </div>
              <div className="ctx-section-title">
                系统提示词与注入块（{blocks.filter((b) => b.kind !== 'history').length}）
              </div>
              <div className="ctx-blocks">
                {blocks
                  .filter((b) => b.kind !== 'history')
                  .map((b) => (
                    <BlockRow key={b.key} block={b} max={maxBlockTokens} defaultOpen={b.kind === 'base'} />
                  ))}
              </div>
              <div className="ctx-section-title">
                对话历史（{blocks.filter((b) => b.kind === 'history').length}）
              </div>
              <div className="ctx-blocks">
                {blocks
                  .filter((b) => b.kind === 'history')
                  .map((b) => (
                    <BlockRow key={b.key} block={b} max={maxBlockTokens} defaultOpen={false} />
                  ))}
              </div>
              <div className="ctx-section-title ctx-clickable" onClick={() => setShowMessages(!showMessages)}>
                逐条消息明细（{snapshot.messages.length}） {showMessages ? '▾' : '▸'}
              </div>
              {showMessages &&
                snapshot.messages.map((message, index) => (
                  <div key={index} className="context-row">
                    <span className={`context-role ${message.role}`}>{message.role}</span>
                    <span className="context-tokens">{message.tokens}t</span>
                    <span className="context-content">{message.content}</span>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
