//! 移动端底部 Sheet 的**返回键语义**（2026-11 移动端逻辑补全）。
//!
//! 现场：手机上打开「卡片」抽屉 / `☰` 视图菜单后，按系统返回（Android 返回键、
//! iOS 边缘滑动）会**直接离开应用**——因为这是固定视口 SPA，没有路由，也没有
//! 任何历史条目。桌面永远暴露不到这个问题。
//!
//! 契约（本文件锁定）：
//! 1. 打开 Sheet → push 一条历史条目；按返回 → **只关 Sheet**；
//! 2. 主动关闭（点遮罩 / 选中项 / 切视图）→ 把那条历史还回去（`history.back()`），
//!    否则历史栈越攒越深，用户要按 N 次才能退出；
//! 3. 关闭幂等（抽屉的 `v-model` 与点击遮罩会先后各关一次）；
//! 4. 没有 Sheet 时**不拦截** popstate（真想离开就该离开）。

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  closeMobileSheet,
  initMobileSheetHistory,
  mobileCardsDrawerOpen,
  mobileSheet,
  mobileViewSheetOpen,
  openMobileSheet,
  toggleMobileSheet,
} from '../mobile-sheets';

beforeEach(() => {
  closeMobileSheet();
  // 复位到"无 Sheet、无历史条目"的初始态：closeMobileSheet 会尝试 back()，
  // happy-dom 里是空操作，但标记必须归零，否则用例间互相影响。
  (mobileSheet as unknown as { value: string | null }).value = null;
});

describe('移动端 Sheet：返回键只关面板', () => {
  it('打开时压一条历史；按返回只关掉 Sheet', () => {
    initMobileSheetHistory();
    const push = vi.spyOn(window.history, 'pushState');

    openMobileSheet('cards');
    expect(mobileSheet.value).toBe('cards');
    expect(push, '打开 Sheet 必须压一条历史（否则返回直接退出应用）').toHaveBeenCalledTimes(1);
    push.mockRestore();

    // 模拟系统返回：浏览器先 pop 掉我们压的那条，再派发 popstate
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(mobileSheet.value, '返回应只关面板').toBeNull();
  });

  it('主动关闭会把历史条目还回去（不在栈里攒垃圾）', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    openMobileSheet('view');
    closeMobileSheet();
    expect(mobileSheet.value).toBeNull();
    expect(back, '主动关闭应回退那条 push').toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it('关闭幂等：抽屉 v-model 与遮罩点击先后各关一次也不多退', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    openMobileSheet('cards');
    closeMobileSheet();
    closeMobileSheet();
    closeMobileSheet();
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it('没有 Sheet 打开时不拦截返回（交回浏览器默认行为）', () => {
    initMobileSheetHistory();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(mobileSheet.value).toBeNull();
    expect(back, '无 Sheet 时不该调 history.back()').not.toHaveBeenCalled();
    back.mockRestore();
  });

  it('computed 开关也走统一入口（抽屉 v-model 不会绕过 history）', () => {
    const push = vi.spyOn(window.history, 'pushState');
    mobileCardsDrawerOpen.value = true;
    expect(mobileSheet.value).toBe('cards');
    expect(push).toHaveBeenCalledTimes(1);

    // 两个 Sheet 互斥：打开视图菜单会先丢掉卡片抽屉的状态（同一条历史）
    mobileViewSheetOpen.value = true;
    expect(mobileSheet.value).toBe('view');
    expect(push, '互斥切换不重复压历史').toHaveBeenCalledTimes(1);
    push.mockRestore();
  });

  it('toggle 同一 Sheet 两次 = 开 → 关', () => {
    const push = vi.spyOn(window.history, 'pushState');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    toggleMobileSheet('view');
    expect(mobileSheet.value).toBe('view');
    toggleMobileSheet('view');
    expect(mobileSheet.value).toBeNull();
    expect(push).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
    push.mockRestore();
    back.mockRestore();
  });
});
