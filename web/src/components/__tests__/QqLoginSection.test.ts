//! QqLoginSection 二维码局部归属（02b §2.3/§4.4）：
//! `login_qrcode` 结果只进本组件局部状态（不再经全局 lastQrcode 单槽）；
//! 发起后切实例 → 旧结果丢弃；正常 resolve → data URL；业务失败 → 内联文案。

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('../../adapterOps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../adapterOps')>();
  return {
    ...actual,
    invokeAdapterOp: vi.fn(),
  };
});

import QqLoginSection from '../QqLoginSection.vue';
import { state } from '../../store';
import { invokeAdapterOp, type AdapterOpOutcome } from '../../adapterOps';
import type { AdapterStatus } from '../../protocol';

const invokeMock = vi.mocked(invokeAdapterOp);

function mkAdapter(name: string, running = true, connected = false): AdapterStatus {
  return {
    name,
    display_name: name,
    running,
    connected,
    self_id: null,
    bind_address: '0.0.0.0:3131',
    started_at: null,
  };
}

const hanging = () => new Promise<AdapterOpOutcome>(() => {});

describe('QqLoginSection 二维码局部归属（02b §2.3）', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(() => hanging());
    state.adapterUiByKey = {};
    state.activeRegion = null;
    state.connected = false;
  });

  it('正常 resolve：png_base64 落本组件局部 qrDataUrl（data URL）', async () => {
    invokeMock.mockImplementation((_core, _adapter, method) => {
      if (method === 'login_qrcode') {
        return Promise.resolve({ result: { png_base64: 'QUJD' }, error: null });
      }
      return hanging();
    });
    const wrapper = mount(QqLoginSection, {
      props: { adapter: mkAdapter('qq'), adapterName: 'qq', owner: 0 },
    });
    await flushPromises();
    const call = invokeMock.mock.calls.find(([, , m]) => m === 'login_qrcode');
    expect(call, `calls: ${JSON.stringify(invokeMock.mock.calls)}`).toBeTruthy();
    expect(call![1]).toBe('qq'); // 实例寻址
    const img = wrapper.find('img.qr-img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')?.startsWith('data:image/png;base64,')).toBe(true);
    wrapper.unmount();
  });

  it('resolve 前切换 adapterName：旧实例结果丢弃、不渲染 img', async () => {
    const deferred: { resolve?: (outcome: AdapterOpOutcome) => void } = {};
    invokeMock.mockImplementation((_core, _adapter, method) => {
      if (method === 'login_qrcode') {
        return new Promise<AdapterOpOutcome>((resolve) => {
          deferred.resolve = resolve;
        });
      }
      return hanging();
    });
    const wrapper = mount(QqLoginSection, {
      props: { adapter: mkAdapter('qq'), adapterName: 'qq', owner: 0 },
    });
    await nextTick();
    expect(deferred.resolve, '挂载即自动拉码').toBeTruthy();

    // 旧请求仍在途时切换实例：回包不得串号。
    await wrapper.setProps({ adapter: mkAdapter('qq2'), adapterName: 'qq2' });
    await nextTick();
    deferred.resolve?.({ result: { png_base64: 'QUJD' }, error: null });
    await flushPromises();
    expect(wrapper.find('img.qr-img').exists()).toBe(false);
    wrapper.unmount();
  });

  it('业务失败 resolve({error})：内联错误文案、无 img', async () => {
    invokeMock.mockImplementation((_core, _adapter, method) => {
      if (method === 'login_qrcode') {
        return Promise.resolve({ result: null, error: '登录通道未就绪' });
      }
      return hanging();
    });
    const wrapper = mount(QqLoginSection, {
      props: { adapter: mkAdapter('qq'), adapterName: 'qq', owner: 0 },
    });
    await flushPromises();
    expect(wrapper.find('.qq-login-error').text()).toContain('登录通道未就绪');
    expect(wrapper.find('img.qr-img').exists()).toBe(false);
    wrapper.unmount();
  });
});
