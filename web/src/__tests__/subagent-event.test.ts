//! 子代理完成回报（`<subagent_event>` 合并钩子）的展示契约。
//!
//! 背景（2026-09-28）：该钩子此前以原始 JSON 直接渲染为 user 气泡
//! （一条数千字符的 JSON，占满半屏且不可读）。修复 = 解析为结构化载荷，
//! 由工作 chip 行的子代理 chip 呈现（2026-10；前身为紧凑行）；实时
//! （MessageReceived）与历史回放（toDisplayMessage）两条路径必须一致。

import { describe, expect, it } from 'vitest';
import {
  parseSubagentEvent,
  toDisplayMessage,
  startSubagentRun,
  finishSubagentRun,
} from '../state_domains/timeline';
import { initialState, reduce } from '../state';
import type { TimelineMessage } from '../protocol';

const payload = {
  event: 'subagent_event',
  subagent_id: 'task-123',
  session_id: 'local:workspace:demo:local_user',
  task: '审计 Panel 文档，产出修改清单\n（第二行应折叠）',
  success: true,
  result: '审计完成：修改 8 个文件。',
  completed_at_ms: 1790534065698,
};
const hook = `<subagent_event>\n${JSON.stringify(payload, null, 2)}\n</subagent_event>`;

describe('parseSubagentEvent', () => {
  it('解析钩子载荷为结构化字段', () => {
    const parsed = parseSubagentEvent(hook);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe('task-123');
    expect(parsed?.task).toContain('审计 Panel 文档');
    expect(parsed?.success).toBe(true);
    expect(parsed?.result).toContain('修改 8 个文件');
    expect(parsed?.completedAtMs).toBe(1790534065698);
  });

  it('失败态与缺失字段按缺省降级', () => {
    const failed = parseSubagentEvent(
      `<subagent_event>{"event":"subagent_event","success":false,"result":"超时"}</subagent_event>`,
    );
    expect(failed?.success).toBe(false);
    expect(failed?.id).toBe('');
    expect(failed?.task).toBe('');
    expect(failed?.completedAtMs).toBeNull();
  });

  it('非钩子内容 / 损坏 JSON / 错误 event 字段一律返回 null', () => {
    expect(parseSubagentEvent('普通文本')).toBeNull();
    expect(parseSubagentEvent('<subagent_event>{oops</subagent_event>')).toBeNull();
    expect(
      parseSubagentEvent('<subagent_event>{"event":"other","task":"x"}</subagent_event>'),
    ).toBeNull();
    // 前后缀文本（非严格包裹）不解析，避免误伤普通消息。
    expect(parseSubagentEvent(`前缀 ${hook}`)).toBeNull();
  });
});

describe('toDisplayMessage：历史回放映射', () => {
  it('子代理钩子映射为 subagent 角色（不是 user 气泡）', () => {
    const message = {
      kind: 'user',
      content: hook,
      session_id: 'local:workspace:demo:local_user',
      time: 1790534065,
      seq: 1,
    } as TimelineMessage;
    const display = toDisplayMessage(message);
    expect(display.role).toBe('subagent');
    expect(display.subagent?.id).toBe('task-123');
    expect(display.content).toContain('审计 Panel 文档');
    expect(display.sessionId).toBe('local:workspace:demo:local_user');
  });

  it('普通用户消息仍走 user 角色（不受影响）', () => {
    const display = toDisplayMessage({
      kind: 'user',
      content: '你好',
      session_id: 's',
      time: 1,
      seq: 2,
    } as TimelineMessage);
    expect(display.role).toBe('user');
    expect(display.subagent).toBeUndefined();
  });
});

describe('reduce：实时子代理回报', () => {
  it('MessageReceived(instance=subagent) → subagent 行（带结构化载荷）', () => {
    const state = initialState();
    reduce(state, {
      MessageReceived: {
        session_id: 'local:workspace:demo:local_user',
        instance_name: 'subagent',
        platform: 'subagent',
        user_id: 'subagent',
        user_name: 'subagent',
        channel: 'direct',
        group_name: null,
        content: hook,
        images: [],
        timestamp: 1790534065,
        received_at_ms: 1790534065698,
        message_sequence: 7,
        team_id: null,
      },
    } as never);
    const last = state.trunk[state.trunk.length - 1];
    expect(last?.role).toBe('subagent');
    expect(last?.subagent?.id).toBe('task-123');
    expect(last?.animate).toBe(true);
  });

  it('普通用户消息仍走 user 角色', () => {
    const state = initialState();
    reduce(state, {
      MessageReceived: {
        session_id: 's',
        instance_name: 'qq',
        platform: 'qq',
        user_id: 'u1',
        user_name: '某人',
        channel: 'direct',
        group_name: null,
        content: '在吗',
        images: [],
        timestamp: 1,
        received_at_ms: 1000,
        message_sequence: 8,
        team_id: null,
      },
    } as never);
    const last = state.trunk[state.trunk.length - 1];
    expect(last?.role).toBe('user');
    expect(last?.content).toBe('在吗');
  });
});

