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

export function summarizeTimerEvent(content: string): string {
  const match = content.match(/<timer_event>(.*?)<\/timer_event>/s);
  if (!match) return truncate(oneLine(content), 200);
  try {
    const value = JSON.parse(match[1]) as Record<string, unknown>;
    const task = String(value['task'] ?? '');
    return `⏰ 定时器触发 · ${truncate(oneLine(task), 160)}`;
  } catch {
    return '⏰ 定时器触发';
  }
}

export function bounded(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max) + '…';
}
