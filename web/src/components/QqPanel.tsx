import type { AppState } from '../state';
import type { BackendCommand, GateMode } from '../protocol';

export function QqPanel({
  state,
  sendCommand,
}: {
  state: AppState;
  sendCommand: (command: BackendCommand) => void;
}) {
  const refreshLists = () => {
    sendCommand('RequestGroupList');
    sendCommand('RequestFriendList');
    sendCommand('RequestQqFilterConfig');
  };

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
