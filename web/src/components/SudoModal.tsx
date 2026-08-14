import { useState } from 'react';
import type { SudoPrompt } from '../state';
import type { SudoPasswordSubmit } from '../protocol';

export function SudoModal({
  prompt,
  onSubmit,
}: {
  prompt: SudoPrompt;
  onSubmit: (submit: SudoPasswordSubmit) => void;
}) {
  const [input, setInput] = useState('');

  const submit = (password: string | null) => {
    onSubmit({ request_id: prompt.request_id, password });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal sudo-modal">
        <div className="modal-head">
          <h2>🔐 sudo 授权请求</h2>
        </div>
        <div className="modal-body">
          <p className="sudo-command">{prompt.command}</p>
          <p className="muted">
            密码只通过专用通道提交，不会进入日志或对话；Enter 授权，Esc 拒绝。
          </p>
          <input
            type="password"
            autoFocus
            value={input}
            placeholder="输入 sudo 密码"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit(input);
              } else if (e.key === 'Escape') {
                submit(null);
              }
            }}
          />
          <div className="form-actions">
            <button onClick={() => submit(null)}>拒绝 (Esc)</button>
            <button className="primary" onClick={() => submit(input)}>授权 (Enter)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
