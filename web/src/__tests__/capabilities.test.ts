//! 能力推导 + 模块勾选清单契约。
//!
//! 背景（2026-09-13 工作区模块「配置里看不到」遗漏）：Panel 「启用模块」
//! 勾选区是**硬编码允许清单**（kind ∈ {instance, management, interaction} ∪
//! 包维度门控模块），新增包维度模块时容易漏同步。本测试锁定：
//!   1. 清单收敛为单一来源（capabilities.ts），两个组件引用同一常量；
//!   2. 清单内容与 Core 的 GATED_MODULE_IDS 对齐（4 项，含 workspace）；
//!   3. 勾选可见性判定语义；
//!   4. 实例**不走清单**（kind 运行期推导），新增平台零改动。

import { describe, it, expect } from 'vitest';
import {
  PACKAGE_DISPLAY_NAMES,
  MODULE_KIND_LABELS,
  moduleCheckboxState,
  isInstanceModuleKind,
  isModuleCheckboxVisible,
  teamModuleEnabled,
  teamToolAvailable,
} from '../capabilities';
import type { TeamInfo } from '../protocol';

describe('包维度门控模块清单（单一来源）', () => {
  it('勾选区只读 Core 下发的 gating，不再维护自己的模块清单', () => {
    // 曾经这里是 `PACKAGE_GATED_MODULE_IDS` 的镜像断言——那份清单与 Core 的
    // `GATED_MODULE_IDS` 是同一件事的两份手写真相，实测错过两轮
    // （shell 漏列 → 面板没有 shell 开关；session/transcript 多列 → 假开关）。
    // 现在判据在 Core（按 manifest.kind 派生），随 ModuleInfo.gating 下发。
    expect(isModuleCheckboxVisible({ id: 'x', kind: 'tool', gating: 'persona' })).toBe(true);
    // 进程级模块即使 kind 看着像能力型也不显示（以 Core 为准）。
    expect(isModuleCheckboxVisible({ id: 'x', kind: 'tool', gating: 'process' })).toBe(false);
    // 旧 Core 不发该字段：退回 kind 类判定，不让模块在 UI 里凭空消失。
    expect(isModuleCheckboxVisible({ id: 'echo-agent.shell', kind: 'tool' })).toBe(false);
    expect(isModuleCheckboxVisible({ id: 'echo-agent.instance.qq', kind: 'instance' })).toBe(
      true,
    );
  });

  it('三态判定：persona 可勾 / process 里 management+interaction 只读 / 其余隐藏', () => {
    // 可勾 = Core 说 persona
    expect(moduleCheckboxState({ id: 'x', kind: 'tool', gating: 'persona' })).toBe('enabled');
    // 进程级但值得显示：用户心智里"这个人格有没有管理/交互能力"
    expect(moduleCheckboxState({ id: 'x', kind: 'management', gating: 'process' })).toBe(
      'readonly',
    );
    expect(moduleCheckboxState({ id: 'x', kind: 'interaction', gating: 'process' })).toBe(
      'readonly',
    );
    // 进程级且开关在别处 → 干脆不显示
    expect(moduleCheckboxState({ id: 'x', kind: 'loop', gating: 'process' })).toBe('hidden');
    expect(moduleCheckboxState({ id: 'x', kind: 'provider', gating: 'process' })).toBe('hidden');
    expect(moduleCheckboxState({ id: 'x', kind: 'session', gating: 'process' })).toBe('hidden');
  });

  it('只读项仍然出现在勾选区（只是勾不动）', () => {
    // `isModuleCheckboxVisible` 是"显示与否"，不是"能不能改"——两者分开，
    // 否则把 management 藏起来会让用户以为这个能力不存在。
    expect(isModuleCheckboxVisible({ id: 'x', kind: 'management', gating: 'process' })).toBe(
      true,
    );
    expect(isModuleCheckboxVisible({ id: 'x', kind: 'loop', gating: 'process' })).toBe(false);
  });

  it('旧 Core（无 gating）三态全部退回可勾，不产生只读态', () => {
    // 老 Core 不告诉我们作用域，Panel 不该凭空造出一个"置灰"的开关。
    for (const kind of ['instance', 'management', 'interaction']) {
      expect(moduleCheckboxState({ id: 'x', kind }), kind).toBe('enabled');
    }
    expect(moduleCheckboxState({ id: 'x', kind: 'tool' })).toBe('hidden');
  });

  it('shell 是能力型模块：Core 下发 persona 后它必须出现在勾选区', () => {
    // 回归 2026-11：shell 从 tools.builtin 拆出时 Panel 清单没跟着加，
    // 面板上没有 shell 开关，用户无法通过 UI 给任何 persona 启用 bash-*。
    expect(
      isModuleCheckboxVisible({ id: 'echo-agent.shell', kind: 'tool', gating: 'persona' }),
    ).toBe(true);
  });

  it('实例类 kind 新旧 wire 名都可见（instance / adapter）', () => {
    // 2026-10 去适配器化：Core 的 wire 名由 `adapter` 改为 `instance`。
    // Panel 与 Core 独立升级，因此两者都必须被认作「平台通道」。
    for (const kind of ['instance', 'adapter']) {
      expect(isInstanceModuleKind(kind), kind).toBe(true);
      expect(isModuleCheckboxVisible({ id: 'echo-agent.instance.qq', kind }), kind).toBe(true);
    }
    for (const kind of ['tool', 'skill', 'loop', 'provider', 'orchestration']) {
      expect(isInstanceModuleKind(kind), kind).toBe(false);
    }
  });

  it('实例按 kind 运行期推导：新增平台无需改清单', () => {
    // 2026-10 实例解耦：框架不再枚举平台名——Core `gated_module_ids()`
    // 遍历模块注册表取 `kind == "instance"`，Panel 侧即
    // `isModuleCheckboxVisible` 的 kind 判定。这里锁定同一语义：将来接入
    // telegram / discord 等新平台模块，不改任何清单也会出现在勾选区。
    for (const platform of ['qq', 'telegram', 'discord']) {
      const id = `echo-agent.instance.${platform}`;
      // 不再有"清单里没有它"这回事——判据是 Core 下发的 gating。
      expect(
        isModuleCheckboxVisible({ id, kind: 'instance', gating: 'persona' }),
        id,
      ).toBe(true);
    }
  });

  it('能力型模块都有中文显示名（工具/包分组可读性）', () => {
    // 清单删了，改为按 Core 的 kind 作用域枚举（persona 级的三类 kind）。
    // 新增 persona 级模块而忘了加显示名时，这里红。
    const personaScoped = [
      'echo-agent.tools.builtin',
      'echo-agent.shell',
      'echo-agent.workspace',
      'echo-agent.subagent',
      'echo-agent.skills.dir',
    ];
    for (const id of personaScoped) {
      expect(PACKAGE_DISPLAY_NAMES[id], `缺少显示名: ${id}`).toBeTruthy();
    }
  });

  it('勾选可见性完全由 Core 的 gating 决定', () => {
    // Core 说 persona → 显示；说 process → 不显示。Panel 没有第二套判据。
    for (const id of [
      'echo-agent.tools.builtin',
      'echo-agent.skills.dir',
      'echo-agent.workspace',
      'echo-agent.subagent',
      'echo-agent.shell',
      'echo-agent.instance.qq',
    ]) {
      expect(isModuleCheckboxVisible({ id, kind: 'tool', gating: 'persona' }), id).toBe(true);
    }
    for (const id of [
      'echo-agent.loop.single',
      'echo-agent.loop.parallel',
      'echo-agent.provider.llm',
      'echo-agent.selfupdate',
      'echo-agent.federation',
      'echo-agent.session',
      'echo-agent.transcript',
      'echo-agent.management.panel',
    ]) {
      expect(isModuleCheckboxVisible({ id, kind: 'tool', gating: 'process' }), id).toBe(false);
    }
  });

  it('模块 kind 中文显示名覆盖 Core ModuleKind 全部 wire 名（含 interaction=交互）', () => {
    // Core 端 echo-module::ModuleKind 的 as_str 全集（新增 kind 必须同步标签）。
    const kinds = ['skill', 'tool', 'provider', 'loop', 'instance', 'orchestration', 'management', 'interaction', 'session', 'federation', 'security', 'kernel', 'panel'];
    for (const kind of kinds) {
      expect(MODULE_KIND_LABELS[kind], `缺少 kind 显示名: ${kind}`).toBeTruthy();
    }
    expect(MODULE_KIND_LABELS.interaction).toBe('交互');
  });
});

