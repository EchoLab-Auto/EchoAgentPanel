//! 设置视图 - 工具 / 插件工作台契约（2026-09-23 重排版）。
//!
//! 锁定的交互契约：
//! - 工具：默认按包分组、双行行卡 + hover 快速启停、搜索/状态 chips、
//!   详情分区（能力说明 / 被谁使用 / 所属包 / 参数表）；
//! - 插件：默认按来源分组（内部 / 外部），可切到门控语义 / kind / 平铺；
//!   多 Core 下按选定节点取列表（pluginCatalog），包规模徽标、
//!   受保护插件不给开关、详情四分区（带来什么 / 被谁使用 / 启停影响 / 技术信息）；
//! - 交叉跳转：插件成员 chip → 工具/技能分类并选中；工具「所属包」→ 插件分类。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    // sendPending = 登记加载跟踪 + 发命令（生产语义）：测试等价转发，
    // 调用记录并入 sendCommand 的 mock，请求类断言无需两处查。
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

import SettingsView from '../SettingsView.vue';
import { state } from '../../store';
import { sendCommand, sendPending } from '../../connection';

function seed() {
  state.tools = [
    {
      name: 'bash',
      description: 'Run a shell command',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: '命令' } },
        required: ['command'],
      },
      category: 'builtin',
      enabled: true,
      package: 'echo-agent.tools.builtin',
    },
    {
      name: 'send_group_msg',
      description: 'Send a text message to a QQ group',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'integer', description: 'QQ group ID' },
          content: { type: 'string', description: 'Message content' },
        },
        required: ['group_id', 'content'],
      },
      category: 'builtin',
      enabled: false,
      package: 'echo-agent.adapter.qq',
    },
    {
      name: 'standalone_tool',
      description: '独立工具',
      parameters: null,
      category: '',
      enabled: true,
    },
  ] as typeof state.tools;
  state.skills = [
    {
      name: 'qq-transport',
      description: 'd',
      keywords: [],
      always: false,
      enabled: true,
      category: '',
      package: 'echo-agent.adapter.qq',
      content: '',
    },
  ] as typeof state.skills;
  state.plugins = [
    {
      id: 'echo-agent.tools.builtin',
      name: '内置工具集',
      version: '1',
      kind: 'tool',
      description: '内置工具',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.tools.builtin',
    },
    {
      id: 'echo-agent.adapter.qq',
      name: 'QQ 实例',
      version: '1',
      kind: 'instance',
      description: 'QQ 平台',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.adapter.qq',
    },
    {
      id: 'echo-agent.management.panel',
      name: '管理面',
      version: '1',
      kind: 'management',
      description: 'Panel 通道',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.management.panel',
    },
    {
      id: 'echo-agent.loop.single',
      name: '单会话循环',
      version: '1',
      kind: 'loop',
      description: '单会话',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.loop.single',
    },
    {
      id: 'echo-agent.provider.llm',
      name: 'LLM Provider',
      version: '1',
      kind: 'provider',
      description: 'provider',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.provider.llm',
    },
  ] as typeof state.plugins;
  state.teams = [
    { id: 'alix', name: 'Alix', enabled: true, sessions: 0, enabled_plugins: ['echo-agent.adapter.qq'] },
  ] as typeof state.teams;
}

async function openCategory(label: string) {
  const wrapper = mount(SettingsView);
  const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes(label));
  expect(nav).toBeTruthy();
  await nav!.trigger('click');
  return wrapper;
}

function rowNames(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('.caps-skill-item').map((r) => r.find('.caps-list-item__name').text());
}

