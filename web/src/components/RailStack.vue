<script setup lang="ts">
//! 边栏卡片栈（左右通用）：卡片上下排列，每张卡可折叠为横条；相邻卡片间的
//! 分隔条可拖动调整上下空间分配（flex-grow 比例，持久化）。
//!
//! 拖动（2026-09-24 双侧边栏）：
//! - 卡头是拖动把手（握把图标（grip 六点）悬停可见）：按下后移动超过阈值进入拖动，
//!   拖影由 `RailDragGhost`（Teleport 到 body）渲染，卡片本身从本列摘除
//!   （其余卡片以 FLIP 过渡补齐）；落点指示线/空列虚线框由拖动状态驱动；
//! - 卡头右侧另有「移到左/右侧」按钮（键盘可达的等价操作，见 a11y 说明）；
//! - 相邻卡高亮/分隔条拖动逻辑不变。
//!
//! **堆叠规则（本组件是唯一实现：左右两列与移动端卡片抽屉共用）**：
//! - 顺序与归属：`rail-layout.ts`（用户拖动/按钮的结果，持久化）；本组件按传入
//!   `cards` 渲染，不自己排序；
//! - 折叠：按卡片 id 存 `openMap`（默认展开）；折叠态 = 只留卡头横条，
//!   卡体按需卸载（`v-if`，不预挂载异步内容）；
//! - 高度：展开的非紧凑卡 `flex: 1 1 0` 并按持久化 flex-grow 比例分配剩余空间，
//!   最小高度 `--rail-card-min-h`；紧凑卡固定高度、不参与比例分配；
//! - 溢出：卡内先滚动（卡体 `overflow-y: auto`）；卡多到列内放不下时整列滚动
//!   （`.rail-stack__list`），底部卡片不会被裁掉、始终可达；
//! - 窄屏：<768px 列不渲染（ChatView 走卡片抽屉），抽屉里 `drag-enabled=false`
//!   ——两列合并为一条纵向列表，不提供跨列拖动（卡头恢复 `pan-y`，
//!   拖动列表不从卡头「死区」开始）。

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
import {
  armCardDrag,
  cancelCardDrag,
  draggingCardId,
  finishCardDrag,
  isDropIndexAt,
  registerRail,
  railDrag,
  resetDragState,
  updateCardDrag,
} from '../rail-drag';
import { moveToOtherSide, type RailSide } from '../rail-layout';
import PanelIcon from './PanelIcon.vue';

export interface RailCardDef {
  /** 稳定 id（折叠态与高度比例持久化键） */
  id: string;
  title: string;
  count?: number;
  countTitle?: string;
  /**
   * 紧凑卡（2026-09-23）：内容为固定高度的状态摘要（如连接状态），
   * 不参与剩余空间的 flex 分配（`flex: 0 0 auto`），也不参与分隔条
   * 拖动比例——否则小卡片会被撑成大块、把下方卡片挤扁。
   */
  compact?: boolean;
}

const props = withDefaults(
  defineProps<{
    cards: RailCardDef[];
    side: RailSide;
    /**
     * 是否允许拖动（换列 / 列内调序）。默认 true。
     * 移动端卡片抽屉把两列合并为一条纵向列表（没有「另一侧」），传 false：
     * 卡头不吞触摸滚动、不渲染握把与「移到另一侧」按钮、禁用分隔条调比例。
     */
    dragEnabled?: boolean;
  }>(),
  // Boolean prop 缺省时 Vue 会铸成 false（resolvePropValue 的布尔铸型）
  // ——「缺省 = 允许拖动」必须显式声明 default，否则不传就变禁用。
  { dragEnabled: true },
);

/** 拖动能力（缺省 = 允许；抽屉显式关闭）。 */
const canDrag = computed(() => props.dragEnabled);

const emit = defineEmits<{
  /** 卡片被移到另一列（按钮路径；拖动路径见 rail-drag 状态机）。 */
  relocate: [id: string, side: RailSide];
}>();

