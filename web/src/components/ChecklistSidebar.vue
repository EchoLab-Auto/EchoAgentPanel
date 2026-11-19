<script setup lang="ts">
//! 悬浮清单：复用 SidebarCard 折叠卡片，固定在侧边栏底部。

import { computed, ref } from 'vue';
import { state } from '../store';
import { checklistEntryKey, checklistSourceLabel, checklistsForSession } from '../state';
import SidebarCard from './SidebarCard.vue';
import PanelIcon from './PanelIcon.vue';

//! 清单快照按 (core, team_id, session_id) 复合键存储（state.checklists，
//! 2026-10：多上游 core 维度 + 多 persona team 维度）——本组件只显示
//! **当前会话**的清单；global 会话由父组件（ChatView）聚合后传入 lists 覆盖。

const props = defineProps<{
  /** 当前会话 id（缺省 = 本地默认会话；'global' 时由 lists 提供聚合结果）。 */
  sessionId?: string;
  /** 直接提供清单列表（global 聚合视图）；缺省按 sessionId 查表。 */
  lists?: import('../state').ChecklistEntry[];
  /** 当前人格 id；必须和 ChatView 的读取/同步标记使用同一口径。 */
  teamId?: string | null;
  /** 数据可能不是 Core 的权威最新（旧 Core 无快照协议 / 旧式状态）：
   * 面板显式标注，避免把"没收到"误当成"清单就这些"。 */
  unsynced?: boolean;
}>();

const open = ref(true);

/** 是否 global 聚合视图（父组件直接给 lists）：聚合时每张卡标注来源。 */
const aggregated = computed(() => props.lists !== undefined);

const lists = computed(() => {
  if (props.lists) return props.lists;
  const id = props.sessionId ?? 'local:tui::local_user';
  return checklistsForSession(state, id, props.teamId ?? null);
});
</script>
<template>
  <div class="checklist-float">
    <SidebarCard
      title="清单"
      :open="open"
      :count="lists.length"
      count-title="清单数量"
      @toggle="open = !open"
    >
      <!-- 未同步：只做**声明**，不改数据（旧 Core 无法补拉，不能假装同步）。 -->
      <div
        v-if="unsynced"
        class="checklist-unsynced"
        title="Core 未提供权威清单快照：当前显示可能不是最新（旧版 Core 不支持补拉）"
      >
        未同步
      </div>
      <div v-if="lists.length === 0" class="muted checklist-float-empty">（暂无清单）</div>
      <!-- 行键 = 来源三元组 + 清单名（同名清单跨 core/persona/会话不撞 key）。 -->
      <div v-for="(list, index) in lists" :key="checklistEntryKey(list, index)" class="checklist-card">
        <div class="checklist-head">
          <span class="checklist-name" :class="{ archived: list.archived }">
            {{ list.name }}<span v-if="list.archived" class="checklist-archived-tag">（已归档）</span>
          </span>
          <span class="checklist-progress">{{ list.done }}/{{ list.total }}</span>
        </div>
        <div v-if="aggregated && list.source" class="checklist-source" :title="checklistSourceLabel(list.source)">
          {{ checklistSourceLabel(list.source) }}
        </div>
        <div class="checklist-bar">
          <div
            class="checklist-bar-fill"
            :style="{ width: `${list.total ? (list.done / list.total) * 100 : 0}%` }"
          />
        </div>
        <div
          v-for="(item, index) in list.items"
          :key="index"
          class="checklist-item"
          :class="{ done: item.done }"
        >
          <PanelIcon
            :name="item.done ? 'check-square' : 'square'"
            size="sm"
            :tone="item.done ? 'ok' : 'muted'"
            class="checklist-item__icon"
          />
          <span class="checklist-item__text">{{ item.text }}</span>
        </div>
      </div>
    </SidebarCard>
  </div>
</template>
