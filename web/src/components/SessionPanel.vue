<script setup lang="ts">
//! 会话中心主面板：日志视图。
//! 上下文由聊天区「上下文」胶囊管理，系统提示词由人格配置管理，
//! 此处仅保留日志查看器（SessionPanel 主体直接渲染 LogView）。

import LogView from './LogView.vue';
</script>

<template>
  <div class="session-panel">
    <div class="session-main">
      <LogView />
    </div>
  </div>
</template>

<style scoped>
.session-panel {
  display: flex;
  height: 100%;
  min-height: 0;
}
.session-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 16px;
}
</style>
