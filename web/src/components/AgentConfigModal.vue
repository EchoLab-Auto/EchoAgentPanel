<script setup lang="ts">
//! Agent 配置悬浮弹层：在会话区上方打开的轻量配置卡片，
//! 对应资源页的 Team 编辑（系统提示词 / 启用 / 能力白名单）。
//!
//! 内层元素全部使用 ui-frame 组件（FormItem/Input/Textarea/Switch/Checkbox/
//! Collapse/Table/Tag/Divider/Select/Segmented/Button）；外壳是库
//! `NeumorphismCard glass`（磨砂配方见样式区）。

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismCheckbox from '@echolab-auto/ui-frame/components/NeumorphismCheckbox';
import NeumorphismCollapse from '@echolab-auto/ui-frame/components/NeumorphismCollapse';
import NeumorphismDivider from '@echolab-auto/ui-frame/components/NeumorphismDivider';
import { NeumorphismFormItem } from '@echolab-auto/ui-frame/components/NeumorphismForm';
import NeumorphismInput from '@echolab-auto/ui-frame/components/NeumorphismInput';
import NeumorphismSelect from '@echolab-auto/ui-frame/components/NeumorphismSelect';
import NeumorphismSwitch from '@echolab-auto/ui-frame/components/NeumorphismSwitch';
import NeumorphismTable from '@echolab-auto/ui-frame/components/NeumorphismTable';
import NeumorphismTextarea from '@echolab-auto/ui-frame/components/NeumorphismTextarea';
import PanelIcon from './PanelIcon.vue';
import SessionOverlay from './SessionOverlay.vue';
import type { TableColumn } from '@echolab-auto/ui-frame';
import { state } from '../store';
import {
  PACKAGE_DISPLAY_NAMES,
  isModuleCheckboxVisible,
  moduleCheckboxState,
} from '../capabilities';
import { sendCommand, sendPending } from '../connection';
import { releasePending, usePending } from '../pending';
import LoadHint from './LoadHint.vue';
import type { TeamInfo } from '../protocol';

// ⚠️ Boolean prop 未传时 Vue 会铸成 false（resolvePropValue 的布尔铸型）——
// 「缺省 = 打开」必须走 withDefaults 显式声明，否则外壳永远不渲染。
const props = withDefaults(
  defineProps<{
    team: TeamInfo;
    /**
     * 相对会话视图容器的矩形（px）。2026-10 统一：外壳（玻璃 / 几何 / 关闭）
     * 由 `SessionOverlay` 提供，本组件只渲染内容。缺省（null）= 贴满父容器，
     * 用于测试或独立嵌入。
     */
    inset?: { top: number; right: number; bottom: number; left: number } | null;
    /** 是否打开（转发给外壳；默认随挂载即开）。 */
    open?: boolean;
  }>(),
  { inset: null, open: true },
);
const emit = defineEmits<{ close: [] }>();

// 弹层每次打开都会重新挂载（v-if）：挂载时拉取能力列表，
// 确保工具/技能/模块表格有数据（未进过资源页时 state 为空）。
// 三类清单独立登记加载跟踪（表格骨架 / 超时重试，见 pending.ts）。
const { phase: modulePhase, loading: moduleLoading } = usePending('agent-config:modules');
const { phase: toolPhase, loading: toolLoading } = usePending('agent-config:tools');
const { phase: skillPhase, loading: skillLoading } = usePending('agent-config:skills');

function requestModules() {
  sendPending('RequestModulesList', 'agent-config:modules');
}
function requestTools() {
  sendPending('RequestToolsList', 'agent-config:tools');
}
function requestSkills() {
  sendPending('RequestSkillsList', 'agent-config:skills');
}

onMounted(() => {
  requestSkills();
  requestTools();
  requestModules();
});

onUnmounted(() => {
  releasePending('agent-config:modules');
  releasePending('agent-config:tools');
  releasePending('agent-config:skills');
});

