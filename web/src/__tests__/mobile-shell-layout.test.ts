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
//! 会话滚动区等内部滚动区正常形成。本测试锁定该契约，防止回归（样式在全局
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
  it('#app 前缀覆盖 nm-layout--mobile：定高 100dvh + min-height:0 + 隐藏溢出', () => {
    const body = ruleBody(mobileSegment(), '#app .nm-layout--mobile');
    expect(
      body,
      '缺失 #app .nm-layout--mobile 规则——库的"整页滚动"模式会把小屏输入区裁出视口',
    ).not.toBe('');
    expect(body).toMatch(/height:\s*100dvh/);
    // 库的 `min-height: 100vh` 必须被压掉：移动浏览器 vh=大视口（含工具条
    // 隐藏时的区域），比可见区高 → 顶穿 height 覆盖、输入区被工具条遮住。
    expect(body, '缺 min-height: 0——库的 min-height:100vh 会顶穿高度覆盖').toMatch(
      /min-height:\s*0/,
    );
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

  it('顶栏右组全按钮可达：全屏收窄不隐藏（类匹配）+ 品牌可收缩 + header-left 放开收缩', () => {
    // 2026-10 修复：<768px 时右组固定宽 ~354px，375px 屏上「主题切换」被推出
    // 屏外不可达。三层收敛——全屏收窄、品牌省略号、内边距收紧。
    //
    // 2026-10-20 修订：全屏按钮**不再隐藏**。原先整段 display:none 的理由是
    // 「iOS Safari 不支持元素全屏」，但这把一家限制当成了所有移动端的限制
    // （Android Chrome / 微信 / WebView 都支持，且手机上去掉地址栏有实感）。
    // 现在改为 compact 图标态（约 34px，替原来 60px 的文本按钮），位置在
    // 「卡片」左侧；能力检测与提示在组件内（FullscreenToggleButton.vue）。
    const seg = mobileSegment();

    // ① 全屏收窄：选择器与类名是一对——类必须真的落在组件根按钮上，
    //    否则规则空转（此前即此症状：全屏按钮在手机上占 60px 并溢出）。
    expect(seg).not.toMatch(/\.topbar-actions \.fullscreen-toggle\s*\{[^}]*display:\s*none/);
    const compact = ruleBody(seg, '#app .topbar-actions .fullscreen-toggle--compact');
    expect(compact, '窄屏必须把全屏按钮收成图标态（min-width 34px）').toMatch(/min-width:\s*34px/);
    const fsb = readFileSync(
      join(here, '..', '..', 'src', 'components', 'FullscreenToggleButton.vue'),
      'utf-8',
    );
    expect(fsb, 'FullscreenToggleButton 根按钮必须携带 fullscreen-toggle 类').toMatch(
      /class="fullscreen-toggle"/,
    );
    expect(fsb, 'compact 态需独立类名供窄屏样式匹配').toMatch(/fullscreen-toggle--compact/);

    // ② 品牌可收缩 + 省略号（不把右侧按钮挤出屏幕）
    const brand = ruleBody(seg, '.brand');
    expect(brand).toMatch(/min-width:\s*0/);
    expect(brand).toMatch(/text-overflow:\s*ellipsis/);

    // ③ 库的 header-left（flex:0 0 auto）放开收缩
    expect(seg).toMatch(/#app \.nm-layout__header-left\s*\{[^}]*flex:\s*0 1 auto/);
  });

  it('视口高度三层兜底：--app-h（JS 实测 innerHeight）兜底 dvh 不可靠的浏览器', () => {
    // 2026-10 修复「手机浏览器底部工具条遮住输入框」：个别浏览器 dvh
    // 不可靠（iOS 非滚动页不动态更新 / 老 WebView 不支持）→ 高度偏大。
    // styles.css 两处高度链均以 var(--app-h, 100dvh) 收尾（JS 值优先、
    // dvh 兜底、100% 再兜底）。
    const seg = mobileSegment();
    const heights = seg.match(/height:\s*var\(--app-h,\s*100dvh\)/g) ?? [];
    expect(heights.length, '移动段应有 2 处 var(--app-h, 100dvh) 高度（外壳 + 库布局覆盖）').toBe(2);

    // index.html：内联脚本须及时写入 --app-h 并在视口变化时更新
    // （首帧前生效——module JS 是 deferred，放 main.ts 会晚一拍）。
    const html = readFileSync(join(here, '..', '..', 'index.html'), 'utf-8');
    expect(html).toMatch(/setProperty\('--app-h'/);
    expect(html).toMatch(/addEventListener\('resize'/);
    expect(html).toMatch(/orientationchange/);
    expect(html).toMatch(/visualViewport/);
  });
});
