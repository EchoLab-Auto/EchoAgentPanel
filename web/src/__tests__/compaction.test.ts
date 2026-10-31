//! 压缩/归档进度展示口径（`compaction.ts`）。
//!
//! 这套判定同时供两处使用：上下文面板里的进度块，与顶栏的全局指示器。
//! 两处各写一份会让过期阈值悄悄漂移成"顶栏说在跑、面板说已失败"——所以
//! 这里把阈值与三种"不展示"的情形逐条钉死。

import { describe, it, expect } from 'vitest';
import {
  COMPACTION_RESULT_VISIBLE_MS,
  COMPACTION_STALE_MS,
  activeCompactions,
  compactionCountText,
  compactionPhaseLabel,
  parseCompactionKey,
  visibleCompaction,
} from '../compaction';
import type { CompactionRun } from '../state';
import type { AppState } from '../state';

function run(over: Partial<CompactionRun> = {}): CompactionRun {
  return {
    phase: 'summarize',
    done: 3,
    total: 7,
    sessions: 7,
    message: '正在生成摘要…',
    at: 1_000,
    ...over,
  };
}

describe('visibleCompaction · 进行中', () => {
  it('正常进行中：running 为真，百分比按 done/total 取整', () => {
    const view = visibleCompaction(run(), 1_500)!;
    expect(view.running).toBe(true);
    expect(view.pct).toBe(43); // 3/7 = 42.857 → 43
  });

  it('长度不确定的阶段（total === 0）：pct 为 0，交给调用方画不确定条', () => {
    const view = visibleCompaction(run({ phase: 'preview', total: 0, done: 0 }), 1_500)!;
    expect(view.running).toBe(true);
    expect(view.pct).toBe(0);
  });

  it('done 超过 total 时百分比封顶 100（Core 改口径也不画出 137%）', () => {
    expect(visibleCompaction(run({ done: 9, total: 7 }), 1_500)!.pct).toBe(100);
  });
});

describe('visibleCompaction · 终态', () => {
  it('刚结束：显示结果，但不再 running（按钮要恢复可点）', () => {
    const view = visibleCompaction(run({ phase: 'done' }), 1_000 + 3_000)!;
    expect(view.running).toBe(false);
    expect(view.run.phase).toBe('done');
  });

  it('终态超过保留时长：不展示（否则"已压缩"永远挂在面板上）', () => {
    const at = 1_000 + COMPACTION_RESULT_VISIBLE_MS + 1;
    expect(visibleCompaction(run({ phase: 'done' }), at)).toBeNull();
  });

  it('保留时长边界内仍然展示（<= 而非 <）', () => {
    const at = 1_000 + COMPACTION_RESULT_VISIBLE_MS;
    expect(visibleCompaction(run({ phase: 'done' }), at)).not.toBeNull();
  });
});

describe('visibleCompaction · 超时兜底', () => {
  it('进行中但停更超时 → 转成 failed，而不是静默消失', () => {
    // 静默消失会让用户以为"压缩成功但没提示"；明确报一句更接近事实。
    const view = visibleCompaction(run(), 1_000 + COMPACTION_STALE_MS + 1)!;
    expect(view).not.toBeNull();
    expect(view.running).toBe(false);
    expect(view.run.phase).toBe('failed');
    expect(view.run.message).toContain('停止更新');
  });

  it('超时阈值内仍在跑（单组 LLM 摘要最长约 2–3 分钟，5 分钟留足余量）', () => {
    const view = visibleCompaction(run(), 1_000 + COMPACTION_STALE_MS)!;
    expect(view!.running).toBe(true);
    expect(view!.run.phase).toBe('summarize');
  });

  it('已经没有记录：返回 null（调用方不渲染任何东西）', () => {
    expect(visibleCompaction(null, 1_000)).toBeNull();
    expect(visibleCompaction(undefined, 1_000)).toBeNull();
  });
});

describe('parseCompactionKey', () => {
  it('多上游键：拆成 (core, team)', () => {
    expect(parseCompactionKey('core-a\u0000alix')).toEqual({ core: 'core-a', teamId: 'alix' });
  });

  it('单上游 / 未标注 core：退化成裸 team id', () => {
    expect(parseCompactionKey('alix')).toEqual({ core: null, teamId: 'alix' });
  });

  it('team 为空（无人格归属的旧 Core）：拆出空 teamId 而不是 null', () => {
    expect(parseCompactionKey('core-a\u0000')).toEqual({ core: 'core-a', teamId: '' });
  });
});

