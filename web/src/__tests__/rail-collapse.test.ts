//! 侧栏收起状态的契约（`rail-collapse.ts`）。
//!
//! ## 这条功能最容易坏的地方
//!
//! 收起是**单向不可逆**的风险动作：列整块不渲染（`v-if`），列内的展开按钮
//! 跟着消失。所以本文件钉住三条：
//!
//! 1. **持久化**：收起是工作区偏好，刷新后必须保持（否则每次刷新都要重点）；
//! 2. **坏数据一律当展开**：把非法值读成"收起"，用户会看到面板莫名少一列
//!    且找不到入口——不对称的容错方向是有意的；
//! 3. **落位即展开**：把卡片拖进/移进收起的列时，目标列必须自动展开
//!    （否则卡片"拖进去就消失"，用户会以为丢数据）。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEY,
  defaultCollapse,
  isRailCollapsed,
  normalizeCollapse,
  railCollapsed,
  resetRailCollapseForTests,
  setRailCollapsed,
  toggleRailCollapsed,
} from '../rail-collapse';
import { placeCard, placeCardAfter, railLayout, __normalizeForTest } from '../rail-layout';

beforeEach(() => {
  resetRailCollapseForTests();
  localStorage.clear();
  // 布局复位：确保落位测试从一个确定的列表出发。
  railLayout.left = [];
  railLayout.right = ['status', 'session', 'shell', 'branches'];
});

describe('默认与归一化', () => {
  it('默认两列都展开（与功能出现之前的行为一致，零迁移）', () => {
    expect(defaultCollapse()).toEqual({ left: false, right: false });
    expect(railCollapsed).toEqual({ left: false, right: false });
  });

  it('合法文档按原样读回', () => {
    expect(normalizeCollapse('{"left":true,"right":false}')).toEqual({
      left: true,
      right: false,
    });
  });

  it('坏 JSON / null / 非对象 → 全部展开', () => {
    expect(normalizeCollapse(null)).toEqual({ left: false, right: false });
    expect(normalizeCollapse('{oops')).toEqual({ left: false, right: false });
    expect(normalizeCollapse('"字符串"')).toEqual({ left: false, right: false });
    expect(normalizeCollapse('[]')).toEqual({ left: false, right: false });
  });

  it('非布尔值一律当展开（宁可见到，不可藏起）', () => {
    // 手改 localStorage 写进 1 / "true" / null 的常见形态。
    expect(normalizeCollapse('{"left":1,"right":"true"}')).toEqual({
      left: false,
      right: false,
    });
    expect(normalizeCollapse('{"left":null,"right":{}}')).toEqual({
      left: false,
      right: false,
    });
  });

  it('未知键忽略（向前兼容将来的宽度等字段）', () => {
    expect(normalizeCollapse('{"left":true,"width":200}')).toEqual({
      left: true,
      right: false,
    });
  });
});

describe('切换与持久化', () => {
  it('toggle 返回切换后的状态并写盘', () => {
    expect(toggleRailCollapsed('left')).toBe(true);
    expect(isRailCollapsed('left')).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      left: true,
      right: false,
    });

    expect(toggleRailCollapsed('left')).toBe(false);
    expect(isRailCollapsed('left')).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      left: false,
      right: false,
    });
  });

  it('两列互不影响', () => {
    toggleRailCollapsed('left');
    expect(isRailCollapsed('left')).toBe(true);
    expect(isRailCollapsed('right')).toBe(false);
    toggleRailCollapsed('right');
    expect(isRailCollapsed('left')).toBe(true);
    expect(isRailCollapsed('right')).toBe(true);
  });
  it('set 是幂等的（值未变时不重复写盘）', () => {
    // 直接 spy 实例上的方法：happy-dom 的 localStorage 未必是 `Storage` 的
    // 原型链实例，spy 原型拦不到（实测 0 次调用）。
    const spy = vi.spyOn(localStorage, 'setItem');
    setRailCollapsed('left', false); // 已经是 false
    expect(spy).not.toHaveBeenCalled();
    setRailCollapsed('left', true);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('写盘失败（隐私模式/配额满）不影响内存状态', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => toggleRailCollapsed('left')).not.toThrow();
    expect(isRailCollapsed('left')).toBe(true);
    spy.mockRestore();
  });
});

describe('落位即展开（拖进/移进收起的列）', () => {
  it('placeCardAfter 落进收起的左列 → 左列自动展开', () => {
    setRailCollapsed('left', true);
    placeCardAfter('session', 'left', null);
    expect(isRailCollapsed('left')).toBe(false);
    expect(railLayout.left).toContain('session');
  });

  it('placeCard 落进收起的右列 → 右列自动展开', () => {
    setRailCollapsed('right', true);
    placeCard('branches', 'right', 0);
    expect(isRailCollapsed('right')).toBe(false);
    expect(railLayout.right).toContain('branches');
  });

  it('落进**另一**列时不影响源列的收起状态', () => {
    setRailCollapsed('left', true);
    setRailCollapsed('right', true);
    // 卡从右列移到左列：左展开（目标），右保持收起。
    placeCardAfter('status', 'left', null);
    expect(isRailCollapsed('left')).toBe(false);
    expect(isRailCollapsed('right')).toBe(true);
  });

  it('同列重排也会展开（幂等，不是副作用）', () => {
    placeCardAfter('shell', 'right', null);
    expect(isRailCollapsed('right')).toBe(false);
  });
});

describe('与布局持久化互不干扰', () => {
  it('两份文档各用各的键', () => {
    toggleRailCollapsed('left');
    placeCardAfter('session', 'left', null);
    // 布局键与折叠键都写了，且内容互不包含。
    const layout = JSON.parse(localStorage.getItem('echo-panel-rail-layout') ?? 'null') as {
      left: string[];
    } | null;
    const collapse = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(collapse).toEqual({ left: false, right: false });
    if (layout) expect(Array.isArray(layout.left)).toBe(true);
    // 归一化函数对彼此的数据无感（传错文档也不会崩）。
    expect(__normalizeForTest(JSON.stringify(collapse))).toHaveProperty('left');
  });
});
