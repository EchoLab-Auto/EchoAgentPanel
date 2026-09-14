//! MenuCard（会话区内联选单）契约测试。
//!
//! 锁定四件事（对应 Core 的 `present_menu` 语义）：
//!   1. 选项渲染顺序与数量 = MenuRequest 载荷（id 回传要能唯一映射）；
//!   2. 点击选项 → `menu_answer` 带该 id；Esc/取消 → option_id=null
//!      （**不许**把取消当成某个选项）；
//!   3. store 的 MenuRequest/MenuResolved 处理：请求挂载、结束事件卸载；
//!   4. **内联契约**（2026-09-14，替代弹窗）：选单渲染在会话区消息流尾部
//!      （ChatView 合成条目），且只在该选单归属当前会话时出现。

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

vi.mock('../../connection', () => ({
  sendMenuAnswer: vi.fn(),
}));

import { sendMenuAnswer } from '../../connection';
import MenuCard from '../MenuCard.vue';
import ChatView from '../ChatView.vue';
import { state, dispatch } from '../../store';
import type { MenuPrompt } from '../../state';

// ── 库组件 mock：不渲染真实 ui-frame ──
const ButtonStub = defineComponent({
  name: 'NeumorphismButton',
  setup(_, { slots, attrs }) {
    return () => h('button', { class: 'stub-button', onClick: attrs.onClick as () => void }, slots.default?.());
  },
});
const TagStub = defineComponent({
  name: 'NeumorphismTag',
  setup(_, { slots }) {
    return () => h('span', { class: 'stub-tag' }, slots.default?.());
  },
});

function prompt(over: Partial<MenuPrompt> = {}): MenuPrompt {
  return {
    request_id: 7,
    session_id: 'local:workspace:echo-agent:local_user',
    title: '用哪个方案继续？',
    description: '两个方案都可以，选一个。',
    options: [
      { id: 'a', label: '方案 A', description: '更快' },
      { id: 'b', label: '方案 B', description: '' },
    ],
    timeoutSecs: 300,
    ...over,
  };
}

function mountCard(p: MenuPrompt = prompt()) {
  return mount(MenuCard, {
    props: { prompt: p },
    global: {
      stubs: {
        NeumorphismButton: ButtonStub,
        NeumorphismTag: TagStub,
      },
    },
  });
}

beforeEach(() => {
  vi.mocked(sendMenuAnswer).mockClear();
});

describe('MenuCard 选择语义', () => {
  it('按载荷顺序渲染全部选项与标题', () => {
    const wrapper = mountCard();
    const options = wrapper.findAll('.menu-card__option');
    expect(options).toHaveLength(2);
    expect(options[0].text()).toContain('方案 A');
    expect(options[0].text()).toContain('更快');
    expect(options[1].text()).toContain('方案 B');
    expect(wrapper.find('.menu-card__title').text()).toBe('用哪个方案继续？');
    // 内联卡片：不经过任何弹窗/遮罩壳。
    expect(wrapper.find('.nm-modal').exists()).toBe(false);
  });

  it('点击选项回传该选项 id', async () => {
    const wrapper = mountCard();
    await wrapper.findAll('.menu-card__option')[1].trigger('click');
    expect(sendMenuAnswer).toHaveBeenCalledWith({ request_id: 7, option_id: 'b' });
  });

  it('取消按钮回传 null（不做选择）', async () => {
    const wrapper = mountCard();
    await wrapper.find('.stub-button').trigger('click');
    expect(sendMenuAnswer).toHaveBeenCalledWith({ request_id: 7, option_id: null });
  });

  it('Esc 取消、数字键选择', async () => {
    const wrapper = mountCard();
    const card = wrapper.find('.menu-card');
    await card.trigger('keydown', { key: '2' });
    expect(sendMenuAnswer).toHaveBeenCalledWith({ request_id: 7, option_id: 'b' });
    vi.mocked(sendMenuAnswer).mockClear();
    await card.trigger('keydown', { key: 'Escape' });
    expect(sendMenuAnswer).toHaveBeenCalledWith({ request_id: 7, option_id: null });
    // 越界数字键不发送任何应答。
    vi.mocked(sendMenuAnswer).mockClear();
    await card.trigger('keydown', { key: '9' });
    expect(sendMenuAnswer).not.toHaveBeenCalled();
  });
});

