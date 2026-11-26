<script setup lang="ts">
//! 「设置 · 面板 · 外观」（2026-11）：面板自身的视觉偏好。
//!
//! ## 为什么需要这一节
//!
//! 面板的视觉偏好此前**分散在没有入口的地方**：主题切换在顶栏（`ThemeToggleButton`）、
//! 侧边栏收靠在聊天页贴边把手上。想看"面板现在是什么主题 / 两列侧栏都显示吗"
//! 得先知道去哪找。把它收进设置页的第二级「外观」，与「概览（我在用的是哪种
//! Panel）」「安全（谁能进来）」并列。
//!
//! ## 只放**面板级**偏好
//!
//! 这里没有"系统主题跟随开关""字体大小"之类：面板没有那些能力，凭空加一个
//! 开关只会变成空壳。真实存在的面板级视觉偏好就下面这几项，其余（卡片高度、
//! 列内顺序、卡片换列）是**拖动式**交互，在聊天页直接操作更自然——
//! 在设置页复刻一套只会有两个真相。

import { computed } from 'vue';
import NeumorphismThemeToggle from '@echolab-auto/ui-frame/components/NeumorphismThemeToggle';
import NeumorphismSwitch from '@echolab-auto/ui-frame/components/NeumorphismSwitch';
import { useTheme } from '@echolab-auto/ui-frame/composables/useTheme';
import { railCollapsed, setRailCollapsed } from '../rail-collapse';

// 主题：ThemeProvider 提供的共享三态（浅色 / 跟随系统 / 深色），storageKey
// 由 App.vue 指定为 `echo-panel-theme`，与顶栏那个开关**同一份状态**——
// 改这里，顶栏图标立刻跟着变（反之亦然）。
const { theme } = useTheme();

/** 侧边栏显隐：与聊天页的贴边把手共用 `rail-collapse` 的模块级单例。 */
const leftVisible = computed({
  get: () => !railCollapsed.left,
  set: (visible: boolean) => setRailCollapsed('left', !visible),
});
const rightVisible = computed({
  get: () => !railCollapsed.right,
  set: (visible: boolean) => setRailCollapsed('right', !visible),
});
</script>

<template>
  <section class="panel-appearance">
    <div class="panel-appearance__row panel-appearance__row--theme">
      <div class="panel-appearance__text">
        <div class="panel-appearance__label">主题</div>
        <div class="panel-appearance__hint">
          浅色 / 跟随系统 / 深色。与顶栏的主题开关是同一份设置，改哪边都会立即生效并记住。
        </div>
      </div>
      <NeumorphismThemeToggle v-model="theme" :size="5" />
    </div>

    <div class="panel-appearance__row">
      <div class="panel-appearance__text">
        <div class="panel-appearance__label">左侧栏</div>
        <div class="panel-appearance__hint">
          关掉后正文用满宽度，贴边留一个把手可以随时叫回来；开关状态会记住。
        </div>
      </div>
      <NeumorphismSwitch v-model="leftVisible" active-text="显示" inactive-text="收起" />
    </div>

    <div class="panel-appearance__row">
      <div class="panel-appearance__text">
        <div class="panel-appearance__label">右侧栏</div>
        <div class="panel-appearance__hint">
          连接状态、文件浏览器、Git、Shell 等卡片所在的列。同样可以收起并在需要时叫回。
        </div>
      </div>
      <NeumorphismSwitch v-model="rightVisible" active-text="显示" inactive-text="收起" />
    </div>

    <p class="panel-appearance__note muted">
      卡片的高度分配、列内顺序、卡片换列都在聊天页直接拖动调整（拖卡片之间的分隔条
      或卡头），这里不再重复一套入口。
    </p>
  </section>
</template>

<style scoped>
.panel-appearance {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 行式布局：文字块占满剩余宽度，控件靠右对齐（设置页的通用节奏）。 */
.panel-appearance__row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-radius: var(--nm-radius-md, 12px);
  background: var(--nm-surface, rgba(255, 255, 255, 0.04));
}
.panel-appearance__row--theme {
  /* 主题开关是 5 档齿轮，比普通 Switch 高得多——顶部对齐，别让文字悬在中间。 */
  align-items: flex-start;
}
.panel-appearance__text {
  flex: 1;
  min-width: 0;
}
.panel-appearance__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--nm-text-primary);
}
.panel-appearance__hint {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--nm-text-secondary);
}
.panel-appearance__note {
  margin: 6px 2px 0;
  font-size: 12px;
  line-height: 1.6;
}
</style>
