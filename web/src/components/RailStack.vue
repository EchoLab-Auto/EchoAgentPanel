<script setup lang="ts">
//! 右侧边栏卡片栈：卡片上下排列，每张卡可折叠为横条；相邻卡片间的
//! 分隔条可拖动调整上下空间分配（flex-grow 比例，持久化）。

import { ref } from 'vue';
import { NeumorphismCard } from '@echolab-auto/ui-frame';

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

const props = defineProps<{ cards: RailCardDef[] }>();

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

/** 分隔条两侧任一为紧凑卡时不可拖动（紧凑卡不参与 flex 比例分配）。 */
function hasCompactNeighbor(index: number): boolean {
  return !!props.cards[index - 1]?.compact || !!props.cards[index]?.compact;
}

function toggle(id: string) {
  openMap.value = { ...openMap.value, [id]: !isOpen(id) };
  save();
}

/** 卡片的 flex-grow：展开的卡片按持久化比例分配剩余空间（默认 1）。 */
function flexOf(id: string): number {
  return flexMap.value[id] ?? 1;
}

/** 分隔条拖动：调整上下两张展开卡的 flex-grow 比例。 */
function onDividerDragStart(event: MouseEvent, aboveId: string, belowId: string) {
  event.preventDefault();
  const rail = (event.target as HTMLElement).closest('.rail-stack') as HTMLElement | null;
  if (!rail) return;
  const startY = event.clientY;
  const a0 = flexOf(aboveId);
  const b0 = flexOf(belowId);
  const total = a0 + b0;
  // 估算每 1 flex 对应的像素（按整个栈高 / 全部展开卡 flex 之和）
  const openFlexSum = props.cards
    .filter((c) => isOpen(c.id))
    .reduce((acc, c) => acc + flexOf(c.id), 0);
  const pxPerFlex = rail.getBoundingClientRect().height / Math.max(openFlexSum, 1);

  const onMove = (e: MouseEvent) => {
    const delta = (e.clientY - startY) / Math.max(pxPerFlex, 1);
    const a = Math.max(0.2, Math.min(total - 0.2, a0 + delta));
    flexMap.value = { ...flexMap.value, [aboveId]: a, [belowId]: total - a };
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    save();
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

defineExpose({ isOpen });
</script>

<template>
  <div class="rail-stack">
    <template v-for="(card, index) in cards" :key="card.id">
      <!-- 卡片间分隔条（两张都展开时可拖动调整上下空间） -->
      <div
        v-if="index > 0"
        class="rail-stack__divider"
        :class="{
          'rail-stack__divider--draggable':
            isOpen(cards[index - 1].id) && isOpen(card.id) && !hasCompactNeighbor(index),
        }"
        :title="
          isOpen(cards[index - 1].id) && isOpen(card.id) && !hasCompactNeighbor(index)
            ? '拖动调整上下卡片空间'
            : undefined
        "
        @mousedown="
          isOpen(cards[index - 1].id) && isOpen(card.id) && !hasCompactNeighbor(index)
            ? onDividerDragStart($event, cards[index - 1].id, card.id)
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
        :style="
          isOpen(card.id) && !card.compact ? { flexGrow: flexOf(card.id) } : undefined
        "
      >
        <template #header>
          <header class="rail-stack__head" @click="toggle(card.id)">
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
            <span class="rail-stack__caret">{{ isOpen(card.id) ? '▾' : '▸' }}</span>
          </header>
        </template>
        <div v-if="isOpen(card.id)" class="rail-stack__body">
          <slot :name="card.id" />
        </div>
      </NeumorphismCard>
    </template>
  </div>
</template>

<style scoped>
/* 卡片栈：填满容器高，纵向 flex；展开的卡片按 flex-grow 分配空间，
   折叠的卡片收缩为一条横条（内容高度）。
   卡片是悬浮圆角矩形（毛玻璃），间距由 gap 提供。 */
.rail-stack {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

/* 布局（经透传类施加在 NeumorphismCard 根节点上；材质由库 glass 提供）：
   折叠态收缩为横条，展开态按 flexGrow 比例分配空间；body 内部滚动。 */
.rail-stack__card {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  min-height: 0;
  /* 覆盖库 glass 底色的不透明度，与面板其他悬浮元素一致 */
  --nm-glass-bg: color-mix(in srgb, var(--nm-surface-raised) 46%, transparent);
  --nm-glass-blur: 24px;
  border-radius: 20px;
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
.rail-stack__card--open {
  flex: 1 1 0;
  min-height: 80px;
}

/* 紧凑卡：固定高度（内容自适应），不参与剩余空间分配 */
.rail-stack__card--compact {
  flex: 0 0 auto;
  min-height: 0;
}

.rail-stack__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  flex: 0 0 auto;
}
.rail-stack__head:hover {
  background: var(--panel-hover);
}
.rail-stack__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--nm-text-primary);
}
.rail-stack__caret {
  color: var(--nm-text-secondary);
  font-size: 11px;
}

.rail-stack__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 14px 12px;
  display: flex;
  flex-direction: column;
}

/* 分隔条：卡片间隙中的隐形拖动把手（两张都展开时可拖动） */
.rail-stack__divider {
  flex: 0 0 auto;
  height: 5px;
  margin: -8px 8px;
  border-radius: 999px;
}
.rail-stack__divider--draggable {
  cursor: row-resize;
}
.rail-stack__divider--draggable:hover {
  background: color-mix(in srgb, var(--panel-accent) 30%, transparent);
}
</style>