// ── 表单字段（打开时从 team 初始化） ──
const name = ref('');
const description = ref('');
const systemPrompt = ref('');
const enabled = ref(true);
const disabledTools = ref<string[]>([]);
const disabledSkills = ref<string[]>([]);
const enabledModules = ref<string[]>([]);
const enabledTools = ref<string[]>([]);
const enabledSkills = ref<string[]>([]);
/** Persona 级 API 供应商引用（'' = 跟随全局默认配置） */
const apiProfile = ref<string>('');

watch(
  () => props.team,
  (t) => {
    name.value = t.name;
    description.value = t.description;
    systemPrompt.value = t.system_prompt ?? '';
    enabled.value = t.enabled;
    disabledTools.value = t.disabled_tools ?? [];
    disabledSkills.value = t.disabled_skills ?? [];
    enabledModules.value = t.enabled_modules ?? [];
    enabledTools.value = t.enabled_tools ?? [];
    enabledSkills.value = t.enabled_skills ?? [];
    apiProfile.value = t.api_profile ?? '';
  },
  { immediate: true },
);

// ── 包（pkg）名称映射：同 pkg 的工具/技能视作一个整体分组
//（单一来源在 capabilities.ts::PACKAGE_DISPLAY_NAMES）──

interface GroupedItem {
  key: string;
  name: string;
  description: string;
  /** 所属分组（pkg 名或类别/空 = 未分组） */
  group?: string;
  /** 只读项：显示成"已勾选且不可改"（进程级能力，如管理面/交互面）。 */
  readonly?: boolean;
}

/** 工具：按 package 分组（无 package 按 category） */
const toolItems = computed<GroupedItem[]>(() =>
  state.tools.map((t) => ({
    key: t.name,
    name: t.name,
    description: t.description || '（无描述）',
    group: t.package ? (PACKAGE_DISPLAY_NAMES[t.package] ?? t.package) : t.category || undefined,
  })),
);
/** 技能：按 package 分组（无 package 按 category） */
const skillItems = computed<GroupedItem[]>(() =>
  state.skills.map((sk) => ({
    key: sk.name,
    name: sk.name,
    description: sk.description || '（无描述）',
    group: sk.package ? (PACKAGE_DISPLAY_NAMES[sk.package] ?? sk.package) : sk.category || undefined,
  })),
);
/** 勾选区分组名（按 kind 显示；仅实例/交互为独立组，
 * 其余整类能力项（工具/技能等包维度门控）归入「管理面」）。 */
const MODULE_GROUP_LABELS: Record<string, string> = {
  instance: '实例',
  interaction: '交互',
};
/** 模块：实例/交互类与包维度门控模块（按 kind 分组展示）。
 * 判定单一来源 = capabilities.ts::isModuleCheckboxVisible。 */
const moduleItems = computed<GroupedItem[]>(() =>
  state.modules
    .filter((p) => isModuleCheckboxVisible(p))
    .map((p) => {
      const readonly = moduleCheckboxState(p) === 'readonly';
      return {
        key: p.id,
        name: p.name,
        readonly,
        description: readonly
          ? `${p.description || '（无描述）'} —— 进程级，对所有人格始终生效`
          : p.description || '（无描述）',
        group: MODULE_GROUP_LABELS[p.kind] ?? '管理面',
      };
    }),
);
/** 可写的键（只读项不进白名单——它们从来不受人格控制）。 */
const moduleWritableKeys = computed(() =>
  moduleItems.value.filter((i) => !i.readonly).map((i) => i.key),
);
/** 按分组聚合成表格模型（组名 + 成员；无分组归入「其他」） */
interface GroupedTable {
  group: string;
  items: GroupedItem[];
}
function groupBy(items: GroupedItem[]): GroupedTable[] {
  const map = new Map<string, GroupedItem[]>();
  for (const item of items) {
    const g = item.group ?? '其他';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(item);
  }
  return [...map.entries()]
    .map(([group, list]) => ({
      group,
      items: list.sort((a, b) => a.name.localeCompare(b.name, 'en')),
    }))
    .sort((a, b) => a.group.localeCompare(b.group, 'en'));
}
const toolGroups = computed(() => groupBy(toolItems.value));
const skillGroups = computed(() => groupBy(skillItems.value));
const moduleGroups = computed(() => groupBy(moduleItems.value));

