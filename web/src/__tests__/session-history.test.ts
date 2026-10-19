//! 会话历史通道（2026-10）：共享显示窗口（每人格 1024 条 FIFO）淘汰无近期
//! 活动的会话条目后，面板在激活会话时请求 `RequestSessionHistory`，Core 从
//! 事件日志派生完整历史（`SessionHistory`）。
//!
//! 本测试锁定：
//!   a) reducer 按 `checklistKey(core, team, session)` 写入快照（messages 转换、
//!      baseSeq = max_seq）；
//!   b) `sessionMessagesFor` 的「快照 ⊕ 窗口增量」合并——seq > baseSeq 的窗口
//!      条目合并（工具按 tool_call_id 就地补丁、旧条目按水位线去重）；
//!   c) 合并绝不污染快照对象（浅拷贝 + 就地补丁只作用于副本）；
//!   d) 无快照时退回窗口过滤（现行为）。

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { state, dispatch } from '../store';
import { sessionMessagesFor } from '../state';
import { checklistKey } from '../keys';
import type { TimelineMessage } from '../protocol';

vi.mock('../connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../connection')>();
  return { ...actual, sendCommand: vi.fn(() => true) };
});

const KEY = checklistKey('core-a', 't', 's1');

/** 事件日志派生条目：user@time1（seq 1）+ tool call-1 运行中（output null）。 */
function snapshotMessages(): TimelineMessage[] {
  return [
    { kind: 'user', content: 'hello', session_id: 's1', time: 1, seq: 1 },
    {
      kind: 'tool',
      content: 'call-1',
      session_id: 's1',
      time: 2,
      seq: 2,
      tool: { name: 'bash', input: '{}', output: null, failed: false, tool_call_id: 'call-1' },
    },
  ];
}

describe('会话历史通道（RequestSessionHistory → SessionHistory）', () => {
  beforeEach(() => {
    state.trunk = [];
    state.sessionHistory = {};
    state.activeRegion = 'core-a';
    state.activeTeamId = 't';
    state.sessions = [];
    state.teams = [];
    state.knownCores = new Set();
  });

  it('a) SessionHistory：按 (core, team, session) 写入快照，baseSeq 取 max_seq', () => {
    dispatch(
      {
        SessionHistory: {
          team_id: 't',
          session_id: 's1',
          messages: snapshotMessages(),
          total: 2,
          truncated: false,
          max_seq: 0,
        },
      },
      'core-a',
    );

    const hist = state.sessionHistory[KEY];
    expect(hist, 'SessionHistory 未按 checklistKey(core, team, session) 写入').toBeTruthy();
    expect(hist.messages.length).toBe(2);
    expect(hist.messages[0].role).toBe('user');
    expect(hist.messages[1].role).toBe('tool');
    expect(hist.messages[1].tool?.status).toBe('running'); // output null = 运行中
    expect(hist.total).toBe(2);
    expect(hist.truncated).toBe(false);
    expect(hist.baseSeq).toBe(0);
  });

  it('b) 合并：窗口增量按 seq > baseSeq 合并，工具条目按 tool_call_id 就地补丁', () => {
    // 快照在日志水位 5 处派生：工具仍是运行中（output null）。
    dispatch(
      {
        SessionHistory: {
          team_id: 't',
          session_id: 's1',
          messages: snapshotMessages(),
          total: 2,
          truncated: false,
          max_seq: 5,
        },
      },
      'core-a',
    );

    // 工具完成后经就地更新**带新 seq** 重新投递到共享窗口（完成态 output 'done'；
    // 序号必须 > 快照水位——水位内的条目已被快照覆盖，见下方去重用例）。
    state.trunk = [
      {
        key: 'w-tool',
        role: 'tool',
        content: 'bash',
        time: 3,
        sessionId: 's1',
        seq: 6,
        tool: { name: 'bash', input: '{}', output: 'done', status: 'succeeded', toolCallId: 'call-1' },
      },
    ];
    const merged = sessionMessagesFor(state, 's1', 't');
    expect(merged.length).toBe(2); // 快照 2 条；工具就地补丁而非追加重复行
    expect(merged[1].role).toBe('tool');
    expect(merged[1].tool?.output).toBe('done');
    expect(merged[1].tool?.status).toBe('succeeded');

    // 窗口新增实时条目（seq 7 > 水位）：追加。
    state.trunk.push({
      key: 'w-new',
      role: 'user',
      content: 'new',
      time: 9,
      sessionId: 's1',
      seq: 7,
    });
    expect(sessionMessagesFor(state, 's1', 't').length).toBe(3);

    // 旧窗口条目（seq 5 ≤ 水位，模拟 FIFO 尚未淘汰的旧条目）：已被快照覆盖，
    // 不得追加重复行。
    state.trunk.push({
      key: 'w-dup',
      role: 'user',
      content: 'hello',
      time: 1,
      sessionId: 's1',
      seq: 5,
    });
    expect(sessionMessagesFor(state, 's1', 't').length).toBe(3);
  });

  it('c) 快照不污染：补丁只作用于浅拷贝，原快照条目保持 output null', () => {
    dispatch(
      {
        SessionHistory: {
          team_id: 't',
          session_id: 's1',
          messages: snapshotMessages(),
          total: 2,
          truncated: false,
          max_seq: 5,
        },
      },
      'core-a',
    );
    state.trunk = [
      {
        key: 'w-tool',
        role: 'tool',
        content: 'bash',
        time: 3,
        sessionId: 's1',
        seq: 6,
        tool: { name: 'bash', input: '{}', output: 'done', status: 'succeeded', toolCallId: 'call-1' },
      },
    ];
    const merged = sessionMessagesFor(state, 's1', 't');
    expect(merged[1].tool?.output).toBe('done'); // 合并结果（副本）已补丁
    // 原快照未被改写（补丁不得回写 state.sessionHistory 里的对象）。
    expect(state.sessionHistory[KEY].messages[1].tool?.output).toBeNull();
    expect(state.sessionHistory[KEY].messages[1].tool?.status).toBe('running');
    // **写时复制契约**（2026-10 P0）：`sessionMessagesFor` 不再逐条深拷贝
    // （每次 delta 白花 O(历史) 次分配），数组是浅拷贝、元素与快照共享；
    // 因此"补丁换对象"是防止污染快照的**唯一**保障——未补丁的条目仍共享
    // 引用（零成本），被补丁的条目必须是新对象。
    expect(merged[1]).not.toBe(state.sessionHistory[KEY].messages[1]);
    expect(merged[0]).toBe(state.sessionHistory[KEY].messages[0]);
    // 幂等：重复合并仍得到同样的补丁结果，且快照依旧干净。
    const again = sessionMessagesFor(state, 's1', 't');
    expect(again[1].tool?.output).toBe('done');
    expect(state.sessionHistory[KEY].messages[1].tool?.output).toBeNull();
  });

  it('d) 无快照：退回窗口过滤（现行为）', () => {
    state.trunk = [
      { key: 'x1', role: 'user', content: 'm', time: 1, sessionId: 'sX' },
      { key: 'x2', role: 'user', content: 'n', time: 2, sessionId: 'sY' },
    ];
    const out = sessionMessagesFor(state, 'sX', 't');
    expect(out.length).toBe(1);
    expect(out[0].key).toBe('x1');
  });
});
