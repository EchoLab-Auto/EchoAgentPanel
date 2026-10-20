// PanelPopover 外部点击判定（2026-10 报障回归）：
// 会话弹层里「会话级 API」下拉由 ui-frame NeumorphismSelect 提供，其选项
// 浮层 **teleport 到 body**（不在 .panel-popover 内）。若外部点击判定只认
// panelRef / anchor，则点选项会被当成"点了面板外"→ 关闭面板 → SessionSwitcher
// 被卸载 → 选项 click 丢失，表现为"会话里右侧没法选模型"。
// 契约：teleport 浮层（.nm-select__dropdown 等）内的 pointerdown 不算外部点击。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Teleport, defineComponent, h, nextTick } from 'vue';
import PanelPopover from '../PanelPopover.vue';

function makeHarness(slotExtra: () => unknown) {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  const Harness = defineComponent({
    props: { open: { type: Boolean, default: true } },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h(
          PanelPopover,
          {
            modelValue: props.open,
            anchor,
            'onUpdate:modelValue': (v: boolean) => emit('update:modelValue', v),
          },
          {
            default: () => [
              h('span', { id: 'pp-inside' }, '面板内部'),
              slotExtra() as never,
            ],
          },
        );
    },
  });
  return { Harness, anchor };
}

/** happy-dom 无 PointerEvent，用普通冒泡事件即可（监听器只读 event.target）。 */
function pointerDown(el: Element) {
  el.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
}

describe('PanelPopover：teleport 浮层不算外部点击', () => {
  // 同一文件内 it 之间共享 document：不清理会命中上一用例残留的元素
  // （已卸载组件上的 ref → contains false，产生假阳性失败）。
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('点击 teleport 到 body 的下拉选项时不关闭面板', async () => {
    const { Harness } = makeHarness(() =>
      h(Teleport, { to: 'body' }, [
        h('div', { id: 'pp-floating', class: 'nm-select__dropdown' }, [
          h('div', { id: 'pp-option', class: 'nm-select__option' }, 'kimi'),
        ]),
      ]),
    );
    const wrapper = mount(Harness, { props: { open: false }, attachTo: document.body });
    await nextTick();
    // 真实时序：弹层由用户点击按钮从关闭→打开（PanelPopover 只在切换时挂监听器）
    await wrapper.setProps({ open: true });
    await nextTick();

    const option = document.getElementById('pp-option');
    expect(option).toBeTruthy();
    pointerDown(option!);
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    wrapper.unmount();
  });

  it('点击面板内部不关闭面板', async () => {
    const { Harness } = makeHarness(() => null);
    const wrapper = mount(Harness, { props: { open: false }, attachTo: document.body });
    await nextTick();
    // 真实时序：弹层由用户点击按钮从关闭→打开（PanelPopover 只在切换时挂监听器）
    await wrapper.setProps({ open: true });
    await nextTick();

    pointerDown(document.getElementById('pp-inside')!);
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    wrapper.unmount();
  });

  it('点击真正的面板外部仍然关闭（不回归）', async () => {
    const { Harness } = makeHarness(() => null);
    const wrapper = mount(Harness, { props: { open: false }, attachTo: document.body });
    await nextTick();
    // 真实时序：弹层由用户点击按钮从关闭→打开（PanelPopover 只在切换时挂监听器）
    await wrapper.setProps({ open: true });
    await nextTick();

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    pointerDown(outside);
    await nextTick();

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([false]);
    wrapper.unmount();
    outside.remove();
  });

  it('Escape 仍关闭面板', async () => {
    const { Harness } = makeHarness(() => null);
    const wrapper = mount(Harness, { props: { open: false }, attachTo: document.body });
    await nextTick();
    // 真实时序：弹层由用户点击按钮从关闭→打开（PanelPopover 只在切换时挂监听器）
    await wrapper.setProps({ open: true });
    await nextTick();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    wrapper.unmount();
  });
});

// 防未使用告警（vi 预留）
void vi;
