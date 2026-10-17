//! 按**标签页**隔离的偏好读写（2026-10 多窗口修复）。
//!
//! 背景：Panel 的「当前 agent」「当前会话」「当前视图」此前全部存在
//! `localStorage`——那是**同源所有标签页共享**的。于是：
//!
//! - A 窗口选另一个 agent → 写 localStorage → B 一旦**重载**（部署换哈希后
//!   `lazy.ts` 的 chunk 404 自动 reload、浏览器 Memory Saver 丢弃后台标签、
//!   手动刷新…）就会读到 A 的选择，落到 A 的 agent + 默认会话上。用户观感
//!   是「B 跟着 A 跳过去了」。
//! - 任何「共享写入 → 另一窗口读取」的路径都在此列，包括视图、侧栏布局等。
//!
//! 语义（两层）：
//!
//! | 存储 | 作用 | 生命周期 |
//! | --- | --- | --- |
//! | `sessionStorage` | **本标签页的真实偏好**（读写都走这里） | 标签页关闭即失效 |
//! | `localStorage` | **新标签页的初始默认值**（只在 sessionStorage 无值时读；写入时顺带更新） | 跨会话保留 |
//!
//! 于是：同一标签页刷新 → 恢复自己上次的选择；新开标签 → 继承最近一次的
//! 默认值（符合直觉）；两个标签页互不干扰。存储不可用（隐私模式）时静默降级。

/** 读：本标签页 → 全局默认。 */
export function readPref(key: string): string | null {
  try {
    const tab = sessionStorage.getItem(key);
    if (tab !== null) return tab;
  } catch {
    // sessionStorage 不可用：继续尝试 localStorage
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 写：优先写本标签页（权威值），同时更新全局默认（供新标签继承）。
 *
 * @param value `null` = 清除（两个存储都清）
 */
export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // 隐私模式等：忽略
  }
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 配额/隐私模式：仅本标签页生效
  }
}

/**
 * 只写本标签页，**不**更新全局默认。
 *
 * 用于「纯视图态」：例如当前会话——新标签页不应继承别的标签页正在看的会话
 * （那正是「跟着跳」的另一半）。当前 agent 则相反：新标签继承是合理的。
 */
export function writeTabOnly(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // 忽略
  }
}

/**
 * 只读本标签页（不回退全局）。
 *
 * 用于「必须严格 per-tab」的量：当前会话、视图。回退会重新引入串台。
 */
export function readTabOnly(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
