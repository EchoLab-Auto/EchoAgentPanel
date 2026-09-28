//! 时间线磁盘缓存（trunk-cache）契约：刷新首屏的"零等待"还原 + 增量游标。
//!
//! 关键不变量：
//! - 还原时条目**重新编号**（nextKey）且 animate=false——否则与本次页面的
//!   新消息 key 撞车（Vue keyed v-for 复用错组件）或整屏播放入场动画；
//! - 当前 team 的缓存同时进 `state.trunk`（首屏即可见）；
//! - 落盘预算：当前 team 优先，单 team 超限直接跳过；配额错误静默放弃；
//! - 引导请求带上还原出的游标（since_seq），只补缺口。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const KEY = 'echo-panel-trunk-cache';

function payload(teams: Record<string, unknown>) {
  return JSON.stringify({ v: 1, teams });
}

function msg(role: string, content: string, time = 1) {
  return { key: 'old', role, content, time };
}

describe('trunk-cache 还原', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('还原两个 team；当前 team 进 trunk，条目重编号且不播动画', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    localStorage.setItem(
      KEY,
      payload({
        A: { seq: 100, msgs: [msg('user', '你好'), msg('backend', '回复')] },
        B: { seq: 7, msgs: [msg('user', '另一个 team')] },
      }),
    );

    const { hydrateTrunkCache } = await import('../trunk-cache');
    const { state } = await import('../store');
    hydrateTrunkCache();

    expect(state.teamTimelines['A']?.seq).toBe(100);
    expect(state.teamTimelines['B']?.seq).toBe(7);
    expect(state.trunk.length).toBe(2);
    expect(state.trunkTeamId).toBe('A');
    expect(state.trunk[0].content).toBe('你好');
    // 重新编号：不再保留磁盘里的旧 key；且历史回放不播动画。
    expect(state.trunk[0].key).not.toBe('old');
    expect(state.trunk[0].animate).toBe(false);
    // 数组解别名：trunk 与缓存是两份（实时推送不污染缓存）。
    expect(state.trunk[0]).not.toBe(state.teamTimelines['A'].msgs[0]);
  });

  it('损坏 JSON / 版本不符 / 脏条目：一律忽略并保持空态', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    localStorage.setItem(KEY, '{不是 JSON');
    const { hydrateTrunkCache } = await import('../trunk-cache');
    const { state } = await import('../store');
    hydrateTrunkCache();
    expect(state.trunk.length).toBe(0);

    localStorage.setItem(KEY, JSON.stringify({ v: 999, teams: { A: { seq: 1, msgs: [msg('user', 'x')] } } }));
    hydrateTrunkCache();
    expect(state.trunk.length).toBe(0);

    localStorage.setItem(
      KEY,
      payload({ A: { seq: 1, msgs: [{ bogus: true }, msg('user', '好的')] } }),
    );
    hydrateTrunkCache();
    expect(state.trunk.length).toBe(1);
    expect(state.trunk[0].content).toBe('好的');
  });

  it('就格式升级：旧缓存里的子代理钩子用户消息还原为 subagent 行', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    const hook = `<subagent_event>\n${JSON.stringify({
      event: 'subagent_event',
      subagent_id: 'task-7',
      task: '审计 Panel 文档',
      success: true,
      result: '结论',
      completed_at_ms: 1,
    })}\n</subagent_event>`;
    localStorage.setItem(
      KEY,
      payload({
        A: {
          seq: 9,
          msgs: [
            { key: 'old1', role: 'user', content: hook, time: 1 },
            { key: 'old2', role: 'user', content: '普通消息', time: 2 },
          ],
        },
      }),
    );
    const { hydrateTrunkCache } = await import('../trunk-cache');
    const { state } = await import('../store');
    hydrateTrunkCache();
    expect(state.trunk.length).toBe(2);
    expect(state.trunk[0].role).toBe('subagent');
    expect(state.trunk[0].subagent?.id).toBe('task-7');
    expect(state.trunk[0].subagent?.result).toBe('结论');
    expect(state.trunk[0].content).toBe('审计 Panel 文档');
    // 普通用户消息不受影响
    expect(state.trunk[1].role).toBe('user');
    expect(state.trunk[1].content).toBe('普通消息');
  });

  it('没有活跃 team 时不还原 trunk（只填 teamTimelines）', async () => {
    localStorage.setItem(KEY, payload({ A: { seq: 3, msgs: [msg('user', 'x')] } }));
    const { hydrateTrunkCache } = await import('../trunk-cache');
    const { state } = await import('../store');
    hydrateTrunkCache();
    expect(state.teamTimelines['A']?.seq).toBe(3);
    expect(state.trunk.length).toBe(0);
  });
});

