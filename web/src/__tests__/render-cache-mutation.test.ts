//! 渲染缓存 vs **原地变异**（2026-10 事故回归测试）。
//!
//! ## 事故
//!
//! 用户报「问一句之后工具行一行一行都在读秒，刷新才好」。
//! 现场证据：中继诊断 `seq_gaps=0 missed=0`（传输层没丢帧）、刷新（清空
//! 渲染缓存）后正常 → 说明 **store 里状态是对的，渲染对象没跟上**。
//!
//! 根因：`state.ts` 的 reduce 原地深变异（`msg.tool.status = 'succeeded'`、
//! `msg.content += delta`），而渲染缓存的判等用对象引用：
//!
//! ```ts
//! if (a === b) return true;              // ← 同一对象永远"未变"
//! if (a.tool !== b.tool) { /* 比字段 */ } // ← 浅拷贝后内层引用相同，也跳过
//! ```
//!
//! 于是 `ToolResult` 应用后缓存仍命中：`cm.tool.status` 永远是 `'running'` →
//! `WorkRunGroup` 的 `hasRunning` 恒真 → 50ms ticker 一直读秒。
//!
//! ## 现契约
//!
//! 判等基于**值快照**（`RenderSnapshot`），因此：
//! 1. 任何进入渲染的字段被原地改写 → 必须失效（返回 null 让调用方重建）；
//! 2. 未变消息 → 仍命中同一对象引用（性能收益不能丢）。
import { describe, it, expect, beforeEach } from 'vitest';
import { reactive } from 'vue';
import type { DisplayMessage } from '../state';
import { toChatMessage } from '../chat-adapter';
import {
  __resetChatMessageCacheForTests,
  chatMessageCacheStats,
  rememberChatMessage,
  reuseChatMessage,
} from '../chat-message-cache';

/** 走一遍"构建 → 记住"，返回渲染产物（模拟 ChatView 首次求值）。 */
function buildOnce(m: DisplayMessage) {
  const cm = toChatMessage(m);
  rememberChatMessage(m, cm);
  return cm;
}

function toolMsg(): DisplayMessage {
  return {
    key: 'm1',
    role: 'tool',
    content: '',
    time: 0,
    tool: { name: 'bash', input: '{}', output: null, status: 'running' },
  } as unknown as DisplayMessage;
}

beforeEach(() => {
  __resetChatMessageCacheForTests();
});

describe('原地变异必须让渲染缓存失效', () => {
  it('tool.status（running → succeeded）：这条就是「工具行一直读秒」', () => {
    const state = reactive({ trunk: [toolMsg()] });
    const m = state.trunk[0]!;
    const first = buildOnce(m);
    expect((first.tool as { status?: string } | undefined)?.status).toBe('running');

    // finishToolMessage 的写法：原地赋值，不换对象
    m.tool!.output = 'ok';
    m.tool!.status = 'succeeded';
    m.tool!.elapsedMs = 1234;

    expect(reuseChatMessage(state.trunk[0]!)).toBeNull();
  });

  it('tool.output / elapsedMs 单独变化也要失效', () => {
    for (const patch of [
      (t: NonNullable<DisplayMessage['tool']>) => (t.output = 'streaming chunk'),
      (t: NonNullable<DisplayMessage['tool']>) => (t.elapsedMs = 999),
      (t: NonNullable<DisplayMessage['tool']>) => (t.startedAtMs = 1700000000000),
      (t: NonNullable<DisplayMessage['tool']>) => (t.input = '{"cmd":"ls"}'),
    ]) {
      __resetChatMessageCacheForTests();
      const m = toolMsg();
      buildOnce(m);
      patch(m.tool!);
      expect(reuseChatMessage(m)).toBeNull();
    }
  });

  it('content 原地拼接（流式增量）：这条是「正文不增长」', () => {
    const m = {
      key: 'm2',
      role: 'backend',
      content: '第一段',
      time: 0,
      sessionId: 's1',
    } as DisplayMessage;
    buildOnce(m);

    m.content += '第二段'; // appendStreamDelta 的写法
    expect(reuseChatMessage(m)).toBeNull();
  });

  it('reasoning 数组原地 push', () => {
    const m = {
      key: 'm3',
      role: 'backend',
      content: '',
      time: 0,
      reasoning: ['第一段'],
    } as unknown as DisplayMessage;
    buildOnce(m);

    m.reasoning!.push('第二段');
    expect(reuseChatMessage(m)).toBeNull();
  });

  it('branch.msgs 原地改文本', () => {
    const m = {
      key: 'm4',
      role: 'branch',
      content: '',
      time: 0,
      branch: { branchId: 'b1', summary: '分支', msgs: [{ kind: 'content', text: 'a', time: 1 }] },
    } as unknown as DisplayMessage;
    buildOnce(m);

    m.branch!.msgs[0]!.text = 'a-changed';
    expect(reuseChatMessage(m)).toBeNull();
  });

  it('浅拷贝外层 + 原地改内层（sessionMessagesFor 的 hist 分支）', () => {
    const m = toolMsg();
    buildOnce(m);
    m.tool!.status = 'succeeded';

    const shallow = { ...m } as DisplayMessage; // hist 分支就是 {...m}
    expect(reuseChatMessage(shallow)).toBeNull();
  });
});

