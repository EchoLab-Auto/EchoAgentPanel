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
  packageLabel,
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

  it('包显示名来自模块自己的 manifest，不是 Panel 的一张表', () => {
    // 曾经这里断言「每个 persona 级模块都在 PACKAGE_DISPLAY_NAMES 里有中文名」。
    // 那张 12 项的表是 Panel 侧的第二份真相：新增模块必须改 Panel 才好看，
    // 模块改名时 Panel 继续显示旧名——两个方向都不报错。
    //
    // 现在显示名 = 模块 manifest 的 `name`（`ModuleInfo.name`）。有模块就用它，
    // 没有就原样显示 id——Panel 不再持有任何模块名知识。
    const modules = [{ id: 'echo-agent.workspace', name: '工作区会话' }];
    expect(packageLabel('echo-agent.workspace', modules)).toBe('工作区会话');
    // 未知包（不是模块 id，或 modules 还没到）：原样显示 id，不猜。
    expect(packageLabel('echo-agent.unknown.pkg', modules)).toBe('echo-agent.unknown.pkg');
    // 无包归属：用调用方给的兜底文案。
    expect(packageLabel(undefined, modules)).toBe('独立技能');
    expect(packageLabel(null, modules, '独立工具')).toBe('独立工具');
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
    ({
      id: 't',
      name: 't',
      enabled: true,
      sessions: 0,
      available_modules: [],
      available_tools: [],
      ...over,
    }) as TeamInfo;

  // 2026-11 根治：判定规则搬到 Core，这里只测**查表**与两条协议契约。
  //
  // 此前这三条测的是 Panel 自己实现的名单语义（"空白名单 = 全部启用、
  // 非空即精确匹配"），而 Core 侧同一件事有两处它做不到的差别：旧实例前缀
  // 归一、包级门控的 id 硬编码。现在名单形态由 Core 归一后下发
  // （`TeamInfo.available_*`），Panel 的判断退化成一次 `includes`。
  //
  // 名单语义本身（归一、空 = 不限的实际计算）在 Core 侧有测试——Panel 不再
  // 重复测一遍别人算好的结论。

  it('模块判据：查 Core 下发的结论名单；空 = 该人格未限制', () => {
    expect(teamModuleEnabled(team({}), 'echo-agent.workspace')).toBe(true);
    expect(
      teamModuleEnabled(
        team({ available_modules: ['echo-agent.workspace'] }),
        'echo-agent.workspace',
      ),
    ).toBe(true);
    expect(
      teamModuleEnabled(
        team({ available_modules: ['echo-agent.skills.dir'] }),
        'echo-agent.workspace',
      ),
    ).toBe(false);
  });

  it('模块判据：名单写旧实例前缀也命中（Core 归一后不会出现旧 id）', () => {
    // 这条是根治的**验收点**：Core 下发的是现役 id，所以传现役 id 必须命中。
    // 根治前 Panel 拿原始配置做字面量比较，配置里写旧 id 时会判成"未启用"。
    expect(
      teamModuleEnabled(
        team({ available_modules: ['echo-agent.instance.qq'] }),
        'echo-agent.instance.qq',
      ),
    ).toBe(true);
  });

  it('工具可用性：内置工具集这个包被禁 → 包内工具全部不可用', () => {
    const t = team({ available_modules: ['echo-agent.skills.dir'] });
    expect(teamToolAvailable(t, 'bash')).toBe(false);
    expect(teamToolAvailable(t, 'workspace')).toBe(false);
  });

  it('工具可用性：结论名单与禁用表细化', () => {
    const base = team({ available_modules: ['echo-agent.tools.builtin'] });
    expect(teamToolAvailable(base, 'workspace')).toBe(true);
    expect(teamToolAvailable(team({ ...base, disabled_tools: ['workspace'] }), 'workspace')).toBe(
      false,
    );
    expect(
      teamToolAvailable(team({ ...base, available_tools: ['bash'] }), 'workspace'),
    ).toBe(false);
  });

  it('旧 Core 不发结论字段：退回配置名单（兼容窗口）', () => {
    // 兼容分支必须能被测到——它是"新 Panel + 旧 Core"下唯一还能工作的路径。
    const legacy = (over: Record<string, unknown>) =>
      ({ id: 't', name: 't', enabled: true, sessions: 0, ...over }) as TeamInfo;
    expect(teamModuleEnabled(legacy({}), 'echo-agent.workspace')).toBe(true);
    expect(
      teamModuleEnabled(legacy({ enabled_modules: ['echo-agent.workspace'] }), 'echo-agent.workspace'),
    ).toBe(true);
    expect(
      teamModuleEnabled(legacy({ enabled_modules: ['echo-agent.skills.dir'] }), 'echo-agent.workspace'),
    ).toBe(false);
    expect(
      teamToolAvailable(legacy({ enabled_modules: ['echo-agent.tools.builtin'], enabled_tools: ['bash'] }), 'workspace'),
    ).toBe(false);
  });
});
