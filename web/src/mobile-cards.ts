//! 移动端卡片抽屉的跨组件开关（2026-10 竖屏适配）。
//!
//! 背景：移动端（< 768px）隐藏会话视图的双侧边栏 chat-rail（324px 宽的
//! 两列在 375px 屏上压死正文），卡片改经**顶栏「卡片」按钮**打开的底部
//! Drawer 访问。入口在 App 顶栏、抽屉本体在 ChatView（复用 PanelSidebar
//! 与既有的工作区/Shell/分支处理逻辑）——两者是兄弟/父子组件关系，用一个
//! 模块级 ref 通信，比往 App 里塞 ChatView 的内部状态干净。
//!
//! 桌面（≥768px）：按钮与抽屉均不渲染，本模块无消费者（值恒 false）。

import { ref } from 'vue';

/** 卡片抽屉是否打开（仅移动端有意义）。 */
export const mobileCardsDrawerOpen = ref(false);
