//! 设置视图 - 工具 / 模块工作台契约（2026-09-23 重排版）。
//!
//! 锁定的交互契约：
//! - 工具：默认按包分组、双行行卡 + hover 快速启停、搜索/状态 chips、
//!   详情分区（能力说明 / 被谁使用 / 所属包 / 参数表）；
//! - 模块：默认按来源分组（内部 / 外部），可切到门控语义 / kind / 平铺；
//!   多 Core 下按选定节点取列表（moduleCatalog），包规模徽标、
//!   受保护模块不给开关、详情四分区（带来什么 / 被谁使用 / 启停影响 / 技术信息）；
//! - 交叉跳转：模块成员 chip → 工具/技能分类并选中；工具「所属包」→ 模块分类。

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
  state.modules = [
    {
      id: 'echo-agent.tools.builtin',
      name: '内置工具集',
      version: '1',
      kind: 'tool',
      description: '内置工具',
      entry: '',
      author: '',
            builtin: true,
      package: 'echo-agent.tools.builtin',
      gating: 'persona',
    },
    {
      id: 'echo-agent.adapter.qq',
      name: 'QQ 实例',
      version: '1',
      kind: 'instance',
      description: 'QQ 平台',
      entry: '',
      author: '',
            builtin: true,
      package: 'echo-agent.adapter.qq',
      gating: 'persona',
    },
    {
      id: 'echo-agent.management.panel',
      name: '管理面',
      version: '1',
      kind: 'management',
      description: 'Panel 通道',
      entry: '',
      author: '',
            builtin: true,
      package: 'echo-agent.management.panel',
      gating: 'process',
    },
    {
      id: 'echo-agent.loop.single',
      name: '单会话循环',
      version: '1',
      kind: 'loop',
      description: '单会话',
      entry: '',
      author: '',
            builtin: true,
      package: 'echo-agent.loop.single',
      gating: 'process',
    },
    {
      id: 'echo-agent.provider.llm',
      name: 'LLM Provider',
      version: '1',
      kind: 'provider',
      description: 'provider',
      entry: '',
      author: '',
            builtin: true,
      package: 'echo-agent.provider.llm',
      gating: 'process',
    },
  ] as typeof state.modules;
  state.teams = [
    { id: 'alix', name: 'Alix', enabled: true, sessions: 0, enabled_modules: ['echo-agent.adapter.qq'] },
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
    // QQ 包模块改为禁用
    (state.modules as typeof state.modules)[1].state = 'failed';
    const wrapper = await openCategory('工具');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('send_group_msg'))!;
    await row.trigger('click');
    expect(wrapper.find('.skill-banner--warn').text()).toContain('QQ 实例包');
    // 列表行标记「包已禁用」
    expect(wrapper.findAll('.caps-mark--warn').length).toBeGreaterThan(0);
  });
});