// ── 内联契约：选单出现在会话区消息流尾部（不再弹窗） ──
const ListStub = defineComponent({
  name: 'ChatMessageList',
  props: ['messages', 'emptyText'],
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        { class: 'stub-chat-list' },
        (props.messages ?? []).map((m: { id: string | number }) =>
          slots.message?.({ key: m.id, message: m }),
        ),
      );
  },
});
const ComposerStub = defineComponent({
  name: 'ChatComposer',
  setup: () => () => h('div', { class: 'stub-composer' }),
});

function mountChatView(sessionId: string) {
  return mount(ChatView, {
    props: { sessionId },
    global: {
      stubs: {
        ChatMessageList: ListStub,
        ChatComposer: ComposerStub,
        NeumorphismButton: ButtonStub,
        NeumorphismTag: TagStub,
      },
    },
  });
}

describe('选单内联于会话区（不再弹窗）', () => {
  beforeEach(() => {
    state.menuPrompt = null;
    state.trunk = [];
  });

  it('归属当前会话：选单卡片出现在消息流里', () => {
    state.menuPrompt = prompt({ session_id: 'local:tui::one' });
    const wrapper = mountChatView('local:tui::one');
    expect(wrapper.find('.stub-chat-list').exists()).toBe(true);
    expect(wrapper.find('.menu-card').exists()).toBe(true);
    expect(wrapper.find('.menu-card').text()).toContain('方案 A');
  });

  it('非当前会话：选单不越会话显示', () => {
    state.menuPrompt = prompt({ session_id: 'local:tui::one' });
    const wrapper = mountChatView('local:tui::two');
    expect(wrapper.find('.menu-card').exists()).toBe(false);
  });

  it('全局视图：选单可见（与消息同一过滤语义）', () => {
    state.menuPrompt = prompt({ session_id: 'local:tui::one' });
    const wrapper = mountChatView('global');
    expect(wrapper.find('.menu-card').exists()).toBe(true);
  });
});

describe('state 选单生命周期', () => {
  it('MenuRequest 挂载弹层、MenuResolved 卸载（含取消提示）', () => {
    state.menuPrompt = null;
    state.toasts = [];
    dispatch({
      MenuRequest: {
        request_id: 3,
        session_id: 'local:tui::local_user',
        title: '继续吗？',
        options: [{ id: '1', label: '继续' }, { id: '2', label: '停止' }],
        timeout_secs: 300,
      },
    });
    // 显式断言读回（`state.menuPrompt` 在赋值 null 后被 TS 收窄，需断言类型）。
    const afterRequest = state.menuPrompt as MenuPrompt | null;
    expect(afterRequest?.request_id).toBe(3);
    expect(afterRequest?.options).toHaveLength(2);

    // 选定：静默关闭（选项本身即反馈）。
    dispatch({ MenuResolved: { request_id: 3, accepted: true, message: '已选择「继续」' } });
    expect(state.menuPrompt).toBeNull();

    dispatch({
      MenuRequest: {
        request_id: 4,
        session_id: 'local:tui::local_user',
        title: '继续吗？',
        options: [{ id: '1', label: '继续' }, { id: '2', label: '停止' }],
        timeout_secs: 300,
      },
    });
    // 取消/超时：关闭并提示。
    dispatch({ MenuResolved: { request_id: 4, accepted: false, message: '选单已取消' } });
    expect(state.menuPrompt).toBeNull();
    expect(state.toasts.some((t) => t.text.includes('选单已取消'))).toBe(true);

    // 旧请求的结束事件不得关掉当前弹层。
    state.menuPrompt = prompt({ request_id: 9 });
    dispatch({ MenuResolved: { request_id: 4, accepted: false, message: '旧事件' } });
    const afterStale = state.menuPrompt as MenuPrompt | null;
    expect(afterStale?.request_id).toBe(9);
    state.menuPrompt = null;
  });
});
