//! 移动端外壳布局契约守护（2026-10 回归修复）。
//!
//! 背景：Panel 是**固定视口 SPA**（`html, body, #app { overflow: hidden }`，
//! 滚动发生在各视图内部），而 ui-frame 在 <768px 会给布局挂
//! `nm-layout--mobile` 并切成**"整页滚动"模式**（`.nm-layout--mobile`
//! height:auto / `.nm-layout__body` min-height:auto / `.nm-layout__content`
//! overflow:visible）——期望由页面滚动消费溢出。两者冲突：小屏
//! （375×667 / 360×640，可用高 < 内容固有高 733px）时 `.nm-layout__body`
//! 因 `min-height: auto` 拒绝收缩，输入区被裁出视口，且页面上**不存在任何
//! 可滚动容器**（实测症状：无法下滑、看不到输入框）。
//!
//! 修复（styles.css 移动媒体查询段）：以 `#app` 前缀（特异性 1,1,0，覆盖
//! 库 scoped 的 `[data-v-*]` 规则）把布局拉回定高 + 恢复收缩能力，让
//! ChatTray 等内部滚动区正常形成。本测试锁定该契约，防止回归（样式在全局
//! CSS 中无法经 jsdom 生效，采用与 ChatViewMobile.test.ts 同款的源码断言）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'styles.css'), 'utf-8');

/** 截取移动媒体查询段（`@media (max-width: 767.98px)` 到文件末尾或下一个顶层 @media）。 */
function mobileSegment(): string {
  const start = css.indexOf('@media (max-width: 767.98px)');
  expect(start, 'styles.css 应存在移动媒体查询段（<768px 契约）').toBeGreaterThanOrEqual(0);
  const rest = css.slice(start);
  // 段与段之间以 "}\n" 收口；简单起见截到下一个顶层 "@media" 或文件尾。
  const next = rest.indexOf('@media', start + 10);
  return next > 0 ? rest.slice(0, next) : rest;
}

/** 提取某个选择器的规则体（第一个匹配块）。 */
function ruleBody(segment: string, selector: string): string {
  const escaped = selector.replace(/[.#*[\]()]/g, (c) => `\\${c}`);
  const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`);
  const m = segment.match(re);
  return m ? m[1] : '';
}

describe('移动端外壳布局契约（固定视口 vs 库"整页滚动"模式）', () => {
  it('#app 前缀覆盖 nm-layout--mobile：定高 100dvh + 隐藏溢出', () => {
    const body = ruleBody(mobileSegment(), '#app .nm-layout--mobile');
    expect(
      body,
      '缺失 #app .nm-layout--mobile 规则——库的"整页滚动"模式会把小屏输入区裁出视口',
    ).not.toBe('');
    expect(body).toMatch(/height:\s*100dvh/);
    expect(body).toMatch(/overflow:\s*hidden/);
  });

  it('nm-layout__body 恢复收缩（min-height: 0）——防 733px 溢出地板', () => {
    const body = ruleBody(mobileSegment(), '#app .nm-layout--mobile .nm-layout__body');
    expect(body, '缺失 body 收缩规则——小屏时 body 会被内容撑开溢出视口').not.toBe('');
    expect(body).toMatch(/min-height:\s*0/);
  });

  it('nm-layout__content 不接管滚动（滚动在各视图内部）', () => {
    const body = ruleBody(mobileSegment(), '#app .nm-layout--mobile .nm-layout__content');
    expect(body).not.toBe('');
    expect(body).toMatch(/overflow-y:\s*hidden/);
  });

  it('固定视口地基仍在：html/body/#app overflow:hidden + 移动段 dvh 高度', () => {
    // 上方全局段的地基（防被改成可滚动文档——那会牵动整站布局）
    expect(css).toMatch(/html,\s*body,\s*#app\s*\{[^}]*overflow:\s*hidden/);
    expect(mobileSegment()).toMatch(/html,\s*body,\s*#app\s*\{[^}]*height:\s*100dvh/);
  });
});
