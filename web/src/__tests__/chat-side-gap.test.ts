//! 会话区左右净距的**单一事实源**契约（2026-11）。
//!
//! ## 要守的不变量
//!
//! 消息区、输入区、覆盖面板的左缘必须落在**同一条竖线**上。用户原话是
//! 「消息区左右两边留间距，间距等于输入区边框和窗口边框的左右间距」——
//! 也就是说输入区外框那 12px 是**基准**，消息区要跟它对齐。
//!
//! 此前两处各写一份数字：输入区 CSS 里 `left: 12px`、消息区内边距由
//! `trayPadLeft` 给出，而无侧栏时它是 `0px` —— 气泡贴窗口边缘出血，输入区
//! 却缩进 12px，一眼看出错位。
//!
//! 现在两边都读 `CHAT_SIDE_GAP`（CSS 侧走 `v-bind(chatSideGapPx)`）。这里
//! 锁的就是"只有一个来源"这件事：任何一边改回字面量，测试就红。
//!
//! ## 为什么用源码断言
//!
//! 值本身（12px）在 DOM 上表现为 Vue `v-bind()` 注入的**哈希变量**
//! （`--d4a92dec`），happy-dom 解析不了这条 var 链；而真正会出错的是
//! "两处又开始各写一份"，那在源码上看得一清二楚。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const chatVue = readFileSync(resolve(__dirname, '../components/ChatView.vue'), 'utf8');

/** 去掉注释，避免注释里的示例代码被当成实现。 */
const code = chatVue.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

/** 取某个 CSS 规则块的内容。 */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = code.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  expect(match, `缺少规则 ${selector}`).toBeTruthy();
  return match![1];
}

describe('常量定义', () => {
  it('净距是 12px，且导出成 CSS 变量用的字符串', () => {
    expect(code).toMatch(/const CHAT_SIDE_GAP = 12;/);
    expect(code).toMatch(/const chatSideGapPx = `\$\{CHAT_SIDE_GAP\}px`;/);
  });
});

describe('输入区外框读同一个常量', () => {
  it('left / right / bottom 都走 v-bind，没有字面量 12px', () => {
    const block = rule('.chat-composer-float');
    expect(block).toMatch(/left:\s*v-bind\(chatSideGapPx\)/);
    expect(block).toMatch(/right:\s*v-bind\(chatSideGapPx\)/);
    expect(block).toMatch(/bottom:\s*v-bind\(chatSideGapPx\)/);
    // 字面量会让"两处各写一份"重新长回来。
    expect(block).not.toMatch(/^\s*(left|right|bottom):\s*12px/m);
  });
});

describe('消息区内边距 = 侧栏列宽 + 净距', () => {
  it('两列都是相加，不是二选一', () => {
    for (const side of ['Left', 'Right'] as const) {
      const decl = code.match(
        new RegExp(`const trayPad${side} = computed\\(\\(\\) => \\{[\\s\\S]*?\\}\\);`),
      );
      expect(decl, `缺少 trayPad${side} 的定义`).toBeTruthy();
      const text = decl![0];
      expect(text).toContain('RAIL_WIDTH');
      expect(text).toContain('CHAT_SIDE_GAP');
      // 关键：相加。写成 `? `${RAIL_WIDTH}px` : '0px'` 就是回到旧行为。
      expect(text).toMatch(/\$\{rail \+ CHAT_SIDE_GAP\}px/);
    }
  });

  it('无侧栏时不再返回 0（那正是"气泡贴边出血"的来源）', () => {
    const left = code.match(/const trayPadLeft = computed\(\(\) => \{[\s\S]*?\}\);/);
    expect(left).toBeTruthy();
    expect(left![0]).not.toMatch(/:\s*'0px'/);
  });

  it('仍然跟随列的显隐（收起则不占位）', () => {
    const left = code.match(/const trayPadLeft = computed\(\(\) => \{[\s\S]*?\}\);/);
    expect(left![0]).toContain("railRegistered('left')");
    expect(left![0]).toContain("isRailCollapsed('left')");
  });

  it('滚动区用的就是这两个值', () => {
    const block = rule('.chat-view__list');
    expect(block).toMatch(/padding-left:\s*v-bind\(trayPadLeft\)/);
    expect(block).toMatch(/padding-right:\s*v-bind\(trayPadRight\)/);
  });
});

describe('窄屏不被桌面口径污染', () => {
  it('移动端媒体查询里仍按 --composer-inset 覆盖左右内边距', () => {
    const mobileStart = code.indexOf('@media (max-width: 767.98px)');
    expect(mobileStart).toBeGreaterThan(-1);
    const mobile = code.slice(mobileStart);
    // 窄屏留白来自屏角半径（3vw），与桌面的 12px 常量无关。
    expect(mobile).toMatch(
      /padding-left:\s*max\(var\(--composer-inset,\s*12px\),\s*env\(safe-area-inset-left/,
    );
    expect(mobile).toMatch(
      /padding-right:\s*max\(var\(--composer-inset,\s*12px\),\s*env\(safe-area-inset-right/,
    );
  });
});
