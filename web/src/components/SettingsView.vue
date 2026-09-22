<script setup lang="ts">
//! 设置视图：API 配置 + 资源管理（技能/工具/插件/智能体）+ 运行日志的统一面板。
//!
//! 布局：左侧一级菜单（API 设置 + 四类资源 + 日志，带计数徽标），右侧为当前分类的工作区——
//! API 为整页表单（ApiSettings）；日志为整页查看器（LogView）；
//! 资源类为 工具条 + 条目列表（分组可折叠）+ 详情/编辑面板。
//! - API：快速模板 / 表单 / 测试连接 / Profiles（UpdateApiConfig / TestApi / SwitchApi / DeleteApi）
//! - 技能：启停、编辑（SaveSkill）、新建、删除（DeleteSkill）、Git 安装/更新/移除来源
//! - 工具：启停（ToggleTool）、参数 Schema 浏览
//! - 插件：启停（TogglePlugin）
//! - 智能体：选中即进编辑态（SaveTeam）、启停（ToggleTeam）、删除（DeleteTeam）
//! - 日志：Core/Panel 分段、5s 自动刷新（HTTP /api/logs/{core,panel}）
//! 数据来自后端 SkillsList / ToolsList / PluginsList / TeamsList 事件，打开时主动拉取；
//! API 配置随 state.api 事件更新。

import { computed, onMounted, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismCard,
  NeumorphismCheckbox,
  NeumorphismCollapse,
  NeumorphismDivider,
  NeumorphismEmpty,
  NeumorphismForm,
  NeumorphismFormItem,
  NeumorphismInput,
  NeumorphismModal,
  NeumorphismSegmented,
  NeumorphismSwitch,
  NeumorphismTag,
  NeumorphismTextarea,
} from '@echolab-auto/ui-frame';
import { state } from '../store';
import {
  PACKAGE_DISPLAY_NAMES,
  PLUGIN_KIND_LABELS,
  isPluginCheckboxVisible,
} from '../capabilities';
import { sendCommand } from '../connection';
import type { LoopMode, PluginInfo, SkillInfo, TeamInfo, ToolInfo } from '../protocol';
import { loopModeOf } from '../protocol';
import { applyMode, deriveMode, stripLegacyModeIds } from '../loop-mode';
import { MarkdownRenderer } from '@echolab-auto/ui-frame/doc';
import ApiSettings from './ApiSettings.vue';
import LogView from './LogView.vue';

const UNCATEGORIZED = '未分类';
const TOOL_BUILTIN = '内置工具';
const TOOL_OTHER = '扩展工具';

// ── 一级菜单：当前分类 ──
type CategoryKey = 'api' | 'skill' | 'tool' | 'plugin' | 'team' | 'logs';
const activeCategory = ref<CategoryKey>('api');

// count 为 null 的分类不显示计数徽标（日志无条目概念）
const categories = computed(() => [
  { key: 'api' as const, label: 'API 设置', count: (state.api?.profiles?.length ?? 0) as number | null },
  { key: 'skill' as const, label: '技能', count: state.skills.length as number | null },
  { key: 'tool' as const, label: '工具', count: state.tools.length as number | null },
  { key: 'plugin' as const, label: '插件', count: state.plugins.length as number | null },
  { key: 'team' as const, label: '智能体', count: state.teams.length as number | null },
  { key: 'logs' as const, label: '日志', count: null as number | null },
]);
const currentCategory = computed(
  () => categories.value.find((c) => c.key === activeCategory.value)!,
);
const disabledCount = computed(() => {
  switch (activeCategory.value) {
    case 'api':
    case 'logs':
      return 0;
    case 'skill':
      return state.skills.filter((s) => !s.enabled).length;
    case 'tool':
      return state.tools.filter((t) => !t.enabled).length;
    case 'plugin':
      return state.plugins.filter((p) => !p.enabled).length;
    case 'team':
      return state.teams.filter((t) => !t.enabled).length;
  }
});

/** 工具条副标题：API 显示当前生效配置；日志显示来源说明；资源类显示计数统计 */
const toolbarSubtitle = computed(() => {
  if (activeCategory.value === 'api') {
    const a = state.api;
    if (!a) return '配置尚未加载';
    return `当前：${a.provider || '—'} / ${a.model || '—'}${a.active_api ? ` · Profile「${a.active_api}」` : ''}`;
  }
  if (activeCategory.value === 'logs') {
    return 'Core / Panel 运行日志 · 自动刷新 5s';
  }
  if (activeCategory.value === 'skill') {
    const c = skillFilterCounts.value;
    const parts = [`共 ${c.all} 项`];
    if (c.disabled) parts.push(`${c.disabled} 已禁用`);
    if (c.always) parts.push(`${c.always} 常驻`);
    if (c.system) parts.push(`${c.system} 系统提示词`);
    if (c.git) parts.push(`${c.git} Git 来源`);
    return parts.join(' · ');
  }
  return `共 ${currentCategory.value.count} 项${disabledCount.value ? ` · ${disabledCount.value} 已禁用` : ''}`;
});

// ── 选中状态（各分类独立保持，切回时恢复）──
const selectedSkill = ref<SkillInfo | null>(null);
const selectedTool = ref<ToolInfo | null>(null);
const selectedPlugin = ref<PluginInfo | null>(null);
const selectedTeam = ref<TeamInfo | null>(null);
const editing = ref(false);
const creating = ref(false);

/** 切换分类 / 选中条目时丢弃未保存的编辑态 */
function resetTransient() {
  editing.value = false;
  creating.value = false;
  teamEditing.value = false;
}

function switchCategory(cat: CategoryKey) {
  if (activeCategory.value === cat) return;
  if (activeCategory.value === 'skill' && !confirmDiscardSkillEdit()) return;
  activeCategory.value = cat;
  resetTransient();
}

// ── 条目列表：按分类分组（组可折叠）──
const collapsedGroups = ref(new Set<string>());
function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsedGroups.value = next;
}
function isCollapsed(key: string): boolean {
  return collapsedGroups.value.has(key);
}




// ── 技能工作台（2026-09-23 重排版）：搜索 / 筛选 / 分组维度 / 使用面 ──
//
// 设计动机（用户反馈 + 实测）：
// - 技能全部没有 category，原「按分类」分组只会渲染出一个「未分类」组 → 默认
//   改为「按包」（package 是真实存在的门控单位，与智能体能力勾选区一致）；
// - 列表只显示名字，启停要逐个点进详情 → 行内 hover 快速开关 + 双行信息；
// - 「这技能什么时候进来」「关掉它会影响谁」答不出来 → 详情分区
//   「生效方式（触发词/常驻/系统提示词）」「被谁使用（按 TeamsList 反查）」。

/** 技能过滤维度（互斥单选） */
type SkillFilter = 'all' | 'enabled' | 'disabled' | 'always' | 'system' | 'git';
const skillSearch = ref('');
const skillFilter = ref<SkillFilter>('all');
const skillGroupBy = ref<'package' | 'category' | 'flat'>('package');

const SKILL_FILTERS: { key: SkillFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'enabled', label: '已启用' },
  { key: 'disabled', label: '已禁用' },
  { key: 'always', label: '常驻' },
  { key: 'system', label: '系统提示词' },
  { key: 'git', label: 'Git 来源' },
];

const SKILL_GROUP_OPTIONS = [
  { label: '按包', value: 'package' },
  { label: '按分类', value: 'category' },
  { label: '平铺', value: 'flat' },
];

function skillMatchesFilter(s: SkillInfo, filter: SkillFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'enabled':
      return s.enabled;
    case 'disabled':
      return !s.enabled;
    case 'always':
      return s.always;
    case 'system':
      return s.system === true;
    case 'git':
      return !!s.source;
  }
}

const skillFilterCounts = computed(() => {
  const counts: Record<SkillFilter, number> = {
    all: state.skills.length,
    enabled: 0,
    disabled: 0,
    always: 0,
    system: 0,
    git: 0,
  };
  for (const s of state.skills) {
    if (s.enabled) counts.enabled += 1;
    else counts.disabled += 1;
    if (s.always) counts.always += 1;
    if (s.system) counts.system += 1;
    if (s.source) counts.git += 1;
  }
  return counts;
});

const filteredSkills = computed(() => {
  const needle = skillSearch.value.trim().toLowerCase();
  return state.skills.filter((s) => {
    if (!skillMatchesFilter(s, skillFilter.value)) return false;
    if (!needle) return true;
    return (
      s.name.toLowerCase().includes(needle) ||
      (s.description ?? '').toLowerCase().includes(needle) ||
      s.keywords.some((k) => k.toLowerCase().includes(needle))
    );
  });
});

/** 包 → 显示名（已知门控包用中文名；自定义包名原样显示）。 */
function skillPackageLabel(pkg: string | undefined): string {
  if (!pkg) return '独立技能';
  return PACKAGE_DISPLAY_NAMES[pkg] ?? pkg;
}

/** 所属包的插件是否被禁用（禁用后包内技能对模型不可见）。 */
const disabledPluginIds = computed(
  () => new Set(state.plugins.filter((p) => !p.enabled).map((p) => p.id)),
);
function skillPackageDisabled(s: SkillInfo): boolean {
  return !!s.package && disabledPluginIds.value.has(s.package);
}

/** 工作台分组：按包 / 按分类 / 平铺（平铺 = 单组）。 */
const skillWorkbenchGroups = computed(() => {
  const groups = new Map<string, { title: string; hint?: string; items: SkillInfo[] }>();
  const push = (key: string, title: string, hint: string | undefined, s: SkillInfo) => {
    if (!groups.has(key)) groups.set(key, { title, hint, items: [] });
    groups.get(key)!.items.push(s);
  };
  for (const s of filteredSkills.value) {
    if (skillGroupBy.value === 'flat') {
      push('__all__', '全部技能', undefined, s);
    } else if (skillGroupBy.value === 'package') {
      const pkg = s.package?.trim();
      const key = pkg ? `pkg:${pkg}` : '__standalone__';
      push(
        key,
        skillPackageLabel(pkg),
        pkg && disabledPluginIds.value.has(pkg) ? '所属包已禁用，包内技能当前不可用' : undefined,
        s,
      );
    } else {
      const cat = s.category?.trim() ? s.category.trim() : UNCATEGORIZED;
      push(`cat:${cat}`, cat, undefined, s);
    }
  }
  const entries = [...groups.entries()].map(([key, v]) => ({
    key,
    title: v.title,
    hint: v.hint,
    items: v.items.sort((a, b) => a.name.localeCompare(b.name)),
  }));
  // 平铺不排序；其余按名称排序，但把「独立技能」放最后。
  if (skillGroupBy.value === 'flat') return entries;
  return entries.sort((a, b) => {
    if (a.key === '__standalone__') return 1;
    if (b.key === '__standalone__') return -1;
    return a.title.localeCompare(b.title);
  });
});

