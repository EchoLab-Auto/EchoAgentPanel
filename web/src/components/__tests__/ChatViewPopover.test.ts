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

import { describe, it, expect, afterEach, vi } from 'vitest';
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

  it('几何：面板上下边界对齐侧栏（top 0、bottom = entryBottom + 45）', async () => {
    state.trunk = [];
    const w = mountChatView();
    await nextTick();
    // jsdom 无布局：给视图与消息区造一份矩形，使测量分支可走通。
    const rect = (r: Partial<DOMRect>) =>
      ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, ...r }) as DOMRect;
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (this.classList.contains('chat-view')) {
        return rect({ top: 64, bottom: 900, left: 0, right: 1440, width: 1440, height: 836 });
      }
      if (this.classList.contains('chat-view__tray')) {
        return rect({ top: 64, bottom: 900, left: 0, right: 1440, width: 1440, height: 836 });
      }
      return rect({});
    });
    const btn = w.findAll('button').find((b) => b.text().includes('工作区'))!;
    await btn.trigger('click');
    // 打开面板 → watch 触发 → nextTick 里测量（两层微任务）
    await nextTick();
    await nextTick();
    const overlay = w.element.querySelector('.session-overlay') as HTMLElement | null;
    expect(overlay).not.toBeNull();
    const style = overlay!.getAttribute('style') ?? '';
    // 上沿 = 会话视图顶（与侧栏 top 一致）
    expect(style).toContain('top: 0px');
    // 下沿 = 侧栏下界：entryBottom 初值 170 + RAIL_ENTRY_GAP 45 = 215
    // （窄屏另加 keyboardInset；jsdom 下无键盘）
    expect(style).toContain('bottom: 215px');
    spy.mockRestore();
    w.unmount();
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
