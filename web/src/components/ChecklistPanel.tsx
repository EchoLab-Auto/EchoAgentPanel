import type { AppState } from '../state';

export function ChecklistPanel({ state }: { state: AppState }) {
  if (state.checklists.length === 0) {
    return <div className="panel muted">（暂无清单）</div>;
  }
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>清单</h2>
      </div>
      {state.checklists.map((list) => (
        <div key={list.name} className="checklist-card">
          <div className="checklist-head">
            <span className="checklist-name">{list.name}</span>
            <span className="checklist-progress">
              {list.done}/{list.total}
            </span>
          </div>
          <div className="checklist-bar">
            <div
              className="checklist-bar-fill"
              style={{ width: `${list.total ? (list.done / list.total) * 100 : 0}%` }}
            />
          </div>
          {list.items.map((item, index) => (
            <div key={index} className={`checklist-item ${item.done ? 'done' : ''}`}>
              {item.done ? '☑' : '☐'} {item.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
