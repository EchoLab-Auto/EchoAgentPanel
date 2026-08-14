//! TS 镜像 echo-protocol 的线格式（serde 外部标签枚举 + WsMessage 信封）。
//!
//! Core 的 `WsMessage` 序列化为
//! `{"type":"command|event|sudo_password","payload":{...}}`；
//! `BackendCommand` / `BackendEvent` 是外部标签枚举（变体名即标签）。

export type GateMode = 'none' | 'allowlist' | 'denylist';
export type ThinkingMode = 'enabled' | 'disabled';
export type ReasoningEffort = 'low' | 'high' | 'max';

export interface AdapterStatus {
  name: string;
  display_name: string;
  connected: boolean;
  running: boolean;
  self_id: string | null;
  bind_address: string;
  started_at: number | null;
}

export interface SessionInfo {
  id: string;
  platform: string;
  scope: string;
  user_id: string;
  nickname: string;
  group_name: string | null;
  last_active: number;
  last_message: string;
}

export interface GroupInfo {
  group_id: number;
  group_name: string;
}

export interface FriendInfo {
  user_id: number;
  nickname: string;
}

export interface ApiProfileInfo {
  name: string;
  provider: string;
  model: string;
  base_url: string;
  api_key_set: boolean;
  thinking: ThinkingMode;
  reasoning_effort: ReasoningEffort;
}

export interface ContextMessageInfo {
  role: string;
  content: string;
  tokens: number;
  sequence: number | null;
}

export interface TimelineSource {
  adapter_name: string;
  platform: string;
  user_id: string;
  user_name: string;
  channel: string;
  group_name: string | null;
  received_at_ms: number;
  message_sequence: number;
}

export interface TimelineTool {
  name: string;
  input: string;
  output: string | null;
  failed: boolean;
}

export interface TimelineMessage {
  kind: string;
  content: string;
  time: number;
  source?: TimelineSource | null;
  reasoning?: string[] | null;
  tool?: TimelineTool | null;
}

export interface ChecklistState {
  lists: Array<{
    name: string;
    done: number;
    total: number;
    items: Array<{ text: string; done: boolean }>;
  }>;
}

export interface SudoPasswordSubmit {
  request_id: number;
  password: string | null;
}

// ── BackendCommand（外部标签枚举）──────────────────────────────────────────

export type BackendCommand =
  | { SendMessage: { session_id: string; content: string } }
  | { SwitchModel: { model: string } }
  | { SwitchProvider: { provider: string } }
  | { SetSystemPrompt: { prompt: string } }
  | {
      UpdateApiConfig: {
        name: string;
        provider: string;
        model: string;
        base_url: string;
        api_key: string;
        thinking?: ThinkingMode | null;
        reasoning_effort?: ReasoningEffort | null;
      };
    }
  | { SwitchApi: { name: string } }
  | { DeleteApi: { name: string } }
  | { ToggleSkill: { name: string; enabled: boolean } }
  | 'RequestState'
  | 'RequestContext'
  | 'RequestTrunkTimeline'
  | { StartAdapter: { name: string } }
  | { StopAdapter: { name: string } }
  | { RestartAdapter: { name: string } }
  | 'RequestAdapterStatus'
  | 'RequestGroupList'
  | 'RequestFriendList'
  | 'StartAllAdapters'
  | 'StopAllAdapters'
  | { UpdateQqAllowlist: { user_ids: number[]; group_ids: number[] } }
  | { UpdateQqDenylist: { user_ids: number[]; group_ids: number[] } }
  | 'RequestQqFilterConfig'
  | { SetQqGateMode: { mode: GateMode } }
  | { SetQqOwner: { owner_qq: number } };

// ── BackendEvent（外部标签枚举）────────────────────────────────────────────