describe('SettingsView 模块工作台', () => {
  beforeEach(() => {
    seed();
    vi.mocked(sendCommand).mockClear();
  });

  it('默认按来源分组（内部 / 外部）+ 副标题统计跟随分组维度', async () => {
    const wrapper = await openCategory('模块');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    // seed 里 5 个模块都是 builtin=true（旧 Core 缺省也按 true 兼容）
    expect(groups).toEqual(['内部模块']);
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 5 项');
    expect(subtitle).toContain('5 内部模块');
    // 按来源分组：内部模块一组，附来源提示（"随 Core 发布…"）
    const hints = wrapper.findAll('.caps-list-group__hint').map((h) => h.text());
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain('随 Core 发布');
  });

  it('行首显示短 id：剥掉 echo-agent. 前缀，name 紧随其后', async () => {
    const wrapper = await openCategory('模块');
    const rows = wrapper.findAll('.caps-list-item__id');
    expect(rows.length).toBeGreaterThan(0);

    // 前缀剥掉：列表宽 250px，全 id 会把 name 挤成省略号；而后半段才是
    // 区分度所在（`tools.builtin` / `management.panel` / `loop.single`）。
    const texts = rows.map((r) => r.text());
    expect(texts).toContain('tools.builtin');
    expect(texts).toContain('management.panel');
    expect(texts.some((t) => t.startsWith('echo-agent.'))).toBe(false);

    // 完整 id 进 title：想确认全名时 hover 得到，不必点进详情页。
    expect(rows[0].attributes('title')).toMatch(/^echo-agent\./);
  });

  it('非本仓命名的模块 id 原样显示（不按 echo-agent. 截断）', async () => {
    // 外部模块的 id 是装它的人定的——我们无权按自己的命名习惯截断。
    state.modules = [
      ...state.modules,
      {
        id: 'vendor.custom.module',
        name: '第三方',
        version: '1',
        kind: 'tool',
        description: '',
        entry: '',
        author: '',
        builtin: false,
        package: 'vendor.custom.module',
        gating: 'persona',
      },
    ];
    const wrapper = await openCategory('模块');
    const texts = wrapper.findAll('.caps-list-item__id').map((r) => r.text());
    expect(texts).toContain('vendor.custom.module');
  });

  it('外部模块分组：builtin=false 归到「外部模块」', async () => {
    state.modules = [
      ...state.modules,
      {
        id: 'example.external',
        name: '外部模块',
        version: '1',
        kind: 'tool',
        description: '运行期挂载',
        entry: '',
        author: '',
                builtin: false,
        package: 'example.external',
        gating: 'process',
      },
    ];
    const wrapper = await openCategory('模块');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['内部模块', '外部模块']);
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('6 项');
    expect(subtitle).toContain('1 外部模块');
    expect(subtitle).toContain('5 内部模块');
  });

  /**
   * 2026-10-18 报障（二次修正）：QQ 实例描述写着「独立进程」，Panel 却把它
   * 归到「内部模块」——用户据此质疑分类错了。
   *
   * 第一版修法保留了 `builtin` 判定（把它留在「内部模块」组，只加徽标），
   * 用户仍然不接受：对使用者而言「外部模块」= 不在 Core 进程内（独立 PID、
   * 独立生命周期、崩了不带走 Core）。现在 `moduleSource()` 按 `runtime`
   * 判定，QQ 实例直接落到「外部模块」组。
   */
  it('运行位置决定分组：runtime=subprocess → 外部模块（即使 builtin=true）', async () => {
    // QQ 实例：门控 manifest 编译在 Core 里（builtin=true），
    // 但实例实现由独立进程 echo-instance-qq 提供（runtime=subprocess）。
    state.modules = state.modules.map((p) =>
      p.id === 'echo-agent.adapter.qq' ? { ...p, runtime: 'subprocess' } : p,
    );
    const wrapper = await openCategory('模块');

    // 分组：外部模块组里出现 QQ 实例
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['内部模块', '外部模块']);
    const externalGroup = wrapper
      .findAll('.caps-list-group')
      .find((g) => g.find('.caps-list-group__name').text() === '外部模块')!;
    expect(externalGroup.text()).toContain('QQ 实例');
    expect(externalGroup.text()).not.toContain('单会话循环');

    // 副标题按运行位置统计
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 5 项');
    expect(subtitle).toContain('1 外部模块');
    expect(subtitle).toContain('4 内部模块');

    // 外部组 hint 说明「独立进程」语义（而非「第三方」）
    expect(externalGroup.find('.caps-list-group__hint').text()).toContain('独立进程');

    // 行内徽标：外部组内标「独立进程」，内部组不标
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    expect(qqRow.text()).toContain('独立进程');
    const innerRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('单会话循环'))!;
    expect(innerRow.text()).not.toContain('独立进程');
  });

  it('runtime=in_process 明确声明时留在「内部模块」组（不受 builtin 影响）', async () => {
    // 显式 in_process 覆盖任何来源推断
    state.modules = state.modules.map((p) =>
      p.id === 'echo-agent.adapter.qq'
        ? { ...p, builtin: false, runtime: 'in_process' }
        : p,
    );
    const wrapper = await openCategory('模块');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['内部模块']);
    expect(wrapper.find('.caps-toolbar-title .muted').text()).toContain('5 内部模块');
  });

  it('旧 Core 缺 runtime 字段：一律按进程内渲染（零变化）', async () => {
    // seed 里不带 runtime（旧 Core 契约）
    const wrapper = await openCategory('模块');
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
                source: { url: 'git@github.com:EchoLab-Auto/skill-echo-prodoc.git', rev: 'f727ad5' },
      } as never,
    ];
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.git-modal__progress')).toBeNull();
  });

  it('切到门控语义分组：恢复门控 → 通道 → 模式 → 其它 + 语义提示', async () => {
    const wrapper = await openCategory('模块');
    // 分组维度选择器：MODULE_GROUP_OPTIONS 的第二项（按门控语义）
    const segmented = wrapper.findComponent({ name: 'NeumorphismSegmented' });
    await segmented.vm.$emit('update:modelValue', 'semantic');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['包维度门控', '平台通道', '模式模块（互斥）', '其它']);
    // 语义提示行（门控/通道/模式各一条）
    expect(wrapper.findAll('.caps-list-group__hint').length).toBe(3);
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('1 包维度门控');
    expect(subtitle).toContain('1 模式模块');
  });

  it('行内：包规模徽标 / 受保护锁 / 模式标记；**没有启停开关**', async () => {
    const wrapper = await openCategory('模块');
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    // 包规模：1 工具 · 1 技能
    expect(qqRow.text()).toContain('1 工具 · 1 技能');
    const mgmtRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('管理面'))!;
    expect(mgmtRow.text()).toContain('受保护');
    const loopRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('单会话循环'))!;
    expect(loopRow.text()).toContain('模式');

    // 禁用动作已删除：任何模块行都没有启停开关，只有（受保护模块除外的）重启按钮。
    expect(wrapper.findAll('.caps-skill-item__quick input')).toHaveLength(0);
    expect(mgmtRow.find('.module-restart-btn').exists()).toBe(false);
    expect(qqRow.find('.module-restart-btn').exists()).toBe(true);
  });

  it('行内「重启」：已启用且不受保护的模块可发 RestartModule，不改启用状态', async () => {
    const wrapper = await openCategory('模块');
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    const btn = qqRow.find('.module-restart-btn');
    expect(btn.exists()).toBe(true);
    await btn.trigger('click');
    expect(vi.mocked(sendCommand).mock.calls.map((c) => c[0])).toContainEqual({
      RestartModule: { id: 'echo-agent.adapter.qq' },
    });
    // 受保护（管理面）不给重启按钮。
    const mgmtRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('管理面'))!;
    expect(mgmtRow.find('.module-restart-btn').exists()).toBe(false);
  });

  it('装配失败的模块不给行内重启按钮（没有可重载的实例）', async () => {
    state.modules = state.modules.map((p) =>
      p.id === 'echo-agent.adapter.qq' ? { ...p, state: 'failed' } : p,
    );
    const wrapper = await openCategory('模块');
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    expect(qqRow.find('.module-restart-btn').exists()).toBe(false);
  });

  it('装配失败：行内出「失败」徽标，详情出失败原因块（与主动禁用区分）', async () => {
    const reason = 'module echo-agent.adapter.qq mount failed: command not found';
    state.modules = state.modules.map((p) =>
      p.id === 'echo-agent.adapter.qq' ? { ...p, state: 'failed', error: reason } : p,
    );
    const wrapper = await openCategory('模块');
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    expect(qqRow.find('.caps-mark--err').exists()).toBe(true);
    expect(qqRow.find('.caps-mark--err').text()).toContain('失败');

    await qqRow.trigger('click');
    const banner = wrapper.find('.module-mount-error');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('装配失败');
    expect(banner.text()).toContain('command not found');
  });

  it('配置来源层：技术信息里显示 modules.toml 的哪一层；缺省说明未声明', async () => {
    state.modules = state.modules.map((p) =>
      p.id === 'echo-agent.adapter.qq' ? { ...p, config_origin: 'base.toml · layer 0' } : p,
    );
    const wrapper = await openCategory('模块');
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    await qqRow.trigger('click');
    // 技术信息默认折叠 → 展开
    const infoTitle = wrapper
      .findAll('.detail-section__title')
      .find((t) => t.text().includes('技术信息'))!;
    await infoTitle.trigger('click');
    const source = wrapper.find('.skill-source');
    expect(source.text()).toContain('配置来源');
    expect(source.text()).toContain('base.toml · layer 0');
  });

  it('来源维度：builtin=false 出「外部来源」徽标（与运行位置分组正交）', async () => {
    // 数据模块：manifest 来自模块目录（builtin=false）但实现在进程内。
    // 分组按运行位置 → 留在「内部模块」组；来源徽标要能看出它不随二进制发布。
    state.modules = [
      ...state.modules,
      {
        id: 'data.module',
        name: '目录数据模块',
        version: '1',
        kind: 'tool',
        description: '从 module.toml 发现',
        entry: '',
        author: '',
                builtin: false,
        runtime: 'in_process',
        package: 'data.module',
        gating: 'process',
      },
    ] as typeof state.modules;
    const wrapper = await openCategory('模块');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toContain('内部模块'); // 分组仍按运行位置
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('目录数据模块'))!;
    expect(row.text()).toContain('外部来源'); // 但来源可见

    await row.trigger('click');
    const infoTitle = wrapper
      .findAll('.detail-section__title')
      .find((t) => t.text().includes('技术信息'))!;
    await infoTitle.trigger('click');
    // 详情里同一维度也要能读到（builtin=false → 外部来源）。
    expect(wrapper.find('.skill-source').text()).toContain('外部来源');
  });

  it('内置模块的技术信息显示「随二进制发布」', async () => {
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    await row.trigger('click');
    const infoTitle = wrapper
      .findAll('.detail-section__title')
      .find((t) => t.text().includes('技术信息'))!;
    await infoTitle.trigger('click');
    const text = wrapper.find('.skill-source').text();
    expect(text).toContain('随二进制发布');
    // 内置模块不出「外部来源」徽标（不占视觉）。
    expect(row.text()).not.toContain('外部来源');
  });

  it('运行态：failed 出红色「失败」徽标，技术信息显示状态与重启次数', async () => {
    state.modules = [
      ...state.modules.map((p) =>
        p.id === 'echo-agent.adapter.qq'
          ? { ...p, state: 'failed', restarts: 3, generation: 9 }
          : p,
      ),
    ];
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    const badge = row.find('.caps-mark--err');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('失败');

    await row.trigger('click');
    const infoTitle = wrapper
      .findAll('.detail-section__title')
      .find((t) => t.text().includes('技术信息'))!;
    await infoTitle.trigger('click');
    const text = wrapper.find('.skill-source').text();
    expect(text).toContain('运行态');
    expect(text).toContain('失败');
    expect(text).toContain('已自动重启 3 次');
    expect(text).toContain('代际 9');
  });

  it('运行态 ready 不在行卡上喊（只有异常态才出徽标）', async () => {
    state.modules = [
      ...state.modules.map((p) =>
        p.id === 'echo-agent.adapter.qq' ? { ...p, state: 'ready', generation: 1 } : p,
      ),
    ];
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    expect(row.text()).not.toContain('运行中');
  });

  it('外部条目：影响文案说明它由 modules.toml 定义、只能重启不能卸载', async () => {
    state.modules = [
      ...state.modules,
      {
        id: 'example-ext',
        name: '示例外部模块',
        version: '1',
        kind: 'tool',
        description: 'modules.toml 的 stdio 条目',
        entry: 'example-ext',
        author: '',
                builtin: false,
        runtime: 'subprocess',
        package: 'example-ext',
        gating: 'process',
        state: 'ready',
      },
    ] as typeof state.modules;
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('示例外部模块'))!;
    await row.trigger('click');
    const impact = wrapper.find('.module-impact').text();
    expect(impact).toContain('modules.toml');
    expect(impact).toContain('只能重启');
  });

  it('技术信息：定义文件 / 启动命令 / 环境变量键名（排查「为什么不起来」）', async () => {
    state.modules = [
      ...state.modules,
      {
        id: 'example-ext',
        name: '示例外部模块',
        version: '1',
        kind: 'tool',
        description: 'modules.toml 的 stdio 条目',
        entry: 'example-ext',
        author: '',
                builtin: false,
        runtime: 'subprocess',
        package: 'example-ext',
        gating: 'process',
        state: 'failed',
        error: 'spawn failed: No such file or directory',
        source_path: '/home/me/.config/echo-agent-core/modules.toml',
        command: '/opt/modules/example',
        args: ['--mode', 'fast'],
        env_keys: ['EXAMPLE_TOKEN', 'EXAMPLE_HOME'],
      },
    ] as typeof state.modules;
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('示例外部模块'))!;
    await row.trigger('click');
    const infoTitle = wrapper
      .findAll('.detail-section__title')
      .find((t) => t.text().includes('技术信息'))!;
    await infoTitle.trigger('click');
    const text = wrapper.find('.skill-source').text();
    expect(text).toContain('定义文件');
    expect(text).toContain('/home/me/.config/echo-agent-core/modules.toml');
    expect(text).toContain('启动命令');
    // 命令与参数拼在一起，便于对照报错里的路径。
    expect(text).toContain('/opt/modules/example --mode fast');
    expect(text).toContain('环境变量');
    expect(text).toContain('EXAMPLE_TOKEN');
    // 值不下发：断言页面里没有形如 KEY=VALUE 的拼接。
    expect(text).not.toContain('EXAMPLE_TOKEN=');
  });

  it('内置模块不显示定义文件/启动命令（没有外部定义）', async () => {
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('单会话循环'))!;
    await row.trigger('click');
    const infoTitle = wrapper
      .findAll('.detail-section__title')
      .find((t) => t.text().includes('技术信息'))!;
    await infoTitle.trigger('click');
    const text = wrapper.find('.skill-source').text();
    expect(text).not.toContain('定义文件');
    expect(text).not.toContain('启动命令');
  });

  it('模块详情：四分区 + 成员 chips + 启停影响文案', async () => {
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    await row.trigger('click');
    const titles = wrapper.findAll('.detail-section__title').map((t) => t.text());
    expect(titles.some((t) => t.includes('这个模块带来什么'))).toBe(true);
    expect(titles.some((t) => t.includes('被谁使用'))).toBe(true);
    expect(titles.some((t) => t.includes('启停影响'))).toBe(true);
    expect(titles.some((t) => t.includes('技术信息'))).toBe(true);
    // 成员 chips：工具 + 技能
    const chips = wrapper.findAll('.module-member-chip').map((c) => c.text());
    expect(chips).toContain('send_group_msg');
    expect(chips).toContain('qq-transport');
    // 通道类影响文案
    expect(wrapper.find('.module-impact').text()).toContain('平台通道');
    // 使用面：Alix 在白名单 → 已启用
    expect(wrapper.find('.skill-usage').text()).toContain('Alix');
    expect(wrapper.find('.skill-usage').text()).toContain('已启用');
  });

  it('模块详情：受保护模块显示警示影响文案且不给开关', async () => {
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('管理面'))!;
    await row.trigger('click');
    const impact = wrapper.find('.module-impact');
    expect(impact.classes()).toContain('module-impact--warn');
    expect(impact.text()).toContain('自锁');
    // 详情头部无启停开关
    expect(wrapper.find('.detail-actions input').exists()).toBe(false);
  });

  it('交叉跳转：模块成员 chip → 工具/技能分类并选中；工具「所属包」→ 模块', async () => {
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    await row.trigger('click');
    // 点工具 chip → 工具分类并选中
    const toolChip = wrapper.findAll('.module-member-chip').find((c) => c.text() === 'send_group_msg')!;
    await toolChip.trigger('click');
    expect(wrapper.find('.caps-nav-item--active').text()).toContain('工具');
    expect(wrapper.find('.skill-detail h3').text()).toBe('send_group_msg');
    // 工具详情的「所属包」按钮 → 模块分类并选中
    const jumpBtn = wrapper
      .findAll('.skill-source__actions .nm-button')
      .find((b) => b.text().includes('在「模块」中查看'))!;
    await jumpBtn.trigger('click');
    expect(wrapper.find('.caps-nav-item--active').text()).toContain('模块');
    expect(wrapper.find('.skill-detail h3').text()).toBe('QQ 实例');
  });

  it('技术信息折叠：默认收起，点击展开显示 ID/Package/Entry', async () => {
    const wrapper = await openCategory('模块');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 实例'))!;
    await row.trigger('click');
    expect(wrapper.find('.module-info__head').text()).toContain('技术信息');
    expect(wrapper.find('.skill-source').exists()).toBe(false);
    await wrapper.find('.module-info__head').trigger('click');
    expect(wrapper.find('.skill-source').text()).toContain('echo-agent.adapter.qq');
    expect(wrapper.find('.skill-source').text()).toContain('instance');
  });
});

