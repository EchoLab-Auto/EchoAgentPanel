//! 扩展主区视图（`PanelMainView`）的契约守护（2026-11）。
//!
//! ## 为什么需要这组测试
//!
//! 主区视图是**新增的扩展点**，它跨三处协作：注册表（`registry.ts`）给出带
//! 命名空间的 id，`App.vue` 负责渲染与持久化，`MobileViewSheet` 负责移动端
//! 入口。三处只要有一处不认这个前缀，症状都是"顶栏多了一个按钮，点了没反应"
//! ——而这恰好是最难从代码里看出来的失败模式（不报错、不空白，只是不切换）。
//!
//! 样式与条件渲染在 jsdom 下不可靠（`isMobile` 来自 `matchMedia`），所以沿用
//! 仓库既有的**源码断言**风格。

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = (...parts: string[]) => readFileSync(join(here, '..', ...parts), 'utf-8');

const appVue = src('App.vue');
const styles = src('styles.css');
const registry = src('extensions', 'registry.ts');
const viewSheet = src('components', 'MobileViewSheet.vue');
const extensionApi = src('extension-api.ts');

describe('主区视图：注册表', () => {
  it('扩展点类型与查询函数都从公开 SDK 导出', () => {
    // 扩展只能用 `@echo-agent/panel` 这个入口——漏导出等于这个扩展点对外不存在。
    for (const name of ['PanelMainView', 'mainViewId', 'panelMainViews', 'findMainView']) {
      expect(extensionApi, `extension-api 缺 ${name}`).toContain(name);
    }
  });

  it('id 带命名空间（两个扩展都写 `docs` 也不会撞）', () => {
    expect(registry).toContain('export function mainViewId');
    expect(registry).toMatch(/return `ext:\$\{extensionId\}:\$\{viewId\}`/);
  });

  it('`when` 门控在查询时就过滤（不是渲染时才判断）', () => {
    // 否则"不该出现的视图"会先占住顶栏位置、点进去再报错。
    expect(registry).toMatch(/\.filter\(\(view\) => \(view\.when \? view\.when\(context\) : true\)\)/);
  });
});

describe('主区视图：App 壳', () => {
  it('`View` 类型覆盖扩展前缀', () => {
    expect(appVue).toContain("type View = BuiltinView | `ext:${string}`");
  });

  it('持久化里读回的扩展视图要校验它还在，否则回落聊天', () => {
    // 只校验形状（`startsWith('ext:')`）不够：扩展可能已被卸载，
    // 那时渲染出来是空白，用户会以为面板坏了。
    expect(appVue).toContain('const resolvedView = computed');
    expect(appVue).toMatch(/extensionViews\.value\.some\(\(item\) => item\.viewId === current\)/);
  });

  it('回落要写回 `view`（否则顶栏没有任何选中态）', () => {
    expect(appVue).toMatch(/watch\(resolvedView, \(next\) => \{\s*if \(next !== view\.value\) setView\(next\)/);
  });

  it('顶栏按钮按注册顺序追加在「设置」之后', () => {
    const settings = appVue.indexOf(':pressed="view === \'settings\'"');
    const extButton = appVue.indexOf('v-for="item in extensionViews"');
    expect(settings, '缺设置按钮').toBeGreaterThan(0);
    expect(extButton, '缺扩展视图按钮').toBeGreaterThan(0);
    // 插到内置视图之间会打乱肌肉记忆。
    expect(extButton).toBeGreaterThan(settings);
  });

  it('移动端视图菜单拿到同一份扩展列表', () => {
    expect(appVue).toContain(':extensions="extensionViews.map(');
  });

  it('主区容器只给位置，不给 padding（画布类视图要贴边）', () => {
    const m = styles.match(/\.extension-view\s*\{([\s\S]*?)\}/);
    expect(m, '缺 .extension-view 规则').toBeTruthy();
    expect(m![1], '宿主不该替视图决定 padding').not.toMatch(/padding:/);
    expect(m![1]).toMatch(/overflow:\s*hidden/);
  });
});

describe('主区视图：移动端菜单', () => {
  it('接受扩展项，且与内置项同形（含选中态）', () => {
    expect(viewSheet).toContain('props.extensions ?? []');
    expect(viewSheet).toMatch(/'is-active': props\.view === item\.viewId/);
  });

  it('扩展项点击后关闭 Sheet（与内置项同一路径）', () => {
    expect(viewSheet).toMatch(/function pick\(id: PanelView \| string\): void \{[\s\S]*?closeMobileSheet\(\)/);
  });
});
