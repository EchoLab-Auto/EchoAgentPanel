//! 全屏按钮契约（XR 巨幕模式）：两态文案 + 调浏览器 Fullscreen API。
//!
//! happy-dom 没有 Fullscreen API，这里注入最小 mock：requestFullscreen 会
//! 更新 fullscreenElement 并派发 `fullscreenchange`（与真实浏览器一致），
//! 用于验证按钮文案随全屏状态切换、退出走 exitFullscreen。

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

import FullscreenToggleButton from '../components/FullscreenToggleButton.vue';

type FullscreenMockDocument = {
  fullscreenElement: unknown;
  exitFullscreen: ReturnType<typeof vi.fn>;
};

const doc = document as unknown as FullscreenMockDocument;

beforeEach(() => {
  doc.fullscreenElement = null;
  const el = document.documentElement as unknown as { requestFullscreen: unknown };
  el.requestFullscreen = vi.fn(async () => {
    doc.fullscreenElement = document.documentElement;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  doc.exitFullscreen = vi.fn(async () => {
    doc.fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
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
});
