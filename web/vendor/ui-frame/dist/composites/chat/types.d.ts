/**
 * @echolab-auto/ui-frame/chat — 聊天领域数据契约
 *
 * 纯数据类型，零运行时依赖。宿主（如 agent 面板）把自己的消息模型
 * 映射为该结构后喂给 chat 组件渲染；组件不持有、不修改数据。
 */
/** 消息角色：用户 / Agent / 系统 / 工具调用 / 分支合并块 */
export type ChatRole = 'user' | 'agent' | 'system' | 'tool' | 'branch';
export type ChatToolStatus = 'running' | 'succeeded' | 'failed';
/** 消息来源（多适配器场景：QQ / 本地 / 其他平台） */
export interface ChatMessageSource {
    adapterName?: string;
    platform?: string;
    userId?: string;
    userName?: string;
    channel?: string;
    groupName?: string | null;
}
/** 一次工具调用的入参与输出 */
export interface ChatToolCall {
    name: string;
    /** 已摘要化的参数文本（多行 pre 展示） */
    input?: string;
    /** 工具输出；running 状态时为 null */
    output?: string | null;
    status?: ChatToolStatus;
}
/** 分支内部的活动记录类型 */
export type ChatBranchEntryKind = 'reasoning' | 'tool' | 'content' | 'notice';
/** 分支合并块内的单条活动记录 */
export interface ChatBranchEntry {
    kind: ChatBranchEntryKind;
    /** reasoning / content / notice 的文本内容 */
    text: string;
    /** 秒级 Unix 时间戳 */
    time?: number;
    /** kind === 'tool' 时的工具名与入出参 */
    toolName?: string;
    input?: string;
    output?: string;
    status?: ChatToolStatus;
}
/** 分支结束后归档到主消息流的折叠合并块 */
export interface ChatBranchSummary {
    branchId: string;
    /** 一行摘要（分支最终输出或任务描述的截断） */
    summary: string;
    /** 分支运行期间的完整活动记录 */
    entries: ChatBranchEntry[];
}
/** 一条聊天消息。role 为 tool / branch 时分别携带 tool / branch 负载 */
export interface ChatMessage {
    id: string | number;
    role: ChatRole;
    content: string;
    /** 秒级 Unix 时间戳 */
    time?: number;
    /** 归属来源（空 = 本地/未知） */
    source?: ChatMessageSource | null;
    /** Agent 推理过程分段 */
    reasoning?: string[];
    tool?: ChatToolCall;
    branch?: ChatBranchSummary;
}
