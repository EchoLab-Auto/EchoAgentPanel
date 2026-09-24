//! 边栏卡片拖动（左右两列之间 / 列内排序）：拖拽状态机与落点计算。
//!
//! 机制（2026-09-24）：
//! - **指针事件**（pointerdown/move/up + setPointerCapture）统一鼠标/触控/笔；
//! - **拖动阈值**：移动超过 6px 才进入拖动（此前只是点击 → 交给卡头折叠）；
//! - **拖影（ghost）**：从卡片原位置起算，用 `transform: translate()` 跟随指针
//!   （GPU 合成，不触发布局）；落位/取消时改用 CSS 过渡把拖影飞向目标矩形，
//!   飞完再显示真卡片 —— 视觉上「卡片真的被搬过去了」；
//! - **落点指示**：拖动中两列都成为投放区（悬停高亮），并在目标列按指针 Y
//!   与各卡中线的比较算出插入序号，渲染 2px 指示线；空列显示虚线投放框；
//! - **起飞/落位动画**：源卡片拖动期间从布局中摘除（其余卡片以 FLIP 位移补齐），
//!   落位后目标列卡片以 FLIP move 过渡就位；取消时拖影飞回原位。
//!
//! 状态是模块级单例：两列（左右 rail）与拖影共享同一份。

import { computed, reactive } from 'vue';
import { placeCardAfter, type RailSide } from './rail-layout';

/** 进入拖动所需的最小位移（px）。 */
export const DRAG_THRESHOLD_PX = 6;

/** 落位/回位飞行时长（ms）——与 CSS 过渡时长保持一致。 */
export const GHOST_FLIGHT_MS = 190;

/** 飞行结束后拖影淡出时长（ms）：与真卡片的淡入交叉，避免交接闪烁。 */
export const GHOST_FADE_MS = 130;

interface RailRegistration {
  side: RailSide;
  el: HTMLElement;
}

/** 拖动快照：足够渲染拖影与落点指示，不含任何 DOM 引用（除注册的列容器）。 */
interface DragSnapshot {
  cardId: string;
  title: string;
  count?: number;
  countTitle?: string;
  fromSide: RailSide;
  width: number;
}

const rails = new Map<RailSide, RailRegistration>();

export const railDrag = reactive({
  /** 指针已按下（未过阈值）：两列提前挂载/注册，供命中测试使用。 */
  armed: false,
  /** 已过阈值，正在拖动。 */
  active: false,
  /** 拖影已开始飞向目标（落位/回位），此时不再响应指针移动。 */
  landing: false,
  /** 飞行已结束、拖影正在淡出（真卡片同时淡入）。 */
  fading: false,
  snapshot: null as DragSnapshot | null,
  /** 指针位置（视口坐标）。 */
  pointer: { x: 0, y: 0 },
  /** 拖影当前矩形（fixed 定位基准：卡片原位置）。 */
  ghost: { x: 0, y: 0, width: 0, height: 44 },
  /** 相对原位置的位移（translate）与微倾角。 */
  offset: { x: 0, y: 0, rotate: 0 },
  /** 命中列 / 插入序号（序号只用于**画指示线**；null = 不在任何列上）。 */
  dropSide: null as RailSide | null,
  dropIndex: null as number | null,
  /**
   * 落位锚点：插到这张卡片**之后**（id，null = 列首）。
   * 见 rail-layout::placeCardAfter 的说明（可见列表 ≠ 存储列表）。
   */
  dropAfter: null as string | null,
  /** 正在飞行（落位/回位）的目标矩形。 */
  flight: null as { x: number; y: number; width: number; height: number } | null,
  /** 刚落位、等待拖影飞完再显示的卡片 id（飞行期间真卡片隐藏）。 */
  arrivingId: null as string | null,
});

/** 是否处于「拖动进行中」（含起飞与飞行阶段）——控制投放区显隐。 */
export const railDragEngaged = computed(
  () => railDrag.active || railDrag.landing,
);

/** 正在被拖动的卡片 id（源列据此把卡片从布局中摘除）。 */
export const draggingCardId = computed(() => railDrag.snapshot?.cardId ?? null);

/** 列容器注册（RailStack 挂载时登记；卸载时注销）。 */
export function registerRail(side: RailSide, el: HTMLElement): () => void {
  rails.set(side, { side, el });
  return () => {
    if (rails.get(side)?.el === el) rails.delete(side);
  };
}

function rectOf(el: Element): DOMRect {
  return el.getBoundingClientRect();
}

