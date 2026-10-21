//! 全屏按钮契约：两态文案 + 调浏览器 Fullscreen API + 移动端图标态（compact）。
//!
//! happy-dom 没有 Fullscreen API，这里注入最小 mock：requestFullscreen 会
//! 更新 fullscreenElement 并派发 `fullscreenchange`（与真实浏览器一致），
//! 用于验证按钮文案随全屏状态切换、退出走 exitFullscreen。
//!
//! 2026-10：移动端不再隐藏该按钮（此前 styles.css 整段 display:none，把 iOS
//! Safari 的限制强加给所有移动端）。窄屏走 `compact` 图标态——只渲染 SVG，
//! 文案转 aria-label，并保留「浏览器不支持时点按给解释」的分支。

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

import FullscreenToggleButton from '../components/FullscreenToggleButton.vue';

type FullscreenMockDocument = {
  fullscreenElement: unknown;
  exitFullscreen: ReturnType<typeof vi.fn>;
};

const doc = document as unknown as FullscreenMockDocument;

function installFullscreenMock() {
  const el = document.documentElement as unknown as { requestFullscreen: unknown };
  el.requestFullscreen = vi.fn(async () => {
    doc.fullscreenElement = document.documentElement;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  doc.exitFullscreen = vi.fn(async () => {
    doc.fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
}

beforeEach(() => {
  doc.fullscreenElement = null;
  installFullscreenMock();
});

describe('FullscreenToggleButton', () => {
  it('默认「全屏」；点击进入全屏后文案切「退出全屏」', async () => {
    const wrapper = mount(FullscreenToggleButton);
    expect(wrapper.text()).toContain('全屏');
    expect(wrapper.text()).not.toContain('退出全屏');

    await wrapper.find('button').trigger('click');
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('退出全屏');
  });

  it('全屏态点击调用 exitFullscreen 并还原文案', async () => {
    doc.fullscreenElement = document.documentElement;
    const wrapper = mount(FullscreenToggleButton);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('退出全屏');

    await wrapper.find('button').trigger('click');
    expect(doc.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('全屏');
  });

  it('API 被拒绝时不抛错（toast 提示由面板统一呈现）', async () => {
    const el = document.documentElement as unknown as { requestFullscreen: unknown };
    el.requestFullscreen = vi.fn(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    const wrapper = mount(FullscreenToggleButton);
    await expect(wrapper.find('button').trigger('click')).resolves.toBeUndefined();
    expect(wrapper.text()).toContain('全屏');
  });

  it('compact：只渲染图标 + aria-label，图标随状态换（进入=四角向外 / 退出=向内）', async () => {
    const wrapper = mount(FullscreenToggleButton, { props: { compact: true } });
    const btn = wrapper.find('button');
    expect(btn.find('svg').exists()).toBe(true);
    expect(btn.text()).toBe('');
    expect(btn.attributes('aria-label')).toBe('全屏');
    expect(btn.attributes('title')).toBe('进入全屏');
    const enterPath = btn.find('svg').html();

    await btn.trigger('click');
    expect(btn.attributes('aria-label')).toBe('退出全屏');
    expect(btn.attributes('title')).toBe('退出全屏（Esc）');
    expect(btn.find('svg').html()).not.toBe(enterPath);
  });

  it('浏览器无 Fullscreen API 时（iOS Safari）不假装能全屏：不抛错、title 说明原因', async () => {
    const el = document.documentElement as unknown as { requestFullscreen?: unknown };
    delete el.requestFullscreen;
    const wrapper = mount(FullscreenToggleButton, { props: { compact: true } });
    const btn = wrapper.find('button');
    expect(btn.attributes('aria-label')).toBe('全屏（当前浏览器不支持）');
    expect(btn.attributes('title')).toContain('添加到主屏幕');
    await expect(btn.trigger('click')).resolves.toBeUndefined();
    expect(doc.fullscreenElement).toBeNull();
    installFullscreenMock();
  });
});