describe('未变消息仍复用（性能契约不能破）', () => {
  it('原样再次求值 → 命中同一引用', () => {
    const m = toolMsg();
    const first = buildOnce(m);
    expect(reuseChatMessage(m)).toBe(first);
  });

  it('浅拷贝但内容相同 → 命中', () => {
    const m = toolMsg();
    const first = buildOnce(m);
    expect(reuseChatMessage({ ...m } as DisplayMessage)).toBe(first);
  });

  it('1000 条里只有 1 条原地变化 → 只 1 次 miss', () => {
    const list = Array.from({ length: 1000 }, (_, i) =>
      ({ ...toolMsg(), key: `k${i}`, content: `msg ${i}` }) as DisplayMessage,
    );
    const firstPass = list.map((m) => buildOnce(m));
    chatMessageCacheStats.hits = 0;
    chatMessageCacheStats.misses = 0;

    // 原始循环：count 条原地改 content + 只有一条原地改 tool
    list.forEach((m, i) => {
      if (i === 500) m.content += ' delta';
    });
    list.forEach((m, i) => {
      if (i === 700) m.tool!.status = 'succeeded';
    });

    const reused = list.map((m) => reuseChatMessage(m));
    expect(reused.filter((x) => x === null)).toHaveLength(2);
    expect(reused[0]).toBe(firstPass[0]);
    expect(reused[999]).toBe(firstPass[999]);
  });
});

/**
 * TrunkTimeline 增量对账路径（审计补充项）。
 *
 * Core 对"运行中工具条目的就地更新"会带新 seq 重新投递完成态；前端
 * `patchToolMessage` 在**已有的** DisplayMessage 上替换 `tool`（消息对象
 * 身份不变）。若缓存只看对象身份，这条路径同样会把完成态吞掉——即使实时
 * `ToolResult` 丢了、靠 seq 补拉找回来也一样不显示。
 */
describe('TrunkTimeline 增量对账也必须穿透缓存', () => {
  it('patchToolMessage 就地替换 tool → 缓存失效', async () => {
    const { patchToolMessage, toDisplayMessage } = await import('../state_domains/timeline');

    const trunk: DisplayMessage[] = [
      {
        key: 'm1',
        role: 'tool',
        content: '',
        time: 0,
        seq: 5,
        tool: { name: 'bash', input: '{}', output: null, status: 'running' },
      } as unknown as DisplayMessage,
    ];
    buildOnce(trunk[0]!);

    // Core 补投的完成态条目（新 seq、output 非空）
    const incoming = toDisplayMessage({
      kind: 'tool',
      content: '',
      time: 0,
      seq: 9,
      tool: {
        name: 'bash',
        input: '{}',
        output: 'ok',
        failed: false,
        tool_call_id: undefined,
        elapsed_ms: 1234,
      },
    } as never);
    // 无 toolCallId 时 patchToolMessage 按名字兜底修补（同 finishToolMessage 的契约）
    const patched = patchToolMessage(trunk, incoming);
    expect(patched).toBe(true);

    // store 层已变成完成态
    expect(trunk[0]!.tool?.status).toBe('succeeded');
    // 渲染层必须重建，否则 UI 仍显示 running
    expect(reuseChatMessage(trunk[0]!)).toBeNull();
  });
});
