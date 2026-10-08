//! api-metrics 工具测试：格式化、series 构造、多 profile 桶对齐、费用汇总。
import { describe, expect, it } from 'vitest';
import {
  alignBalanceSeries,
  alignUsageSeries,
  balanceSeries,
  entryTotals,
  formatMoney,
  formatTokens,
  formatTsLabel,
  latestBalance,
  usageSeries,
} from '../api-metrics';
import type { ApiMetricsEntry, ApiUsagePoint } from '../protocol';

const HOUR = 60 * 60 * 1000;
/** 固定基准时刻（本地时区 2026-10-05 08:00 整点）。 */
const T0 = new Date(2026, 9, 5, 8, 0, 0).getTime();

function makeEntry(
  name: string,
  balance: Array<[number, number]>,
  usage: Array<[number, string, number, number]> = [],
  costCurrency = 'CNY',
): ApiMetricsEntry {
  return {
    name,
    balance: balance.map(([ts, total]) => ({
      ts_ms: ts,
      total,
      granted: 0,
      topped_up: total,
      currency: costCurrency,
    })),
    usage: usage.map(
      ([ts, model, prompt, completion]): ApiUsagePoint => ({
        ts_ms: ts,
        model,
        prompt_tokens: prompt,
        completion_tokens: completion,
        calls: 1,
      }),
    ),
    cost_currency: costCurrency,
  };
}

describe('格式化', () => {
  it('formatTokens 缩写', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
    expect(formatTokens(1000)).toBe('1K');
    expect(formatTokens(1200)).toBe('1.2K');
    expect(formatTokens(52340)).toBe('52.3K');
    expect(formatTokens(1234567)).toBe('1.23M');
    expect(formatTokens(2_000_000_000)).toBe('2B');
    expect(formatTokens(-1500)).toBe('-1.5K');
  });

  it('formatMoney 千分位与币种', () => {
    expect(formatMoney(1287.91, 'CNY')).toBe('¥1,287.91');
    expect(formatMoney(5, 'USD')).toBe('$5.00');
    expect(formatMoney(12.34, 'XYZ')).toBe('12.34 XYZ');
    expect(formatMoney(0.5, '')).toBe('0.50');
    expect(formatMoney(-3.5, 'CNY')).toBe('-¥3.50');
  });

  it('formatTsLabel 本地时区 MM-DD HH:mm', () => {
    const ts = new Date(2026, 9, 8, 14, 3).getTime();
    expect(formatTsLabel(ts)).toBe('10-08 14:03');
  });
});

describe('单 profile series', () => {
  it('balanceSeries 保持原采样点顺序', () => {
    const entry = makeEntry('deepseek', [
      [T0, 100],
      [T0 + 10 * 60 * 1000, 99.5],
    ]);
    const points = balanceSeries(entry);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ label: formatTsLabel(T0), value: 100 });
    expect(points[1].value).toBe(99.5);
  });

  it('usageSeries 同小时多模型合并求和', () => {
    const entry = makeEntry('deepseek', [], [
      [T0, 'deepseek-flash', 1000, 100],
      [T0 + 5 * 60 * 1000, 'deepseek-flash', 500, 50],
      [T0 + HOUR, 'deepseek-v4-pro', 200, 20],
    ]);
    const points = usageSeries(entry);
    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(1650);
    expect(points[1].value).toBe(220);
  });
});

describe('多 profile 桶对齐', () => {
  it('alignUsageSeries：公共小时轴、空桶补 0', () => {
    const a = makeEntry('a', [], [
      [T0, 'm', 100, 10],
      [T0 + 2 * HOUR, 'm', 200, 20],
    ]);
    const b = makeEntry('b', [], [[T0 + HOUR, 'm', 50, 5]]);
    const series = alignUsageSeries([a, b]);
    expect(series.map((s) => s.name)).toEqual(['a', 'b']);
    expect(series[0].data).toHaveLength(3);
    expect(series[0].data.map((p) => p.value)).toEqual([110, 0, 220]);
    expect(series[1].data.map((p) => p.value)).toEqual([0, 55, 0]);
    // 两 series 等长、label 相同（可对齐）
    expect(series[0].data.map((p) => p.label)).toEqual(series[1].data.map((p) => p.label));
  });

  it('alignBalanceSeries：前向填充 + 起始前沿用首值', () => {
    const a = makeEntry('a', [
      [T0, 100],
      [T0 + 2 * HOUR, 80],
    ]);
    const b = makeEntry('b', [[T0 + HOUR, 200]]);
    const series = alignBalanceSeries([a, b]);
    expect(series[0].data.map((p) => p.value)).toEqual([100, 100, 80]);
    expect(series[1].data.map((p) => p.value)).toEqual([200, 200, 200]);
  });

  it('无数据返回空数组；空名显示为「默认」', () => {
    expect(alignUsageSeries([])).toEqual([]);
    const empty = makeEntry('', []);
    expect(alignBalanceSeries([empty])).toEqual([]);
    const named = makeEntry('', [[T0, 1]]);
    expect(alignBalanceSeries([named])[0].name).toBe('默认');
  });

  it('首尾桶跨越多个小时时补齐中间桶', () => {
    const entry = makeEntry('a', [], [
      [T0, 'm', 1, 0],
      [T0 + 3 * HOUR + 10 * 60 * 1000, 'm', 2, 0],
    ]);
    const series = alignUsageSeries([entry]);
    expect(series[0].data).toHaveLength(4);
    expect(series[0].data.map((p) => p.value)).toEqual([1, 0, 0, 2]);
  });
});

describe('汇总与最新快照', () => {
  it('entryTotals 求和 tokens 与费用（null 不计入）', () => {
    const entry = makeEntry('deepseek', [], [
      [T0, 'deepseek-flash', 1000, 100],
      [T0 + HOUR, 'deepseek-flash', 500, 50],
    ]);
    entry.usage[0].est_cost = 0.01;
    // 第二条无 est_cost（未定价）——不计入费用
    const totals = entryTotals(entry);
    expect(totals.prompt).toBe(1500);
    expect(totals.completion).toBe(150);
    expect(totals.tokens).toBe(1650);
    expect(totals.cost).toBeCloseTo(0.01);
    expect(totals.currency).toBe('CNY');
  });

  it('entryTotals 无定价 = cost null；无用量 = tokens 0', () => {
    const entry = makeEntry('x', [], [[T0, 'unknown', 10, 1]]);
    expect(entryTotals(entry).cost).toBeNull();
    expect(entryTotals(makeEntry('y', [])).tokens).toBe(0);
  });

  it('latestBalance 取最后一条', () => {
    const entry = makeEntry('a', [
      [T0, 1],
      [T0 + 1000, 2],
    ]);
    expect(latestBalance(entry)?.total).toBe(2);
    expect(latestBalance(undefined)).toBeNull();
  });
});
