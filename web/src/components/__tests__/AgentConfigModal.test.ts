//! Agent 配置弹层契约：外壳 = ui-frame NeumorphismCard（glass），
//! 内层元素全部为 ui-frame 组件（Input/Textarea/Switch/Checkbox/Collapse/
//! Table/Tag/Divider/Select/Segmented/Button）——不再手写原生表单元素。
//!
//! 背景：外壳原为手写 CSS 玻璃卡片、内层为原生 input/table；2026-09 两步
//! 改造为库组件（磨砂配方保留）。本测试锁定：
//!   1) 外壳带 glass 语义且样式覆写能命中（scope id）；
//!   2) 头部 / 滚动区 / 脚部仍是库内容槽的直接子级（滚动与贴底契约）；
//!   3) 内层不存在手写原生输入/表格（回归为裸元素即失败）。

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentConfigModal from '../AgentConfigModal.vue';
import { state } from '../../store';
import type { TeamInfo } from '../../protocol';

const team: TeamInfo = {
  id: 'alix',
  name: 'Alix',
  description: '主 agent',
  enabled: true,
  sessions: 0,
  enabled_tools: [],
  enabled_skills: [],
  enabled_plugins: [],
};

function seed() {
  state.skills = [
    { name: 'coding', description: 'd', keywords: [], always: false, enabled: true, category: '', content: '' },
  ] as typeof state.skills;
  state.tools = [
    { name: 'bash', description: 'd', parameters: null, category: 'builtin', enabled: true, package: 'echo-agent.tools.builtin' },
  ] as typeof state.tools;
  state.plugins = [
    { id: 'echo-agent.tools.builtin', name: '内置工具集', version: '1', kind: 'tool', description: '', entry: '', author: '', enabled: true, builtin: true, package: 'echo-agent.tools.builtin' },
  ] as typeof state.plugins;
}

function mountModal() {
  return mount(AgentConfigModal, { props: { team } });
}

describe('AgentConfigModal 玻璃外壳', () => {
  it('外壳带 NeumorphismCard glass 语义与自身定位类', () => {
    const wrapper = mountModal();
    const shell = wrapper.find('.agent-config');
    expect(shell.exists()).toBe(true);
    expect(shell.classes()).toContain('nm-card');
    expect(shell.classes()).toContain('nm-card--glass');
    // no-padding：内容槽不叠加库内边距（内层自带 padding）
    expect(shell.classes()).toContain('nm-card--no-padding');
    // 外壳继承本组件的 scope id，样式区的
    // `.agent-config-overlay .agent-config[data-v-*]` 覆写（圆角/边框/投影）
    // 才能命中库的玻璃配方。
    const scopeKeys = Object.keys(wrapper.find('.agent-config-overlay').attributes()).filter((k) =>
      k.startsWith('data-v-'),
    );
    expect(scopeKeys.length).toBeGreaterThan(0);
    for (const key of scopeKeys) {
      expect(shell.attributes(key), `外壳缺少 ${key}`).toBeDefined();
    }
  });

  it('头部 / 滚动区 / 脚部是内容槽（.nm-card__body）的直接子级', () => {
    const wrapper = mountModal();
    const slot = wrapper.find('.agent-config .nm-card__body');
    expect(slot.exists()).toBe(true);
    const classes = Array.from(slot.element.children).map((el) => el.className);
    for (const part of ['agent-config__head', 'agent-config__body', 'agent-config__foot']) {
      expect(
        classes.some((c) => c.includes(part)),
        `${part} 应为内容槽直接子级：${classes.join(' | ')}`,
      ).toBe(true);
    }
  });
});

describe('AgentConfigModal 内层元素 = ui-frame 组件', () => {
  beforeEach(seed);

  it('基础字段用库组件渲染', () => {
    const wrapper = mountModal();
    for (const cls of [
      '.nm-input', // 名称 / 描述
      '.nm-textarea', // 系统提示词
      '.nm-switch', // 启用
      '.nm-select', // API 供应商
      '.nm-segmented', // 循环模式
      '.nm-divider', // 分组分隔
    ]) {
      expect(wrapper.find(`.agent-config ${cls}`).exists(), `缺少 ${cls}`).toBe(true);
    }
    // 库 FormItem 提供标签
    expect(wrapper.findAll('.agent-config .nm-form-item').length).toBeGreaterThanOrEqual(3);
  });

  it('能力区用库 Collapse + Table + Checkbox 渲染（插件黑名单已移除）', () => {
    const wrapper = mountModal();
    // 三个能力分区：启用插件 / 启用工具 / 启用技能（禁用插件黑名单已移除）
    expect(wrapper.findAll('.agent-config .nm-collapse__item').length).toBe(3);
    expect(wrapper.findAll('.agent-config .nm-table').length).toBeGreaterThan(0);
    expect(wrapper.findAll('.agent-config .nm-checkbox').length).toBeGreaterThan(0);
    // 不再有黑名单 UI：无禁用分区标题、无黑名单标签
    expect(wrapper.text()).not.toContain('黑名单');
    expect(wrapper.findAll('.agent-config .nm-tag').length).toBe(0);
    // 表格行/列契约：行键 = GroupedItem.key，三列表头
    const heads = wrapper.findAll('.agent-config .nm-table__th').slice(0, 3);
    expect(heads.map((h) => h.text())).toEqual(['名称', '介绍', '启用']);
  });

  it('不再手写原生表单元素（input/textarea/table 只允许库内部实现）', () => {
    const wrapper = mountModal();
    const el = wrapper.element as HTMLElement;
    const rawInputs = [...el.querySelectorAll('.agent-config input')].filter(
      (i) => !(i as HTMLElement).className.includes('nm-'),
    );
    const rawTextareas = [...el.querySelectorAll('.agent-config textarea')].filter(
      (t) => !(t as HTMLElement).className.includes('nm-'),
    );
    const rawTables = [...el.querySelectorAll('.agent-config table')].filter(
      (t) => !(t as HTMLElement).className.includes('nm-'),
    );
    expect(rawInputs.map((i) => (i as HTMLElement).className)).toEqual([]);
    expect(rawTextareas.map((t) => (t as HTMLElement).className)).toEqual([]);
    expect(rawTables.map((t) => (t as HTMLElement).className)).toEqual([]);
  });
});
