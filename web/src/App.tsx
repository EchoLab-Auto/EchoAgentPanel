import { useEffect, useState } from 'react';
import type { SessionInfo } from './protocol';
import type { AppState } from './state';
import { useAgentConnection } from './ws';
import { Chat } from './components/Chat';
import { SettingsModal } from './components/SettingsModal';
import { SudoModal } from './components/SudoModal';
import { QqPanel } from './components/QqPanel';
import { TasksPanel } from './components/TasksPanel';
import { ChecklistPanel } from './components/ChecklistPanel';
import { HelpModal } from './components/HelpModal';
import { Toasts } from './components/Toasts';
import { ContextModal } from './components/ContextModal';
import { LogModal } from './components/LogModal';
import { SystemPromptModal } from './components/SystemPromptModal';
import { BranchModal } from './components/BranchModal';

type View = 'chat' | 'qq' | 'tasks' | 'checklist';

function sessionTag(session: SessionInfo): { group: string; label: string; tag: string } {
  if (session.id === 'global') {
    return { group: 'global', label: '全部消息', tag: '全局' };
  }
  const parts = session.id.split(':');
  const platform = parts[0] ?? '';
  const scope = parts[1] ?? '';
  if (platform === 'local') {
    return { group: 'local', label: session.nickname || session.id, tag: 'Local' };
  }
  if (platform === 'qq') {
    if (scope === 'group') {
      return {
        group: 'qq-group',
        label: session.group_name || session.id,
        tag: '群',
      };
    }
    return { group: 'qq-dm', label: session.nickname || session.id, tag: '私聊' };
  }
  return { group: 'other', label: session.nickname || session.id, tag: platform };
}

const SESSION_GROUP_LABEL: Record<string, string> = {
  global: '全局',
  local: 'Local',
  'qq-dm': 'QQ 私聊',
  'qq-group': 'QQ 群',
  other: '其他',
};

