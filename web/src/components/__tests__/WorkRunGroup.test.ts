//! WorkRunGroup 契约测试：工具与思考统一的小圆角矩形 chip 行（折叠态）
//! 与详情卡（展开态）、自动开合策略。

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import WorkRunGroup, {
  type ToolWorkItem,
  type ReasoningWorkItem,
  type SubagentWorkItem,
} from '../WorkRunGroup.vue';

const here = dirname(fileURLToPath(import.meta.url));

function tool(over: Partial<ToolWorkItem> = {}): ToolWorkItem {
  return {
    kind: 'tool',
    key: 'k1',
    name: 'bash',
    input: '{"command":"ls"}',
    output: 'ok',
    status: 'succeeded',
    ...over,
  };
}

function reasoning(over: Partial<ReasoningWorkItem> = {}): ReasoningWorkItem {
  return {
    kind: 'reasoning',
    key: 'r1',
    text: '一段思考内容',
    animate: false,
    ...over,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('WorkRunGroup', () => {
  it('通用排布：工具与思考 chip 同排；不同工具分派不同 SVG', () => {
    const wrapper = mount(WorkRunGroup, {
      props: {
        items: [
          tool({ key: 'a', name: 'bash' }),
          reasoning({ key: 'r' }),
          tool({ key: 'b', name: 'read_file' }),
        ],
      },
    });
    const chips = wrapper.findAll('.work-run-group__chip');
    expect(chips.length).toBe(3);
    expect(chips[0].classes()).toContain('work-run-group__chip--tool');
    expect(chips[1].classes()).toContain('work-run-group__chip--reasoning');
    expect(chips[2].classes()).toContain('work-run-group__chip--tool');
    // 不同工具分派不同 SVG；思考 chip 也是 SVG 图标（双闪星）
    const svgs = [chips[0], chips[2]].map((c) => c.find('svg').html());
    expect(new Set(svgs).size).toBe(2);
    expect(chips[1].find('svg').exists()).toBe(true);
    // 全静止 → 折叠为 chip 行（无详情卡）
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
  });

  it('工具运行中默认折叠且带运行指示；点击 chip 浮现内容卡片', async () => {
    const wrapper = mount(WorkRunGroup, {
      props: {
        items: [
          tool({ key: 'a', name: 'bash', status: 'succeeded' }),
          tool({ key: 'b', name: 'bash', status: 'running', output: null }),
        ],
      },
    });
    // 运行中 → 默认折叠；运行指示为工具专属 SVG 动画（loading 类），无状态点环
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
    expect(wrapper.findAll('[class*="tool-icon--anim-"]').length).toBe(1);
    expect(wrapper.findAll('.work-run-group__dot').length).toBe(0);

    // 点击第二个 chip → 展开其详情
    await wrapper.findAll('.work-run-group__chip')[1].trigger('click');
    const detail = wrapper.find('.work-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('bash');
    expect(detail.text()).toContain('运行中');
  });

  it('label：悬停提示与展开详情头部显示任务摘要（spawn_subagent）', async () => {
    const wrapper = mount(WorkRunGroup, {
      props: {
        items: [
          tool({
            key: 's1',
            name: 'spawn_subagent',
            label: '审计 Panel 文档',
            input: '{"task":"审计 Panel 文档"}',
            output: '子任务已受理',
            status: 'succeeded',
          }),
        ],
      },
    });
    // 悬停提示（title）= label + 状态
    const chip = wrapper.find('.work-run-group__chip');
    expect(chip.attributes('title')).toContain('审计 Panel 文档');
    expect(chip.attributes('title')).toContain('成功');
    // 展开详情头部同样显示 label 而非工具名
    await chip.trigger('click');
    const name = wrapper.find('.work-run-group__detail-name');
    expect(name.text()).toBe('审计 Panel 文档');
  });

  it('全部结束但存在失败 → 自动展开首个失败项', () => {
    const wrapper = mount(WorkRunGroup, {
      props: {
        items: [
          tool({ key: 'a', status: 'succeeded' }),
          tool({ key: 'b', name: 'read_file', status: 'failed', output: 'error: boom' }),
        ],
      },
    });
    const detail = wrapper.find('.work-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('read_file');
    expect(detail.text()).toContain('error: boom');
    // 失败 chip 带红色标记
    expect(wrapper.findAll('.work-run-group__chip--failed').length).toBe(1);
  });

  it('耗时：毫秒级精度（<1s 显示 ms，秒级 3 位小数），运行中角标实时计时', async () => {
    const started = Date.now() - 4200;
    const wrapper = mount(WorkRunGroup, {
      props: {
        items: [
          tool({ key: 'a', name: 'bash', status: 'succeeded', elapsedMs: 39 }),
          tool({ key: 'b', name: 'bash', status: 'succeeded', elapsedMs: 12345 }),
          tool({ key: 'c', name: 'bash', status: 'succeeded', elapsedMs: 90500 }),
          tool({ key: 'd', name: 'bash', status: 'running', output: null, startedAtMs: started }),
        ],
      },
    });
    // 运行中：chip 右下角实时角标（仅 1 个；已完成项不显示）
    const badges = wrapper.findAll('.work-run-group__badge');
    expect(badges.length).toBe(1);
    expect(badges[0].text()).toMatch(/^\d+(\.\d+)?(ms|s)$/);

    // 毫秒段：39ms（旧格式会缩成 0.0s）
    await wrapper.findAll('.work-run-group__chip')[0].trigger('click');
    expect(wrapper.find('.work-run-group__detail').text()).toContain('耗时 39ms');

    // 秒级：3 位小数 = 毫秒精度
    await wrapper.findAll('.work-run-group__chip')[1].trigger('click');
    expect(wrapper.find('.work-run-group__detail').text()).toContain('耗时 12.345s');

    // 分钟段：Xm SS.mmm s
    await wrapper.findAll('.work-run-group__chip')[2].trigger('click');
    expect(wrapper.find('.work-run-group__detail').text()).toContain('耗时 1m 30.500s');

    // 运行项详情头显示「运行中 X」实时文案
    await wrapper.findAll('.work-run-group__chip')[3].trigger('click');
    expect(wrapper.find('.work-run-group__detail').text()).toContain('运行中');

    wrapper.unmount();
  });

  it('思考：点击 chip 展开正文（历史回放全量显示），再点收起', async () => {
    const text = '这是一段历史思考'.repeat(5);
    const wrapper = mount(WorkRunGroup, {
      props: { items: [reasoning({ key: 'r1', text })] },
    });
    // 静止态：折叠为 chip（无详情卡）
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
    await wrapper.find('.work-run-group__chip--reasoning').trigger('click');
    const detail = wrapper.find('.work-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('思考');
    expect(detail.find('.reasoning-text__content').text()).toBe(text);
    // 字数元信息（40 字）
    expect(detail.text()).toContain(`${text.length} 字`);
    await wrapper.find('.work-run-group__chip--reasoning').trigger('click');
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
  });

  it('思考真流式：自动展开、全量跟随并钉底、流结束自动收起', async () => {
    const wrapper = mount(WorkRunGroup, {
      props: { items: [reasoning({ key: 'r1', streaming: true, text: '第一段' })] },
    });
    await nextTick();
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(true);

    const el = wrapper.find('.reasoning-text').element as HTMLElement;
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => 600 });
    await wrapper.setProps({
      items: [reasoning({ key: 'r1', streaming: true, text: '第一段，继续第二段' })],
    });
    await nextTick();
    await nextTick();
    expect(wrapper.find('.reasoning-text__content').text()).toBe('第一段，继续第二段');
    expect(el.scrollTop).toBe(600);

    // 流结束 → 回到静止 chip（自动收起）
    await wrapper.setProps({
      items: [reasoning({ key: 'r1', streaming: false, text: '第一段，继续第二段' })],
    });
    await nextTick();
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
  });

  it('思考打字机：播放中自动展开、播完自动收起；重开全量显示不重播', async () => {
    vi.useFakeTimers();
    const text = '实时思考'.repeat(300);
    const wrapper = mount(WorkRunGroup, {
      props: { items: [reasoning({ key: 'r1', text, animate: true })] },
    });
    await nextTick();
    // 自动展开 + 打字中
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(true);
    expect(wrapper.find('.reasoning-text--typing').exists()).toBe(true);
    expect(wrapper.find('.work-run-group__detail-status').text()).toContain('正在推演');

    // 播完：自动收起（回到静止 chip）
    await vi.advanceTimersByTimeAsync(8000);
    await nextTick();
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);

    // 手动重开：全量显示、不重播打字机
    await wrapper.find('.work-run-group__chip--reasoning').trigger('click');
    expect(wrapper.find('.reasoning-text--typing').exists()).toBe(false);
    expect(wrapper.find('.reasoning-text__content').text()).toBe(text);
    wrapper.unmount();
  });

  it('思考播放中手动收起后，自动开合不再覆盖（手动优先）', async () => {
    vi.useFakeTimers();
    const text = '实时思考'.repeat(300);
    const wrapper = mount(WorkRunGroup, {
      props: { items: [reasoning({ key: 'r1', text, animate: true })] },
    });
    await nextTick();
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(true);

    // 用户手动收起
    await wrapper.find('.work-run-group__chip--reasoning').trigger('click');
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);

    // 推进直到（假想的）播放结束：保持收起
    await vi.advanceTimersByTimeAsync(9000);
    await nextTick();
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
    wrapper.unmount();
  });

  it('用户已展开的详情不被新到达的流式思考自动覆盖', async () => {
    const t = tool({ key: 't1', status: 'succeeded' });
    const wrapper = mount(WorkRunGroup, { props: { items: [t] } });
    await wrapper.find('.work-run-group__chip').trigger('click');
    expect(wrapper.find('.work-run-group__detail').text()).toContain('bash');

    // 流式思考到达：用户选中的工具详情保持
    await wrapper.setProps({
      items: [t, reasoning({ key: 'r1', streaming: true, text: '流式思考' })],
    });
    await nextTick();
    expect(wrapper.find('.work-run-group__detail').text()).toContain('bash');
  });

  it('播放中的思考优先于失败项自动展开；思考结束后失败项接续展开', async () => {
    const failedTool = tool({
      key: 't1',
      name: 'read_file',
      status: 'failed',
      output: 'error: boom',
    });
    const wrapper = mount(WorkRunGroup, {
      props: { items: [failedTool, reasoning({ key: 'r1', streaming: true, text: '流式思考' })] },
    });
    await nextTick();
    // 思考优先
    expect(wrapper.find('.reasoning-text').exists()).toBe(true);

    // 流结束 → 失败项接续自动展开
    await wrapper.setProps({
      items: [failedTool, reasoning({ key: 'r1', streaming: false, text: '流式思考' })],
    });
    await nextTick();
    const detail = wrapper.find('.work-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('read_file');
    expect(detail.text()).toContain('error: boom');
  });

  // ── 子代理完成（<subagent_event>）：并入工作 chip 行 ──────────────────

  function subagent(over: Partial<SubagentWorkItem> = {}): SubagentWorkItem {
    return {
      kind: 'subagent',
      key: 'sa1',
      task: '审计 Panel 文档',
      result: '结论正文',
      success: true,
      ...over,
    };
  }

  it('子代理完成：与工具/思考同排同规格 chip（悬停提示状态+任务），点击展开结论', async () => {
    const wrapper = mount(WorkRunGroup, {
      props: { items: [tool({ key: 't1' }), subagent({ key: 'sa' }), reasoning({ key: 'r1' })] },
    });
    const chips = wrapper.findAll('.work-run-group__chip');
    expect(chips.length).toBe(3);
    expect(chips[1].classes()).toContain('work-run-group__chip--subagent');
    // 悬停提示：状态 + 任务摘要
    expect(chips[1].attributes('title')).toContain('子代理完成');
    expect(chips[1].attributes('title')).toContain('审计 Panel 文档');
    // 静止 → 折叠（无详情卡）
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
    // 点击 → 浮现结论正文（头部为任务摘要 + 状态胶囊）
    await chips[1].trigger('click');
    const detail = wrapper.find('.work-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('审计 Panel 文档');
    expect(detail.text()).toContain('成功');
    expect(detail.text()).toContain('结论正文');
    // 再点收起
    await chips[1].trigger('click');
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
  });

  it('子代理运行中：呼吸态 + 转圈点；详情提示「结果未到」', async () => {
    const wrapper = mount(WorkRunGroup, {
      props: { items: [subagent({ running: true, result: '' })] },
    });
    const chip = wrapper.find('.work-run-group__chip--subagent');
    expect(chip.classes()).toContain('work-run-group__chip--active');
    expect(wrapper.find('.work-run-group__dot--live').exists()).toBe(true);
    expect(chip.attributes('title')).toContain('子代理运行中');
    await chip.trigger('click');
    expect(wrapper.find('.work-run-group__detail').text()).toContain('结果未到');
  });

  it('子代理失败：自动展开首个失败项（与工具失败同策略）+ 失败样式', () => {
    const wrapper = mount(WorkRunGroup, {
      props: {
        items: [
          subagent({ key: 'ok' }),
          subagent({ key: 'bad', success: false, result: '出错了' }),
        ],
      },
    });
    const failedChip = wrapper.findAll('.work-run-group__chip')[1];
    expect(failedChip.classes()).toContain('work-run-group__chip--failed');
    const detail = wrapper.find('.work-run-group__detail');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('失败');
    expect(detail.text()).toContain('出错了');
  });

  it('子代理空结果：详情显示占位「（无结果内容）」', async () => {
    const wrapper = mount(WorkRunGroup, {
      props: { items: [subagent({ result: '   ' })] },
    });
    await wrapper.find('.work-run-group__chip').trigger('click');
    expect(wrapper.find('.work-run-group__detail').text()).toContain('（无结果内容）');
  });

  // ── 样式契约（2026-10 回归）────────────────────────────────────────────
  it('样式契约：详情图标显式尺寸 + 修饰符为顶层规则（大图标事故回归）', () => {
    const raw = readFileSync(join(here, '..', 'WorkRunGroup.vue'), 'utf-8');
    const style = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';

    // 1) 详情图标必须有显式尺寸约束。2026-10 事故：`.work-run-group__detail-icon`
    //    的声明与收口被误删（块内直接跟上修饰符选择器），SVG 失去 14px 约束、
    //    回退默认替换元素尺寸——展开详情浮现巨图标（思考/工具/子代理同挂）。
    const iconRule = style.match(/\.work-run-group__detail-icon\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    expect(iconRule, 'icon rule must carry explicit sizing').toMatch(/width:\s*14px/);
    expect(iconRule).toMatch(/height:\s*14px/);
    expect(iconRule).toMatch(/flex:\s*0 0 auto/);

    // 2) 修饰符必须是顶层规则。丢失收口时嵌套会被编译成"后代选择器"
    //    （`.detail-icon .detail-icon--reasoning`）——永不匹配，配色/字体全失效。
    expect(style).toMatch(/^\.work-run-group__detail-icon--reasoning\s*\{/m);
    expect(style).toMatch(/^\.work-run-group__detail-icon--subagent\s*\{/m);

    // 3) 同类坏块的结构特征：`}` 后直接跟声明行（孤儿声明）、规则重复。
    expect(style).not.toMatch(/\}\s*\n\s*(color|font-family|font-size|width|height|flex):/);
    const reasoningNameRules =
      style.match(/^\.work-run-group__detail-name--reasoning\s*\{/gm) ?? [];
    expect(reasoningNameRules.length).toBe(1);
  });
});
