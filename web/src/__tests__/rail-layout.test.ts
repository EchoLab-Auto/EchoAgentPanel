//! 边栏布局（左右两列归属与顺序）契约测试。
//!
//! 关键不变量：
//! - 默认全部卡片在右侧（与双侧边栏之前的行为一致，零迁移）；
//! - 落位按「锚点卡片 id」而非可见序号（列表含门控不可见的卡片）；
//! - 换列保留卡片在 `echo-panel-rail-cards` 里的折叠/比例状态（按 id 存）；
//! - 持久化到 `echo-panel-rail-layout`，且对未知/重复 id 做归一化。

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RAIL_CARD_ORDER,
  __normalizeForTest,
  cardsFor,
  indexOf,
  moveToOtherSide,
  placeCard,
  placeCardAfter,
  railLayout,
  resetRailLayout,
  sideOf,
} from '../rail-layout';

describe('rail-layout 默认与归一化', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRailLayout();
  });

  it('默认布局：全部卡片在右侧、按规范顺序', () => {
    expect(railLayout.left).toEqual([]);
    expect(railLayout.right).toEqual([...RAIL_CARD_ORDER]);
    expect(sideOf('shell')).toBe('right');
    expect(indexOf('status', 'right')).toBe(0);
  });

  it('归一化：过滤未知 id、去重（左优先）、补齐新卡片', () => {
    const normalized = __normalizeForTest(
      JSON.stringify({ left: ['shell', 'shell', 'bogus'], right: ['status', 'shell'] }),
    );
    // 'bogus' 被丢弃；'shell' 只保留左列第一次出现
    expect(normalized.left).toEqual(['shell']);
    // 右侧原样保留 status（shell 已去重），并把未登记的 files/git/branches 按规范顺序补进去
    expect(normalized.right).toContain('status');
    expect(normalized.right).not.toContain('shell');
    expect(new Set(normalized.right)).toEqual(new Set(['status', 'files', 'git', 'branches']));
    // 补齐后的顺序仍按规范顺序（files 在 branches 之前）
    expect(normalized.right.indexOf('files')).toBeLessThan(normalized.right.indexOf('branches'));
  });

  it('归一化：损坏的存储退默认布局（不抛错）', () => {
    expect(__normalizeForTest('{ not json').right).toEqual([...RAIL_CARD_ORDER]);
    expect(__normalizeForTest(null).right).toEqual([...RAIL_CARD_ORDER]);
  });
});

describe('rail-layout 落位语义', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRailLayout();
  });

  it('placeCardAfter：插到锚点之后；null = 列首；锚点不存在 = 列尾', () => {
    resetRailLayout(); // right = [status, files, git, shell, branches]
    placeCardAfter('branches', 'right', null);
    expect(railLayout.right[0]).toBe('branches');

    placeCardAfter('branches', 'right', 'files');
    // 摘出 branches 后插到 files 之后：[status, files, branches, git, shell]
    expect(railLayout.right).toEqual(['status', 'files', 'branches', 'git', 'shell']);

    placeCardAfter('branches', 'right', 'does-not-exist');
    expect(railLayout.right[railLayout.right.length - 1]).toBe('branches');
  });

  it('跨列：从右列摘除后插入左列（不重复登记）', () => {
    placeCardAfter('shell', 'left', null);
    expect(railLayout.left).toEqual(['shell']);
    expect(railLayout.right).not.toContain('shell');
  });

  it('落位结果持久化到 localStorage', () => {
    placeCardAfter('shell', 'left', null);
    const saved = JSON.parse(localStorage.getItem('echo-panel-rail-layout') ?? '{}');
    expect(saved.left).toEqual(['shell']);
    expect(saved.right).not.toContain('shell');
  });

  it('moveToOtherSide：追到另一列末尾并可往返', () => {
    expect(moveToOtherSide('shell')).toBe('left');
    expect(railLayout.left).toEqual(['shell']);
    expect(moveToOtherSide('shell')).toBe('right');
    expect(railLayout.right[railLayout.right.length - 1]).toBe('shell');
  });

  it('placeCard（按序号）：仅用于可见列表与存储列表一致时', () => {
    resetRailLayout();
    placeCard('branches', 'right', 0);
    expect(railLayout.right).toEqual(['branches', 'status', 'files', 'git', 'shell']);
  });

  it('cardsFor：按列内顺序 × 可见性过滤（不可见卡片不占位）', () => {
    expect(cardsFor('right', (id) => id !== 'files')).toEqual(['status', 'git', 'shell', 'branches']);
    placeCardAfter('shell', 'left', null);
    expect(cardsFor('left', () => true)).toEqual(['shell']);
  });

  it('resetRailLayout：全部回右侧且按规范顺序', () => {
    placeCardAfter('shell', 'left', null);
    placeCardAfter('status', 'left', null);
    resetRailLayout();
    expect(railLayout.left).toEqual([]);
    expect(railLayout.right).toEqual([...RAIL_CARD_ORDER]);
  });
});
