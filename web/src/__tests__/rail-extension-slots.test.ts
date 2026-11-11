//! 扩展卡槽位必须进布局（2026-11「文件浏览器 / Git 卡片消失」根治）。
//!
//! ## 现场故障
//!
//! 右栏的「文件浏览器 · <工作区>」与「Git 状态」两张卡整块消失。
//!
//! ## 根因
//!
//! 卡片是否渲染由**布局数组**决定（`railCardsFor` = `railLayout[side]` 逐个
//! 查 defs 再过滤）：不在数组里的 id 永远不渲染，扩展的门控再满足也没用。
//! 而扩展卡槽位（`railCardSlots: ['files','git']`）只能从**已注册的扩展**
//! 算出来，补位却只写在 `normalize()` 的末尾——那里有两条短路：
//!
//! 1. `normalize(null)` → 直接 `return defaultLayout()`（内置卡默认布局），
//!    **根本不进 `fillUnplaced`**。首访 / 新端口 / 清过缓存 / 隐私模式
//!    （localStorage 抛错也得到 null）一律如此 → 卡片从第一次访问起就不存在。
//! 2. 模块级 `reactive(load())` 在 import 时求值，此时扩展可能还没注册
//!    （`virtual:panel-extensions` 的求值时序不属于本模块能控制的范围）→
//!    槽位算不出来，且此后没有任何重算时机。
//!
//! ## 修法
//!
//! 把补位从「初始化那一刻」挪到「注册表变化」上：`watch(panelExtensionsRevision,
//! syncExtensionSlots, { immediate: true })`。`immediate` 覆盖"注册在前"的
//! 时序，后续触发覆盖"注册在后"的时序，两种都不再依赖 localStorage 是否存在。
//!
//! 幂等性由 `seen` 保证（含两列现有全部 id），用户把卡片拖到左列后不会被
//! 重复补进右列；插入位置沿用 `fillUnplaced` 的规范序，既有排序不受影响。

import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

const allIds = (layout: { left: string[]; right: string[] }) => [...layout.left, ...layout.right];

describe('扩展卡槽位补位', () => {
  it('首访（无持久化布局）+ 注册在前 → 槽位进布局', async () => {
    const registry = await import('../extensions/registry');
    registry.registerPanelExtension({ id: 'echo-agent.workspace', railCardSlots: ['files', 'git'] });
    const layoutMod = await import('../rail-layout');
    await Promise.resolve(); // watch 默认 pre-flush：等一次微任务

    const ids = allIds(layoutMod.railLayout);
    expect(ids).toContain('extension:echo-agent.workspace:files');
    expect(ids).toContain('extension:echo-agent.workspace:git');
  });

  it('首访 + 布局先初始化、扩展后注册 → 注册时补进布局', async () => {
    const layoutMod = await import('../rail-layout');
    expect(allIds(layoutMod.railLayout)).not.toContain('extension:late.ext:files');

    const registry = await import('../extensions/registry');
    registry.registerPanelExtension({ id: 'late.ext', railCardSlots: ['files'] });
    await Promise.resolve();

    expect(allIds(layoutMod.railLayout)).toContain('extension:late.ext:files');
  });

  it('已有持久化布局 → 补齐缺失槽位且不重复', async () => {
    localStorage.setItem(
      'echo-panel-rail-layout',
      JSON.stringify({ left: [], right: ['status', 'session'] }),
    );
    const registry = await import('../extensions/registry');
    registry.registerPanelExtension({ id: 'ws.ext', railCardSlots: ['files', 'git'] });
    const layoutMod = await import('../rail-layout');
    await Promise.resolve();

    const ids = allIds(layoutMod.railLayout);
    expect(ids.filter((id) => id === 'extension:ws.ext:files')).toHaveLength(1);
    expect(ids).toContain('extension:ws.ext:git');
    // 用户既有排序保留
    expect(layoutMod.railLayout.right.indexOf('status')).toBeLessThan(
      layoutMod.railLayout.right.indexOf('session'),
    );
  });

  it('用户把扩展卡拖到左列 → 补位不把它再塞回右列', async () => {
    localStorage.setItem(
      'echo-panel-rail-layout',
      JSON.stringify({ left: ['extension:ws.ext:files'], right: ['status'] }),
    );
    const registry = await import('../extensions/registry');
    registry.registerPanelExtension({ id: 'ws.ext', railCardSlots: ['files', 'git'] });
    const layoutMod = await import('../rail-layout');
    await Promise.resolve();

    expect(layoutMod.railLayout.left).toContain('extension:ws.ext:files');
    expect(layoutMod.railLayout.right).not.toContain('extension:ws.ext:files');
  });

  it('槽位进布局后，门控满足即可渲染（railCardsFor 能查到）', async () => {
    const registry = await import('../extensions/registry');
    registry.registerPanelExtension({
      id: 'echo-agent.workspace',
      railCardSlots: ['files', 'git'],
      railCards: () => [
        { id: 'files', title: '文件浏览器 · demo', component: { render: () => null } as never },
        { id: 'git', title: 'Git 状态', component: { render: () => null } as never },
      ],
    });
    const layoutMod = await import('../rail-layout');
    const cardsMod = await import('../rail-cards');
    await Promise.resolve();

    const titles = cardsMod.railCardsFor('right', null).map((card) => card.title);
    expect(titles).toContain('文件浏览器 · demo');
    expect(titles).toContain('Git 状态');
    // 列显隐判据也基于布局数组（`railRegistered` 在 rail-cards 里）
    expect(allIds(layoutMod.railLayout).length).toBeGreaterThan(0);
  });
});
