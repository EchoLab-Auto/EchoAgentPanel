//! 上游（Core）的统一展示口径：**配置名 + 区域副注**（2026-10 用户报告）。
//!
//! 背景：同一台 Core 有三套名字，此前互相看不出关系——
//! - 配置名（`[cores].name`）：设置页里用户填的，也是会话列表徽标与命令信封
//!   `{core: "<name>"}` 里的**路由键**；
//! - 区域名（`region_name`）：那台机器自称的名字（`evence-4090-24` 之类）。
//!
//! 「连接状态」与 Shell 视图曾用区域名，于是设置页写 `core`、会话徽标显示
//! `core`、连接状态却显示 `evence-4090-24` —— 排查时无法对应。
//!
//! 本文件钉住唯一入口 `coreDisplay()` 的三条契约，任何地方再想自己拼名字都会
//! 先读到这里的取舍理由。

import { describe, it, expect, beforeEach } from 'vitest';
import { coreDisplay, initialState } from '../state';

describe('coreDisplay：配置名 + 区域副注', () => {
  let state = initialState();

  beforeEach(() => {
    state = initialState();
  });

  it('主名恒为**配置名**（路由键），区域名只作副注', () => {
    state.regions = { core: { id: 'node-1', name: 'evence-4090-24' } };
    const shown = coreDisplay(state, 'core');
    expect(shown.name).toBe('core'); // 与设置页 / 会话徽标 / 命令信封一致
    expect(shown.region).toBe('evence-4090-24');
    expect(shown.title).toContain('core');
    expect(shown.title).toContain('evence-4090-24');
  });

  it('区域名与配置名相同（或尚未学到）时不给副注', () => {
    // Core 侧 `region_name` 缺省时会回落成上游名——这种部署占多数，
    // 副注没有信息量，显示出来只是让一行出现两个一样的名字。
    state.regions = { core: { id: 'node-1', name: 'core' } };
    expect(coreDisplay(state, 'core').region).toBeNull();
    expect(coreDisplay(state, 'core').title).toBe('core');

    state.regions = {};
    expect(coreDisplay(state, 'ai_station').region).toBeNull();
    expect(coreDisplay(state, 'ai_station').name).toBe('ai_station');
  });

  it('无上游（单上游 / 本机）回落「本机」，不抛错', () => {
    for (const core of [null, undefined, '']) {
      const shown = coreDisplay(state, core);
      expect(shown.name).toBe('本机');
      expect(shown.region).toBeNull();
    }
  });

  it('多上游互不串：每个配置名查自己的区域', () => {
    state.regions = {
      core: { id: 'node-1', name: 'evence-4090-24' },
      'A100-40g': { id: 'node-2', name: 'ubuntu24' },
      ai_station: { id: 'node-3', name: 'ai_station' },
    };
    expect(coreDisplay(state, 'core').region).toBe('evence-4090-24');
    expect(coreDisplay(state, 'A100-40g').region).toBe('ubuntu24');
    expect(coreDisplay(state, 'ai_station').region).toBeNull();
  });
});