export type BackendEvent =
  | { AdapterStateChanged: { adapter_name: string; connected: boolean; self_id: string | null } }
  | {
      MessageReceived: {
        session_id: string;
        adapter_name: string;
        platform: string;
        user_id: string;
        user_name: string;
        channel: string;
        group_name: string | null;
        content: string;
        timestamp: number;
        received_at_ms: number;
        message_sequence: number;
      };
    }
  | { AgentThinking: { session_id: string } }
  | { LlmRequest: { session_id: string; model: string } }
  | {
      LlmResponse: {
        session_id: string;
        model: string;
        prompt_tokens: number;
        completion_tokens: number;
      };
    }
  | { AgentReasoning: { session_id: string; branch_id: string; content: string } }
  | { SubagentStarted: { session_id: string; task: string } }
  | { SubagentCompleted: { session_id: string; success: boolean } }
  | {
      ReplyBranchStarted: {
        session_id: string;
        branch_id: string;
        message_sequence: number;
        task: string;
        target: string;
        started_at_ms: number;
      };
    }
  | { ReplyBranchContent: { session_id: string; branch_id: string; content: string } }
  | {
      ReplyBranchCompleted: {
        session_id: string;
        branch_id: string;
        message_sequence: number;
        success: boolean;
        cancelled: boolean;
        completed_at_ms: number;
      };
    }
  | {
      BackgroundTaskStarted: {
        session_id: string;
        task_id: string;
        sequence: number;
        branch_count: number;
        objective: string;
        created_at_ms: number;
      };
    }
  | {
      BackgroundTaskCompleted: {
        session_id: string;
        task_id: string;
        sequence: number;
        success: boolean;
        completed_at_ms: number;
      };
    }
  | {
      BackgroundTaskIntegrated: {
        session_id: string;
        task_id: string;
        sequence: number;
        success: boolean;
        integrated_at_ms: number;
      };
    }
  | { ToolCall: { session_id: string; tool_name: string; arguments: string } }
  | { ToolResult: { session_id: string; tool_name: string; result: string } }
  | { ChecklistUpdated: { session_id: string; state: ChecklistState } }
  | { AgentOutput: { session_id: string; content: string; branch_id: string | null } }
  | { AgentCompleted: { session_id: string } }
  | { SessionUpdated: { session: SessionInfo } }
  | {
      ContextSnapshot: {
        messages: ContextMessageInfo[];
        total_tokens: number;
        limit_tokens: number;
      };
    }
  | { TrunkTimeline: { messages: TimelineMessage[] } }
  | {
      ApiConfigUpdated: {
        provider: string;
        model: string;
        base_url: string;
        api_key_set: boolean;
        thinking: ThinkingMode;
        reasoning_effort: ReasoningEffort;
        system_prompt: string;
        active_api: string;
        profiles: ApiProfileInfo[];
      };
    }
  | { ApiProfilesUpdated: { active_api: string; profiles: ApiProfileInfo[] } }
  | { Error: { session_id: string | null; message: string } }
  | { AdapterList: { adapters: AdapterStatus[] } }
  | { GroupList: { groups: GroupInfo[] } }
  | {
      QqFilterConfig: {
        allowlist_users: number[];
        allowlist_groups: number[];
        denylist_users: number[];
        denylist_groups: number[];
      };
    }
  | { QqGateMode: { mode: GateMode } }
  | { FriendList: { friends: FriendInfo[] } }
  | { SudoRequest: { request_id: number; command: string; session_id: string } }
  | { SudoResolved: { request_id: number; accepted: boolean; message: string } };

// ── WsMessage 信封 ─────────────────────────────────────────────────────────

export type WsMessage =
  | { type: 'command'; payload: BackendCommand }
  | { type: 'event'; payload: BackendEvent }
  | { type: 'sudo_password'; payload: SudoPasswordSubmit };

export function serializeCommand(command: BackendCommand): string {
  return JSON.stringify({ type: 'command', payload: command });
}

export function serializeSudoPassword(submit: SudoPasswordSubmit): string {
  return JSON.stringify({ type: 'sudo_password', payload: submit });
}

export function parseEvent(text: string): BackendEvent | null {
  try {
    const parsed = JSON.parse(text) as WsMessage;
    if (parsed && parsed.type === 'event' && parsed.payload) {
      return parsed.payload;
    }
  } catch {
    // ignore malformed frames
  }
  return null;
}
