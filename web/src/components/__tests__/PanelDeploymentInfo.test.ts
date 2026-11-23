//! 「设置 · 面板 → 部署方式」的界面契约（2026-11）。
//!
//! 锁三件事：
//!
//! 1. **形态标签直接来自 `embedded`**：内嵌 / 独立不能靠"猜"，两者对用户
//!    的意义完全不同（内嵌时更新 Panel = 更新 Core）；
//! 2. **布局三态各自有话说**：`installed` / `source` / `unknown` 都必须给出
//!    可读文案，未知时**不许**编一个像样的答案；
//! 3. **旧后端缺字段**时显示"未上报"，而不是空白或 `undefined`。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

let respond: () => { status: number; body: unknown };

vi.mock('../../connection', () => ({
  panelFetch: vi.fn(async () => {
    const { status, body } = respond();
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }),
  sendCommand: vi.fn(),
}));

import PanelDeploymentInfo from '../PanelDeploymentInfo.vue';
// 身份快照在模块级缓存：每个用例都要清掉，否则第二个用例拿到第一个的答案。
import { resetPanelIdentityCache } from '../../federation-directory';

function mountPage() {
  return mount(PanelDeploymentInfo, {
    global: {
      stubs: {
        NeumorphismButton: true,
        NeumorphismCard: { template: '<div><slot /></div>' },
        NeumorphismTag: {
          props: ['variant'],
          template: '<span class="tag"><slot /></span>',
        },
      },
    },
  });
}

const installedEmbedded = {
  panel_key_set: false,
  discover: false,
  embedded: true,
  version: '0.3.1',
  layout: 'installed',
  static_dir: '/root/.local/libexec/echo-agent-core/web',
  base_path: '/',
  bind: '0.0.0.0:8080',
  serve_root: false,
};

beforeEach(() => {
  resetPanelIdentityCache();
});

describe('PanelDeploymentInfo', () => {
  it('内嵌形态显示"内嵌模块"与版本归 Core 的说明', async () => {
    respond = () => ({ status: 200, body: installedEmbedded });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('内嵌模块');
    expect(wrapper.text()).toContain('更新 Panel 等于更新 Core');
    expect(wrapper.text()).toContain('0.3.1');
    expect(wrapper.text()).toContain('/root/.local/libexec/echo-agent-core/web');
  });

  it('独立形态显示"独立外壳"', async () => {
    respond = () => ({
      status: 200,
      body: { ...installedEmbedded, embedded: false, bind: '127.0.0.1:8080' },
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('独立外壳');
    expect(wrapper.text()).not.toContain('内嵌模块');
  });

  it('layout=source 时明确说是源码目录的构建产物', async () => {
    respond = () => ({
      status: 200,
      body: { ...installedEmbedded, layout: 'source', static_dir: '/src/panel/web/dist' },
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('源码目录');
    expect(wrapper.text()).toContain('git checkout');
  });

  it('layout 未知时不编造，显示"未知"', async () => {
    respond = () => ({
      status: 200,
      body: { ...installedEmbedded, layout: 'elsewhere' },
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('未知');
    expect(wrapper.text()).not.toContain('安装布局');
  });

  it('旧后端（只有发现三字段）显示"未上报"而不是空白', async () => {
    respond = () => ({
      status: 200,
      body: { panel_key_set: false, discover: false, embedded: false },
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('独立外壳');
    expect(wrapper.text()).toContain('（旧版后端未上报）');
    expect(wrapper.text()).toContain('（未知目录）');
  });
});
