//! 日志视图 · 客户端过滤契约（2026-10 日志治理）：级别过滤、关键字过滤、
//! 行数计数与「无匹配」占位。默认只拉最近 100 行原文，排障需要把噪声
//! 滤掉——这三项都在前端做，不改后端接口。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const LOG = [
  ' 2026-10-20T10:00:00Z  INFO ThreadId(01) echo_agent::agent::turn: agent turn started session=s1',
  ' 2026-10-20T10:00:01Z DEBUG ThreadId(01) echo_agent::llm: request payload built',
  ' 2026-10-20T10:00:02Z  WARN ThreadId(01) echo_federation::link: federation dial failing peer=A100-40g',
  ' 2026-10-20T10:00:03Z ERROR ThreadId(02) echo_plugin_host: restart budget exhausted plugin=adapter-qq',
  ' 2026-10-20T10:00:04Z  INFO ThreadId(01) echo_agent::tool: tool call finished tool=bash',
].join('\n');

vi.mock('../../api', () => ({
  fetchWithTimeout: vi.fn(async () => ({ ok: true, status: 200, text: async () => LOG })),
}));

import LogView from '../LogView.vue';
import { state } from '../../store';

async function mountViewer() {
  const wrapper = mount(LogView);
  await flushPromises();
  return wrapper;
}

/** 点分段控件的某一档（按可见文案）。 */
async function pickSegment(wrapper: Awaited<ReturnType<typeof mountViewer>>, label: string) {
  const item = wrapper.findAll('.nm-segmented__item').find((i) => i.text() === label);
  expect(item, `段选项 ${label} 应存在`).toBeTruthy();
  await item!.trigger('click');
  await flushPromises();
}

describe('日志视图 · 客户端过滤', () => {
  beforeEach(() => {
    state.upstreams = [];
  });

  it('默认显示全部行并给出计数', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.find('.log-viewer').text()).toContain('agent turn started');
    expect(wrapper.find('.log-count').text()).toBe('5 / 5 行');
    wrapper.unmount();
  });

  it('级别过滤 WARN+ 只留 WARN 与 ERROR', async () => {
    const wrapper = await mountViewer();
    await pickSegment(wrapper, 'WARN+');
    const text = wrapper.find('.log-viewer').text();
    expect(text).toContain('federation dial failing');
    expect(text).toContain('restart budget exhausted');
    expect(text).not.toContain('agent turn started');
    expect(text).not.toContain('request payload built');
    expect(wrapper.find('.log-count').text()).toBe('2 / 5 行');
    wrapper.unmount();
  });

  it('关键字过滤大小写不敏感', async () => {
    const wrapper = await mountViewer();
    await wrapper.find('.log-filter').setValue('ADAPTER-QQ');
    await flushPromises();
    const text = wrapper.find('.log-viewer').text();
    expect(text).toContain('restart budget exhausted');
    expect(text).not.toContain('agent turn started');
    expect(wrapper.find('.log-count').text()).toBe('1 / 5 行');
    wrapper.unmount();
  });

  it('无匹配时给占位文案而不是空白', async () => {
    const wrapper = await mountViewer();
    await wrapper.find('.log-filter').setValue('不存在的关键字');
    await flushPromises();
    expect(wrapper.find('.log-viewer').text()).toBe('（没有匹配的行）');
    expect(wrapper.find('.log-count').text()).toBe('0 / 5 行');
    wrapper.unmount();
  });

  it('级别与关键字同时生效', async () => {
    const wrapper = await mountViewer();
    await pickSegment(wrapper, 'INFO+');
    await wrapper.find('.log-filter').setValue('tool call finished');
    await flushPromises();
    const text = wrapper.find('.log-viewer').text();
    expect(text).toContain('tool=bash');
    expect(wrapper.find('.log-count').text()).toBe('1 / 5 行');
    wrapper.unmount();
  });
});
