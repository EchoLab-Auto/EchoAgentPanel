<script setup lang="ts">
//! 聊天主视图：消息列表 + 固定底部输入区（flex 布局，输入区占位不遮挡消息）。
//! 渲染层整体由 @echolab-auto/ui-frame/chat 承担（吸底滚动、回到底部、
//! IME 组合保护、Markdown、工具/思考/分支合并块），这里只做数据适配。
//! 多模态：支持图片粘贴 / 文件选择，data URL 随消息发送给 Core。

import { computed, ref } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import {
  ChatComposer,
  ChatMessageItem,
  ChatMessageList,
  type ChatMessage,
} from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
import { formatTime, toChatMessage, type ChatMessageWithImages } from '../chat-adapter';

const props = defineProps<{ sessionId: string }>();
const emit = defineEmits<{
  send: [content: string, images: string[]];
  cancel: [];
}>();

const input = ref('');
/** 待发送图片（data URL 形式） */
const attachments = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

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

// ── 图片工具：压缩为 data URL（最长边 1600，JPEG 0.85）──
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片解码失败'));
      img.onload = () => {
        const MAX = 1600;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        try {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('canvas 不可用');
          ctx.drawImage(img, 0, 0, w, h);
          const isPng = file.type === 'image/png';
          resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85));
        } catch (e) {
          reject(e);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function addFiles(files: FileList | File[]) {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
  for (const file of list) {
    try {
      attachments.value.push(await fileToDataUrl(file));
    } catch {
      // 跳过无法解码的文件
    }
  }
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1);
}

function onPaste(event: ClipboardEvent) {
  const files = event.clipboardData?.files;
  if (files && files.length > 0) {
    event.preventDefault();
    void addFiles(files);
  }
}

// 发送：文本 + 图片一起发出；发送后清空附件。
function onSend(content: string) {
  emit('send', content, attachments.value.slice());
  attachments.value = [];
}

// 消息是否带图（ChatMessage 类型无 images，扩展字段来自 chat-adapter）
function imagesOf(message: ChatMessage): string[] {
  return (message as ChatMessageWithImages).images ?? [];
}
</script>

<template>
  <div class="chat-view" @paste="onPaste">
    <!-- 消息列表：flex:1，内部 ChatTray 独立滚动 -->
    <ChatMessageList
      class="chat-view__list"
      :messages="messages"
      :format-time="formatTime"
      :empty-text="emptyText"
    >
      <template #message="slot">
        <div v-if="imagesOf(slot.message).length" class="chat-view__images">
          <img
            v-for="(img, i) in imagesOf(slot.message)"
            :key="i"
            :src="img"
            class="chat-view__image"
            alt=""
          />
        </div>
        <ChatMessageItem :message="slot.message" :format-time="formatTime" />
      </template>
    </ChatMessageList>

    <!-- 输入区：作为 flex 子项固定占位（不遮挡消息），视觉上悬浮 -->
    <div class="chat-composer-float">
      <!-- 待发送图片预览 -->
      <div v-if="attachments.length" class="chat-view__attachments">
        <div v-for="(img, i) in attachments" :key="i" class="chat-view__attach">
          <img :src="img" class="chat-view__attach-img" alt="" />
          <button class="chat-view__attach-remove" title="移除" @click="removeAttachment(i)">
            ×
          </button>
        </div>
      </div>
      <!-- 契约：ChatComposer 提供 #actions 插槽时*替换*渲染默认发送按钮，
           因此必须自己渲染 submit 按钮；删除该插槽会恢复库默认发送按钮。 -->
      <ChatComposer
        v-model="input"
        :disabled="!connected"
        cancelable
        :rows="2"
        :placeholder="placeholder"
        @send="onSend"
        @cancel="emit('cancel')"
      >
        <template #meta>
          <span class="chat-view__session" title="当前会话">{{ sessionId }}</span>
        </template>
        <template #actions="{ submit, canSubmit }">
          <button
            class="chat-view__attach-btn"
            title="添加图片（或直接粘贴截图）"
            aria-label="添加图片"
            @click="fileInput?.click()"
          >
            <svg
              class="chat-view__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-4.5-4.5a2 2 0 0 0-2.83 0L5 19" />
            </svg>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="chat-view__file-input"
            @change="
              (e) => {
                const el = e.target as HTMLInputElement;
                if (el.files?.length) void addFiles(el.files);
                el.value = '';
              }
            "
          />
          <NeumorphismButton
            class="chat-view__send"
            size="small"
            variant="raised"
            shape="pill"
            :disabled="!canSubmit"
            @click="submit"
          >
            <svg
              class="chat-view__icon chat-view__icon--btn"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            <span>发送</span>
          </NeumorphismButton>
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
  padding: 10px 12px 12px;
  border-radius: 16px;
  background: var(--nm-surface-raised);
  border: 1px solid var(--nm-border-subtle);
  box-shadow:
    0 8px 24px var(--nm-shadow-ambient-xl, rgba(0, 0, 0, 0.35)),
    4px 4px 12px var(--nm-shadow-dark),
    -2px -2px 8px var(--nm-shadow-light);
}

/* actions 行：图片按钮 + 发送按钮底对齐、间距统一 */
.chat-composer-float :deep(.nm-chat-composer__row) {
  align-items: flex-end;
  gap: 10px;
}
.chat-composer-float :deep(.nm-chat-composer__field) {
  flex: 1;
  min-width: 0;
}

/* 图标基准：与 neumorphism stroke 风格保持一致 */
.chat-view__icon {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
}

/* 图片附件按钮：方形圆角，hover 渐变高亮 */
.chat-view__attach-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--nm-border-subtle);
  border-radius: 10px;
  background: var(--nm-surface-color);
  color: var(--nm-text-secondary);
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;
}
.chat-view__attach-btn:hover {
  color: var(--nm-text-primary);
  background: var(--nm-surface-raised);
  transform: translateY(-1px);
}
.chat-view__attach-btn:active {
  transform: translateY(0);
}

/* 发送按钮：图标 + 文字内联 */
.chat-view__send {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 14px;
}
.chat-view__icon--btn {
  width: 15px;
  height: 15px;
}

.chat-view__session {
  font-family: var(--nm-font-mono, monospace);
  font-size: 12px;
  color: var(--nm-text-secondary, #888);
}

/* 消息内图片 */
.chat-view__images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.chat-view__image {
  max-width: 260px;
  max-height: 200px;
  border-radius: 12px;
  border: 1px solid var(--nm-border-subtle);
  object-fit: contain;
  background: var(--nm-bg-color);
  box-shadow: 0 2px 10px var(--nm-shadow-dark, rgba(0, 0, 0, 0.28));
}

/* 待发送附件预览 */
.chat-view__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.chat-view__attach {
  position: relative;
}
.chat-view__attach-img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--nm-border-subtle);
  box-shadow: 0 2px 8px var(--nm-shadow-dark, rgba(0, 0, 0, 0.25));
  transition: transform 0.15s ease;
}
.chat-view__attach:hover .chat-view__attach-img {
  transform: translateY(-1px);
}
.chat-view__attach-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--nm-surface-color);
  color: var(--nm-text-secondary);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 2px 6px var(--nm-shadow-dark, rgba(0, 0, 0, 0.35));
  transition: color 0.15s ease, background 0.15s ease;
}
.chat-view__attach-remove:hover {
  color: var(--nm-text-primary);
  background: var(--nm-surface-raised);
}
.chat-view__attach-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.85;
}
.chat-view__attach-btn:hover {
  opacity: 1;
}
.chat-view__file-input {
  display: none;
}
</style>