describe('多 Core 模块归档（modulesByCore）', () => {
  beforeEach(() => {
    seed();
    vi.mocked(sendCommand).mockClear();
    // 清掉其它用例可能残留的归档
    state.modulesByCore = {};
    state.upstreams = [];
  });

  it('按 core 归档取数：选定节点后列表只显示该节点的模块', async () => {
    state.modulesByCore = {
      core: [...state.modules],
      'node-b': [
        {
          id: 'node-b.module',
          name: 'B 节点模块',
          version: '1',
          kind: 'tool',
          description: '',
          entry: '',
          author: '',
                    builtin: true,
          package: 'node-b.module',
          core: 'node-b',
        },
      ],
    };
    state.upstreams = [
      { name: 'core', url: 'ws://a', connectivity: 'online' },
      { name: 'node-b', url: 'ws://b', connectivity: 'online' },
    ] as never;

    const wrapper = await openCategory('模块');
    // 默认（无 activeRegion）→ 唯一/首个来源不确定，但列表必须是归档里的某一份
    const names = rowNames(wrapper);
    expect(names.length).toBeGreaterThan(0);

    // 显式切到 node-b → 只剩 B 的模块
    const select = wrapper.findComponent({ name: 'NeumorphismSelect' });
    await select.vm.$emit('update:modelValue', 'node-b');
    expect(rowNames(wrapper)).toEqual(['B 节点模块']);
    // 统计跟随列表（不串显）
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 1 项');
    // 切换节点会**定向**请求该 core 的模块列表（targetCore = 选定节点）
    expect(vi.mocked(sendPending)).toHaveBeenCalledWith(
      'RequestModulesList',
      'settings:modules',
      'node-b',
    );
  });

  it('未选节点且只有一个来源：回退到该来源（单上游无壳场景）', async () => {
    // 单上游不加信封 → 事件 core 为 null → 归档键是空串
    state.modulesByCore = { '': [...state.modules] };
    const wrapper = await openCategory('模块');
    expect(rowNames(wrapper).length).toBe(5);
  });
});
