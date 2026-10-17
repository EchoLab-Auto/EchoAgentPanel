<script setup lang="ts">
//! 面板通用图标载体（2026-10 图标统一）——把散落的内联 SVG 与 emoji
//! 控件图标收敛到单一实现，参数化遵循 ui-frame 图标体系
//! （document/develop/design-philosophy.md §8：24 基准 viewBox /
//! currentColor / 尺寸取 `--nm-icon-size-*` 七档 / 线宽取六档语义）。
//!
//! 与 ToolIcon 的分工：ToolIcon 承载**工具语义**图标（11 种专属 loading
//! 动画，工具名 → 图标分派）；本组件承载**界面语义**图标（导航、状态、
//! 操作、方向），无工具耦合。
//!
//! 用法：
//! ```vue
//! <PanelIcon name="home" />                      <!-- 默认 sm(14px) -->
//! <PanelIcon name="lock" size="xs" tone="warn" />
//! <PanelIcon name="chevron-right" size="md" />
//! <PanelIcon name="folder" :size="12" />          <!-- 数字须落在档位值域 -->
//! <PanelIcon name="gear" aria-label="设置" />     <!-- 语义图标必配 label -->
//! ```

import { computed } from 'vue';

type IconName =
  // 文件系统
  | 'home'
  | 'folder'
  | 'folder-open'
  | 'file'
  // 状态与标记
  | 'lock'
  | 'link'
  | 'star'
  | 'pin'
  | 'dot'
  | 'warning'
  | 'info'
  | 'check'
  | 'check-square'
  | 'square'
  // 方向与导航
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-right'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  // 操作
  | 'gear'
  | 'grip'
  | 'refresh'
  | 'close'
  | 'plus'
  | 'minus'
  | 'search'
  | 'external'
  // 语义（thinking / subagent / 消息）
  | 'sparkle'
  | 'network'
  | 'message';

/** 尺寸档位（值域 = --nm-icon-size-*；Design Philosophy §8）。 */
export type PanelIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** 语义色（tone）——全部落到 styles.css 的 --panel-* 令牌，随主题切换。 */
export type PanelIconTone =
  | 'inherit'
  | 'accent'
  | 'muted'
  | 'ok'
  | 'warn'
  | 'err'
  | 'reasoning'
  | 'subagent';

const SIZE_PX: Record<PanelIconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
};

const props = withDefaults(
  defineProps<{
    name: IconName;
    /** 尺寸档位；也可传数字（须 ∈ {12,14,16,18,20,24,32}） */
    size?: PanelIconSize | number;
    /** 语义色；默认继承 currentColor */
    tone?: PanelIconTone;
    /** 无障碍名（装饰性图标留空 → aria-hidden） */
    ariaLabel?: string;
  }>(),
  { size: 'sm', tone: 'inherit', ariaLabel: '' },
);

const px = computed(() => {
  const s = props.size;
  if (typeof s === 'number') return s;
  return SIZE_PX[s] ?? SIZE_PX.sm;
});

/** 线宽按显示尺寸取档（§8）：≤12px 微图标补偿 2.5；≥24px 大图标轻描 1.5。 */
const strokeWidth = computed(() => {
  const n = px.value;
  if (n <= 12) return 2.5;
  if (n >= 24) return 1.5;
  return 2;
});
</script>

