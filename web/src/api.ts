//! 公共 HTTP 辅助：带超时的 fetch，弱网/后端无响应时不无限等待。

/** 默认请求超时（毫秒） */
export const FETCH_TIMEOUT_MS = 10_000;

/**
 * `fetch` 包装：AbortController 超时控制。
 * 超时抛 `Error('请求超时')`；网络错误/非 2xx 由调用方按需处理。
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`请求超时（>${timeoutMs / 1000}s）：${url}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
