import { useState } from 'react';
import type { AppState } from '../state';

/**
 * 悬浮清单：固定在左侧边栏底部，不随会话列表滚动。
 * 顶部显示清单名称与进度概览，点击展开查看条目明细。
 */
export function ChecklistSidebar({ state }: { state: AppState }) {
  const [open, setOpen] = useState(false);
  const lists = state.checklists;

  return (
    <div className={`checklist-float ${open ? 'open' : ''}`}>
      <div className="checklist-float-head" onClick={() => setOpen(!open)}>
        <span className="checklist-float-title">清单</span>
        {lists.length > 0 && <span className="checklist-float-count">{lists.length}</span>}
        <span className="checklist-float-caret">{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="checklist-float-body">
          {lists.length === 0 && <div className="muted checklist-float-empty">（暂无清单）</div>}
          {lists.map((list) => (
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
      )}
    </div>
  );
}