<template>
  <svg
    class="panel-icon"
    :class="`panel-icon--${tone}`"
    :width="px"
    :height="px"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="ariaLabel ? undefined : 'true'"
    :role="ariaLabel ? 'img' : undefined"
    :aria-label="ariaLabel || undefined"
  >
    <!-- 文件系统 -->
    <template v-if="name === 'home'">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5" />
    </template>
    <template v-else-if="name === 'folder'">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </template>
    <template v-else-if="name === 'folder-open'">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1H3z" />
      <path d="M3 10h18l-1.6 7.2a2 2 0 0 1-2 1.8H5.6a2 2 0 0 1-2-1.8z" />
    </template>
    <template v-else-if="name === 'file'">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </template>

    <!-- 状态与标记 -->
    <template v-else-if="name === 'lock'">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </template>
    <template v-else-if="name === 'link'">
      <path d="M9.5 14.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11 7.3" />
      <path d="M14.5 9.5a4 4 0 0 0-5.7 0L6 12.3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </template>
    <template v-else-if="name === 'star'">
      <path
        d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"
      />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 17v4" />
      <path d="M8 3h8l-1 5 3 3v2H6v-2l3-3z" />
    </template>
    <template v-else-if="name === 'dot'">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'warning'">
      <path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20.4h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 16.5h.01" />
    </template>
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.8h.01" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m4.5 12.5 5 5L20 6.5" />
    </template>
    <template v-else-if="name === 'check-square'">
      <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10" />
      <path d="m8 11.5 3.5 3.5L21 5.5" />
    </template>
    <template v-else-if="name === 'square'">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    </template>

    <!-- 方向与导航 -->
    <template v-else-if="name === 'chevron-down'">
      <path d="m6 9.5 6 6 6-6" />
    </template>
    <template v-else-if="name === 'chevron-up'">
      <path d="m6 14.5 6-6 6 6" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="m9.5 6 6 6-6 6" />
    </template>
    <template v-else-if="name === 'arrow-left'">
      <path d="M20 12H4.5" />
      <path d="m10 5.5-6 6.5 6 6.5" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M4 12h15.5" />
      <path d="m14 5.5 6 6.5-6 6.5" />
    </template>
    <template v-else-if="name === 'arrow-up'">
      <path d="M12 20V4.5" />
      <path d="m5.5 10 6.5-6 6.5 6" />
    </template>
    <template v-else-if="name === 'arrow-down'">
      <path d="M12 4v15.5" />
      <path d="m5.5 14 6.5 6 6.5-6" />
    </template>

    <!-- 操作 -->
    <template v-else-if="name === 'gear'">
      <circle cx="12" cy="12" r="3.2" />
      <path
        d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"
      />
    </template>
    <template v-else-if="name === 'grip'">
      <g fill="currentColor" stroke="none">
        <circle cx="9" cy="6.5" r="1.3" />
        <circle cx="15" cy="6.5" r="1.3" />
        <circle cx="9" cy="12" r="1.3" />
        <circle cx="15" cy="12" r="1.3" />
        <circle cx="9" cy="17.5" r="1.3" />
        <circle cx="15" cy="17.5" r="1.3" />
      </g>
    </template>
    <template v-else-if="name === 'refresh'">
      <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
      <path d="M20.5 4v5h-5" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'minus'">
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.6-4.6" />
    </template>
    <template v-else-if="name === 'external'">
      <path d="M14 4h6v6" />
      <path d="M20 4 10.5 13.5" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </template>

    <!-- 语义 -->
    <template v-else-if="name === 'sparkle'">
      <path d="M10.5 4 12.2 9.3 17.5 11 12.2 12.7 10.5 18 8.8 12.7 3.5 11 8.8 9.3z" />
      <path d="M17.8 3.5 18.6 6 21 6.8 18.6 7.6 17.8 10 17 7.6 14.6 6.8 17 6z" />
    </template>
    <template v-else-if="name === 'network'">
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.4 6h5.1a4.5 4.5 0 0 1 4.5 4.5v5.1" />
    </template>
    <template v-else-if="name === 'message'">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </template>
  </svg>
</template>

<style scoped>
/* 基线：与行内文本垂直居中（图标不参与行高计算，避免把行撑高） */
.panel-icon {
  flex: 0 0 auto;
  vertical-align: middle;
  display: inline-block;
}

/* 语义色（值全部来自 styles.css 的 --panel-* 令牌，随主题切换） */
.panel-icon--inherit {
  color: inherit;
}
.panel-icon--accent {
  color: var(--panel-accent);
}
.panel-icon--muted {
  color: var(--nm-text-secondary);
}
.panel-icon--ok {
  color: var(--panel-ok);
}
.panel-icon--warn {
  color: var(--panel-warn);
}
.panel-icon--err {
  color: var(--panel-err);
}
.panel-icon--reasoning {
  color: var(--panel-reasoning);
}
.panel-icon--subagent {
  color: var(--panel-subagent);
}
</style>
