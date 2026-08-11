# TUI 设计文档

## 概述

echo-tui 是 EchoAgentPanel 的终端用户界面。它实现了一个 opencode 风格的交互式终端应用，包含消息展示、多行输入、斜杠命令系统、交互式表单弹窗、鼠标文本选择与复制等功能。

## 架构分层

```
┌─ lib.rs (入口) ──────────────────────────────────────────────┐
│  run_tui() → 终端初始化 → App::run() → 终端清理              │
├─ app/mod.rs (核心编排) ──────────────────────────────────────┤
│  App: 主循环、输入路由、渲染调度、handle_submit 路由          │
├─ app/events.rs (事件处理) ───────────────────────────────────┤
│  App::apply_backend_event: 所有 BackendEvent → UI 状态       │
├─ state.rs (数据模型) ────────────────────────────────────────┤
│  AppState: 中央状态、所有领域类型、坐标映射、选区逻辑         │
├─ components/ (渲染组件) ─────────────────────────────────────┤
│  chat_view, prompt_input, status_bar, form_overlay,           │
│  command_palette, settings_popup, help_popup                  │
├─ slash_commands/ (命令系统) ─────────────────────────────────┤
│  mod (枚举+路由), api, qq, adapter, basic, help               │
├─ clipboard.rs (剪贴板) ──────────────────────────────────────┤
│  系统剪贴板工具链 + OSC 52 回退                               │
├─ util.rs (工具函数) ─────────────────────────────────────────┤
│  CJK宽度计算、时间戳格式化、panic捕获                          │
├─ backend.rs (桥接) ──────────────────────────────────────────┤
│  Backend: Mpsc/WS 双传输封装，WS 自动重连（指数退避）         │
├─ event.rs (事件枚举) ────────────────────────────────────────┤
│  Event::Input (键盘/鼠标/终端事件)                            │
├─ keybindings.rs (按键绑定) ──────────────────────────────────┤
│  KeyChord + Keybindings 可配置结构体                          │
└─ theme.rs (主题) ────────────────────────────────────────────┤
│  Theme: dark/light 双主题色板（亮度层次验证）                  │
```

## 核心数据结构

### AppState — 中央状态

所有 UI 状态集中在一个 `AppState` 结构体中，按职责分为 8 组：

| 分组 | 字段 | 职责 |
|---|---|---|
| 对话 | `sessions`, `messages` | 来源元数据和全局 Trunk 消息存储 |
| 模态 | `show_palette`, `show_help`, `show_settings`, `show_slash` | 弹窗/菜单可见性 |
| 快捷键 | `leader_active`, `quit_armed` | 快捷键状态和退出确认 |
| 表单 | `form_overlay`, `mode`, `pending_action`, `menu_msg_idx` | 交互式表单状态机 |
| 滚动 | `chat_scroll`, `conv_text`, `conv_area`, `conv_top` | 聊天区滚动与鼠标选区映射 |
| 选区 | `selecting`, `sel_anchor`, `sel_other` | 鼠标拖拽文本选择 |
| 动画 | `anim_tick`, `llm_in_flight`, `tool_in_flight`, `chat_flash_until` | 动效相位和状态 |
| 缓存 | `status`, `qq_filter`, `qq_groups` | 后端状态快照 |

### 设计决策：中央状态 vs 组件内状态

- **为什么集中**：TUI 组件之间共享状态频繁（如输入框需要读写斜杠菜单状态，聊天区需要读写滚动状态），分散状态会导致复杂的消息传递
- **代价**：`AppState` 有 40+ 个字段，修改时需要理解影响范围
- **缓解措施**：纯数据类型拆分到 `state.rs`，`AppState` 方法按功能分组（会话、选区、坐标映射、toast），门控模式使用强类型 `GateMode` 枚举

## 主循环

