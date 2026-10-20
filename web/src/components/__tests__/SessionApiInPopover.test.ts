// 会话弹层内的「会话级 API」下拉必须**真的能选**（2026-10 用户报障回归）。
//
// 背景链路：ChatView 入口行「会话」按钮 → PanelPopover（Teleport 到 body、
// 监听 document pointerdown 判定外部点击）→ SessionSwitcher → 每行
// NeumorphismSelect（ui-frame 下拉浮层又 teleport 到 body）。
//
// 曾经的 bug：点下拉选项时 pointerdown 先到 document（捕获阶段），浮层 DOM
// 不在 .panel-popover 内 → 判定为"点了面板外" → 面板 v-if 卸载 → 选项
// click 丢失，用户看到「右侧下拉点不动 / 面板一闪就关」。
//
// 本测试断言完整链路：选项 click 生效、发出 SetSessionApi、面板不关闭。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { state } from '../../store';
import type { SessionInfo } from '../../protocol';

const sendCommand = vi.fn();
vi.mock('../../connection', () => ({
  sendCommand: (...args: unknown[]) => sendCommand(...args),
}));

const PanelPopover = (await import('../PanelPopover.vue')).default;
const SessionSwitcher = (await import('../SessionSwitcher.vue')).default;

function session(over: Partial<SessionInfo>): SessionInfo {
  return {
    id: 'local:workspace:echo-agent/conv:local_user',
    team_id: 'alix',
    platform: 'local',
    scope: 'workspace',
    user_id: 'local_user',
    nickname: 'echo-agent · 对话',
    group_name: null,
    last_active: 1,
    last_message: '',
    ...over,
  } as SessionInfo;
}

function pointerDown(el: Element) {
  el.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
}

describe('会话弹层内选会话级模型（端到端）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sendCommand.mockClear();
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    state.instances = [];
    state.activities = {};
    state.sessionApiOverrides = {};
    state.api = {
      active_api: 'deepseek-self-1',
      model: 'deepseek-v4-flash',
      profiles: [
        { name: 'kimi', provider: 'moonshot', model: 'k3' },
        { name: 'uu-api', provider: 'anthropic', model: 'claude-opus-5-5' },
      ],
    } as never;
    state.sessions = [session({})];
  });

  it('点开下拉 → 选中 profile → 发出 SetSessionApi 且面板保持打开', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const open = ref(true);

    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            PanelPopover,
            {
              modelValue: open.value,
              anchor,
              'onUpdate:modelValue': (v: boolean) => { open.value = v; },
            },
            {
              default: () =>
                h(SessionSwitcher, {
                  activeTeamId: 'alix',
                  activeSessionId: 'local:workspace:echo-agent/conv:local_user',
                }),
            },
          );
      },
    });

    const wrapper = mount(Harness, { attachTo: document.body });
    // 真实时序：入口行按钮点击 → 弹层从关闭变打开（attach 外部点击监听）
    await nextTick();
    open.value = true;
    await wrapper.vm.$nextTick();
    await nextTick();

    // 1) 会话行右侧渲染了会话级 API 下拉（触发器是 wrapper 里的 div[role=combobox]）
    const trigger = document.querySelector('.sw-api .nm-select__wrapper > div');
    expect(trigger).toBeTruthy();

    // 2) 点开下拉 → 浮层出现在 body（teleport），选项含 profile 名
    pointerDown(trigger!);
    (trigger as HTMLElement).click();
    await nextTick();
    await nextTick();

    const dropdown = document.querySelector('.nm-select__dropdown');
    expect(dropdown).toBeTruthy();
    const options = Array.from(document.querySelectorAll('.nm-select__option'));
    const kimi = options.find((o) => o.textContent?.includes('kimi'));
    expect(kimi).toBeTruthy();

    // 3) 点选项：pointerdown 不能关闭面板，click 必须生效并发出命令
    pointerDown(kimi!);
    await nextTick();
    expect(open.value).toBe(true);

    (kimi as HTMLElement).click();
    await nextTick();

    expect(sendCommand).toHaveBeenCalledTimes(1);
    expect(sendCommand.mock.calls[0][0]).toEqual({
      SetSessionApi: {
        team_id: 'alix',
        session_id: 'local:workspace:echo-agent/conv:local_user',
        profile: 'kimi',
      },
    });
    expect(state.sessionApiOverrides['local:workspace:echo-agent/conv:local_user']).toBe('kimi');

    wrapper.unmount();
  });
});
