//! 工具名 → 类别的判定（单一真值）。
//!
//! ## 为什么需要这个文件
//!
//! 工具名由**提供它的模块**定义（`spawn_subagent` 归 `agent-module-subagent`，
//! `send_group_msg` 归 QQ 适配器）。管理面协议目前只发 `tool_name: string`，
//! 不带"这个工具属于哪一类"的标记——于是前端只能按名字匹配，而匹配点一旦
//! 散落就会各自漂移。
//!
//! 这里发生过一次真实事故：`state.ts` 判 `run_subagent`（这个名字在 Core 与
//! 全部模块仓里都不存在，是首个提交留下的），而同一应用里 `ChatView.vue` 判
//! 的是正确的 `spawn_subagent`——同一次工具调用，阶段指示器与工具行标签给出
//! 互相矛盾的结论，且不会有任何报错。
//!
//! 因此所有"按工具名分类"的判据都收在这里，并标注归属模块。新增一类时改
//! 一处即可。
//!
//! ## 长期方向
//!
//! 正确做法是让管理面在事件里带 `tool_kind`（由模块在工具声明里给出），前端
//! 不再猜名字。那需要协议改动 + 模块侧声明字段，属独立工作项；在那之前，
//! 这里是唯一的落点。

/**
 * 子代理委派工具名。
 *
 * 与 `agent-module-subagent` 的 `SPAWN_SUBAGENT_TOOL`（`lib.rs`）逐字一致。
 * 改名字要两边同批改——前端没有编译期约束能发现分叉。
 */
export const SUBAGENT_TOOL = 'spawn_subagent';

/** 该工具是否是子代理委派（决定阶段指示器与完成计数）。 */
export function isSubagentTool(toolName: string | undefined | null): boolean {
  return toolName === SUBAGENT_TOOL;
}