/** 白名单语义：列表为空 = 全部启用（全选状态） */
function isItemOn(list: string[], key: string): boolean {
  return list.length === 0 || list.includes(key);
}
/** 组内是否全部可写项都已启用（只读项恒为"开"，不参与判定）。 */
function isGroupOn(list: string[], group: GroupedTable): boolean {
  const writable = group.items.filter((i) => !i.readonly);
  if (!writable.length) return true; // 整组只读 → 恒显示为勾住
  return list.length === 0 || writable.every((i) => list.includes(i.key));
}
/** 组内部分启用（用于 checkbox 的 indeterminate 态） */
function isGroupPartial(list: string[], group: GroupedTable): boolean {
  if (list.length === 0) return false;
  const writable = group.items.filter((i) => !i.readonly);
  if (!writable.length) return false;
  const on = writable.filter((i) => list.includes(i.key)).length;
  return on > 0 && on < writable.length;
}
/** 整组是否只读（禁用组级勾选框）。 */
function isGroupReadonly(group: GroupedTable): boolean {
  return group.items.every((i) => i.readonly);
}
/** 切换单项（白名单为空时先以全量初始化再切换） */
function toggleItem(list: string[], all: string[], key: string): string[] {
  const base = list.length ? list : [...all];
  return base.includes(key) ? base.filter((k) => k !== key) : [...base, key];
}
/** 切换整组（只读项不写进白名单——它们从来不受人格控制）。 */
function toggleGroup(list: string[], all: string[], group: GroupedTable): string[] {
  const keys = group.items.filter((i) => !i.readonly).map((i) => i.key);
  if (!keys.length) return list;
  const base = list.length ? list : [...all];
  const on = keys.every((k) => base.includes(k));
  if (on) return base.filter((k) => !keys.includes(k));
  return [...new Set([...base, ...keys])];
}

// ── 能力表格（ui-frame NeumorphismTable）：行数据即 GroupedItem ──
/** 三张表共用列定义（行键 = GroupedItem.key，与 row-key="key" 对应） */
const CAPABILITY_COLUMNS: TableColumn[] = [
  { key: 'name', label: '名称', width: '180px' },
  { key: 'description', label: '介绍' },
  { key: 'check', label: '启用', width: '64px', align: 'center' },
];
/** 表格 data 契约（Record<string, unknown>[]）与 GroupedItem[] 的桥接 */
function tableRows(items: GroupedItem[]): Record<string, unknown>[] {
  return items as unknown as Record<string, unknown>[];
}
function rowKeyOf(row: Record<string, unknown>): string {
  return String(row.key ?? '');
}
function isRowOn(list: string[], row: Record<string, unknown>): boolean {
  // 只读行恒显示为勾住（它是进程级能力，"这个人格能不能用"不由白名单决定）。
  if (row.readonly === true) return true;
  return isItemOn(list, rowKeyOf(row));
}
function toggleRow(list: string[], all: GroupedItem[], row: Record<string, unknown>): string[] {
  // 只读行：勾不动。它是进程级能力，"这个人格能不能用"不由白名单决定。
  if (row.readonly === true) return list;
  return toggleItem(
    list,
    all.filter((i) => !i.readonly).map((i) => i.key),
    rowKeyOf(row),
  );
}

/** 能力分区（可折叠；默认全展开） */
const CAP_SECTIONS = [
  { key: 'modules', title: '启用模块' },
  { key: 'tools', title: '启用工具（按 pkg 分组）' },
  { key: 'skills', title: '启用技能（按 pkg 分组）' },
];
const openSections = ref<string[]>(CAP_SECTIONS.map((s) => s.key));


/** API 供应商选项（全局供应商池 + 跟随全局默认） */
const apiProviderOptions = computed(() => {
  const profiles = state.api?.profiles ?? [];
  const opts: Array<{ label: string; value: string }> = [
    { label: '跟随全局默认配置', value: '' },
  ];
  for (const p of profiles) {
    opts.push({
      label: `${p.name}（${p.provider} / ${p.model}${p.api_key_set ? '' : ' · 无 key'}）`,
      value: p.name,
    });
  }
  return opts;
});