/** 列内可见卡片元素（排除被拖动的卡片本身）。 */
function cardElements(rail: RailRegistration, excludeId: string | null): HTMLElement[] {
  return Array.from(rail.el.querySelectorAll<HTMLElement>('[data-card-id]')).filter(
    (el) => el.dataset.cardId !== excludeId,
  );
}

/**
 * 按指针 Y 计算插入序号：命中第一个「指针在其垂直中线之上」的卡片则插到它
 * 之前，否则追加到末尾。返回序号以**排除被拖动卡片后**的列表为基准。
 */
function insertionIndex(rail: RailRegistration, pointerY: number, excludeId: string | null): number {
  const cards = cardElements(rail, excludeId);
  for (let index = 0; index < cards.length; index += 1) {
    const rect = rectOf(cards[index]);
    if (pointerY < rect.top + rect.height / 2) return index;
  }
  return cards.length;
}

/** 命中测试：指针落在哪一列（列容器矩形内）。 */
function hitRail(x: number, y: number): RailRegistration | null {
  for (const rail of rails.values()) {
    const rect = rectOf(rail.el);
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return rail;
  }
  return null;
}

let armedFrom: { cardId: string; x: number; y: number } | null = null;

/** 指针按下（卡头）：记录起点，进入「已按下」态（两列挂载后可命中测试）。 */
export function armCardDrag(
  snapshot: DragSnapshot,
  pointer: { x: number; y: number },
  origin: { x: number; y: number; width: number; height: number },
): void {
  armedFrom = { cardId: snapshot.cardId, x: pointer.x, y: pointer.y };
  railDrag.armed = true;
  railDrag.snapshot = snapshot;
  railDrag.ghost = { x: origin.x, y: origin.y, width: origin.width, height: origin.height };
  railDrag.pointer = { ...pointer };
  railDrag.offset = { x: 0, y: 0, rotate: 0 };
  railDrag.dropSide = null;
  railDrag.dropIndex = null;
  railDrag.dropAfter = null;
  railDrag.flight = null;
  railDrag.landing = false;
}

/** 指针移动：过阈值则正式进入拖动；拖动中更新拖影与落点。 */
export function updateCardDrag(pointer: { x: number; y: number }): void {
  if (!railDrag.snapshot || railDrag.landing) return;
  const snapshot = railDrag.snapshot;
  if (!railDrag.active) {
    if (!armedFrom) return;
    const dx = pointer.x - armedFrom.x;
    const dy = pointer.y - armedFrom.y;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    railDrag.active = true;
  }
  const dx = pointer.x - armedFrom!.x;
  const dy = pointer.y - armedFrom!.y;
  railDrag.pointer = { ...pointer };
  // 微倾角跟随水平速度感（位移比例），限制在 ±3°，纯装饰但帮助「拿起来了」的感知。
  const rotate = Math.max(-3, Math.min(3, dx * 0.04));
  railDrag.offset = { x: dx, y: dy, rotate };

  const rail = hitRail(pointer.x, pointer.y);
  if (!rail) {
    railDrag.dropSide = null;
    railDrag.dropIndex = null;
    railDrag.dropAfter = null;
    return;
  }
  railDrag.dropSide = rail.side;
  railDrag.dropIndex = insertionIndex(rail, pointer.y, snapshot.cardId);
  const cards = cardElements(rail, snapshot.cardId);
  // 指示线画在 index 处；锚点是「它前面那张可见卡」——列首则 null。
  railDrag.dropAfter =
    railDrag.dropIndex > 0 ? (cards[railDrag.dropIndex - 1].dataset.cardId ?? null) : null;
}

/** 落点指示线应插在 `sortedCards` 的第 `index` 个位置之前（供模板判断）。 */
export function isDropIndexAt(side: RailSide, index: number): boolean {
  return railDrag.dropSide === side && railDrag.dropIndex === index;
}

/** 与 DOMRect 同形的最小结构（只取落位需要的字段）。 */
interface DOMRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 卡片间距（与 RailStack 的 `gap` 一致）：落点估算用。 */
const RAIL_GAP_PX = 12;

/** 列容器的内容区左上角（rail-stack 内边距 12px）。 */
function railContentOrigin(rail: RailRegistration): { x: number; y: number } {
  const rect = rectOf(rail.el);
  return { x: rect.left + RAIL_GAP_PX, y: rect.top + RAIL_GAP_PX };
}

/**
 * 拖影的飞行终点 = **落点指示线所在的位置**（用变更前的既有卡片几何推算）。
 *
 * 为什么不在提交后用新卡片量 rect：刚落位的卡片正在播加入动画
 * （`translateY(-6px) scale(0.98)`），量到的是动画中间态；而且落位点本来就
 * 应该是用户看到的指示线位置——两相权衡，以「变更前几何 + 插入序号」为准，
 * 与视觉预期严格一致（也免去一帧延迟）。
 */
