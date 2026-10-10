//! ReasoningBlock 折叠与滚动跟随契约测试。
//!
//! 需求（2026-09）：
//! 1. 思考过程默认折叠（历史回放不展开，仅一行头部）；
//! 2. 推演中（打字机进行时）自动展开并滚动跟随最后一行；
//! 3. 推演结束回到默认折叠态；
//! 4. 手动点击头部可随时开合，且手动后不被自动开合覆盖。
//!
//! 注：happy-dom 无布局引擎——`isVisible()` 对 display:none 仍返回 true，
//! 因此折叠态一律以滚动容器 style 中是否含 `display: none` 判定；
//! 滚动跟随通过 stub scrollHeight 验证 scrollTop 被钉到容器底部。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ReasoningBlock from '../ReasoningBlock.vue';

/** 折叠判定：滚动容器被 v-show 隐藏（happy-dom 下 isVisible 不可靠） */
function bodyHidden(wrapper: ReturnType<typeof mount>): boolean {
  const style = wrapper.find('.reasoning-block__body').attributes('style') ?? '';
  return style.includes('display: none');
}

describe('ReasoningBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('历史回放默认折叠，点击头部展开后完整显示', async () => {
    const text = '这是一段历史思考内容'.repeat(10);
    const wrapper = mount(ReasoningBlock, { props: { text, animate: false } });

    // 默认折叠：仅头部（无动画、无「正在推演」）
    expect(bodyHidden(wrapper)).toBe(true);
    expect(wrapper.find('.reasoning-block').classes()).toContain('reasoning-block--collapsed');
    expect(wrapper.find('.reasoning-block__hint').exists()).toBe(false);

    // 展开：完整文本一次性显示（无动画）
    await wrapper.find('.reasoning-block__head').trigger('click');
    expect(bodyHidden(wrapper)).toBe(false);
    expect(wrapper.find('.reasoning-block__text').text()).toBe(text);
    // 展开后滚动复位到顶部（从头阅读）
    const el = wrapper.find('.reasoning-block__body').element as HTMLElement;
    expect(el.scrollTop).toBe(0);

    // 再点折叠
    await wrapper.find('.reasoning-block__head').trigger('click');
    expect(bodyHidden(wrapper)).toBe(true);
  });

  it('推演中自动展开并滚动钉底，结束后回到折叠', async () => {
    const text = '实时思考'.repeat(300); // 长文本 → 打字机分多 tick 播放
    const wrapper = mount(ReasoningBlock, { props: { text, animate: true } });
    await nextTick();

    // 推演开始：自动展开 + 正在推演提示
    expect(bodyHidden(wrapper)).toBe(false);
    expect(wrapper.find('.reasoning-block__hint').text()).toContain('正在推演');

    // stub 容器高度：验证每次推进后滚动被钉到底部（最后一行可见）
    const el = wrapper.find('.reasoning-block__body').element as HTMLElement;
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => 500 });
    await vi.advanceTimersByTimeAsync(24 * 5);
    expect(el.scrollTop).toBe(500);

    // 播放完成：文本完整 + 回到默认折叠态
    await vi.advanceTimersByTimeAsync(7000);
    expect(wrapper.find('.reasoning-block__text').text()).toBe(text);
    expect(bodyHidden(wrapper)).toBe(true);
    expect(wrapper.find('.reasoning-block').classes()).toContain('reasoning-block--collapsed');
  });

  it('推演中手动折叠后不被自动展开覆盖', async () => {
    const text = '实时思考'.repeat(300);
    const wrapper = mount(ReasoningBlock, { props: { text, animate: true } });
    await nextTick();
    expect(bodyHidden(wrapper)).toBe(false);

    // 用户手动折叠
    await wrapper.find('.reasoning-block__head').trigger('click');
    expect(bodyHidden(wrapper)).toBe(true);

    // 继续推进若干 tick：保持折叠（手动优先）
    await vi.advanceTimersByTimeAsync(24 * 10);
    expect(bodyHidden(wrapper)).toBe(true);

    // 播放结束：仍保持用户选择，文本完整
    await vi.advanceTimersByTimeAsync(7000);
    expect(bodyHidden(wrapper)).toBe(true);
    expect(wrapper.find('.reasoning-block__text').text()).toBe(text);
  });

  it('推演中手动展开（先折叠再展开）保持展开', async () => {
    const text = '实时思考'.repeat(300);
    const wrapper = mount(ReasoningBlock, { props: { text, animate: true } });
    await nextTick();

    // 折叠 → 展开
    await wrapper.find('.reasoning-block__head').trigger('click');
    await wrapper.find('.reasoning-block__head').trigger('click');
    expect(bodyHidden(wrapper)).toBe(false);

    // 播放结束：不自动折叠（用户手动展开优先）
    await vi.advanceTimersByTimeAsync(8000);
    expect(bodyHidden(wrapper)).toBe(false);
  });

  it('真流式：内容随增量增长（全量跟随、不播打字机）、自动展开 + 实时提示；结束后回到折叠', async () => {
    const wrapper = mount(ReasoningBlock, {
      props: { text: '第一段', animate: false, streaming: true },
    });
    await nextTick();
    // 流式期间：自动展开 + 实时提示 + 全量显示（内容自身在增长，无打字机会话）。
    expect(bodyHidden(wrapper)).toBe(false);
    expect(wrapper.find('.reasoning-block__hint').text()).toContain('实时输出');
    expect(wrapper.find('.reasoning-block__text').text()).toBe('第一段');
    // 增量增长：全量跟随（分帧由数据驱动，不做打字机切片）。
    await wrapper.setProps({ text: '第一段，继续第二段' });
    await nextTick();
    expect(wrapper.find('.reasoning-block__text').text()).toBe('第一段，继续第二段');
    // 流结束（终值对账）：回到与打字完成一致的默认折叠态。
    await wrapper.setProps({ streaming: false });
    await nextTick();
    expect(bodyHidden(wrapper)).toBe(true);
  });
});