function save() {
  if (!name.value.trim()) return;
  // 按 (core, id) 定向：`SaveTeam` 的 payload 没有 team_id，`resolveTargetCore`
  // 的人格守卫（只看 team_id/session_id）识别不到归属——不显式带 core 就会落到
  // activeRegion，改的可能是另一台机器上同 id 的 agent（2026-10 多 Core 修复）。
  sendCommand(
    {
      SaveTeam: {
        id: props.team.id,
        name: name.value.trim(),
        description: description.value.trim(),
        system_prompt: systemPrompt.value,
        enabled: enabled.value,
        disabled_tools: disabledTools.value,
        disabled_skills: disabledSkills.value,
        enabled_modules: enabledModules.value,
        enabled_tools: enabledTools.value,
        enabled_skills: enabledSkills.value,
        // 本弹层不编辑这两项，但 `SaveTeam` 是整对象覆盖：不透传就会被清成
        // "继承全局"（per-persona token 预算丢失）。
        memory_limit_tokens: props.team.memory_limit_tokens ?? null,
        context_window_tokens: props.team.context_window_tokens ?? null,
        api_profile: apiProfile.value || null,
      },
    },
    props.team.core ?? undefined,
  );
  emit('close');
}
</script>

<template>
  <!-- 嵌入模式（ChatView 的入口行覆盖面板）：外壳/几何/关闭语义全部由
       `SessionOverlay` 提供，这里只保留内容结构。独立使用（有 `inset`）时
       退化为自绘外壳，行为与改造前一致（点空白关闭、Esc 由外层负责）。 -->
  <SessionOverlay
    :open="props.open !== false"
    :inset="props.inset ?? null"
    :padded="false"
    label="配置 Agent"
    @close="emit('close')"
  >
    <div class="agent-config">
      <div class="agent-config__head">
        <div>
          <h3>配置 Agent：{{ props.team.name }}</h3>
          <span class="agent-config__id">{{ props.team.id }}</span>
        </div>
        <NeumorphismButton
          size="small"
          variant="glass"
          aria-label="关闭"
          @click="emit('close')"
        >
          <PanelIcon name="close" size="sm" />
        </NeumorphismButton>
      </div>

      <div class="agent-config__body">
        <NeumorphismFormItem label="名称" required>
          <NeumorphismInput v-model="name" size="small" placeholder="Agent 名称" />
        </NeumorphismFormItem>
        <NeumorphismFormItem label="描述">
          <NeumorphismInput v-model="description" size="small" placeholder="一句话说明这个 Agent 的职责" />
        </NeumorphismFormItem>
        <NeumorphismFormItem label="系统提示词（留空继承全局）">
          <NeumorphismTextarea
            v-model="systemPrompt"
            size="small"
            :rows="4"
            placeholder="留空则继承全局系统提示词"
          />
        </NeumorphismFormItem>

        <div class="agent-config__row">
          <span>启用（禁用即卸载记忆）</span>
          <NeumorphismSwitch v-model="enabled" size="small" />
        </div>

        <NeumorphismDivider dashed inset />

        <div class="agent-config__group">
          <div class="agent-config__group-title">API 供应商</div>
          <p class="muted agent-config__hint">
            选择本 Agent 使用的模型供应商；「跟随全局默认配置」使用设置页 API 中的全局默认。
          </p>
          <NeumorphismSelect
            :model-value="apiProfile"
            :options="apiProviderOptions"
            size="small"
            @update:model-value="apiProfile = String($event ?? '')"
          />
        </div>

        <!-- 能力分区（ui-frame NeumorphismCollapse；pkg 分组 + 表格） -->
        <NeumorphismCollapse v-model="openSections" :items="CAP_SECTIONS" size="small">
          <template #header-modules>
            <span class="agent-config__sec-title">启用模块</span>
            <span class="agent-config__sec-summary">{{ moduleLoading ? '…' : `${moduleItems.length} 项` }}</span>
          </template>
          <template #modules>
            <LoadHint :phase="modulePhase" label="模块清单" @retry="requestModules" />
            <div v-if="!moduleGroups.length && modulePhase === 'idle'" class="muted">（无）</div>
            <div v-for="g in moduleGroups" :key="g.group" class="agent-config__pkg">
              <div class="agent-config__pkg-head">
                <NeumorphismCheckbox
                  :model-value="isGroupOn(enabledModules, g)"
                  :indeterminate="isGroupPartial(enabledModules, g)"
                  :disabled="isGroupReadonly(g)"
                  :label="`${g.group}（${g.items.length}）`"
                  size="small"
                  @update:model-value="enabledModules = toggleGroup(enabledModules, moduleWritableKeys, g)"
                />
              </div>
              <NeumorphismTable
                :data="tableRows(g.items)"
                :columns="CAPABILITY_COLUMNS"
                row-key="key"
                size="small"
                class="agent-config__table"
              >
                <template #cell-name="{ row }">
                  <span class="agent-config__cell-name">{{ row.name }}</span>
                </template>
                <template #cell-description="{ row }">
                  <span class="agent-config__cell-desc">{{ row.description }}</span>
                </template>
                <template #cell-check="{ row }">
                  <NeumorphismCheckbox
                    :model-value="isRowOn(enabledModules, row)"
                    :disabled="row.readonly === true"
                    size="small"
                    @update:model-value="enabledModules = toggleRow(enabledModules, moduleItems, row)"
                  />
                </template>
              </NeumorphismTable>
            </div>
          </template>

          <template #header-tools>
            <span class="agent-config__sec-title">启用工具（按 pkg 分组）</span>
            <span class="agent-config__sec-summary">{{ toolLoading ? '…' : `${toolItems.length} 项` }}</span>
          </template>
          <template #tools>
            <LoadHint :phase="toolPhase" label="工具清单" @retry="requestTools" />
            <div v-if="!toolGroups.length && toolPhase === 'idle'" class="muted">（无）</div>
            <div v-for="g in toolGroups" :key="g.group" class="agent-config__pkg">
              <div class="agent-config__pkg-head">
                <NeumorphismCheckbox
                  :model-value="isGroupOn(enabledTools, g)"
                  :indeterminate="isGroupPartial(enabledTools, g)"
                  :label="`${g.group}（${g.items.length}）`"
                  size="small"
                  @update:model-value="enabledTools = toggleGroup(enabledTools, toolItems.map((i) => i.key), g)"
                />
              </div>
              <NeumorphismTable
                :data="tableRows(g.items)"
                :columns="CAPABILITY_COLUMNS"
                row-key="key"
                size="small"
                class="agent-config__table"
              >
                <template #cell-name="{ row }">
                  <span class="agent-config__cell-name">{{ row.name }}</span>
                </template>
                <template #cell-description="{ row }">
                  <span class="agent-config__cell-desc">{{ row.description }}</span>
                </template>
                <template #cell-check="{ row }">
                  <NeumorphismCheckbox
                    :model-value="isRowOn(enabledTools, row)"
                    size="small"
                    @update:model-value="enabledTools = toggleRow(enabledTools, toolItems, row)"
                  />
                </template>
              </NeumorphismTable>
            </div>
          </template>

          <template #header-skills>
            <span class="agent-config__sec-title">启用技能（按 pkg 分组）</span>
            <span class="agent-config__sec-summary">{{ skillLoading ? '…' : `${skillItems.length} 项` }}</span>
          </template>
          <template #skills>
            <LoadHint :phase="skillPhase" label="技能清单" @retry="requestSkills" />
            <div v-if="!skillGroups.length && skillPhase === 'idle'" class="muted">（无）</div>
            <div v-for="g in skillGroups" :key="g.group" class="agent-config__pkg">
              <div class="agent-config__pkg-head">
                <NeumorphismCheckbox
                  :model-value="isGroupOn(enabledSkills, g)"
                  :indeterminate="isGroupPartial(enabledSkills, g)"
                  :label="`${g.group}（${g.items.length}）`"
                  size="small"
                  @update:model-value="enabledSkills = toggleGroup(enabledSkills, skillItems.map((i) => i.key), g)"
                />
              </div>
              <NeumorphismTable
                :data="tableRows(g.items)"
                :columns="CAPABILITY_COLUMNS"
                row-key="key"
                size="small"
                class="agent-config__table"
              >
                <template #cell-name="{ row }">
                  <span class="agent-config__cell-name">{{ row.name }}</span>
                </template>
                <template #cell-description="{ row }">
                  <span class="agent-config__cell-desc">{{ row.description }}</span>
                </template>
                <template #cell-check="{ row }">
                  <NeumorphismCheckbox
                    :model-value="isRowOn(enabledSkills, row)"
                    size="small"
                    @update:model-value="enabledSkills = toggleRow(enabledSkills, skillItems, row)"
                  />
                </template>
              </NeumorphismTable>
            </div>
          </template>
        </NeumorphismCollapse>
      </div>

      <div class="agent-config__foot">
        <NeumorphismButton size="small" variant="glass" @click="emit('close')">取消</NeumorphismButton>
        <NeumorphismButton size="small" variant="primary" @click="save">保存</NeumorphismButton>
      </div>
    </div>
  </SessionOverlay>
