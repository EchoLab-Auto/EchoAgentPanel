// Plan B：agent 自带「运行区域」，Panel 统一管理迁移。
// 迁移 = 目标区域 SaveTeam（带显式 targetCore）+ 源区域 DeleteTeam。
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../connection', () => ({ sendCommand: vi.fn() }));

import { moveAgentToRegion } from '../agent-placement';
import { sendCommand } from '../connection';
import type { TeamInfo } from '../protocol';

const agent: TeamInfo & { core?: string | null } = {
  id: 'alix',
  node_id: null,
  region_name: null,
  name: 'Alix',
  description: '助手',
  enabled: true,
  running: true,
  system_skills: [],
  sessions: 0,
  core: 'core-a',
  system_prompt: '你是 Alix',
  disabled_tools: [],
  disabled_skills: [],
  enabled_modules: ['echo-agent.tools.builtin'],
  enabled_tools: [],
  enabled_skills: [],
  memory_limit_tokens: null,
  context_window_tokens: null,
  api_profile: null,
};

describe('agent 运行区域迁移', () => {
  beforeEach(() => vi.mocked(sendCommand).mockClear());

  it('目标区域部署（SaveTeam）+ 源区域删除（DeleteTeam），均显式指定区域', () => {
    moveAgentToRegion(agent, 'ai_station');
    expect(sendCommand).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ SaveTeam: expect.objectContaining({ id: 'alix', name: 'Alix' }) }),
      'ai_station',
    );
    expect(sendCommand).toHaveBeenNthCalledWith(2, { DeleteTeam: { id: 'alix' } }, 'core-a');
  });

  it('目标区域与当前一致 → 无操作', () => {
    moveAgentToRegion(agent, 'core-a');
    expect(sendCommand).not.toHaveBeenCalled();
  });

  it('空目标 → 无操作', () => {
    moveAgentToRegion(agent, '');
    expect(sendCommand).not.toHaveBeenCalled();
  });
});