describe('trunk-cache 落盘', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('序列化包含缓存并可按原文还原（往返一致）', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    const { serializeTrunkCache, resetTrunkCacheStateForTests } = await import('../trunk-cache');
    const { state } = await import('../store');
    resetTrunkCacheStateForTests();
    state.teamTimelines['A'] = { seq: 42, msgs: [msg('user', '往返')] as never };

    const raw = serializeTrunkCache();
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as {
      v: number;
      teams: Record<string, { seq: number; msgs: Array<{ content: string }> }>;
    };
    expect(parsed.v).toBe(1);
    expect(parsed.teams['A'].seq).toBe(42);
    expect(parsed.teams['A'].msgs[0].content).toBe('往返');
  });

  it('单 team 超预算时跳过，不阻塞其他 team', async () => {
    localStorage.setItem('echo-panel-active-team', 'big');
    const { serializeTrunkCache, MAX_SINGLE_CHARS } = await import('../trunk-cache');
    const { state } = await import('../store');
    // 构造一个必然超单 team 预算的条目（content 超过上限字符数）。
    state.teamTimelines['big'] = {
      seq: 1,
      msgs: [{ key: 'k', role: 'user', content: 'x'.repeat(MAX_SINGLE_CHARS + 10), time: 1 }],
    };
    state.teamTimelines['small'] = { seq: 2, msgs: [msg('user', 'ok')] as never };

    const raw = serializeTrunkCache();
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as { teams: Record<string, unknown> };
    expect(parsed.teams['big']).toBeUndefined();
    expect(parsed.teams['small']).toBeTruthy();
  });

  it('落盘失败（配额满）静默放弃，不抛错', async () => {
    const { saveTrunkCacheNow } = await import('../trunk-cache');
    const { state } = await import('../store');
    state.teamTimelines['A'] = { seq: 1, msgs: [msg('user', 'x')] as never };
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveTrunkCacheNow()).not.toThrow();
  });

  it('无缓存数据时不写入（保持旧缓存不被空覆盖）', async () => {
    const { saveTrunkCacheNow } = await import('../trunk-cache');
    localStorage.setItem(KEY, 'previous');
    saveTrunkCacheNow();
    expect(localStorage.getItem(KEY)).toBe('previous');
  });
});

describe('引导请求使用还原出的游标', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    class FakeWebSocket {
      static instances: FakeWebSocket[] = [];
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = FakeWebSocket.CONNECTING;
      sent: string[] = [];
      onopen: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public url: string) {
        FakeWebSocket.instances.push(this);
      }
      send(data: string): void {
        this.sent.push(data);
      }
      close(): void {
        this.readyState = FakeWebSocket.CLOSED;
      }
      triggerOpen(): void {
        this.readyState = FakeWebSocket.OPEN;
        this.onopen?.();
      }
    }
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function bootstrapAfterHydrate(): Promise<string[]> {
    const cache = await import('../trunk-cache');
    cache.hydrateTrunkCache();
    const { startConnection } = await import('../connection');
    startConnection();
    const Fake = (globalThis as unknown as { WebSocket: { instances: Array<{ sent: string[]; triggerOpen(): void }> } })
      .WebSocket;
    const ws = Fake.instances[Fake.instances.length - 1];
    ws.triggerOpen();
    return ws.sent;
  }

  it('有磁盘缓存：引导带 since_seq（只拉缺口）', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    localStorage.setItem(
      KEY,
      payload({ A: { seq: 555, msgs: [msg('user', '历史')] } }),
    );
    const sent = await bootstrapAfterHydrate();
    const timeline = sent.find((c) => c.includes('RequestTrunkTimeline'));
    expect(timeline).toBeTruthy();
    expect(timeline).toContain('555');
    expect(timeline).toContain('"A"');
  });

  it('无缓存：引导不带游标（since_seq 0 = 全量）', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    const sent = await bootstrapAfterHydrate();
    const timeline = sent.find((c) => c.includes('RequestTrunkTimeline'));
    expect(timeline).toBeTruthy();
    expect(timeline).toContain('"since_seq":0');
  });
});