describe('activeCompactions · 顶栏聚合口径', () => {
  function stateWith(compactions: Record<string, CompactionRun>): AppState {
    return { compactions } as AppState;
  }

  it('只挑进行中的：终态不进顶栏（那是面板的职责，顶栏常驻"已完成"是噪音）', () => {
    const now = 5_000;
    const state = stateWith({
      'core-a\u0000alix': run({ at: 4_000 }),
      'core-b\u0000alix': run({ at: 4_000, phase: 'done' }),
      'core-a\u0000echo': run({ at: 4_000, phase: 'failed' }),
    });
    const active = activeCompactions(state, now);
    expect(active).toHaveLength(1);
    expect(active[0].core).toBe('core-a');
    expect(active[0].teamId).toBe('alix');
  });

  it('多个并行时按开始时间升序（顺序稳定，不随对象键序抖动）', () => {
    const now = 9_000;
    const state = stateWith({
      'core-a\u0000later': run({ at: 8_000 }),
      'core-a\u0000earlier': run({ at: 5_000 }),
    });
    expect(activeCompactions(state, now).map((a) => a.teamId)).toEqual(['earlier', 'later']);
  });

  it('停更超时的条目不进顶栏（顶栏只该显示"真的在动"的）', () => {
    const state = stateWith({ 'core-a\u0000alix': run({ at: 0 }) });
    expect(activeCompactions(state, COMPACTION_STALE_MS + 1)).toHaveLength(0);
  });
});

describe('文案', () => {
  it('阶段名：已知阶段给人话，未知阶段原样回显（不吞掉新 Core 的新阶段）', () => {
    expect(compactionPhaseLabel('summarize')).toBe('生成摘要');
    expect(compactionPhaseLabel('brand-new-phase')).toBe('brand-new-phase');
  });

  it('计数：有分子分母写 done/total，长度不确定时写会话数，都没有则空', () => {
    expect(compactionCountText(run({ done: 3, total: 7 }))).toBe('3/7 组');
    expect(compactionCountText(run({ done: 0, total: 0, sessions: 4 }))).toBe('共 4 组');
    expect(compactionCountText(run({ done: 0, total: 0, sessions: 0 }))).toBe('');
  });
});

describe('CompactionProgress 的窗口隔离', () => {
  it('按 session_id 存储，A 窗口的进度不会覆盖 B 窗口', async () => {
    const { initialState, reduce } = await import('../state');
    const { sessionKey } = await import('../keys');
    const state = initialState();
    reduce(state, {
      CompactionProgress: {
        team_id: 'alix',
        session_id: 'win-a',
        phase: 'summarize',
        done: 0,
        total: 1,
        sessions: 1,
        message: '压缩 A',
      },
    });
    reduce(state, {
      CompactionProgress: {
        team_id: 'alix',
        session_id: 'win-b',
        phase: 'done',
        done: 1,
        total: 1,
        sessions: 1,
        message: '完成 B',
      },
    });
    expect(state.compactions[sessionKey(null, 'win-a')]?.message).toBe('压缩 A');
    expect(state.compactions[sessionKey(null, 'win-b')]?.message).toBe('完成 B');
  });
});

describe('顶栏指示器的会话隔离', () => {
  it('别的会话在压缩：本窗口顶栏不亮灯', () => {
    const state = {
      compactions: { 'core-a\u0000win-b': run({ at: 4_000, sessionId: 'win-b', teamId: 'alix' }) },
      windowSessionId: 'win-a',
    } as unknown as AppState;
    expect(activeCompactions(state, 5_000)).toHaveLength(0);
  });

  it('本窗口会话在压缩：亮灯且带人格名（不是会话 id）', () => {
    const state = {
      compactions: { 'core-a\u0000win-a': run({ at: 4_000, sessionId: 'win-a', teamId: 'alix' }) },
      windowSessionId: 'win-a',
    } as unknown as AppState;
    const active = activeCompactions(state, 5_000);
    expect(active).toHaveLength(1);
    expect(active[0].teamId).toBe('alix');
  });

  it('无人格归属的旧记录（无 sessionId）：照常显示，不因过滤而消失', () => {
    const state = {
      compactions: { 'core-a\u0000alix': run({ at: 4_000 }) },
      windowSessionId: 'win-a',
    } as unknown as AppState;
    expect(activeCompactions(state, 5_000)).toHaveLength(1);
  });
});
