//! 移动端布局 v2 契约守护（2026-10 重设计）。
//!
//! 背景：v1 的移动端是「把桌面收窄」——顶栏硬塞「聊天 / 设置」两个视图按钮
//! （375px 上品牌被压成省略号），**Shell 视图没有顶栏入口**（只能走「卡片抽屉
//! → Shell 卡 → 详情」三级路径），入口行横滚但无任何「右边还有」的提示。
//!
//! v2 重新设计（详见 Core 文档 `document/panel/panel-mobile-layout.md`）：
//!
//! 1. 视图切换收进 `☰` 打开的底部 Sheet（三项：聊天 / 设置 / Shell），顶栏改为
//!    「`☰` + 当前视图标题 + 卡片 + 主题」——品牌让位给「当前在哪」。
//! 2. 入口行补「还有更多」提示（`›`，sticky 贴右缘，滚到底消失）。
//! 3. 卡片抽屉与视图菜单**互斥**（共用 `mobileSheet` 单值），不再叠层。
//! 4. Shell 视图在无目标会话时自动落到第一个；一个都没有则显式空态（原为空白）。
//!
//! 本测试锁定这四条契约。样式与模板的条件渲染在 jsdom 下不可靠（`isMobile`
//! 来自 `matchMedia`），沿用 `mobile-shell-layout.test.ts` 的源码断言风格。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = (...parts: string[]) => readFileSync(join(here, '..', ...parts), 'utf-8');

const appVue = src('App.vue');
const chatVue = src('components', 'ChatView.vue');
const css = src('styles.css');
const sheets = src('mobile-sheets.ts');
const viewSheet = src('components', 'MobileViewSheet.vue');

describe('移动端布局 v2：顶栏与视图菜单', () => {
  it('顶栏在移动端渲染 ☰ 入口，且仅移动端渲染', () => {
    expect(appVue, 'App.vue 应有 mobile-view-btn 按钮').toContain('class="mobile-view-btn"');
    // ☰ 必须带 v-if="isMobile"（桌面顶栏已有常驻视图按钮，重复入口会误导）
    const idx = appVue.indexOf('class="mobile-view-btn"');
    const before = appVue.slice(Math.max(0, idx - 300), idx);
    expect(before, '☰ 按钮必须限定在移动端').toMatch(/v-if="isMobile"/);
  });

  it('顶栏标题随视图变化（聊天 = Agent 名）', () => {
    expect(appVue).toContain('mobileTitle');
    expect(appVue, '标题应区分设置/Shell 与聊天').toMatch(/view\.value === 'settings'\) return '设置'/);
    expect(appVue).toMatch(/view\.value === 'shell'\) return 'Shell'/);
    expect(appVue, '聊天视图取当前 Agent 名').toMatch(/currentTeam\(state\)\?\.name/);
  });

  it('桌面视图按钮在移动端隐藏（v-if="!isMobile"）', () => {
    const idx = appVue.indexOf('桌面：视图按钮直接可见');
    expect(idx, '桌面视图按钮段应有说明注释').toBeGreaterThan(0);
    const seg = appVue.slice(idx, idx + 900);
    expect(seg, '桌面视图按钮必须包在 v-if="!isMobile" 内').toContain('v-if="!isMobile"');
  });

  it('视图菜单含三个视图（含 Shell），且顺序固定', () => {
    for (const id of ["id: 'chat'", "id: 'settings'", "id: 'shell'"]) {
      expect(viewSheet, `视图菜单缺 ${id}`).toContain(id);
    }
    // 顺序：chat 必须在 settings 之前，settings 在 shell 之前
    expect(viewSheet.indexOf("id: 'chat'")).toBeLessThan(viewSheet.indexOf("id: 'settings'"));
    expect(viewSheet.indexOf("id: 'settings'")).toBeLessThan(viewSheet.indexOf("id: 'shell'"));
  });

  it('视图菜单只在移动端挂载', () => {
    expect(appVue).toContain('<MobileViewSheet v-if="isMobile"');
  });

  it('Sheet 项触控高度 ≥ 44px', () => {
    const m = viewSheet.match(/\.view-sheet__item\s*\{([\s\S]*?)\}/);
    expect(m, '缺 .view-sheet__item 规则').toBeTruthy();
    const h = /min-height:\s*(\d+)px/.exec(m![1]);
    expect(h, '缺 min-height').toBeTruthy();
    expect(Number(h![1])).toBeGreaterThanOrEqual(44);
  });
});