/** 技能使用面（被谁使用）：按 TeamsList 反查白名单 / 系统技能 / 禁用。 */
const skillUsageRows = computed(() => {
  const skill = selectedSkill.value;
  if (!skill) return [] as { team: string; label: string; variant: 'primary' | 'error' | 'info' | 'success' }[];
  const rows: { team: string; label: string; variant: 'primary' | 'error' | 'info' | 'success' }[] = [];
  for (const t of state.teams) {
    const name = t.name || t.id;
    if ((t.system_skills ?? []).includes(skill.name)) {
      rows.push({ team: name, label: '系统提示词注入', variant: 'primary' });
    } else if ((t.disabled_skills ?? []).includes(skill.name)) {
      rows.push({ team: name, label: '已禁用', variant: 'error' });
    } else if ((t.enabled_skills ?? []).length && !(t.enabled_skills ?? []).includes(skill.name)) {
      rows.push({ team: name, label: '未列入白名单', variant: 'info' });
    } else {
      rows.push({ team: name, label: '可用', variant: 'success' });
    }
  }
  return rows;
});

/** 技能行内快速开关（不改变选中）。 */
function quickToggleSkill(skill: SkillInfo, enabled: boolean) {
  sendCommand({ ToggleSkill: { name: skill.name, enabled } });
}

/** 用当前技能字段打补丁后保存（详情内的就地操作：常驻/系统/触发词）。 */
function saveSkillPatch(skill: SkillInfo, patch: Partial<SkillInfo>) {
  const merged = { ...skill, ...patch };
  sendCommand({
    SaveSkill: {
      name: merged.name,
      description: merged.description ?? '',
      keywords: merged.keywords ?? [],
      always: merged.always,
      category: merged.category ?? '',
      content: merged.content ?? '',
      system: merged.system ?? false,
    },
  });
}

function toggleSkillAlways(skill: SkillInfo, always: boolean) {
  saveSkillPatch(skill, { always });
}

function toggleSkillSystem(skill: SkillInfo, system: boolean) {
  if (
    system &&
    !window.confirm(
      `将「${skill.name}」设为系统提示词技能？\n\n其内容会注入该智能体的 base 区（身份/规则层），影响所有启用它的智能体，而不仅是触发词命中时。`,
    )
  ) {
    return;
  }
  saveSkillPatch(skill, { system });
}

function addSkillKeyword(skill: SkillInfo, keyword: string) {
  const kw = keyword.trim();
  if (!kw || skill.keywords.includes(kw)) return;
  saveSkillPatch(skill, { keywords: [...skill.keywords, kw] });
}

function removeSkillKeyword(skill: SkillInfo, keyword: string) {
  saveSkillPatch(skill, { keywords: skill.keywords.filter((k) => k !== keyword) });
}

// 详情 ⋯ 菜单（编辑/删除/更新/移除来源收进菜单）
const skillMenuOpen = ref(false);
// 内容区预览/源码切换
const skillContentMode = ref<'preview' | 'source'>('preview');
// 触发词就地添加输入（每个技能详情一个）
const skillKeywordDraft = ref('');
// 切换选中技能：清空临时态（就地输入 / 菜单 / 预览模式）
watch(
  () => selectedSkill.value?.name,
  () => {
    skillKeywordDraft.value = '';
    skillMenuOpen.value = false;
    skillContentMode.value = 'preview';
  },
);

// ── 列表宽度拖拽（技能工作台：列表 ↔ 详情分栏可调）──
const CAPS_LIST_WIDTH_KEY = 'echo-panel-caps-list-width';
const capsListWidth = ref(loadCapsListWidth());
function loadCapsListWidth(): number {
  try {
    const raw = Number(localStorage.getItem(CAPS_LIST_WIDTH_KEY));
    if (Number.isFinite(raw) && raw >= 220 && raw <= 560) return raw;
  } catch {
    // ignore storage errors
  }
  return 320;
}
function startCapsListResize(event: MouseEvent) {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = capsListWidth.value;
  const onMove = (e: MouseEvent) => {
    const next = Math.min(560, Math.max(220, startWidth + (e.clientX - startX)));
    capsListWidth.value = next;
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    try {
      localStorage.setItem(CAPS_LIST_WIDTH_KEY, String(capsListWidth.value));
    } catch {
      // ignore storage errors
    }
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// ── 技能编辑脏状态：切换条目前确认，页脚常显未保存提示 ──
const skillFormSnapshot = ref('');
function skillSnapshotOf(): string {
  return [
    formName.value,
    formDescription.value,
    formKeywords.value,
    formCategory.value,
    formAlways.value,
    formSystem.value,
    formContent.value,
  ].join('\u0000');
}
const skillFormDirty = computed(
  () =>
    (editing.value || creating.value) &&
    !!skillFormSnapshot.value &&
    skillSnapshotOf() !== skillFormSnapshot.value,
);

/** 有未保存改动时询问；返回 false = 取消当前动作。 */
function confirmDiscardSkillEdit(): boolean {
  if (!skillFormDirty.value) return true;
  return window.confirm('技能编辑尚未保存，放弃更改？');
}

const pluginGroups = computed(() => {
  const groups = new Map<string, PluginInfo[]>();
  for (const p of state.plugins) {
    const cat = PLUGIN_KIND_LABELS[p.kind] ?? p.kind;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(p);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, items]) => ({
      cat,
      items: items.sort((a, b) => a.id.localeCompare(b.id)),
    }));
});

const toolGroups = computed(() => {
  const groups = new Map<string, ToolInfo[]>();
  for (const t of state.tools) {
    const cat = t.category?.trim()
      ? t.category === 'builtin'
        ? TOOL_BUILTIN
        : t.category
      : TOOL_OTHER;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(t);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, items]) => ({
      cat,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
});

// 智能体平铺列表：一律平等，按 id 排序（去主智能体 2026-09）
const teamList = computed(() => [...state.teams].sort((a, b) => a.id.localeCompare(b.id)));

// ── 条目选中 ──
function selectSkillItem(s: SkillInfo) {
  if (selectedSkill.value?.name !== s.name && !confirmDiscardSkillEdit()) return;
  resetTransient();
  skillMenuOpen.value = false;
  selectedSkill.value = s;
}
function selectToolItem(t: ToolInfo) {
  resetTransient();
  selectedTool.value = t;
}
function selectPluginItem(p: PluginInfo) {
  resetTransient();
  selectedPlugin.value = p;
}
function selectTeamItem(t: TeamInfo) {
  editing.value = false;
  creating.value = false;
  selectedTeam.value = t;
  // 直接进入编辑态（无需再点"编辑"按钮）
  startTeamEdit(t);
}

// ── 空态提示 ──
const EMPTY_HINT: Record<CategoryKey, string> = {
  api: '',
  skill: '在左侧列表选择技能查看详情；或点右上角「新建技能」',
  tool: '在左侧列表选择工具，查看参数 Schema 与启停',
  plugin: '在左侧列表选择插件查看详情与启停',
  team: '在左侧列表选择智能体进行配置；或点右上角「新建智能体」',
  logs: '',
};
const showEmpty = computed(() => {
  switch (activeCategory.value) {
    case 'api':
    case 'logs':
      return false;
    case 'skill':
      return !selectedSkill.value && !editing.value && !creating.value;
    case 'tool':
      return !selectedTool.value;
    case 'plugin':
      return !selectedPlugin.value;
    case 'team':
      return !selectedTeam.value && !teamEditing.value;
  }
});

// ── Team 成员编辑（ui-frame 表单模型，NeumorphismForm 受控）──
const teamFormId = ref('');
const teamFormName = ref('');
const teamFormDescription = ref('');
const teamFormPrompt = ref('');
const teamFormEnabled = ref(true);
const teamEditing = ref(false);
const teamFormDisabledTools = ref<string[]>([]);
const teamFormDisabledSkills = ref<string[]>([]);
const teamFormEnabledPlugins = ref<string[]>([]);
const teamFormEnabledTools = ref<string[]>([]);
const teamFormEnabledSkills = ref<string[]>([]);
const teamFormSystemSkills = ref<string[]>([]);
/** 编辑已有成员时 ID 锁定；新建时 ID 可自由输入 */
const teamFormIsEdit = ref(false);

const teamFormModel = computed(() => ({
  id: teamFormId.value,
  name: teamFormName.value,
  description: teamFormDescription.value,
  system_prompt: teamFormPrompt.value,
  enabled: teamFormEnabled.value,
  disabled_tools: teamFormDisabledTools.value,
  disabled_skills: teamFormDisabledSkills.value,
  enabled_plugins: teamFormEnabledPlugins.value,
  enabled_tools: teamFormEnabledTools.value,
  enabled_skills: teamFormEnabledSkills.value,
  system_skills: teamFormSystemSkills.value,
}));

// 能力列表（复选框）：插件 / 工具 / 技能
// 插件级勾选只保留"整类能力"：kind ∈ {adapter, management} ∪ 包维度门控
// 插件（判定单一来源 = capabilities.ts::isPluginCheckboxVisible；
// 编排互斥子插件由「编排模式」分段控件管理）。
const capabilityPluginOptions = computed(() =>
  state.plugins
    .filter((p) => isPluginCheckboxVisible(p))
    .map((p) => ({
      key: p.id,
      label: `${p.name}（${PLUGIN_KIND_LABELS[p.kind] ?? p.kind}）`,
    })),
);
// ── 包（package）机制：同 package 的工具+技能可视作一个整体勾选/取消 ──
// 包显示名单一来源 = capabilities.ts::PACKAGE_DISPLAY_NAMES。

const capabilityPackages = computed(() => {
  const map = new Map<string, { tools: string[]; skills: string[] }>();
  for (const t of state.tools) {
    if (!t.package) continue;
    if (!map.has(t.package)) map.set(t.package, { tools: [], skills: [] });
    map.get(t.package)!.tools.push(t.name);
  }
  for (const sk of state.skills) {
    if (!sk.package) continue;
    if (!map.has(sk.package)) map.set(sk.package, { tools: [], skills: [] });
    map.get(sk.package)!.skills.push(sk.name);
  }
  return [...map.entries()].map(([id, v]) => ({
    id,
    name: PACKAGE_DISPLAY_NAMES[id] ?? id,
    tools: v.tools,
    skills: v.skills,
  }));
});

function isPackageFullyEnabled(pkg: { tools: string[]; skills: string[] }): boolean {
  // 全部允许 => 视为全选
  const allToolsUnlimited = teamFormEnabledTools.value.length === 0;
  const allSkillsUnlimited = teamFormEnabledSkills.value.length === 0;
  const toolsOk = allToolsUnlimited || pkg.tools.every((t) => teamFormEnabledTools.value.includes(t));
  const skillsOk = allSkillsUnlimited || pkg.skills.every((sk) => teamFormEnabledSkills.value.includes(sk));
  return toolsOk && skillsOk;
}

function togglePackage(pkg: { tools: string[]; skills: string[] }) {
  const enabled = isPackageFullyEnabled(pkg);
  if (enabled) {
    // 取消整个包：从白名单去除包内成员
    teamFormEnabledTools.value = teamFormEnabledTools.value.filter((t) => !pkg.tools.includes(t));
    teamFormEnabledSkills.value = teamFormEnabledSkills.value.filter((sk) => !pkg.skills.includes(sk));
  } else {
    // 启用整个包：加入全部成员（保持其它白名单）
    const tSet = new Set(teamFormEnabledTools.value);
    for (const t of pkg.tools) tSet.add(t);
    teamFormEnabledTools.value = [...tSet];
    const sSet = new Set(teamFormEnabledSkills.value);
    for (const sk of pkg.skills) sSet.add(sk);
    teamFormEnabledSkills.value = [...sSet];
  }
}

// 工具按 category 分组（内置工具 / 编排 / 自更新 / 运维），组名 + tag 展示
const CATEGORY_LABEL: Record<string, string> = {
  builtin: '内置工具',
  '编排': '编排',
  '自更新': '自更新',
  '运维': '运维',
};

const capabilityToolGroups = computed(() => {
  const groups = new Map<string, { key: string; label: string; cat: string }[]>();
  for (const t of state.tools) {
    const cat = t.category || 'builtin';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push({ key: t.name, label: t.name, cat });
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, items]) => ({
      cat,
      title: CATEGORY_LABEL[cat] ?? cat,
      items: items.sort((a, b) => a.label.localeCompare(b.label)),
    }));
});

