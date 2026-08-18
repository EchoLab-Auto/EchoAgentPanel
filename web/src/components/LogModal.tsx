import { useEffect, useState } from 'react';

type LogKind = 'panel' | 'core';

const LOG_ENDPOINT: Record<LogKind, string> = {
  panel: '/api/logs/panel',
  core: '/api/logs/core',
};

export function LogModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<LogKind>('core');
  const [text, setText] = useState('（正在加载日志…）');
  const [auto, setAuto] = useState(true);

  const load = async (selected: LogKind) => {
    try {
      const resp = await fetch(LOG_ENDPOINT[selected], { cache: 'no-store' });
      if (!resp.ok) {
        setText(`日志接口返回 HTTP ${resp.status}`);
        return;
      }
      setText(await resp.text());
    } catch (error) {
      setText(`日志读取失败: ${String(error)}`);
    }
  };

  useEffect(() => {
    load(kind);
  }, [kind]);

  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => load(kind), 5000);
    return () => window.clearInterval(timer);
  }, [auto, kind]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>日志查看器</h2>
          <div className="log-tabs">
            <button
              className={`nav-button ${kind === 'core' ? 'active' : ''}`}
              onClick={() => setKind('core')}
            >
              Core
            </button>
            <button
              className={`nav-button ${kind === 'panel' ? 'active' : ''}`}
              onClick={() => setKind('panel')}
            >
              Panel
            </button>
          </div>
          <button className="nav-button" onClick={() => setAuto((v) => !v)}>
            {auto ? '自动刷新中' : '手动刷新'}
          </button>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body log-body">
          <pre className="log-viewer">{text}</pre>
        </div>
      </div>
    </div>
  );
}
