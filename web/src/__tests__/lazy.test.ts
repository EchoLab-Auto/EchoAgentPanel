//! lazy()：chunk 加载失败一次性自动重载（10s 防循环）+ 错误组件 + 成功路径。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import {
  RELOAD_STAMP_KEY,
  RELOAD_WINDOW_MS,
  __setLazyDeps,
  isChunkLoadError,
  lazy,
  tryAutoReload,
} from '../lazy';

const chunkError = () =>
  new TypeError(
    'Failed to fetch dynamically imported module: https://x/assets/SessionSwitcher-OLD.js',
  );

// 模拟 ESM 模块命名空间（Vue 按 __esModule / Symbol.toStringTag 识别 default）。
const Stub = defineComponent({
  props: { label: { type: String, default: '' } },
  setup(props) {
    return () => h('div', { class: 'stub' }, `stub:${props.label}`);
  },
});

function mountLazy(loader: () => Promise<unknown>) {
  const Comp = lazy(loader as never, 'Stub');
  return mount(defineComponent({ render: () => h(Comp, { label: 'hi' }) }));
}

describe('lazy()', () => {
  let now = 1_000_000;
  let reload: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    sessionStorage.clear();
    now = 1_000_000;
    reload = vi.fn<() => void>();
    __setLazyDeps({ reload, now: () => now });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    __setLazyDeps({});
    vi.restoreAllMocks();
  });

  it('识别各浏览器的 chunk 加载失败文案', () => {
    expect(isChunkLoadError(chunkError())).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(
      isChunkLoadError(
        'Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"',
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('成功路径：正常渲染加载到的组件', async () => {
    const wrapper = mountLazy(() => Promise.resolve({ __esModule: true, default: Stub }));
    await flushPromises();
    expect(wrapper.find('.stub').text()).toBe('stub:hi');
    expect(reload).not.toHaveBeenCalled();
  });

  it('chunk 失败 → 自动 reload 一次并写 sessionStorage 时间戳', async () => {
    const wrapper = mountLazy(() => Promise.reject(chunkError()));
    await flushPromises();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_STAMP_KEY)).toBe(String(now));
    // 重载进行中：不闪错误态
    expect(wrapper.find('.lazy-load-error').exists()).toBe(false);
  });

  it('10s 内二次 chunk 失败：不重复 reload，渲染「请刷新页面」错误组件', async () => {
    sessionStorage.setItem(RELOAD_STAMP_KEY, String(now - 2_000));
    const wrapper = mountLazy(() => Promise.reject(chunkError()));
    await flushPromises();
    expect(reload).not.toHaveBeenCalled();
    const box = wrapper.find('.lazy-load-error');
    expect(box.exists()).toBe(true);
    expect(box.text()).toContain('界面资源已更新，请刷新页面');
    // 「刷新」按钮走 reload
    await wrapper.findAll('button')[0].trigger('click');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('超过 10s 窗口后允许再次自动重载', () => {
    sessionStorage.setItem(RELOAD_STAMP_KEY, String(now - RELOAD_WINDOW_MS - 1));
    expect(tryAutoReload()).toBe(true);
    expect(tryAutoReload()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('非 chunk 错误：不自动 reload，只显示错误组件', async () => {
    const wrapper = mountLazy(() => Promise.reject(new Error('render exploded')));
    await flushPromises();
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(RELOAD_STAMP_KEY)).toBeNull();
    expect(wrapper.find('.lazy-load-error').text()).toContain('组件加载失败');
  });

  it('「重试」重跑 loader，成功后就地渲染组件', async () => {
    let attempts = 0;
    const wrapper = mountLazy(() => {
      attempts += 1;
      return attempts === 1 ? Promise.reject(new Error('flaky')) : Promise.resolve({ __esModule: true, default: Stub });
    });
    await flushPromises();
    expect(wrapper.find('.lazy-load-error').exists()).toBe(true);
    await wrapper.findAll('button')[1].trigger('click');
    await flushPromises();
    expect(attempts).toBe(2);
    expect(wrapper.find('.stub').text()).toBe('stub:hi');
  });
});