// 兼容旧引用：capabilityToolOptions 现在等价于全部工具平铺（含编排）
const capabilityToolOptions = computed(() =>
  state.tools.map((t) => ({ key: t.name, label: t.name })),
);
const capabilitySkillOptions = computed(() =>
  state.skills.map((s) => ({ key: s.name, label: s.name })),
);

function toggleArrayItem(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
}

// 白名单勾选：current 为空表示"全部启用"；首次取消某项时以全量初始化再取消。
function toggleAllowlist(current: string[], allKeys: string[], key: string): string[] {
  const base = current.length ? current : [...allKeys];
  return toggleArrayItem(base, key);
}

// 每个选项的勾选态：允许列表为空 => 视为全部勾选（未限制）。
function isWhitelisted(current: string[], key: string): boolean {
  return current.length === 0 || current.includes(key);
}

// ── 智能体编辑器：分区折叠（基础 / 提示词 / 能力 / 禁用） ──
const teamSections = [
  { key: 'basic', title: '基础信息' },
  { key: 'prompt', title: '系统提示词' },
  { key: 'caps', title: '启用的能力' },
];
// 默认展开前两个分区；能力分区从摘要行按需展开（避免超长滚动）。
const teamSectionOpen = ref<string[]>(['basic', 'prompt']);

/** 分区摘要：基础（启用态 + 循环模式） */
const teamBasicSummary = computed(
  () =>
    `${teamFormEnabled.value ? '启用' : '禁用'} · ${
      teamLoopMode.value === 'parallel' ? '并行多会话' : '单会话'
    }`,
);
/** 分区摘要：提示词（自定义/继承 + 系统技能数） */
const teamPromptSummary = computed(() => {
  const prompt = teamFormPrompt.value.trim() ? '自定义提示词' : '继承全局';
  const n = teamFormSystemSkills.value.length;
  return n > 0 ? `${prompt} · ${n} 个系统技能` : prompt;
});
/** 分区摘要：能力白名单（空表 = 不限制） */
const teamCapsSummary = computed(() => {
  const parts: string[] = [];
  if (teamFormEnabledPlugins.value.length > 0) parts.push(`${teamFormEnabledPlugins.value.length} 插件`);
  if (teamFormEnabledTools.value.length > 0) parts.push(`${teamFormEnabledTools.value.length} 工具`);
  if (teamFormEnabledSkills.value.length > 0) parts.push(`${teamFormEnabledSkills.value.length} 技能`);
  return parts.length > 0 ? parts.join(' · ') : '不限制（全部可用）';
});
/** 头像字（取名称首字符） */
const teamAvatarText = computed(() => (teamFormName.value.trim()[0] ?? 'A').toUpperCase());

const teamFormRules = {
  id: [
    { required: true, message: '请输入 ID' },
    {
      pattern: /^[A-Za-z0-9_-]+$/,
      message: '仅允许字母、数字、- 和 _',
    },
  ],
  name: [{ required: true, message: '请输入名称' }],
};

// ── 循环模式分段单选（互斥循环插件，写入 enabled_plugins 白名单） ──
const MODE_OPTIONS = [
  { label: '单会话（默认）', value: 'single' },
  { label: '并行多会话', value: 'parallel' },
];
const teamLoopMode = computed(() => deriveMode(teamFormEnabledPlugins.value));
function setTeamLoopMode(value: string | number) {
  teamFormEnabledPlugins.value = applyMode(
    teamFormEnabledPlugins.value,
    String(value ?? 'single') as LoopMode,
    state.plugins.map((p) => p.id),
  );
}

function startTeamCreate() {
  activeCategory.value = 'team';
  teamEditing.value = true;
  teamFormIsEdit.value = false;
  teamFormId.value = '';
  teamFormName.value = '';
  teamFormDescription.value = '';
  teamFormPrompt.value = '';
  teamFormEnabled.value = true;
  teamFormDisabledTools.value = [];
  teamFormDisabledSkills.value = [];
  teamFormEnabledPlugins.value = [];
  teamFormEnabledTools.value = [];
  teamFormEnabledSkills.value = [];
  teamFormSystemSkills.value = [];
  selectedTeam.value = null;
}

function startTeamEdit(agent: TeamInfo) {
  teamEditing.value = true;
  teamFormIsEdit.value = true;
  teamFormId.value = agent.id;
  teamFormName.value = agent.name;
  teamFormDescription.value = agent.description;
  teamFormPrompt.value = agent.system_prompt ?? '';
  teamFormEnabled.value = agent.enabled;
  teamFormDisabledTools.value = agent.disabled_tools ?? [];
  teamFormDisabledSkills.value = agent.disabled_skills ?? [];
  teamFormEnabledPlugins.value = agent.enabled_plugins ?? [];
  teamFormEnabledTools.value = agent.enabled_tools ?? [];
  teamFormEnabledSkills.value = agent.enabled_skills ?? [];
  teamFormSystemSkills.value = agent.system_skills ?? [];
}

function cancelTeamEdit() {
  teamEditing.value = false;
}

function saveTeam() {
  const id = teamFormId.value.trim() || teamFormName.value.trim();
  if (!id || !teamFormName.value.trim()) return;
  sendCommand({
    SaveTeam: {
      id,
      name: teamFormName.value.trim() || id,
      description: teamFormDescription.value.trim(),
      system_prompt: teamFormPrompt.value,
      enabled: teamFormEnabled.value,
      disabled_tools: teamFormDisabledTools.value,
      disabled_skills: teamFormDisabledSkills.value,
      enabled_plugins: stripLegacyModeIds(teamFormEnabledPlugins.value),
      enabled_tools: teamFormEnabledTools.value,
      enabled_skills: teamFormEnabledSkills.value,
      system_skills: teamFormSystemSkills.value,
    },
  });
  teamEditing.value = false;
}

function deleteTeam(team: TeamInfo) {
  // 去主智能体（2026-09）：没有受保护的"主 Agent"，唯一约束是至少保留一个。
  if (state.teams.length <= 1) {
    window.alert('至少保留一个智能体，不能删除最后一个。');
    return;
  }
  if (!window.confirm(`确定删除智能体「${team.name}」？该成员的记忆与系统提示词将被移除，此操作不可恢复。`)) return;
  sendCommand({ DeleteTeam: { id: team.id } });
  selectedTeam.value = null;
  teamEditing.value = false;
}

// ── 技能启停 ──
function toggleSkill(skill: SkillInfo, enabled: boolean) {
  sendCommand({ ToggleSkill: { name: skill.name, enabled } });
}

// ── 插件启停 ──
// 管理面插件承载 Panel ↔ Core 的 management 通道：core 拒绝经 TogglePlugin
// 禁用它（防自锁），这里在 UI 侧提前明示，避免误以为操作生效。
const MANAGEMENT_PANEL_PLUGIN_ID = 'echo-agent.management.panel';

function togglePlugin(plugin: PluginInfo, enabled: boolean) {
  if (!enabled && plugin.id === MANAGEMENT_PANEL_PLUGIN_ID) {
    window.alert(
      '「管理面」插件承载 Panel 与 Core 的通信通道，禁用即断连自锁（无法经界面恢复），已被保护。\n如需禁用请编辑 core.toml 的 disabled_plugins 后重启 Core。',
    );
    return;
  }
  sendCommand({ TogglePlugin: { id: plugin.id, enabled } });
}

// ── 工具启停 ──
function toggleTool(tool: ToolInfo, enabled: boolean) {
  sendCommand({ ToggleTool: { name: tool.name, enabled } });
}

