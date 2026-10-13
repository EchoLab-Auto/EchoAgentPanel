//! ReasoningText 正文播放契约测试。
//!
//! 需求（2026-09 原 ReasoningBlock 契约，2026-10 拆出正文层后沿用）：
//! 1. 历史回放（animate=false）：一次性完整显示，不播打字机；
//! 2. 打字机：逐 tick 推进并滚动跟随最后一行，播完 emit('done')；
//! 3. 真流式：内容随增量增长（全量跟随、钉底），流结束不再显示光标。
//!
//! 注：happy-dom 无布局引擎——滚动跟随通过 stub scrollHeight 验证 scrollTop
//! 被钉到容器底部。折叠/展开等外层交互由 WorkRunGroup 承担（见其测试）。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ReasoningText from '../ReasoningText.vue';

describe('ReasoningText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('历史回放（animate=false）：全量显示、不播打字、无光标', async () => {
    const text = '这是一段历史思考内容'.repeat(10);
    const wrapper = mount(ReasoningText, { props: { text, animate: false } });
    await nextTick();
    expect(wrapper.classes()).not.toContain('reasoning-text--typing');
    expect(wrapper.find('.reasoning-text__content').text()).toBe(text);
    expect(wrapper.find('.reasoning-text__caret').exists()).toBe(false);
    expect(wrapper.emitted('done')).toBeUndefined();
  });

  it('打字机：推进中滚动钉底，播完完整显示并 emit done', async () => {
    const text = '实时思考'.repeat(300); // 长文本 → 打字机分多 tick 播放
    const wrapper = mount(ReasoningText, { props: { text, animate: true } });
    await nextTick();
    expect(wrapper.classes()).toContain('reasoning-text--typing');
    // 未播完前内容为前缀（打字中）
    expect(wrapper.find('.reasoning-text__content').text().length).toBeLessThan(text.length);

    // stub 容器高度：验证每次推进后滚动被钉到底部（最后一行可见）
    const el = wrapper.element as HTMLElement;
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => 500 });
    await vi.advanceTimersByTimeAsync(24 * 5);
    expect(el.scrollTop).toBe(500);

    // 播放完成：文本完整 + typing 结束 + done 通知（供外层自动收起）
    await vi.advanceTimersByTimeAsync(7000);
    expect(wrapper.find('.reasoning-text__content').text()).toBe(text);
    expect(wrapper.classes()).not.toContain('reasoning-text--typing');
    expect(wrapper.emitted('done')).toHaveLength(1);
    wrapper.unmount();
  });

  it('真流式：全量跟随（不播打字机）、钉底；流结束光标消失、不 emit done', async () => {
    const wrapper = mount(ReasoningText, {
      props: { text: '第一段', animate: false, streaming: true },
    });
    await nextTick();
    // 流式期间：全量显示（内容自身在增长，无打字机会话）+ 光标
    expect(wrapper.classes()).not.toContain('reasoning-text--typing');
    expect(wrapper.find('.reasoning-text__content').text()).toBe('第一段');
    expect(wrapper.find('.reasoning-text__caret').exists()).toBe(true);

    // 增量增长：全量跟随 + 钉底
    const el = wrapper.element as HTMLElement;
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => 700 });
    await wrapper.setProps({ text: '第一段，继续第二段' });
    await nextTick();
    expect(wrapper.find('.reasoning-text__content').text()).toBe('第一段，继续第二段');
    expect(el.scrollTop).toBe(700);

    // 流结束（终值对账）：光标消失（外层按 streaming=false 收起详情）
    await wrapper.setProps({ streaming: false });
    await nextTick();
    expect(wrapper.find('.reasoning-text__caret').exists()).toBe(false);
    expect(wrapper.emitted('done')).toBeUndefined();
  });

  it('空文本（animate=true）：无打字动画、不 emit done', async () => {
    const wrapper = mount(ReasoningText, { props: { text: '', animate: true } });
    await nextTick();
    expect(wrapper.classes()).not.toContain('reasoning-text--typing');
    expect(wrapper.emitted('done')).toBeUndefined();
    wrapper.unmount();
  });
});
