//! 「Core 连接」页 · 上游列表的**渲染稳定性**与**紧凑布局**契约（2026-10 修）。
//!
//! 两条真实回归锁在这里：
//!
//! 1. **不闪**（用户报「设置里的 Core 连接会一直闪烁」）：此前每次 `refresh()`
//!    都把 `loading` 翻成 true，模板里的 `<div v-if="loading">` 于是每 3s 往
//!    列表里插一块 spinner、300ms 后再摘掉——实测 5 张卡片整体上下跳 46px。
//!    现在锁定：轮询/静默刷新**不产生任何 DOM 结构变更**，加载指示只出现在
//!    用户主动触发的动作上。
//! 2. **紧凑**（用户报「一个 core 卡片占一行太多了」）：列表是自适应网格
//!    （宽屏 2-3 列），每张卡片两行（名称行 + 元信息行），不再有独占一行、
//!    内含 32px 固定健康占位的三段式大卡。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';

const payload = vi.hoisted(() => ({ list: [] as unknown[], gets: 0 }));

vi.mock('../../connection', () => ({
  sendCommand: vi.fn(),
  sendPending: vi.fn(),
  panelFetch: vi.fn(async (_url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method !== 'GET') return { ok: true, status: 204, json: async () => ({}), text: async () => '' };
    payload.gets += 1;
    return { ok: true, status: 200, json: async () => payload.list, text: async () => '' };
  }),
}));

import UpstreamsSettings from '../UpstreamsSettings.vue';
import { state } from '../../store';
import { refreshUpstreams } from '../../upstreams';

/** 一个直连上游（后端 /api/upstreams 形状）。 */
function directUpstream(name: string, over: Record<string, unknown> = {}) {
  return {
    name,
    url: `ws://10.0.0.2:3132`,
    token_set: true,
    access: 'direct',
    ssh: null,
    online: true,
    connectivity: 'online',
    auth: 'ok',
    last_error: null,
    last_checked: 1_700_000_000,
    source: 'manual',
    ...over,
  };
}

/** 记录一段 DOM 上发生的变更次数（结构 / 属性 / 文本）。 */
function watchMutations(el: Element) {
  const counts = { childList: 0, attributes: 0, characterData: 0 };
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'childList') counts.childList += 1;
      else if (r.type === 'attributes') counts.attributes += 1;
      else counts.characterData += 1;
    }
  });
  mo.observe(el, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
  return { counts, stop: () => mo.disconnect() };
}

