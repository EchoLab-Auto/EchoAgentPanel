//! 会话切换面板契约（多会话上下文入口行按钮，2026-09）。
//!
//! 背景：单会话模式下每个群/私聊拥有独立上下文；入口行「会话」按钮
//! （ChatView 提供，>1 个会话时显示）弹出本面板用于切换。
//!
//! 通用化（03b S4 / §4.3）：非 local 会话按 platform 分组（组键
//! `<platform>-dm / <platform>-group`），分组标题取 `session_labels`
//! （无 labels 走 display_name / 平台缺省回退）；标签配色类 `.tag-dm /
//! .tag-group`。

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SessionSwitcher from '../SessionSwitcher.vue';
import { state } from '../../store';
import type { AdapterStatus, SessionInfo } from '../../protocol';

function session(over: Partial<SessionInfo>): SessionInfo {
  return {
    id: 'local:tui::local_user',
    team_id: 'alix',
    platform: 'local',
    scope: 'tui',
    user_id: 'local_user',
    nickname: 'local user',
    group_name: null,
    last_active: 1,
    last_message: '',
    ...over,
  } as SessionInfo;
}

/** 平台适配器 fixture（默认 qq）：session_labels 注入后分组标题 = 「QQ 私聊 / QQ 群」。 */
function adapter(over: Partial<AdapterStatus> = {}): AdapterStatus {
  return {
    name: 'qq',
    display_name: 'QQ（alix）',
    connected: true,
    running: true,
    self_id: '10001',
    bind_address: '0.0.0.0:3131',
    started_at: null,
    persona: 'alix',
    platform: 'qq',
    session_labels: { dm: 'QQ 私聊', group: 'QQ 群' },
    ...over,
  };
}

function mountSwitcher(activeSessionId = 'local:tui::local_user') {
  return mount(SessionSwitcher, {
    props: { activeTeamId: 'alix', activeSessionId },
  });
}

