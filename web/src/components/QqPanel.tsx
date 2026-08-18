import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState } from '../state';
import type { AdapterStatus, BackendCommand, GateMode } from '../protocol';

interface LoginStatus {
  online: boolean;
  user_id?: string | null;
  nickname?: string | null;
  error?: string | null;
}

export function QqPanel({
  state,
  connected,
  sendCommand,
}: {
  state: AppState;
  connected: boolean;
  sendCommand: (command: BackendCommand) => void;
}) {
  const qqAdapter = state.adapters.find((adapter) => adapter.name === 'qq');

  const refreshLists = () => {
    sendCommand('RequestGroupList');
    sendCommand('RequestFriendList');
    sendCommand('RequestQqFilterConfig');
    sendCommand('RequestQqOwner');
  };

  useEffect(() => {
    if (connected) refreshLists();
    // Re-runs when the panel (re)connects so lists stay fresh.
  }, [sendCommand, connected]);

  const setGateMode = (mode: GateMode) => {
    sendCommand({ SetQqGateMode: { mode } });
  };

  const applyAllowlist = () => {
    sendCommand({
      UpdateQqAllowlist: {
        user_ids: state.qqFilter.allowlist_users,
        group_ids: state.qqFilter.allowlist_groups,
      },
    });
  };

  const applyDenylist = () => {
    sendCommand({
      UpdateQqDenylist: {
        user_ids: state.qqFilter.denylist_users,
        group_ids: state.qqFilter.denylist_groups,
      },
    });
  };

  const toggleIn = (list: number[], id: number, set: (next: number[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>QQ 适配器管理</h2>
        <button className="nav-button" onClick={refreshLists}>刷新列表</button>
      </div>

      <QqLoginSection adapter={qqAdapter} owner={state.qqOwner} />

      <div className="panel-section">
        <h3>门控模式</h3>
        <div className="gate-mode-row">
          {(['none', 'allowlist', 'denylist'] as GateMode[]).map((mode) => (
            <button
              key={mode}
              className={`gate-mode ${state.qqGateMode === mode ? 'active' : ''}`}
              onClick={() => setGateMode(mode)}
            >
              {mode === 'none' ? '无约束' : mode === 'allowlist' ? '白名单' : '黑名单'}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel-section">
          <h3>白名单用户</h3>
          <div className="id-list">
            {state.qqFilter.allowlist_users.map((id) => (
              <span key={id} className="id-chip" onClick={() => toggleIn(state.qqFilter.allowlist_users, id, (next) => {
                sendCommand({ UpdateQqAllowlist: { user_ids: next, group_ids: state.qqFilter.allowlist_groups } });
              })}>
                {id} ×
              </span>
            ))}
            {state.qqFilter.allowlist_users.length === 0 && <span className="muted">（空）</span>}
          </div>
          <button onClick={applyAllowlist}>保存白名单</button>
          <div className="friend-list">
            {state.qqFriends.map(([id, name]) => (
              <button
                key={id}
                className={`friend-chip ${state.qqFilter.allowlist_users.includes(id) ? 'selected' : ''}`}
                onClick={() => toggleIn(state.qqFilter.allowlist_users, id, (next) => {
                  sendCommand({ UpdateQqAllowlist: { user_ids: next, group_ids: state.qqFilter.allowlist_groups } });
                })}
              >
                {name} ({id})
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h3>黑名单用户</h3>
          <div className="id-list">
            {state.qqFilter.denylist_users.map((id) => (
              <span key={id} className="id-chip" onClick={() => toggleIn(state.qqFilter.denylist_users, id, (next) => {
                sendCommand({ UpdateQqDenylist: { user_ids: next, group_ids: state.qqFilter.denylist_groups } });
              })}>
                {id} ×
              </span>
            ))}
            {state.qqFilter.denylist_users.length === 0 && <span className="muted">（空）</span>}
          </div>
          <button onClick={applyDenylist}>保存黑名单</button>
        </div>

        <div className="panel-section">
          <h3>白名单群</h3>
          <div className="id-list">
            {state.qqFilter.allowlist_groups.map((id) => (
              <span key={id} className="id-chip">{id}</span>
            ))}
            {state.qqFilter.allowlist_groups.length === 0 && <span className="muted">（空）</span>}
          </div>
          <div className="group-list">
            {state.qqGroups.map(([id, name]) => (
              <button
                key={id}
                className={`group-chip ${state.qqFilter.allowlist_groups.includes(id) ? 'selected' : ''}`}
                onClick={() => toggleIn(state.qqFilter.allowlist_groups, id, (next) => {
                  sendCommand({ UpdateQqAllowlist: { user_ids: state.qqFilter.allowlist_users, group_ids: next } });
                })}
              >
                {name} ({id})
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h3>黑名单群</h3>
          <div className="id-list">
            {state.qqFilter.denylist_groups.map((id) => (
              <span key={id} className="id-chip">{id}</span>
            ))}
            {state.qqFilter.denylist_groups.length === 0 && <span className="muted">（空）</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function QqLoginSection({ adapter, owner }: { adapter?: AdapterStatus; owner: number }) {
  const [status, setStatus] = useState<LoginStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qrRequested = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const resp = await fetch('/api/qq/login-status', { cache: 'no-store' });
      const data = await resp.json();
      if (!resp.ok) {
        setStatus({ online: false });
        return;
      }
      setStatus(data as LoginStatus);
      if (data.online) setQrUrl(null);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const timer = window.setInterval(loadStatus, 5000);
    return () => window.clearInterval(timer);
  }, [loadStatus]);

  const loadQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/qq/qrcode');
      if (!resp.ok) {
        let message = `二维码读取失败 (HTTP ${resp.status})`;
        try {
          const data = await resp.json();
          if (data && data.error) message = data.error;
        } catch {
          // keep default message
        }
        setQrUrl(null);
        setError(message);
        return;
      }
      const blob = await resp.blob();
      setQrUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch {
      setQrUrl(null);
      setError('二维码读取失败，请确认 NapCat 容器正在运行');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load the QR once the backend reports that QQ is not logged in.
  useEffect(() => {
    if (
      !adapter?.connected &&
      status &&
      !status.online &&
      !qrUrl &&
      !loading &&
      !qrRequested.current
    ) {
      qrRequested.current = true;
      loadQr();
    }
  }, [adapter?.connected, status, qrUrl, loading, loadQr]);

  const webuiUrl = `http://${window.location.hostname}:6099`;

  return (
    <div className="panel-section qq-login">
      <div className="qq-login-head">
        <h3>QQ 登录</h3>
        <button className="nav-button" onClick={loadQr} disabled={loading}>
          {loading ? '读取中…' : '获取登录二维码'}
        </button>
      </div>

      {adapter?.connected ? (
        <div className="qq-login-status qq-login-online">
          ✅ QQ 已连接：{adapter.self_id || '已连接'}
          {status?.online && (
            <span> · {status.nickname || '已登录'}（{status.user_id}）</span>
          )}
        </div>
      ) : status?.online ? (
        <div className="qq-login-status qq-login-online">
          ✅ QQ 已登录：{status.nickname || '未知昵称'}（{status.user_id}）
        </div>
      ) : (
        <div className="qq-login-status qq-login-offline">
          {status === null
            ? '正在检查登录状态…'
            : adapter
              ? `⚠️ QQ 未连接（适配器 ${adapter.running ? '运行中，无客户端' : '未启动'}），请使用手机 QQ 扫码登录`
              : '⚠️ QQ 未登录，请使用手机 QQ 扫码登录'}
          {status?.error && <div className="muted">登录状态接口暂不可用：{status.error}</div>}
        </div>
      )}

      {qrUrl && (
        <div className="qq-login-qr">
          <img src={qrUrl} alt="QQ 登录二维码" className="qr-img" />
          <div className="muted">二维码约 2 分钟有效，过期请点击“获取登录二维码”刷新</div>
        </div>
      )}
      {error && <div className="qq-login-error">{error}</div>}
      <div className="muted">
        QQ 管理员：{owner > 0 ? owner : '（未设置）'}
      </div>
      <div className="muted">
        WebUI 登录地址：<a href={webuiUrl} target="_blank" rel="noreferrer">{webuiUrl}</a>
      </div>
    </div>
  );
}
