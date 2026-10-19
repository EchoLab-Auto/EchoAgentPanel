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

// ── 多窗口共存（2026-10 审计）──
//
// 两个窗口停在不同 agent 时，`echo-panel-trunk-cache` 是共享单一键：
// 先前实现整体覆盖，各自落盘就把对方缓存冲掉（互相清「零等待首屏」）。
// 现在本窗口条目优先，其余从既有文档的预算余量里保留。
describe('trunk-cache 多窗口共存', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  /** 造一个 team 缓存条目（key = teamKey 复合键）。 */
  function seed(key: string, content: string, seq = 1) {
    localStorage.setItem(
      KEY,
      payload({ [key]: { seq, msgs: [msg('user', content)] } }),
    );
  }

  it('落盘保留他窗口写过的 team 条目（不再互相冲掉）', async () => {
    seed('teamB', '窗口 B 的时间线'); // 另一个窗口写入的
    const { serializeTrunkCache, resetTrunkCacheStateForTests } = await import('../trunk-cache');
    const { state } = await import('../store');
    resetTrunkCacheStateForTests();
    // 本窗口只有 teamA
    state.teamTimelines['teamA'] = { seq: 7, msgs: [msg('user', '本窗口')] as never };

    const raw = serializeTrunkCache();
    expect(raw).toBeTruthy();
    const teams = (JSON.parse(raw as string) as { teams: Record<string, unknown> }).teams;
    expect(Object.keys(teams).sort()).toEqual(['teamA', 'teamB']);
  });

  it('同名 team 以本窗口内存为准（不被既有文档覆盖）', async () => {
    seed('teamA', '旧内容', 3);
    const { serializeTrunkCache, resetTrunkCacheStateForTests } = await import('../trunk-cache');
    const { state } = await import('../store');
    resetTrunkCacheStateForTests();
    state.teamTimelines['teamA'] = { seq: 99, msgs: [msg('user', '新内容')] as never };

    const raw = serializeTrunkCache();
    const teams = (JSON.parse(raw as string) as {
      teams: Record<string, { seq: number; msgs: Array<{ content: string }> }>;
    }).teams;
    expect(teams.teamA.seq).toBe(99);
    expect(teams.teamA.msgs[0].content).toBe('新内容');
  });

  it('本窗口无任何条目 → 返回 null（不拿空文档覆盖既有缓存）', async () => {
    seed('teamB', '保留我');
    const { serializeTrunkCache, resetTrunkCacheStateForTests } = await import('../trunk-cache');
    resetTrunkCacheStateForTests();
    expect(serializeTrunkCache()).toBeNull();
    // 既有文档原样还在
    expect(localStorage.getItem(KEY)).toContain('保留我');
  });

  it('既有文档损坏/版本不符 → 忽略外来条目，本窗口条目照常写入', async () => {
    localStorage.setItem(KEY, '{ 损坏 json');
    const { serializeTrunkCache, resetTrunkCacheStateForTests } = await import('../trunk-cache');
    const { state } = await import('../store');
    resetTrunkCacheStateForTests();
    state.teamTimelines['teamA'] = { seq: 1, msgs: [msg('user', 'ok')] as never };
    const raw = serializeTrunkCache();
    const teams = (JSON.parse(raw as string) as { teams: Record<string, unknown> }).teams;
    expect(Object.keys(teams)).toEqual(['teamA']);
  });

  it('超单条预算的本窗口条目被跳过，也不会从旧文档里捡回来', async () => {
    const { serializeTrunkCache, resetTrunkCacheStateForTests, MAX_SINGLE_CHARS } =
      await import('../trunk-cache');
    const { state } = await import('../store');
    resetTrunkCacheStateForTests();
    // 旧文档里有一条同名但很小的 teamA
    seed('teamA', '小条目');
    // 本窗口的 teamA 超限 → 被跳过；旧文档里的 teamA 也不该被当成「外来」保留
    state.teamTimelines['teamA'] = {
      seq: 1,
      msgs: [{ key: 'k', role: 'user', content: 'x'.repeat(MAX_SINGLE_CHARS + 10), time: 1 }],
    } as never;
    state.teamTimelines['teamB'] = { seq: 1, msgs: [msg('user', 'b')] as never };
    const raw = serializeTrunkCache();
    const teams = (JSON.parse(raw as string) as { teams: Record<string, unknown> }).teams;
    expect(Object.keys(teams)).toEqual(['teamB']);
  });
});