describe('SessionSwitcher 会话切换', () => {
  beforeEach(() => {
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    // 03b S4：分组标题取自 state.adapters 的 session_labels（注入后 = 「QQ 私聊 / QQ 群」）。
    state.adapters = [adapter()];
    state.sessions = [
      session({}),
      session({
        id: 'qq:dm::1828980067',
        platform: 'qq',
        scope: 'dm',
        user_id: '1828980067',
        nickname: 'Evence',
      }),
      session({
        id: 'qq:group:999:42',
        platform: 'qq',
        scope: 'group',
        user_id: '42',
        nickname: '群友',
        group_name: '测试群',
      }),
      // 其他智能体的会话不应出现
      session({ id: 'qq:dm::10001', team_id: 'self-coding', platform: 'qq', scope: 'dm' }),
    ];
    state.activities = {};
  });

  it('按平台分组展示当前智能体的会话（他属会话不显示）', () => {
    const wrapper = mountSwitcher();
    const text = wrapper.text();
    expect(text).toContain('Local');
    expect(text).toContain('QQ 私聊');
    expect(text).toContain('Evence');
    expect(text).toContain('QQ 群');
    expect(text).toContain('测试群');
    expect(text).not.toContain('10001');
  });

  it('当前会话高亮', () => {
    const wrapper = mountSwitcher('qq:dm::1828980067');
    const active = wrapper.find('.sw-item.is-active');
    expect(active.exists()).toBe(true);
    expect(active.text()).toContain('Evence');
  });

  it('点击会话发出 select 事件', async () => {
    const wrapper = mountSwitcher();
    const evence = wrapper.findAll('.sw-item').find((b) => b.text().includes('Evence'));
    expect(evence).toBeTruthy();
    await evence!.trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['qq:dm::1828980067']);
  });

  it('并行多会话模式：显示「全局（全部消息）」入口，点击选中 global', async () => {
    state.teams = [
      { id: 'alix', name: 'Alix', enabled: true, sessions: 0, loop_mode: 'parallel' } as never,
    ];
    const wrapper = mountSwitcher();
    const globalItem = wrapper.findAll('.sw-item').find((b) => b.text().includes('全部消息'));
    expect(globalItem).toBeTruthy();
    await globalItem!.trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['global']);
  });

  it('单会话模式：不显示全局入口', () => {
    const wrapper = mountSwitcher();
    expect(wrapper.text()).not.toContain('全部消息');
  });

  it('工作区通道：Local 分组内展示通道行（昵称 = 工作区名，标签「工作区」）', () => {
    state.sessions.push(
      session({
        id: 'local:workspace:echo-agent:local_user',
        scope: 'workspace',
        nickname: 'echo-agent',
        last_active: 99,
      }),
    );
    const wrapper = mountSwitcher();
    const text = wrapper.text();
    expect(text).toContain('echo-agent');
    // 标签「工作区」带独立配色类（tag-workspace）
    const tag = wrapper.findAll('.sw-tag').find((t) => t.text() === '工作区');
    expect(tag).toBeTruthy();
    expect(tag!.classes()).toContain('tag-workspace');
  });

  it('会话级 API 下拉：仅工作区通道行渲染（profile 列表为空也显示）', () => {
    state.api = null;
    state.sessionApiOverrides = {};
    state.sessions.push(
      session({ id: 'local:workspace:echo-agent:local_user', scope: 'workspace', nickname: 'echo-agent', last_active: 99 }),
    );
    const wrapper = mountSwitcher();
    const rows = wrapper.findAll('.sw-item');
    const ws = rows.find((r) => r.text().includes('echo-agent'))!;
    expect(ws.find('.sw-api .nm-select__wrapper').exists()).toBe(true);
    const evence = rows.find((r) => r.text().includes('Evence'))!;
    expect(evence.find('.sw-api').exists()).toBe(false);
  });

  it('会话级 API 下拉：点击不触发行选', async () => {
    state.sessions.push(
      session({ id: 'local:workspace:echo-agent:local_user', scope: 'workspace', nickname: 'echo-agent', last_active: 99 }),
    );
    const wrapper = mountSwitcher();
    await wrapper.find('.sw-api').trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('运行中会话显示忙碌点', () => {
    state.activities = {
      'qq:dm::1828980067': { phase: 'thinking', detail: null, startedAt: 1, toolsCompleted: 0, subagentsCompleted: 0, promptTokens: 0, completionTokens: 0 },
    } as typeof state.activities;
    const wrapper = mountSwitcher();
    const evence = wrapper.findAll('.sw-item').find((b) => b.text().includes('Evence'));
    expect(evence!.find('.sw-busy').exists()).toBe(true);
  });

  // ── 03b S4：platform + session_labels 通用化 ──

  it('无 session_labels：回退 <display_name> 私聊 / 群聊', () => {
    state.adapters = [adapter({ session_labels: null })];
    const wrapper = mountSwitcher();
    expect(wrapper.text()).toContain('QQ（alix） 私聊');
    expect(wrapper.text()).toContain('QQ（alix） 群聊');
  });

  it('整个 platform 无匹配适配器：回退「私聊 / 群聊」', () => {
    state.adapters = [];
    const wrapper = mountSwitcher();
    expect(wrapper.text()).toContain('私聊');
    expect(wrapper.text()).toContain('群聊');
    expect(wrapper.text()).not.toContain('QQ 私聊');
  });

  it('第二平台独立分组：组键/标题独立，顺序 local → qq → 其他平台', () => {
    state.sessions.push(
      session({
        id: 'telegram:dm::777',
        platform: 'telegram',
        scope: 'dm',
        nickname: 'TG 用户',
        last_active: 5,
      }),
    );
    state.adapters = [
      adapter(),
      adapter({
        name: 'tg',
        display_name: 'TG（alix）',
        platform: 'telegram',
        session_labels: { dm: 'TG 私聊', group: 'TG 群' },
      }),
    ];
    const wrapper = mountSwitcher();
    // 分组顺序稳定：local → qq（外置平台之前）→ telegram；同平台 dm 先于 group
    const titles = wrapper.findAll('.sw-group__title').map((t) => t.text());
    expect(titles).toEqual(['Local', 'QQ 私聊', 'QQ 群', 'TG 私聊']);
    // 会话归属各自平台分组
    const tgGroup = wrapper.findAll('.sw-group').find((g) => g.text().includes('TG 私聊'))!;
    expect(tgGroup.text()).toContain('TG 用户');
    expect(tgGroup.text()).not.toContain('Evence');
  });

  it('标签配色类泛化：私聊 = .tag-dm，群 = .tag-group（旧 .tag-qq-* 退役）', () => {
    const wrapper = mountSwitcher();
    const dm = wrapper.findAll('.sw-tag').find((t) => t.text() === '私聊');
    const group = wrapper.findAll('.sw-tag').find((t) => t.text() === '群');
    expect(dm!.classes()).toContain('tag-dm');
    expect(group!.classes()).toContain('tag-group');
  });
});