const STORAGE_KEY = 'echo-panel-rail-cards';

interface Persisted {
  open: Record<string, boolean>;
  flex: Record<string, number>;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    // ignore
  }
  return { open: {}, flex: {} };
}

const persisted = load();
const openMap = ref<Record<string, boolean>>(persisted.open);
const flexMap = ref<Record<string, number>>(persisted.flex);

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ open: openMap.value, flex: flexMap.value }),
    );
  } catch {
    // ignore
  }
}

function isOpen(id: string): boolean {
  return openMap.value[id] !== false; // 默认展开
}

/**
 * 渲染用的卡片列表：拖动中把被拖卡片从**本列**摘除（源列即时补齐空间，
 * 目标列的插入由布局状态提交后自然渲染）。
 */
const visibleCards = computed(() =>
  props.cards.filter((card) => !(railDrag.active && draggingCardId.value === card.id)),
);

const listRef = ref<HTMLElement | null>(null);
let unregister: (() => void) | null = null;
onMounted(() => {
  if (listRef.value) unregister = registerRail(props.side, listRef.value);
});
onBeforeUnmount(() => {
  unregister?.();
  unregister = null;
});

/** 分隔条两侧任一为紧凑卡时不可拖动（紧凑卡不参与 flex 比例分配）。 */
function hasCompactNeighbor(index: number): boolean {
  return !!visibleCards.value[index - 1]?.compact || !!visibleCards.value[index]?.compact;
}

/**
 * 分隔条是否可拖动：两侧卡片都展开、都不是紧凑卡，且本列允许拖动。
 * 模板里三处（类/标题/mousedown）共用同一判据——此前是同一条件写三遍。
 */
function dividerDraggable(index: number): boolean {
  return (
    canDrag.value &&
    index > 0 &&
    isOpen(visibleCards.value[index - 1].id) &&
    isOpen(visibleCards.value[index].id) &&
    !hasCompactNeighbor(index)
  );
}

function toggle(id: string) {
  openMap.value = { ...openMap.value, [id]: !isOpen(id) };
  save();
}

/** 卡片的 flex-grow：展开的卡片按持久化比例分配剩余空间（默认 1）。 */
function flexOf(id: string): number {
  return flexMap.value[id] ?? 1;
}

/** 进行中的分隔条拖动清理函数（卸载时兜底，避免监听泄漏）。 */
let stopDividerDrag: (() => void) | null = null;

/**
 * 分隔条拖动：调整上下两张展开卡的 flex-grow 比例。
 * mousemove 合流到每帧一次（改 flex 会触发布局，逐事件改在 500Hz+ 指针下是浪费）。
 */
function onDividerDragStart(event: MouseEvent, aboveId: string, belowId: string) {
  if (!canDrag.value) return;
  event.preventDefault();
  const rail = (event.target as HTMLElement).closest('.rail-stack') as HTMLElement | null;
  if (!rail) return;
  stopDividerDrag?.(); // 理论上不会重入；防御性兜底
  const startY = event.clientY;
  const a0 = flexOf(aboveId);
  const b0 = flexOf(belowId);
  const total = a0 + b0;
  // 估算每 1 flex 对应的像素（按整个栈高 / 全部展开卡 flex 之和）
  const openFlexSum = visibleCards.value
    .filter((c) => isOpen(c.id))
    .reduce((acc, c) => acc + flexOf(c.id), 0);
  const pxPerFlex = rail.getBoundingClientRect().height / Math.max(openFlexSum, 1);

  let lastY = startY;
  let frame: number | null = null;
  const apply = () => {
    const delta = (lastY - startY) / Math.max(pxPerFlex, 1);
    const a = Math.max(0.2, Math.min(total - 0.2, a0 + delta));
    flexMap.value = { ...flexMap.value, [aboveId]: a, [belowId]: total - a };
  };
  const onMove = (e: MouseEvent) => {
    lastY = e.clientY;
    if (frame === null) {
      frame = window.requestAnimationFrame(() => {
        frame = null;
        apply();
      });
    }
  };
  const stop = () => {
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
      frame = null;
      apply(); // 收尾：把最后一帧的位置也落下去
    }
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', stop);
    window.removeEventListener('keydown', onKey);
    if (stopDividerDrag === stop) stopDividerDrag = null;
    save();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') stop();
  };
  stopDividerDrag = stop;
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', stop);
  window.addEventListener('keydown', onKey);
}