function SessionGroups({
  sessions,
  activities,
  activeSessionId,
  onSelect,
}: {
  sessions: SessionInfo[];
  activities: AppState['activities'];
  activeSessionId: string;
  onSelect: (id: string) => void;
}) {
  const groups: Array<{ key: string; sessions: SessionInfo[] }> = [
    { key: 'global', sessions: [] },
    { key: 'local', sessions: [] },
    { key: 'qq-dm', sessions: [] },
    { key: 'qq-group', sessions: [] },
    { key: 'other', sessions: [] },
  ];
  for (const session of sessions) {
    const tag = sessionTag(session);
    const group = groups.find((g) => g.key === tag.group) ?? groups[groups.length - 1];
    group.sessions.push(session);
  }

  return (
    <div className="session-list">
      {groups.map((group) => {
        if (group.sessions.length === 0 && group.key !== 'global') return null;
        return (
          <div key={group.key} className="session-group">
            <div className="session-group-title">{SESSION_GROUP_LABEL[group.key]}</div>
            {group.key === 'global' && (
              <div
                className={`session-item ${activeSessionId === 'global' ? 'active' : ''}`}
                onClick={() => onSelect('global')}
                title="全局上下文：显示全部会话的消息"
              >
                <div className="session-title">
                  <span className="session-tag tag-global">全局</span>
                  全部消息
                </div>
                <div className="session-preview">共享同一 trunk 上下文</div>
              </div>
            )}
            {group.sessions.map((session) => {
              const tag = sessionTag(session);
              const busy = activities[session.id] && activities[session.id].phase !== 'completed';
              return (
                <div
                  key={session.id}
                  className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                  onClick={() => onSelect(session.id)}
                  title="点击切换到此会话"
                >
                  <div className="session-title">
                    <span className={`session-tag tag-${tag.group}`}>{tag.tag}</span>
                    {session.nickname || session.id}
                    {busy && <span className="session-busy">●</span>}
                  </div>
                  <div className="session-preview">{session.last_message || ''}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function truncateTask(task: string): string {
  const oneLine = task.replace(/\s+/g, ' ').trim();
  return oneLine.length > 24 ? oneLine.slice(0, 24) + '…' : oneLine;
}

export function App() {
  const { state, connected, sendCommand, sendSudoPassword, dismissToast } = useAgentConnection();
  const [view, setViewState] = useState<View>(() => {
    try {
      const saved = localStorage.getItem('echo-panel-view');
      return (['chat', 'qq', 'tasks', 'checklist'] as View[]).includes(saved as View)
        ? (saved as View)
        : 'chat';
    } catch {
      return 'chat';
    }
  });
  const setView = (next: View) => {
    setViewState(next);
    try {
      localStorage.setItem('echo-panel-view', next);
    } catch {
      // ignore storage errors
    }
  };
  // 当前对话目标会话；'global' = 全局上下文（显示全部消息）。
  // 默认 local user 会话。
  const [activeSessionId, setActiveSessionId] = useState('local:tui::local_user');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('echo-panel-theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const send = (content: string) => {
    const target = activeSessionId === 'global' ? 'local:tui::local_user' : activeSessionId;
    sendCommand({ SendMessage: { session_id: target, content } });
  };

  const busyCount = Object.values(state.activities).filter((a) =>
    ['thinking', 'tool', 'subagent'].includes(a.phase),
  ).length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSettings(false);
        setShowHelp(false);
        setShowContext(false);
        setShowLogs(false);
        setShowSystemPrompt(false);
        setActiveBranchId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navButton = (target: View, label: string) => (
    <button
      className={`nav-button ${view === target ? 'active' : ''}`}
      onClick={() => setView(target)}
    >
      {label}
    </button>
  );

  return (
    <div className={`app theme-${theme}`}>
      <header className="topbar">
        <div className="brand">EchoAgent Panel</div>
        <div className="topbar-status">
          <span className={`dot ${connected ? 'online' : 'offline'}`} />
          {connected ? '已连接' : '连接中…'}
        </div>
        <div className="topbar-model">
          {state.model || '—'}
          {busyCount > 0 && <span className="busy-badge">忙碌 ×{busyCount}</span>}
        </div>
        <div className="topbar-actions">
          {navButton('chat', '聊天')}
          {navButton('qq', 'QQ')}
          {navButton('tasks', `任务${state.tasks.filter((t) => t.status === 'running').length ? `(${state.tasks.filter((t) => t.status === 'running').length})` : ''}`)}
          {navButton('checklist', `清单${state.checklists.length ? `(${state.checklists.length})` : ''}`)}
          <button className="nav-button" onClick={() => setShowContext(true)}>上下文</button>
          <button
            className="nav-button"
            onClick={() => {
              sendCommand('RequestSystemPrompt');
              setShowSystemPrompt(true);
            }}
          >
            系统提示词
          </button>
          <button className="nav-button" onClick={() => setShowLogs(true)}>日志</button>
          <button className="nav-button" onClick={() => setShowSettings(true)}>设置</button>
          <button
            className="nav-button"
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark';
              setTheme(next);
              try {
                localStorage.setItem('echo-panel-theme', next);
              } catch {
                // ignore storage errors (private mode)
              }
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="nav-button" onClick={() => setShowHelp(true)}>帮助</button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-section-title">适配器</div>
          <div className="adapter-list">
            {state.adapters.length === 0 && <div className="muted">（无适配器信息）</div>}
            {state.adapters.map((adapter) => (
              <div key={adapter.name} className="adapter-item">
                <span className={`dot ${adapter.running ? 'online' : 'offline'}`} />
                <span className="adapter-name">{adapter.display_name || adapter.name}</span>
                {adapter.self_id && <span className="adapter-id">{adapter.self_id}</span>}
                <span className="adapter-actions">
                  {adapter.running ? (
                    <button disabled={!connected} onClick={() => sendCommand({ StopAdapter: { name: adapter.name } })}>停</button>
                  ) : (
                    <button disabled={!connected} onClick={() => sendCommand({ StartAdapter: { name: adapter.name } })}>启</button>
                  )}
                  <button disabled={!connected} onClick={() => sendCommand({ RestartAdapter: { name: adapter.name } })}>重启</button>
                </span>
              </div>
            ))}
          </div>
          <div className="sidebar-section-title">
            临时分支
            {Object.keys(state.branchTabs).length > 0 && (
              <span className="branch-tab-count">{Object.keys(state.branchTabs).length}</span>
            )}
          </div>
          <div className="branch-tab-list">
            {Object.keys(state.branchTabs).length === 0 && (
              <div className="muted">（无运行中的分支）</div>
            )}
            {Object.entries(state.branchTabs).map(([branchId, tab]) => (
              <div
                key={branchId}
                className={`branch-tab ${activeBranchId === branchId ? 'active' : ''}`}
                onClick={() => setActiveBranchId(branchId)}
                title="点击查看分支执行过程"
              >
                <span className="branch-tab-spinner" />
                <span className="branch-tab-task">{truncateTask(tab.task)}</span>
              </div>
            ))}
          </div>
          <div className="sidebar-section-title">会话</div>
          <SessionGroups
            sessions={state.sessions}
            activities={state.activities}
            activeSessionId={activeSessionId}
            onSelect={(id) => {
              setActiveSessionId(id);
              setView('chat');
            }}
          />
        </aside>

        <main className="main">
          {view === 'chat' && (
            <Chat
              state={state}
              connected={connected}
              sessionId={activeSessionId}
              onSend={send}
              onCancel={() => sendCommand({ CancelRequestedWork: { session_id: activeSessionId, all: false } })}
            />
          )}
          {view === 'qq' && <QqPanel state={state} connected={connected} sendCommand={sendCommand} />}
          {view === 'tasks' && <TasksPanel state={state} sendCommand={sendCommand} />}
          {view === 'checklist' && <ChecklistPanel state={state} />}
        </main>
      </div>

      {showSettings && (
        <SettingsModal
          api={state.api}
          sendCommand={sendCommand}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showContext && (
        <ContextModal
          snapshot={state.context}
          onClose={() => setShowContext(false)}
          sendCommand={sendCommand}
        />
      )}
      {showLogs && <LogModal onClose={() => setShowLogs(false)} />}
      {showSystemPrompt && (
        <SystemPromptModal
          initialText={state.systemPrompt}
          onSave={(text) => {
            sendCommand({ SetSystemPrompt: { prompt: text } });
          }}
          onClose={() => setShowSystemPrompt(false)}
        />
      )}
      {activeBranchId && (
        <BranchModal
          tab={state.branchTabs[activeBranchId] ?? null}
          branchId={activeBranchId}
          onClose={() => setActiveBranchId(null)}
        />
      )}
      {state.sudoPrompt && (
        <SudoModal prompt={state.sudoPrompt} onSubmit={sendSudoPassword} />
      )}
      <Toasts toasts={state.toasts} onDismiss={dismissToast} />
    </div>
  );
}