describe('SettingsView 工具工作台', () => {
  beforeEach(() => {
    seed();
    vi.mocked(sendCommand).mockClear();
  });

  it('默认按包分组 + 副标题统计 + 状态 chips', async () => {
    const wrapper = await openCategory('工具');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['QQ 实例包', '内置工具集', '独立工具']);
    // 独立工具排最后
    expect(groups[groups.length - 1]).toBe('独立工具');
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 3 项');
    // 2 个包（内置工具集 + QQ 实例包），独立工具无包归属不计入
    expect(subtitle).toContain('2 个包');
    expect(subtitle).toContain('1 已禁用');
    const chips = wrapper.findAll('.caps-chip').map((c) => c.text());
    expect(chips.length).toBe(3);
    expect(chips[0]).toContain('全部');
    expect(chips[2]).toContain('1');
  });

  it('搜索 + 状态筛选 + 行内快速启停（ToggleTool，不改变选中）', async () => {
    const wrapper = await openCategory('工具');
    await wrapper.find('.caps-filters__search input').setValue('group');
    expect(rowNames(wrapper)).toEqual(['send_group_msg']);
    await wrapper.find('.caps-filters__search input').setValue('');
    const chip = (label: string) => wrapper.findAll('.caps-chip').find((c) => c.text().includes(label))!;
    await chip('已禁用').trigger('click');
    expect(rowNames(wrapper)).toEqual(['send_group_msg']);
    await chip('全部').trigger('click');
    // hover 快速开关 → ToggleTool
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('bash'))!;
    expect(row.find('.caps-skill-item__desc').text()).toContain('Run a shell command');
    const input = row.find('.caps-skill-item__quick input');
    expect(input.exists()).toBe(true);
    await input.setValue(false);
    expect(vi.mocked(sendCommand).mock.calls.map((c) => c[0])).toContainEqual({
      ToggleTool: { name: 'bash', enabled: false },
    });
    expect(wrapper.find('.caps-detail').exists()).toBe(false);
  });

  it('工具详情：分区 + 参数表（必填标记）+ 所属包跳转入口', async () => {
    const wrapper = await openCategory('工具');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('send_group_msg'))!;
    await row.trigger('click');
    const titles = wrapper.findAll('.detail-section__title').map((t) => t.text());
    expect(titles.some((t) => t.includes('能力说明'))).toBe(true);
    expect(titles.some((t) => t.includes('被谁使用'))).toBe(true);
    expect(titles.some((t) => t.includes('所属包'))).toBe(true);
    expect(titles.some((t) => t.includes('参数 Schema'))).toBe(true);
    // 参数表：group_id / content 均必填
    expect(wrapper.find('.nm-table').exists()).toBe(true);
    const text = wrapper.find('.detail-section--grow').text();
    expect(text).toContain('group_id');
    expect(text).toContain('必填');
    // 所属包 + 跳转按钮
    expect(wrapper.find('.skill-source').text()).toContain('echo-agent.adapter.qq');
    expect(wrapper.find('.skill-source__actions').exists()).toBe(true);
  });

  it('工具详情：包被禁用时显示警示横幅', async () => {
    // QQ 包插件改为禁用
    (state.plugins as typeof state.plugins)[1].enabled = false;
    const wrapper = await openCategory('工具');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('send_group_msg'))!;
    await row.trigger('click');
    expect(wrapper.find('.skill-banner--warn').text()).toContain('QQ 实例包');
    // 列表行标记「包已禁用」
    expect(wrapper.findAll('.caps-mark--warn').length).toBeGreaterThan(0);
  });
});