// ── 拖动把手（pointer 事件；阈值与落点由 rail-drag 状态机管理）──

/** 指针捕获的卡头（拖动结束/组件卸载时释放）。 */
let captured: { el: HTMLElement; pointerId: number } | null = null;

/** 卡头按下：记录起点并「预置」拖动（未过阈值前不显示拖影）。 */
function onHeadPointerDown(event: PointerEvent, card: RailCardDef) {
  if (!canDrag.value || event.button !== 0) return; // 仅主键；抽屉里禁用拖动
  const target = event.currentTarget as HTMLElement;
  const slot = target.closest('[data-card-id]') as HTMLElement | null;
  if (!slot) return;
  // 量的是**卡片元素**而非槽位：槽位含分隔条（负外边距），首尾卡的槽位
  // 盒子略有差异——统一基准，拖影落位才与真卡片像素对齐。
  const cardEl = slot.querySelector<HTMLElement>('.rail-stack__card');
  const rect = (cardEl ?? slot).getBoundingClientRect();
  armCardDrag(
    {
      cardId: card.id,
      title: card.title,
      count: card.count,
      countTitle: card.countTitle,
      fromSide: props.side,
      width: rect.width,
    },
    { x: event.clientX, y: event.clientY },
    { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
  );
  // 指针捕获：指针移出窗口/压到别的元素上时仍能收到 up——否则拖动会卡死
  // （卡片已被摘出布局、拖影留在半空）。不支持捕获的环境退回 window 监听。
  if (typeof target.setPointerCapture === 'function') {
    try {
      target.setPointerCapture(event.pointerId);
      captured = { el: target, pointerId: event.pointerId };
    } catch {
      captured = null;
    }
  }
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('keydown', onKeyDown);
  // 窗口失焦 = 交互被系统打断（切窗/切标签），按取消处理，避免状态卡在拖动中。
  window.addEventListener('blur', onPointerCancel);
}

/** 待应用的指针位置（合流用；见 onPointerMove）。 */
let pendingPointer: { x: number; y: number } | null = null;
let moveFrame: number | null = null;

/** 应用最后一次指针位置（每帧一次 / pointerup 前强制一次）。 */
function flushPointerMove() {
  if (!pendingPointer) return;
  const pointer = pendingPointer;
  pendingPointer = null;
  updateCardDrag(pointer);
}

/**
 * 指针移动：合流到每帧一次。
 * `updateCardDrag` 每次都会读「命中列 + 列内每张卡」的 `getBoundingClientRect`
 * （强制布局读）；高刷屏 / 高轮询鼠标下 pointermove 可达 500Hz+，逐事件调用会
 * 产生成百上千次布局读——拖影只需每帧对齐一次。
 */
function onPointerMove(event: PointerEvent) {
  pendingPointer = { x: event.clientX, y: event.clientY };
  if (moveFrame !== null) return;
  moveFrame = window.requestAnimationFrame(() => {
    moveFrame = null;
    flushPointerMove();
  });
}

function onPointerUp() {
  flushPointerMove(); // 落点用最新指针位置（最后一次移动可能还没合流完）
  const wasDragging = railDrag.active;
  detachPointerListeners();
  // 点击（未过阈值）交给 @click 处理折叠；拖动结束由状态机落位/回位。
  if (wasDragging) {
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 0);
    finishCardDrag();
  } else {
    // 未过阈值：复位「预置」态（点击事件随后触发折叠）。
    resetDragState();
  }
}

