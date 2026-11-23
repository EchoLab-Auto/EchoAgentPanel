import { describe, it, expect } from 'vitest';
import { buildModuleDependencyGraph, buildModuleDependencyModel } from '../module-deps';
import type { ModuleInfo } from '../protocol';

/** ModuleInfo 工厂：只写用例关心的字段，其余取 Core 的缺省值。 */
function module(partial: Partial<ModuleInfo>): ModuleInfo {
  return {
    id: 'x',
    name: 'X',
    version: '1',
    kind: 'other',
    description: '',
    tag: 'inner',
    author: '',
    builtin: false,
    runtime: 'in_process',
    package: 'x',
    gating: 'persona',
    config_origin: '',
    state: '',
    restarts: 0,
    generation: 0,
    source_path: '',
    command: '',
    args: [],
    env_keys: [],
    required_services: [],
    provides_services: [],
    optional_services: [],
    pending_services: [],
    subscribed_events: [],
    ...partial,
  };
}

describe('buildModuleDependencyGraph', () => {
  it('模块提供的服务成为中间节点，消费方从提供者连边', () => {
    const graph = buildModuleDependencyGraph([
      module({ id: 'echo-agent.session', name: '会话', provides_services: ['echo-agent.session.factory'] }),
      module({ id: 'echo-agent.loop.single', name: '循环', required_services: ['llm'], provides_services: ['loop'] }),
      module({ id: 'echo-agent.provider.llm', name: 'LLM', provides_services: ['llm'] }),
    ]);

    const ids = graph.nodes.map((n) => n.id);
    expect(ids).toContain('echo-agent_session');
    expect(ids).toContain('echo-agent_loop_single');
    expect(ids).toContain('echo-agent_provider_llm');

    // provider.llm 提供 llm → loop.single 依赖 llm：边从 provider 到 loop
    const edge = graph.edges.find((e) => e.label === 'llm');
    expect(edge).toBeDefined();
    expect(edge!.from).toBe('echo-agent_provider_llm');
    expect(edge!.to).toBe('echo-agent_loop_single');

    // 宿主服务表不作为节点出现。
    expect(ids).not.toContain('__host__');
  });

  it('清单中的模块都以矩形节点展示', () => {
    buildModuleDependencyGraph([module({ id: 'a', name: 'A' })]);
    const model = buildModuleDependencyModel([module({ id: 'a', name: 'A' })]);
    expect(model.isolated[0].id).toBe('a');
  });

  it('无依赖边的孤立模块单独列出，不挤占主图', () => {
    const model = buildModuleDependencyModel([
      module({ id: 'echo-agent.subagent', name: '子代理' }),
    ]);
    expect(model.graph.nodes.map((n) => n.id)).toContain('echo-agent_subagent');
    expect(model.isolated.map((m) => m.id)).toContain('echo-agent.subagent');
    expect(model.graph.edges).toHaveLength(0);
  });

  it('节点 id 把非法字符替换成下划线（prodoc-flow 词法）', () => {
    const graph = buildModuleDependencyGraph([
      module({ id: 'echo-agent.tools.builtin', name: '内置工具', provides_services: ['tools.builtin'] }),
    ]);
    expect(graph.nodes.map((n) => n.id)).toContain('echo-agent_tools_builtin');
  });
});

