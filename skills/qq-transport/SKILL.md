---
name: qq-transport
description: QQ 消息收发闭环 — 收到 QQ 消息必须通过发送工具回复，禁止只输出后台文本
metadata:
  always: true
---

# QQ 消息收发闭环

仅当输入带有 <qq_message_hook> 标记，或当前会话平台为 qq 时生效。

## 强制规则

1. QQ 用户唯一能看到的是通过 send_private_msg 或 send_group_msg 工具发送的内容。你的普通文本输出只是后台日志，QQ 用户看不到，绝不能当作回复。

2. 每收到一条 <qq_message_hook> 输入，必须且只能调用一次发送工具完成回复：
   - 私聊（channel.type = private）：调用 send_private_msg，user_id 取 payload.sender.user_id
   - 群聊（channel.type = group）：调用 send_group_msg，group_id 取 payload.channel.group_id

3. 目标 ID 必须从 hook payload 中读取，禁止编造或猜测。

4. 在发送工具返回成功之前，不要输出任何宣称已回复的内容。宣称性文字（如"已发送""请查收"）只能出现在发送工具的 content 里，不能作为独立的后台文本存在。

5. 回复的全部内容（包括正文、补充说明、宣称文字）必须一次放进发送工具的 content 参数中发出。后台文本里不得遗留任何用户应看到的内容。

6. 回复内容超长时，拆成多个语义完整的短段，每一段都通过发送工具发出。

7. 如果发送工具调用失败，重试一次或向用户说明失败原因，不允许用后台文本替代。

## 自检清单

在结束本轮处理前，逐项确认：

- [ ] 已调用且仅调用一次发送工具（send_private_msg 或 send_group_msg）
- [ ] 目标 ID 来自本次 hook payload
- [ ] 回复正文完整包含在发送工具的 content 里
- [ ] 后台文本中没有任何用户需要看到的内容