describe('persona 名单语义（含包维度）', () => {
  const team = (over: Partial<TeamInfo>): TeamInfo =>
    ({ id: 't', name: 't', enabled: true, sessions: 0, ...over }) as TeamInfo;

  it('模块白名单：空表全启用，非空即精确匹配', () => {
    expect(teamModuleEnabled(team({}), 'echo-agent.workspace')).toBe(true);
    expect(
      teamModuleEnabled(team({ enabled_modules: ['echo-agent.workspace'] }), 'echo-agent.workspace'),
    ).toBe(true);
    expect(
      teamModuleEnabled(team({ enabled_modules: ['echo-agent.skills.dir'] }), 'echo-agent.workspace'),
    ).toBe(false);
  });

  it('工具可用性：内置工具集被禁即全部不可用', () => {
    const t = team({ enabled_modules: ['echo-agent.skills.dir'] });
    expect(teamToolAvailable(t, 'bash')).toBe(false);
    expect(teamToolAvailable(t, 'workspace')).toBe(false);
  });

  it('工具可用性：工具级名单与禁用表细化', () => {
    const base = team({ enabled_modules: ['echo-agent.tools.builtin'] });
    expect(teamToolAvailable(base, 'workspace')).toBe(true);
    expect(teamToolAvailable(team({ ...base, disabled_tools: ['workspace'] }), 'workspace')).toBe(false);
    expect(teamToolAvailable(team({ ...base, enabled_tools: ['bash'] }), 'workspace')).toBe(false);
  });
});
