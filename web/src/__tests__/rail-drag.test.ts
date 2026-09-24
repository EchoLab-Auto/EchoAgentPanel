//! 边栏卡片拖动状态机契约测试（jsdom + 手工矩形桩）。
//!
//! jsdom 不做布局（`getBoundingClientRect()` 全 0），所以测试里给列容器与
//! 卡片元素装上可编程的矩形桩——这正是命中测试与落点计算的全部输入。
//!
//! 覆盖：
//! - 阈值：小位移 = 点击（不进入拖动）；超阈值 = 拖动
//! - 落点：命中列、插入序号、锚点卡片（可见列表 ≠ 存储列表的关键映射）
//! - 落位：布局变更 + 拖影飞行终点 = 落点指示线位置 + arriving 标记
//! - 落空：布局不变，拖影回位
//! - 取消（Esc）：布局不变

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  DRAG_THRESHOLD_PX,
  GHOST_FLIGHT_MS,
  __registeredSides,
  __resetRailsForTest,
  armCardDrag,
  cancelCardDrag,
  draggingCardId,
  finishCardDrag,
  railDrag,
  registerRail,
  resetDragState,
  updateCardDrag,
} from '../rail-drag';
import { placeCardAfter, railLayout, resetRailLayout } from '../rail-layout';

