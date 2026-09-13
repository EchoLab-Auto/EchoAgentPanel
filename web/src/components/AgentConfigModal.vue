<script setup lang="ts">
//! Agent 配置悬浮弹层：在会话区上方打开的轻量配置卡片，
//! 对应资源页的 Team 编辑（系统提示词 / 启用 / 能力白名单）。
//!
//! 内层元素全部使用 ui-frame 组件（FormItem/Input/Textarea/Switch/Checkbox/
//! Collapse/Table/Tag/Divider/Select/Segmented/Button）；外壳是库
//! `NeumorphismCard glass`（磨砂配方见样式区）。

import { computed, onMounted, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismCard,
  NeumorphismCheckbox,
  NeumorphismCollapse,
  NeumorphismDivider,
  NeumorphismFormItem,
  NeumorphismInput,
  NeumorphismSegmented,
  NeumorphismSelect,
  NeumorphismSwitch,
  NeumorphismTable,
  NeumorphismTextarea,
} from '@echolab-auto/ui-frame';
import type { TableColumn } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import type { LoopMode, TeamInfo } from '../protocol';
import { applyMode, deriveMode, stripLegacyModeIds } from '../loop-mode';

const props = defineProps<{
  team: TeamInfo;
  /** 卡片底部距视图底部的偏移（px），用于避开输入区/配置按钮 */
  bottomOffset?: number;
}>();
const emit = defineEmits<{ close: [] }>();

// 弹层每次打开都会重新挂载（v-if）：挂载时拉取能力列表，
// 确保工具/技能/插件表格有数据（未进过资源页时 state 为空）。
onMounted(() => {
  sendCommand('RequestSkillsList');
  sendCommand('RequestToolsList');
  sendCommand('RequestPluginsList');
});

// ── 表单字段（打开时从 team 初始化） ──
const name = ref('');
const description = ref('');
const systemPrompt = ref('');
const enabled = ref(true);
const disabledTools = ref<string[]>([]);
const disabledSkills = ref<string[]>([]);
const enabledPlugins = ref<string[]>([]);
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
    enabledPlugins.value = t.enabled_plugins ?? [];
    enabledTools.value = t.enabled_tools ?? [];
    enabledSkills.value = t.enabled_skills ?? [];
    apiProfile.value = t.api_profile ?? '';
  },
  { immediate: true },
);

// ── 包（pkg）名称映射：同 pkg 的工具/技能视作一个整体分组 ──
const PACKAGE_NAMES: Record<string, string> = {
  'echo-agent.adapter.qq': 'QQ 适配器包',
  'echo-agent.orchestration': '编排工具包',
  'echo-agent.tools.builtin': '内置工具集',
  'echo-agent.skills.dir': '技能目录',
  'echo-agent.workspace': '工作区会话',
};

interface GroupedItem {
  key: string;
  name: string;
  description: string;
  /** 所属分组（pkg 名或类别/空 = 未分组） */
  group?: string;
}

/** 工具：按 package 分组（无 package 按 category） */
const toolItems = computed<GroupedItem[]>(() =>
  state.tools.map((t) => ({
    key: t.name,
    name: t.name,
    description: t.description || '（无描述）',
    group: t.package ? (PACKAGE_NAMES[t.package] ?? t.package) : t.category || undefined,
  })),
);
/** 技能：按 package 分组（无 package 按 category） */
const skillItems = computed<GroupedItem[]>(() =>
  state.skills.map((sk) => ({
    key: sk.name,
    name: sk.name,
    description: sk.description || '（无描述）',
    group: sk.package ? (PACKAGE_NAMES[sk.package] ?? sk.package) : sk.category || undefined,
  })),
);
/** 插件：管理/适配器类与包维度门控插件（按 kind 分组展示）。
 * 包维度门控插件（工具集/技能目录/清单/工作区）是"整类能力"开关，
 * 其余 tool/orchestration 插件由工具/包层面勾选，不出现在此列表。 */
