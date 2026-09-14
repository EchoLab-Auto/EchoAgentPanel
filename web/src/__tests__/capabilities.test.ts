//! 能力推导 + 插件勾选清单契约。
//!
//! 背景（2026-09-13 工作区插件「配置里看不到」遗漏）：Panel 「启用插件」
//! 勾选区是**硬编码允许清单**（kind ∈ {adapter, management} ∪ 包维度门控
//! 插件），新增包维度插件时容易漏同步。本测试锁定：
//!   1. 清单收敛为单一来源（capabilities.ts），两个组件引用同一常量；
//!   2. 清单内容与 Core 的 GATED_PLUGIN_IDS 对齐（含 workspace）；
//!   3. 勾选可见性判定语义。

import { describe, it, expect } from 'vitest';
import {
  PACKAGE_GATED_PLUGIN_IDS,
  PACKAGE_DISPLAY_NAMES,
  PLUGIN_KIND_LABELS,
  isPluginCheckboxVisible,
  teamPluginEnabled,
  teamToolAvailable,
} from '../capabilities';
import type { TeamInfo } from '../protocol';

describe('包维度门控插件清单（单一来源）', () => {
  it('包含全部包维度门控插件（对齐 Core GATED_PLUGIN_IDS）', () => {
    // Core 侧 echo-agent/src/plugins.rs::GATED_PLUGIN_IDS 的镜像：
    // 增删任一侧都必须两边同改（此处防回归）。
    expect([...PACKAGE_GATED_PLUGIN_IDS].sort()).toEqual(
      [
        'echo-agent.adapter.qq',
        'echo-agent.checklist',
        'echo-agent.menu',
        'echo-agent.skills.dir',
        'echo-agent.tools.builtin',
        'echo-agent.workspace',
      ].sort(),
    );
  });

  it('每个门控插件都有中文显示名（工具/包分组可读性）', () => {
    for (const id of PACKAGE_GATED_PLUGIN_IDS) {
      expect(PACKAGE_DISPLAY_NAMES[id], `缺少显示名: ${id}`).toBeTruthy();
    }
  });

  it('勾选可见性：kind 类 + 门控清单 + 其余不可见', () => {
    // adapter / management / interaction 类恒可见（整类能力开关）
    expect(isPluginCheckboxVisible({ id: 'echo-agent.adapter.qq', kind: 'adapter' })).toBe(true);
    expect(isPluginCheckboxVisible({ id: 'echo-agent.management.panel', kind: 'management' })).toBe(true);
    expect(isPluginCheckboxVisible({ id: 'echo-agent.menu', kind: 'interaction' })).toBe(true);
    // interaction 类不在门控清单里也可见（kind 判定生效）
    expect(isPluginCheckboxVisible({ id: 'echo-agent.future-interaction', kind: 'interaction' })).toBe(true);
    // 包维度门控（kind=tool）可见
    for (const id of PACKAGE_GATED_PLUGIN_IDS) {
      expect(isPluginCheckboxVisible({ id, kind: 'tool' }), id).toBe(true);
    }
    // 循环互斥插件与名义挂载插件不在勾选区（由循环模式分段 / 重启生效）
    expect(isPluginCheckboxVisible({ id: 'echo-agent.loop.single', kind: 'loop' })).toBe(false);
    expect(isPluginCheckboxVisible({ id: 'echo-agent.loop.parallel', kind: 'loop' })).toBe(false);
    expect(isPluginCheckboxVisible({ id: 'echo-agent.orchestration', kind: 'orchestration' })).toBe(false);
    expect(isPluginCheckboxVisible({ id: 'echo-agent.provider.llm', kind: 'provider' })).toBe(false);
  });

  it('插件 kind 中文显示名覆盖 Core PluginKind 全部 wire 名（含 interaction=交互）', () => {
    // Core 端 echo-plugin::PluginKind 的 as_str 全集（新增 kind 必须同步标签）。
    const kinds = ['skill', 'tool', 'provider', 'loop', 'adapter', 'orchestration', 'management', 'interaction'];
    for (const kind of kinds) {
      expect(PLUGIN_KIND_LABELS[kind], `缺少 kind 显示名: ${kind}`).toBeTruthy();
    }
    expect(PLUGIN_KIND_LABELS.interaction).toBe('交互');
  });
});

describe('persona 名单语义（含包维度）', () => {
  const team = (over: Partial<TeamInfo>): TeamInfo =>
    ({ id: 't', name: 't', enabled: true, sessions: 0, ...over }) as TeamInfo;

  it('插件白名单：空表全启用，非空即精确匹配', () => {
    expect(teamPluginEnabled(team({}), 'echo-agent.workspace')).toBe(true);
    expect(
      teamPluginEnabled(team({ enabled_plugins: ['echo-agent.workspace'] }), 'echo-agent.workspace'),
    ).toBe(true);
    expect(
      teamPluginEnabled(team({ enabled_plugins: ['echo-agent.checklist'] }), 'echo-agent.workspace'),
    ).toBe(false);
  });

  it('工具可用性：内置工具集被禁即全部不可用', () => {
    const t = team({ enabled_plugins: ['echo-agent.skills.dir'] });
    expect(teamToolAvailable(t, 'bash')).toBe(false);
    expect(teamToolAvailable(t, 'workspace')).toBe(false);
  });

  it('工具可用性：工具级名单与禁用表细化', () => {
    const base = team({ enabled_plugins: ['echo-agent.tools.builtin'] });
    expect(teamToolAvailable(base, 'workspace')).toBe(true);
    expect(teamToolAvailable(team({ ...base, disabled_tools: ['workspace'] }), 'workspace')).toBe(false);
    expect(teamToolAvailable(team({ ...base, enabled_tools: ['bash'] }), 'workspace')).toBe(false);
  });
});
