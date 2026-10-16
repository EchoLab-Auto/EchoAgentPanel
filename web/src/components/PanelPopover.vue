<script setup lang="ts">
//! 统一入口弹层：Teleport 到 body，统一定位、关闭、焦点与移动端尺寸。
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  anchor?: HTMLElement | null;
  placement?: 'top' | 'bottom';
  width?: string;
  maxHeight?: string;
}>(), { anchor: null, placement: 'top', width: '520px', maxHeight: '68vh' });

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'open'): void;
  (event: 'close'): void;
}>();

const panelRef = ref<HTMLElement | null>(null);
const isMobile = ref(false);
const panelStyle = ref<Record<string, string>>({});
const GAP = 8;
const MARGIN = 12;
const BREAKPOINT = 768;
let resizeObserver: ResizeObserver | null = null;

function updatePosition() {
  if (typeof window === 'undefined') return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw < BREAKPOINT;
  isMobile.value = mobile;
  const rect = props.anchor?.getBoundingClientRect() ?? null;
  if (mobile) {
    panelStyle.value = {
      left: '8px', right: '8px', width: 'auto', top: 'auto',
      bottom: `${Math.max(8, vh - (rect?.top ?? vh) + GAP)}px`,
    };
    return;
  }
  const match = /^(\d+(?:\.\d+)?)px$/.exec(props.width.trim());
  const requested = match ? Number(match[1]) : vw - MARGIN * 2;
  const width = Math.max(0, Math.min(requested, vw - MARGIN * 2));
  const center = rect ? rect.left + rect.width / 2 : vw / 2;
  const left = Math.max(MARGIN, Math.min(center - width / 2, vw - MARGIN - width));
  const style: Record<string, string> = { left: `${left}px`, width: `${width}px` };
  if (props.placement === 'bottom') {
    style.top = `${Math.max(MARGIN, (rect?.bottom ?? 0) + GAP)}px`;
    style.bottom = 'auto';
  } else {
    style.bottom = `${Math.max(GAP, vh - (rect?.top ?? vh) + GAP)}px`;
    style.top = 'auto';
  }
  panelStyle.value = style;
}

function requestClose() {
  if (props.modelValue) emit('update:modelValue', false);
}
function onPointerDown(event: PointerEvent) {
  const target = event.target as Node | null;
  if (target && (panelRef.value?.contains(target) || props.anchor?.contains(target))) return;
  requestClose();
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.stopPropagation(); requestClose(); }
}
function observe() {
  resizeObserver?.disconnect();
  if (typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(updatePosition);
  if (props.anchor) resizeObserver.observe(props.anchor);
  if (panelRef.value) resizeObserver.observe(panelRef.value);
}
function attach() {
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, true);
}
function detach() {
  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('keydown', onKeydown, true);
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', updatePosition, true);
  resizeObserver?.disconnect();
  resizeObserver = null;
}

watch(() => props.modelValue, async (open, wasOpen) => {
  if (wasOpen === undefined || open === wasOpen) return;
  if (open) {
    updatePosition();
    attach();
    await nextTick();
    observe();
    panelRef.value?.focus({ preventScroll: true });
    emit('open');
  } else {
    detach();
    props.anchor?.focus({ preventScroll: true });
    emit('close');
  }
}, { immediate: true });

watch(() => props.anchor, () => {
  if (props.modelValue) { updatePosition(); observe(); }
});
onBeforeUnmount(detach);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      ref="panelRef"
      class="panel-popover"
      :class="{ 'panel-popover--mobile': isMobile }"
      :style="panelStyle"
      role="dialog"
      tabindex="-1"
    >
      <div class="panel-popover__body" :style="{ maxHeight: isMobile ? '56vh' : maxHeight }">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.panel-popover {
  position: fixed;
  z-index: 30;
  max-width: calc(100vw - 24px);
  border: 1px solid var(--panel-glass-border);
  border-radius: 24px;
  background: color-mix(in srgb, var(--nm-surface-raised) 52%, transparent);
  backdrop-filter: blur(var(--panel-glass-blur, 24px)) saturate(var(--panel-glass-saturate, 1.6));
  -webkit-backdrop-filter: blur(var(--panel-glass-blur, 24px)) saturate(var(--panel-glass-saturate, 1.6));
  box-shadow: var(--panel-glass-shadow-lg);
  color: var(--nm-text-primary);
  outline: none;
  animation: panel-popover-in 0.14s ease-out;
}
.panel-popover__body { overflow: auto; padding: 18px; border-radius: inherit; overscroll-behavior: contain; }
.panel-popover--mobile { max-width: none; border-radius: 20px; }
@keyframes panel-popover-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .panel-popover { animation: none; } }
</style>
