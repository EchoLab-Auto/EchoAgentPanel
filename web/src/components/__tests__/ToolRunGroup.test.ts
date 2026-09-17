//! ToolRunGroup 契约测试：连续工具调用的图标行（折叠态）与详情卡（展开态）。

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ToolRunGroup, { type ToolRunItem } from '../ToolRunGroup.vue';

function item(over: Partial<ToolRunItem> = {}): ToolRunItem {
  return {
    key: 'k1',
    name: 'bash',
    input: '{"command":"ls"}',
    output: 'ok',
    status: 'succeeded',
    ...over,
  };
}

describe('ToolRunGroup', () => {
  it('折叠态：每个工具渲染一个圆角矩形图标（横向一行可换行）', () => {
    const wrapper = mount(ToolRunGroup, {
      props: {
        items: [
          item({ key: 'a', name: 'bash' }),
          item({ key: 'b', name: 'read_file' }),
          item({ key: 'c', name: 'web_search' }),
        ],
      },
    });
    const icons = wrapper.findAll('.tool-run-group__icon');
    expect(icons.length).toBe(3);
    // 不同工具分派不同 SVG（内容不同）
    const svgs = icons.map((i) => i.find('svg').html());
    expect(new Set(svgs).size).toBe(3);
    // 全部成功且无运行中 → 默认折叠（无详情卡）
    expect(wrapper.find('.tool-run-group__detail').exists()).toBe(false);
  });

  it('运行中默认折叠且带运行指示；点击图标浮现具体内容卡片', async () => {
    const wrapper = mount(ToolRunGroup, {
      props: {
        items: [
          item({ key: 'a', name: 'bash', status: 'succeeded' }),
          item({ key: 'b', name: 'bash', status: 'running', output: null }),
        ],
      },
    });
    // 运行中 → 默认折叠；运行指示为 SVG 内嵌旋转轨道（spin），不再有状态点环
    expect(wrapper.find('.tool-run-group__detail').exists()).toBe(false);
    expect(wrapper.findAll('.tool-icon--spin').length).toBe(1);
    expect(wrapper.findAll('.tool-run-group__dot').length).toBe(0);

    // 点击第二个图标 → 展开其详情
    await wrapper.findAll('.tool-run-group__icon')[1].trigger('click');
    const detail = wrapper.find('.tool-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('bash');
    expect(detail.text()).toContain('运行中');
  });

  it('全部结束但存在失败 → 自动展开首个失败项', () => {
    const wrapper = mount(ToolRunGroup, {
      props: {
        items: [
          item({ key: 'a', status: 'succeeded' }),
          item({ key: 'b', name: 'read_file', status: 'failed', output: 'error: boom' }),
        ],
      },
    });
    const detail = wrapper.find('.tool-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('read_file');
    expect(detail.text()).toContain('error: boom');
    // 失败图标带红色标记
    expect(wrapper.findAll('.tool-run-group__icon--failed').length).toBe(1);
  });
});