function onPointerCancel() {
  detachPointerListeners();
  cancelCardDrag();
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    detachPointerListeners();
    cancelCardDrag();
  }
}

function detachPointerListeners() {
  if (moveFrame !== null) {
    window.cancelAnimationFrame(moveFrame);
    moveFrame = null;
  }
  pendingPointer = null;
  if (captured) {
    try {
      captured.el.releasePointerCapture(captured.pointerId);
    } catch {
      // 捕获已被浏览器释放：忽略
    }
    captured = null;
  }
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerCancel);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('blur', onPointerCancel);
}

onBeforeUnmount(() => {
  detachPointerListeners();
  stopDividerDrag?.(); // 拖动分隔条时切视图：window 监听必须回收
});

/** 拖动刚结束时抑制紧随其后的 click（否则会误触发折叠）。 */
let suppressClick = false;

function onHeadClick(card: RailCardDef) {
  if (suppressClick) return;
  toggle(card.id);
}

/** 按钮路径：移到另一列（与拖动等价，键盘可达）。 */
function onRelocate(card: RailCardDef) {
  const target: RailSide = props.side === 'left' ? 'right' : 'left';
  moveToOtherSide(card.id);
  emit('relocate', card.id, target);
}

/** 当前列是否为空（拖动中显示虚线投放框）。 */
const isEmpty = computed(() => visibleCards.value.length === 0);
</script>

<template>
  <div ref="listRef" class="rail-stack">
    <TransitionGroup name="rail-slot" tag="div" class="rail-stack__list">
      <div
        v-for="(card, index) in visibleCards"
        :key="card.id"
        class="rail-stack__slot"
        :data-card-id="card.id"
        :class="{
          'rail-stack__slot--compact': card.compact && isOpen(card.id),
          'rail-stack__slot--open': isOpen(card.id) && !card.compact,
          'rail-stack__slot--arriving': railDrag.arrivingId === card.id,
        }"
        :style="isOpen(card.id) && !card.compact ? { flexGrow: flexOf(card.id) } : undefined"
      >
        <!-- 落点指示线（拖动中，指针悬停在本列） -->
        <div v-if="isDropIndexAt(side, index)" class="rail-stack__drop-line" />
        <!-- 卡片间分隔条（两张都展开时可拖动调整上下空间） -->
        <div
          v-if="index > 0"
          class="rail-stack__divider"
          :class="{ 'rail-stack__divider--draggable': dividerDraggable(index) }"
          :title="dividerDraggable(index) ? '拖动调整上下卡片空间' : undefined"
          @mousedown="
            dividerDraggable(index)
              ? onDividerDragStart($event, visibleCards[index - 1].id, card.id)
              : undefined
          "
        />
        <!-- 卡片 = ui-frame NeumorphismCard（glass 磨砂玻璃；布局经透传的
             rail-stack__card 类施加——卡片自身不内置布局，见库的布局契约） -->
        <NeumorphismCard
          glass
          no-padding
          class="rail-stack__card"
          :class="{
            'rail-stack__card--open': isOpen(card.id),
            'rail-stack__card--compact': card.compact && isOpen(card.id),
          }"
        >
          <template #header>
            <header
              class="rail-stack__head"
              :class="{
                'rail-stack__head--dragging': railDrag.active && draggingCardId === card.id,
                'rail-stack__head--static': !canDrag,
              }"
              :title="canDrag ? '拖动调整位置（可拖到左侧栏）' : '点击折叠 / 展开'"
              @pointerdown="onHeadPointerDown($event, card)"
              @click="onHeadClick(card)"
            >
              <span v-if="canDrag" class="rail-stack__grip" aria-hidden="true">
                <PanelIcon name="grip" size="xs" />
              </span>
              <span class="rail-stack__title">
                {{ card.title }}
                <span
                  v-if="card.count && card.count > 0"
                  class="branch-tab-count"
                  :title="card.countTitle"
                >
                  {{ card.count }}
                </span>
              </span>
              <button
                v-if="canDrag"
                type="button"
                class="rail-stack__relocate"
                :title="side === 'left' ? '移到右侧栏' : '移到左侧栏'"
                :aria-label="side === 'left' ? '移到右侧栏' : '移到左侧栏'"
                @pointerdown.stop
                @click.stop="onRelocate(card)"
              >
                <PanelIcon :name="side === 'left' ? 'arrow-right' : 'arrow-left'" size="sm" />
              </button>
              <span class="rail-stack__caret" aria-hidden="true">
                <PanelIcon
                  :name="isOpen(card.id) ? 'chevron-down' : 'chevron-right'"
                  size="xs"
                />
              </span>
            </header>
          </template>
          <div v-if="isOpen(card.id)" class="rail-stack__body">
            <slot :name="card.id" />
          </div>
        </NeumorphismCard>
      </div>
    </TransitionGroup>
    <!-- 末尾落点指示线（插到最后一卡之后）。放在 TransitionGroup **之外**：
         组内的条件渲染会被当作 enter/leave 过渡元素（离场时 absolute + 缩放
         动画造成错位/残影），绝对定位也不应参与 FLIP 布局计算。 -->
    <div
      v-if="railDrag.dropSide === side && railDrag.dropIndex === visibleCards.length && visibleCards.length > 0"
      class="rail-stack__drop-line rail-stack__drop-line--end"
    />
    <!-- 空列且在拖动：虚线投放框（提示可放置） -->
    <div v-if="railDrag.active && isEmpty" class="rail-stack__empty-drop">
      拖到此处放置卡片
    </div>
    <!-- 空列且未拖动：空态占位（2026-10）。列的存在性由「登记卡片」决定
         （见 ChatView 的 leftRailVisible / rail-cards 的 railRegistered），
         卡片门控因异步状态（workspace / loopMode / teams）暂时藏起全部卡片
         时**列仍在**——这里给出可见空态，避免一片空白让人以为边栏坏了。 -->
    <div v-else-if="isEmpty" class="rail-stack__empty-hint">
      <span class="rail-stack__empty-hint-title">当前无可用卡片</span>
      <span class="rail-stack__empty-hint-sub">切换 agent、激活工作区或重连后会自动恢复</span>
    </div>
  </div>
