<script setup lang="ts">
//! 拖动拖影：跟随指针的「卡片缩影」（fixed 定位 + transform 位移）。
//!
//! 定位：以卡片原位置为基准（left/top 固定），位移全部走 `transform`——
//! GPU 合成、不触发布局（拖动期间 60fps 的关键）。落位/回位阶段改为
//! CSS 过渡飞向目标矩形（`railDrag.flight`），飞完由状态机复位。
//!
//! 渲染内容：卡头（握把 + 标题 + 计数）——与真卡片头部一致，拖起来
//! 视觉连续；不渲染卡体（体量大、且拖动中无需交互）。

import { computed } from 'vue';
import PanelIcon from './PanelIcon.vue';
import {
  GHOST_FADE_MS,
  GHOST_FLIGHT_MS,
  ghostTransform,
  prefersReducedMotion,
  railDrag,
} from '../rail-drag';

const transform = computed(() => ghostTransform());

/** 减少动态效果：拖影不做「飞行」过渡（与 rail-drag 的 motionMs 时长相符）。 */
const reducedMotion = prefersReducedMotion();

const style = computed(() => {
  const t = transform.value;
  return {
    left: `${railDrag.ghost.x}px`,
    top: `${railDrag.ghost.y}px`,
    width: `${railDrag.ghost.width}px`,
    transform: `translate3d(${t.tx}px, ${t.ty}px, 0) rotate(${t.rotate}deg) scale(${t.scale})`,
    // 拖动中跟手（无过渡）；飞行阶段用过渡吸附到目标位置；收尾淡出。
    transition:
      !reducedMotion && railDrag.landing
        ? `transform ${GHOST_FLIGHT_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${GHOST_FADE_MS}ms ease-out`
        : 'none',
    opacity: railDrag.fading ? 0 : railDrag.landing ? 0.85 : 1,
  };
});

/** 拖影的显隐：跟手阶段与落位飞行都要显示（飞行结束由状态机复位）。 */
const visible = computed(
  () => !!railDrag.snapshot && (railDrag.active || railDrag.landing || railDrag.fading),
);

/** 卡头文案（快照的非空视图：模板里不必再判空）。 */
const snapshot = computed(() => railDrag.snapshot);
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="rail-ghost" :style="style" aria-hidden="true">
      <div class="rail-ghost__head">
        <span class="rail-ghost__grip"><PanelIcon name="grip" size="xs" /></span>
        <span class="rail-ghost__title">{{ snapshot?.title }}</span>
        <span
          v-if="snapshot?.count && snapshot.count > 0"
          class="rail-ghost__count"
          :title="snapshot?.countTitle"
        >
          {{ snapshot?.count }}
        </span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.rail-ghost {
  position: fixed;
  /* 宿主自绘层取值域：按 ui-frame 集成约定用 0–99（库浮层从 100 起：
     dropdown 100 < tooltip 200 < popover 300 < overlay 400 < toast 500）。
     90 = 高于 Panel 自身所有层（rail 4 / 输入区 5 / 入口行 6 / 浮层 30–60），
     低于库最底的下拉层，拖影不会盖住库下拉与提示。 */
  z-index: 90;
  pointer-events: none;
  /* 位移全走 transform：提前提升为合成层，拖动期间不触发布局/重绘 */
  will-change: transform, opacity;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--panel-accent) 55%, transparent);
  background: color-mix(in srgb, var(--nm-surface-raised) 88%, transparent);
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.36),
    0 0 0 3px var(--panel-accent-soft);
  backdrop-filter: blur(10px);
  overflow: hidden;
}
.rail-ghost__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}
.rail-ghost__grip {
  display: inline-flex;
  align-items: center;
  color: var(--nm-text-placeholder, #888);
}
.rail-ghost__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
  color: var(--nm-text-primary);
}
.rail-ghost__count {
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 9px;
  background: var(--panel-accent);
  color: var(--nm-text-on-primary, #fff);
}
</style>
