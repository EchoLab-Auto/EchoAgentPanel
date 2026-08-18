import { useEffect, useState } from 'react';
import type { AppState, OrchActivity } from '../state';

const KIND_LABEL: Record<string, string> = {
  background: '后台',
  parallel: '并行',
  subagent: 'Subagent',
  reply: '临时回复',
};

const STATUS_LABEL: Record<string, string> = {
  running: '运行中',
  awaiting: '等待整合',
  completed: '已完成',
  integrated: '已整合',
  failed: '失败',
  cancelled: '已取消',
};

const BRANCH_LABEL: Record<string, string> = {
  running: '运行中',
  succeeded: '成功',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export function TasksPanel({
  state,
  sendCommand,
}: {
  state: AppState;
  sendCommand: (command: import('../protocol').BackendCommand) => void;
}) {
  const [, setTick] = useState(0);
  const hasActiveTask = state.tasks.some(
    (task) => task.status === 'running' || task.status === 'awaiting',
  );

  useEffect(() => {
    if (!hasActiveTask) return;
    const timer = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [hasActiveTask]);

  if (state.tasks.length === 0) {
    return <div className="panel muted">（暂无后台任务 / Subagent / 临时回复分支）</div>;
  }
  const tasks = [...state.tasks].reverse();
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>任务与分支</h2>
      </div>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} sendCommand={sendCommand} />
      ))}
    </div>
  );
}

function formatMs(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m${s}s` : `${s}s`;
}

function TaskCard({
  task,
  sendCommand,
}: {
  task: OrchActivity;
  sendCommand: (command: import('../protocol').BackendCommand) => void;
}) {
  const elapsed = formatMs(Date.now() - task.createdAtMs);
  const active = task.status === 'running' || task.status === 'awaiting';
  return (
    <div className={`task-card ${active ? 'active' : ''}`}>
      <div className="task-head">
        <span className="task-kind">{KIND_LABEL[task.kind] ?? task.kind}</span>
        <span className={`task-status ${task.status}`}>{STATUS_LABEL[task.status] ?? task.status}</span>
        <span className="task-elapsed">{elapsed}</span>
        {active && task.sessionId && (
          <button
            className="task-cancel"
            onClick={() =>
              sendCommand({ CancelRequestedWork: { session_id: task.sessionId, all: false } })
            }
          >
            取消
          </button>
        )}
      </div>
      <div className="task-objective">{task.objective}</div>
      <div className="task-branches">
        {task.branches.map((branch) => (
          <div key={branch.branchId} className="task-branch">
            <span className="task-branch-id">{branch.branchId}</span>
            <span className="task-branch-task">{branch.task || '—'}</span>
            <span className="task-branch-target muted">{branch.target}</span>
            <span className={`task-status ${branch.status}`}>
              {BRANCH_LABEL[branch.status] ?? branch.status}
            </span>
            {branch.result && <pre className="task-branch-result">{branch.result}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}