// ── 外部 Git 来源 skill 管理 ──
// 2026-09-23：安装表单从工具条内联展开改为弹层——内联表单会顶掉列表，
// 安装后又无反馈；弹层关闭即完成，列表由 SkillsList 事件自动刷新。
const gitModalOpen = ref(false);
const gitUrl = ref('');
const gitName = ref('');
const gitBranch = ref('');

function openGitModal() {
  gitModalOpen.value = true;
}

function installGitSkill() {
  if (!gitUrl.value.trim()) return;
  sendCommand({
    InstallSkillFromGit: {
      url: gitUrl.value.trim(),
      name: gitName.value.trim() || null,
      branch: gitBranch.value.trim() || null,
    },
  });
  gitUrl.value = '';
  gitName.value = '';
  gitBranch.value = '';
  gitModalOpen.value = false;
  // 稍后由 SkillsList 事件刷新
}

function updateGitSkill(skill: SkillInfo) {
  sendCommand({ UpdateSkillFromGit: { name: skill.name } });
}

function removeGitSource(skill: SkillInfo) {
  if (!window.confirm(`移除 ${skill.name} 的 Git 来源记录？（目录保留，可手动删除）`)) return;
  sendCommand({ RemoveSkillSource: { name: skill.name } });
}

// ── 新建 / 编辑 / 保存 / 删除 ──
function startCreate() {
  if (!confirmDiscardSkillEdit()) return;
  activeCategory.value = 'skill';
  formAlways.value = false;
  formSystem.value = false;
  formContent.value = "";
  creating.value = true;
  editing.value = false;
  selectedSkill.value = null;
  selectedTool.value = null;
  formName.value = '';
  formDescription.value = '';
  formKeywords.value = '';
  formCategory.value = '';
  formAlways.value = false;
  formContent.value = '';
  skillMenuOpen.value = false;
  skillFormSnapshot.value = skillSnapshotOf();
}

// ── 技能编辑表单 ──
const formName = ref('');
const formDescription = ref('');
const formKeywords = ref('');
const formCategory = ref('');
const formAlways = ref(false);
const formSystem = ref(false);
const formContent = ref('');

function startEdit() {
  if (!selectedSkill.value) return;
  const s = selectedSkill.value;
  formName.value = s.name;
  formDescription.value = s.description;
  formKeywords.value = s.keywords.join(', ');
  formCategory.value = s.category ?? '';
  formAlways.value = s.always;
  formSystem.value = s.system ?? false;
  formContent.value = s.content;
  editing.value = true;
  creating.value = false;
  skillMenuOpen.value = false;
  skillFormSnapshot.value = skillSnapshotOf();
}

function cancelEdit() {
  editing.value = false;
  creating.value = false;
  skillFormSnapshot.value = '';
}

function saveSkill() {
  const name = formName.value.trim();
  if (!name) return;
  const keywords = formKeywords.value
    .split(/[,，]/)
    .map((k) => k.trim())
    .filter(Boolean);
  sendCommand({
    SaveSkill: {
      name,
      description: formDescription.value.trim(),
      keywords,
      always: formAlways.value,
      category: formCategory.value.trim(),
      content: formContent.value,
      system: formSystem.value,
    },
  });
  editing.value = false;
  creating.value = false;
  skillFormSnapshot.value = '';
}

function deleteSkill(skill: SkillInfo) {
  if (!window.confirm(`确定删除技能「${skill.name}」？该操作会删除 SKILL.md 文件。`)) return;
  sendCommand({ DeleteSkill: { name: skill.name } });
  selectedSkill.value = null;
}

// ── 参数 Schema 展示 ──
function paramText(tool: ToolInfo): string {
  try {
    if (tool.parameters == null) return '（无参数）';
    return JSON.stringify(tool.parameters, null, 2);
  } catch {
    return String(tool.parameters);
  }
}

// 数据刷新：面板需要时拉取（列表也可能由后端变更事件自动更新）
function refresh() {
  sendCommand('RequestSkillsList');
  sendCommand('RequestToolsList');
  sendCommand('RequestPluginsList');
  sendCommand('RequestTeamsList');
}

onMounted(refresh);

// 列表更新后，保持选中的对象指向最新数据
watch(
  () => state.skills,
  () => {
    if (selectedSkill.value) {
      const found = state.skills.find((s) => s.name === selectedSkill.value!.name);
      if (found) selectedSkill.value = found;
      else selectedSkill.value = null;
    }
  },
);
watch(
  () => state.tools,
  () => {
    if (selectedTool.value) {
      const found = state.tools.find((t) => t.name === selectedTool.value!.name);
      if (found) selectedTool.value = found;
      else selectedTool.value = null;
    }
  },
);
watch(
  () => state.teams,
  () => {
    if (selectedTeam.value && !state.teams.some((t) => t.id === selectedTeam.value!.id)) {
      selectedTeam.value = null;
      teamEditing.value = false;
    }
  },
);
</script>

