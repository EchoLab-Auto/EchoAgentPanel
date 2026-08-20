<script setup lang="ts">
//! 聊天主视图：消息列表 + 输入区。
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
    <ChatMessageList
      class="chat-view__list"
      :messages="messages"
      :format-time="formatTime"
      :empty-text="emptyText"
    />
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
</template>

<style scoped>
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
.chat-view__session {
  font-family: var(--nm-font-mono, monospace);
  font-size: 12px;
  color: var(--nm-text-secondary, #888);
}
</style>
