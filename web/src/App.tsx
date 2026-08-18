import { useEffect, useState } from 'react';
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

type View = 'chat' | 'qq' | 'tasks' | 'checklist';

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
  // 当前对话目标会话；默认 trunk（本地 TUI 会话）
  const [activeSessionId, setActiveSessionId] = useState('local:tui::local_user');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('echo-panel-theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const send = (content: string) => {
    sendCommand({ SendMessage: { session_id: activeSessionId, content } });
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
          <div className="sidebar-section-title">会话</div>
          <div className="session-list">
            {state.sessions.length === 0 && <div className="muted">（暂无会话）</div>}
            {state.sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setView('chat');
                }}
                title="点击切换到此会话"
              >
                <div className="session-title">
                  {session.nickname || session.id}
                  {state.activities[session.id] && state.activities[session.id].phase !== 'completed' && (
                    <span className="session-busy">●</span>
                  )}
                </div>
                <div className="session-preview">{session.last_message || ''}</div>
              </div>
            ))}
          </div>
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
      {state.sudoPrompt && (
        <SudoModal prompt={state.sudoPrompt} onSubmit={sendSudoPassword} />
      )}
      <Toasts toasts={state.toasts} onDismiss={dismissToast} />
    </div>
  );
}