<template>
  <div class="caps">
    <!-- 一级菜单 -->
    <nav class="caps-nav">
      <div
        v-for="cat in categories"
        :key="cat.key"
        class="caps-nav-item"
        :class="{ 'caps-nav-item--active': activeCategory === cat.key }"
        @click="switchCategory(cat.key)"
      >
        <span class="caps-nav-label">{{ cat.label }}</span>
        <span v-if="cat.count !== null" class="caps-count">{{ cat.count }}</span>
      </div>
      <div class="caps-nav-spacer" />
      <NeumorphismButton size="small" variant="glass" @click="refresh">刷新</NeumorphismButton>
    </nav>

    <!-- 分类工作区 -->
    <div class="caps-body">
      <div class="caps-toolbar">
        <div class="caps-toolbar-title">
          <h3>{{ currentCategory.label }}</h3>
          <span class="muted">{{ toolbarSubtitle }}</span>
        </div>
        <div class="caps-toolbar-actions">
          <template v-if="activeCategory === 'skill'">
            <NeumorphismButton size="small" variant="glass" @click="openGitModal">
              Git 安装
            </NeumorphismButton>
            <NeumorphismButton size="small" variant="glass" @click="startCreate">新建技能</NeumorphismButton>
          </template>
          <NeumorphismButton
            v-if="activeCategory === 'team'"
            size="small"
            variant="glass"
            @click="startTeamCreate"
          >
            新建智能体
          </NeumorphismButton>
        </div>
      </div>

      <!-- 技能筛选栏：搜索 + 状态筛选 + 分组维度（2026-09-23 重排版） -->
      <div v-if="activeCategory === 'skill'" class="caps-filters">
        <NeumorphismInput
          v-model="skillSearch"
          placeholder="搜索名称 / 描述 / 触发词"
          size="small"
          class="caps-filters__search"
        />
        <div class="caps-filters__chips">
          <button
            v-for="f in SKILL_FILTERS"
            :key="f.key"
            type="button"
            class="caps-chip"
            :class="{ 'caps-chip--active': skillFilter === f.key }"
            @click="skillFilter = f.key"
          >
            {{ f.label }}
            <span class="caps-chip__count">{{ skillFilterCounts[f.key] }}</span>
          </button>
        </div>
        <NeumorphismSegmented
          v-model="skillGroupBy"
          :options="SKILL_GROUP_OPTIONS"
          size="small"
          aria-label="分组维度"
        />
      </div>

      <!-- API 工作区：整页表单（无条目列表） -->
      <div v-if="activeCategory === 'api'" class="caps-workspace">
        <div class="caps-detail-pane">
          <ApiSettings />
        </div>
      </div>

      <!-- 日志工作区：整页查看器（无条目列表；切走即卸载并停止轮询） -->
      <div v-else-if="activeCategory === 'logs'" class="caps-workspace">
        <div class="caps-detail-pane">
          <LogView />
        </div>
      </div>

      <!-- 资源工作区：条目列表 + 详情/编辑 -->
      <div v-else class="caps-workspace">
        <!-- 条目列表 -->
        <!-- 列表宽度：技能工作台可拖拽（其余分类沿用默认 250px） -->
        <div
          class="caps-list"
          :style="activeCategory === 'skill' ? { width: capsListWidth + 'px' } : undefined"
        >
          <!-- 技能：工作台分组（按包 / 按分类 / 平铺）+ 双行行卡 -->
          <template v-if="activeCategory === 'skill'">
            <div v-for="g in skillWorkbenchGroups" :key="g.key" class="caps-list-group">
              <div class="caps-list-group__head" @click="toggleGroup('skill:' + g.key)">
                <span class="caret">{{ isCollapsed('skill:' + g.key) ? '▸' : '▾' }}</span>
                <span class="caps-list-group__name">{{ g.title }}</span>
                <span class="caps-count caps-count--soft">{{ g.items.length }}</span>
              </div>
              <template v-if="g.hint" class="caps-list-group__hint-wrap">
                <div class="caps-list-group__hint">{{ g.hint }}</div>
              </template>
              <template v-if="!isCollapsed('skill:' + g.key)">
                <div
                  v-for="s in g.items"
                  :key="s.name"
                  class="caps-list-item caps-skill-item"
                  :class="{
                    'caps-list-item--active': selectedSkill?.name === s.name && !creating && !editing,
                    'caps-skill-item--off': !s.enabled,
                  }"
                  @click="selectSkillItem(s)"
                >
                  <div class="caps-skill-item__main">
                    <span
                      class="caps-skill-item__dot"
                      :class="{ 'caps-skill-item__dot--on': s.enabled }"
                      :title="s.enabled ? '已启用' : '已禁用'"
                    />
                    <span class="caps-list-item__name">{{ s.name }}</span>
                    <span class="caps-skill-item__marks">
                      <span v-if="s.always" class="caps-mark caps-mark--always" title="常驻：每轮都注入">★</span>
                      <span v-if="s.system" class="caps-mark caps-mark--system" title="系统提示词技能">⇧</span>
                      <span v-if="s.source" class="caps-mark caps-mark--git" title="外部 Git 来源">Git</span>
                      <span v-if="skillPackageDisabled(s)" class="caps-mark caps-mark--warn" title="所属包已禁用">包已禁用</span>
                    </span>
                    <span class="caps-skill-item__quick" @click.stop>
                      <NeumorphismSwitch
                        :model-value="s.enabled"
                        size="small"
                        @change="quickToggleSkill(s, $event)"
                      />
                    </span>
                  </div>
                  <div class="caps-skill-item__sub">
                    <span class="caps-skill-item__desc">{{ s.description || '（无描述）' }}</span>
                    <span v-if="s.keywords.length" class="caps-skill-item__kw">
                      {{ s.keywords.slice(0, 3).join(' · ') }}<template v-if="s.keywords.length > 3"> +{{ s.keywords.length - 3 }}</template>
                    </span>
                  </div>
                </div>
              </template>
            </div>
            <div v-if="skillWorkbenchGroups.length === 0" class="caps-list-empty">
              <span class="muted">无匹配技能</span>
              <NeumorphismButton
                v-if="skillSearch || skillFilter !== 'all'"
                size="small"
                variant="glass"
                @click="skillSearch = ''; skillFilter = 'all'"
              >
                清除筛选
              </NeumorphismButton>
            </div>
          </template>

          <!-- 工具：按分类分组 -->
          <template v-else-if="activeCategory === 'tool'">
            <div v-for="g in toolGroups" :key="g.cat" class="caps-list-group">
              <div class="caps-list-group__head" @click="toggleGroup('tool:' + g.cat)">
                <span class="caret">{{ isCollapsed('tool:' + g.cat) ? '▸' : '▾' }}</span>
                <span class="caps-list-group__name">{{ g.cat }}</span>
                <span class="caps-count caps-count--soft">{{ g.items.length }}</span>
              </div>
              <template v-if="!isCollapsed('tool:' + g.cat)">
                <div
                  v-for="t in g.items"
                  :key="t.name"
                  class="caps-list-item"
                  :class="{ 'caps-list-item--active': selectedTool?.name === t.name }"
                  @click="selectToolItem(t)"
                >
                  <span class="caps-list-item__name">{{ t.name }}</span>
                  <span v-if="!t.enabled" class="muted caps-list-item__flag">已禁用</span>
                </div>
              </template>
            </div>
            <div v-if="toolGroups.length === 0" class="muted caps-list-empty">（暂无工具）</div>
          </template>

          <!-- 插件：按 kind 分组 -->
          <template v-else-if="activeCategory === 'plugin'">
            <div v-for="g in pluginGroups" :key="g.cat" class="caps-list-group">
              <div class="caps-list-group__head" @click="toggleGroup('plugin:' + g.cat)">
                <span class="caret">{{ isCollapsed('plugin:' + g.cat) ? '▸' : '▾' }}</span>
                <span class="caps-list-group__name">{{ g.cat }}</span>
                <span class="caps-count caps-count--soft">{{ g.items.length }}</span>
              </div>
              <template v-if="!isCollapsed('plugin:' + g.cat)">
                <div
                  v-for="p in g.items"
                  :key="p.id"
                  class="caps-list-item"
                  :class="{ 'caps-list-item--active': selectedPlugin?.id === p.id }"
                  @click="selectPluginItem(p)"
                >
                  <span class="caps-list-item__name">{{ p.name }}</span>
                  <span v-if="!p.enabled" class="muted caps-list-item__flag">已禁用</span>
                </div>
              </template>
            </div>
            <div v-if="pluginGroups.length === 0" class="muted caps-list-empty">（暂无插件）</div>
          </template>

          <!-- 智能体：平铺列表 -->
          <template v-else>
            <div
              v-for="t in teamList"
              :key="t.id"
              class="caps-list-item"
              :class="{ 'caps-list-item--active': selectedTeam?.id === t.id }"
              @click="selectTeamItem(t)"
            >
              <span class="caps-list-item__name">{{ t.name }}</span>
              <span v-if="!t.enabled" class="muted caps-list-item__flag">已禁用</span>
            </div>
            <div v-if="teamList.length === 0" class="muted caps-list-empty">（暂无智能体）</div>
          </template>
        </div>

        <!-- 分栏拖拽分隔条（列表宽度可调；技能工作台用） -->
        <div
          v-if="activeCategory === 'skill'"
          class="caps-resizer"
          title="拖动调整列表宽度"
          @mousedown="startCapsListResize"
        />

        <!-- 详情 / 编辑面板 -->
        <div class="caps-detail-pane">
          <!-- 空态 -->
          <NeumorphismEmpty v-if="showEmpty" :description="EMPTY_HINT[activeCategory]" />

          <!-- 技能详情（分区检查器：概览 / 生效方式 / 被谁使用 / 来源 / 内容） -->
          <div
            v-else-if="activeCategory === 'skill' && selectedSkill && !editing && !creating"
            class="caps-detail skill-detail"
          >
            <!-- ── 头部：名称 + 启停 + ⋯ 菜单 ── -->
            <div class="detail-head">
              <div class="skill-detail__title">
                <h3>{{ selectedSkill.name }}</h3>
                <span class="skill-detail__pkg">{{ skillPackageLabel(selectedSkill.package) }}</span>
              </div>
              <div class="detail-actions">
                <NeumorphismSwitch
                  :model-value="selectedSkill.enabled"
                  size="small"
                  active-text="启用"
                  inactive-text="禁用"
                  @change="toggleSkill(selectedSkill!, $event)"
                />
                <span class="skill-menu">
                  <NeumorphismButton
                    size="small"
                    variant="glass"
                    title="更多操作"
                    @click="skillMenuOpen = !skillMenuOpen"
                  >
                    ⋯
                  </NeumorphismButton>
                  <template v-if="skillMenuOpen">
                    <div class="skill-menu__backdrop" @click="skillMenuOpen = false" />
                    <div class="skill-menu__panel">
                      <button type="button" class="skill-menu__item" @click="startEdit">编辑</button>
                      <button
                        v-if="selectedSkill.source"
                        type="button"
                        class="skill-menu__item"
                        @click="skillMenuOpen = false; updateGitSkill(selectedSkill)"
                      >
                        更新（Git）
                      </button>
                      <button
                        v-if="selectedSkill.source"
                        type="button"
                        class="skill-menu__item"
                        @click="skillMenuOpen = false; removeGitSource(selectedSkill)"
                      >
                        移除来源
                      </button>
                      <button
                        type="button"
                        class="skill-menu__item skill-menu__item--danger"
                        @click="skillMenuOpen = false; deleteSkill(selectedSkill)"
                      >
                        删除
                      </button>
                    </div>
                  </template>
                </span>
              </div>
            </div>

            <!-- 组合并提示：所属包被禁用时技能对所有智能体不可见 -->
            <div v-if="skillPackageDisabled(selectedSkill)" class="skill-banner skill-banner--warn">
              「{{ skillPackageLabel(selectedSkill.package) }}」插件当前已禁用，包内技能对所有智能体不可见；
              在「插件」分类重新启用该包后本技能才会生效。
            </div>
            <div v-if="!selectedSkill.enabled" class="skill-banner">
              该技能已禁用：不参与触发，也不会注入提示词（列表/详情开关可直接启用）。
            </div>

            <p class="skill-detail__desc">{{ selectedSkill.description || '（无描述）' }}</p>

            <!-- ── 生效方式：什么时候进入对话 ── -->
            <div class="detail-section">
              <div class="detail-section__title">生效方式</div>

              <div class="detail-subfield">
                <span class="detail-subfield__label">关键词触发</span>
                <span class="muted detail-subfield__hint">用户消息命中触发词时按需注入</span>
              </div>
              <div class="detail-keywords">
                <NeumorphismTag
                  v-for="k in selectedSkill.keywords"
                  :key="k"
                  size="small"
                  variant="info"
                  closable
                  @close="removeSkillKeyword(selectedSkill, k)"
                >
                  {{ k }}
                </NeumorphismTag>
                <span v-if="!selectedSkill.keywords.length" class="muted">（无触发词，仅能靠手动/常驻使用）</span>
                <span class="skill-kw-add">
                  <NeumorphismInput
                    v-model="skillKeywordDraft"
                    size="small"
                    placeholder="＋ 触发词"
                    class="skill-kw-add__input"
                    @keydown.enter.prevent="addSkillKeyword(selectedSkill, skillKeywordDraft); skillKeywordDraft = ''"
                  />
                  <NeumorphismButton
                    size="small"
                    variant="glass"
                    :disabled="!skillKeywordDraft.trim()"
                    @click="addSkillKeyword(selectedSkill, skillKeywordDraft); skillKeywordDraft = ''"
                  >
                    添加
                  </NeumorphismButton>
                </span>
              </div>

              <div class="detail-field">
                <span>常驻注入（每轮对话都注入，不看触发词）</span>
                <NeumorphismSwitch
                  :model-value="selectedSkill.always"
                  size="small"
                  @change="toggleSkillAlways(selectedSkill!, $event)"
                />
              </div>

              <div class="detail-field">
                <span>
                  系统提示词（注入 base 区，影响该智能体的身份/规则层）
                  <span class="skill-warn-icon" title="高风险：内容会进入所有启用它的智能体的系统提示词">⚠</span>
                </span>
                <NeumorphismSwitch
                  :model-value="selectedSkill.system === true"
                  size="small"
                  @change="toggleSkillSystem(selectedSkill!, $event)"
                />
              </div>
            </div>

            <!-- ── 被谁使用：关掉它会影响谁（按 TeamsList 反查） ── -->
            <div class="detail-section">
              <div class="detail-section__title">被谁使用</div>
              <div v-if="skillUsageRows.length" class="skill-usage">
                <div v-for="row in skillUsageRows" :key="row.team" class="skill-usage__row">
                  <span class="skill-usage__team">{{ row.team }}</span>
                  <NeumorphismTag :variant="row.variant" size="small">{{ row.label }}</NeumorphismTag>
                </div>
              </div>
              <span v-else class="muted">（无智能体，或智能体列表尚未加载）</span>
            </div>

            <!-- ── 来源：内置 / Git ── -->
            <div class="detail-section">
              <div class="detail-section__title">来源</div>
              <div v-if="selectedSkill.source" class="skill-source">
                <div class="skill-source__row">
                  <span class="muted">仓库</span>
                  <code :title="selectedSkill.source.url">{{ selectedSkill.source.url }}</code>
                </div>
                <div class="skill-source__row">
                  <span class="muted">版本</span>
                  <code>{{ selectedSkill.source.rev }}{{ selectedSkill.source.branch ? ` @ ${selectedSkill.source.branch}` : '' }}</code>
                </div>
                <div v-if="selectedSkill.source.installed_at" class="skill-source__row">
                  <span class="muted">安装时间</span>
                  <code>{{ selectedSkill.source.installed_at }}</code>
                </div>
                <div class="skill-source__actions">
                  <NeumorphismButton size="small" variant="glass" @click="updateGitSkill(selectedSkill)">更新</NeumorphismButton>
                  <NeumorphismButton size="small" variant="glass" @click="removeGitSource(selectedSkill)">移除来源</NeumorphismButton>
                </div>
              </div>
              <span v-else class="muted">内置技能（随 Core 分发的 skills 目录）</span>
            </div>

            <!-- ── 内容：frontmatter 摘要 + Markdown 预览/源码 ── -->
            <div class="detail-section detail-section--grow">
              <div class="detail-section__title detail-section__title--row">
                <span>内容（SKILL.md）</span>
                <NeumorphismSegmented
                  v-model="skillContentMode"
                  :options="[{ label: '预览', value: 'preview' }, { label: '源码', value: 'source' }]"
                  size="small"
                  aria-label="内容视图"
                />
              </div>
              <div class="skill-frontmatter">
                <span class="muted">frontmatter：</span>
                <NeumorphismTag size="small">{{ selectedSkill.category || '未分类' }}</NeumorphismTag>
                <NeumorphismTag v-if="selectedSkill.always" variant="warning" size="small">常驻</NeumorphismTag>
                <NeumorphismTag v-if="selectedSkill.system" variant="primary" size="small">系统提示词</NeumorphismTag>
                <span class="muted">{{ selectedSkill.keywords.length }} 个触发词</span>
              </div>
              <div v-if="skillContentMode === 'preview'" class="skill-content-preview">
                <MarkdownRenderer
                  v-if="selectedSkill.content.trim()"
                  :content="selectedSkill.content"
                  :show-toc="false"
                />
                <span v-else class="muted">（空）</span>
              </div>
              <pre v-else class="content-pre skill-content-pre">{{ selectedSkill.content || '（空）' }}</pre>
            </div>
          </div>

          <!-- 技能编辑 / 新建表单 -->
          <div v-else-if="activeCategory === 'skill' && (editing || creating)" class="caps-detail">
            <div class="detail-head">
              <h3>{{ creating ? '新建技能' : `编辑 ${selectedSkill?.name ?? ''}` }}</h3>
            </div>
            <div class="caps-form">
              <label>名称（目录名 key）</label>
              <NeumorphismInput
                v-model="formName"
                :disabled="editing"
                placeholder="my-skill"
              />
              <label>描述</label>
              <NeumorphismInput v-model="formDescription" placeholder="技能功能描述" />
              <label>触发词（逗号分隔）</label>
              <NeumorphismInput v-model="formKeywords" placeholder="搜索, 查一下" />
              <label>分类</label>
              <NeumorphismInput v-model="formCategory" placeholder="信息检索" />
              <div class="detail-field">
                <span>常驻（总是注入）</span>
                <NeumorphismSwitch v-model="formAlways" size="small" />
              </div>
              <div class="detail-field">
                <span>系统提示词（注入 base 区，可插拔身份/规则层）</span>
                <NeumorphismSwitch v-model="formSystem" size="small" />
              </div>
              <label>内容（Markdown 正文）</label>
              <NeumorphismTextarea
                v-model="formContent"
                rows="12"
                auto-resize
                placeholder="# 技能说明…"
              />
              <!-- 吸底操作条：保存状态可见（未保存改动 / 已同步） -->
              <div class="form-actions form-actions--sticky">
                <span class="form-actions__state" :class="{ 'form-actions__state--dirty': skillFormDirty }">
                  {{ skillFormDirty ? '● 有未保存的更改' : '○ 无更改' }}
                </span>
                <NeumorphismButton variant="glass" @click="cancelEdit">放弃更改</NeumorphismButton>
                <NeumorphismButton variant="primary" :disabled="!formName.trim()" @click="saveSkill">
                  保存
                </NeumorphismButton>
              </div>
            </div>
          </div>

          <!-- 智能体详情 -->
          <div
            v-else-if="activeCategory === 'team' && selectedTeam && !teamEditing"
            class="caps-detail"
          >
            <div class="detail-head">
              <h3>{{ selectedTeam.name }}</h3>
              <div class="detail-actions">
                <NeumorphismButton
                  size="small"
                  variant="primary"
                  @click="startTeamEdit(selectedTeam!)"
                >
                  编辑
                </NeumorphismButton>
                <NeumorphismButton
                  v-if="state.teams.length > 1"
                  size="small"
                  variant="glass"
                  @click="deleteTeam(selectedTeam!)"
                >
                  删除
                </NeumorphismButton>
              </div>
            </div>
            <div class="detail-meta">
              <NeumorphismTag variant="info" size="small">{{ selectedTeam.sessions }} 会话</NeumorphismTag>
              <NeumorphismTag size="small">
                {{ loopModeOf(selectedTeam) === 'parallel' ? '并行多会话' : '单会话' }}
              </NeumorphismTag>
            </div>
            <div class="detail-field">
              <span>启用（禁用即卸载记忆，再次启用重新挂载）</span>
              <NeumorphismSwitch
                :model-value="selectedTeam.enabled"
                size="small"
                @change="sendCommand({ ToggleTeam: { id: selectedTeam!.id, enabled: $event } })"
              />
            </div>
            <p class="muted">{{ selectedTeam.description || '（无描述）' }}</p>
            <div class="detail-content">
              <div class="muted content-title">系统提示词（留空 = 继承全局）</div>
              <pre class="content-pre">{{ selectedTeam.system_prompt || '（继承全局）' }}</pre>
            </div>
            <div class="detail-keywords">
              <span class="muted">启用白名单：</span>
              <template v-if="(selectedTeam.enabled_plugins?.length ?? 0) + (selectedTeam.enabled_tools?.length ?? 0) + (selectedTeam.enabled_skills?.length ?? 0) > 0">
                <NeumorphismTag v-for="e in selectedTeam.enabled_plugins ?? []" :key="e" size="small" variant="primary">
                  {{ e }}
                </NeumorphismTag>
                <NeumorphismTag v-for="e in selectedTeam.enabled_tools ?? []" :key="e" size="small" variant="primary">
                  {{ e }}
                </NeumorphismTag>
                <NeumorphismTag v-for="e in selectedTeam.enabled_skills ?? []" :key="e" size="small" variant="primary">
                  {{ e }}
                </NeumorphismTag>
              </template>
              <span v-else class="muted">全部可用</span>
            </div>
            <div class="detail-keywords">
              <span class="muted">禁用能力：</span>
              <template v-if="(selectedTeam.disabled_tools?.length ?? 0) || (selectedTeam.disabled_skills?.length ?? 0)">
                <NeumorphismTag v-for="d in selectedTeam.disabled_tools ?? []" :key="d" size="small" variant="error">
                  {{ d }}
                </NeumorphismTag>
                <NeumorphismTag v-for="d in selectedTeam.disabled_skills ?? []" :key="d" size="small" variant="error">
                  {{ d }}
                </NeumorphismTag>
              </template>
              <span v-else class="muted">无（全部可用）</span>
            </div>
          </div>

          <!-- 智能体编辑 / 新建表单（分区折叠：基础 / 提示词 / 能力 / 禁用） -->
          <div v-else-if="activeCategory === 'team' && teamEditing" class="caps-detail team-editor">
            <!-- 头部信息卡：头像 + 名称 + 状态标签（ui-frame NeumorphismCard） -->
            <NeumorphismCard :elevation="2" radius="large" no-padding class="team-hero">
              <div class="team-hero__body">
                <div class="team-hero__avatar">{{ teamAvatarText }}</div>
                <div class="team-hero__main">
                  <div class="team-hero__title">
                    <span>{{ teamFormIsEdit ? teamFormName || teamFormId || '未命名' : '新建智能体' }}</span>
                    <NeumorphismTag :variant="teamFormEnabled ? 'success' : 'info'" size="small">
                      {{ teamFormEnabled ? '已启用' : '已禁用' }}
                    </NeumorphismTag>
                  </div>
                  <div class="team-hero__id">
                    {{ teamFormIsEdit ? teamFormId : 'ID 待填写' }} · {{ teamBasicSummary }}
                  </div>
                </div>
              </div>
            </NeumorphismCard>

            <NeumorphismForm
              :model="teamFormModel"
              :rules="teamFormRules"
              direction="vertical"
              label-width="96px"
              @submit="saveTeam"
            >
              <NeumorphismCollapse
                :model-value="teamSectionOpen"
                :items="teamSections"
                @update:model-value="teamSectionOpen = $event"
              >
                <!-- 分区 1：基础信息 -->
                <template #header-basic>
                  <span class="sec-title">基础信息</span>
                  <span class="sec-summary">{{ teamBasicSummary }}</span>
                </template>
                <template #basic>
                  <NeumorphismFormItem label="ID" required name="id" :rules="teamFormRules.id">
                    <NeumorphismInput
                      v-model="teamFormId"
                      placeholder="my-agent"
                      :disabled="teamFormIsEdit"
                    />
                  </NeumorphismFormItem>
                  <NeumorphismFormItem label="名称" required name="name" :rules="teamFormRules.name">
                    <NeumorphismInput v-model="teamFormName" placeholder="写作助理" />
                  </NeumorphismFormItem>
                  <NeumorphismFormItem label="描述" name="description">
                    <NeumorphismInput v-model="teamFormDescription" placeholder="专注文档写作" />
                  </NeumorphismFormItem>
                  <NeumorphismFormItem label="启用" name="enabled">
                    <NeumorphismSwitch v-model="teamFormEnabled" size="small" />
                  </NeumorphismFormItem>
                  <NeumorphismFormItem label="循环模式">
                    <p class="muted caps-hint">
                      单会话 = 同一会话的 turn 串行排队、无会话管理 UI（默认）；并行多会话 = 同一会话可并发分支、显示会话列表 / 全局会话 / 可见回执分支。
                    </p>
                    <NeumorphismSegmented
                      :model-value="teamLoopMode"
                      :options="MODE_OPTIONS"
                      size="small"
                      @update:model-value="setTeamLoopMode"
                    />
                  </NeumorphismFormItem>
                </template>

                <!-- 分区 2：系统提示词 -->
                <template #header-prompt>
                  <span class="sec-title">系统提示词</span>
                  <span class="sec-summary">{{ teamPromptSummary }}</span>
                </template>
                <template #prompt>
                  <NeumorphismFormItem label="提示词" name="system_prompt">
                    <NeumorphismTextarea
                      v-model="teamFormPrompt"
                      rows="6"
                      auto-resize
                      placeholder="你是…（留空 = 继承全局提示词与技能）"
                    />
                  </NeumorphismFormItem>
                  <NeumorphismFormItem label="系统提示词 skills">
                    <p class="muted caps-hint">
                      勾选启用的 skill 作为该 agent 的系统提示词（注入 base 区，
                      热重载/安装即生效）；不勾选则用上方文本。
                    </p>
                    <div class="caps-checkbox-grid caps-checkbox-grid--grid">
                      <NeumorphismCheckbox
                        v-for="sk in state.skills"
                        :key="sk.name"
                        size="small"
                        :model-value="teamFormSystemSkills.includes(sk.name)"
                        :label="sk.name"
                        @update:model-value="
                          teamFormSystemSkills = toggleArrayItem(teamFormSystemSkills, sk.name)
                        "
                      />
                    </div>
                  </NeumorphismFormItem>
                </template>

                <!-- 分区 3：启用的能力（插件 / 包 / 工具 / 技能） -->
                <template #header-caps>
                  <span class="sec-title">启用的能力</span>
                  <span class="sec-summary">{{ teamCapsSummary }}</span>
                </template>
                <template #caps>
                  <div class="sec-sub">插件</div>
                  <p class="muted caps-hint">
                    勾选该智能体可用的能力块（适配器/交互/管理面）；全选 = 不限制（默认）。内置工具集不在此列，请在下方按工具勾选。
                  </p>
                  <div class="caps-checkbox-grid caps-checkbox-grid--grid">
                    <NeumorphismCheckbox
                      v-for="opt in capabilityPluginOptions"
                      :key="opt.key"
                      size="small"
                      :model-value="isWhitelisted(teamFormEnabledPlugins, opt.key)"
                      :label="opt.label"
                      @update:model-value="teamFormEnabledPlugins = toggleAllowlist(teamFormEnabledPlugins, capabilityPluginOptions.map(o => o.key), opt.key)"
                    />
                    <span v-if="capabilityPluginOptions.length === 0" class="muted">（无）</span>
                  </div>

                  <NeumorphismDivider dashed inset />
                  <div class="sec-sub">包（Package）</div>
                  <p class="muted caps-hint">
                    同一个包（如 QQ 适配器）的工具+技能作为一个整体，勾选/取消即同时开关包内所有成员。
                  </p>
                  <div v-for="pkg in capabilityPackages" :key="pkg.id" class="caps-tool-group">
                    <div class="caps-tool-group__head">
                      <NeumorphismCheckbox
                        size="small"
                        :model-value="isPackageFullyEnabled(pkg)"
                        :label="pkg.name"
                        @update:model-value="togglePackage(pkg)"
                      />
                      <NeumorphismTag size="small" variant="info">
                        {{ pkg.tools.length + pkg.skills.length }} 项
                      </NeumorphismTag>
                    </div>
                    <div class="muted caps-pkg-members">
                      工具：{{ pkg.tools.join('、') || '—' }}；技能：{{ pkg.skills.join('、') || '—' }}
                    </div>
                  </div>
                  <span v-if="capabilityPackages.length === 0" class="muted">（无包可勾选）</span>

                  <NeumorphismDivider dashed inset />
                  <div class="sec-sub">工具</div>
                  <p class="muted caps-hint">
                    勾选该智能体可用的工具（按分类分组，含编排/自更新/运维）；全选 = 不限制（默认）。
                  </p>
                  <div v-for="group in capabilityToolGroups" :key="group.cat" class="caps-tool-group">
                    <div class="caps-tool-group__head">
                      {{ group.title }}
                      <NeumorphismTag size="small" variant="info">{{ group.items.length }}</NeumorphismTag>
                    </div>
                    <div class="caps-checkbox-grid caps-checkbox-grid--grid">
                      <NeumorphismCheckbox
                        v-for="opt in group.items"
                        :key="opt.key"
                        size="small"
                        :model-value="isWhitelisted(teamFormEnabledTools, opt.key)"
                        :label="opt.label"
                        @update:model-value="teamFormEnabledTools = toggleAllowlist(teamFormEnabledTools, capabilityToolOptions.map(o => o.key), opt.key)"
                      />
                    </div>
                  </div>
                  <span v-if="capabilityToolOptions.length === 0" class="muted">（无）</span>

                  <NeumorphismDivider dashed inset />
                  <div class="sec-sub">技能</div>
                  <p class="muted caps-hint">勾选该智能体激活的技能；全选 = 不限制（默认）。</p>
                  <div class="caps-checkbox-grid caps-checkbox-grid--grid">
                    <NeumorphismCheckbox
                      v-for="opt in capabilitySkillOptions"
                      :key="opt.key"
                      size="small"
                      :model-value="isWhitelisted(teamFormEnabledSkills, opt.key)"
                      :label="opt.label"
                      @update:model-value="teamFormEnabledSkills = toggleAllowlist(teamFormEnabledSkills, capabilitySkillOptions.map(o => o.key), opt.key)"
                    />
                    <span v-if="capabilitySkillOptions.length === 0" class="muted">（无）</span>
                  </div>
                </template>
              </NeumorphismCollapse>

              <div class="form-actions form-actions--corner">
                <NeumorphismButton
                  v-if="teamFormIsEdit && selectedTeam && state.teams.length > 1"
                  variant="glass"
                  class="caps-delete-btn"
                  @click="deleteTeam(selectedTeam)"
                >
                  删除
                </NeumorphismButton>
                <NeumorphismButton variant="glass" @click="cancelTeamEdit">放弃更改</NeumorphismButton>
                <NeumorphismButton variant="primary" @click="saveTeam">保存</NeumorphismButton>
              </div>
            </NeumorphismForm>
          </div>

          <!-- 插件详情 -->
          <div v-else-if="activeCategory === 'plugin' && selectedPlugin" class="caps-detail">
            <div class="detail-head">
              <h3>{{ selectedPlugin.name }}</h3>
              <NeumorphismTag v-if="!selectedPlugin.builtin" variant="info" size="small">
                外部插件
              </NeumorphismTag>
            </div>
            <div class="detail-meta">
              <NeumorphismTag size="small">{{ PLUGIN_KIND_LABELS[selectedPlugin.kind] ?? selectedPlugin.kind }}</NeumorphismTag>
              <NeumorphismTag variant="info" size="small">v{{ selectedPlugin.version || '—' }}</NeumorphismTag>
              <span class="muted">{{ selectedPlugin.description || '（无描述）' }}</span>
            </div>
            <div class="detail-field">
              <span>启用（禁用即卸载该插件注册）</span>
              <NeumorphismSwitch
                :model-value="selectedPlugin.enabled"
                size="small"
                @change="togglePlugin(selectedPlugin!, $event)"
              />
            </div>
            <div class="detail-keywords">
              <span class="muted">ID:</span>
              <code>{{ selectedPlugin.id }}</code>
              <span class="muted">包（Package）:</span>
              <code>{{ selectedPlugin.package || selectedPlugin.id }}</code>
              <span class="muted">Entry:</span>
              <code>{{ selectedPlugin.entry || '—' }}</code>
              <span class="muted">Author:</span>
              <code>{{ selectedPlugin.author || '—' }}</code>
            </div>
          </div>

          <!-- 工具详情 -->
          <div v-else-if="activeCategory === 'tool' && selectedTool" class="caps-detail">
            <div class="detail-head">
              <h3>{{ selectedTool.name }}</h3>
            </div>
            <div class="detail-meta">
              <NeumorphismTag size="small">{{ selectedTool.category || '内置工具' }}</NeumorphismTag>
              <span class="muted">{{ selectedTool.description || '（无描述）' }}</span>
            </div>
            <div class="detail-field">
              <span>启用（禁用后模型不可见、调用失败）</span>
              <NeumorphismSwitch
                :model-value="selectedTool.enabled"
                size="small"
                @change="toggleTool(selectedTool!, $event)"
              />
            </div>
            <div class="detail-content">
              <div class="muted content-title">参数 Schema</div>
              <pre class="content-pre">{{ paramText(selectedTool) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Git 安装技能弹层（2026-09-23：从工具条内联表单改为弹层） -->
    <NeumorphismModal
      :model-value="gitModalOpen"
      title="从 Git 仓库安装技能"
      size="small"
      :footer="false"
      @update:model-value="gitModalOpen = $event"
    >
      <div class="git-modal">
        <p class="muted caps-hint">
          浅克隆仓库并把技能目录提升到 skills_dir；安装后可在详情页「更新 / 移除来源」。
        </p>
        <label class="git-modal__label">仓库 URL（https / ssh / 本地路径）<span class="git-modal__req">*</span></label>
        <NeumorphismInput v-model="gitUrl" placeholder="https://github.com/user/my-skill.git" size="small" />
        <div class="git-modal__row">
          <div class="git-modal__col">
            <label class="git-modal__label">安装目录名（默认仓库名）</label>
            <NeumorphismInput v-model="gitName" placeholder="my-skill" size="small" />
          </div>
          <div class="git-modal__col">
            <label class="git-modal__label">分支（默认仓库默认分支）</label>
            <NeumorphismInput v-model="gitBranch" placeholder="main" size="small" />
          </div>
        </div>
        <div class="git-modal__actions">
          <NeumorphismButton size="small" variant="glass" @click="gitModalOpen = false">取消</NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="primary"
            :disabled="!gitUrl.trim()"
            @click="installGitSkill"
          >
            安装
          </NeumorphismButton>
        </div>
      </div>
    </NeumorphismModal>
  </div>
</template>

<style scoped>
.caps {
  display: flex;
  height: 100%;
  min-height: 0;
  gap: 14px;
  padding: 12px;
}

/* ── 一级菜单 ── */
.caps-nav {
  width: 168px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}
.caps-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  border-left: 3px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--nm-text-secondary);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  user-select: none;
}
.caps-nav-item:hover {
  background: var(--panel-hover);
}
.caps-nav-item--active {
  color: var(--nm-text-primary);
  border-left-color: var(--panel-accent);
  background: var(--panel-accent-soft);
}
.caps-count {
  min-width: 20px;
  text-align: center;
  font-size: 10px;
  line-height: 1.4;
  padding: 1px 6px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--nm-text-secondary) 16%, transparent);
  color: var(--nm-text-secondary);
  font-weight: 600;
}
.caps-nav-item--active .caps-count {
  background: var(--panel-accent);
  color: var(--nm-text-on-primary, #fff);
}
.caps-count--soft {
  margin-left: auto;
}
.caps-nav-spacer {
  flex: 1;
}

/* ── 工作区外壳 ── */
.caps-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: var(--nm-surface, rgba(255, 255, 255, 0.04));
  overflow: hidden;
}
.caps-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.06));
  flex-shrink: 0;
}
.caps-toolbar-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.caps-toolbar-title h3 {
  margin: 0;
  font-size: 15px;
}
.caps-toolbar-actions {
  display: flex;
  gap: 8px;
}

