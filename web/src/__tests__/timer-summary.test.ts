//! 定时消息展示行与 Core 的一致性契约。
//!
//! ## 为什么需要这个测试
//!
//! 同一条定时消息有**两条渲染路径**：
//! - 实时：Core 发原始 `MessageReceived{instance_name:'timer'}`，前端
//!   `summarizeTimerEvent` 投影成 system 行（本文件的被测函数）；
//! - 历史 / 刷新：Core `agent-module-transcript` 投影后随快照下发。
//!
//! 两条路径文案不一致的后果是「刷新一下，同一句话换了措辞」。这条**真实
//! 发生过**：前端写 `⏰ 定时器触发 · 截 160`，Core 写 `定时任务触发 · 截 120`，
//! 而且前端在 `task` 缺失时还会渲染出尾随的 ` · `。
//!
//! ## 权威在哪
//!
//! Core 的 `agent-module-management/src/protocol/timeline_text.rs`
//! （`timeline_timer_task` + `truncate_one_line`）与
//! `agent-module-transcript/src/timeline.rs:108`（文案模板）。Core 同时决定
//! 持久化形状，所以以它为准；本文件把它的行为逐条钉死在这里。
//!
//! 改动本节任何一条断言之前，先去改 Core——顺序反了就是在制造漂移。

import { describe, it, expect } from 'vitest';
import { summarizeTimerEvent } from '../state_domains/helpers';

const hook = (payload: unknown) => `<timer_event>${JSON.stringify(payload)}</timer_event>`;

describe('summarizeTimerEvent 与 Core 的一致性', () => {
  it('文案是「定时任务触发」，不是「定时器触发」', () => {
    expect(summarizeTimerEvent(hook({ task: '清理临时目录' }))).toBe(
      '定时任务触发 · 清理临时目录',
    );
  });

  it('不带 emoji 前缀（Core 侧没有）', () => {
    expect(summarizeTimerEvent(hook({ task: 'x' }))).not.toContain('⏰');
  });

  it('截断宽度是 120 码点，超出加省略号', () => {
    const long = 'a'.repeat(200);
    const out = summarizeTimerEvent(hook({ task: long }));
    // `定时任务触发 · ` + 120 个 a + `…`
    expect(out).toBe(`定时任务触发 · ${'a'.repeat(120)}…`);
  });

  it('恰好 120 码点不截断', () => {
    const exact = 'b'.repeat(120);
    expect(summarizeTimerEvent(hook({ task: exact }))).toBe(`定时任务触发 · ${exact}`);
  });

  it('按码点而不是 UTF-16 单元截断（emoji 不被劈成半个）', () => {
    // 每个 emoji 是 2 个 UTF-16 单元、1 个码点；130 个码点必然触发截断，
    // 而按 .length 会在第 120 个单元处切断一个 emoji，产生孤立代理项。
    const out = summarizeTimerEvent(hook({ task: '🙂'.repeat(130) }));
    expect(out).toBe(`定时任务触发 · ${'🙂'.repeat(120)}…`);
    expect(out).not.toContain('\uFFFD');
  });

  it('task 缺失时是纯文案，不渲染尾随分隔符', () => {
    expect(summarizeTimerEvent(hook({}))).toBe('定时任务触发');
  });

  it('task 非字符串时同样走纯文案（Core 用 as_str() 分流）', () => {
    expect(summarizeTimerEvent(hook({ task: 42 }))).toBe('定时任务触发');
    expect(summarizeTimerEvent(hook({ task: null }))).toBe('定时任务触发');
  });

  it('payload 不是合法 JSON 时走纯文案', () => {
    expect(summarizeTimerEvent('<timer_event>not json</timer_event>')).toBe('定时任务触发');
  });

  it('没有 hook 包裹时走纯文案（Core 的 strip_prefix 会失败）', () => {
    expect(summarizeTimerEvent('随便一段普通消息')).toBe('定时任务触发');
  });

  it('多行 task 折叠成单行', () => {
    expect(summarizeTimerEvent(hook({ task: 'a\nb   c' }))).toBe('定时任务触发 · a b c');
  });
});
