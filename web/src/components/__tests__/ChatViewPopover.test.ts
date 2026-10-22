//! ChatView 入口弹层回归测试。
//!
//! 背景：ChatView 模板使用 <PanelPopover> 却漏了 import，Vue 运行时 resolveComponent
//! 失败后退化为未知原生元素 <panelpopover>，五个弹层内容被永久内联渲染在聊天区
//! （无 v-if / 定位；开关、外部点击、Escape 全失效）。生产构建剥离 Vue 警告，
//! vitest / vue-tsc / build 均未发现。
//!
//! 2026-10 起入口行弹层改为会话区覆盖面板（`.session-overlay`，渲染在会话视图
//! 内部、不再 Teleport）。本测试锁定：任何时刻都不存在未解析的 <panelpopover>，
//! 且未被打开时覆盖面板内容不渲染。

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
  it('初始加载：无未解析的 <panelpopover> 元素，面板内容不内联渲染', async () => {
    state.trunk = [];
    const w = mountChatView();
    await nextTick();
    expect(document.querySelector('panelpopover')).toBeNull();
    expect(w.element.querySelector('.session-overlay')).toBeNull();
    expect(w.element.querySelector('.stub-workspace-panel')).toBeNull();
  });

  it('点击「工作区」入口：覆盖面板渲染在会话视图内，Escape 关闭', async () => {
    state.trunk = [];
    const w = mountChatView();
    await nextTick();
    const btn = w.findAll('button').find((b) => b.text().includes('工作区'));
    expect(btn, '工作区入口按钮应可见（无 team 时插件/工具默认可用）').toBeTruthy();
    await btn!.trigger('click');
    await nextTick();

    const overlay = w.element.querySelector('.session-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.querySelector('.stub-workspace-panel')).not.toBeNull();
    expect(document.querySelector('panelpopover')).toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    expect(w.element.querySelector('.session-overlay')).toBeNull();
  });

  it('互斥：再点另一个入口直接切换面板（同一时刻只开一个）', async () => {
    state.trunk = [];
    const w = mountChatView();
    await nextTick();
    const buttons = w.findAll('button');
    const workspace = buttons.find((b) => b.text().includes('工作区'))!;
    const tasks = buttons.find((b) => b.text().includes('任务'));
    await workspace.trigger('click');
    await nextTick();
    expect(w.element.querySelectorAll('.session-overlay').length).toBe(1);
    if (tasks) {
      await tasks.trigger('click');
      await nextTick();
      expect(w.element.querySelectorAll('.session-overlay').length).toBe(1);
      expect(w.element.querySelector('.stub-workspace-panel')).toBeNull();
    }
    // 再点同一个按钮 → 关闭
    await (tasks ?? workspace).trigger('click');
    await nextTick();
    expect(w.element.querySelector('.session-overlay')).toBeNull();
  });
});
