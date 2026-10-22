//! Agent 配置面板契约：外壳 = `SessionOverlay`（2026-10 统一：与入口行其余
//! 弹层同一套几何 / 玻璃 / 关闭语义），内层元素全部为 ui-frame 组件
//! （Input/Textarea/Switch/Checkbox/Collapse/Table/Tag/Divider/Select/
//! Segmented/Button）——不再手写原生表单元素。
//!
//! 沿革：外壳先是手写 CSS 玻璃卡片、后为 ui-frame `NeumorphismCard`，2026-10
//! 并入会话区覆盖面板（用户要求入口行弹层统一尺寸/样式）。本测试锁定：
//!   1) 外壳是 `.session-overlay`（几何由 inset 传入，缺省贴满父容器）；
//!   2) 头部 / 滚动区 / 脚部是内容容器的直接子级（滚动与贴底契约）；
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
    { id: 'echo-agent.workspace', name: '工作区会话', version: '1', kind: 'tool', description: '', entry: '', author: '', enabled: true, builtin: true, package: 'echo-agent.workspace' },
    { id: 'echo-agent.future-interaction', name: '交互示例', version: '1', kind: 'interaction', description: '', entry: '', author: '', enabled: true, builtin: true, package: 'echo-agent.future-interaction' },
  ] as typeof state.plugins;
}

function mountModal() {
  return mount(AgentConfigModal, { props: { team } });
}

describe('AgentConfigModal 外壳（SessionOverlay）', () => {
  it('外壳是统一的会话区覆盖面板，内容自成一列', () => {
    const wrapper = mountModal();
    const shell = wrapper.find('.session-overlay');
    expect(shell.exists()).toBe(true);
    // 内容容器（头部 / 表单体 / 脚部）撑满外壳
    const content = shell.find('.agent-config');
    expect(content.exists()).toBe(true);
    expect(shell.find('.session-overlay__body--flush').exists()).toBe(true);
  });

  it('inset 透传到外壳（几何 = 会话消息区矩形）', () => {
    const wrapper = mount(AgentConfigModal, {
      props: { team, inset: { top: 12, right: 340, bottom: 180, left: 340 } },
    });
    const shell = wrapper.find('.session-overlay');
    const style = shell.attributes('style') ?? '';
    for (const part of ['top: 12px', 'right: 340px', 'bottom: 180px', 'left: 340px']) {
      expect(style, `缺少 ${part}`).toContain(part);
    }
  });

  it('头部 / 滚动区 / 脚部是内容容器的直接子级', () => {
    const wrapper = mountModal();
    const content = wrapper.find('.agent-config');
    expect(content.exists()).toBe(true);
    const classes = Array.from(content.element.children).map((el) => el.className);
    for (const part of ['agent-config__head', 'agent-config__body', 'agent-config__foot']) {
      expect(
        classes.some((c) => c.includes(part)),
        `${part} 应为内容直接子级：${classes.join(' | ')}`,
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

  it('启用插件区包含包维度门控插件（工作区会话）', () => {
    const wrapper = mountModal();
    // 回归：workspace 插件（kind=tool）曾因不在允许清单而被隐藏
    expect(wrapper.text()).toContain('工作区会话');
  });

  it('interaction 类插件单列「交互」分组，不混入管理面', () => {
    const wrapper = mountModal();
    // 回归：分组曾按「非实例即管理面」粗分，把交互类插件归入管理面。
    expect(wrapper.text()).toContain('交互（1）');
    expect(wrapper.text()).toContain('交互示例');
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
