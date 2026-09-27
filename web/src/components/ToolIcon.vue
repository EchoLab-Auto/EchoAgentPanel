<script setup lang="ts">
//! 工具图标：折叠卡与任务行共用的按工具分派 SVG（stroke 风格，14px 基准）。
//! loading 时播放该工具专属的图标动画（复用图标本体路径，无额外轨道元素）。

import { computed } from 'vue';

const props = withDefaults(defineProps<{ name: string; loading?: boolean }>(), {
  loading: false,
});

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
    case 'workspace':
      return 'workspace';
    case 'spawn_background_task':
    case 'spawn_parallel_task':
      return 'orchestration';
    default:
      return 'tool';
  }
});

const animClass = computed(() => (props.loading ? `tool-icon--anim-${kind.value}` : ''));
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
    :class="animClass"
  >
    <!-- bash / shell -->
    <template v-if="kind === 'bash'">
      <polyline class="ti-bash__prompt" points="4 17 10 11 4 5" />
      <line class="ti-bash__cursor" x1="12" y1="19" x2="20" y2="19" />
    </template>
    <!-- 文件读写/列目录 -->
    <template v-else-if="kind === 'files'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline class="ti-files__fold" points="14 2 14 8 20 8" />
    </template>
    <!-- 代码搜索 -->
    <template v-else-if="kind === 'code'">
      <polyline class="ti-code__r" points="16 18 22 12 16 6" />
      <polyline class="ti-code__l" points="8 6 2 12 8 18" />
    </template>
    <!-- 清单 -->
    <template v-else-if="kind === 'todo'">
      <path class="ti-todo__check" d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </template>
    <!-- 计算器 -->
    <template v-else-if="kind === 'calc'">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line class="ti-calc__dot ti-calc__dot--1" x1="8" y1="12" x2="8" y2="12" />
      <line class="ti-calc__dot ti-calc__dot--2" x1="12" y1="12" x2="12" y2="12" />
      <line class="ti-calc__dot ti-calc__dot--3" x1="16" y1="12" x2="16" y2="12" />
      <line class="ti-calc__dot ti-calc__dot--4" x1="8" y1="16" x2="8" y2="16" />
      <line class="ti-calc__dot ti-calc__dot--5" x1="12" y1="16" x2="12" y2="16" />
      <line class="ti-calc__dot ti-calc__dot--6" x1="16" y1="16" x2="16" y2="16" />
    </template>
    <!-- 网络搜索 -->
    <template v-else-if="kind === 'search'">
      <g class="ti-search__lens">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </g>
    </template>
    <!-- 子代理委派 -->
    <template v-else-if="kind === 'subagent'">
      <g class="ti-subagent__nodes">
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="5" cy="19" r="2.5" />
        <circle cx="19" cy="19" r="2.5" />
      </g>
      <path class="ti-subagent__link ti-subagent__link--1" d="M12 7.5 5.6 16.6" />
      <path class="ti-subagent__link ti-subagent__link--2" d="M12 7.5 18.4 16.6" />
    </template>
    <!-- 消息发送 -->
    <template v-else-if="kind === 'message'">
      <path class="ti-message__bubble" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </template>
    <!-- 适配器/设置 -->
    <template v-else-if="kind === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path class="ti-settings__gear" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </template>
    <!-- 工作区 -->
    <template v-else-if="kind === 'workspace'">
      <path class="ti-workspace__folder" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </template>
    <!-- 后台/并行编排 -->
    <template v-else-if="kind === 'orchestration'">
      <rect class="ti-orch__q ti-orch__q--1" x="3" y="3" width="7" height="7" rx="1.5" />
      <rect class="ti-orch__q ti-orch__q--2" x="14" y="3" width="7" height="7" rx="1.5" />
      <rect class="ti-orch__q ti-orch__q--3" x="3" y="14" width="7" height="7" rx="1.5" />
      <rect class="ti-orch__q ti-orch__q--4" x="14" y="14" width="7" height="7" rx="1.5" />
    </template>
    <!-- 默认：扳手 -->
    <template v-else>
      <path class="ti-tool__wrench" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </template>
  </svg>
</template>

<style scoped>
/* 各工具专属加载动画：只动图标本体的路径元素（stroke-dash 描边、
   透明度闪烁、局部旋转/位移），无额外轨道元素。
   stroke-dasharray 值按各路径实际长度调校（大了只会表现为"常亮"，无害）。 */

/* bash：提示符不动，下划线光标闪烁 */
.tool-icon--anim-bash .ti-bash__cursor {
  animation: ti-blink 0.9s steps(2, start) infinite;
}
@keyframes ti-blink {
  50% { opacity: 0; }
}