const pluginItems = computed<GroupedItem[]>(() =>
  state.plugins
    .filter((p) =>
      ['adapter', 'management'].includes(p.kind) ||
      [
        'echo-agent.tools.builtin',
        'echo-agent.skills.dir',
        'echo-agent.checklist',
        'echo-agent.workspace',
      ].includes(p.id),
    )
    .map((p) => ({
      key: p.id,
      name: p.name,
      description: p.description || '（无描述）',
      group: p.kind === 'adapter' ? '适配器' : '管理面',
    })),
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
    .map(([group, list]) => ({ group, items: list.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.group.localeCompare(b.group));
}
const toolGroups = computed(() => groupBy(toolItems.value));
const skillGroups = computed(() => groupBy(skillItems.value));
const pluginGroups = computed(() => groupBy(pluginItems.value));

/** 白名单语义：列表为空 = 全部启用（全选状态） */
function isItemOn(list: string[], key: string): boolean {
  return list.length === 0 || list.includes(key);
}
/** 组内全部启用？ */
function isGroupOn(list: string[], group: GroupedTable): boolean {
  return list.length === 0 || group.items.every((i) => list.includes(i.key));
}
/** 组内部分启用（用于 checkbox 的 indeterminate 态） */
function isGroupPartial(list: string[], group: GroupedTable): boolean {
  if (list.length === 0) return false;
  const on = group.items.filter((i) => list.includes(i.key)).length;
  return on > 0 && on < group.items.length;
}
/** 切换单项（白名单为空时先以全量初始化再切换） */
function toggleItem(list: string[], all: string[], key: string): string[] {
  const base = list.length ? list : [...all];
  return base.includes(key) ? base.filter((k) => k !== key) : [...base, key];
}
/** 切换整组 */
function toggleGroup(list: string[], all: string[], group: GroupedTable): string[] {
  const base = list.length ? list : [...all];
  const keys = group.items.map((i) => i.key);
  const on = group.items.every((i) => base.includes(i.key));
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
  return isItemOn(list, rowKeyOf(row));
}
function toggleRow(list: string[], all: GroupedItem[], row: Record<string, unknown>): string[] {
  return toggleItem(
    list,
    all.map((i) => i.key),
    rowKeyOf(row),
  );
}

/** 能力分区（可折叠；默认全展开，保持与旧版一致的初始视图） */
const CAP_SECTIONS = [
  { key: 'plugins', title: '启用插件' },
  { key: 'tools', title: '启用工具（按 pkg 分组）' },
  { key: 'skills', title: '启用技能（按 pkg 分组）' },
];
const openSections = ref<string[]>(CAP_SECTIONS.map((s) => s.key));

const bottomPx = computed(() => `${props.bottomOffset ?? 42}px`);

// ── 循环模式分段单选（互斥循环插件，写入 enabled_plugins 白名单） ──
const MODE_OPTIONS = [
  { label: '单会话（默认）', value: 'single' },
  { label: '并行多会话', value: 'parallel' },
];
const loopMode = computed(() => deriveMode(enabledPlugins.value));

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
function setLoopMode(value: string | number | (string | number)[] | undefined) {
  enabledPlugins.value = applyMode(
    enabledPlugins.value,
    String(value ?? 'single') as LoopMode,
    state.plugins.map((p) => p.id),
  );
}

function save() {
  if (!name.value.trim()) return;
  sendCommand({
    SaveTeam: {
      id: props.team.id,
      name: name.value.trim(),
      description: description.value.trim(),
      system_prompt: systemPrompt.value,
      enabled: enabled.value,
      disabled_tools: disabledTools.value,
      disabled_skills: disabledSkills.value,
      enabled_plugins: stripLegacyModeIds(enabledPlugins.value),
      enabled_tools: enabledTools.value,
      enabled_skills: enabledSkills.value,
      api_profile: apiProfile.value || null,
    },
  });
  emit('close');
}
</script>

<template>
  <div class="agent-config-overlay" @click.self="emit('close')">
    <!-- 玻璃外壳 = ui-frame NeumorphismCard（glass）；尺寸/定位与库 glass 的
         面板化微调见样式区，内层布局保持不变。 -->
    <NeumorphismCard glass no-padding class="agent-config">
      <div class="agent-config__head">
        <div>
          <h3>配置 Agent：{{ props.team.name }}</h3>
          <span class="agent-config__id">{{ props.team.id }}</span>
        </div>
        <NeumorphismButton size="small" variant="glass" @click="emit('close')">✕</NeumorphismButton>
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

        <div class="agent-config__group">
          <div class="agent-config__group-title">循环模式</div>
          <p class="muted agent-config__hint">
            单会话 = 同一会话的 turn 串行排队、无会话管理 UI（默认）；并行多会话 = 同一会话可并发分支、显示会话列表 / 全局会话 / 可见回执分支。另启一个会话即另一条并行通道。
          </p>
          <NeumorphismSegmented
            :model-value="loopMode"
            :options="MODE_OPTIONS"
            size="small"
            @update:model-value="setLoopMode"
          />
        </div>

        <!-- 能力分区（ui-frame NeumorphismCollapse；pkg 分组 + 表格） -->
        <NeumorphismCollapse v-model="openSections" :items="CAP_SECTIONS" size="small">
          <template #header-plugins>
            <span class="agent-config__sec-title">启用插件</span>
            <span class="agent-config__sec-summary">{{ pluginItems.length }} 项</span>
          </template>
          <template #plugins>
            <div v-if="!pluginGroups.length" class="muted">（无）</div>
            <div v-for="g in pluginGroups" :key="g.group" class="agent-config__pkg">
              <div class="agent-config__pkg-head">
                <NeumorphismCheckbox
                  :model-value="isGroupOn(enabledPlugins, g)"
                  :indeterminate="isGroupPartial(enabledPlugins, g)"
                  :label="`${g.group}（${g.items.length}）`"
                  size="small"
                  @update:model-value="enabledPlugins = toggleGroup(enabledPlugins, pluginItems.map((i) => i.key), g)"
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
                    :model-value="isRowOn(enabledPlugins, row)"
                    size="small"
                    @update:model-value="enabledPlugins = toggleRow(enabledPlugins, pluginItems, row)"
                  />
                </template>
              </NeumorphismTable>
            </div>
          </template>

          <template #header-tools>
            <span class="agent-config__sec-title">启用工具（按 pkg 分组）</span>
            <span class="agent-config__sec-summary">{{ toolItems.length }} 项</span>
          </template>
          <template #tools>
            <div v-if="!toolGroups.length" class="muted">（无）</div>
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
            <span class="agent-config__sec-summary">{{ skillItems.length }} 项</span>
          </template>
          <template #skills>
            <div v-if="!skillGroups.length" class="muted">（无）</div>
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
    </NeumorphismCard>
  </div>
</template>

<style scoped>
.agent-config-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
}
/* 玻璃外壳 = ui-frame NeumorphismCard（glass）：距会话框 上/左/右 12px，
   下边框距配置按钮上边框 12px。库负责玻璃语义（--nm-glass-* 与圆角/结构），
   这里只做定位 + 面板化微调——背景与模糊走库 token，圆角/边框/投影按
   .ctx-overlay__panel 的既有配方覆写（库无对应 token，且 blur 需带 saturate）。 */
.agent-config-overlay .agent-config {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  bottom: v-bind(bottomPx);
  display: flex;
  flex-direction: column;
  --nm-glass-bg: color-mix(in srgb, var(--nm-surface-raised) 42%, transparent);
  --nm-glass-blur: 24px;
  /* 表格密度对齐弹层（库默认 small 行为 8px/12px，弹层内更紧凑） */
  --nm-table-cell-padding-y-sm: 5px;
  --nm-table-cell-padding-x-sm: 10px;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, #ffffff 16%, transparent);
  backdrop-filter: blur(var(--nm-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--nm-glass-blur)) saturate(1.6);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
/* 库的内容槽：让头部/滚动区/脚部仍是外壳的直接弹性子项（布局不变） */
.agent-config :deep(.nm-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
/* 头部/脚部随玻璃面半透明处理 */
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
</style>