</template>

<style scoped>
/* 内容容器：外壳由 `SessionOverlay` 提供（几何 = 会话消息区），这里只负责
   内部排版——头部 + 可滚动的表单体 + 底部操作条。 */
.agent-config {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.agent-config__head {
  background: linear-gradient(
    color-mix(in srgb, #ffffff 6%, transparent),
    transparent
  );
}
.agent-config__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--nm-border-subtle);
}
.agent-config__head h3 { margin: 0; font-size: 15px; }
.agent-config__id { font-size: 11px; color: var(--nm-text-secondary); font-family: var(--nm-font-mono, monospace); }
.agent-config__body {
  padding: 12px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
/* 库 FormItem 自带标签与下边距；弹层内收窄一点更紧凑 */
.agent-config__body :deep(.nm-form-item) {
  margin-bottom: 10px;
}
.agent-config__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  margin: 2px 0 10px;
}
.agent-config__group { margin-bottom: 10px; }
.agent-config__group-title { font-size: 12px; font-weight: 600; color: var(--nm-text-secondary); margin-bottom: 6px; }
.agent-config__hint { margin: 0 0 6px; font-size: 11px; }
/* 能力分区：折叠头 = 标题 + 摘要（撑满整行） */
.agent-config__sec-title { font-size: 12.5px; font-weight: 600; }
.agent-config__sec-summary { margin-left: auto; font-size: 11px; color: var(--nm-text-secondary); }
.agent-config__body :deep(.nm-collapse__trigger) { width: 100%; }
.agent-config__body :deep(.nm-collapse) { margin-bottom: 10px; }
/* pkg 分组块：容器只负责边框与分块，内部 checkbox / 表格均为库组件 */
.agent-config__pkg {
  border: 1px solid var(--nm-border-subtle);
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
}
.agent-config__pkg-head {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--nm-text-primary) 5%, transparent);
  border-bottom: 1px solid var(--nm-border-subtle);
}
/* 表格融入玻璃面：库的 wrapper 自带实底 + 内凹投影（设计为落在页面底色上），
   弹层内改成透明（保留结构/间距/悬浮行），避免在磨砂面上贴一块实色块 */
.agent-config__table :deep(.nm-table__wrapper) {
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}
.agent-config__table :deep(.nm-table__head) {
  background: color-mix(in srgb, var(--nm-text-primary) 4%, transparent);
}
.agent-config__cell-name { font-weight: 600; white-space: nowrap; }
.agent-config__cell-desc {
  display: block;
  color: var(--nm-text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-config__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 18px 14px;
  border-top: 1px solid var(--nm-border-subtle);
}

/* 竖屏移动端（2026-10，断点 768px）：覆盖层几何从「贴会话框 12px」收为
   6px 近全屏（最大化内容宽度）；内容内的表格靠横向滚动兜底。 */
@media (max-width: 767.98px) {
  /* 几何由 `SessionOverlay` 统一（= 消息区矩形，窄屏自然接近全屏），
     这里只收紧内部留白。 */
  .agent-config__head {
    padding: 10px 12px 8px;
  }
}
</style>
