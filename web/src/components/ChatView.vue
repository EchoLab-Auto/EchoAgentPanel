<script setup lang="ts">
//! 聊天主视图：消息列表 + 固定底部输入区（flex 布局，输入区占位不遮挡消息）。
//! 渲染层整体由 @echolab-auto/ui-frame/chat 承担（吸底滚动、回到底部、
//! IME 组合保护、Markdown、工具/思考/分支合并块），这里只做数据适配。

import { computed, ref } from 'vue';
import { ChatComposer, ChatMessageList, type ChatMessage } from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
import { formatTime, toChatMessage } from '../chat-adapter';

const props = defineProps<{ sessionId: string }>();
const emit = defineEmits<{ send: [content: string]; cancel: [] }>();

const input = ref('');

const connected = computed(() => state.connected);

// 按会话过滤：全局视图显示全部；具体会话只显示归属该会话的消息。
const messages = computed<ChatMessage[]>(() => {
  const list =
    props.sessionId === 'global'
      ? state.trunk
      : state.trunk.filter((m) => m.sessionId === props.sessionId);
  return list.map(toChatMessage);
});

const emptyText = computed(() =>
  props.sessionId === 'global'
    ? '（暂无消息，从下方输入开始对话）'
    : `（会话 ${props.sessionId} 暂无消息，从下方输入开始对话）`,
);

// 空串占位 → 库回退到 locale 默认（输入消息，Enter 发送…）。
const placeholder = computed(() => (connected.value ? '' : '未连接到 Core，暂时无法发送'));
</script>

<template>
  <div class="chat-view">
    <!-- 消息列表：flex:1，内部 ChatTray 独立滚动 -->
    <ChatMessageList
      class="chat-view__list"
      :messages="messages"
      :format-time="formatTime"
      :empty-text="emptyText"
    />
    <!-- 输入区：作为 flex 子项固定占位（不遮挡消息），视觉上悬浮 -->
    <div class="chat-composer-float">
      <ChatComposer
        v-model="input"
        :disabled="!connected"
        cancelable
        :placeholder="placeholder"
        @send="emit('send', $event)"
        @cancel="emit('cancel')"
      >
        <template #meta>
          <span class="chat-view__session" title="当前会话">{{ sessionId }}</span>
        </template>
      </ChatComposer>
    </div>
  </div>
</template>

<style scoped>
/*
 * 布局契约（有对应测试，改动需同步更新 src/components/ChatView.test.ts）：
 * 1. .chat-view 是纵向 flex 容器，高度占满父级；
 * 2. .chat-view__list flex:1 + min-height:0 —— 滚动只在 ChatTray 内部发生；
 * 3. .chat-composer-float 是 flex 子项（flex:0 0 auto），占位而非 absolute 遮挡；
 *    消息列表因此永远在输入区上方，最后一条消息不会被遮住。
 */
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* ChatTray 需要定高父级才能出现滚动区 */
.chat-view__list {
  flex: 1;
  min-height: 0;
}

/* 浮动输入区：占位子项（不是 absolute），视觉上悬浮 */
.chat-composer-float {
  flex: 0 0 auto;
  margin: 0 12px 12px;
  padding: 8px 10px 10px;
  background: var(--nm-surface-raised);
  border: 1px solid var(--nm-border-subtle);
  border-radius: 14px;
  box-shadow:
    0 8px 24px var(--nm-shadow-ambient-xl, rgba(0, 0, 0, 0.35)),
    4px 4px 12px var(--nm-shadow-dark),
    -2px -2px 8px var(--nm-shadow-light);
}

.chat-view__session {
  font-family: var(--nm-font-mono, monospace);
  font-size: 12px;
  color: var(--nm-text-secondary, #888);
}
</style>