// ── 内存/周期落盘治理（2026-10）───────────────────────────────────────────
//
// 背景：`installTrunkCacheAutosave` 每 10s 落盘一次。改前每次都做
//   JSON.parse(既有文档) + JSON.stringify(全部 team) + localStorage.setItem
// 实测 2 个 team × 1024 条满载 = **24 ms / 次**（4× CPU 约 96 ms）——
// 长期使用后表现为"每隔十秒卡一下"，而且缓存越大越重。
//
// 现在的三级短路：① 签名（每 team 的 `key|seq|条目数`）未变直接返回；
// ② 序列化结果与上次相同 → 只更新签名；③ 写盘失败静默放弃。
describe('trunk-cache 周期落盘治理', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('内容未变时第二次落盘不写盘（签名短路，连 stringify 都不做）', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    const { saveTrunkCacheNow, resetTrunkCacheStateForTests } = await import('../trunk-cache');
    const { state } = await import('../store');
    resetTrunkCacheStateForTests();
    state.teamTimelines['A'] = { seq: 1, msgs: [msg('user', 'x')] as never };

    const spy = vi.spyOn(localStorage, 'setItem');
    saveTrunkCacheNow();
    expect(spy).toHaveBeenCalledTimes(1);
    // 没有变化 → 直接返回
    saveTrunkCacheNow();
    saveTrunkCacheNow();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('内容变化后重新落盘（签名变化不被误判为"没变"）', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    const { saveTrunkCacheNow, resetTrunkCacheStateForTests } = await import('../trunk-cache');
    const { state } = await import('../store');
    resetTrunkCacheStateForTests();
    state.teamTimelines['A'] = { seq: 1, msgs: [msg('user', 'x')] as never };
    const spy = vi.spyOn(localStorage, 'setItem');
    saveTrunkCacheNow();
    // seq 推进（Core 对工具条目就地更新 / ���条目到达 = 水位推进）
    state.teamTimelines['A'].seq = 2;
    saveTrunkCacheNow();
    expect(spy).toHaveBeenCalledTimes(2);
    // 条目数变化同样必须触发
    state.teamTimelines['A'].msgs.push(msg('backend', 'y', 2) as never);
    saveTrunkCacheNow();
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('落盘瘦身：剥掉内嵌 data URI，保留 /media 引用', async () => {
    localStorage.setItem('echo-panel-active-team', 'A');
    const { serializeTrunkCache, resetTrunkCacheStateForTests } = await import('../trunk-cache');
    const { state } = await import('../store');
    resetTrunkCacheStateForTests();
    const huge = `data:image/png;base64,${'A'.repeat(4000)}`;
    state.teamTimelines['A'] = {
      seq: 5,
      msgs: [
        { key: 'k1', role: 'user', content: '带截图', time: 1, images: [huge] },
        { key: 'k2', role: 'user', content: '带文件图', time: 2, images: ['/media/abc.png'] },
      ] as never,
    };
    const raw = serializeTrunkCache() as string;
    expect(raw).toBeTruthy();
    // data URI 不进缓存（否则一次截图就挤爆配额、并拖慢每次 stringify）
    expect(raw).not.toContain('data:image/png;base64');
    const parsed = JSON.parse(raw) as { teams: Record<string, { msgs: Array<{ images?: string[] }> }> };
    expect(parsed.teams['A'].msgs[0].images).toBeUndefined();
    // 轻量的 `/media/<id>` 引用保留（刷新后图片照常显示）
    expect(parsed.teams['A'].msgs[1].images).toEqual(['/media/abc.png']);
  });
});