```
loop {
    tokio::select! {
        input_rx.recv()    → handle_input(&event)
        tick.tick()         → 更新动画相位、清理过期状态
        drain_events()      → 收集后端事件到缓冲区
    }

    排空后端事件 → apply_backend_event(每个)

    处理队列:
      pending_submit  → handle_submit()    (消息发送/表单提交)
      pending_command → backend.send()     (组件命令)
      pending_slash   → dispatch()         (斜杠命令)

    terminal.draw(|f| render(f))

    if !running { break }
}
```

**关键设计**：
- `pending_submit` / `pending_command` / `pending_slash` 是三个独立队列，互不干扰
- `handle_submit()` 内部按优先级拦截：QQ 表单编辑 → API 配置模式 → 普通消息
- 后端事件在渲染前批量处理，确保一帧内状态一致
- `apply_backend_event` 独立为 `app/events.rs`，大型 match 避免影响主循环可读性

## 输入路由

### 事件入口

```
crossterm::event::read()
  → mpsc channel (独立线程)
    → handle_input(&event)
      ├── Mouse → 滚轮 / 选区
      └── Key   → handle_key()
                    ├── Ctrl+C 全局退出
                    ├── 表单按键 → handle_form_key()
                    ├── Leader键 (Ctrl+X)
                    ├── 弹窗按键 (help/settings/palette/slash)
                    ├── 全局快捷键 (Ctrl+P, Ctrl+G)
                    ├── 滚动快捷键 (PgUp/PgDn/Home/End → ChatView)
                    └── 其余键 → PromptInput
```

### 输入路由

无焦点模型 — 用户随时可以直接打字。滚动键被提升为全局快捷键，在路由到输入框之前拦截：

```
所有按键 → PromptInput（文本编辑/斜杠菜单）
  ↑ 例外: PgUp/PgDn/Home/End → ChatView（滚动）
```

### 斜杠命令系统

```
/ 键 → show_slash = true
  → PromptInput 渲染斜杠补全弹出层
  → ↑↓ 选择、Tab 补全、输入过滤
  → Enter → pending_slash = (action, text)
  → 主循环 → dispatch(action, text) → 具体处理器
```

命令注册是三表联动：
1. `SlashAction` 枚举（类型安全的分发目标）
2. `SLASH_COMMANDS` 静态表（名称 + 描述 + 枚举值）
3. `dispatch()` 函数（枚举 → 处理函数的 match）

### 表单按键路由

```
表单激活时 (form_overlay.is_active()):
  Esc    → back() 返回上一层 / 退出
  Ctrl+S → save() (仅 ApiConfig)
  ↑↓     → 导航
  e      → 按 FormKind 分发: ApiConfig→编辑字段, QqFilter→QQ号输入
  Enter  → 按 FormKind 分发: 切换/确认/执行
```

## 渲染管线

```
render(f):
  1. Clear 全屏
  2. Layout: [StatusBar(1) | ChatView(fill) | PromptInput(3)]
  3. StatusBar::render()
  4. ChatView::build_lines() → conv_text + conv_top
  5. ChatView::render() → Paragraph + Scrollbar
  6. 选区高亮: 遍历 conv_text → frame buffer REVERSED
  7. PromptInput::render()
  8. 按优先级叠加弹窗: Palette > Settings > Help
```

### 选区渲染细节

```
conv_text 是 ChatView 渲染的每行纯文本
conv_top 是当前可见的第一行索引
选区 (sr,sc,er,ec) 映射到屏幕坐标:
  dy = idx - conv_top
  x  = a.x + col (CJK: str_visual_width)
  → buf.cell_mut((x, y)).style |= REVERSED
```

### 表单渲染

表单不弹窗，而是作为聊天消息内嵌渲染：
- `refresh_menu_msg()` → 将表单渲染文本写入全局 Trunk 最新一条系统消息
- 用户看到的是聊天区里的一条"特殊消息"，可以上下翻看历史同时操作表单

## 交互式表单 (FormOverlay)

### 状态机