</template>

<style scoped>
/* 卡片栈：填满容器高，纵向 flex；展开的卡片按 flex-grow 分配空间，
   折叠的卡片收缩为一条横条（内容高度）。
   卡片是悬浮圆角矩形（毛玻璃），间距由 gap 提供。
   堆叠规则（顺序/折叠/最小高度/溢出的唯一来源）：
   - 展开卡最小高度 = --rail-card-min-h（可在此调，勿散落到 JS）；
   - 内边距 12px 与列表 gap 12px 是拖动落点几何的基准（rail-drag 从计算样式读，不再复制常量）。 */
.rail-stack {
  --rail-card-min-h: 80px;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
}
/* 内层列表承担 flex 布局：TransitionGroup 直接子元素即「槽位」，
   FLIP move 过渡才有正确的尺寸/位置参照。
   堆叠溢出：展开卡各有最小高度（见下方 --rail-card-min-h），列内放不下时
   **列自身滚动**（此前是 overflow: hidden，最后一张卡被静默裁掉、不可达）。 */
.rail-stack__list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--nm-neutral-300, rgba(128, 128, 128, 0.4)) transparent;
  /* 阴影完整环绕（2026-10-16，用户报告「直角阴影」）：滚动视口（本元素的
     矩形边界）会把卡片的 box-shadow 沿边界硬裁——卡片左右边缘、首卡顶部
     与视口齐平时，阴影只剩「下侧一条被直线切断的残带」。负 margin + 等量
     padding 把滚动视口外扩到列容器 padding 边界（= .rail-stack 的 12px）：
     阴影四边重新获得显示空间，而内容盒（卡片 / 分隔条 / FLIP 几何）零位移
     （两者在排版上冲抵），滚动范围与拖拽落点几何不变。
     ⚠️ 本值与 .rail-stack 的 padding 成对——后者调整时须同步；外扩超出其
     padding 的部分仍会被 .rail-stack 的 overflow: hidden 裁掉。 */
  margin: -12px;
  padding: 12px;
}