describe('上游列表 · 渲染稳定性（不闪烁）', () => {
  beforeEach(() => {
    payload.gets = 0;
    payload.list = [];
    state.upstreams = [];
  });

  it('列表已就绪时，后台轮询不产生任何 DOM 变更（无 spinner 插入、无行高跳动）', async () => {
    payload.list = [directUpstream('core'), directUpstream('ai_station')];
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    expect(wrapper.findAll('.up-item').length).toBe(2);

    const probe = watchMutations(wrapper.element as Element);
    // 模拟全局 8s 泵连跑 3 轮（后端返回同一份快照）
    for (let i = 0; i < 3; i++) {
      await refreshUpstreams();
      await flushPromises();
    }
    probe.stop();
    expect(probe.counts.childList, '轮询期间不该插入/移除任何节点').toBe(0);
    expect(probe.counts.attributes, '轮询期间不该改任何属性（含 class）').toBe(0);
    expect(probe.counts.characterData, '内容没变就不该重渲染文本').toBe(0);
    // 结构上也不存在“转圈占位块”
    expect(wrapper.find('.up-loading').exists()).toBe(false);
    wrapper.unmount();
  });

  it('连接状态真的变了才更新那一格（其余卡片不动）', async () => {
    payload.list = [directUpstream('core'), directUpstream('ai_station')];
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    const probe = watchMutations(wrapper.element as Element);
    // 只有第二个上游变离线
    payload.list = [
      directUpstream('core'),
      directUpstream('ai_station', { online: false, connectivity: 'offline' }),
    ];
    await refreshUpstreams();
    await flushPromises();
    probe.stop();
    // 变的是文本（Vue 走 characterData），不是结构
    expect(probe.counts.characterData).toBeGreaterThan(0);
    expect(wrapper.findAll('.up-item')[1].text()).toContain('离线');
    expect(wrapper.findAll('.up-item')[0].text()).toContain('已连接');
    wrapper.unmount();
  });

  it('并发刷新共享同一次请求（两处轮询不重复打后端）', async () => {
    payload.list = [directUpstream('core')];
    state.upstreams = [];
    // 清掉上行 mount 之前的计数
    payload.gets = 0;
    await Promise.all([refreshUpstreams(), refreshUpstreams(), refreshUpstreams()]);
    expect(payload.gets).toBe(1);
  });

  it('首屏加载态只出现在「还没有数据」时，且是文案而非插入的块', async () => {
    payload.list = [];
    const wrapper = mount(UpstreamsSettings);
    // onMounted 里已把 loading 置真 → 下一帧渲染的是「读取中」文案（不是插块）
    await nextTick();
    expect(wrapper.text()).toContain('正在读取 Core 连接');
    await flushPromises();
    // 后端返回空列表 → 空态提示
    expect(wrapper.text()).toContain('尚未配置 Core 连接');
    expect(wrapper.find('.up-loading-hint').exists()).toBe(false);
    wrapper.unmount();
  });
});

describe('上游列表 · 紧凑网格布局', () => {
  beforeEach(() => {
    payload.gets = 0;
    state.upstreams = [];
  });

  it('列表是网格容器，每个上游一格（不再独占一整行）', async () => {
    payload.list = [directUpstream('core'), directUpstream('ai_station'), directUpstream('gpu')];
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    const grid = wrapper.find('.up-grid');
    expect(grid.exists()).toBe(true);
    expect(grid.findAll('.up-item').length).toBe(3);
    // 旧的逐行容器已移除
    expect(wrapper.find('.up-list').exists()).toBe(false);
    wrapper.unmount();
  });

  it('每格两行（名称行 + 元信息行）：状态点/名称/操作在同一行，地址/连通性/认证在第二行', async () => {
    payload.list = [directUpstream('core', { source: 'discovered' })];
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    const item = wrapper.find('.up-item');
    const head = item.find('.up-item__head');
    const meta = item.find('.up-item__meta');
    expect(head.exists()).toBe(true);
    expect(meta.exists()).toBe(true);
    // 第一行：名称 + 自动发现标签 + 两个操作按钮
    expect(head.text()).toContain('core');
    expect(head.text()).toContain('自动');
    expect(head.findAll('button').map((b) => b.text())).toEqual(['编辑', '删除']);
    // 第二行：地址 + 连通性 + 认证
    expect(meta.text()).toContain('ws://10.0.0.2:3132');
    expect(meta.text()).toContain('已连接');
    expect(meta.text()).toContain('认证通过');
    // 地址恒带全量 title（窄了就省略，悬停可读）
    expect(meta.find('.up-item__url').attributes('title')).toBe('ws://10.0.0.2:3132');
    // 旧的固定高度健康块已移除
    expect(item.find('.up-item-health').exists()).toBe(false);
    wrapper.unmount();
  });

  it('错误行只在真有 last_error 时出现（不靠 visibility 占位）', async () => {
    payload.list = [directUpstream('core')];
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    expect(wrapper.find('.up-item__err').exists()).toBe(false);
    wrapper.unmount();

    payload.list = [directUpstream('core', { last_error: 'WS handshake failed' })];
    state.upstreams = [];
    const withErr = mount(UpstreamsSettings);
    await flushPromises();
    expect(withErr.find('.up-item__err').text()).toContain('WS handshake failed');
    withErr.unmount();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
