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
    // 运行中 → 默认折叠；运行指示为工具专属 SVG 动画（loading 类），无状态点环
    expect(wrapper.find('.tool-run-group__detail').exists()).toBe(false);
    expect(wrapper.findAll('[class*="tool-icon--anim-"]').length).toBe(1);
    expect(wrapper.findAll('.tool-run-group__dot').length).toBe(0);

    // 点击第二个图标 → 展开其详情
    await wrapper.findAll('.tool-run-group__icon')[1].trigger('click');
    const detail = wrapper.find('.tool-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('bash');
    expect(detail.text()).toContain('运行中');
  });

  it('label：悬停提示与展开详情头部显示任务摘要（spawn_subagent）', async () => {
    const wrapper = mount(ToolRunGroup, {
      props: {
        items: [
          item({
            key: 's1',
            name: 'spawn_subagent',
            label: '审计 Panel 文档',
            input: '{"task":"审计 Panel 文档"}',
            output: '子任务已受理',
            status: 'succeeded',
          }),
        ],
      },
    });
    // 悬停提示（title）= label + 状态
    const icon = wrapper.find('.tool-run-group__icon');
    expect(icon.attributes('title')).toContain('审计 Panel 文档');
    expect(icon.attributes('title')).toContain('成功');
    // 展开详情头部同样显示 label 而非工具名
    await icon.trigger('click');
    const name = wrapper.find('.tool-run-group__detail-name');
    expect(name.text()).toBe('审计 Panel 文档');
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

  it('耗时：运行中实时计时（角标+详情），完成后显示总耗时', async () => {
    const started = Date.now() - 4200;
    const wrapper = mount(ToolRunGroup, {
      props: {
        items: [
          item({ key: 'a', name: 'bash', status: 'succeeded', elapsedMs: 12345 }),
          item({ key: 'b', name: 'bash', status: 'running', output: null, startedAtMs: started }),
        ],
      },
    });
    // 运行中：图标右下角实时角标（仅 1 个；已完成项不显示）
    const badges = wrapper.findAll('.tool-run-group__timer');
    expect(badges.length).toBe(1);
    expect(badges[0].text()).toMatch(/^\d+(\.\d+)?s$/);

    // 完成项详情头显示总耗时（elapsedMs → 12.3s）
    await wrapper.findAll('.tool-run-group__icon')[0].trigger('click');
    const detail = wrapper.find('.tool-run-group__detail');
    expect(detail.text()).toContain('耗时 12.3s');

    // 运行项详情头显示「运行中 X」实时文案
    await wrapper.findAll('.tool-run-group__icon')[1].trigger('click');
    expect(wrapper.find('.tool-run-group__detail').text()).toContain('运行中');

    wrapper.unmount();
  });
});
