// ── helpers ────────────────────────────────────────────────────────────────

export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '…';
}

export function summarizeArguments(argumentsJson: string): string {
  try {
    const value = JSON.parse(argumentsJson) as Record<string, unknown>;
    if (typeof value !== 'object' || value === null) return '';
    return Object.entries(value)
      .map(([key, val]) => {
        const text = typeof val === 'string' ? val : JSON.stringify(val);
        return `${key}=${truncate(oneLine(text), 120)}`;
      })
      .join(' ');
  } catch {
    return truncate(oneLine(argumentsJson), 200);
  }
}

/**
 * 定时消息（`<timer_event>` hook）的展示行。
 *
 * ## 必须与 Core 逐字一致
 *
 * 同一条定时消息有**两条渲染路径**：
 * - 实时：Core 发原始 `MessageReceived`，本函数投影成 system 行；
 * - 历史/刷新：Core 的 `agent-module-transcript` 投影后随快照下发。
 *
 * 两边文案不一致的后果是「刷新一下，同一句话换了措辞」——这条曾经真实发生
 * （本函数写 `⏰ 定时器触发 · 截 160`，Core 写 `定时任务触发 · 截 120`）。
 * 以 Core 为准，因为它同时决定持久化形状；这里只是实时路径的等价投影。
 *
 * 对齐的四个细节（每一条都曾是差异点）：
 * | 细节 | Core（`timeline_text.rs`） | 本函数 |
 * |---|---|---|
 * | 文案 | `定时任务触发` | 同 |
 * | 截断宽度 | 120 | 同 |
 * | `task` 缺失/非字符串 | 纯文案（`Option` 分流） | 纯文案（不是 `定时任务触发 · `） |
 * | 截断单位 | `chars()` 码点 | `Array.from` 码点（不是 `.length` 的 UTF-16 单元） |
 */
export function summarizeTimerEvent(content: string): string {
  const match = content.match(/<timer_event>([\s\S]*?)<\/timer_event>/);
  const task = (() => {
    if (!match) return null;
    try {
      const value = JSON.parse(match[1]) as Record<string, unknown>;
      const raw = value['task'];
      return typeof raw === 'string' ? raw : null;
    } catch {
      return null;
    }
  })();
  if (task === null) return '定时任务触发';
  return `定时任务触发 · ${truncateChars(oneLine(task), 120)}`;
}

/** 折叠空白后按**码点**截断（等价于 Core 的 `truncate_one_line`）。 */
function truncateChars(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join('') + '…';
}

export function bounded(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max) + '…';
}
