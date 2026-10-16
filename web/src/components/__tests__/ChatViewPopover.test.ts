//! ChatView 入口弹层回归测试。
//!
//! 背景：ChatView 模板使用 <PanelPopover> 却漏了 import，Vue 运行时 resolveComponent
//! 失败后退化为未知原生元素 <panelpopover>，五个弹层内容被永久内联渲染在聊天区
//! （无 Teleport / v-if / 定位；开关、外部点击、Escape 全失效）。生产构建剥离
//! Vue 警告，vitest / vue-tsc / build 均未发现。本测试锁定：弹层必须渲染为
//! Teleport 到 body 的 .panel-popover，且任何时刻都不存在 <panelpopover> 元素。

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../ChatView.vue';
import { state } from '../../store';

const WorkspacePanelStub = defineComponent({
  name: 'WorkspacePanel',
  setup() {
    return () => h('div', { class: 'stub-workspace-panel' }, 'workspace');
  },
});

const ChatComposerStub = defineComponent({
  name: 'ChatComposer',
  setup() {
    return () => h('div', { class: 'stub-composer' });
  },
});

let wrapper: VueWrapper | null = null;

function mountChatView() {
  wrapper = mount(ChatView, {
    props: { sessionId: 'local:tui::local_user' },
    attachTo: document.body,
    global: {
      stubs: {
        ChatComposer: ChatComposerStub,
        WorkspacePanel: WorkspacePanelStub,
      },
    },
  });
  return wrapper;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('ChatView 入口弹层（PanelPopover）', () => {
  it('初始加载：无未解析的 <panelpopover> 元素，弹层内容不内联渲染', async () => {
    state.trunk = [];
    mountChatView();
    await nextTick();
    expect(document.querySelector('panelpopover')).toBeNull();
    expect(document.body.querySelector('.panel-popover')).toBeNull();
    expect(document.body.querySelector('.stub-workspace-panel')).toBeNull();
  });

  it('点击「工作区」入口：弹层以 .panel-popover 渲染到 body，Escape 关闭', async () => {
    state.trunk = [];
    const w = mountChatView();
    await nextTick();
    const btn = w.findAll('button').find((b) => b.text().includes('工作区'));
    expect(btn, '工作区入口按钮应可见（无 team 时插件/工具默认可用）').toBeTruthy();
    await btn!.trigger('click');
    await nextTick();

    const popover = document.body.querySelector('.panel-popover');
    expect(popover).not.toBeNull();
    // Teleport 到 body：弹层不在 ChatView 根元素内部
    expect(w.element.contains(popover)).toBe(false);
    expect(popover!.querySelector('.stub-workspace-panel')).not.toBeNull();
    expect(document.querySelector('panelpopover')).toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    expect(document.body.querySelector('.panel-popover')).toBeNull();
  });
});