/* 文件：折角反复"翻开"（折线透明度脉动） */
.tool-icon--anim-files .ti-files__fold {
  animation: ti-pulse-opacity 1.2s ease-in-out infinite;
}
@keyframes ti-pulse-opacity {
  50% { opacity: 0.25; }
}

/* 代码：两侧尖括号交替向内收（编写感） */
.tool-icon--anim-code .ti-code__l {
  animation: ti-code-l 1s ease-in-out infinite;
}
.tool-icon--anim-code .ti-code__r {
  animation: ti-code-r 1s ease-in-out infinite;
}
@keyframes ti-code-l {
  50% { transform: translateX(1.5px); }
}
@keyframes ti-code-r {
  50% { transform: translateX(-1.5px); }
}

/* 清单：对勾反复描画 */
.tool-icon--anim-todo .ti-todo__check {
  stroke-dasharray: 20;
  animation: ti-draw 1.4s ease-in-out infinite;
}
@keyframes ti-draw {
  0% { stroke-dashoffset: 20; }
  60% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}

/* 计算器：按键逐个点亮（波浪） */
.tool-icon--anim-calc .ti-calc__dot {
  animation: ti-pulse-opacity 1.2s ease-in-out infinite;
}
.tool-icon--anim-calc .ti-calc__dot--1 { animation-delay: 0s; }
.tool-icon--anim-calc .ti-calc__dot--2 { animation-delay: 0.15s; }
.tool-icon--anim-calc .ti-calc__dot--3 { animation-delay: 0.3s; }
.tool-icon--anim-calc .ti-calc__dot--4 { animation-delay: 0.45s; }
.tool-icon--anim-calc .ti-calc__dot--5 { animation-delay: 0.6s; }
.tool-icon--anim-calc .ti-calc__dot--6 { animation-delay: 0.75s; }

/* 搜索：放大镜明显巡游（大范围平移 + 缩放） */
.tool-icon--anim-search .ti-search__lens {
  transform-box: view-box;
  transform-origin: center;
  animation: ti-search-move 1.3s ease-in-out infinite;
}
@keyframes ti-search-move {
  0% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(-2.2px, -2.2px) scale(1.12); }
  50% { transform: translate(0, 0) scale(1); }
  75% { transform: translate(2.2px, 2.2px) scale(0.9); }
  100% { transform: translate(0, 0) scale(1); }
}

/* 子代理：两条连线依次描画（任务下发到两个子节点） */
.tool-icon--anim-subagent .ti-subagent__link {
  stroke-dasharray: 11;
  animation: ti-draw-link 1.3s ease-in-out infinite;
}
.tool-icon--anim-subagent .ti-subagent__link--2 {
  animation-delay: 0.45s;
}
@keyframes ti-draw-link {
  0% { stroke-dashoffset: 11; }
  55% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}

/* 消息：气泡轻轻"发送"（右上弹出回弹） */
.tool-icon--anim-message .ti-message__bubble {
  transform-box: view-box;
  transform-origin: center;
  animation: ti-message-send 1.2s ease-in-out infinite;
}
@keyframes ti-message-send {
  0% { transform: translate(0, 0) scale(1); }
  35% { transform: translate(1px, -1.2px) scale(1.06); }
  70% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(0, 0) scale(1); }
}

/* 设置：齿轮匀速转动 */
.tool-icon--anim-settings .ti-settings__gear {
  transform-box: view-box;
  transform-origin: center;
  animation: ti-gear-spin 2.4s linear infinite;
}
@keyframes ti-gear-spin {
  to { transform: rotate(360deg); }
}

/* 工作区：文件夹呼吸（访问中） */
.tool-icon--anim-workspace .ti-workspace__folder {
  animation: ti-pulse-opacity 1.3s ease-in-out infinite;
}

/* 编排：四宫格逐格点亮（分支逐个启动） */
.tool-icon--anim-orchestration .ti-orch__q {
  animation: ti-pulse-opacity 1.2s ease-in-out infinite;
}
.tool-icon--anim-orchestration .ti-orch__q--1 { animation-delay: 0s; }
.tool-icon--anim-orchestration .ti-orch__q--2 { animation-delay: 0.3s; }
.tool-icon--anim-orchestration .ti-orch__q--3 { animation-delay: 0.6s; }
.tool-icon--anim-orchestration .ti-orch__q--4 { animation-delay: 0.9s; }

/* 默认扳手：小幅拧动 */
.tool-icon--anim-tool .ti-tool__wrench {
  transform-box: view-box;
  transform-origin: center;
  animation: ti-wrench-turn 1.3s ease-in-out infinite;
}
@keyframes ti-wrench-turn {
  30% { transform: rotate(-14deg); }
  65% { transform: rotate(10deg); }
  100% { transform: rotate(0deg); }
}
</style>
