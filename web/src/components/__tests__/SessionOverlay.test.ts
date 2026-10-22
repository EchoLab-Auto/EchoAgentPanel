//! 会话区覆盖面板契约（`SessionOverlay`，2026-10 入口行弹层统一）。
//!
//! 用户要求：入口行除 Agent 切换外的弹层统一成一种样式 —— **大小等于会话消息
//! 区**，并且**唤起一个就关掉另一个**。互斥由父组件（ChatView 的单一
//! `entryOverlay` 状态）保证；本组件负责外壳、几何与关闭语义。锁定：
//!   1) 几何 = 父组件传入的 inset（= 会话框顶 → 入口行上边缘，横向扣边栏
//!      留白），缺省贴满容器；
//!   2) 关闭：点面板外 / Esc / `padded=false` 时的内容排布；
//!   3) `ignore` 元素（入口行）内的按下**不算**外部（否则点另一个按钮会先关
//!      再被 click 重新打开，且 ui-frame 下拉选项点不动）。

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import SessionOverlay from '../SessionOverlay.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const Slot = defineComponent({
  name: 'Slot',
  setup() {
    return () => h('div', { class: 'slot-body' }, '内容');
  },
});

function mountOverlay(props: Record<string, unknown> = {}) {
  wrapper = mount(SessionOverlay, {
    props: { open: true, ...props },
    slots: { default: () => h(Slot) },
    attachTo: document.body,
  });
  return wrapper;
}

describe('SessionOverlay 会话区覆盖面板', () => {
  it('关闭时不渲染；打开时渲染外壳与内容', async () => {
    const w = mountOverlay({ open: false });
    expect(w.find('.session-overlay').exists()).toBe(false);
    await w.setProps({ open: true });
    await nextTick();
    expect(w.find('.session-overlay').exists()).toBe(true);
    expect(w.find('.slot-body').exists()).toBe(true);
    // 无障碍：dialog + 名称
    w.unmount();
    const named = mountOverlay({ label: '工作区会话' });
    expect(named.find('.session-overlay').attributes('role')).toBe('dialog');
    expect(named.find('.session-overlay').attributes('aria-label')).toBe('工作区会话');
  });

  it('inset 写成四边 px；缺省（null）贴满容器', async () => {
    const w = mountOverlay({ inset: { top: 64, right: 324, bottom: 180, left: 0 } });
    const style = w.find('.session-overlay').attributes('style') ?? '';
    for (const part of ['top: 64px', 'right: 324px', 'bottom: 180px', 'left: 0px']) {
      expect(style, `缺少 ${part}`).toContain(part);
    }
    w.unmount();

    // 缺省 = 贴满容器（四边 0；不用 `inset` 简写——jsdom 不认）
    const flush = mountOverlay();
    const flushStyle = flush.find('.session-overlay').attributes('style') ?? '';
    for (const part of ['top: 0px', 'right: 0px', 'bottom: 0px', 'left: 0px']) {
      expect(flushStyle, `缺少 ${part}`).toContain(part);
    }
  });

  it('padded 缺省给内容统一内边距；padded=false 交给内容自己排', async () => {
    const w = mountOverlay();
    expect(w.find('.session-overlay__body').classes()).not.toContain(
      'session-overlay__body--flush',
    );
    w.unmount();
    const flush = mountOverlay({ padded: false });
    expect(flush.find('.session-overlay__body').classes()).toContain(
      'session-overlay__body--flush',
    );
  });

  it('Esc 关闭（捕获并阻断下层响应）', async () => {
    let outer = 0;
    document.addEventListener('keydown', () => (outer += 1));
    const w = mountOverlay();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    // stopPropagation：外层的同一次 keydown 收不到（外层计数保持 0）
    expect(outer).toBe(0);
    expect(w.emitted('close')?.length).toBe(1);
    document.removeEventListener('keydown', () => (outer += 1));
  });

  it('点面板外关闭；点面板内不关', async () => {
    const w = mountOverlay();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(w.emitted('close')?.length).toBe(1);

    w.find('.slot-body').element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(w.emitted('close')?.length).toBe(1);
  });

  it('ignore 元素（入口行）内的按下不算外部：点另一个入口按钮不关闭', async () => {
    const bar = document.createElement('div');
    bar.className = 'entry-row';
    document.body.appendChild(bar);
    const w = mount(SessionOverlay, {
      props: { open: true, ignore: bar },
      slots: { default: () => h(Slot) },
      attachTo: document.body,
    });
    bar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(w.emitted('close')).toBeUndefined();
    w.unmount();
  });

  it('ui-frame teleport 浮层（下拉/菜单）内的按下不算外部', async () => {
    const dropdown = document.createElement('div');
    dropdown.className = 'nm-select__dropdown';
    document.body.appendChild(dropdown);
    const w = mountOverlay();
    dropdown.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(w.emitted('close')).toBeUndefined();
  });

  it('关闭后摘掉全局监听（不再对 pointerdown 反应）', async () => {
    const w = mountOverlay();
    await w.setProps({ open: false });
    await nextTick();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(w.emitted('close')).toBeUndefined();
  });

  it('同一时刻只有一个开的实例（互斥的渲染前提）', async () => {
    const openId = ref<'a' | 'b' | null>('a');
    const Host = defineComponent({
      setup() {
        return () =>
          h('div', [
            h(SessionOverlay, { open: openId.value === 'a' }, { default: () => h('div', { class: 'a' }) }),
            h(SessionOverlay, { open: openId.value === 'b' }, { default: () => h('div', { class: 'b' }) }),
          ]);
      },
    });
    const host = mount(Host, { attachTo: document.body });
    await nextTick();
    expect(host.findAll('.session-overlay').length).toBe(1);
    openId.value = 'b';
    await nextTick();
    const overlays = host.findAll('.session-overlay');
    expect(overlays.length).toBe(1);
    expect(host.find('.a').exists()).toBe(false);
    expect(host.find('.b').exists()).toBe(true);
    host.unmount();
  });
});
