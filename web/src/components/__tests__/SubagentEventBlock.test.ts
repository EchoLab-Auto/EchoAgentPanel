//! SubagentEventBlock：子代理完成回报的紧凑行（一行摘要 + 可展开结论）。

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SubagentEventBlock from '../SubagentEventBlock.vue';

const event = {
  id: 'task-1',
  task: '  审计 Panel 文档  \n（换行应折成空格）',
  success: true,
  result: '结论正文\n第二行',
};

describe('SubagentEventBlock', () => {
  it('折叠态：一行摘要（状态 + 任务单行化 + 时间），结论默认隐藏', async () => {
    const wrapper = mount(SubagentEventBlock, { props: { event, time: '03:42' } });
    const head = wrapper.find('.subagent-event__head');
    expect(head.exists()).toBe(true);
    expect(wrapper.text()).toContain('子代理完成');
    const task = wrapper.find('.subagent-event__task');
    expect(task.text()).toBe('审计 Panel 文档 （换行应折成空格）');
    expect(wrapper.find('.subagent-event__time').text()).toBe('03:42');
    // 结论默认收起（v-show=false，存在但不显示）
    const body = wrapper.find('.subagent-event__body');
    expect(body.exists()).toBe(true);
    expect((body.element as HTMLElement).style.display).toBe('none');
  });

  it('点击头部展开结论全文', async () => {
    const wrapper = mount(SubagentEventBlock, { props: { event } });
    await wrapper.find('.subagent-event__head').trigger('click');
    const body = wrapper.find('.subagent-event__body');
    expect((body.element as HTMLElement).style.display).not.toBe('none');
    expect(body.text()).toContain('结论正文');
    // 再点收起
    await wrapper.find('.subagent-event__head').trigger('click');
    expect((wrapper.find('.subagent-event__body').element as HTMLElement).style.display).toBe('none');
  });

  it('失败态：失败样式 + 失败文案；空结果有占位', async () => {
    const wrapper = mount(SubagentEventBlock, {
      props: { event: { ...event, success: false, result: '  ' } },
    });
    expect(wrapper.find('.subagent-event--failed').exists()).toBe(true);
    expect(wrapper.text()).toContain('子代理失败');
    await wrapper.find('.subagent-event__head').trigger('click');
    expect(wrapper.find('.subagent-event__body').text()).toContain('（无结果内容）');
  });
});

describe('SubagentEventBlock（运行中态）', () => {
  it('运行中：文案「子代理运行中」、呼吸点、无展开箭头与结果体', async () => {
    const wrapper = mount(SubagentEventBlock, {
      props: { event: { ...event, running: true, result: '' } },
    });
    expect(wrapper.find('.subagent-event--running').exists()).toBe(true);
    expect(wrapper.text()).toContain('子代理运行中');
    expect(wrapper.find('.subagent-event__chevron').exists()).toBe(false);
    const body = wrapper.find('.subagent-event__body');
    expect(body.exists()).toBe(true);
    expect((body.element as HTMLElement).style.display).toBe('none');
    // 点击头部不展开（结果未到）
    await wrapper.find('.subagent-event__head').trigger('click');
    expect((wrapper.find('.subagent-event__body').element as HTMLElement).style.display).toBe('none');
  });
});
