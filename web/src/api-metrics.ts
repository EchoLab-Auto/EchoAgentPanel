//! 余额/用量图表的数据整形与格式化（`ApiMetrics` 事件 → 图表 series）。
//!
//! - 卡片小图：单 profile 的 `balanceSeries` / `usageSeries`；
//! - 总览对比图：多 profile 经 `alignBalanceSeries` / `alignUsageSeries`
//!   按小时桶对齐（各 series 等长，横轴可对齐；余额前向填充、用量求和）；
//! - 费用估算：`entryTotals` 汇总（按 Core 定价表算出的 `est_cost`）。
//!
//! series 结构与 ui-frame `ChartSeries` 结构兼容（`{ name, data: [{label, value}] }`），
//! 直接传给 `NeumorphismChartLine` 即可。

import type { ApiBalancePoint, ApiMetricsEntry, ApiUsagePoint } from './protocol';

/** 图表数据点（与 ui-frame `ChartDataPoint` 结构兼容）。 */
export interface MetricsPoint {
  label: string;
  value: number;
  [key: string]: unknown;
}

/** 命名 series（与 ui-frame `ChartSeries` 结构兼容）。 */
export interface MetricsSeries {
  name: string;
  data: MetricsPoint[];
}

const HOUR_MS = 60 * 60 * 1000;

/** 时间戳 → "MM-DD HH:mm"（本地时区）。 */
export function formatTsLabel(tsMs: number): string {
  const d = new Date(tsMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 只保留一位/两位有效小数的定长格式（去尾零）：52.30 → "52.3"。 */
function trimFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.?0+$/, '');
}

/** token 数缩写：999 → "999"，52340 → "52.3K"，12345678 → "12.3M"。 */
export function formatTokens(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${trimFixed(abs / 1e9, 2)}B`;
  if (abs >= 1e6) return `${sign}${trimFixed(abs / 1e6, 2)}M`;
  if (abs >= 1e3) return `${sign}${trimFixed(abs / 1e3, 1)}K`;
  return `${sign}${Math.round(abs)}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

/** 金额显示：¥1,287.91（未知币种回退 "1,287.91 XYZ"）。 */
export function formatMoney(amount: number, currency: string): string {
  const [int, frac] = Math.abs(amount).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = amount < 0 ? '-' : '';
  const amountText = `${sign}${grouped}.${frac}`;
  const symbol = CURRENCY_SYMBOLS[currency];
  if (symbol) return `${sign}${symbol}${grouped}.${frac}`;
  return currency ? `${amountText} ${currency}` : amountText;
}

/** 单 profile 余额序列（原始采样点，label = 采样时刻）。 */
export function balanceSeries(entry: ApiMetricsEntry): MetricsPoint[] {
  return (entry.balance ?? []).map((p) => ({
    label: formatTsLabel(p.ts_ms),
    value: p.total,
  }));
}

/** 单 profile 用量序列（按小时聚合 prompt+completion）。 */
export function usageSeries(entry: ApiMetricsEntry): MetricsPoint[] {
  const byHour = usageByBucket(entry.usage ?? [], HOUR_MS);
  return [...byHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, value]) => ({ label: formatTsLabel(ts), value }));
}

/** 汇总（近 7 天）：token 总量与估算费用（null = 无可估算用量）。 */
export function entryTotals(entry: ApiMetricsEntry): {
  prompt: number;
  completion: number;
  tokens: number;
  cost: number | null;
  currency: string;
} {
  let prompt = 0;
  let completion = 0;
  let cost: number | null = null;
  for (const p of entry.usage ?? []) {
    prompt += p.prompt_tokens;
    completion += p.completion_tokens;
    if (p.est_cost != null) {
      cost = (cost ?? 0) + p.est_cost;
    }
  }
  return {
    prompt,
    completion,
    tokens: prompt + completion,
    cost,
    currency: entry.cost_currency || '',
  };
}

/** 取最新一条余额快照（无数据 = null）。 */
export function latestBalance(entry: ApiMetricsEntry | undefined): ApiBalancePoint | null {
  const points = entry?.balance ?? [];
  return points.length ? points[points.length - 1] : null;
}

function floorBucket(tsMs: number, bucketMs: number): number {
  return Math.floor(tsMs / bucketMs) * bucketMs;
}

/** 用量按桶求和：桶起点 → tokens 总量。 */
function usageByBucket(points: ApiUsagePoint[], bucketMs: number): Map<number, number> {
  const map = new Map<number, number>();
  for (const p of points) {
    const bucket = floorBucket(p.ts_ms, bucketMs);
    map.set(bucket, (map.get(bucket) ?? 0) + p.prompt_tokens + p.completion_tokens);
  }
  return map;
}

/** 多 profile 用量对比：公共小时桶轴，各 series 等长（空桶补 0）。 */
export function alignUsageSeries(entries: ApiMetricsEntry[], bucketMs = HOUR_MS): MetricsSeries[] {
  const withData = entries.filter((e) => (e.usage ?? []).length > 0);
  if (withData.length === 0) return [];
  const buckets = collectBuckets(
    withData.flatMap((e) => (e.usage ?? []).map((p) => p.ts_ms)),
    bucketMs,
  );
  if (buckets.length === 0) return [];
  return withData.map((entry) => {
    const sums = usageByBucket(entry.usage ?? [], bucketMs);
    return {
      name: displayName(entry),
      data: buckets.map((b) => ({ label: formatTsLabel(b), value: sums.get(b) ?? 0 })),
    };
  });
}

/**
 * 多 profile 余额对比：公共小时桶轴 + **前向填充**（桶取 ≤ 桶起点的最近
 * 快照值；首个采样点之前的桶沿用首值，保证各 series 等长可对齐）。
 */
export function alignBalanceSeries(entries: ApiMetricsEntry[], bucketMs = HOUR_MS): MetricsSeries[] {
  const withData = entries.filter((e) => (e.balance ?? []).length > 0);
  if (withData.length === 0) return [];
  const buckets = collectBuckets(
    withData.flatMap((e) => (e.balance ?? []).map((p) => p.ts_ms)),
    bucketMs,
  );
  if (buckets.length === 0) return [];
  return withData.map((entry) => {
    const points = [...(entry.balance ?? [])].sort((a, b) => a.ts_ms - b.ts_ms);
    const values: number[] = [];
    let idx = 0;
    for (const bucket of buckets) {
      while (idx + 1 < points.length && points[idx + 1].ts_ms <= bucket) idx += 1;
      values.push(points[idx].total);
    }
    return {
      name: displayName(entry),
      data: buckets.map((b, i) => ({ label: formatTsLabel(b), value: values[i] })),
    };
  });
}

/** 桶轴：从最早到最晚（含端点），步长 bucketMs。 */
function collectBuckets(timestamps: number[], bucketMs: number): number[] {
  if (timestamps.length === 0) return [];
  const start = floorBucket(Math.min(...timestamps), bucketMs);
  const end = floorBucket(Math.max(...timestamps), bucketMs);
  const buckets: number[] = [];
  for (let ts = start; ts <= end; ts += bucketMs) {
    buckets.push(ts);
    if (buckets.length > 1000) break; // 防御：异常跨度上限
  }
  return buckets;
}

/** series / 图例显示名（空名 = 顶层默认）。 */
function displayName(entry: ApiMetricsEntry): string {
  return entry.name || '默认';
}
