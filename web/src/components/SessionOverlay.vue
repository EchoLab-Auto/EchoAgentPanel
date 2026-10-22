<script setup lang="ts">
//! 会话区覆盖面板：**入口行各弹层共用的唯一外壳**（2026-10 统一）。
//!
//! 用户要求：「入口行除了 Agent 切换以外的弹层统一成一种样式，大小等于会话
//! 消息区，并且唤起一个就关掉另一个」。
//!
//! 此前同一个入口行打开的东西有三种形态：
//! - 六个 `PanelPopover`（清单 / 会话 / 工作区 / 实例 / 任务 / 模型）：锚在
//!   按钮上方、宽 520px、内容高度自适应 —— 同一块屏幕上换弹层要重新找位置；
//! - 「配置」`AgentConfigModal` 与「上下文」`ctx-overlay`：贴会话框的覆盖层
//!   （上/左/右 12px、底距入口行），带遮罩、点遮罩关闭；
//! - Agent 切换 `AgentSwitcher`：锚定浮层（**保留**，见用户要求）。
//!
//! 现在除 Agent 切换外全部走本组件：几何 = **会话框顶 → 入口行上边缘**
//! （`ChatView` 实测入口行 rect 与正文列左右边界后按 px 传入）——面板底边
//! 就停在入口行顶边，输入区与入口行完整露在面板下方，谁也不压谁。玻璃配方
//! 与圆角沿用面板既有的 `--panel-glass-*` 一套，开关由父组件的单一状态驱动
//! （同一时刻只可能开一个 → 互斥天然成立）。
//!
//! 为什么不用 `position: fixed` + Teleport（`PanelPopover` 的做法）：覆盖层要
//! 「等于消息区」，而消息区是会话视图里的弹性子项——fixed 需要每帧测量视口，
//! 窗口一有横滚/缩放就跟不上。绝对定位在会话视图容器内、边界由父组件测量后
//! 传入，天然跟随布局（边栏进出、输入区撑高、软键盘弹出都只是重算一次 inset）。
//!
//! 关闭语义（与 `PanelPopover` 一致，避免同一排按钮行为分叉）：
//! - 点面板外任意处（捕获阶段 `pointerdown`）→ 关闭；`ignore` 元素（入口行）
//!   与 ui-frame 的 teleport 浮层（下拉/菜单/提示）内的按下**不算外部**——
//!   否则点入口行另一个按钮会先关闭再被 click 重新打开，且下拉选项点不动；
//! - `Esc` → 关闭（捕获并 `stopPropagation`，不让库模态等下层同时响应）。

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { isInsideFloatingLayer } from '../floating-layer';

/** 覆盖面板相对会话视图容器的四边内缩（px）。 */
export interface OverlayInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const props = withDefaults(
  defineProps<{
    /** 是否显示（父组件的单一状态：同一时刻最多一个为真）。 */
    open: boolean;
    /**
     * 相对会话视图容器的矩形（px）。`null` = 还没测量到（首帧）：先按
     * 「贴满容器」渲染，父组件测量完成后立即校正——不会闪出错误的中间态，
     * 因为首帧通常是同一次 layout 之后。
     */
    inset?: OverlayInset | null;
    /**
     * 点它内部**不算**「点了面板外」的元素（入口行：点另一个按钮直接切换）。
     */
    ignore?: HTMLElement | null;
    /**
     * 内容是否由本组件加统一内边距（18px）。内容自带 padding 的（配置面板、
     * 上下文）传 false，避免双重留白。
     */
    padded?: boolean;
    /** 无障碍名称（`role="dialog"` 需要）。 */
    label?: string;
  }>(),
  { inset: null, ignore: null, padded: true, label: '' },
);

const emit = defineEmits<{ (event: 'close'): void }>();

const rootRef = ref<HTMLElement | null>(null);

/**
 * 内缩量写成四条独立属性而不是 `inset` 简写：jsdom（cssstyle）不认 `inset`，
 * 简写会被整条丢弃 —— 行为就测不到，而浏览器两种写法等价。
 */
const insetStyle = computed(() => {
  const i = props.inset;
  return {
    top: `${i?.top ?? 0}px`,
    right: `${i?.right ?? 0}px`,
    bottom: `${i?.bottom ?? 0}px`,
    left: `${i?.left ?? 0}px`,
  };
});

function requestClose() {
  emit('close');
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node | null;
  if (!target) return;
  if (
    rootRef.value?.contains(target) ||
    props.ignore?.contains(target) ||
    isInsideFloatingLayer(target)
  ) {
    return;
  }
  requestClose();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  event.stopPropagation();
  requestClose();
}

function attach() {
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeydown, true);
}

function detach() {
  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('keydown', onKeydown, true);
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      detach();
      return;
    }
    attach();
  },
  { immediate: true },
);

onBeforeUnmount(detach);
</script>

<template>
  <Transition name="session-overlay">
    <div
      v-if="open"
      ref="rootRef"
      class="session-overlay"
      :style="insetStyle"
      role="dialog"
      :aria-label="label || undefined"
      tabindex="-1"
    >
      <!-- 不放右上角浮动关闭按钮：它会与各内容面板自己的头部控件（工作区的
           「新建」、实例的「刷新」、上下文的「清空」）重叠，而外壳无法逐面板
           避让。关闭语义统一为「点面板外 / Esc / 再点同一入口按钮」——与改造
           前六个 popover 的行为一致，不新增学习成本。 -->
      <div class="session-overlay__body" :class="{ 'session-overlay__body--flush': !padded }">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 外壳：与 RailStack 卡片同一套玻璃配方（同一屏内两种玻璃会看出色差）。 */
.session-overlay {
  position: absolute;
  /* 6：几何上已不与输入区（5）重叠（底边停在入口行顶边），仍高一档以免阴影/
     溢出的边角盖到它；低于入口行（7）——入口行是面板的切换器与关闭器，必须
     始终可点。 */
  z-index: 6;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--panel-glass-border);
  border-radius: 24px;
  background: color-mix(in srgb, var(--nm-surface-raised) 52%, transparent);
  backdrop-filter: blur(var(--panel-glass-blur, 24px)) saturate(var(--panel-glass-saturate, 1.6));
  -webkit-backdrop-filter: blur(var(--panel-glass-blur, 24px))
    saturate(var(--panel-glass-saturate, 1.6));
  box-shadow:
    var(--panel-glass-shadow-lg),
    inset 0 1px 0 var(--panel-glass-highlight);
  color: var(--nm-text-primary);
  outline: none;
  /* 入场：只动 opacity/transform（可合成，不触发重排） */
  animation: session-overlay-in 0.16s ease-out;
}

.session-overlay__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 18px;
  overflow: auto;
  border-radius: inherit;
  overscroll-behavior: contain;
}
/* 内容自带 padding（配置面板 / 上下文）：外壳只给圆角与滚动 */
.session-overlay__body--flush {
  padding: 0;
}

.session-overlay-enter-active,
.session-overlay-leave-active {
  transition:
    opacity 0.16s ease-out,
    transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.session-overlay-enter-from,
.session-overlay-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@keyframes session-overlay-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .session-overlay,
  .session-overlay-enter-active,
  .session-overlay-leave-active {
    animation: none;
    transition: none;
  }
}
</style>