function dropTargetRect(
  side: RailSide,
  index: number,
  excludeId: string,
  size: { width: number; height: number },
): DOMRectLike | null {
  const rail = rails.get(side);
  if (!rail) return null;
  const cards = cardElements(rail, excludeId);
  const origin = railContentOrigin(rail);
  if (cards.length === 0) {
    return { x: origin.x, y: origin.y, ...size };
  }
  if (index >= cards.length) {
    const last = rectOf(cards[cards.length - 1]);
    return { x: last.left, y: last.bottom + RAIL_GAP_PX, ...size };
  }
  const target = rectOf(cards[index]);
  return { x: target.left, y: target.top, ...size };
}

/** 结束拖动：返回是否落位到某列（false = 落空，播放回位动画）。 */
export function finishCardDrag(): boolean {
  const snapshot = railDrag.snapshot;
  if (!snapshot) return false;
  if (!railDrag.active) {
    // 未过阈值 = 点击（折叠/展开交给点击处理），直接复位。
    resetDragState();
    return false;
  }
  const target = railDrag.dropSide;
  const index = railDrag.dropIndex ?? 0;
  const afterId = railDrag.dropAfter;
  if (target === null) {
    // 落在列外：回位动画（拖影飞回起点）。
    flyBack();
    return false;
  }
  // 飞行终点先用**变更前**的既有几何算好（= 落点指示线的位置），再提交布局。
  railDrag.flight = dropTargetRect(target, index, snapshot.cardId, {
    width: railDrag.ghost.width,
    height: railDrag.ghost.height,
  });
  // 关掉「跟手」阶段：该卡片不再是「被拖动项」，源列的摘除过滤随之失效，
  // 真卡片立刻渲染进目标列（隐藏，见 RailStack 的 arriving 类）。
  railDrag.active = false;
  railDrag.arrivingId = snapshot.cardId;
  placeCardAfter(snapshot.cardId, target, afterId);
  railDrag.landing = true;
  scheduleFlightEnd();
  return true;
}

/** 取消（Esc / 指针取消）：拖影回原位。 */
export function cancelCardDrag(): void {
  if (!railDrag.active || railDrag.landing) {
    resetDragState();
    return;
  }
  flyBack();
}

function flyBack(): void {
  railDrag.flight = {
    x: railDrag.ghost.x,
    y: railDrag.ghost.y,
    width: railDrag.ghost.width,
    height: railDrag.ghost.height,
  };
  railDrag.landing = true;
  scheduleFlightEnd();
}

/**
 * 飞行收尾：先让真卡片显形（清 `arrivingId`，卡片自身 0.18s 淡入），
 * 同时拖影淡出（`fading`）——两者交叉约 130ms，交接处看不出切换。
 */
function scheduleFlightEnd(): void {
  window.setTimeout(() => {
    railDrag.arrivingId = null;
    railDrag.fading = true;
    window.setTimeout(() => resetDragState(), GHOST_FADE_MS);
  }, GHOST_FLIGHT_MS + 30);
}

/** 复位全部拖动状态（飞行结束后调用；也用于异常路径兜底）。 */
export function resetDragState(): void {
  armedFrom = null;
  railDrag.armed = false;
  railDrag.active = false;
  railDrag.landing = false;
  railDrag.fading = false;
  railDrag.dropAfter = null;
  railDrag.snapshot = null;
  railDrag.offset = { x: 0, y: 0, rotate: 0 };
  railDrag.dropSide = null;
  railDrag.dropIndex = null;
  railDrag.flight = null;
  railDrag.arrivingId = null;
}

/** 拖影当前的 transform 目标（拖动中跟手；飞行中飞向目标矩形）。 */
export function ghostTransform(): { tx: number; ty: number; scale: number; rotate: number } {
  if (railDrag.landing && railDrag.flight) {
    return {
      tx: railDrag.flight.x - railDrag.ghost.x,
      ty: railDrag.flight.y - railDrag.ghost.y,
      scale: 1,
      rotate: 0,
    };
  }
  return { tx: railDrag.offset.x, ty: railDrag.offset.y, scale: 1.03, rotate: railDrag.offset.rotate };
}

/** 测试辅助：清空列注册（组件卸载后调用）。 */
export function __resetRailsForTest(): void {
  rails.clear();
}

/** 测试辅助：当前注册的列。 */
export function __registeredSides(): RailSide[] {
  return [...rails.keys()];
}