/* 槽位（卡片 + 其上分隔条）：展开态按 flexGrow 分配空间；折叠态收缩为横条；
   紧凑卡固定高度。position: relative 是落点指示线的定位参照（slot 顶 = 卡片顶）。 */
.rail-stack__slot {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  min-height: 0;
}
.rail-stack__slot--open {
  flex: 1 1 0;
  min-height: var(--rail-card-min-h);
}
.rail-stack__slot--compact {
  flex: 0 0 auto;
  min-height: 0;
}
/* 刚落位的卡片：拖影飞行期间隐藏，飞完淡入（视觉上与拖影无缝衔接） */
.rail-stack__slot--arriving .rail-stack__card {
  opacity: 0;
}

/* FLIP：卡片进出与重排的过渡（拖动落位、跨列迁移、门控变化都走它） */
.rail-slot-move,
.rail-slot-enter-active,
.rail-slot-leave-active {
  transition:
    transform 0.26s cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 0.2s ease-out;
}
.rail-slot-enter-from,
.rail-slot-leave-to {
  opacity: 0;
}
.rail-slot-enter-from {
  transform: translateY(-6px) scale(0.98);
}
.rail-slot-leave-to {
  transform: scale(0.98);
}
/* 离场元素脱离文档流：其余卡片平滑上移补位（不产生跳变） */
.rail-slot-leave-active {
  position: absolute;
  left: 12px;
  right: 12px;
}

/* 布局（经透传类施加在 NeumorphismCard 根节点上；材质由库 glass 提供） */
.rail-stack__card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* 覆盖库 glass 底色的不透明度，与面板其他悬浮元素一致 */
  --nm-glass-bg: color-mix(in srgb, var(--nm-surface-raised) 46%, transparent);
  --nm-glass-blur: 24px;
  border-radius: 20px;
  transition: opacity 0.18s ease-out;
}
.rail-stack__card :deep(.nm-card__header),
.rail-stack__card :deep(.nm-card__body) {
  padding: 0;
}
.rail-stack__card :deep(.nm-card__body) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.rail-stack__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid transparent;
  cursor: grab;
  user-select: none;
  flex: 0 0 auto;
  touch-action: none; /* 触控拖动不触发页面滚动 */
}
.rail-stack__head:hover {
  background: var(--panel-hover);
}
.rail-stack__head--dragging {
  cursor: grabbing;
}
/* 禁用拖动（移动端卡片抽屉）：卡头只是折叠开关——不吞纵向触摸滚动
   （touch-action: none 会让卡头成为列表滚动死区）。 */
.rail-stack__head--static {
  cursor: pointer;
  touch-action: pan-y;
}
/* 握把：与卡头同一拖动把手（悬停可见，视觉提示「可拖」） */
.rail-stack__grip {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  color: var(--nm-text-placeholder, #888);
  opacity: 0;
  transition: opacity 0.15s;
}
.rail-stack__head:hover .rail-stack__grip {
  opacity: 1;
}
.rail-stack__title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--nm-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rail-stack__caret {
  display: inline-flex;
  align-items: center;
  color: var(--nm-text-secondary);
  flex: 0 0 auto;
}
/* 「移到另一侧」：键盘/鼠标等价路径（拖动之外的显式操作） */
.rail-stack__relocate {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  border: none;
  background: transparent;
  color: var(--nm-text-secondary);
  line-height: 1;
  padding: 2px 4px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}
.rail-stack__head:hover .rail-stack__relocate,
.rail-stack__relocate:focus-visible {
  opacity: 1;
}
.rail-stack__relocate:hover {
  background: var(--panel-accent-soft);
  color: var(--nm-text-primary);
}

.rail-stack__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  /* 展开动画只用 transform/opacity（可合成，不触发重排）；
     折叠不做过渡——卡体按需卸载（v-if），动画会拖延异步内容的卸载语义。 */
  animation: rail-body-in 0.18s ease-out;
}
@keyframes rail-body-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

