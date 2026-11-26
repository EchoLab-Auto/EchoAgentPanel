//! 侧栏收起功能的**结构契约**（ChatView 模板 + 关键判据）。
//!
//! ## 为什么要测模板
//!
//! 收起是单向不可逆的动作：列整块 `v-if` 不渲染，列内的一切（含任何"展开"
//! 按钮）随之消失。把手是**唯一**的回归入口——它被误删、被挪进列内、或
//! 忘了在移动端排除，用户就再也回不来。
//!
//! 所以这里直接读 `ChatView.vue` 源码做结构断言（与 `mobile-v2-layout.test.ts`
//! 同一手法）：组件挂载测试覆盖不到"v-if 条件写错了"这类错误，而源码断言能。
//!
//! ## 锁定的四件事
//!
//! 1. 把手在**列外**（不在 `<aside>` 内）且 `v-if` 只依赖 `railRegistered`；
//! 2. 两列各自独立（`data-rail-toggle="left"` / `"right"`）；
//! 3. 收起态把列从渲染条件里排除，但 `railDragPending` 能把它叫回来；
//! 4. 正文留白与列显隐用同一份判据（否则会出现"列没了但留白还在"）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const chatVue = readFileSync(resolve(__dirname, '../components/ChatView.vue'), 'utf8');

/** 取某个 `<button ... data-rail-toggle="left" ...> ... </button>` 块。 */
function toggleBlock(side: 'left' | 'right'): string {
  const start = chatVue.indexOf(`data-rail-toggle="${side}"`);
  expect(start, `缺少 data-rail-toggle="${side}" 的把手`).toBeGreaterThan(-1);
  const open = chatVue.lastIndexOf('<button', start);
  const close = chatVue.indexOf('</button>', start);
  return chatVue.slice(open, close);
}

describe('把手存在且成对', () => {
  it('左右各有一个', () => {
    expect(chatVue).toContain('data-rail-toggle="left"');
    expect(chatVue).toContain('data-rail-toggle="right"');
  });

  it('点击调用 toggleRailCollapsed（而不是只改本地 ref）', () => {
    for (const side of ['left', 'right'] as const) {
      expect(toggleBlock(side)).toContain(`toggleRailCollapsed('${side}')`);
    }
  });

  it('带 aria-label / aria-expanded（键盘与读屏可用）', () => {
    for (const side of ['left', 'right'] as const) {
      const block = toggleBlock(side);
      expect(block).toContain(':aria-label=');
      expect(block).toContain(':aria-expanded=');
    }
  });

  it('是 <button type="button">（不是可点 div，不会被表单提交劫持）', () => {
    for (const side of ['left', 'right'] as const) {
      expect(toggleBlock(side)).toContain('type="button"');
    }
  });
});

describe('把手必须在列外（收起后列不渲染）', () => {
  it('两个把手都不在任何一个 <aside> 内', () => {
    // 粗粒度但够用：把手整体出现在第一段 `<aside` 之前，或最后一个 `</aside>`
    // 之后。真正的风险是"被挪进列内"——那样收起后它就消失了。
    const firstAside = chatVue.indexOf('<aside');
    const lastAsideClose = chatVue.lastIndexOf('</aside>');
    for (const side of ['left', 'right'] as const) {
      const at = chatVue.indexOf(`data-rail-toggle="${side}"`);
      const inside = at > firstAside && at < lastAsideClose;
      expect(inside, `把手 ${side} 落在了 <aside> 内部（收起后将不可用）`).toBe(false);
    }
  });

  it('把手的 v-if 只依赖「有登记卡片」与「不在拖动中」，不看列显隐', () => {
    // 若写成 `v-if="leftRailVisible"`，收起时把手跟着消失 → 无法展开。
    const leftToggleDecl = chatVue.match(/const leftRailToggle = computed\(\s*\(\) =>[\s\S]*?\);/);
    expect(leftToggleDecl, '缺少 leftRailToggle 定义').toBeTruthy();
    const text = leftToggleDecl![0];
    expect(text).toContain("railRegistered('left')");
    expect(text).toContain('railDragPending');
    expect(text).not.toContain('leftRailVisible');
  });
});

describe('列显隐：收起 + 拖动例外', () => {
  it('收起时列不渲染，但 railDragPending 能强制出列', () => {
    const block = chatVue.match(/const leftRailVisible = computed\(\s*\(\) =>[\s\S]*?\);/);
    expect(block).toBeTruthy();
    const text = block![0];
    // 既有判据：登记过卡片
    expect(text).toContain("railRegistered('left')");
    // 新增：未被收起（否则收起无效）
    expect(text).toContain("!isRailCollapsed('left')");
    // 例外：拖动相关状态必须能覆盖偏好（否则拖不进收起的列）
    expect(text).toContain('railDragPending');
  });

  it('正文留白与列显隐同判据（不留"幽灵留白"）', () => {
    const block = chatVue.match(/const trayPadLeft = computed\(\(\) =>[\s\S]*?\);/);
    expect(block).toBeTruthy();
    const text = block![0];
    expect(text).toContain("railRegistered('left')");
    expect(text).toContain("!isRailCollapsed('left')");
    // 拖动期间留白**不**跟随（既有设计：正文行宽全程稳定）
    expect(text).not.toContain('railDragPending');
  });
});

describe('样式契约', () => {
  it('收起态有独立 class（可见性必须高于展开态）', () => {
    expect(chatVue).toContain("'rail-toggle--collapsed'");
    const styleBlock = chatVue.slice(chatVue.indexOf('.rail-toggle {'));
    expect(styleBlock).toContain('.rail-toggle--collapsed');
  });

  it('把手宽度很窄（不挡正文的点击与拖选）', () => {
    const block = chatVue.match(/\.rail-toggle \{[\s\S]*?\}/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/width:\s*14px/);
  });

  it('展开时贴列内缘、收起时贴视口边缘（两态位置都定义）', () => {
    expect(chatVue).toMatch(/\.rail-toggle--left \{[\s\S]*?left:\s*v-bind\(railWidthPx\)/);
    expect(chatVue).toMatch(/\.rail-toggle--left\.rail-toggle--collapsed \{[\s\S]*?left:\s*0/);
    expect(chatVue).toMatch(/\.rail-toggle--right \{[\s\S]*?right:\s*v-bind\(railWidthPx\)/);
    expect(chatVue).toMatch(/\.rail-toggle--right\.rail-toggle--collapsed \{[\s\S]*?right:\s*0/);
  });

  it('尊重 prefers-reduced-motion', () => {
    const styleBlock = chatVue.slice(chatVue.indexOf('.rail-toggle {'));
    const idx = styleBlock.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(idx).toBeGreaterThan(-1);
    // 该媒体查询块里要禁用把手过渡
    expect(styleBlock.slice(idx, idx + 200)).toContain('.rail-toggle');
  });
});