/** 给元素装一个固定的矩形（jsdom 无布局）。 */
function stubRect(el: Element, rect: { x: number; y: number; w: number; h: number }): void {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      x: rect.x,
      y: rect.y,
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.w,
      bottom: rect.y + rect.h,
      width: rect.w,
      height: rect.h,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** 造一列：容器 + 卡片（每张卡 40px 高、间隔 12px）。 */
function makeRail(
  cardIds: string[],
  origin: { x: number; y: number },
): { rail: HTMLElement; cards: Record<string, HTMLElement> } {
  const rail = document.createElement('div');
  rail.className = 'rail-stack';
  stubRect(rail, { x: origin.x, y: origin.y, w: 300, h: 800 });
  const cards: Record<string, HTMLElement> = {};
  let y = origin.y + 12;
  for (const id of cardIds) {
    const slot = document.createElement('div');
    slot.className = 'rail-stack__slot';
    slot.dataset.cardId = id;
    const card = document.createElement('div');
    card.className = 'rail-stack__card';
    slot.appendChild(card);
    stubRect(slot, { x: origin.x + 12, y, w: 276, h: 40 });
    rail.appendChild(slot);
    cards[id] = slot;
    y += 40 + 12;
  }
  document.body.appendChild(rail);
  return { rail, cards };
}

const LEFT_ORIGIN = { x: 0, y: 64 };
const RIGHT_ORIGIN = { x: 1276, y: 64 };

function armShellFromRight(pointer = { x: 1400, y: 300 }): void {
  armCardDrag(
    {
      cardId: 'shell',
      title: 'Shell',
      fromSide: 'right',
      width: 276,
    },
    pointer,
    { x: 1288, y: 300, width: 276, height: 40 },
  );
}

describe('rail-drag 状态机', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRailLayout();
    __resetRailsForTest();
    resetDragState(); // 清空上一用例的全部残留（含 arrivingId / flight）
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    __resetRailsForTest();
  });

  it('阈值：位移小于阈值不算拖动（点击折叠）；超过阈值进入拖动', () => {
    armShellFromRight();
    expect(railDrag.armed).toBe(true);
    updateCardDrag({ x: 1400 + DRAG_THRESHOLD_PX - 1, y: 300 });
    expect(railDrag.active).toBe(false);

    updateCardDrag({ x: 1400 + DRAG_THRESHOLD_PX + 4, y: 300 });
    expect(railDrag.active).toBe(true);
    expect(draggingCardId.value).toBe('shell');
  });

  it('落点：命中列 + 插入序号 + 锚点卡片（序号按可见卡片算）', async () => {
    makeRail(['status', 'shell'], RIGHT_ORIGIN);
    makeRail(['files'], LEFT_ORIGIN);
    const unregisterRight = registerRail('right', document.querySelectorAll('.rail-stack')[0] as HTMLElement);
    const unregisterLeft = registerRail('left', document.querySelectorAll('.rail-stack')[1] as HTMLElement);
    expect(__registeredSides().sort()).toEqual(['left', 'right']);

    armShellFromRight();
    updateCardDrag({ x: 1390, y: 310 });
    // 指针落在右列第一张卡（status）上半部 → 插到 status 之前（锚点 null）
    updateCardDrag({ x: 1380, y: LEFT_ORIGIN.y + 12 + 10 });
    expect(railDrag.dropSide).toBe('right');
    expect(railDrag.dropIndex).toBe(0);
    expect(railDrag.dropAfter).toBeNull();

    // 指针落到左列（files 卡下半部之后 = 列尾）→ 锚点 = files
    updateCardDrag({ x: LEFT_ORIGIN.x + 100, y: LEFT_ORIGIN.y + 12 + 40 + 6 });
    expect(railDrag.dropSide).toBe('left');
    expect(railDrag.dropIndex).toBe(1);
    expect(railDrag.dropAfter).toBe('files');

    unregisterRight();
    unregisterLeft();
  });

  it('落位：布局变更 + 飞行终点 = 落点位置 + arriving 标记 + 收尾复位', async () => {
    const { rail: rightRail } = makeRail(['status', 'shell'], RIGHT_ORIGIN);
    const { rail: leftRail } = makeRail(['files'], LEFT_ORIGIN);
    registerRail('right', rightRail);
    registerRail('left', leftRail);

    armShellFromRight();
    updateCardDrag({ x: 1390, y: 310 });
    // 指到 files 卡的上半部 → 插到它之前 = 列首
    updateCardDrag({ x: 100, y: LEFT_ORIGIN.y + 12 + 5 });
    expect(railDrag.dropIndex).toBe(0);
    expect(railDrag.dropAfter).toBeNull();
    expect(finishCardDrag()).toBe(true);

    expect(railLayout.left[0]).toBe('shell');
    expect(railLayout.right).not.toContain('shell');
    expect(railDrag.arrivingId).toBe('shell');
    expect(railDrag.landing).toBe(true);
    // 飞行终点 = 落点指示线位置（列内容区左上角，即 files 卡原来的位置）
    expect(railDrag.flight).toMatchObject({ x: LEFT_ORIGIN.x + 12, y: LEFT_ORIGIN.y + 12 });

    // 飞行 + 淡出结束后完全复位
    vi.advanceTimersByTime(GHOST_FLIGHT_MS + 200);
    expect(railDrag.landing).toBe(false);
    expect(railDrag.fading).toBe(false);
    expect(railDrag.snapshot).toBeNull();
    expect(railDrag.arrivingId).toBeNull();
  });

  it('落空（列外释放）：布局不变，拖影回位到起点', () => {
    const { rail: rightRail } = makeRail(['status', 'shell'], RIGHT_ORIGIN);
    registerRail('right', rightRail);

    armShellFromRight();
    updateCardDrag({ x: 1390, y: 310 });
    updateCardDrag({ x: 800, y: 500 }); // 会话区（不在任何列内）
    expect(railDrag.dropSide).toBeNull();

    expect(finishCardDrag()).toBe(false);
    expect(railLayout.right).toContain('shell');
    expect(railDrag.flight).toMatchObject({ x: 1288, y: 300 }); // 回原位
    expect(railDrag.arrivingId).toBeNull();
  });

  it('未过阈值就松手：不落位（点击语义），状态复位', () => {
    armShellFromRight();
    updateCardDrag({ x: 1402, y: 302 });
    expect(finishCardDrag()).toBe(false);
    expect(railDrag.active).toBe(false);
    expect(railDrag.snapshot).toBeNull();
    expect(railLayout.right).toContain('shell');
  });

  it('取消（Esc）：布局不变，拖影回位', () => {
    const { rail: rightRail } = makeRail(['status', 'shell'], RIGHT_ORIGIN);
    const { rail: leftRail } = makeRail([], LEFT_ORIGIN);
    registerRail('right', rightRail);
    registerRail('left', leftRail);

    armShellFromRight();
    updateCardDrag({ x: 1390, y: 310 });
    updateCardDrag({ x: 100, y: 200 }); // 悬停空左列（本来会落位）
    expect(railDrag.dropSide).toBe('left');
    cancelCardDrag();

    expect(railDrag.landing).toBe(true);
    expect(railLayout.left).toEqual([]);
    expect(railLayout.right).toContain('shell');
    vi.advanceTimersByTime(GHOST_FLIGHT_MS + 200);
    expect(railDrag.snapshot).toBeNull();
  });

  it('同列重排：锚点按可见卡片，落位不影响不可见卡片的相对顺序', async () => {
    // 存储列表含不可见的 branches；可见列只有 status / shell
    resetRailLayout();
    placeCardAfter('shell', 'right', 'branches'); // right = [status, files, branches, shell]
    const { rail: rightRail } = makeRail(['status', 'shell'], RIGHT_ORIGIN);
    registerRail('right', rightRail);

    armShellFromRight();
    updateCardDrag({ x: 1390, y: 310 });
    // 拖到 status 之前 → 锚点 null（列首）
    updateCardDrag({ x: 1380, y: RIGHT_ORIGIN.y + 12 + 5 });
    expect(railDrag.dropAfter).toBeNull();
    expect(finishCardDrag()).toBe(true);
    await nextTick();

    // 可见顺序：shell 在 status 之前；不可见卡仍在列表里
    expect(railLayout.right[0]).toBe('shell');
    expect(railLayout.right).toContain('files');
    expect(railLayout.right).toContain('branches');
  });
});
