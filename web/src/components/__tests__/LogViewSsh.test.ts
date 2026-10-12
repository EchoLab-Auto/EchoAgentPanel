//! 日志视图 · SSH 上游选择器契约（2026-10 末）：Core 视图列出 SSH 上游；
//! 选择后日志请求带 `?core=` 参数（后端经隧道在远端读取）；选中上游
//! 被移除时回退「本机」。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const calls = vi.hoisted(() => [] as string[]);

vi.mock('../../api', () => ({
  fetchWithTimeout: vi.fn(async (url: string) => {
    calls.push(url);
    return { ok: true, status: 200, text: async () => `logs:${url}` };
  }),
}));

import LogView from '../LogView.vue';
import { state } from '../../store';

function sshUpstream(name: string) {
  return {
    name,
    url: '',
    token_set: false,
    access: 'ssh',
    ssh: {
      host: '203.0.113.7',
      port: 22,
      user: 'root',
      remote_port: 3132,
      identity_file: '',
      password_set: false,
      remote_media_dir: '',
      phase: 'online',
      error: null,
      local_port: 41234,
    },
    online: true,
    connectivity: 'online',
    auth: 'ok',
    last_error: null,
    last_checked: 1,
  };
}

describe('日志视图 · SSH 上游选择', () => {
  beforeEach(() => {
    calls.length = 0;
    state.upstreams = [];
  });

  it('无 SSH 上游时不显示选择器，请求本机日志', async () => {
    const wrapper = mount(LogView);
    await flushPromises();
    expect(calls[0]).toBe('/api/logs/core?lines=100');
    expect(wrapper.text()).not.toContain('本机');
    wrapper.unmount();
  });

  it('选择 SSH 上游后请求带 core 参数；切回本机恢复', async () => {
    state.upstreams = [sshUpstream('cloud')] as never;
    const wrapper = mount(LogView);
    await flushPromises();
    // 选择器出现（本机 + cloud）
    const items = wrapper.findAll('.nm-segmented__item');
    const cloud = items.find((i) => i.text().includes('cloud'));
    expect(cloud).toBeTruthy();

    await cloud!.trigger('click');
    await flushPromises();
    expect(calls[calls.length - 1]).toBe('/api/logs/core?lines=100&core=cloud');
    expect(wrapper.find('.log-viewer').text()).toContain('core=cloud');

    const local = wrapper.findAll('.nm-segmented__item').find((i) => i.text() === '本机');
    await local!.trigger('click');
    await flushPromises();
    expect(calls[calls.length - 1]).toBe('/api/logs/core?lines=100');
    wrapper.unmount();
  });

  it('选中的上游被移除后回退本机', async () => {
    state.upstreams = [sshUpstream('cloud')] as never;
    const wrapper = mount(LogView);
    await flushPromises();
    const cloud = wrapper.findAll('.nm-segmented__item').find((i) => i.text().includes('cloud'));
    await cloud!.trigger('click');
    await flushPromises();
    expect(calls[calls.length - 1]).toContain('core=cloud');

    state.upstreams = [];
    await flushPromises();
    await flushPromises();
    expect(calls[calls.length - 1]).toBe('/api/logs/core?lines=100');
    wrapper.unmount();
  });
});
