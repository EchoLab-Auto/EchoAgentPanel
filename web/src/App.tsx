import { useState } from 'react';
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

type View = 'chat' | 'qq' | 'tasks' | 'checklist';

export function App() {
  const { state, connected, sendCommand, sendSudoPassword } = useAgentConnection();
  const [view, setView] = useState<View>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const send = (content: string) => {
    sendCommand({ SendMessage: { session_id: 'local:tui::local_user', content } });
  };

  const busyCount = Object.values(state.activities).filter((a) =>
    ['thinking', 'tool', 'subagent'].includes(a.phase),
  ).length;

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
          <button className="nav-button" onClick={() => setShowSettings(true)}>设置</button>
          <button className="nav-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
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
                    <button onClick={() => sendCommand({ StopAdapter: { name: adapter.name } })}>停</button>
                  ) : (
                    <button onClick={() => sendCommand({ StartAdapter: { name: adapter.name } })}>启</button>
                  )}
                  <button onClick={() => sendCommand({ RestartAdapter: { name: adapter.name } })}>重启</button>
                </span>
              </div>
            ))}
          </div>
          <div className="sidebar-section-title">会话</div>
          <div className="session-list">
            {state.sessions.length === 0 && <div className="muted">（暂无会话）</div>}
            {state.sessions.map((session) => (
              <div key={session.id} className="session-item">
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
          {view === 'chat' && <Chat state={state} onSend={send} />}
          {view === 'qq' && <QqPanel state={state} sendCommand={sendCommand} />}
          {view === 'tasks' && <TasksPanel state={state} />}
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
        <ContextModal snapshot={state.context} onClose={() => setShowContext(false)} />
      )}
      {state.sudoPrompt && (
        <SudoModal prompt={state.sudoPrompt} onSubmit={sendSudoPassword} />
      )}
      <Toasts toasts={state.toasts} />
    </div>
  );
}
