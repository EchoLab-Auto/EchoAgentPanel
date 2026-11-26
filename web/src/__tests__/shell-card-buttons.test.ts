//! Shell 卡头两个按钮的**成套性**契约（2026-11）。
//!
//! ## 用户诉求
//!
//! 「新建按钮也使用图标，并对齐刷新按钮的样式」。此前同一排里：新建是
//! `glass` + 32px + 文字「新建」，刷新是 `ghost` + `square` + 26px + 图标。
//! 两者底色档、尺寸、形态全都不一样，并排看不成套 —— 而它们做的是同一类
//! 事（对这张卡的即时操作）。
//!
//! ## 为什么用源码断言
//!
//! 真正的回归风险不是"图标画错了"，而是**两个按钮又各自为政**：以后给其中一个
//! 加个 `:size="32"`、换个 `variant`，界面不会报错，只是看起来不齐。组件挂载
//! 测试只能验"按钮存在"，验不了"两者同一档"，所以直接读源码对齐属性。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(__dirname, '../components/ShellList.vue'), 'utf8');
const code = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** 取一个带 `data-*` 标记的 NeumorphismButton 开标签（含属性列表）。 */
function buttonTag(marker: string): string {
  const at = code.indexOf(marker);
  expect(at, `缺少标记 ${marker}`).toBeGreaterThan(-1);
  const open = code.lastIndexOf('<NeumorphismButton', at);
  const close = code.indexOf('>', at);
  return code.slice(open, close + 1);
}

const NEW_BTN = 'data-shell-new';
const REFRESH_BTN = 'data-shell-refresh';

describe('两个按钮都存在且可区分', () => {
  it('新建与刷新各有稳定标记（测试与将来的 UI 扩展都靠它）', () => {
    expect(code).toContain(NEW_BTN);
    expect(code).toContain(REFRESH_BTN);
  });

  it('各带 aria-label（纯图标钮没有文字，读屏必须能读出来）', () => {
    expect(buttonTag(NEW_BTN)).toContain('aria-label="新建 Shell 会话"');
    expect(buttonTag(REFRESH_BTN)).toContain('aria-label="刷新 Shell 会话"');
  });

  it('各带 title（鼠标悬停提示，与 aria-label 同义）', () => {
    expect(buttonTag(NEW_BTN)).toContain('title="新建 Shell 会话"');
    expect(buttonTag(REFRESH_BTN)).toContain('title="刷新 Shell 会话"');
  });
});

describe('样式对齐（同一档库组件参数）', () => {
  it('尺寸都是 26', () => {
    expect(buttonTag(NEW_BTN)).toContain(':size="26"');
    expect(buttonTag(REFRESH_BTN)).toContain(':size="26"');
  });

  it('变体都是 ghost', () => {
    expect(buttonTag(NEW_BTN)).toContain('variant="ghost"');
    expect(buttonTag(REFRESH_BTN)).toContain('variant="ghost"');
  });

  it('形状都是 square', () => {
    expect(buttonTag(NEW_BTN)).toContain('shape="square"');
    expect(buttonTag(REFRESH_BTN)).toContain('shape="square"');
  });

  it('都不再是带文字的 glass 32px（旧形态已退役）', () => {
    // 整个动作行里不应再有 glass/32px 的按钮。
    const actions = code.slice(
      code.indexOf('shell-list__actions'),
      code.indexOf('</div>', code.indexOf('shell-list__actions')),
    );
    expect(actions).not.toContain('variant="glass"');
    expect(actions).not.toContain(':size="32"');
  });
});

describe('图标', () => {
  it('新建用 plus、刷新用 refresh，尺寸档一致', () => {
    expect(code).toContain('<PanelIcon name="plus" size="sm" />');
    expect(code).toContain('<PanelIcon name="refresh" size="sm" />');
  });

  it('不再有文字按钮（纯图标 + title/aria-label）', () => {
    const actions = code.slice(
      code.indexOf('shell-list__actions'),
      code.indexOf('</div>', code.indexOf('shell-list__actions')),
    );
    // 「新建」只应出现在注释与 aria/title 文案里，不能是按钮文本节点。
    expect(actions).not.toMatch(/>\s*新建\s*</);
  });
});

describe('禁用态', () => {
  it('两个按钮都跟随连接状态', () => {
    expect(buttonTag(NEW_BTN)).toContain(':disabled="!state.connected"');
    expect(buttonTag(REFRESH_BTN)).toContain(':disabled="!state.connected"');
  });
});