```
Inactive ──activate()──→ Selecting ──enter_edit()──→ Editing
   ^                         │  ^                      │
   │  Esc/Ctrl+C             │  │ Esc                  │ Ctrl+S
   │                          │  │                      │
   └─────────────────────────┘  └──────────────────────┘
            deactivate()              back()
```

### FormKind 多态

| FormKind | 触发命令 | Selecting 操作 | Editing 行为 |
|---|---|---|---|
| ApiConfig | /api | Enter=选择/e=编辑字段 | 多字段表单 Ctrl+S 保存 |
| QqFilter | /qq allowlist | Enter=切换群/e=输QQ号 | 单字段 QQ 号输入 |

> 📖 **详细交互设计**: 参见 [QQ Setting 交互设计文档](./qq-setting-interaction.md) 了解完整的 `/qq setting` 交互流程、状态管理和用户体验设计。

### 关键设计决策

- **内嵌渲染而非弹窗**：表单作为系统消息显示在聊天区，用户可以滚动查看上下文
- **FormKind 枚举分发**：避免字符串匹配，编译期保证所有分支被处理
- **状态与 UI 分离**：`FormOverlay` 只管理自身状态，`AppState` 持有实例，`app.rs` 负责按键分发

## 组件接口

```
trait Component {
    fn render(&self, f: &mut Frame, area: Rect, state: &AppState);
    fn handle_event(&mut self, event: &Event, state: &mut AppState) -> ComponentResult;
}

enum ComponentResult { Consumed, Pass }
```

- `render` 只读 `AppState`，纯渲染
- `handle_event` 可写 `AppState`，返回是否消费事件
- 组件是无状态的（状态都在 `AppState` 中）

## 后端通信

### 命令 (TUI → Agent)

```
BackendCommand::SendMessage / RequestState / ClearSession
  / UpdateQqAllowlist / UpdateQqDenylist / RequestQqFilterConfig
  / SetQqGateMode (携带 GateMode 枚举) / ...
  → Backend::send() → BackendBridge mpsc → Agent::apply_command()
      (commands.rs)
```

### 事件 (Agent → TUI)

```
Agent::emit(BackendEvent)
  → BackendBridge mpsc → Backend::drain_events()
    → App::apply_backend_event() (app/events.rs)
      ├── 更新 state.status / state.sessions / state.messages
      ├── 更新 state.qq_filter / state.qq_gate_mode / state.qq_groups (缓存)
      └── state.toast() (信息提示)
```

### 设计原则

- 命令和事件都通过 mpsc channel 异步传递
- TUI 不直接调用 agent 方法，避免阻塞渲染线程
- 后端事件在渲染前批量排空，保证一帧内状态一致性
- `GateMode` 枚举在 TUI 侧直接使用 `echo_adapter::GateMode`，WS JSON 层用 snake_case 保持 wire 兼容
- WEB 传输模式支持自动重连（指数退避 1s → 30s cap）

## 关键设计决策汇总

1. **中央状态**：所有 UI 状态集中在 `AppState`，组件无私有状态，降低跨组件通信复杂度
2. **内嵌表单**：交互式表单作为聊天消息渲染，不遮挡对话历史
3. **FormKind 枚举**：表单行为通过枚举分发而非字符串匹配，编译期保证完备性
4. **三重提交队列**：`pending_submit` / `pending_command` / `pending_slash` 独立队列，按优先级依次处理
5. **帧缓冲选区**：文本选择不走系统选区，而是应用内自绘高亮 + OSC 52 复制，不依赖终端特性
6. **CJK 感知**：所有列计算使用 visual width（`unicode_width`），正确处理中文字符占 2 列的情况
7. **OSC 52 回退链**：剪贴板优先用系统工具(xclip/xsel/wl-copy/pbcopy)，均不可用时回退 OSC 52
8. **枚举化门控**：GateMode 作为跨层枚举（echo-protocol 单一定义，Core 各 crate 与 echo-tui 共享），编译期杜绝非法值
9. **事件处理分离**：`apply_backend_event` 独立为 `app/events.rs`，大型 match 不影响主循环可读性
