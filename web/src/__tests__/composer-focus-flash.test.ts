//! 输入条毛玻璃降级的**触发条件**契约（2026-11 修复「点输入框会闪」）。
//!
//! ## 事故形状
//!
//! 原实现把降级挂在 `focusin` 上：一点输入框就加 `--busy`，CSS 把
//! `backdrop-filter` 设为 `none` 并把 `--nm-glass-bg` 换成不透明实色。
//! 而玻璃卡片的 `transition` 含 `background-color 0.5s`、**不含**
//! `backdrop-filter` —— 于是点下去的一瞬间模糊消失、底色还要用半秒慢慢变实，
//! 中间那半秒是「没模糊但还半透明」的浑浊态；失焦 120ms 后又反向来一次。
//!
//! 根因不在 CSS，在**触发条件选错了**：聚焦本身不产生大面积重绘（只有光标
//! 闪烁），这个降级在聚焦路径上毫无收益。
//!
//! ## 锁定的四条
//!
//! 1. 聚焦**不**触发降级（模板上无 `@focusin`，setup 里无 `onComposerFocus`）；
//! 2. 降级由 `select`（textarea 内选区）+ `selectionchange`（消息区拖选）触发；
//! 3. textarea 的选区判据走 `selectionStart/End`（`window.getSelection()` 对它
//!    返回 collapsed，只用它永远看不到「在输入框里拖选」）；
//! 4. 降级态带 `transition: none`（否则进入时留下半秒浑浊）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const chatVue = readFileSync(resolve(__dirname, '../components/ChatView.vue'), 'utf8');
/** 去注释：注释里会出现 `@focusin` 之类的示例文字，别误判。 */
const code = chatVue.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('聚焦不再触发降级', () => {
  it('输入条上不再挂 @focusin（这是原闪烁的直接来源）', () => {
    // 入口行的 @focusin 是 chunk 预热/预取，与输入条无关：只检查 composer 那个 div
    // 的属性列表。
    const tag = code.match(/<div\s+ref="composerFloatRef"[\s\S]*?>/);
    expect(tag, '缺少 composerFloatRef 的 div').toBeTruthy();
    expect(tag![0]).not.toContain('@focusin');
  });

  it('setup 里没有 onComposerFocus（函数一起删掉，不留死代码）', () => {
    expect(code).not.toContain('onComposerFocus');
  });
  it('setup 里没有 onComposerFocus（函数一起删掉，不留死代码）', () => {
    expect(code).not.toContain('onComposerFocus');
  });

  it('focusout 只作恢复兜底，且恢复前会重新判选区', () => {
    // 模板仍挂 focusout（失焦时浏览器不保证再派发 selectionchange）。
    expect(code).toContain('@focusout="onComposerBlur"');
    const fn = code.match(/function onComposerBlur\(\)[^{]*\{([\s\S]*?)\n\}/);
    expect(fn).toBeTruthy();
    // 里面只应"在有降级时安排恢复"，不得直接置 false（要留给延迟检查）。
    expect(fn![1]).toContain('restoreComposerBlurSoon');
    expect(fn![1]).not.toMatch(/composerBusy\.value\s*=\s*false/);
  });
});

describe('降级的真实触发点', () => {
  it('输入条内拖选 → select 事件（textarea 专用，会冒泡）', () => {
    expect(code).toContain('@select="onComposerSelect"');
    const fn = code.match(/function onComposerSelect\(\)[^{]*\{([\s\S]*?)\n\}/);
    expect(fn).toBeTruthy();
    expect(fn![1]).toContain('composerHasSelection()');
    expect(fn![1]).toContain('suspendComposerBlur()');
  });

  it('消息区拖选 → selectionchange，判据统一走 hasActiveSelection', () => {
    const fn = code.match(/function onSelectionChange\(\)[^{]*\{([\s\S]*?)\n\}/);
    expect(fn).toBeTruthy();
    expect(fn![1]).toContain('hasActiveSelection()');
    expect(fn![1]).toContain('suspendComposerBlur()');
    expect(fn![1]).toContain('restoreComposerBlurSoon()');
  });

  it('textarea 的选区靠 selectionStart/End（window.getSelection 看不到）', () => {
    const fn = code.match(/function composerHasSelection\(\)[^{]*\{([\s\S]*?)\n\}/);
    expect(fn).toBeTruthy();
    const text = fn![1];
    expect(text).toContain('selectionStart');
    expect(text).toContain('selectionEnd');
    // 限定在输入条内：别处 textarea 的选区不该改输入条材质。
    expect(text).toContain('composerFloatRef');
    expect(text).toContain('contains(el)');
  });

  it('恢复前重新判一次选区（拖选换向时不误恢复）', () => {
    const fn = code.match(/function restoreComposerBlurSoon\(\)[^{]*\{([\s\S]*?)\n\}/);
    expect(fn).toBeTruthy();
    expect(fn![1]).toContain('hasActiveSelection()');
  });
});

describe('降级态的样式', () => {
  it('去 blur + 换实色底', () => {
    const rule = code.match(/\.chat-composer-float--busy \.chat-composer-float__card\s*\{([\s\S]*?)\n\}/);
    expect(rule).toBeTruthy();
    expect(rule![1]).toMatch(/backdrop-filter:\s*none\s*!important/);
    expect(rule![1]).toContain('--nm-glass-bg: var(--nm-surface-raised)');
  });

  it('带 transition: none —— 否则进入时模糊先没、底色还要渐变半秒', () => {
    const rule = code.match(/\.chat-composer-float--busy \.chat-composer-float__card\s*\{([\s\S]*?)\n\}/);
    expect(rule![1]).toMatch(/transition:\s*none\s*!important/);
  });

  it('--busy 类仍绑在 composerBusy 上（改名要同步）', () => {
    expect(code).toContain("'chat-composer-float--busy': composerBusy");
  });
});
