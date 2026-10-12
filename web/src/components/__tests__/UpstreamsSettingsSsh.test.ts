//! 上游表单 · SSH 接入契约（2026-10 末）：接入方式切换、SSH 字段校验、
//! 提交载荷形状（`ssh` 段出现即 SSH 接入、url 置空）、列表展示
//! ssh 地址/隧道状态、编辑回填与"密文留空 = 不变"语义。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const posts = vi.hoisted(() => [] as unknown[]);
const deletes = vi.hoisted(() => [] as string[]);
const payload = vi.hoisted(() => ({ list: [] as unknown[] }));

vi.mock('../../connection', () => ({
  sendCommand: vi.fn(),
  sendPending: vi.fn(),
  panelFetch: vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method === 'POST') {
      posts.push(JSON.parse(String(init?.body ?? '{}')));
      return { ok: true, status: 204, json: async () => ({}), text: async () => '' };
    }
    if (method === 'DELETE') {
      deletes.push(url);
      return { ok: true, status: 204, json: async () => ({}), text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => payload.list, text: async () => '' };
  }),
}));

import UpstreamsSettings from '../UpstreamsSettings.vue';
import { state } from '../../store';

/** 一个 SSH 接入的上游状态（后端 /api/upstreams 形状）。 */
function sshUpstream() {
  return {
    name: 'cloud',
    url: '',
    token_set: true,
    access: 'ssh',
    ssh: {
      host: '203.0.113.7',
      port: 22,
      user: 'root',
      remote_port: 3132,
      identity_file: '~/.ssh/cloud',
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

const setInput = async (wrapper: ReturnType<typeof mount>, placeholder: string, value: string) => {
  const input = wrapper.find(`input[placeholder="${placeholder}"]`);
  expect(input.exists(), `输入框 ${placeholder}`).toBe(true);
  await input.setValue(value);
};

/** 点击文本含 needle 的按钮。 */
const clickButton = async (wrapper: ReturnType<typeof mount>, needle: string) => {
  const button = wrapper.findAll('button').find((b) => b.text().includes(needle));
  expect(button, `按钮 ${needle}`).toBeTruthy();
  await button!.trigger('click');
};

describe('上游表单 · SSH 接入', () => {
  beforeEach(() => {
    posts.length = 0;
    deletes.length = 0;
    payload.list = [];
    state.upstreams = [];
  });

  it('SSH 上游行展示 ssh 地址、SSH 徽标与隧道状态', async () => {
    payload.list = [sshUpstream()];
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    const item = wrapper.find('.up-item');
    expect(item.text()).toContain('ssh://root@203.0.113.7:22 → 127.0.0.1:3132');
    expect(item.text()).toContain('SSH');
    expect(item.text()).toContain('隧道已连接');
    wrapper.unmount();
  });

  it('SSH 模式提交：载荷含 ssh 段、url 置空', async () => {
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    await clickButton(wrapper, '添加 Core');
    // 切换到 SSH 接入方式
    const sshItem = wrapper.findAll('.nm-segmented__item').find((i) => i.text().includes('SSH 隧道'));
    expect(sshItem).toBeTruthy();
    await sshItem!.trigger('click');
    await flushPromises();

    await setInput(wrapper, 'workstation', 'cloud');
    await setInput(wrapper, '203.0.113.7', '198.51.100.9');
    await setInput(wrapper, '22', '2222');
    await setInput(wrapper, 'root', 'ubuntu');
    await setInput(wrapper, '~/.ssh/id_ed25519', '~/.ssh/cloud_key');
    await setInput(wrapper, '3132', '3133');
    await setInput(wrapper, '~/.local/share/echo-agent-core/media', '/data/media');
    // 两个 password 输入：SSH 口令/密码 在前，访问令牌 在后
    const passwords = wrapper.findAll('input[type="password"]');
    await passwords[0].setValue('secret');
    await clickButton(wrapper, '保存');
    await flushPromises();

    expect(posts).toHaveLength(1);
    expect(posts[0]).toEqual({
      name: 'cloud',
      url: '',
      access_token: '',
      ssh: {
        host: '198.51.100.9',
        port: 2222,
        user: 'ubuntu',
        identity_file: '~/.ssh/cloud_key',
        password: 'secret',
        remote_port: 3133,
        remote_media_dir: '/data/media',
      },
    });
    wrapper.unmount();
  });

  it('SSH 模式缺主机/用户时校验拦截（不发请求）', async () => {
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    await clickButton(wrapper, '添加 Core');
    const sshItem = wrapper.findAll('.nm-segmented__item').find((i) => i.text().includes('SSH 隧道'));
    await sshItem!.trigger('click');
    await flushPromises();
    await setInput(wrapper, 'workstation', 'cloud');
    await clickButton(wrapper, '保存');
    await flushPromises();
    expect(wrapper.text()).toContain('SSH 主机不能为空');
    expect(posts).toHaveLength(0);

    // 补主机、缺用户 → 仍拦截
    await setInput(wrapper, '203.0.113.7', '198.51.100.9');
    await clickButton(wrapper, '保存');
    await flushPromises();
    expect(wrapper.text()).toContain('SSH 用户不能为空');
    expect(posts).toHaveLength(0);
    wrapper.unmount();
  });

  it('编辑 SSH 上游：回填字段；password 留空发送空串（后端保留旧值）', async () => {
    payload.list = [sshUpstream()];
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    await clickButton(wrapper, '编辑');
    await flushPromises();

    const host = wrapper.find('input[placeholder="203.0.113.7"]');
    expect((host.element as HTMLInputElement).value).toBe('203.0.113.7');
    expect((wrapper.find('input[placeholder="root"]').element as HTMLInputElement).value).toBe('root');
    expect(
      (wrapper.find('input[placeholder="~/.ssh/id_ed25519"]').element as HTMLInputElement).value,
    ).toBe('~/.ssh/cloud');

    await clickButton(wrapper, '保存');
    await flushPromises();
    expect(posts).toHaveLength(1);
    const body = posts[0] as { name: string; url: string; ssh: Record<string, unknown> };
    expect(body.name).toBe('cloud');
    expect(body.url).toBe('');
    expect(body.ssh.host).toBe('203.0.113.7');
    expect(body.ssh.password).toBe('');
    wrapper.unmount();
  });

  it('直连模式提交不含 ssh 段（null）', async () => {
    const wrapper = mount(UpstreamsSettings);
    await flushPromises();
    await clickButton(wrapper, '添加 Core');
    await setInput(wrapper, 'workstation', 'box');
    await setInput(wrapper, 'ws://192.168.1.10:3132', 'ws://10.0.0.5:3132');
    await clickButton(wrapper, '保存');
    await flushPromises();
    expect(posts).toHaveLength(1);
    expect((posts[0] as { ssh: unknown }).ssh).toBeNull();
    wrapper.unmount();
  });
});
