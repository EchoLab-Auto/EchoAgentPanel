<script setup lang="ts">
//! 面板图标载体（2026-10）：**薄封装**在 ui-frame 的 `NeumorphismIcon` 之上，
//! 只补两件产品侧关注的事——语义色调（`tone` → `--panel-*` 令牌）与
//! 尺寸档的中文别名。图标几何全部来自 ui-frame 注册表
//! （`@echolab-auto/ui-frame/icons`，79 个语义），Panel 不再自持 path 数据。
//!
//! 为什么保留这一层（而不是组件里直接用 ui-frame）：
//! - **语义色**：`reasoning` / `subagent` 是 Panel 特有的产品语义，映射到
//!   `--panel-reasoning` / `--panel-subagent` 双主题令牌（ui-frame 不认识）；
//! - **调用一致性**：Panel 内 40+ 处统一用 `<PanelIcon name=… size=… tone=…>`，
//!   换库时只改这一个文件。
//!
//! 规范：ui-frame `document/develop/design-philosophy.md` §8（24 viewBox /
//! `currentColor` / 尺寸七档 / 线宽六档）。

import NeumorphismIcon from '@echolab-auto/ui-frame/components/NeumorphismIcon';
import type { IconName, IconSize } from '@echolab-auto/ui-frame/icons';

/** 产品语义色——值全部来自 styles.css 的 `--panel-*` 令牌，随主题切换。 */
export type PanelIconTone =
  | 'inherit'
  | 'accent'
  | 'muted'
  | 'ok'
  | 'warn'
  | 'err'
  | 'reasoning'
  | 'subagent';

/** 尺寸档（与 ui-frame §8 一致，Panel 侧沿用 xs/sm/md/lg/xl/2xl）。 */
export type PanelIconSize = Extract<IconSize, 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>;

const props = withDefaults(
  defineProps<{
    name: IconName;
    /** 尺寸档；也可传数字（须 ∈ {12,14,16,18,20,24,32}） */
    size?: PanelIconSize | number;
    /** 语义色；默认继承 currentColor */
    tone?: PanelIconTone;
    /** 无障碍名（装饰性图标留空 → aria-hidden） */
    ariaLabel?: string;
  }>(),
  { size: 'sm', tone: 'inherit', ariaLabel: '' },
);
</script>

<template>
  <NeumorphismIcon
    :name="props.name"
    :size="props.size"
    :label="props.ariaLabel"
    :class="['panel-icon', `panel-icon--${props.tone}`]"
  />
</template>

<style scoped>
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
