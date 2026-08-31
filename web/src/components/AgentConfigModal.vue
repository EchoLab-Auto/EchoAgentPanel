<script setup lang="ts">
//! Agent 配置悬浮弹层：在会话区上方打开的轻量配置卡片，
//! 对应资源页的 Team 编辑（系统提示词 / 启用 / 能力白名单）。

import { computed, onMounted, ref, watch } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import type { TeamInfo } from '../protocol';

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
const disabledPlugins = ref<string[]>([]);
const disabledTools = ref<string[]>([]);
const disabledSkills = ref<string[]>([]);
const enabledPlugins = ref<string[]>([]);
const enabledTools = ref<string[]>([]);
const enabledSkills = ref<string[]>([]);

watch(
  () => props.team,
  (t) => {
    name.value = t.name;
    description.value = t.description;
    systemPrompt.value = t.system_prompt ?? '';
    enabled.value = t.enabled;
    disabledPlugins.value = t.disabled_plugins ?? [];
    disabledTools.value = t.disabled_tools ?? [];
    disabledSkills.value = t.disabled_skills ?? [];
    enabledPlugins.value = t.enabled_plugins ?? [];
    enabledTools.value = t.enabled_tools ?? [];
    enabledSkills.value = t.enabled_skills ?? [];
  },
  { immediate: true },
);

// ── 包（pkg）名称映射：同 pkg 的工具/技能视作一个整体分组 ──
const PACKAGE_NAMES: Record<string, string> = {
  'echo-agent.adapter.qq': 'QQ 适配器包',
  'echo-agent.orchestration': '编排工具包',
  'echo-agent.tools.builtin': '内置工具集',
  'echo-agent.skills.dir': '技能目录',
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
/** 插件：管理/适配器类（无 pkg 概念，按 kind 分组展示） */
const pluginItems = computed<GroupedItem[]>(() =>
  state.plugins
    .filter((p) => ['adapter', 'management'].includes(p.kind))
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

const bottomPx = computed(() => `${props.bottomOffset ?? 42}px`);

function save() {
  if (!name.value.trim()) return;
  sendCommand({
    SaveTeam: {
      id: props.team.id,
      name: name.value.trim(),
      description: description.value.trim(),
      system_prompt: systemPrompt.value,
      enabled: enabled.value,
      disabled_plugins: disabledPlugins.value,
      disabled_tools: disabledTools.value,
      disabled_skills: disabledSkills.value,
      enabled_plugins: enabledPlugins.value,
      enabled_tools: enabledTools.value,
      enabled_skills: enabledSkills.value,
    },
  });
  emit('close');
}
</script>

<template>
  <div class="agent-config-overlay" @click.self="emit('close')">
    <div class="agent-config">
      <div class="agent-config__head">
        <div>
          <h3>配置 Agent：{{ props.team.name }}</h3>
          <span class="agent-config__id">{{ props.team.id }}</span>
        </div>
        <NeumorphismButton size="small" variant="flat" @click="emit('close')">✕</NeumorphismButton>
      </div>

      <div class="agent-config__body">
        <label class="agent-config__field">
          <span>名称</span>
          <input v-model="name" class="agent-config__input" />
        </label>
        <label class="agent-config__field">
          <span>描述</span>
          <input v-model="description" class="agent-config__input" />
        </label>
        <label class="agent-config__field">
          <span>系统提示词（留空继承全局）</span>
          <textarea v-model="systemPrompt" class="agent-config__textarea" rows="4" />
        </label>

        <div class="agent-config__row">
          <span>启用（禁用即卸载记忆）</span>
          <label class="agent-config__switch">
            <input v-model="enabled" type="checkbox" />
            <span class="agent-config__switch-track" />
          </label>
        </div>

        <div class="agent-config__group">
          <div class="agent-config__group-title">启用插件</div>
          <div v-if="!pluginGroups.length" class="muted">（无）</div>
          <div v-for="g in pluginGroups" :key="g.group" class="agent-config__pkg">
            <div class="agent-config__pkg-head">
              <label class="agent-config__pkg-check">
                <input
                  type="checkbox"
                  :checked="isGroupOn(enabledPlugins, g)"
                  @change="enabledPlugins = toggleGroup(enabledPlugins, pluginItems.map((i) => i.key), g)"
                />
                <span>{{ g.group }}（{{ g.items.length }}）</span>
              </label>
            </div>
            <table class="agent-config__table">
              <thead>
                <tr><th class="agent-config__th-name">名称</th><th>介绍</th><th class="agent-config__th-check">启用</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in g.items" :key="item.key">
                  <td class="agent-config__td-name">{{ item.name }}</td>
                  <td class="agent-config__td-desc">{{ item.description }}</td>
                  <td class="agent-config__td-check">
                    <input
                      type="checkbox"
                      :checked="isItemOn(enabledPlugins, item.key)"
                      @change="enabledPlugins = toggleItem(enabledPlugins, pluginItems.map((i) => i.key), item.key)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="agent-config__group">
          <div class="agent-config__group-title">启用工具（按 pkg 分组）</div>
          <div v-if="!toolGroups.length" class="muted">（无）</div>
          <div v-for="g in toolGroups" :key="g.group" class="agent-config__pkg">
            <div class="agent-config__pkg-head">
              <label class="agent-config__pkg-check">
                <input
                  type="checkbox"
                  :checked="isGroupOn(enabledTools, g)"
                  @change="enabledTools = toggleGroup(enabledTools, toolItems.map((i) => i.key), g)"
                />
                <span>{{ g.group }}（{{ g.items.length }}）</span>
              </label>
            </div>
            <table class="agent-config__table">
              <thead>
                <tr><th class="agent-config__th-name">名称</th><th>介绍</th><th class="agent-config__th-check">启用</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in g.items" :key="item.key">
                  <td class="agent-config__td-name">{{ item.name }}</td>
                  <td class="agent-config__td-desc">{{ item.description }}</td>
                  <td class="agent-config__td-check">
                    <input
                      type="checkbox"
                      :checked="isItemOn(enabledTools, item.key)"
                      @change="enabledTools = toggleItem(enabledTools, toolItems.map((i) => i.key), item.key)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="agent-config__group">
          <div class="agent-config__group-title">启用技能（按 pkg 分组）</div>
          <div v-if="!skillGroups.length" class="muted">（无）</div>
          <div v-for="g in skillGroups" :key="g.group" class="agent-config__pkg">
            <div class="agent-config__pkg-head">
              <label class="agent-config__pkg-check">
                <input
                  type="checkbox"
                  :checked="isGroupOn(enabledSkills, g)"
                  @change="enabledSkills = toggleGroup(enabledSkills, skillItems.map((i) => i.key), g)"
                />
                <span>{{ g.group }}（{{ g.items.length }}）</span>
              </label>
            </div>
            <table class="agent-config__table">
              <thead>
                <tr><th class="agent-config__th-name">名称</th><th>介绍</th><th class="agent-config__th-check">启用</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in g.items" :key="item.key">
                  <td class="agent-config__td-name">{{ item.name }}</td>
                  <td class="agent-config__td-desc">{{ item.description }}</td>
                  <td class="agent-config__td-check">
                    <input
                      type="checkbox"
                      :checked="isItemOn(enabledSkills, item.key)"
                      @change="enabledSkills = toggleItem(enabledSkills, skillItems.map((i) => i.key), item.key)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="agent-config__foot">
        <NeumorphismButton size="small" variant="flat" @click="emit('close')">取消</NeumorphismButton>
        <NeumorphismButton size="small" variant="primary" @click="save">保存</NeumorphismButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-config-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
}
/* 磨砂玻璃卡片：距会话框 上/左/右 12px，下边框距配置按钮上边框 12px */
.agent-config {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  bottom: v-bind(bottomPx);
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, #ffffff 16%, transparent);
  background: color-mix(in srgb, var(--nm-surface-raised) 42%, transparent);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  overflow: hidden;
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
  gap: 10px;
}
.agent-config__field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--nm-text-secondary); }
.agent-config__input, .agent-config__textarea {
  background: var(--nm-bg-color);
  border: 1px solid var(--nm-border-color);
  border-radius: 8px;
  color: var(--nm-text-primary);
  padding: 7px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}
