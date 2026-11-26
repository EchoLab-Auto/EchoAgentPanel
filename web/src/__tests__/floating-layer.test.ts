//! 浮层识别（`floating-layer.ts`）：外层「点外面关闭」不得吞掉浮层内的按下。
//!
//! ## 为什么值得单独测
//!
//! 这条判定错了的表现**不是报错**，而是「点一下就关」——而且关掉的是外层，
//! 用户丢了正在填的东西。2026-10（ui-frame 下拉）与 2026-11（扩展自绘的选择器
//! 遮罩）各踩一次，两次都只能靠人肉复现。所以两种识别途径都要钉住。

import { describe, expect, it } from 'vitest';
import {
  FLOATING_LAYER_SELECTOR,
  PANEL_FLOATING_LAYER_ATTR,
  isInsideFloatingLayer,
} from '../floating-layer';

/** 造一个挂在 body 上的节点（浮层都是 teleport 到 body 的）。 */
function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

describe('浮层识别', () => {
  it('ui-frame 的下拉浮层按类名认出（含深层子节点）', () => {
    const host = mount(
      '<div class="nm-select__dropdown"><div class="nm-select__option"><span id="deep">x</span></div></div>',
    );
    const deep = document.getElementById('deep')!;
    expect(isInsideFloatingLayer(deep)).toBe(true);
    host.remove();
  });

  it('扩展声明 data-panel-floating-layer 的浮层同样被认出', () => {
    // 这是工作区目录选择器的形状：整块遮罩 teleport 到 body，
    // 根节点声明属性 → 外层覆盖面板不把它当"外面"。
    const host = mount(
      `<div ${PANEL_FLOATING_LAYER_ATTR} class="dp-overlay">
         <div class="dp-panel"><button id="crumb">本机</button></div>
       </div>`,
    );
    expect(isInsideFloatingLayer(document.getElementById('crumb')!)).toBe(true);
    // 遮罩自身（点它就是"外面"的语义由它自己的 @click.self 处理）
    expect(isInsideFloatingLayer(host.firstElementChild!)).toBe(true);
    host.remove();
  });

  it('普通面板内容与 body 不算浮层', () => {
    const host = mount('<div class="ws-panel"><button id="plain">编辑</button></div>');
    expect(isInsideFloatingLayer(document.getElementById('plain')!)).toBe(false);
    expect(isInsideFloatingLayer(document.body)).toBe(false);
    host.remove();
  });

  it('文本节点按父元素判定', () => {
    const host = mount(`<div ${PANEL_FLOATING_LAYER_ATTR}><span id="txt">文字</span></div>`);
    const textNode = document.getElementById('txt')!.firstChild!;
    expect(textNode.nodeType).toBe(Node.TEXT_NODE);
    expect(isInsideFloatingLayer(textNode)).toBe(true);
    host.remove();
  });

  it('选择器同时覆盖两条途径（漏一条就是整类回归）', () => {
    expect(FLOATING_LAYER_SELECTOR).toContain('[data-panel-floating-layer]');
    expect(FLOATING_LAYER_SELECTOR).toContain('.nm-select__dropdown');
  });
});
