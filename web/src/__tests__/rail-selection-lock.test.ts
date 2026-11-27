//! 拖动边栏卡片时整页禁选（2026-11-27）。
//!
//! 缺陷：卡头自带 `user-select: none`，但拖动中指针划过主会话区与其他卡片时，
//! 浏览器按指针坐标扩展选区（与 pointer capture 的目标无关），把聊天正文一起
//! 框进去，松手后高亮还留着。修法 = 按下瞬间给 `<html>` 挂 `rail-dragging`，
//! 样式侧 `!important` 全覆盖，收尾移除类。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  RAIL_DRAG_SELECTION_CLASS,
  isRailSelectionLocked,
  lockRailSelection,
  resetRailSelectionLock,
  unlockRailSelection,
} from '../rail-selection-lock';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'styles.css'), 'utf-8');
const railSrc = readFileSync(join(here, '..', 'components', 'RailStack.vue'), 'utf-8');

function hasClass() {
  return document.documentElement.classList.contains(RAIL_DRAG_SELECTION_CLASS);
}

describe('拖动边栏卡片时全局禁选', () => {
  beforeEach(() => resetRailSelectionLock());
  afterEach(() => resetRailSelectionLock());

  it('加锁 / 解锁同步到 <html> 上的类', () => {
    expect(hasClass()).toBe(false);
    lockRailSelection();
    expect(hasClass()).toBe(true);
    unlockRailSelection();
    expect(hasClass()).toBe(false);
  });

  it('引用计数：两列各自加锁时，先解锁的一方不会解开另一方', () => {
    lockRailSelection(); // 左列
    lockRailSelection(); // 右列
    expect(isRailSelectionLocked()).toBe(true);
    unlockRailSelection();
    expect(hasClass()).toBe(true);
    unlockRailSelection();
    expect(hasClass()).toBe(false);
  });

  it('多余的解锁不会把计数压成负数', () => {
    unlockRailSelection();
    unlockRailSelection();
    expect(isRailSelectionLocked()).toBe(false);
    lockRailSelection();
    expect(isRailSelectionLocked()).toBe(true);
  });

  it('样式侧：html.rail-dragging 用 !important 覆盖全部后代的 user-select', () => {
    const rule = css.match(/html\.rail-dragging[\s\S]*?\}/)?.[0] ?? '';
    expect(rule).toContain('html.rail-dragging');
    expect(rule).toContain('html.rail-dragging *');
    expect(rule).toMatch(/user-select:\s*none\s*!important/);
    expect(rule).toContain('-webkit-user-select');
  });

  it('接线：按下卡头即加锁，pointer 收尾解锁，卸载兜底归零', () => {
    const down = railSrc.match(/function onHeadPointerDown\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(down).toContain('ensureSelectionLock()');
    const detach = railSrc.match(/function detachPointerListeners\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(detach).toContain('dropSelectionLock()');
    expect(railSrc).toMatch(/onBeforeUnmount\(\(\) => \{[\s\S]*?resetRailSelectionLock\(\)/);
  });

  it('分隔条拖动同样加锁并在 stop 里释放', () => {
    const divider = railSrc.match(/function onDividerDragStart\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(divider).toContain('ensureSelectionLock()');
    const stop = divider.match(/const stop = \(\) => \{([\s\S]*?)\n  \};/)?.[1] ?? '';
    expect(stop).toContain('dropSelectionLock()');
  });
});
