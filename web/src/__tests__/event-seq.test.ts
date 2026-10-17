//! 事件流连续性校验（2026-10）：序号跳号 = 中间有帧没到。
//!
//! 背景：Core 给每条下发到 Panel 的事件附一个进程内单调递增序号
//! （`{"type":"event","payload":{…},"seq":N}`）。此前事件一旦静默丢失，
//! 前端无从得知——某条 `ToolResult` 丢了，工具行就永远停在「运行中」读秒，
//! 只能刷新页面才好。回合收尾兜底只能救这个**表现**，救不回真正丢掉的
//! 内容（工具输出、回答片段、会话列表更新……）。
//!
//! 契约：
//! 1. 首帧 → `baseline`（中途订阅的 Panel 从当前进度起收，不能算跳号）；
//! 2. 严格 +1 → `contiguous`；
//! 3. 向前跳 → `gap`，`missed` = 缺的条数（调用方按游标补拉 timeline）；
//! 4. 回退/重复 → `reset`（Core 重启归 1 / 中继补发旧帧），不报警；
//! 5. 帧上无序号（旧版 Core）→ `ignored`，跳过校验（向后兼容）；
//! 6. 按 core 分桶：多上游各有各的计数器，混桶会把交替发帧误判成跳号。
import { describe, it, expect, beforeEach } from 'vitest';
import {
  observeEventSeq,
  resetEventSeq,
  eventSeqStats,
  lastEventSeq,
} from '../event-seq';

beforeEach(() => {
  resetEventSeq();
});

const kinds = (cores: Array<string | null>, seqs: number[]) =>
  cores.map((core, i) => observeEventSeq(core, seqs[i]).kind);

describe('事件序号连续性', () => {
  it('首帧建立基线，随后 +1 视为连续', () => {
    expect(observeEventSeq(null, 1).kind).toBe('baseline');
    expect(observeEventSeq(null, 2).kind).toBe('contiguous');
    expect(observeEventSeq(null, 3).kind).toBe('contiguous');
    expect(eventSeqStats().gaps).toBe(0);
  });

  it('中途订阅从当前进度起：首帧不判跳号', () => {
    // Panel 在 Core 已发到 900 时才连上
    expect(observeEventSeq(null, 901).kind).toBe('baseline');
    expect(observeEventSeq(null, 902).kind).toBe('contiguous');
  });

  it('跳号：报 gap 并给出缺失条数', () => {
    observeEventSeq(null, 10);
    const obs = observeEventSeq(null, 15);
    expect(obs.kind).toBe('gap');
    expect(obs.missed).toBe(4);
    expect(eventSeqStats()).toEqual({ gaps: 1, missed: 4 });
    // 补拉之后继续连续
    expect(observeEventSeq(null, 16).kind).toBe('contiguous');
  });

  it('连续多次跳号各自计数', () => {
    observeEventSeq(null, 1);
    observeEventSeq(null, 3); // 缺 1
    observeEventSeq(null, 8); // 缺 4
    expect(eventSeqStats()).toEqual({ gaps: 2, missed: 5 });
  });

  it('序号回退（Core 重启归 1）→ reset，不报警', () => {
    observeEventSeq(null, 500);
    expect(observeEventSeq(null, 1).kind).toBe('reset');
    expect(eventSeqStats().gaps).toBe(0);
    // 重取基线后继续正常
    expect(observeEventSeq(null, 2).kind).toBe('contiguous');
  });

  it('重复帧 → reset（不误报跳号）', () => {
    observeEventSeq(null, 7);
    expect(observeEventSeq(null, 7).kind).toBe('reset');
    expect(observeEventSeq(null, 8).kind).toBe('contiguous');
  });

  it('无序号（旧版 Core）→ ignored，且不影响后续连续性', () => {
    expect(observeEventSeq(null, null).kind).toBe('ignored');
    expect(observeEventSeq(null, undefined).kind).toBe('ignored');
    expect(observeEventSeq(null, 0).kind).toBe('ignored');
    expect(observeEventSeq(null, Number.NaN).kind).toBe('ignored');
    expect(lastEventSeq(null)).toBeNull();
    expect(observeEventSeq(null, 1).kind).toBe('baseline');
    expect(observeEventSeq(null, 2).kind).toBe('contiguous');
  });

  it('按 core 分桶：多上游交替发帧不算跳号', () => {
    // core A 发 1，core B 发 100，A 发 2，B 发 101
    expect(
      kinds(['A', 'B', 'A', 'B'], [1, 100, 2, 101]),
    ).toEqual(['baseline', 'baseline', 'contiguous', 'contiguous']);
    expect(eventSeqStats().gaps).toBe(0);
  });

  it('某个 core 单独跳号只影响自己', () => {
    observeEventSeq('A', 1);
    observeEventSeq('B', 50);
    expect(observeEventSeq('A', 5).kind).toBe('gap');
    expect(observeEventSeq('B', 51).kind).toBe('contiguous');
  });

  it('resetEventSeq 清空全部基线（重连语义）', () => {
    observeEventSeq('A', 200);
    observeEventSeq('A', 300); // gap
    expect(eventSeqStats().gaps).toBe(1);
    resetEventSeq();
    expect(lastEventSeq('A')).toBeNull();
    expect(eventSeqStats()).toEqual({ gaps: 0, missed: 0 });
    expect(observeEventSeq('A', 5000).kind).toBe('baseline');
  });
});