describe('移动端布局 v2：Sheet 互斥', () => {
  it('卡片抽屉与视图菜单共用同一个 sheet 单值（互斥，不叠层）', () => {
    expect(sheets, 'mobile-sheets.ts 应导出 mobileSheet').toMatch(/export const mobileSheet = ref<MobileSheet>/);
    expect(sheets, '卡片抽屉是 mobileSheet 的视图').toMatch(/mobileSheet\.value === 'cards'/);
    expect(sheets, '视图菜单是 mobileSheet 的视图').toMatch(/mobileSheet\.value === 'view'/);
  });

  it('mobile-cards.ts 只是兼容转发（不再是独立 ref）', () => {
    const legacy = src('mobile-cards.ts');
    expect(legacy, 'mobile-cards 应 re-export mobile-sheets').toContain("from './mobile-sheets'");
    expect(legacy, 'mobile-cards 不应再持有自己的 ref').not.toMatch(/export const mobileCardsDrawerOpen = ref/);
  });
});

describe('移动端布局 v2：入口行横滚提示', () => {
  it('入口行滚动容器挂了 ref 与 scroll 监听', () => {
    expect(chatVue).toMatch(/<div ref="entryRowRef" class="entry-row" @scroll\.passive="syncEntryScroll">/);
  });

  it('提示只在「可滚且未到底」时渲染', () => {
    const m = chatVue.match(/v-if="([^"]*)"\s*\n\s*class="entry-row__more"/);
    // 允许 v-if 在 class 之��或之后
    const alt = chatVue.match(/v-if="(entryScrollable && !entryAtEnd)"/);
    expect(alt || m, '提示必须有 entryScrollable && !entryAtEnd 守卫').toBeTruthy();
  });

  it('可滚性在能力开关变化时重算（按钮 v-if 会增减）', () => {
    const idx = chatVue.indexOf('watch(\n  [sessionSwitcherAvailable, workspaceAvailable, tasksAvailable, instanceAvailable]');
    expect(idx, '缺能力开关变化的 watch').toBeGreaterThan(0);
  });

  it('提示不拦截指针事件（否则挡住最后一个按钮）', () => {
    const m = chatVue.match(/\.entry-row__more\s*\{([\s\S]*?)\}/);
    expect(m, '缺 .entry-row__more 规则').toBeTruthy();
    expect(m![1]).toMatch(/pointer-events:\s*none/);
  });

  it('样式只写在移动段内（桌面零回归）', () => {
    const mobileStart = css.indexOf('@media (max-width: 767.98px)');
    expect(mobileStart).toBeGreaterThanOrEqual(0);
    // .entry-row__more 定���在 ChatView 的 scoped 移动段里，不在全局 css
    const chatMobileStart = chatVue.indexOf('@media (max-width: 767.98px)');
    expect(chatMobileVueHas(chatMobileStart)).toBe(true);

    function chatMobileVueHas(start: number): boolean {
      if (start < 0) return false;
      const seg = chatVue.slice(start);
      return seg.includes('.entry-row__more');
    }
  });
});

describe('移动端布局 v2：Shell 视图可达', () => {
  it('进入 Shell 视图时无目标会话则自动落到第一个', () => {
    expect(appVue, '缺 shellFallbackId 兜底').toContain('shellFallbackId');
    expect(appVue, '渲染用 shellViewId（详情优先，其次兜底）').toMatch(/shellDetailId\.value \?\? \(view\.value === 'shell'/);
  });

  it('无任何 shell 会话时渲染显式空态（不是空白）', () => {
    expect(appVue).toContain('class="shell-empty"');
    expect(appVue, '空态应给回聊天的出口').toMatch(/回到聊天/);
    expect(css, '缺 .shell-empty 样式').toContain('.shell-empty {');
  });
});
