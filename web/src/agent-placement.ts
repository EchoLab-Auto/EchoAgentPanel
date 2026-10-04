//! Agent 运行区域放置（Plan B）：agent 自带「运行区域」，在 Panel 统一管理。
//!
//! 迁移 = 目标区域 `SaveTeam`（部署/更新该 agent）+ 源区域 `DeleteTeam`（移除）。
//! 两条命令都带**显式 targetCore**（区域 = 上游名），不依赖任何"管理目标"变量。
//!
//! 注意：会话历史属于原区域，不随 agent 迁移（跨区搬历史是 `MigrateSession`，
//! 需要两区域之间已建立联邦链路）。

import { sendCommand } from './connection';
import type { TeamInfo } from './protocol';

/** 把 agent 迁移到 `targetRegion`（上游名）。同区或空目标 = 无操作。 */
export function moveAgentToRegion(
  agent: TeamInfo & { core?: string | null },
  targetRegion: string,
): void {
  const source = agent.core ?? null;
  if (!targetRegion || targetRegion === source) return;
  // 1) 目标区域：按当前 profile 部署（已存在则更新）。
  sendCommand(
    {
      SaveTeam: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        system_prompt: agent.system_prompt ?? '',
        enabled: agent.enabled,
        system_skills: agent.system_skills ?? [],
        disabled_tools: agent.disabled_tools ?? [],
        disabled_skills: agent.disabled_skills ?? [],
        enabled_plugins: agent.enabled_plugins ?? [],
        enabled_tools: agent.enabled_tools ?? [],
        enabled_skills: agent.enabled_skills ?? [],
        memory_limit_tokens: agent.memory_limit_tokens ?? null,
        context_window_tokens: agent.context_window_tokens ?? null,
        api_profile: agent.api_profile ?? null,
      },
    },
    targetRegion,
  );
  // 2) 源区域：移除（不同区时）。
  if (source) {
    sendCommand({ DeleteTeam: { id: agent.id } }, source);
  }
}
