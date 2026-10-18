//! 移动端视图切换菜单（2026-10 移动端布局 v2）。
//!
//! ## 为什么需要它
//!
//! v1 的顶栏把三个视图压成两三个 `NeumorphismButton`（聊天 / 设置），有两个硬伤：
//!
//! 1. **Shell 视图在移动端没有顶栏入口**——只有「卡片抽屉 → Shell 卡 → 详情」这一条
//!    三级路径才能进；而顶栏在 shell 视图下也不显示任何选中态，用户不知道自己"在哪"。
//! 2. **375px 屏上顶栏塞不下**：品牌 + 聊天 + 设置 + 卡片 + 主题，品牌被迫压成省略号
//!    （`styles.css` 的移动段专门为此写了收缩规则）。
//!
//! v2 把视图切换收进一个底部 Sheet：顶栏只留 `☰` + 当前视图标题 + 卡片 + 主题，
//! 三个视图（含 Shell）一视同仁，当前项打勾。
//!
//! ## 契约
//!
//! - 选项顺序固定 `chat → settings → shell`（与桌面顶栏一致，避免肌肉记忆分裂）
//! - 选中即切换并关闭；点遮罩 / 关闭按钮不切换
//! - 只在移动端渲染（`App.vue` 用 `v-if="isMobile"`；桌面顶栏本来就是直接可见的按钮）

<script setup lang="ts">
import { computed } from 'vue';
import NeumorphismDrawer from '@echolab-auto/ui-frame/components/NeumorphismDrawer';
import PanelIcon from './PanelIcon.vue';
import type { IconName } from '@echolab-auto/ui-frame/icons';
import { mobileViewSheetOpen, closeMobileSheet } from '../mobile-sheets';

export type PanelView = 'chat' | 'settings' | 'shell';

const props = defineProps<{
  /** 当前视图（决定哪一项打勾）。 */
  view: PanelView;
}>();

const emit = defineEmits<{
  (event: 'select', view: PanelView): void;
}>();

interface ViewOption {
  id: PanelView;
  label: string;
  hint: string;
  icon: IconName;
}

/** 顺序必须与桌面顶栏一致（chat → settings → shell）。 */
const OPTIONS: ViewOption[] = [
  { id: 'chat', label: '聊天', hint: '消息、输入与入口行', icon: 'message' },
  { id: 'settings', label: '设置', hint: 'API、技能、插件与 Core 连接', icon: 'gear' },
  { id: 'shell', label: 'Shell', hint: 'Shell 会话列表与详情', icon: 'clipboard' },
];

const open = computed({
  get: () => mobileViewSheetOpen.value,
  set: (value: boolean) => {
    mobileViewSheetOpen.value = value;
  },
});

function pick(id: PanelView): void {
  emit('select', id);
  closeMobileSheet();
}
</script>

<template>
  <NeumorphismDrawer v-model="open" position="bottom" title="切换视图" width="auto">
    <nav class="view-sheet" aria-label="切换视图">
      <button
        v-for="opt in OPTIONS"
        :key="opt.id"
        type="button"
        class="view-sheet__item"
        :class="{ 'is-active': props.view === opt.id }"
        :aria-current="props.view === opt.id ? 'page' : undefined"
        @click="pick(opt.id)"
      >
        <PanelIcon :name="opt.icon" size="md" tone="inherit" />
        <span class="view-sheet__text">
          <span class="view-sheet__label">{{ opt.label }}</span>
          <span class="view-sheet__hint">{{ opt.hint }}</span>
        </span>
        <PanelIcon
          v-if="props.view === opt.id"
          name="check"
          size="sm"
          tone="ok"
          class="view-sheet__mark"
        />
      </button>
    </nav>
  </NeumorphismDrawer>
</template>

<style scoped>
.view-sheet {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}

.view-sheet__item {
  display: flex;
  align-items: center;
  gap: 12px;
  /* 触控目标下限 44px（iOS HIG / Material 一致口径） */
  min-height: 52px;
  padding: 10px 14px;
  border: none;
  border-radius: 14px;
  background: var(--nm-surface-raised);
  color: var(--nm-text-primary);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background 0.15s ease;
}

.view-sheet__item:active {
  background: var(--panel-hover, rgba(0, 0, 0, 0.06));
}

.view-sheet__item.is-active {
  background: var(--panel-hover, rgba(0, 0, 0, 0.06));
}

.view-sheet__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.view-sheet__label {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}

.view-sheet__hint {
  font-size: 12px;
  color: var(--nm-text-secondary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-sheet__mark {
  flex: 0 0 auto;
}
</style>
