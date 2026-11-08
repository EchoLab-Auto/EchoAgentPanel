<script setup lang="ts">
//! 通用扩展入口与覆盖层槽位。
//! 扩展提供内容，Panel 提供按钮、互斥弹层、布局和关闭行为。

import { computed, nextTick, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import PanelIcon from './PanelIcon.vue';
import SessionOverlay, { type OverlayInset } from './SessionOverlay.vue';
import { state } from '../store';
import { entryOverlay, setEntryOverlay, toggleEntryOverlay } from '../overlays';
import { panelEntryActions, panelOverlays } from '../extensions/registry';
import type { PanelSlotContext } from '../extensions/registry';

const props = defineProps<{
  teamId: string | null;
  sessionId: string;
  inset: OverlayInset | null;
  ignore?: HTMLElement | null;
  /** 弹层的定位宿主（会话视图）。入口按钮留在入口行，弹层 teleport 到此处。 */
  host?: HTMLElement | null;
}>();

const emit = defineEmits<{
  selectSession: [id: string];
  changed: [];
  close: [];
}>();

const slotContext = computed<PanelSlotContext>(() => ({
  teamId: props.teamId,
  sessionId: props.sessionId,
  core: state.activeRegion ?? null,
}));
const actions = computed(() => panelEntryActions(slotContext.value));
const overlays = computed(() => panelOverlays());

watch(actions, async () => {
  await nextTick();
  const open = entryOverlay.value;
  if (open?.startsWith('extension:') && !actions.value.some((item) => item.overlayId === open)) {
    setEntryOverlay(null);
  }
  emit('changed');
});
watch(
  () => [props.teamId, state.activeRegion],
  () => {
    if (entryOverlay.value?.startsWith('extension:')) setEntryOverlay(null);
  },
);

function prefetch(overlayId: string): void {
  actions.value.find((item) => item.overlayId === overlayId)?.action.prefetch?.(slotContext.value);
}

function open(overlayId: string): void {
  prefetch(overlayId);
  toggleEntryOverlay(overlayId);
}
</script>

<template>
  <div
    class="panel-extension-entries"
    @pointerover="prefetch(($event.target as HTMLElement).closest('[data-extension-overlay]')?.getAttribute('data-extension-overlay') ?? '')"
    @focusin="prefetch(($event.target as HTMLElement).closest('[data-extension-overlay]')?.getAttribute('data-extension-overlay') ?? '')"
  >
    <NeumorphismButton
      v-for="item in actions"
      :key="item.overlayId"
      variant="glass"
      shape="pill"
      size="small"
      :pressed="entryOverlay === item.overlayId"
      :title="item.action.title ?? item.action.label"
      :aria-label="item.action.label"
      :data-extension-overlay="item.overlayId"
      @click="open(item.overlayId)"
    >
      <PanelIcon :name="item.action.icon" size="md" />
      <span>{{ item.action.label }}</span>
    </NeumorphismButton>
  </div>
  <!-- 按钮在入口行内，但弹层不能以入口行为绝对定位包含块：
       entry-row 只有一行高，inset 却是相对 chat-view 计算的，直接渲染会把
       面板压成细条。Teleport 到 chat-view 后与内置弹层共用同一定位参照。 -->
  <Teleport :to="props.host ?? 'body'" :disabled="!props.host">
    <SessionOverlay
      v-for="item in overlays"
      :key="item.overlayId"
      :open="entryOverlay === item.overlayId"
      :inset="props.inset"
      :ignore="props.ignore"
      :label="item.overlay.label"
      @close="setEntryOverlay(null)"
    >
      <component
        :is="item.overlay.component"
        :team-id="props.teamId"
        :session-id="props.sessionId"
        @select-session="(id: string) => { emit('selectSession', id); emit('close'); }"
      />
    </SessionOverlay>
  </Teleport>
</template>

<style scoped>
.panel-extension-entries {
  display: contents;
}
</style>
