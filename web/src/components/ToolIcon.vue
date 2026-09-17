<script setup lang="ts">
//! 工具图标：折叠卡与任务行共用的按工具分派 SVG（stroke 风格，14px 基准）。

import { computed } from 'vue';

const props = defineProps<{ name: string }>();

type IconKind =
  | 'bash'
  | 'files'
  | 'code'
  | 'todo'
  | 'calc'
  | 'search'
  | 'subagent'
  | 'message'
  | 'settings'
  | 'menu'
  | 'sudo'
  | 'workspace'
  | 'orchestration'
  | 'tool';

const kind = computed<IconKind>(() => {
  const n = props.name;
  switch (n) {
    case 'bash':
    case 'shell_exec':
    case 'shell_start':
    case 'shell_stop':
      return 'bash';
    case 'read_file':
    case 'write_file':
    case 'edit_file':
    case 'list_files':
      return 'files';
    case 'search_code':
      return 'code';
    case 'checklist':
      return 'todo';
    case 'calculator':
      return 'calc';
    case 'web_search':
      return 'search';
    case 'spawn_subagent':
      return 'subagent';
    case 'send_private_msg':
    case 'send_group_msg':
    case 'send_backend_message':
      return 'message';
    case 'adapter_start':
    case 'adapter_stop':
    case 'adapter_restart':
    case 'adapter_status':
      return 'settings';
    case 'present_menu':
      return 'menu';
    case 'run_sudo':
      return 'sudo';
    case 'workspace':
      return 'workspace';
    case 'spawn_background_task':
    case 'spawn_parallel_task':
      return 'orchestration';
    default:
      return 'tool';
  }
});
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- bash / shell -->
    <template v-if="kind === 'bash'">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </template>
    <!-- 文件读写/列目录 -->
    <template v-else-if="kind === 'files'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </template>
    <!-- 代码搜索 -->
    <template v-else-if="kind === 'code'">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </template>
    <!-- 清单 -->
    <template v-else-if="kind === 'todo'">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </template>
    <!-- 计算器 -->
    <template v-else-if="kind === 'calc'">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="12" x2="8" y2="12" />
      <line x1="12" y1="12" x2="12" y2="12" />
      <line x1="16" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="12" y1="16" x2="12" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </template>
    <!-- 网络搜索 -->
    <template v-else-if="kind === 'search'">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </template>
    <!-- 子代理委派 -->
    <template v-else-if="kind === 'subagent'">
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M12 7.5 5.6 16.6" />
      <path d="M12 7.5 18.4 16.6" />
    </template>
    <!-- 消息发送 -->
    <template v-else-if="kind === 'message'">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </template>
    <!-- 适配器/设置 -->
    <template v-else-if="kind === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </template>
    <!-- 选单 -->
    <template v-else-if="kind === 'menu'">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </template>
    <!-- sudo -->
    <template v-else-if="kind === 'sudo'">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </template>
    <!-- 工作区 -->
    <template v-else-if="kind === 'workspace'">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </template>
    <!-- 后台/并行编排 -->
    <template v-else-if="kind === 'orchestration'">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </template>
    <!-- 默认：扳手 -->
    <template v-else>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </template>
  </svg>
</template>