describe('可随依赖关系调整的图模型', () => {
  it('节点带短 ID，孤立模块不挤入主图，依赖变化后自动换边', () => {
    const first = buildModuleDependencyModel([
      module({ id: 'echo-agent.loop.single', name: '循环', provides_services: ['loop'] }),
      module({ id: 'echo-agent.tools.builtin', name: '内置工具', required_services: ['loop'], provides_services: ['tools.builtin'] }),
      module({ id: 'echo-agent.shell', name: 'Shell', required_services: ['tools.builtin'] }),
      module({ id: 'echo-agent.panel.web', name: 'Web Panel' }),
    ]);
    expect(first.graph.nodes.map((n) => n.id)).toContain('echo-agent_panel_web');
    expect(first.isolated.map((m) => m.id)).toEqual(['echo-agent.panel.web']);
    expect(first.graph.nodes.find((n) => n.id === 'echo-agent_loop_single')?.label).toContain('loop.single');
    expect(first.graph.edges.map((e) => e.label).sort()).toEqual(['loop', 'tools.builtin'].sort());

    const changed = buildModuleDependencyModel([
      module({ id: 'echo-agent.loop.single', name: '循环', provides_services: ['loop'] }),
      module({ id: 'echo-agent.tools.builtin', name: '内置工具', provides_services: ['tools.builtin'] }),
      module({ id: 'echo-agent.shell', name: 'Shell', required_services: ['loop'] }),
    ]);
    expect(changed.graph.edges).toEqual([
      expect.objectContaining({ from: 'echo-agent_loop_single', to: 'echo-agent_shell', label: 'loop' }),
    ]);
  });

  /**
   * 软依赖同样连边——否则「模块之间真实存在的耦合」在图上完全消失。
   *
   * 实例：`echo-agent.prodoc` 的 `optional_services` 里有
   * `echo-agent.host.skill_registrar`，该键正由 `echo-agent.skills.dir`
   * `provides`。旧实现只读 `required_services`，这条边从来没被画出来。
   *
   * 标签带 `?` 是因为语义不同：软依赖缺失不阻止挂载。
   */
  it('软依赖也连边，标签带 ? 与硬依赖区分', () => {
    const model = buildModuleDependencyModel([
      module({ id: 'echo-agent.skills.dir', name: '技能目录', provides_services: ['echo-agent.host.skill_registrar'] }),
      module({ id: 'echo-agent.prodoc', name: 'prodoc', optional_services: ['echo-agent.host.skill_registrar'] }),
    ]);
    expect(model.graph.edges).toEqual([
      expect.objectContaining({
        from: 'echo-agent_skills_dir',
        to: 'echo-agent_prodoc',
        label: 'host.skill_registrar?',
      }),
    ]);
    expect(model.optionalEdgeCount).toBe(1);
    expect(model.edgeCount).toBe(1);
    // 软依赖被满足 → 不该进"宿主提供"清单。
    expect(model.hostProvided).toEqual([]);
  });

  /**
   * 无模块提供者的硬依赖分成两种事实，不能用同一个筐装：
   * - 不在 `pending_services` 里 = Core 说"此刻不缺" → 宿主注册的接缝（`llm`）；
   * - 在 `pending_services` 里 = Core 说"此刻缺" → 真阻塞挂载。
   */
  it('宿主注册的键与真缺失的键分开登记', () => {
    const model = buildModuleDependencyModel([
      module({ id: 'echo-agent.loop.single', name: '循环', required_services: ['llm'], provides_services: ['loop'] }),
      module({
        id: 'echo-agent.shell',
        name: 'Shell',
        required_services: ['tools.builtin'],
        pending_services: ['tools.builtin'],
      }),
    ]);
    expect(model.graph.edges).toEqual([]);
    expect(model.hostProvided).toEqual([
      expect.objectContaining({ moduleId: 'echo-agent.loop.single', key: 'llm', optional: false }),
    ]);
    expect(model.missing).toEqual([
      expect.objectContaining({ moduleId: 'echo-agent.shell', key: 'tools.builtin' }),
    ]);
    // 两条都不进图，但模块仍作为节点存在。
    expect(model.graph.nodes.map((n) => n.id).sort()).toEqual(['echo-agent_loop_single', 'echo-agent_shell']);
  });

  it('缺失的键若有声明提供者：既连边也登记缺失（提供者没挂上就是这个形状）', () => {
    const model = buildModuleDependencyModel([
      module({ id: 'echo-agent.tools.builtin', name: '内置工具', provides_services: ['tools.builtin'] }),
      module({
        id: 'echo-agent.shell',
        name: 'Shell',
        required_services: ['tools.builtin'],
        pending_services: ['tools.builtin'],
      }),
    ]);
    expect(model.graph.edges.map((e) => e.label)).toEqual(['tools.builtin']);
    expect(model.missing.map((m) => m.key)).toEqual(['tools.builtin']);
    expect(model.hostProvided).toEqual([]);
  });

  /**
   * 同一键多个提供者：框架是后者覆盖前者，但"谁是后者"由挂载顺序决定。
   * 只画一个会撒谎（且旧实现是注册序最后一个胜出，纯偶然），所以都画，
   * 并在 `multiProviderKeys` 里如实列出。
   */
  it('多提供者：每个提供者都连边，并在 multiProviderKeys 里点名', () => {
    const model = buildModuleDependencyModel([
      module({ id: 'echo-agent.loop.single', name: '单会话', provides_services: ['loop'] }),
      module({ id: 'echo-agent.loop.multi', name: '多会话', provides_services: ['loop'] }),
      module({ id: 'echo-agent.tools.builtin', name: '内置工具', required_services: ['loop'] }),
    ]);
    expect(model.graph.edges.map((e) => e.from).sort()).toEqual(['echo-agent_loop_multi', 'echo-agent_loop_single']);
    expect(model.edgeCount).toBe(2);
    expect(model.multiProviderKeys).toEqual([{ key: 'loop', providers: ['echo-agent.loop.single', 'echo-agent.loop.multi'] }]);
  });

  it('全部键都能解析时，两张清单都是空的', () => {
    const model = buildModuleDependencyModel([
      module({ id: 'echo-agent.loop.single', name: '循环', provides_services: ['loop'] }),
      module({ id: 'echo-agent.tools.builtin', name: '内置工具', required_services: ['loop'], optional_services: ['loop'] }),
    ]);
    expect(model.hostProvided).toEqual([]);
    expect(model.missing).toEqual([]);
    expect(model.multiProviderKeys).toEqual([]);
  });
});