describe('SettingsView 插件工作台', () => {
  beforeEach(() => {
    seed();
    vi.mocked(sendCommand).mockClear();
  });

  it('默认按来源分组（内部 / 外部）+ 副标题统计跟随分组维度', async () => {
    const wrapper = await openCategory('插件');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    // seed 里 5 个插件都是 builtin=true（旧 Core 缺省也按 true 兼容）
    expect(groups).toEqual(['内部插件']);
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 5 项');
    expect(subtitle).toContain('5 内部插件');
    // 按来源分组：内部插件一组，附来源提示（"随 Core 发布…"）
    const hints = wrapper.findAll('.caps-list-group__hint').map((h) => h.text());
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain('随 Core 发布');
  });

  it('外部插件分组：builtin=false 归到「外部插件」', async () => {
    state.plugins = [
      ...state.plugins,
      {
        id: 'example.external',
        name: '外部插件',
        version: '1',
        kind: 'tool',
        description: '运行期挂载',
        entry: '',
        author: '',
        enabled: true,
        builtin: false,
        package: 'example.external',
      },
    ];
    const wrapper = await openCategory('插件');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['内部插件', '外部插件']);
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('6 项');
    expect(subtitle).toContain('1 外部插件');
    expect(subtitle).toContain('5 内部插件');
  });

  /**
   * 2026-10-18 报障（二次修正）：QQ 实例描述写着「独立进程」，Panel 却把它
   * 归到「内部插件」——用户据此质疑分类错了。
   *
   * 第一版修法保留了 `builtin` 判定（把它留在「内部插件」组，只加徽标），
   * 用户仍然不接受：对使用者而言「外部插件」= 不在 Core 进程内（独立 PID、
   * 独立生命周期、崩了不带走 Core）。现在 `pluginSource()` 按 `runtime`
   * 判定，QQ 实例直接落到「外部插件」组。
   */
  it('运行位置决定分组：runtime=subprocess → 外部插件（即使 builtin=true）', async () => {
    // QQ 实例：门控 manifest 编译在 Core 里（builtin=true），
    // 但实例实现由独立进程 echo-instance-qq 提供（runtime=subprocess）。
    state.plugins = state.plugins.map((p) =>
      p.id === 'echo-agent.adapter.qq' ? { ...p, runtime: 'subprocess' } : p,
    );
    const wrapper = await openCategory('插件');

    // 分组：外部插件组里出现 QQ 实例
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['内部插件', '外部插件']);
    const externalGroup = wrapper
      .findAll('.caps-list-group')
      .find((g) => g.find('.caps-list-group__name').text() === '外部插件')!;
    expect(externalGroup.text()).toContain('QQ 实例');
    expect(externalGroup.text()).not.toContain('单会话循环');

    // 副标题按运行位置统计
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 5 项');
    expect(subtitle).toContain('1 外部插件');
    expect(subtitle).toContain('4 内部插件');

    // 外部组 hint 说明「独立进程」语义（而非「第三方」）
    expect(externalGroup.find('.caps-list-group__hint').text()).toContain('独立进程');

    // 行内徽标：外部组内标「独立进程」，内部组不标
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    expect(qqRow.text()).toContain('独立进程');
    const innerRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('单会话循环'))!;
    expect(innerRow.text()).not.toContain('独立进程');
  });

  it('runtime=in_process 明确声明时留在「内部插件」组（不受 builtin 影响）', async () => {
    // 显式 in_process 覆盖任何来源推断
    state.plugins = state.plugins.map((p) =>
      p.id === 'echo-agent.adapter.qq'
        ? { ...p, builtin: false, runtime: 'in_process' }
        : p,
    );
    const wrapper = await openCategory('插件');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['内部插件']);
    expect(wrapper.find('.caps-toolbar-title .muted').text()).toContain('5 内部插件');
  });

  it('旧 Core 缺 runtime 字段：一律按进程内渲染（零变化）', async () => {
    // seed 里不带 runtime（旧 Core 契约）
    const wrapper = await openCategory('插件');
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).not.toContain('独立进程');
    expect(wrapper.text()).not.toContain('独立进程');
  });

  /**
   * Git 安装：克隆是分钟级操作。旧实现点「安装」立刻关闭弹层，接着是
   * **最长两分钟的零反馈**（2026-10-18 实查：HTTPS 不可达时正是如此，
   * 用户以为按钮没生效）。现在弹层保持打开并显示已等待秒数。
   */
  it('Git 安装：发命令后弹层保持打开并显示进度，技能列表刷新后才关闭', async () => {
    // 弹层走 <teleport to="body">：内容在 wrapper 之外，用原生 DOM 断言。
    const wrapper = await openCategory('技能');
    const gitBtn = wrapper
      .findAll('.caps-toolbar-actions button')
      .find((b) => b.text().includes('Git 安装'))!;
    expect(gitBtn).toBeTruthy();
    await gitBtn.trigger('click');
    await wrapper.vm.$nextTick();

    const urlInput = document.body.querySelector<HTMLInputElement>('.git-modal input')!;
    expect(urlInput).toBeTruthy();
    urlInput.value = 'git@github.com:EchoLab-Auto/skill-echo-prodoc.git';
    urlInput.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();

    const installBtn = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.git-modal__actions button'),
    ).find((b) => b.textContent?.includes('安装'))!;
    expect(installBtn).toBeTruthy();
    installBtn.click();
    await wrapper.vm.$nextTick();

    // 命令已发出
    expect(vi.mocked(sendCommand)).toHaveBeenCalledWith({
      InstallSkillFromGit: {
        url: 'git@github.com:EchoLab-Auto/skill-echo-prodoc.git',
        name: null,
        branch: null,
      },
    });

    // 弹层仍然打开：有进度条，按钮变「安装中…」且禁用（旧实现此刻已关窗）
    const progress = document.body.querySelector('.git-modal__progress');
    expect(progress).toBeTruthy();
    expect(progress!.textContent).toContain('正在克隆');
    const busyBtn = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.git-modal__actions button'),
    ).find((b) => b.textContent?.includes('安装中'))!;
    expect(busyBtn.disabled).toBe(true);

    // 技能列表刷新（Core 装完推 SkillsList）→ 进度消失（弹层关闭）
    state.skills = [
      ...state.skills,
      {
        name: 'prodoc-format',
        description: 'ProDoc 规范',
        keywords: [],
        category: '',
        package: '',
        content: '',
        enabled: true,
        source: { url: 'git@github.com:EchoLab-Auto/skill-echo-prodoc.git', rev: 'f727ad5' },
      } as never,
    ];
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.git-modal__progress')).toBeNull();
  });

  it('切到门控语义分组：恢复门控 → 通道 → 模式 → 其它 + 语义提示', async () => {
    const wrapper = await openCategory('插件');
    // 分组维度选择器：PLUGIN_GROUP_OPTIONS 的第二项（按门控语义）
    const segmented = wrapper.findComponent({ name: 'NeumorphismSegmented' });
    await segmented.vm.$emit('update:modelValue', 'semantic');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['包维度门控', '平台通道', '模式插件（互斥）', '其它']);
    // 语义提示行（门控/通道/模式各一条）
    expect(wrapper.findAll('.caps-list-group__hint').length).toBe(3);
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('1 包维度门控');
    expect(subtitle).toContain('1 模式插件');
  });

  it('行内：包规模徽标 / 受保护锁 / 模式标记；受保护项无开关', async () => {
    const wrapper = await openCategory('插件');
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    // 包规模：1 工具 · 1 技能
    expect(qqRow.text()).toContain('1 工具 · 1 技能');
    const mgmtRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('管理面'))!;
    expect(mgmtRow.text()).toContain('受保护');
    expect(mgmtRow.find('.caps-skill-item__quick input').exists()).toBe(false);
    const loopRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('单会话循环'))!;
    expect(loopRow.text()).toContain('模式');
    // 普通插件有开关 → TogglePlugin
    const input = qqRow.find('.caps-skill-item__quick input');
    await input.setValue(false);
    expect(vi.mocked(sendCommand).mock.calls.map((c) => c[0])).toContainEqual({
      TogglePlugin: { id: 'echo-agent.adapter.qq', enabled: false },
    });
  });

  it('插件详情：四分区 + 成员 chips + 启停影响文案', async () => {
    const wrapper = await openCategory('插件');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    await row.trigger('click');
    const titles = wrapper.findAll('.detail-section__title').map((t) => t.text());
    expect(titles.some((t) => t.includes('这个插件带来什么'))).toBe(true);
    expect(titles.some((t) => t.includes('被谁使用'))).toBe(true);
    expect(titles.some((t) => t.includes('启停影响'))).toBe(true);
    expect(titles.some((t) => t.includes('技术信息'))).toBe(true);
    // 成员 chips：工具 + 技能
    const chips = wrapper.findAll('.plugin-member-chip').map((c) => c.text());
    expect(chips).toContain('send_group_msg');
    expect(chips).toContain('qq-transport');
    // 通道类影响文案
    expect(wrapper.find('.plugin-impact').text()).toContain('平台通道');
    // 使用面：Alix 在白名单 → 已启用
    expect(wrapper.find('.skill-usage').text()).toContain('Alix');
    expect(wrapper.find('.skill-usage').text()).toContain('已启用');
  });

  it('插件详情：受保护插件显示警示影响文案且不给开关', async () => {
    const wrapper = await openCategory('插件');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('管理面'))!;
    await row.trigger('click');
    const impact = wrapper.find('.plugin-impact');
    expect(impact.classes()).toContain('plugin-impact--warn');
    expect(impact.text()).toContain('自锁');
    // 详情头部无启停开关
    expect(wrapper.find('.detail-actions input').exists()).toBe(false);
  });

  it('交叉跳转：插件成员 chip → 工具/技能分类并选中；工具「所属包」→ 插件', async () => {
    const wrapper = await openCategory('插件');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    await row.trigger('click');
    // 点工具 chip → 工具分类并选中
    const toolChip = wrapper.findAll('.plugin-member-chip').find((c) => c.text() === 'send_group_msg')!;
    await toolChip.trigger('click');
    expect(wrapper.find('.caps-nav-item--active').text()).toContain('工具');
    expect(wrapper.find('.skill-detail h3').text()).toBe('send_group_msg');
    // 工具详情的「所属包」按钮 → 插件分类并选中
    const jumpBtn = wrapper
      .findAll('.skill-source__actions .nm-button')
      .find((b) => b.text().includes('在「插件」中查看'))!;
    await jumpBtn.trigger('click');
    expect(wrapper.find('.caps-nav-item--active').text()).toContain('插件');
    expect(wrapper.find('.skill-detail h3').text()).toBe('QQ 实例');
  });

  it('技术信息折叠：默认收起，点击展开显示 ID/Package/Entry', async () => {
    const wrapper = await openCategory('插件');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    await row.trigger('click');
    expect(wrapper.find('.plugin-info__head').text()).toContain('技术信息');
    expect(wrapper.find('.skill-source').exists()).toBe(false);
    await wrapper.find('.plugin-info__head').trigger('click');
    expect(wrapper.find('.skill-source').text()).toContain('echo-agent.adapter.qq');
    expect(wrapper.find('.skill-source').text()).toContain('instance');
  });
});