.caps-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
}

/* ── 条目列表 ── */
.caps-list {
  width: 250px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 8px;
  border-right: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.06));
}
.caps-list-group__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-text-secondary);
  cursor: pointer;
  user-select: none;
}
.caps-list-group__head .caret {
  font-size: 10px;
  width: 10px;
}
.caps-list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 12px;
  margin: 1px 0;
  border-radius: 6px;
  border-left: 3px solid transparent;
  cursor: pointer;
  font-size: 13px;
}
.caps-list-item:hover {
  background: var(--panel-hover);
}
.caps-list-item--active {
  border-left-color: var(--panel-accent);
  background: var(--panel-accent-soft);
}
.caps-list-item__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.caps-list-item__flag {
  font-size: 11px;
  flex-shrink: 0;
}
.caps-list-empty {
  padding: 12px;
  font-size: 12px;
}

/* ── 详情 / 编辑面板 ── */
.caps-detail-pane {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 14px 16px;
}
.caps-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-head h3 {
  margin: 0;
}
.detail-actions {
  display: flex;
  gap: 8px;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.detail-field {
  display: flex;
  align-items: center;
  gap: 12px;
}
.detail-keywords {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.detail-content .content-title {
  margin-bottom: 4px;
}
.content-pre {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 420px;
  overflow-y: auto;
  font-size: 12px;
}
.caps-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.caps-form label {
  font-size: 12px;
  opacity: 0.85;
}
.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.caps-checkbox-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.caps-checkbox-grid :deep(.nm-checkbox) {
  margin: 0;
}
.caps-hint {
  margin: 0 0 4px;
  font-size: 11px;
}

.caps-delete-btn {
  color: var(--nm-color-error, #ef5350) !important;
}
.form-actions--corner {
  position: sticky;
  bottom: -14px;
  margin-top: 8px;
  padding: 10px 0 4px;
  justify-content: flex-end;
  background: linear-gradient(
    to top,
    var(--nm-surface-raised, #1c1c1c) 60%,
    transparent
  );
}

/* ── 智能体编辑器：头部信息卡 + 分区折叠 ── */
.team-editor {
  gap: 10px;
}
.team-hero__body {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}
.team-hero__avatar {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--panel-accent);
  color: var(--nm-text-on-primary, #000);
  font-weight: 700;
  font-size: 14px;
}
.team-hero__main {
  min-width: 0;
}
.team-hero__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: var(--nm-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.team-hero__id {
  margin-top: 2px;
  font-size: 11px;
  color: var(--nm-text-secondary);
  font-family: var(--nm-font-mono, monospace);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 分区标题行：标题 + 摘要（右侧灰字） */
.sec-title {
  font-weight: 600;
  font-size: 13px;
}
.sec-summary {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 400;
  color: var(--nm-text-secondary);
}
/* 分区内子块标题（插件 / 包 / 工具 / 技能） */
.sec-sub {
  margin: 8px 0 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-text-secondary);
}
/* 复选网格：自适应多列（减少纵向滚动） */
.caps-checkbox-grid--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 6px;
}
/* 折叠面板内的表单行间距压缩 */
.team-editor :deep(.nm-collapse__content-inner) {
  padding: 10px 12px;
}
.team-editor :deep(.nm-collapse__item) {
  margin-bottom: 6px;
}

/* 智能体表单：包 / 工具分组 */
.caps-tool-group {
  margin-bottom: 8px;
}
.caps-tool-group__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-text-secondary);
  margin-bottom: 4px;
}
.caps-pkg-members {
  font-size: 11px;
  padding-left: 26px;
}

/* Git 安装弹层（原工具条内联表单，2026-09-23 改为弹层） */
.git-modal {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 420px;
}
.git-modal__label {
  font-size: 12px;
  color: var(--nm-text-secondary);
}
.git-modal__req {
  color: var(--panel-err);
  margin-left: 2px;
}
.git-modal__row {
  display: flex;
  gap: 10px;
}
.git-modal__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.git-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* ── 技能工作台（2026-09-23 重排版） ─────────────────────────── */

/* 筛选栏：搜索 + 状态 chips + 分组维度 */
.caps-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.06));
  flex-shrink: 0;
  flex-wrap: wrap;
}
.caps-filters__search {
  width: 220px;
  flex-shrink: 0;
}
.caps-filters__chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
.caps-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--nm-text-primary) 6%, transparent);
  color: var(--nm-text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
  font-family: inherit;
}
.caps-chip:hover {
  background: var(--panel-hover);
  color: var(--nm-text-primary);
}
.caps-chip--active {
  background: var(--panel-accent-soft);
  border-color: var(--panel-accent);
  color: var(--nm-text-primary);
}
.caps-chip__count {
  font-size: 10px;
  padding: 0 4px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--nm-text-primary) 10%, transparent);
}
.caps-chip--active .caps-chip__count {
  background: var(--panel-accent);
  color: var(--nm-text-on-primary, #fff);
}

/* 列表分组提示行（如「所属包已禁用」） */
.caps-list-group__hint {
  padding: 2px 8px 6px 24px;
  font-size: 10.5px;
  color: var(--panel-warn);
  line-height: 1.35;
}

/* 技能行卡：双行（主行 + 描述行），hover 出快速开关 */
.caps-skill-item {
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 6px 8px 6px 10px;
}
.caps-skill-item--off .caps-skill-item__main,
.caps-skill-item--off .caps-skill-item__sub {
  opacity: 0.55;
}
.caps-skill-item__main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.caps-skill-item__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid var(--nm-text-placeholder, #888);
  background: transparent;
}
.caps-skill-item__dot--on {
  border-color: var(--panel-ok);
  background: var(--panel-ok);
}
.caps-skill-item__marks {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.caps-mark {
  font-size: 10px;
  line-height: 1.5;
  padding: 0 4px;
  border-radius: 5px;
  color: var(--nm-text-secondary);
  background: color-mix(in srgb, var(--nm-text-primary) 7%, transparent);
}
.caps-mark--always {
  color: var(--panel-warn);
}
.caps-mark--system {
  color: var(--panel-accent);
}
.caps-mark--git {
  color: var(--nm-text-secondary);
}
.caps-mark--warn {
  color: var(--panel-err);
}
.caps-skill-item__quick {
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.caps-skill-item:hover .caps-skill-item__quick,
.caps-skill-item--active .caps-skill-item__quick,
.caps-skill-item:focus-within .caps-skill-item__quick {
  opacity: 1;
}
.caps-skill-item__sub {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding-left: 13px;
}
.caps-skill-item__desc {
  font-size: 11px;
  color: var(--nm-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.caps-skill-item__kw {
  font-size: 10px;
  color: var(--nm-text-placeholder, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 分栏拖拽分隔条 */
.caps-resizer {
  width: 5px;
  flex-shrink: 0;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
}
.caps-resizer:hover {
  background: var(--panel-accent-soft);
}

/* 技能详情：分区检查器 */
.skill-detail {
  gap: 10px;
}
.skill-detail__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.skill-detail__pkg {
  font-size: 11px;
  color: var(--nm-text-placeholder, #888);
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--nm-text-primary) 6%, transparent);
}
.skill-detail__desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--nm-text-secondary);
  line-height: 1.5;
}
.skill-banner {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  background: color-mix(in srgb, var(--nm-text-primary) 5%, transparent);
  color: var(--nm-text-secondary);
}
.skill-banner--warn {
  background: color-mix(in srgb, var(--panel-warn) 14%, transparent);
  color: var(--panel-warn);
}
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.06));
  background: color-mix(in srgb, var(--nm-surface-raised) 45%, transparent);
}
.detail-section--grow {
  flex: 1;
  min-height: 0;
}
.detail-section__title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--nm-text-placeholder, #888);
}
.detail-section__title--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.detail-subfield {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.detail-subfield__label {
  font-size: 12px;
  color: var(--nm-text-secondary);
}
.detail-subfield__hint {
  font-size: 11px;
}
.skill-kw-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.skill-kw-add__input {
  width: 130px;
}
.skill-warn-icon {
  cursor: help;
  color: var(--panel-warn);
}
.skill-usage {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.skill-usage__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.skill-usage__team {
  font-size: 12px;
  min-width: 96px;
}
.skill-source {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.skill-source__row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.skill-source__row code {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.skill-source__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.skill-frontmatter {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11.5px;
}
.skill-content-preview {
  max-height: 460px;
  overflow-y: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  font-size: 12.5px;
}
.skill-content-pre {
  max-height: 460px;
}

/* 详情头部 ⋯ 菜单 */
.skill-menu {
  position: relative;
  display: inline-flex;
}
.skill-menu__backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
}
.skill-menu__panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 31;
  min-width: 132px;
  display: flex;
  flex-direction: column;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.12));
  background: var(--nm-surface-raised, #2a2a2a);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
}
.skill-menu__item {
  border: none;
  background: transparent;
  color: var(--nm-text-primary);
  font-size: 12.5px;
  font-family: inherit;
  text-align: left;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.skill-menu__item:hover {
  background: var(--panel-hover);
}
.skill-menu__item--danger {
  color: var(--panel-err);
}

/* 编辑表单吸底操作条（脏状态可见） */
.form-actions--sticky {
  position: sticky;
  bottom: -14px;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 0;
  margin-top: 8px;
  border-top: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.06));
}
.form-actions__state {
  margin-right: auto;
  font-size: 11.5px;
  color: var(--nm-text-placeholder, #888);
}
.form-actions__state--dirty {
  color: var(--panel-warn);
}

/* 空列表（技能筛选无结果）：文案 + 清除按钮 */
.caps-list-empty {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
</style>
