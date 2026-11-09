//! 移动端体检（2026-11）的契约守护。
//!
//! 这一轮不是"重新设计"，而是把**实测能测出来的**问题钉住。体检方式：
//! Playwright 在 375/390/412/430/360×640 等视口下量几何（横向溢出、触控目标
//! 尺寸、面板是否整块在视口内），只改量得到的东西。三类问题：
//!
//! 1. **横向溢出**：`grid-template-columns: repeat(auto-fit, minmax(420px, 1fr))`
//!    里裸的 `420px` 是**轨道下限**——375px 屏上轨道仍占 420px，整块比容器宽
//!    61px，图表得横滑才看得全（实测 `.api-metrics__chart` w=420、
//!    detail 面板 scrollWidth 432 > clientWidth 359）。改成 `min(420px, 100%)`。
//! 2. **触控目标**：库的 `pointer: coarse` 规则只管 `:where(button)` 的
//!    **min-height**，宽度不管。实测主题切换 30、全屏 34、标签关闭 18、
//!    新建标签 28、复制 24（单位 px）——都是手机上要靠指尖精确命中、且
//!    点错有副作用的控件（点错主题要再点两下；点错标签就切了会话）。
//! 3. **幽灵抽屉**：两个底部 Sheet 的开关是模块级单值，切视图会卸载抽屉
//!    宿主但单值不复位 → 回到聊天时抽屉自己弹出来。收口在 `setView`。

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = (...parts: string[]) => readFileSync(join(here, '..', ...parts), 'utf-8');

const appVue = src('App.vue');
const css = src('styles.css');
const chatVue = src('components', 'ChatView.vue');
const tabsVue = src('components', 'ChatTabs.vue');
const apiVue = src('components', 'ApiSettings.vue');

describe('移动端体检：网格最小宽不得越过容器', () => {
  it('API 指标图表用 min(420px, 100%)，不是裸 420px', () => {
    expect(apiVue).toContain('repeat(auto-fit, minmax(min(420px, 100%), 1fr))');
    expect(apiVue, '裸 420px 会让 375 屏轨道仍占 420').not.toMatch(
      /repeat\(auto-fit, minmax\(420px, 1fr\)\)/,
    );
  });

  it('供应商卡片网格同样收敛（320 屏不溢出）', () => {
    expect(apiVue).toContain('repeat(auto-fill, minmax(min(340px, 100%), 1fr))');
  });
});

describe('移动端体检：触控目标', () => {
  it('标签关闭键：视觉 24，命中区 40×40（coarse 段内）', () => {
    // 2026-11 第二轮：这组规则从「窄屏段」搬到「coarse 段」——手机横屏
    // （844×390）宽度越过 768 断点但仍是触屏，挂宽度维度会让同一台设备
    // 转个方向就变样（实测退回 57 / 44 / 44）。
    const mobileStart = tabsVue.indexOf('@media (pointer: coarse)');
    expect(mobileStart, 'ChatTabs 应有 coarse 段').toBeGreaterThan(0);
    const seg = tabsVue.slice(mobileStart);
    expect(seg, '关闭键视觉尺寸应放大到 24').toMatch(/\.chat-tabs__close\s*\{[^}]*width:\s*24px/);
    // 命中区靠伪元素撑开（不改布局，避免挤压标签）
    expect(seg).toMatch(/\.chat-tabs__close::before\s*\{[^}]*width:\s*40px/);
    expect(seg, '新建标签应加宽到 36').toMatch(/\.chat-tabs__create\s*\{[^}]*width:\s*36px/);
    // 标签条高度定死（否则 content 撑出 48，滚动位置会跳）
    expect(seg, '标签条高度应定死 44').toMatch(/\.chat-tabs\s*\{\s*height:\s*44px/);
  });

  it('顶栏图标钮加宽：主题 36 / 全屏 40（全局移动段内）', () => {
    // 顶栏那两颗钮只在移动端顶栏出现（桌面顶栏是带文字的大钮），所以留窄屏段
    const start = css.indexOf('@media (max-width: 767.98px)');
    expect(start).toBeGreaterThanOrEqual(0);
    const seg = css.slice(start);
    expect(seg).toMatch(/#app \.nm-theme-toggle__btn\s*\{\s*min-width:\s*36px/);
    expect(seg).toMatch(/fullscreen-toggle--compact\s*\{\s*min-width:\s*40px/);
  });

  it('消息复制键用伪元素撑命中区（coarse 段，与视口宽度无关）', () => {
    const start = css.indexOf('@media (pointer: coarse)');
    expect(start, 'styles.css 应有 coarse 段').toBeGreaterThanOrEqual(0);
    const seg = css.slice(start);
    expect(seg).toMatch(/\.msg-item__copy::after\s*\{[^}]*width:\s*40px/);
    // 视觉高度收回设计值（否则元信息行被 44 撑高）
    expect(seg).toMatch(/\.msg-item__copy\s*\{[^}]*height:\s*22px/);
    expect(seg).toMatch(/\.work-run-group__chip\s*\{[^}]*min-height:\s*0/);
  });
});

describe('移动端体检：API 徽标字号', () => {
  it('窄屏 11px（原 10px 要在手机上贴着看）', () => {
    const start = chatVue.indexOf('@media (max-width: 767.98px)');
    const seg = chatVue.slice(start);
    const m = seg.match(/\.chat-status__api\s*\{[^}]*font-size:\s*(\d+)px/);
    expect(m, '缺窄屏 .chat-status__api 字号').toBeTruthy();
    expect(Number(m![1])).toBeGreaterThanOrEqual(11);
  });
});

describe('移动端体检：切视图收掉底部 Sheet（幽灵抽屉）', () => {
  it('setView 里清 mobileSheet（唯一入口收口）', () => {
    const m = appVue.match(/function setView\(next: View\)\s*\{([\s\S]*?)\n\}/);
    expect(m, '缺 setView').toBeTruthy();
    expect(m![1], '切视图必须收掉底部 Sheet').toContain('closeMobileSheet()');
    // 单值是模块级共享，切视图若不清，回到聊天抽屉会自己弹出
    expect(appVue).toMatch(/import \{[^}]*closeMobileSheet[^}]*\} from '\.\/mobile-sheets'/);
  });
});
