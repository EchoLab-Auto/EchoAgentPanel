import { useEffect, useState } from 'react';

export function SystemPromptModal({
  initialText,
  onSave,
  onClose,
}: {
  initialText: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>系统提示词插件</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="muted">
            系统提示词由 Core 的 <code>[plugins.system_prompt]</code> 插件注入，不随 API 配置保存。
          </p>
          <textarea
            className="system-prompt-editor"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入系统提示词，留空表示不注入基础系统提示词"
          />
          <div className="form-actions">
            <button onClick={onClose}>取消</button>
            <button className="primary" onClick={() => { onSave(text.trimStart()); }}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