/* 分隔条：卡片间隙中的隐形拖动把手（两张都展开时可拖动）。
   margin 的算法：divider 位于槽位内、卡片之前；负上边距把它提到卡间空隙
   里（视觉中线贴空隙中心），下边距 3px 抵消自身高度，使「divider + 卡片」
   的净占位 = 0 —— 卡片间距严格等于槽位间距（12px，见 rail-stack__list 的
   gap）。漏掉 3px 会把卡间距压成 1px（2026-09-24 实测修复）。 */
.rail-stack__divider {
  flex: 0 0 auto;
  height: 5px;
  margin: -8px 8px 3px;
  border-radius: 999px;
}
.rail-stack__divider--draggable {
  cursor: row-resize;
}
.rail-stack__divider--draggable:hover {
  background: color-mix(in srgb, var(--panel-accent) 30%, transparent);
}

/* 落点指示线：拖动中显示插入位置（2px 主色，两端圆角，外发光）。
   绝对定位——指示线只是「提示」，不能参与布局：占位式实现会在出现/消失时
   推挤相邻卡片（实测卡片跳动 8px）。 */
.rail-stack__drop-line {
  position: absolute;
  left: 4px;
  right: 4px;
  top: -7px;
  z-index: 1; /* 压在 divider 之上（divider 仅 hover 时高亮，重叠不该遮线） */
  height: 2px;
  border-radius: 999px;
  background: var(--panel-accent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--panel-accent) 60%, transparent);
  pointer-events: none;
}
/* 末尾线（相对 rail-stack 定位；内容底 = 容器底 - 12px padding） */
.rail-stack__drop-line--end {
  top: auto;
  bottom: 11px;
  left: 16px;
  right: 16px;
}

/* 减少动态效果：卡片进出/重排/展开的过渡一律取消（保留即时的状态切换与
   「拖动中」的静态提示），避免前庭不适。 */
@media (prefers-reduced-motion: reduce) {
  .rail-slot-move,
  .rail-slot-enter-active,
  .rail-slot-leave-active,
  .rail-stack__card,
  .rail-stack__grip,
  .rail-stack__relocate {
    transition: none;
  }
  .rail-stack__body {
    animation: none;
  }
}

/* 空列投放框：拖动中提示「拖到此处」（虚线圆角，悬停高亮由容器负责） */
.rail-stack__empty-drop {
  position: absolute;
  inset: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed color-mix(in srgb, var(--panel-accent) 45%, transparent);
  border-radius: 20px;
  color: var(--nm-text-secondary);
  font-size: 12px;
  pointer-events: none;
}

/* 空列空态（未拖动）：列由「登记卡片」保活，卡片全被门控藏起时的占位。
   与投放框同几何（inset 12px 对齐卡片边界），虚线更淡——是「说明」而不是
   「操作提示」；文字分行排布，窄列里也不折成一行挤爆。 */
.rail-stack__empty-hint {
  position: absolute;
  inset: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border: 1px dashed color-mix(in srgb, var(--nm-text-secondary) 22%, transparent);
  border-radius: 20px;
  color: var(--nm-text-secondary);
  text-align: center;
  pointer-events: none;
}
.rail-stack__empty-hint-title {
  font-size: 12px;
}
.rail-stack__empty-hint-sub {
  font-size: 11px;
  opacity: 0.72;
  line-height: 1.5;
}
</style>