describe('多 Core 插件归档（pluginsByCore）', () => {
  beforeEach(() => {
    seed();
    vi.mocked(sendCommand).mockClear();
    // 清掉其它用例可能残留的归档
    state.pluginsByCore = {};
    state.upstreams = [];
  });

  it('按 core 归档取数：选定节点后列表只显示该节点的插件', async () => {
    state.pluginsByCore = {
      core: [...state.plugins],
      'node-b': [
        {
          id: 'node-b.plugin',
          name: 'B 节点插件',
          version: '1',
          kind: 'tool',
          description: '',
          entry: '',
          author: '',
          enabled: true,
          builtin: true,
          package: 'node-b.plugin',
          core: 'node-b',
        },
      ],
    };
    state.upstreams = [
      { name: 'core', url: 'ws://a', connectivity: 'online' },
      { name: 'node-b', url: 'ws://b', connectivity: 'online' },
    ] as never;

    const wrapper = await openCategory('插件');
    // 默认（无 activeRegion）→ 唯一/首个来源不确定，但列表必须是归档里的某一份
    const names = rowNames(wrapper);
    expect(names.length).toBeGreaterThan(0);

    // 显式切到 node-b → 只剩 B 的插件
    const select = wrapper.findComponent({ name: 'NeumorphismSelect' });
    await select.vm.$emit('update:modelValue', 'node-b');
    expect(rowNames(wrapper)).toEqual(['B 节点插件']);
    // 统计跟随列表（不串显）
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 1 项');
    // 切换节点会**定向**请求该 core 的插件列表（targetCore = 选定节点）
    expect(vi.mocked(sendPending)).toHaveBeenCalledWith(
      'RequestPluginsList',
      'settings:plugins',
      'node-b',
    );
  });

  it('未选节点且只有一个来源：回退到该来源（单上游无壳场景）', async () => {
    // 单上游不加信封 → 事件 core 为 null → 归档键是空串
    state.pluginsByCore = { '': [...state.plugins] };
    const wrapper = await openCategory('插件');
    expect(rowNames(wrapper).length).toBe(5);
  });
});
