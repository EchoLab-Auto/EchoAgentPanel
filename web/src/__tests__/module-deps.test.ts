import { describe, it, expect } from 'vitest';
import { buildModuleDependencyGraph, HOST_NODE_ID } from '../module-deps';
import type { ModuleInfo } from '../protocol';

function module(partial: Partial<ModuleInfo>): ModuleInfo {
  return {
    id: 'x',
    name: 'X',
    version: '1',
    kind: 'other',
    description: '',
    entry: '',
    author: '',
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

    // 没有依赖宿主接缝的（session 无 required_services），所以不需要宿主根节点
    expect(ids).not.toContain(HOST_NODE_ID.replace(/[^A-Za-z0-9_-]/g, '_'));
  });

  it('未被任何模块提供的宿主接缝，从「宿主服务表」根节点连边', () => {
    const graph = buildModuleDependencyGraph([
      module({ id: 'echo-agent.shell', name: 'Shell', required_services: ['echo-agent.host.shell'] }),
    ]);

    const hostId = HOST_NODE_ID.replace(/[^A-Za-z0-9_-]/g, '_');
    expect(graph.nodes.map((n) => n.id)).toContain(hostId);
    const edge = graph.edges.find((e) => e.label === 'host.shell');
    expect(edge).toBeDefined();
    expect(edge!.from).toBe(hostId);
    expect(edge!.to).toBe('echo-agent_shell');
  });

  it('清单中的模块都以矩形节点展示', () => {
    const graph = buildModuleDependencyGraph([module({ id: 'a', name: 'A' })]);
    expect(graph.nodes.find((n) => n.id === 'a')!.shape).toBe('rect');
  });

  it('无依赖边的孤立模块也出现在图里', () => {
    const graph = buildModuleDependencyGraph([
      module({ id: 'echo-agent.subagent', name: '子代理' }),
    ]);
    expect(graph.nodes.map((n) => n.id)).toContain('echo-agent_subagent');
    expect(graph.edges).toHaveLength(0);
  });

  it('节点 id 把非法字符替换成下划线（prodoc-flow 词法）', () => {
    const graph = buildModuleDependencyGraph([
      module({ id: 'echo-agent.tools.builtin', name: '内置工具', provides_services: ['tools.builtin'] }),
    ]);
    expect(graph.nodes.map((n) => n.id)).toContain('echo-agent_tools_builtin');
  });
});