describe('subagentTaskLabel（工具行标签，经 ChatView 导出不现实 → 就地复刻契约）', () => {
  // ChatView 内的解析是组件内部函数；这里以真实两种输入形态锁定行为契约：
  // Core 时间线摘要串与原始 JSON 都能取出 task 前缀。
  function label(input: string): string | undefined {
    let task: string | null = null;
    try {
      const parsed = JSON.parse(input) as { task?: unknown };
      if (typeof parsed.task === 'string') task = parsed.task;
    } catch {
      const match = input.match(/^\{task=([\s\S]*?)(?:\s·\s[a-z_]+=|\}$)|^\{task=([\s\S]*)$/);
      task = match ? (match[1] ?? match[2] ?? null) : null;
    }
    if (!task || !task.trim()) return undefined;
    const line = task.replace(/\s+/g, ' ').trim();
    return line.length > 80 ? `${line.slice(0, 80)}…` : line;
  }

  it('解析 Core 摘要形态 {task=… · timeout_secs=…}', () => {
    expect(label('{task=背景：EchoAgent 框架，两个仓库（只读代码、只改文档）： - Core 仓库：/home… · timeout_secs=900}'))
      .toBe('背景：EchoAgent 框架，两个仓库（只读代码、只改文档）： - Core 仓库：/home…');
  });

  it('解析原始 JSON 形态并压缩空白/截断 80 字符', () => {
    expect(label('{"task":"审计 Panel 文档\\n第二行","timeout_secs":900}')).toBe('审计 Panel 文档 第二行');
    const long = label(`{"task":"${'长'.repeat(120)}"}`);
    expect(long?.length).toBe(81); // 80 + 省略号
    expect(long?.endsWith('…')).toBe(true);
  });

  it('缺 task / 空值 / 非参数文本返回 undefined', () => {
    expect(label('')).toBeUndefined();
    expect(label('{}')).toBeUndefined();
    expect(label('{task=   }')).toBeUndefined();
  });
});

describe('子代理执行过程：运行行 → 就地改写为结果行（一份委派一行）', () => {
  it('SubagentStarted 插入运行行；完成钩子就地改写（不新增行）', () => {
    const state = initialState();
    const sid = 'local:workspace:demo:local_user';
    startSubagentRun(state, sid, '  审计 Panel 文档\n（多行折成一行）  ');
    expect(state.trunk.length).toBe(1);
    const row = state.trunk[0];
    expect(row.role).toBe('subagent');
    expect(row.subagent?.running).toBe(true);
    expect(row.content).toBe('审计 Panel 文档 （多行折成一行）');

    const patched = finishSubagentRun(state, sid, {
      id: 'task-9',
      task: '审计 Panel 文档 （多行折成一行）',
      success: true,
      result: '结论：改了 8 处',
      completedAtMs: 1,
    });
    expect(patched).toBe(true);
    expect(state.trunk.length).toBe(1); // 就地改写，不新增行
    expect(state.trunk[0].subagent?.running).toBe(false);
    expect(state.trunk[0].subagent?.result).toBe('结论：改了 8 处');
    expect(state.trunk[0].subagent?.id).toBe('task-9');
  });

  it('多个并发：完成钩子按"最老的运行行"先来先配（FIFO），与 Core 语义一致', () => {
    const state = initialState();
    const sid = 's';
    startSubagentRun(state, sid, '任务 A');
    startSubagentRun(state, sid, '任务 B');
    finishSubagentRun(state, sid, { id: 'a1', task: '任务 A', success: true, result: 'A 完成', completedAtMs: 1 });
    expect(state.trunk[0].subagent?.result).toBe('A 完成');
    expect(state.trunk[1].subagent?.running).toBe(true);
    finishSubagentRun(state, sid, { id: 'b1', task: '任务 B', success: false, result: 'B 失败', completedAtMs: 2 });
    expect(state.trunk[1].subagent?.success).toBe(false);
    expect(state.trunk[1].subagent?.running).toBe(false);
  });

  it('无匹配运行行（刷新后钩子先到）返回 false（调用方追加）', () => {
    const state = initialState();
    expect(
      finishSubagentRun(state, 's', { id: '', task: 't', success: true, result: 'r', completedAtMs: null }),
    ).toBe(false);
  });

  it('空任务不插行（避免噪声）', () => {
    const state = initialState();
    startSubagentRun(state, 's', '   ');
    expect(state.trunk.length).toBe(0);
  });
});
