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
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mount } from '@vue/test-utils';
import AgentConfigModal from '../AgentConfigModal.vue';
import { state } from '../../store';
import type { ModuleInfo, SkillInfo, TeamInfo } from '../../protocol';

/** TeamInfo 工厂：用例只写差异字段，其余取 Core 的缺省值。 */
function makeTeam(partial: Partial<TeamInfo> & { id: string }): TeamInfo {
  return {
    name: partial.id,
    node_id: null,
    region_name: null,
    description: '',
    enabled: true,
    running: true,
    system_skills: [],
    sessions: 0,
    system_prompt: '',
    disabled_tools: [],
    disabled_skills: [],
    enabled_modules: [],
    enabled_tools: [],
    enabled_skills: [],
    memory_limit_tokens: null,
    context_window_tokens: null,
    api_profile: null,
    ...partial,
  };
}

/** SkillInfo 工厂：用例只写差异字段，其余取 Core 的缺省值。 */
function skill(partial: Partial<SkillInfo> & { name: string }): SkillInfo {
  return {
    description: '',
    keywords: [],
    always: false,
    enabled: true,
    category: '',
    content: '',
    system: false,
    ...partial,
  };
}

/** ModuleInfo 工厂：用例只写差异字段，其余取 Core 的缺省值。 */
function mod(partial: Partial<ModuleInfo> & { id: string }): ModuleInfo {
  return {
    name: partial.id,
    version: '1',
    kind: 'tool',
    description: '',
    tag: 'inner',
    author: '',
    builtin: true,
    runtime: 'in_process',
    package: partial.id,
    gating: 'persona',
    config_origin: '',
    state: '',
    restarts: 0,
    generation: 0,
    source_path: '',
    command: '',
    args: [],
    env_keys: [],
    required_services: [],
    provides_services: [],
    optional_services: [],
    pending_services: [],
    subscribed_events: [],
    ...partial,
  };
}

const team: TeamInfo = makeTeam({
  id: 'alix',
  name: 'Alix',
  description: '主 agent',
});

function seed() {
  state.skills = [skill({ name: 'coding', description: 'd' })];
  state.tools = [
    { name: 'bash', description: 'd', parameters: null, category: 'builtin', enabled: true, package: 'echo-agent.tools.builtin' },
  ] as typeof state.tools;
  state.modules = [
    mod({ id: 'echo-agent.tools.builtin', name: '内置工具集' }),
    mod({ id: 'echo-agent.workspace', name: '工作区会话' }),
    mod({ id: 'echo-agent.future-interaction', name: '交互示例', kind: 'interaction', gating: 'process' }),
    mod({ id: 'echo-agent.management.panel', name: '管理面', kind: 'management', gating: 'process' }),
  ];
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
      '.nm-select', // API 供应商
      '.nm-divider', // 分组分隔
    ]) {
      expect(wrapper.find(`.agent-config ${cls}`).exists(), `缺少 ${cls}`).toBe(true);
    }
    // 库 FormItem 提供标签
    expect(wrapper.findAll('.agent-config .nm-form-item').length).toBeGreaterThanOrEqual(3);
  });

  it('不在这里编辑启停（运行控制归智能体列表的行操作）', () => {
    // 2026-11：启停是运行控制，和静态配置的生命周期不同——放进配置表单会
    // 诱使用户"保存"一次就把当前运行态固化成配置（启动失败会被写成停用）。
    const wrapper = mountModal();
    expect(wrapper.find('.agent-config .nm-switch').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('启用（禁用即卸载记忆');
  });

  it('保存时原样透传启停状态（整对象覆盖不能把它清成默认值）', () => {
    // `SaveTeam` 是整对象覆盖：本弹层不再编辑 `enabled`，但仍必须把它带回去
    // ——漏传就等于"每保存一次配置就把启用状态重置成默认值"。
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'AgentConfigModal.vue'),
      'utf-8',
    );
    expect(source).toContain('enabled: props.team.enabled');
  });

  it('启用模块区包含包维度门控模块（工作区会话）', () => {
    const wrapper = mountModal();
    // 回归：workspace 模块（kind=tool）曾因不在允许清单而被隐藏
    expect(wrapper.text()).toContain('工作区会话');
  });

  it('interaction 类模块单列「交互」分组，不混入管理面', () => {
    const wrapper = mountModal();
    // 回归：分组曾按「非实例即管理面」粗分，把交互类模块归入管理面。
    expect(wrapper.text()).toContain('交互（1）');
    expect(wrapper.text()).toContain('交互示例');
  });

  it('进程级能力（管理面/交互面）显示但置灰，且不写进白名单', async () => {
    const wrapper = mountModal();
    // 描述里直说"进程级"，标签上也有分组名——用户看得到为什么勾不动
    expect(wrapper.text()).toContain('进程级，对所有人格始终生效');
    // 这些行的勾选框 disabled（Core 判 process）；库的修饰类名是 --disabled
    expect(wrapper.findAll('.nm-checkbox--disabled').length).toBeGreaterThan(0);
    // 分组仍列出这两个能力（"管理面"组里既有 tool 模块也有 management 模块，
    // 组头不禁用——组内还有可写的项；只读只作用于那一行）
    expect(wrapper.text()).toContain('交互（1）');
    expect(wrapper.text()).toContain('管理面（3）');
  });

  it('能力区用库 Collapse + Table + Checkbox 渲染（模块黑名单已移除）', () => {
    const wrapper = mountModal();
    // 三个能力分区：启用模块 / 启用工具 / 启用技能（禁用模块黑名单已移除）
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