.agent-config__row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.agent-config__switch input { display: none; }
.agent-config__switch-track {
  width: 38px; height: 20px; border-radius: 10px; display: inline-block;
  background: var(--nm-border-color); position: relative; cursor: pointer; transition: background 0.15s;
}
.agent-config__switch-track::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: transform 0.15s;
}
.agent-config__switch input:checked + .agent-config__switch-track { background: var(--panel-accent); }
.agent-config__switch input:checked + .agent-config__switch-track::after { transform: translateX(18px); }
.agent-config__group-title { font-size: 12px; font-weight: 600; color: var(--nm-text-secondary); margin-bottom: 6px; }
/* pkg 分组块 */
.agent-config__pkg {
  border: 1px solid var(--nm-border-subtle);
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
}
.agent-config__pkg-head {
  display: flex;
  align-items: center;
  padding: 7px 10px;
  background: color-mix(in srgb, var(--nm-text-primary) 5%, transparent);
  border-bottom: 1px solid var(--nm-border-subtle);
}
.agent-config__pkg-check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--nm-text-primary);
  cursor: pointer;
}
.agent-config__pkg-check input { accent-color: var(--panel-accent); }
/* 表格 */
.agent-config__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.agent-config__table th {
  text-align: left;
  padding: 5px 10px;
  color: var(--nm-text-secondary);
  font-weight: 600;
  font-size: 11px;
  border-bottom: 1px solid var(--nm-border-subtle);
  background: color-mix(in srgb, var(--nm-text-primary) 3%, transparent);
}
.agent-config__table td {
  padding: 5px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--nm-border-subtle) 50%, transparent);
  vertical-align: top;
}
.agent-config__table tr:last-child td { border-bottom: none; }
.agent-config__th-name, .agent-config__td-name { width: 170px; font-weight: 600; white-space: nowrap; }
.agent-config__th-check, .agent-config__td-check { width: 44px; text-align: center; }
.agent-config__td-check input { accent-color: var(--panel-accent); }
.agent-config__td-desc {
  color: var(--nm-text-secondary);
  line-height: 1.5;
  max-width: 0;
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
