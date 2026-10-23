<script setup lang="ts">
//! 设置视图：API 配置 + 资源管理（技能/工具/插件/智能体）+ 运行日志的统一面板。
//!
//! 布局：左侧一级菜单（API 设置 + 四类资源 + 日志，带计数徽标），右侧为当前分类的工作区——
//! API 为整页表单（ApiSettings）；日志为整页查看器（LogView）；
//! 资源类为 工具条 + 条目列表（分组可折叠）+ 详情/编辑面板。
//! - API：快速模板 / 表单 / 测试连接 / Profiles（UpdateApiConfig / RenameApi / TestApi / SwitchApi / DeleteApi）
//! - 技能：启停、编辑（SaveSkill）、新建、删除（DeleteSkill）、Git 安装/更新/移除来源
//! - 工具：启停（ToggleTool）、参数 Schema 浏览
//! - 插件：启停（TogglePlugin）
//! - 智能体：选中即进编辑态（SaveTeam）、启停（ToggleTeam）、删除（DeleteTeam）
//! - 日志：Core/Panel 分段、5s 自动刷新（HTTP /api/logs/{core,panel}）
//! 数据来自后端 SkillsList / ToolsList / PluginsList / TeamsList 事件，打开时主动拉取；
//! API 配置随 state.api 事件更新。

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { lazy } from '../lazy';

const props = defineProps<{
  activeSessionId?: string | null;
  activeTeamId?: string | null;
}>();
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
import NeumorphismCheckbox from '@echolab-auto/ui-frame/components/NeumorphismCheckbox';
import { failoverEnabled, setFailoverEnabled } from '../failover';
import NeumorphismCollapse from '@echolab-auto/ui-frame/components/NeumorphismCollapse';
import NeumorphismDivider from '@echolab-auto/ui-frame/components/NeumorphismDivider';
import NeumorphismEmpty from '@echolab-auto/ui-frame/components/NeumorphismEmpty';
import { NeumorphismForm, NeumorphismFormItem } from '@echolab-auto/ui-frame/components/NeumorphismForm';
import NeumorphismInput from '@echolab-auto/ui-frame/components/NeumorphismInput';
import NeumorphismModal from '@echolab-auto/ui-frame/components/NeumorphismModal';
import NeumorphismSelect from '@echolab-auto/ui-frame/components/NeumorphismSelect';
import NeumorphismSegmented from '@echolab-auto/ui-frame/components/NeumorphismSegmented';
import NeumorphismSwitch from '@echolab-auto/ui-frame/components/NeumorphismSwitch';
import NeumorphismTable from '@echolab-auto/ui-frame/components/NeumorphismTable';
import NeumorphismTag from '@echolab-auto/ui-frame/components/NeumorphismTag';
import NeumorphismTextarea from '@echolab-auto/ui-frame/components/NeumorphismTextarea';
import { useToast } from '@echolab-auto/ui-frame/composables/useToast';
import { useTouchDevice } from '@echolab-auto/ui-frame/composables/useTouchDevice';
import PanelIcon from './PanelIcon.vue';
import { confirmDialog } from '../confirm';
import { state } from '../store';
import { coreDisplay, type PluginEventEntry } from '../state';
import { moveAgentToRegion } from '../agent-placement';
import {
  PACKAGE_DISPLAY_NAMES,
  PACKAGE_GATED_PLUGIN_IDS,
  PLUGIN_KIND_LABELS,
  isPluginCheckboxVisible,
  isInstancePluginKind,
} from '../capabilities';
import { sendCommand, sendPending } from '../connection';
import { releasePending, usePending } from '../pending';
import LoadHint from './LoadHint.vue';
import type { LoopMode, PluginInfo, SkillInfo, TeamInfo, ToolInfo } from '../protocol';
import { loopModeOf } from '../protocol';
import { applyMode, deriveMode } from '../loop-mode';
import { MarkdownRenderer } from '@echolab-auto/ui-frame/doc';
// 子设置页按需加载（2026-10 审计修复）：五个子页约 2300 行（含 LogView
// 挂载即开始的 5s 轮询），此前全随设置视图进首包；改为首次切入对应
// 分类时才加载（vite 对每个 import() 自动分包）。
const ApiSettings = lazy(() => import('./ApiSettings.vue'), 'ApiSettings');
const LogView = lazy(() => import('./LogView.vue'), 'LogView');
const FederationSettings = lazy(() => import('./FederationSettings.vue'), 'FederationSettings');
const UpstreamsSettings = lazy(() => import('./UpstreamsSettings.vue'), 'UpstreamsSettings');
const SelfUpdateSettings = lazy(() => import('./SelfUpdateSettings.vue'), 'SelfUpdateSettings');

const UNCATEGORIZED = '未分类';
const TOOL_BUILTIN = '内置工具';
const TOOL_OTHER = '扩展工具';

// ── 一级菜单：当前分类 ──
type CategoryKey = 'api' | 'skill' | 'tool' | 'plugin' | 'team' | 'cores' | 'system' | 'logs';
const activeCategory = ref<CategoryKey>('api');

// ── 列表加载跟踪（pending.ts）：四类清单各自的加载/慢/超时三态 ──
// 竖屏移动端（2026-10）：断点与库内 useTouchDevice 同源（innerWidth < 768）。
// 一级菜单变横滑 tab 条；工作台（技能/工具/插件/智能体）从「列表+详情并排」
// 退化为 Master-Detail 二级导航（详情态隐藏列表、头部出现返回按钮）。
const { isMobile } = useTouchDevice();

// 全局 toast（替代 window.alert，2026-10 审计修复）：provider 在 App 根挂载。
const { addToast } = useToast();
const { phase: skillPhase, loading: skillLoading } = usePending('settings:skills');
const { phase: toolPhase, loading: toolLoading } = usePending('settings:tools');
const { phase: pluginPhase, loading: pluginLoading } = usePending('settings:plugins');
const { phase: teamPhase, loading: teamLoading } = usePending('settings:teams');
const settingsLoading = computed(
  () =>
    skillLoading.value || toolLoading.value || pluginLoading.value || teamLoading.value,
);
onUnmounted(() => {
  releasePending('settings:skills');
  releasePending('settings:tools');
  releasePending('settings:plugins');
  releasePending('settings:teams');
});

// count 为 null 的分类不显示计数徽标（日志无条目概念）
const categories = computed(() => [
  { key: 'api' as const, label: 'API 设置', count: (state.api?.profiles?.length ?? 0) as number | null },
  // 清单加载中（loading）暂隐计数徽标——显示旧计数/0 都会被误读。
  { key: 'skill' as const, label: '技能', count: (skillLoading.value ? null : state.skills.length) as number | null },
  { key: 'tool' as const, label: '工具', count: (toolLoading.value ? null : state.tools.length) as number | null },
  { key: 'plugin' as const, label: '插件', count: (pluginLoading.value ? null : state.plugins.length) as number | null },
  { key: 'team' as const, label: '智能体', count: (teamLoading.value ? null : state.teams.length) as number | null },
  { key: 'cores' as const, label: 'Core 连接', count: null as number | null },
  // 连接管理合并页（2026-10：联邦并入）：上游 Core + 联邦节点。
  { key: 'system' as const, label: '系统', count: null as number | null },
  { key: 'logs' as const, label: '日志', count: null as number | null },
]);
const currentCategory = computed(
  () => categories.value.find((c) => c.key === activeCategory.value)!,
);
const disabledCount = computed(() => {
  switch (activeCategory.value) {
    case 'api':
    case 'logs':
    case 'cores':
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
  if (activeCategory.value === 'cores') {
    // 连接管理合并页（2026-10：联邦并入）：上游 Core + 联邦节点计数
    // （此前 cores 的 count 为 null，落到兜底分支会显示「共 null 项」）。
    const parts = [`上游 ${state.upstreams.length}`];
    // 联邦节点计数：优先按 Core 归档求和（联邦是 Core 之间的网络，
    // 不再只数"运行区域"那一份）；无归档时回落单值字段。
    const fedAll = Object.values(state.federations ?? {});
    const peers = fedAll.length
      ? fedAll.reduce((n, f) => n + (f?.peers?.length ?? 0), 0)
      : state.federation?.peers.length;
    if (peers != null) parts.push(`联邦节点 ${peers}`);
    return parts.join(' · ');
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
  if (activeCategory.value === 'tool') {
    const c = toolFilterCounts.value;
    const packages = new Set(state.tools.map((t) => t.package).filter(Boolean)).size;
    const parts = [`共 ${c.all} 项`];
    if (packages) parts.push(`${packages} 个包`);
    if (c.disabled) parts.push(`${c.disabled} 已禁用`);
    return parts.join(' · ');
  }
  if (activeCategory.value === 'plugin') {
    const c = pluginFilterCounts.value;
    // 统计必须与**列表同源**（pluginCatalog = 当前选定节点的插件）：
    // 用 state.plugins 时选了一个非 activeRegion 的节点会出现"共 5 项"
    // 但列表只显示 2 行（2026-10 多 Core 插件管理）。
    const catalog = pluginCatalog.value;
    const gated = catalog.filter((p) => pluginSemantic(p) === 'gated').length;
    const modes = catalog.filter((p) => pluginSemantic(p) === 'mode').length;
    const external = catalog.filter((p) => pluginSource(p) === 'external').length;
    const parts = [`共 ${c.all} 项`];
    // 当前分组维度决定哪个维度更值得说：按来源分组时先说内部/外部。
    if (pluginGroupBy.value === 'source') {
      if (external) parts.push(`${external} 外部插件`);
      if (c.all - external) parts.push(`${c.all - external} 内部插件`);
    } else {
      if (gated) parts.push(`${gated} 包维度门控`);
      if (modes) parts.push(`${modes} 模式插件`);
    }
    if (c.disabled) parts.push(`${c.disabled} 已禁用`);
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

async function switchCategory(cat: CategoryKey) {
  if (activeCategory.value === cat) return;
  if (activeCategory.value === 'skill' && !(await confirmDiscardSkillEdit())) return;
  if (activeCategory.value === 'team' && !(await confirmDiscardTeamEdit())) return;
  activeCategory.value = cat;
  resetTransient();
}

// ── 条目列表：按分类分组（组可折叠）──
// 排序 locale 约定（2026-10）：全部 `localeCompare` **pin 'en'**——不传
// locale 时按运行环境（LANG）选 collation：本地 zh_CN 与 CI en_US 下
// 「QQ 实例包」与「内置工具集」的顺序相反，测试与行为跨环境分裂
// （本地 zh 环境稳定失败、CI 过）。pin 后两环境完全一致。
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

/** 包 → 显示名（已知门控包用中文名；自定义包名原样显示）。
 *  `standalone` = 无包归属时的兜底文案（技能「独立技能」/ 工具「独立工具」）。 */
function skillPackageLabel(pkg: string | undefined, standalone = '独立技能'): string {
  if (!pkg) return standalone;
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
    items: v.items.sort((a, b) => a.name.localeCompare(b.name, 'en')),
  }));
  // 平铺不排序；其余按名称排序，但把「独立技能」放最后。
  if (skillGroupBy.value === 'flat') return entries;
  return entries.sort((a, b) => {
    if (a.key === '__standalone__') return 1;
    if (b.key === '__standalone__') return -1;
    return a.title.localeCompare(b.title, 'en');
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

async function toggleSkillSystem(skill: SkillInfo, system: boolean) {
  if (
    system &&
    !(await confirmDialog(
      `将「${skill.name}」设为系统提示词技能？\n\n其内容会注入该智能体的 base 区（身份/规则层），影响所有启用它的智能体，而不仅是触发词命中时。`,
      { title: '设为系统提示词技能' },
    ))
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

/** 有未保存改动时询问；返回 false = 取消当前动作（全局确认框，2026-10）。 */
async function confirmDiscardSkillEdit(): Promise<boolean> {
  if (!skillFormDirty.value) return true;
  return confirmDialog('技能编辑尚未保存，放弃更改？', {
    title: '放弃未保存的编辑',
    danger: true,
    confirmText: '放弃',
  });
}

// ── 工具工作台（2026-09-23 重排版，与技能工作台同构）──
//
// 背景（实测）：24 个工具的 category 全是 `builtin`，「按分类」分组只剩一个
// 「内置工具」；行内只有名字，判断用途/归属要逐个点开；无搜索无筛选。
// 工具的真实归属是 package（门控单位），故默认按包分组。

type ToolFilter = 'all' | 'enabled' | 'disabled';
const toolSearch = ref('');
const toolFilter = ref<ToolFilter>('all');
const toolGroupBy = ref<'package' | 'category' | 'flat'>('package');

const TOOL_FILTERS: { key: ToolFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'enabled', label: '已启用' },
  { key: 'disabled', label: '已禁用' },
];

const TOOL_GROUP_OPTIONS = [
  { label: '按包', value: 'package' },
  { label: '按分类', value: 'category' },
  { label: '平铺', value: 'flat' },
];

function toolMatchesFilter(t: ToolInfo, filter: ToolFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'enabled':
      return t.enabled;
    case 'disabled':
      return !t.enabled;
  }
}

const toolFilterCounts = computed(() => {
  const counts: Record<ToolFilter, number> = {
    all: state.tools.length,
    enabled: 0,
    disabled: 0,
  };
  for (const t of state.tools) {
    if (t.enabled) counts.enabled += 1;
    else counts.disabled += 1;
  }
  return counts;
});

const filteredTools = computed(() => {
  const needle = toolSearch.value.trim().toLowerCase();
  return state.tools.filter((t) => {
    if (!toolMatchesFilter(t, toolFilter.value)) return false;
    if (!needle) return true;
    return (
      t.name.toLowerCase().includes(needle) ||
      (t.description ?? '').toLowerCase().includes(needle)
    );
  });
});

/** 工具分组：按包 / 按分类 / 平铺（无包工具归「独立工具」）。 */
const toolWorkbenchGroups = computed(() => {
  const groups = new Map<string, { title: string; hint?: string; items: ToolInfo[] }>();
  const push = (key: string, title: string, hint: string | undefined, t: ToolInfo) => {
    if (!groups.has(key)) groups.set(key, { title, hint, items: [] });
    groups.get(key)!.items.push(t);
  };
  for (const t of filteredTools.value) {
    if (toolGroupBy.value === 'flat') {
      push('__all__', '全部工具', undefined, t);
    } else if (toolGroupBy.value === 'package') {
      const pkg = t.package?.trim();
      const key = pkg ? `pkg:${pkg}` : '__standalone__';
      push(
        key,
        skillPackageLabel(pkg, '独立工具'),
        pkg && disabledPluginIds.value.has(pkg) ? '所属包已禁用，包内工具当前不可用' : undefined,
        t,
      );
    } else {
      const cat = t.category?.trim()
        ? t.category === 'builtin'
          ? TOOL_BUILTIN
          : t.category
        : TOOL_OTHER;
      push(`cat:${cat}`, cat, undefined, t);
    }
  }
  const entries = [...groups.entries()].map(([key, v]) => ({
    key,
    title: v.title,
    hint: v.hint,
    items: v.items.sort((a, b) => a.name.localeCompare(b.name, 'en')),
  }));
  if (toolGroupBy.value === 'flat') return entries;
  return entries.sort((a, b) => {
    if (a.key === '__standalone__') return 1;
    if (b.key === '__standalone__') return -1;
    return a.title.localeCompare(b.title, 'en');
  });
});

/** 工具所属包是否被插件全局禁用（禁用后包内工具对模型不可见）。 */
function toolPackageDisabled(t: ToolInfo): boolean {
  return !!t.package && disabledPluginIds.value.has(t.package);
}

/** 工具行内快速开关（不改变选中）。 */
function quickToggleTool(tool: ToolInfo, enabled: boolean) {
  sendCommand({ ToggleTool: { name: tool.name, enabled } });
}

/** 工具使用面（被谁使用）：按 TeamsList 反查（与技能同一套四态）。 */
const toolUsageRows = computed(() => {
  const tool = selectedTool.value;
  if (!tool) return [] as { team: string; label: string; variant: 'primary' | 'error' | 'info' | 'success' }[];
  const rows: { team: string; label: string; variant: 'primary' | 'error' | 'info' | 'success' }[] = [];
  for (const t of state.teams) {
    const name = t.name || t.id;
    if ((t.disabled_tools ?? []).includes(tool.name)) {
      rows.push({ team: name, label: '已禁用', variant: 'error' });
    } else if ((t.enabled_tools ?? []).length && !(t.enabled_tools ?? []).includes(tool.name)) {
      rows.push({ team: name, label: '未列入白名单', variant: 'info' });
    } else {
      rows.push({ team: name, label: '可用', variant: 'success' });
    }
  }
  return rows;
});

/** 包内成员（工具 / 技能名列表）；插件详情与工具详情的「所属包」共用。 */
function packageMembers(pkgId: string | undefined): { tools: string[]; skills: string[] } {
  if (!pkgId) return { tools: [], skills: [] };
  return {
    tools: state.tools.filter((t) => t.package === pkgId).map((t) => t.name),
    skills: state.skills.filter((s) => s.package === pkgId).map((s) => s.name),
  };
}

/** 参数 Schema → 表格行（object 的 properties/required；非对象返回空）。 */
const toolParamRows = computed(() => {
  const schema = selectedTool.value?.parameters as
    | { properties?: Record<string, { type?: string; description?: string }>; required?: string[] }
    | null
    | undefined;
  const props = schema?.properties;
  if (!props) return [] as { name: string; type: string; required: boolean; description: string }[];
  const required = new Set(schema?.required ?? []);
  return Object.entries(props).map(([name, def]) => ({
    name,
    type: def?.type ?? '—',
    required: required.has(name),
    description: def?.description ?? '',
  }));
});

// 参数视图：表格 / JSON 原文
const toolParamMode = ref<'table' | 'json'>('table');
watch(
  () => selectedTool.value?.name,
  () => {
    toolParamMode.value = 'table';
    toolParamText.value = '';
    pluginInfoOpen.value = false;
  },
);
const toolParamText = ref('');
async function copyToolParams() {
  const text = paramText(selectedTool.value as ToolInfo);
  toolParamText.value = text;
  try {
    await navigator.clipboard.writeText(text);
    window.setTimeout(() => (toolParamText.value = ''), 1500);
  } catch {
    // 剪贴板不可用时保留文本可见，用户可手动复制
  }
}

// ── 插件工作台（2026-09-23 重排版）──
//
// 背景（实测）：9 个插件按 kind 分成 6 组，`Turn Runner`（英文）与
// 「工具」「技能」两组名误导；三类语义完全不同的插件（整包门控 / 平台通道 /
// 循环模式）平铺混排；详情一行塞满 ID/Package/Entry/Author。
// 门控语义分组把「影响面最大的整包门控」提到最上，模式插件单独成组并注明
// 「互斥；全局停用 ≠ 切换某智能体模式」。

type PluginFilter = 'all' | 'enabled' | 'disabled';
const pluginSearch = ref('');
const pluginFilter = ref<PluginFilter>('all');
const pluginGroupBy = ref<'source' | 'semantic' | 'kind' | 'flat'>('source');
const pluginCore = ref<string | null>(state.activeRegion);
// 跟随运行区域（2026-10 多 Core）：选择器初值在挂载时快照，设置页开着期间
// activeRegion 被 TeamsList 校正 / 上游增删改变时不跟随 → 插件面板停在旧 core，
// 与同页其他分类指向不同机器（用户以为改的是"当前这台"）。
watch(
  () => state.activeRegion,
  (next) => {
    pluginCore.value = next;
    selectedPlugin.value = null;
  },
);
/** 可选的管理节点：上游名 ∪ 人格归属 core ∪ 已知的 pluginsByCore 键。 */
const pluginCoreOptions = computed(() => {
  const ids = new Set<string>();
  for (const u of state.upstreams) ids.add(u.name);
  for (const t of state.teams) if (t.core) ids.add(t.core);
  for (const k of Object.keys(state.pluginsByCore)) if (k) ids.add(k);
  if (state.activeRegion) ids.add(state.activeRegion);
  return [...ids].sort((a, b) => a.localeCompare(b, 'en'));
});
/**
 * 实际生效的管理节点（选择器显示值）。
 *
 * 未显式选择时回退 activeRegion；再回退"唯一来源"——单上游配置下中继不加
 * 信封，事件里没有 core 名（`pluginsByCore` 的键是空串），而选择器的选项
 * 来自上游名，两者永远对不上。此时显示唯一来源，才不会出现"选了个节点却
 * 一片空白"。
 */
const pluginCoreEffective = computed<string | null>(() => {
  if (pluginCore.value) return pluginCore.value;
  if (state.activeRegion) return state.activeRegion;
  const known = Object.keys(state.pluginsByCore);
  return known.length === 1 ? known[0] : null;
});
/**
 * 当前节点的插件列表。
 *
 * 取数顺位：显式选定 / activeRegion 的归档 → **唯一来源**（单上游无壳场景，
 * 键为空串）→ `state.plugins`（Core 只在"本节点是管理目标"时才更新它，
 * 等价于当前节点的兼容视图）。
 *
 * ⚠️ 不要用 `state.plugins` 直接当列表：多 Core 下它是"最后推送的那份"，
 * 选了别的节点会串显。
 */
const pluginCatalog = computed(() => {
  const known = Object.keys(state.pluginsByCore);
  const key = pluginCoreEffective.value;
  if (key == null) {
    // 尚未选定节点：只有一个来源就用它，否则用 Core 维护的兼容视图
    // （`state.plugins` 只在"本节点是管理目标"时被更新）。
    return known.length === 1 ? (state.pluginsByCore[known[0]] ?? []) : state.plugins;
  }
  const exact = state.pluginsByCore[key];
  if (exact) return exact;
  // 单来源但键对不上（单上游无信封时键是空串，或选择器里是上游名）：
  // 只有一份数据就直接用它，避免"选了个节点却一片空白"。
  if (known.length === 1) return state.pluginsByCore[known[0]] ?? [];
  // 多来源且该节点还没推数据 → 空列表（绝不回退，否则串显别个节点）。
  return [];
});

const PLUGIN_FILTERS: { key: PluginFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'enabled', label: '已启用' },
  { key: 'disabled', label: '已禁用' },
];

const PLUGIN_GROUP_OPTIONS = [
  { label: '内部 / 外部', value: 'source' },
  { label: '按门控语义', value: 'semantic' },
  { label: '按 kind', value: 'kind' },
  { label: '平铺', value: 'flat' },
];

/** 门控语义分类（单一来源：分组、行内徽标、详情文案共用）。 */
const PLUGIN_SEMANTIC_LABELS: Record<string, string> = {
  gated: '包维度门控',
  channel: '平台通道',
  mode: '模式插件（互斥）',
  other: '其它',
};

function pluginSemantic(p: PluginInfo): 'gated' | 'channel' | 'mode' | 'other' {
  if (p.kind === 'loop') return 'mode';
  if (isInstancePluginKind(p.kind) || p.kind === 'management') return 'channel';
  if ((PACKAGE_GATED_PLUGIN_IDS as readonly string[]).includes(p.id)) return 'gated';
  return 'other';
}

/**
 * 插件的**来源分组**：内部 / 外部。
 *
 * 判定按**实现跑在哪**，不按「manifest 是否编译进 Core」（2026-10-18 二次
 * 修正）——用户对「外部插件」的语义预期就是「不在 Core 进程内」：独立 PID、
 * 独立生命周期、崩了不带走 Core。
 *
 * - `runtime === 'subprocess'` → 外部。QQ 实例即此类：门控 manifest 编译
 *   在 Core 里（`builtin = true`），但实例实现由独立进程
 *   `echo-instance-qq` 提供。早期按 `builtin` 判定会把它归到「内部插件」，
 *   而它自己的描述写着「独立进程」——分组与文案互相矛盾。
 * - 旧 Core 无 `runtime` 字段 → 回退按 `builtin` 推断（外部 manifest 一律是
 *   stdio 子进程）。
 */
function pluginSource(p: PluginInfo): 'builtin' | 'external' {
  if (p.runtime) return p.runtime === 'subprocess' ? 'external' : 'builtin';
  return p.builtin === false ? 'external' : 'builtin';
}
const PLUGIN_SOURCE_LABELS = { builtin: '内部插件', external: '外部插件' } as const;

/**
 * 插件的**来源**（manifest 从哪来），与 [`pluginSource`]（实现在哪跑）正交。
 *
 * 分组仍按运行位置（用户对「外部插件」的预期是「不在 Core 进程内」），
 * 但来源也要能看到——否则 `builtin = false` + `in_process` 的**数据插件**
 * （插件目录发现的 `plugin.toml`）会被分组吞掉，看不出它其实不随二进制发布。
 */
function pluginOrigin(p: PluginInfo): 'shipped' | 'configured' {
  return p.builtin === false ? 'configured' : 'shipped';
}
const PLUGIN_ORIGIN_LABELS = { shipped: '随二进制发布', configured: '外部来源' } as const;
/** 来源徽标（只在「外部来源」时显示——默认情况不必占视觉）。 */
function pluginOriginBadge(p: PluginInfo): string {
  return pluginOrigin(p) === 'configured' ? PLUGIN_ORIGIN_LABELS.configured : '';
}

/** 实现是否跑在独立子进程（=`外部插件`；判定见 [`pluginSource`]）。 */
function pluginIsSubprocess(p: PluginInfo): boolean { return pluginSource(p) === 'external'; }
const PLUGIN_RUNTIME_LABELS = { subprocess: '独立进程', in_process: '进程内' } as const;
/** 运行形态的人读标签（旧 Core 缺字段 → 进程内）。 */
function pluginRuntimeLabel(p: PluginInfo): string {
  return PLUGIN_RUNTIME_LABELS[p.runtime === 'subprocess' ? 'subprocess' : 'in_process'];
}

function pluginMatchesFilter(p: PluginInfo, filter: PluginFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'enabled':
      return p.enabled;
    case 'disabled':
      return !p.enabled;
  }
}

const pluginFilterCounts = computed(() => {
  const counts: Record<PluginFilter, number> = {
    all: pluginCatalog.value.length,
    enabled: 0,
    disabled: 0,
  };
  for (const p of pluginCatalog.value) {
    if (p.enabled) counts.enabled += 1;
    else counts.disabled += 1;
  }
  return counts;
});

const filteredPlugins = computed(() => {
  const needle = pluginSearch.value.trim().toLowerCase();
  return pluginCatalog.value.filter((p) => {
    if (!pluginMatchesFilter(p, pluginFilter.value)) return false;
    if (!needle) return true;
    return (
      p.name.toLowerCase().includes(needle) ||
      p.id.toLowerCase().includes(needle) ||
      (p.description ?? '').toLowerCase().includes(needle)
    );
  });
});

/** 插件分组：门控语义 / kind / 平铺。 */
const pluginWorkbenchGroups = computed(() => {
  const groups = new Map<string, { title: string; hint?: string; items: PluginInfo[] }>();
  const push = (key: string, title: string, hint: string | undefined, p: PluginInfo) => {
    if (!groups.has(key)) groups.set(key, { title, hint, items: [] });
    groups.get(key)!.items.push(p);
  };
  const SEMANTIC_HINT: Record<string, string | undefined> = {
    gated: '禁用 = 其包内全部工具/技能对所有智能体不可见',
    channel: '平台连接与管理通道；管理面禁用会切断 Panel 通信（受保护）',
    mode: '互斥模式：每智能体的循环模式在「智能体」配置里选；此处全局停用 = 卸载 echo-loop 驱动（两个都停回退内置循环）',
    other: undefined,
  };
  const ORDER: Record<string, number> = { gated: 0, channel: 1, mode: 2, other: 3 };
  for (const p of filteredPlugins.value) {
    if (pluginGroupBy.value === 'flat') {
      push('__all__', '全部插件', undefined, p);
    } else if (pluginGroupBy.value === 'source') {
      const source = pluginSource(p);
      // 外部组的 hint 要讲清「独立进程」而非「第三方」：QQ 实例随 Core
      // 发布，但实现在独立进程里（2026-10-18 报障的正是这一点）。
      push(
        `source:${source}`,
        PLUGIN_SOURCE_LABELS[source],
        source === 'external'
          ? '实现在独立进程（独立 PID / 生命周期）；随 Core 发布或来自插件目录'
          : '实现编译在 Core 进程内；随 Core 发布',
        p,
      );
    } else if (pluginGroupBy.value === 'semantic') {
      const sem = pluginSemantic(p);
      push(`sem:${sem}`, PLUGIN_SEMANTIC_LABELS[sem], SEMANTIC_HINT[sem], p);
    } else {
      const cat = PLUGIN_KIND_LABELS[p.kind] ?? p.kind;
      push(`kind:${cat}`, cat, undefined, p);
    }
  }
  const entries = [...groups.entries()].map(([key, v]) => ({
    key,
    title: v.title,
    hint: v.hint,
    items: v.items.sort((a, b) => a.id.localeCompare(b.id, 'en')),
  }));
  if (pluginGroupBy.value !== 'semantic') return entries;
  return entries.sort(
    (a, b) =>
      (ORDER[a.key.replace('sem:', '')] ?? 9) - (ORDER[b.key.replace('sem:', '')] ?? 9),
  );
});

/** 管理面插件受保护（禁用即断连自锁；kind 判定与 core 的拒绝对齐）。 */
function pluginProtected(p: PluginInfo): boolean {
  return p.id === MANAGEMENT_PANEL_PLUGIN_ID;
}

/** 插件行内快速开关（受保护的不给开关）。 */
function quickTogglePlugin(p: PluginInfo, enabled: boolean) {
  if (pluginProtected(p)) return;
  togglePlugin(p, enabled, pluginCoreEffective.value ?? undefined);
}

/** 插件「带来什么」：包内工具/技能（供列表徽标与详情 chip 展示）。 */
const pluginMembersById = computed(() => {
  const map = new Map<string, { tools: string[]; skills: string[] }>();
  for (const p of state.plugins) {
    map.set(p.id, packageMembers(p.package || p.id));
  }
  return map;
});

function pluginMembers(p: PluginInfo): { tools: string[]; skills: string[] } {
  return pluginMembersById.value.get(p.id) ?? { tools: [], skills: [] };
}

/** 插件使用面（被谁使用）：enabled_plugins 白名单反查。 */
const pluginUsageRows = computed(() => {
  const plugin = selectedPlugin.value;
  if (!plugin) return [] as { team: string; label: string; variant: 'primary' | 'error' | 'info' | 'success' }[];
  const rows: { team: string; label: string; variant: 'primary' | 'error' | 'info' | 'success' }[] = [];
  for (const t of state.teams) {
    const name = t.name || t.id;
    const list = t.enabled_plugins ?? [];
    if (list.length === 0 || list.includes(plugin.id)) {
      rows.push({ team: name, label: '已启用', variant: 'success' });
    } else {
      rows.push({ team: name, label: '未列入白名单', variant: 'info' });
    }
  }
  return rows;
});

/** 启停影响文案（按门控语义分派）。 */
const pluginImpactText = computed(() => {
  const p = selectedPlugin.value;
  if (!p) return '';
  if (pluginProtected(p)) {
    return '「管理面」插件承载 Panel ↔ Core 的 management 通道：禁用即断连自锁（无法经界面恢复），Core 侧拒绝经 TogglePlugin 禁用。确需禁用请编辑 core.toml 的 disabled_plugins 后重启 Core。';
  }
  // 外部条目（`plugins.toml` 的 stdio 插件）优先判：它的启停语义是
  // 「真的起停子进程」，与门控/通道/名义挂载三类都不同。
  if (pluginIsExternalEntry(p)) {
    const members = pluginMembers(p);
    const tools = members.tools.length;
    return `外部插件（独立进程）：启停**立即生效**——禁用会排空并退出该插件进程${tools > 0 ? `，其 ${tools} 个工具随即不可用` : ''}；启用会重新拉起并握手。同时写入 disabled_plugins，重启 Core 后保持当前状态。`;
  }
  const sem = pluginSemantic(p);
  if (sem === 'gated') {
    const members = pluginMembers(p);
    return `整包门控：禁用后其包内 ${members.tools.length} 个工具、${members.skills.length} 个技能对所有智能体不可见（含白名单内的智能体）。`;
  }
  if (sem === 'channel') {
    return '平台通道：禁用即卸载该实例/管理通道注册，对应平台会话与连接停止；对其他插件无影响。';
  }
  if (sem === 'mode') {
    return '模式插件：全局停用 = 卸载 echo-loop 驱动（单会话与并行多会话都停用则回退内置循环实现）。某智能体的「单会话 / 并行多会话」在「智能体」配置的循环模式里选择，与这里的全局开关是两层。';
  }
  return '名义挂载插件：启停写入 disabled_plugins，重启 Core 后生效。';
});

// 详情「技术信息」折叠态 + 参数复制反馈文本（选中切换时重置，见上方 watch）
const pluginInfoOpen = ref(false);

/** 跳到指定分类并选中条目（交叉跳转：插件 ⇄ 包内工具/技能）。 */
function jumpToCategory(cat: CategoryKey, name: string) {
  activeCategory.value = cat;
  resetTransient();
  if (cat === 'tool') {
    selectedTool.value = state.tools.find((t) => t.name === name) ?? null;
  } else if (cat === 'skill') {
    selectedSkill.value = state.skills.find((s) => s.name === name) ?? null;
  } else if (cat === 'plugin') {
    selectedPlugin.value = state.plugins.find((p) => p.id === name) ?? null;
  }
}

/** 当前分类是否存在「工作台」（筛选栏 + 可拖宽列表）：技能/工具/插件。 */
const hasWorkbench = computed(
  () =>
    activeCategory.value === 'skill' ||
    activeCategory.value === 'tool' ||
    activeCategory.value === 'plugin',
);
// ── 运行区域（多 Core）：「每个区域至少保留一个」判据 ──
/**
 * 可选运行区域 = 已配置上游 ∪ 当前运行区域 ∪ 已有 agent 的归属（同一口径
 * pluginCoreOptions）：上游列表尚未轮询到时也不至于给出空选项。
 */
const regionOptions = computed(() => {
  const ids = new Set(state.upstreams.map((u) => u.name));
  if (state.activeRegion) ids.add(state.activeRegion);
  for (const t of state.teams) if (t.core) ids.add(t.core);
  return [...ids].sort((a, b) => a.localeCompare(b, 'en'));
});
/** 是否多区域部署（决定「运行区域」选择器/徽标是否出现；单上游一律不显示）。 */
const multiRegion = computed(
  () => regionOptions.value.length > 1 || state.knownCores.size > 1,
);
/**
 * 同一区域（core）上的智能体数。
 *
 * 「至少保留一个」的判定必须按**该智能体所在区域**统计：一旦按合并后的
 * `state.teams.length` 判，`A 有 2 个 + B 有 1 个 = 3` 会让 B 的唯一一个也
 * 被允许删除——而区域只能靠"选中 agent"切换，B 删空后再无入口，整台机器
 * 从 UI 上失联。
 */
function teamsInCore(core: string | null | undefined): number {
  return state.teams.filter((t) => (t.core ?? null) === (core ?? null)).length;
}

// 智能体平铺列表：一律平等（去主智能体 2026-09）。排序键是 **(id, 区域)**：
// 多 Core 下同一个 id 可以在多台机器上各有一份，按 id 主序让它们相邻出现，
// 否则看起来就是"同一个名字错行显示了两次"（2026-10 多 Core 交互修复）。
const teamList = computed(() =>
  [...state.teams].sort(
    (a, b) =>
      a.id.localeCompare(b.id, 'en') || (a.core ?? '').localeCompare(b.core ?? '', 'en'),
  ),
);
/** 列表行是否显示区域徽标（多区域部署 + 该条有归属；单上游不占视觉）。 */
function showTeamRegion(core: string | null | undefined): boolean {
  return multiRegion.value && !!core;
}

// ── 条目选中 ──
async function selectSkillItem(s: SkillInfo) {
  // 已选同一技能的只读态：无需确认。编辑中（含点回同一行）都先确认脏改动，
  // 避免「点自己就把未保存内容丢掉」的静默数据丢失。
  const readOnlySame =
    selectedSkill.value?.name === s.name && !editing.value && !creating.value;
  if (!readOnlySame && !(await confirmDiscardSkillEdit())) return;
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
async function selectTeamItem(t: TeamInfo) {
  // 编辑中切条目（含点回自己——会重填表单）先走脏确认，防静默丢改动。
  if (!(await confirmDiscardTeamEdit())) return;
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
  cores: '',
  system: '',
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

/**
 * 移动端「详情态」：当前分类已选中条目（或处于编辑态）——此时隐藏条目列表、
 * 详情全宽显示（Master-Detail 二级导航；返回按钮见 closeMobileDetail）。
 * 仅工作台类（技能/工具/插件）与智能体有该形态；其余分类是整页表单，恒 false。
 */
const mobileDetailOpen = computed(() => {
  if (!isMobile.value) return false;
  switch (activeCategory.value) {
    case 'skill':
      return !!(selectedSkill.value || editing.value || creating.value);
    case 'tool':
      return !!selectedTool.value;
    case 'plugin':
      return !!selectedPlugin.value;
    case 'team':
      return !!(selectedTeam.value || teamEditing.value);
    default:
      return false;
  }
});

/** 工作台根节点的移动端类（列表态/详情态二选一；桌面 undefined = 原样）。 */
const mobileWorkspaceClass = computed(() => {
  if (!isMobile.value) return undefined;
  return mobileDetailOpen.value ? 'caps-workspace--mobile-detail' : 'caps-workspace--mobile-list';
});

/** 移动端详情「返回列表」：与各选择逻辑同口径先走脏确认，再清空选中/编辑态。 */
async function closeMobileDetail() {
  if (activeCategory.value === 'skill' && (editing.value || creating.value)) {
    if (!(await confirmDiscardSkillEdit())) return;
  }
  if (activeCategory.value === 'team' && teamEditing.value) {
    if (!(await confirmDiscardTeamEdit())) return;
  }
  resetTransient();
  selectedSkill.value = null;
  selectedTool.value = null;
  selectedPlugin.value = null;
  selectedTeam.value = null;
}

// ── Team 成员编辑（ui-frame 表单模型，NeumorphismForm 受控）──
const teamFormId = ref('');
const teamFormName = ref('');
const teamFormDescription = ref('');
const teamFormPrompt = ref('');
const teamFormEnabled = ref(true);
const teamEditing = ref(false);
/**
 * 该智能体的**运行区域**（= 它所在的上游 Core 名；null = 单上游/未标注）。
 *
 * 多 Core 下这是「命令发到哪台机器」的唯一显式依据：SaveTeam / DeleteTeam /
 * ToggleTeam 全部按它定向投递。此前三者都不带目标 core，一律落在 activeRegion
 * ——在设置页编辑 B 机器上的智能体，命令实际发进 A；A 上没有该 id 时还会
 * **凭空新建一份同名副本**（2026-10 多 Core 交互修复）。
 */
const teamFormCore = ref<string | null>(null);

// ── 运行区域（Plan B）：agent 自带区域，Panel 统一管理/迁移 ──
/** 可迁移到的其他区域（= 已配置上游，排除该 agent 当前所在区域）。 */
const otherRegions = computed(() =>
  state.upstreams
    .map((u) => u.name)
    .filter((name) => name !== (selectedTeam.value?.core ?? null)),
);
/** 详情页「迁移到其他区域」下拉的选中值（空 = 取第一个可选区域）。 */
const moveTargetRegion = ref('');
async function doMoveRegion() {
  const team = selectedTeam.value;
  const target = moveTargetRegion.value || otherRegions.value[0] || '';
  if (!team || !target) return;
  // 统一口径：用**配置名**（`[cores].name`）——它是命令路由键，也是设置页里
  // 用户自己填的值；区域名（`evence-4090-24` 之类）放 `coreDisplay().title`
  // 里，在需要时悬停可见（见 `state.ts::coreDisplay`）。
  const from = coreDisplay(state, team.core).name;
  const to = coreDisplay(state, target).name;
  const ok = await confirmDialog(
    `把「${team.name}」的运行区域从「${from}」改为「${to}」？\n\n` +
      `· 在目标区域创建/更新该 agent\n` +
      `· 从当前区域删除\n\n` +
      `注意：会话历史仍留在原区域，不会随迁移搬走。`,
    { title: '迁移运行区域', danger: true, confirmText: '迁移' },
  );
  if (!ok) return;
  moveAgentToRegion(team, target);
  selectedTeam.value = null;
}
const teamFormDisabledTools = ref<string[]>([]);
const teamFormDisabledSkills = ref<string[]>([]);
const teamFormEnabledPlugins = ref<string[]>([]);
const teamFormEnabledTools = ref<string[]>([]);
const teamFormEnabledSkills = ref<string[]>([]);
const teamFormSystemSkills = ref<string[]>([]);
/** 编辑已有成员时 ID 锁定；新建时 ID 可自由输入 */
const teamFormIsEdit = ref(false);

// ── 脏检查（与技能工作台同构；2026-10 巡检补齐）──
// 此前 team 编辑无任何脏保护：点另一条、点「新建智能体」、切分类都会静默
// 丢弃未保存的表单改动（技能工作台早有 skillFormDirty + 切换确认）。
/**
 * 表单里**没有输入控件、但必须原样透传**的 persona 字段。
 *
 * `SaveTeam` 是整对象覆盖：Core 侧 `process_commands::save_team` 直接用命令
 * 字段构造 `AgentProfile`，缺省即 `None`。表单不含这三项时，每次在设置页
 * 保存都会把「配置 Agent」弹层里设好的 API 供应商清成"跟随全局"，并把
 * per-persona 的 token 预算清空（2026-10 多 Core 交互修复）。
 */
const teamFormApiProfile = ref<string | null>(null);
const teamFormMemoryLimit = ref<number | null>(null);
const teamFormContextWindow = ref<number | null>(null);

function teamSnapshotOf(): string {
  return [
    teamFormId.value,
    teamFormName.value,
    teamFormCore.value ?? '',
    teamFormDescription.value,
    teamFormPrompt.value,
    teamFormEnabled.value ? '1' : '0',
    JSON.stringify(teamFormDisabledTools.value),
    JSON.stringify(teamFormDisabledSkills.value),
    JSON.stringify(teamFormEnabledPlugins.value),
    JSON.stringify(teamFormEnabledTools.value),
    JSON.stringify(teamFormEnabledSkills.value),
    JSON.stringify(teamFormSystemSkills.value),
  ].join('\u0000');
}
const teamFormSnapshot = ref('');
const teamFormDirty = computed(
  () =>
    teamEditing.value && !!teamFormSnapshot.value && teamSnapshotOf() !== teamFormSnapshot.value,
);

/** 有未保存改动时询问；返回 false = 取消当前动作（与技能工作台同口径）。 */
async function confirmDiscardTeamEdit(): Promise<boolean> {
  if (!teamFormDirty.value) return true;
  return confirmDialog('智能体配置尚未保存，放弃更改？', {
    title: '放弃未保存的编辑',
    danger: true,
    confirmText: '放弃',
  });
}

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
// 插件级勾选只保留"整类能力"：kind ∈ {instance, management} ∪ 包维度门控
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
    .sort((a, b) => a[0].localeCompare(b[0], 'en'))
    .map(([cat, items]) => ({
      cat,
      title: CATEGORY_LABEL[cat] ?? cat,
      items: items.sort((a, b) => a.label.localeCompare(b.label, 'en')),
    }));
});

// 能力工具选项：全部工具平铺。
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

/** 分区摘要：基础（启用态 + 循环模式 + 运行区域） */
const teamBasicSummary = computed(() => {
  const base = `${teamFormEnabled.value ? '启用' : '禁用'} · ${
    teamLoopMode.value === 'parallel' ? '并行多会话' : '单会话'
  }`;
  // 多区域部署下把区域并进摘要：「这个 agent 在哪台机器上」是一等信息，
  // 不该只藏在折叠分区里的选择器里（列表行同样带徽标，见 teamList 渲染）。
  return multiRegion.value ? `${base} · ${coreDisplay(state, teamFormCore.value).name}` : base;
});
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

async function startTeamCreate() {
  // 编辑中再点「新建智能体」→ 先确认（否则表单被静默清空）。
  if (!(await confirmDiscardTeamEdit())) return;
  activeCategory.value = 'team';
  teamEditing.value = true;
  teamFormIsEdit.value = false;
  teamFormId.value = '';
  teamFormName.value = '';
  // 新建默认落在**当前运行区域**（用户此刻所在的机器）；多区域下可用
  // 表单里的「运行区域」直接改成别的机器，无需"先建再迁"两步。
  teamFormCore.value = state.activeRegion;
  teamFormDescription.value = '';
  teamFormPrompt.value = '';
  teamFormEnabled.value = true;
  teamFormDisabledTools.value = [];
  teamFormDisabledSkills.value = [];
  teamFormEnabledPlugins.value = [];
  teamFormEnabledTools.value = [];
  teamFormEnabledSkills.value = [];
  teamFormSystemSkills.value = [];
  teamFormApiProfile.value = null;
  teamFormMemoryLimit.value = null;
  teamFormContextWindow.value = null;
  selectedTeam.value = null;
  teamFormSnapshot.value = teamSnapshotOf();
}

function startTeamEdit(agent: TeamInfo) {
  teamEditing.value = true;
  teamFormIsEdit.value = true;
  teamFormId.value = agent.id;
  teamFormName.value = agent.name;
  // 区域钉到**该条目自己的归属**：编辑 B 机器上的 agent 时命令必须发给 B，
  // 不能跟着 activeRegion（A）走（否则写到 A，甚至凭空新建同名副本）。
  teamFormCore.value = agent.core ?? null;
  teamFormDescription.value = agent.description;
  teamFormPrompt.value = agent.system_prompt ?? '';
  teamFormEnabled.value = agent.enabled;
  teamFormDisabledTools.value = agent.disabled_tools ?? [];
  teamFormDisabledSkills.value = agent.disabled_skills ?? [];
  teamFormEnabledPlugins.value = agent.enabled_plugins ?? [];
  teamFormEnabledTools.value = agent.enabled_tools ?? [];
  teamFormEnabledSkills.value = agent.enabled_skills ?? [];
  teamFormSystemSkills.value = agent.system_skills ?? [];
  teamFormApiProfile.value = agent.api_profile ?? null;
  teamFormMemoryLimit.value = agent.memory_limit_tokens ?? null;
  teamFormContextWindow.value = agent.context_window_tokens ?? null;
  teamFormSnapshot.value = teamSnapshotOf();
}

function cancelTeamEdit() {
  teamEditing.value = false;
  teamFormSnapshot.value = '';
}

/**
 * 表单 → `SaveTeam` 命令体（两个投递路径共用：就地保存 / 跨区域迁移）。
 *
 * 必须**带全字段**：Core 侧按命令字段整对象重建 `AgentProfile`，漏掉的字段
 * 会被当成"清空"（api_profile → 跟随全局、token 预算 → 继承全局）。
 */
function teamSaveCommand(id: string) {
  return {
    SaveTeam: {
      id,
      name: teamFormName.value.trim() || id,
      description: teamFormDescription.value.trim(),
      system_prompt: teamFormPrompt.value,
      enabled: teamFormEnabled.value,
      disabled_tools: teamFormDisabledTools.value,
      disabled_skills: teamFormDisabledSkills.value,
      enabled_plugins: teamFormEnabledPlugins.value,
      enabled_tools: teamFormEnabledTools.value,
      enabled_skills: teamFormEnabledSkills.value,
      system_skills: teamFormSystemSkills.value,
      memory_limit_tokens: teamFormMemoryLimit.value,
      context_window_tokens: teamFormContextWindow.value,
      api_profile: teamFormApiProfile.value,
    },
  };
}

async function saveTeam() {
  const id = teamFormId.value.trim() || teamFormName.value.trim();
  if (!id || !teamFormName.value.trim()) return;
  const target = teamFormCore.value;
  const from = selectedTeam.value?.core ?? null;
  // 编辑时改了运行区域 = 迁移（目标区域保存表单内容 + 源区域删除）。与详情页
  // 的「迁移」按钮同语义，区别是这里带上未保存的表单改动，不用先存一遍再搬。
  const moving = teamFormIsEdit.value && !!selectedTeam.value && (target ?? null) !== from;
  if (moving) {
    const ok = await confirmDialog(
      `把「${teamFormName.value.trim() || id}」的运行区域从「${coreDisplay(state, from).name}」` +
        `改为「${coreDisplay(state, target).name}」？\n\n` +
        `· 在目标区域创建/更新该智能体（保存当前表单内容）\n` +
        `· 从「${coreDisplay(state, from).name}」删除\n\n` +
        `注意：会话历史仍留在原区域，不会随迁移搬走。`,
      { title: '迁移运行区域', danger: true, confirmText: '迁移并保存' },
    );
    if (!ok) return;
    sendCommand(teamSaveCommand(id), target ?? undefined);
    sendCommand({ DeleteTeam: { id } }, from ?? undefined);
    selectedTeam.value = null;
  } else {
    sendCommand(teamSaveCommand(id), target ?? undefined);
  }
  teamEditing.value = false;
  teamFormSnapshot.value = '';
}

async function deleteTeam(team: TeamInfo) {
  // 去主智能体（2026-09）：没有受保护的"主 Agent"；唯一约束是**每个区域**
  // 至少保留一个（见 teamsInCore 的注释：按合并总数判会让某台机器被删空，
  // 之后再无入口切过去）。
  if (teamsInCore(team.core) <= 1) {
    addToast({
      message: `「${coreDisplay(state, team.core).name}」至少保留一个智能体，不能删除该区域最后一个。`,
      type: 'warning',
      duration: 5000,
    });
    return;
  }
  if (
    !(await confirmDialog(
      `确定删除智能体「${team.name}」（${coreDisplay(state, team.core).name}）？该成员的记忆与系统提示词将被移除，此操作不可恢复。`,
      { title: '删除智能体', danger: true, confirmText: '删除' },
    ))
  )
    return;
  // 定向到该条目自己的区域：不带 core 会落到 activeRegion，删掉的是另一台
  // 机器上同 id 的那份。
  sendCommand({ DeleteTeam: { id: team.id } }, team.core ?? undefined);
  selectedTeam.value = null;
  teamEditing.value = false;
  teamFormSnapshot.value = '';
}

// ── 技能启停 ──
function toggleSkill(skill: SkillInfo, enabled: boolean) {
  sendCommand({ ToggleSkill: { name: skill.name, enabled } });
}

// ── 插件启停 ──
// 管理面插件承载 Panel ↔ Core 的 management 通道：core 拒绝经 TogglePlugin
// 禁用它（防自锁），这里在 UI 侧提前明示，避免误以为操作生效。
const MANAGEMENT_PANEL_PLUGIN_ID = 'echo-agent.management.panel';

function togglePlugin(plugin: PluginInfo, enabled: boolean, targetCore?: string) {
  if (!enabled && plugin.id === MANAGEMENT_PANEL_PLUGIN_ID) {
    addToast({
      message:
        '「管理面」插件承载 Panel 与 Core 的通信通道，禁用即断连自锁（无法经界面恢复），已被保护。如需禁用请编辑 core.toml 的 disabled_plugins 后重启 Core。',
      type: 'warning',
      duration: 6000,
    });
    return;
  }
  sendCommand({ TogglePlugin: { id: plugin.id, enabled } }, targetCore);
}

/**
 * 插件「重启」= 卸下 + 重新挂载（Core 的 `RestartPlugin`），**不改**启用状态。
 *
 * 与「关再开」的差别：不写 `disabled_plugins`、不触发配置持久化——纯粹让
 * 插件按最新配置/外部状态重新初始化（子进程插件重连、实例插件重启进程）。
 * 管理面插件同样受保护：重启 = 先断 management WS，Panel 立即失联。
 */
function restartPlugin(plugin: PluginInfo, targetCore?: string) {
  if (plugin.id === MANAGEMENT_PANEL_PLUGIN_ID) {
    addToast({
      message:
        '「管理面」插件承载 Panel 与 Core 的通信通道，重启会先断开这条通道（Panel 无法经界面恢复）。如需重载请重启 Core 服务。',
      type: 'warning',
      duration: 6000,
    });
    return;
  }
  if (!plugin.enabled) {
    addToast({
      message: '插件当前未启用——先启用再重启（未挂载的插件没有可重载的实例）。',
      type: 'warning',
      duration: 5000,
    });
    return;
  }
  sendCommand({ RestartPlugin: { id: plugin.id } }, targetCore);
}

/** 行内「重启」入口（列表行与管理面用同一套保护判定）。 */
function quickRestartPlugin(p: PluginInfo) {
  restartPlugin(p, pluginCoreEffective.value ?? undefined);
}

/**
 * 插件的**配置来源层**（`plugins.toml` / `base.toml · layer 0`）。
 *
 * 空串 = 配置未提及（编译内置的缺省行为）。这条信息来自 Core 的分层合成，
 * 与 `echo-agent-core dump-config` 同源——面板只做展示，不解释合成规则。
 */
function pluginConfigOrigin(p: PluginInfo): string {
  return (p.config_origin ?? '').trim();
}

/** 挂载失败原因（与「用户主动禁用」区分开：两者 enabled 都是 false）。 */
function pluginMountError(p: PluginInfo): string {
  return (p.error ?? '').trim();
}

/**
 * 本插件要求的 **服务键**（`Ctx` 命名空间）；空串 = 无要求（旧 Core 也不发）。
 *
 * 用途不是装饰：挂载前 Core 会逐个校验这些键是否已注册，缺失即拒绝挂载
 * 并落进 `error`。所以这一行是 `error` 的**前置解释**——看到
 * 「缺 loop 服务」时，这里能看出它本来就要求 `loop`。
 */
function pluginRequiredServices(p: PluginInfo): string {
  return (p.required_services ?? []).filter(Boolean).join('、');
}

/** 软依赖（`Inject::optional`）：缺失不阻止挂载，只影响插件能做到什么。 */
function pluginOptionalServices(p: PluginInfo): string {
  return (p.optional_services ?? []).filter(Boolean).join('、');
}

/**
 * 此刻**还缺**的硬依赖；非空 = 这个插件在等（Core 会自动追平）。
 *
 * 与 `error` 分开显示：`error` 是挂载失败的原因，这里是"还没轮到的原因"。
 */
function pluginPendingServices(p: PluginInfo): string {
  return (p.pending_services ?? []).filter(Boolean).join('、');
}

/**
 * 插件订阅的事件名（`Contribution::Events` 的进程内等价物）。
 *
 * 空 = 不订阅。想确认"这个插件到底会对什么有反应"时看这一行；实际收到的
 * 事件见 [`pluginRecentEvents`]。
 */
function pluginSubscribedEvents(p: PluginInfo): string {
  return (p.subscribed_events ?? []).filter(Boolean).join('、');
}

/**
 * 该插件最近发出的**插件事件**（来自 `state.pluginEvents`，最多 5 条）。
 *
 * 只按 `plugin` 过滤——Core 自己的 lifecycle 事件（`plugin.mounted`）的
 * `plugin` 字段是空串，归到"宿主"名下，不混进某个插件的记录里。
 */
function pluginRecentEvents(p: PluginInfo): PluginEventEntry[] {
  return state.pluginEvents.filter((e) => e.plugin === p.id).slice(0, 5);
}

/**
 * 子进程运行态（`state`）的人读标签与色调。
 *
 * 空 = 进程内实现（没有独立生命周期）；只有 `plugins.toml` 的外部条目与
 * 实例门控壳才有这个字段。它描述的是**进程**，与 `enabled`（用户开关）
 * 正交——`ready` + `enabled=false` 是「开着但被停」，`failed` 是「起不来」。
 */
const PLUGIN_RUNTIME_STATE_LABELS: Record<string, string> = {
  pending: '启动中',
  ready: '运行中',
  draining: '停止中',
  stopped: '已停止',
  failed: '失败',
};
function pluginStateLabel(p: PluginInfo): string {
  const state = (p.state ?? '').trim();
  return PLUGIN_RUNTIME_STATE_LABELS[state] ?? '';
}
/**
 * 是不是 `plugins.toml` 的**外部条目**（stdio 子进程插件）。
 *
 * 判据与 Core 的 `PluginHost::is_external_entry` 一致：`subprocess` 且
 * `builtin = false`。实例门控壳是 `subprocess + builtin`（manifest 编译在
 * Core 里），不算——它有自己的启停通道。
 */
function pluginIsExternalEntry(p: PluginInfo): boolean {
  return p.runtime === 'subprocess' && p.builtin === false;
}

/** 运行态是否处于故障（决定徽标用红还是中性色）。 */
function pluginStateIsError(p: PluginInfo): boolean {
  return (p.state ?? '').trim() === 'failed';
}
/**
 * 启动命令的展示文本：`命令 + 参数`（参数为空时只有命令）。
 *
 * 用途是排查「命令拼错 / 路径不存在 / 参数漏了」——与 `error` 一起看。
 * 命令来自 `plugins.toml`，Panel 只展示不执行。
 */
function pluginLaunchCommand(p: PluginInfo): string {
  const command = (p.command ?? '').trim();
  if (!command) return '';
  const args = p.args ?? [];
  return args.length > 0 ? `${command} ${args.join(' ')}` : command;
}

/** 是否刚从崩溃里恢复过（有重启次数才显示，常态不占视觉）。 */
function pluginRestartNote(p: PluginInfo): string {
  const restarts = p.restarts ?? 0;
  if (restarts <= 0) return '';
  return `已自动重启 ${restarts} 次`;
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

// 克隆耗时：秒级（本地 / 内网）到分钟级（公网、慢链路，Core 侧硬超时 120s）。
// 弹层在此期间保持打开并显示进度——否则用户面对的是两分钟静默，无从判断
// 是"在跑"还是"点了没反应"（2026-10-18 实查：HTTPS 不可达时正是如此）。
const gitInstalling = ref(false);
const gitInstallStartedAt = ref(0);
const gitInstallElapsed = ref(0);
const gitInstallSlow = ref(false);
let gitInstallTimer: ReturnType<typeof setInterval> | null = null;

function stopGitInstallTimer() {
  if (gitInstallTimer) clearInterval(gitInstallTimer);
  gitInstallTimer = null;
}

function startGitInstallWatch() {
  gitInstalling.value = true;
  gitInstallStartedAt.value = Date.now();
  gitInstallElapsed.value = 0;
  gitInstallSlow.value = false;
  stopGitInstallTimer();
  gitInstallTimer = setInterval(() => {
    const secs = Math.round((Date.now() - gitInstallStartedAt.value) / 1000);
    gitInstallElapsed.value = secs;
    gitInstallSlow.value = secs >= 20;
  }, 500);
}

/** 技能列表变化 = 安装成功（Core 装完即推 SkillsList）。 */
watch(
  () => state.skills.map((s) => s.name).join('\u0000'),
  () => {
    if (!gitInstalling.value) return;
    gitInstalling.value = false;
    stopGitInstallTimer();
    gitUrl.value = '';
    gitName.value = '';
    gitBranch.value = '';
    gitModalOpen.value = false;
  },
);

onUnmounted(stopGitInstallTimer);

function installGitSkill() {
  if (!gitUrl.value.trim() || gitInstalling.value) return;
  sendCommand({
    InstallSkillFromGit: {
      url: gitUrl.value.trim(),
      name: gitName.value.trim() || null,
      branch: gitBranch.value.trim() || null,
    },
  });
  startGitInstallWatch();
}

function updateGitSkill(skill: SkillInfo) {
  sendCommand({ UpdateSkillFromGit: { name: skill.name } });
}

async function removeGitSource(skill: SkillInfo) {
  if (
    !(await confirmDialog(`移除 ${skill.name} 的 Git 来源记录？（目录保留，可手动删除）`, {
      title: '移除 Git 来源',
      danger: true,
      confirmText: '移除',
    }))
  )
    return;
  sendCommand({ RemoveSkillSource: { name: skill.name } });
}

// ── 新建 / 编辑 / 保存 / 删除 ──
async function startCreate() {
  if (!(await confirmDiscardSkillEdit())) return;
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

async function deleteSkill(skill: SkillInfo) {
  if (
    !(await confirmDialog(`确定删除技能「${skill.name}」？该操作会删除 SKILL.md 文件。`, {
      title: '删除技能',
      danger: true,
      confirmText: '删除',
    }))
  )
    return;
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

// 数据刷新：面板需要时拉取（列表也可能由后端变更事件自动更新）。
// 各清单独立登记加载跟踪（徽标暂隐 / 列表骨架 / 超时重试，见 pending.ts）。
function refreshSkills() {
  sendPending('RequestSkillsList', 'settings:skills');
}
function refreshTools() {
  sendPending('RequestToolsList', 'settings:tools');
}
function refreshPlugins() {
  sendPending('RequestPluginsList', 'settings:plugins');
}
function refreshTeams() {
  sendPending('RequestTeamsList', 'settings:teams');
}
function refresh() {
  refreshSkills();
  refreshTools();
  refreshPlugins();
  refreshTeams();
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
    if (!selectedTeam.value) return;
    const cur = selectedTeam.value;
    // 身份是 (core, id)：只按 id 校验会让"另一台机器上同 id 的条目"顶替
    // 当前选中项——后续编辑/删除继续打向正确的 core 才对，选中项必须是
    // 同一台机器上的那一条（2026-10 多 Core 交互修复）。
    const kept = state.teams.some(
      (t) => t.id === cur.id && (t.core ?? null) === (cur.core ?? null),
    );
    if (!kept) {
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
      <NeumorphismButton size="small" variant="glass" :loading="settingsLoading" @click="refresh">刷新</NeumorphismButton>
    </nav>

    <!-- 分类工作区 -->
    <div class="caps-body">
      <div class="caps-toolbar">
        <!-- 移动端 Master-Detail 返回（2026-10）：仅详情态出现 -->
        <NeumorphismButton
          v-if="mobileDetailOpen"
          size="small"
          variant="glass"
          class="caps-mobile-back"
          aria-label="返回列表"
          @click="closeMobileDetail"
        >
          ← 返回
        </NeumorphismButton>
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

      <!-- 工作台筛选栏（技能 / 工具 / 插件）：搜索 + 状态筛选 + 分组维度 -->
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

      <div v-else-if="activeCategory === 'tool'" class="caps-filters">
        <NeumorphismInput
          v-model="toolSearch"
          placeholder="搜索名称 / 描述"
          size="small"
          class="caps-filters__search"
        />
        <div class="caps-filters__chips">
          <button
            v-for="f in TOOL_FILTERS"
            :key="f.key"
            type="button"
            class="caps-chip"
            :class="{ 'caps-chip--active': toolFilter === f.key }"
            @click="toolFilter = f.key"
          >
            {{ f.label }}
            <span class="caps-chip__count">{{ toolFilterCounts[f.key] }}</span>
          </button>
        </div>
        <NeumorphismSegmented
          v-model="toolGroupBy"
          :options="TOOL_GROUP_OPTIONS"
          size="small"
          aria-label="分组维度"
        />
      </div>

      <div v-else-if="activeCategory === 'plugin'" class="caps-filters">
        <NeumorphismSelect :model-value="pluginCoreEffective ?? ''" :options="pluginCoreOptions.map(core => ({ label: coreDisplay(state, core).title, value: core }))" size="small" aria-label="管理节点" @update:model-value="pluginCore = String($event ?? '') || null; selectedPlugin = null; sendPending('RequestPluginsList', 'settings:plugins', pluginCoreEffective ?? undefined)" />
        <NeumorphismInput
          v-model="pluginSearch"
          placeholder="搜索名称 / ID / 描述"
          size="small"
          class="caps-filters__search"
        />
        <div class="caps-filters__chips">
          <button
            v-for="f in PLUGIN_FILTERS"
            :key="f.key"
            type="button"
            class="caps-chip"
            :class="{ 'caps-chip--active': pluginFilter === f.key }"
            @click="pluginFilter = f.key"
          >
            {{ f.label }}
            <span class="caps-chip__count">{{ pluginFilterCounts[f.key] }}</span>
          </button>
        </div>
        <NeumorphismSegmented
          v-model="pluginGroupBy"
          :options="PLUGIN_GROUP_OPTIONS"
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

      <!-- Core 连接工作区（2026-10 合并）：上游 Core（聚合视图）+ 联邦网络
           （运行区域 peer 管理 + 邀请串配对）——连接管理统一入口。 -->
      <div v-else-if="activeCategory === 'cores'" class="caps-workspace">
        <div class="caps-detail-pane">
          <!-- 失效转移（P3）：主节点连续离线时是否自动切到在线候选节点。
               语义是**换节点、换会话**——旧节点上的会话不可达（它恢复后仍在，
               不会自动切回）。 -->
          <div class="caps-toggle-row">
            <div>
              <div class="caps-toggle-row__label">主节点失联时自动切换到在线节点</div>
              <div class="caps-toggle-row__desc">连续离线约 24s 后切换；旧节点上的会话暂不可达（恢复后仍在，不自动切回）</div>
            </div>
            <NeumorphismCheckbox
              :model-value="failoverEnabled()"
              @update:model-value="setFailoverEnabled($event)"
            />
          </div>
          <UpstreamsSettings />
          <NeumorphismDivider class="cores-merged__sep" />
          <FederationSettings
            :active-session-id="props.activeSessionId"
            :active-team-id="props.activeTeamId"
          />
        </div>
      </div>

      <!-- 系统工作区：框架自更新 -->
      <div v-else-if="activeCategory === 'system'" class="caps-workspace">
        <div class="caps-detail-pane">
          <SelfUpdateSettings />
        </div>
      </div>

      <!-- 日志工作区：整页查看器（无条目列表；切走即卸载并停止轮询） -->
      <div v-else-if="activeCategory === 'logs'" class="caps-workspace">
        <div class="caps-detail-pane">
          <LogView />
        </div>
      </div>

      <!-- 资源工作区：条目列表 + 详情/编辑（移动端 Master-Detail，见 mobileWorkspaceClass） -->
      <div v-else class="caps-workspace" :class="mobileWorkspaceClass">
        <!-- 条目列表 -->
        <!-- 列表宽度：工作台（技能/工具/插件）可拖拽（其余分类沿用默认 250px）；
             移动端不绑定（列表全宽、详情态隐藏） -->
        <div
          class="caps-list"
          :style="hasWorkbench && !isMobile ? { width: capsListWidth + 'px' } : undefined"
        >
          <!-- 技能：工作台分组（按包 / 按分类 / 平铺）+ 双行行卡 -->
          <template v-if="activeCategory === 'skill'">
            <LoadHint :phase="skillPhase" label="技能清单" @retry="refreshSkills" />
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
                      <span
                        v-if="s.always"
                        class="caps-mark caps-mark--always caps-mark--icon"
                        title="常驻：每轮都注入"
                      >
                        <PanelIcon name="pin" size="xs" />
                      </span>
                      <span
                        v-if="s.system"
                        class="caps-mark caps-mark--system caps-mark--icon"
                        title="系统提示词技能"
                      >
                        <PanelIcon name="sparkle" size="xs" />
                      </span>
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
            <div v-if="skillWorkbenchGroups.length === 0 && skillPhase === 'idle'" class="caps-list-empty">
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

          <!-- 工具：工作台分组（按包 / 按分类 / 平铺）+ 双行行卡 -->
          <template v-else-if="activeCategory === 'tool'">
            <LoadHint :phase="toolPhase" label="工具清单" @retry="refreshTools" />
            <div v-for="g in toolWorkbenchGroups" :key="g.key" class="caps-list-group">
              <div class="caps-list-group__head" @click="toggleGroup('tool:' + g.key)">
                <span class="caret">{{ isCollapsed('tool:' + g.key) ? '▸' : '▾' }}</span>
                <span class="caps-list-group__name">{{ g.title }}</span>
                <span class="caps-count caps-count--soft">{{ g.items.length }}</span>
              </div>
              <template v-if="g.hint">
                <div class="caps-list-group__hint">{{ g.hint }}</div>
              </template>
              <template v-if="!isCollapsed('tool:' + g.key)">
                <div
                  v-for="t in g.items"
                  :key="t.name"
                  class="caps-list-item caps-skill-item"
                  :class="{
                    'caps-list-item--active': selectedTool?.name === t.name,
                    'caps-skill-item--off': !t.enabled,
                  }"
                  @click="selectToolItem(t)"
                >
                  <div class="caps-skill-item__main">
                    <span
                      class="caps-skill-item__dot"
                      :class="{ 'caps-skill-item__dot--on': t.enabled }"
                      :title="t.enabled ? '已启用' : '已禁用'"
                    />
                    <span class="caps-list-item__name">{{ t.name }}</span>
                    <span class="caps-skill-item__marks">
                      <span v-if="toolPackageDisabled(t)" class="caps-mark caps-mark--warn" title="所属包已禁用">
                        包已禁用
                      </span>
                    </span>
                    <span class="caps-skill-item__quick" @click.stop>
                      <NeumorphismSwitch
                        :model-value="t.enabled"
                        size="small"
                        @change="quickToggleTool(t, $event)"
                      />
                    </span>
                  </div>
                  <div class="caps-skill-item__sub">
                    <span class="caps-skill-item__desc">{{ t.description || '（无描述）' }}</span>
                  </div>
                </div>
              </template>
            </div>
            <div v-if="toolWorkbenchGroups.length === 0 && toolPhase === 'idle'" class="caps-list-empty">
              <span class="muted">无匹配工具</span>
              <NeumorphismButton
                v-if="toolSearch || toolFilter !== 'all'"
                size="small"
                variant="glass"
                @click="toolSearch = ''; toolFilter = 'all'"
              >
                清除筛选
              </NeumorphismButton>
            </div>
          </template>

          <!-- 插件：工作台分组（门控语义 / kind / 平铺）+ 双行行卡 -->
          <template v-else-if="activeCategory === 'plugin'">
            <LoadHint :phase="pluginPhase" label="插件清单" @retry="refreshPlugins" />
            <div v-for="g in pluginWorkbenchGroups" :key="g.key" class="caps-list-group">
              <div class="caps-list-group__head" @click="toggleGroup('plugin:' + g.key)">
                <span class="caret">{{ isCollapsed('plugin:' + g.key) ? '▸' : '▾' }}</span>
                <span class="caps-list-group__name">{{ g.title }}</span>
                <span class="caps-count caps-count--soft">{{ g.items.length }}</span>
              </div>
              <template v-if="g.hint">
                <div class="caps-list-group__hint caps-list-group__hint--neutral">{{ g.hint }}</div>
              </template>
              <template v-if="!isCollapsed('plugin:' + g.key)">
                <div
                  v-for="p in g.items"
                  :key="p.id"
                  class="caps-list-item caps-skill-item"
                  :class="{
                    'caps-list-item--active': selectedPlugin?.id === p.id,
                    'caps-skill-item--off': !p.enabled,
                  }"
                  @click="selectPluginItem(p)"
                >
                  <div class="caps-skill-item__main">
                    <span
                      class="caps-skill-item__dot"
                      :class="{ 'caps-skill-item__dot--on': p.enabled }"
                      :title="p.enabled ? '已启用' : '已禁用'"
                    />
                    <span class="caps-list-item__name">{{ p.name }}</span>
                    <span class="caps-skill-item__marks">
                      <span
                        v-if="pluginMembers(p).tools.length || pluginMembers(p).skills.length"
                        class="caps-mark"
                        :title="`包内 ${pluginMembers(p).tools.length} 工具 · ${pluginMembers(p).skills.length} 技能`"
                      >
                        {{ pluginMembers(p).tools.length }} 工具 · {{ pluginMembers(p).skills.length }} 技能
                      </span>
                      <span
                        v-if="pluginIsSubprocess(p)"
                        class="caps-mark caps-mark--system"
                        :title="`实现在独立子进程（Core 侧只有启停门控）：${p.name}`"
                      >
                        独立进程
                      </span>
                      <span
                        v-if="pluginProtected(p)"
                        class="caps-mark caps-mark--warn caps-mark--icon"
                        title="禁用即断连自锁，Core 拒绝"
                      >
                        <PanelIcon name="lock" size="xs" tone="warn" />
                        受保护
                      </span>
                      <span v-else-if="pluginSemantic(p) === 'mode'" class="caps-mark caps-mark--system" title="互斥模式插件">
                        模式
                      </span>
                      <span
                        v-if="pluginStateLabel(p) && p.state !== 'ready'"
                        class="caps-mark caps-mark--icon"
                        :class="pluginStateIsError(p) ? 'caps-mark--err' : 'caps-mark--system'"
                        :title="`子进程运行态：${pluginStateLabel(p)}${pluginRestartNote(p) ? ' · ' + pluginRestartNote(p) : ''}`"
                      >
                        {{ pluginStateLabel(p) }}
                      </span>
                      <span
                        v-if="pluginOriginBadge(p)"
                        class="caps-mark caps-mark--git"
                        title="来源：不是编译进本二进制的插件（plugins.toml 条目或插件目录发现）"
                      >
                        {{ pluginOriginBadge(p) }}
                      </span>
                      <span
                        v-if="pluginMountError(p)"
                        class="caps-mark caps-mark--err caps-mark--icon"
                        :title="`装配失败：${pluginMountError(p)}`"
                      >
                        <PanelIcon name="warning" size="xs" tone="err" />
                        失败
                      </span>
                    </span>
                    <span class="caps-skill-item__quick" @click.stop>
                      <span
                        v-if="pluginProtected(p)"
                        class="caps-lock"
                        title="禁用即断连自锁（受保护）"
                      >
                        <PanelIcon name="lock" size="sm" tone="warn" aria-label="受保护" />
                      </span>
                      <template v-else>
                        <button
                          v-if="p.enabled"
                          type="button"
                          class="plugin-restart-btn"
                          title="重启（卸下后重新挂载，不改启用状态）"
                          aria-label="重启插件"
                          @click="quickRestartPlugin(p)"
                        >
                          <PanelIcon name="refresh" size="xs" />
                        </button>
                        <NeumorphismSwitch
                          :model-value="p.enabled"
                          size="small"
                          @change="quickTogglePlugin(p, $event)"
                        />
                      </template>
                    </span>
                  </div>
                  <div class="caps-skill-item__sub">
                    <span class="caps-skill-item__desc">{{ p.description || '（无描述）' }}</span>
                  </div>
                </div>
              </template>
            </div>
            <div v-if="pluginWorkbenchGroups.length === 0 && pluginPhase === 'idle'" class="caps-list-empty">
              <span class="muted">无匹配插件</span>
              <NeumorphismButton
                v-if="pluginSearch || pluginFilter !== 'all'"
                size="small"
                variant="glass"
                @click="pluginSearch = ''; pluginFilter = 'all'"
              >
                清除筛选
              </NeumorphismButton>
            </div>
          </template>

          <!-- 智能体：平铺列表 -->
          <template v-else>
            <LoadHint :phase="teamPhase" label="智能体清单" @retry="refreshTeams" />
            <div
              v-for="t in teamList"
              :key="`${t.core ?? ''}:${t.id}`"
              class="caps-list-item"
              :class="{
                'caps-list-item--active':
                  selectedTeam?.id === t.id &&
                  (selectedTeam?.core ?? null) === (t.core ?? null),
              }"
              @click="selectTeamItem(t)"
            >
              <span class="caps-list-item__name">{{ t.name }}</span>
              <span
                v-if="showTeamRegion(t.core)"
                class="caps-mark"
                :title="`运行区域：${coreDisplay(state, t.core).title}`"
              >
                {{ coreDisplay(state, t.core).name }}
              </span>
              <span v-if="!t.enabled" class="muted caps-list-item__flag">已禁用</span>
            </div>
            <div v-if="teamList.length === 0 && teamPhase === 'idle'" class="muted caps-list-empty">（暂无智能体）</div>
          </template>
        </div>

        <!-- 分栏拖拽分隔条（列表宽度可调；技能/工具/插件工作台用） -->
        <div
          v-if="hasWorkbench"
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
                  <span
                    class="skill-warn-icon"
                    title="高风险：内容会进入所有启用它的智能体的系统提示词"
                  >
                    <PanelIcon name="warning" size="sm" tone="warn" aria-label="高风险" />
                  </span>
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
                  v-if="teamsInCore(selectedTeam.core) > 1"
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
                @change="
                  sendCommand(
                    { ToggleTeam: { id: selectedTeam!.id, enabled: $event } },
                    selectedTeam!.core ?? undefined,
                  )
                "
              />
            </div>
            <p class="muted">{{ selectedTeam.description || '（无描述）' }}</p>
            <div class="detail-field">
              <span>运行区域</span>
              <NeumorphismTag variant="info" size="small">
                {{ coreDisplay(state, selectedTeam.core).name }}
              </NeumorphismTag>
            </div>
            <div v-if="otherRegions.length" class="detail-field">
              <span>迁移到其他区域（会话历史不随迁移）</span>
              <div class="team-move">
                <select v-model="moveTargetRegion" class="team-move__select">
                  <option v-for="r in otherRegions" :key="r" :value="r">
                    {{ coreDisplay(state, r).title }}
                  </option>
                </select>
                <NeumorphismButton size="small" variant="glass" @click="doMoveRegion">
                  迁移
                </NeumorphismButton>
              </div>
            </div>
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
                  <!-- 运行区域（多 Core）：决定这个 agent 建在/跑在哪台机器上。
                       新建时默认当前区域，可直接改成别的机器（无需"先建再迁"）；
                       编辑时改它 = 保存后迁到目标区域（见 saveTeam）。 -->
                  <NeumorphismFormItem v-if="multiRegion" label="运行区域">
                    <NeumorphismSelect
                      :model-value="teamFormCore ?? regionOptions[0] ?? ''"
                      :options="regionOptions.map((r) => ({ label: coreDisplay(state, r).title, value: r }))"
                      size="small"
                      aria-label="运行区域"
                      @update:model-value="teamFormCore = String($event ?? '') || null"
                    />
                    <p class="muted caps-hint">
                      该智能体的配置与运行都在这个 Core 上；改动已有智能体的区域 = 保存时迁移（会话历史留在原区域）。
                    </p>
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
                    勾选该智能体可用的能力块（实例/交互/管理面）；全选 = 不限制（默认）。内置工具集不在此列，请在下方按工具勾选。
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
                    同一个包（如 QQ 实例）的工具+技能作为一个整体，勾选/取消即同时开关包内所有成员。
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
                <span
                  class="form-actions__state"
                  :class="{ 'form-actions__state--dirty': teamFormDirty }"
                >
                  {{ teamFormDirty ? '● 有未保存的更改' : '○ 无更改' }}
                </span>
                <NeumorphismButton
                  v-if="teamFormIsEdit && selectedTeam && teamsInCore(selectedTeam.core) > 1"
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

          <!-- 插件详情（分区检查器：带来什么 / 被谁使用 / 启停影响 / 技术信息） -->
          <div v-else-if="activeCategory === 'plugin' && selectedPlugin" class="caps-detail skill-detail">
            <div class="detail-head">
              <div class="skill-detail__title">
                <h3>{{ selectedPlugin.name }}</h3>
                <span class="skill-detail__pkg">{{ PLUGIN_SEMANTIC_LABELS[pluginSemantic(selectedPlugin)] }}</span>
              </div>
              <div class="detail-actions">
                <NeumorphismTag v-if="pluginIsSubprocess(selectedPlugin)" variant="info" size="small">
                  外部插件 · 独立进程
                </NeumorphismTag>
                <span
                  v-if="pluginProtected(selectedPlugin)"
                  class="caps-mark caps-mark--warn caps-mark--icon"
                >
                  <PanelIcon name="lock" size="xs" tone="warn" />
                  受保护
                </span>
                <NeumorphismButton
                  v-if="!pluginProtected(selectedPlugin) && selectedPlugin.enabled"
                  size="small"
                  variant="glass"
                  title="卸下后重新挂载（不改启用状态、不写配置）"
                  @click="restartPlugin(selectedPlugin!, pluginCoreEffective ?? undefined)"
                >
                  <PanelIcon name="refresh" size="xs" />
                  重启
                </NeumorphismButton>
                <NeumorphismSwitch
                  v-if="!pluginProtected(selectedPlugin)"
                  :model-value="selectedPlugin.enabled"
                  size="small"
                  active-text="启用"
                  inactive-text="禁用"
                  @change="togglePlugin(selectedPlugin!, $event)"
                />
              </div>
            </div>

            <p class="skill-detail__desc">{{ selectedPlugin.description || '（无描述）' }}</p>

            <!-- 装配失败：与「用户主动禁用」区分开（两者 enabled 都是 false） -->
            <div v-if="pluginMountError(selectedPlugin)" class="plugin-mount-error">
              <PanelIcon name="warning" size="sm" tone="err" />
              <div>
                <strong>装配失败（已跳过挂载）</strong>
                <p>{{ pluginMountError(selectedPlugin) }}</p>
                <p class="muted">
                  常见原因：`plugins.toml` 里的 `command` 路径不存在/不可执行、插件进程启动后握手失败。
                  修好后点「重启」即可重试，无需重启 Core。
                </p>
              </div>
            </div>

            <!-- 带来什么：包内工具/技能（可点击跳转） -->
            <div class="detail-section">
              <div class="detail-section__title">这个插件带来什么</div>
              <template v-if="pluginMembers(selectedPlugin).tools.length || pluginMembers(selectedPlugin).skills.length">
                <div v-if="pluginMembers(selectedPlugin).tools.length" class="plugin-members">
                  <span class="muted plugin-members__label">工具</span>
                  <button
                    v-for="name in pluginMembers(selectedPlugin).tools"
                    :key="name"
                    type="button"
                    class="plugin-member-chip"
                    @click="jumpToCategory('tool', name)"
                  >
                    {{ name }}
                  </button>
                </div>
                <div v-if="pluginMembers(selectedPlugin).skills.length" class="plugin-members">
                  <span class="muted plugin-members__label">技能</span>
                  <button
                    v-for="name in pluginMembers(selectedPlugin).skills"
                    :key="name"
                    type="button"
                    class="plugin-member-chip"
                    @click="jumpToCategory('skill', name)"
                  >
                    {{ name }}
                  </button>
                </div>
              </template>
              <span v-else class="muted">该插件未注册工具或技能</span>
            </div>

            <div class="detail-section">
              <div class="detail-section__title">被谁使用</div>
              <div v-if="pluginUsageRows.length" class="skill-usage">
                <div v-for="row in pluginUsageRows" :key="row.team" class="skill-usage__row">
                  <span class="skill-usage__team">{{ row.team }}</span>
                  <NeumorphismTag :variant="row.variant" size="small">{{ row.label }}</NeumorphismTag>
                </div>
              </div>
              <span v-else class="muted">（无智能体，或智能体列表尚未加载）</span>
            </div>

            <div class="detail-section">
              <div class="detail-section__title">启停影响</div>
              <div class="plugin-impact" :class="{ 'plugin-impact--warn': pluginProtected(selectedPlugin) }">
                {{ pluginImpactText }}
              </div>
            </div>

            <!-- 技术信息（折叠：低频信息不占视野） -->
            <div class="detail-section">
              <div
                class="detail-section__title detail-section__title--row plugin-info__head"
                @click="pluginInfoOpen = !pluginInfoOpen"
              >
                <span>技术信息</span>
                <span class="muted">{{ pluginInfoOpen ? '▾' : '▸' }}</span>
              </div>
              <div v-if="pluginInfoOpen" class="skill-source">
                <div class="skill-source__row">
                  <span class="muted">ID</span>
                  <code>{{ selectedPlugin.id }}</code>
                </div>
                <div class="skill-source__row">
                  <span class="muted">包（Package）</span>
                  <code>{{ selectedPlugin.package || selectedPlugin.id }}</code>
                </div>
                <div class="skill-source__row">
                  <span class="muted">kind / 版本</span>
                  <code>{{ selectedPlugin.kind }} · v{{ selectedPlugin.version || '—' }}</code>
                </div>
                <div class="skill-source__row">
                  <span class="muted">Entry</span>
                  <code>{{ selectedPlugin.entry || '—' }}</code>
                </div>
                <div class="skill-source__row">
                  <span class="muted">运行形态</span>
                  <code>{{ pluginRuntimeLabel(selectedPlugin) }}</code>
                </div>
                <div class="skill-source__row">
                  <span class="muted">来源</span>
                  <code>{{ PLUGIN_ORIGIN_LABELS[pluginOrigin(selectedPlugin)] }}</code>
                </div>
                <div v-if="pluginStateLabel(selectedPlugin)" class="skill-source__row">
                  <span class="muted">运行态</span>
                  <code>
                    {{ pluginStateLabel(selectedPlugin) }}
                    <template v-if="pluginRestartNote(selectedPlugin)">
                      · {{ pluginRestartNote(selectedPlugin) }}
                    </template>
                    <template v-if="selectedPlugin.generation">
                      · 代际 {{ selectedPlugin.generation }}
                    </template>
                  </code>
                </div>
                <div class="skill-source__row">
                  <span class="muted">Author</span>
                  <code>{{ selectedPlugin.author || '—' }}</code>
                </div>
                <div class="skill-source__row">
                  <span class="muted">配置来源</span>
                  <code v-if="pluginConfigOrigin(selectedPlugin)">{{ pluginConfigOrigin(selectedPlugin) }}</code>
                  <code v-else class="muted">未在配置中声明（缺省内置行为）</code>
                </div>
                <div v-if="selectedPlugin.source_path" class="skill-source__row">
                  <span class="muted">定义文件</span>
                  <code class="plugin-def-path">{{ selectedPlugin.source_path }}</code>
                </div>
                <div v-if="pluginLaunchCommand(selectedPlugin)" class="skill-source__row">
                  <span class="muted">启动命令</span>
                  <code class="plugin-def-path">{{ pluginLaunchCommand(selectedPlugin) }}</code>
                </div>
                <div v-if="(selectedPlugin.env_keys ?? []).length" class="skill-source__row">
                  <span class="muted">环境变量</span>
                  <code class="plugin-def-path">{{ (selectedPlugin.env_keys ?? []).join('、') }}</code>
                </div>
                <div v-if="pluginRequiredServices(selectedPlugin)" class="skill-source__row">
                  <span class="muted">依赖服务</span>
                  <code class="plugin-def-path">{{ pluginRequiredServices(selectedPlugin) }}</code>
                </div>
                <div v-if="pluginOptionalServices(selectedPlugin)" class="skill-source__row">
                  <span class="muted">可选依赖</span>
                  <code class="plugin-def-path">{{ pluginOptionalServices(selectedPlugin) }}</code>
                </div>
                <div v-if="pluginPendingServices(selectedPlugin)" class="skill-source__row">
                  <span class="muted">等待依赖</span>
                  <code class="plugin-def-path">{{ pluginPendingServices(selectedPlugin) }}</code>
                  <span class="muted">（依赖到位后自动挂载）</span>
                </div>
                <div v-if="pluginSubscribedEvents(selectedPlugin)" class="skill-source__row">
                  <span class="muted">订阅事件</span>
                  <code class="plugin-def-path">{{ pluginSubscribedEvents(selectedPlugin) }}</code>
                </div>
                <div v-if="pluginRecentEvents(selectedPlugin).length" class="skill-source__row">
                  <span class="muted">最近事件</span>
                  <code class="plugin-def-path">
                    {{ pluginRecentEvents(selectedPlugin).map((e) => e.name).join('、') }}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <!-- 工具详情（分区检查器：概览 / 被谁使用 / 所属包 / 参数） -->
          <div v-else-if="activeCategory === 'tool' && selectedTool" class="caps-detail skill-detail">
            <div class="detail-head">
              <div class="skill-detail__title">
                <h3>{{ selectedTool.name }}</h3>
                <span class="skill-detail__pkg">{{ skillPackageLabel(selectedTool.package, '独立工具') }}</span>
              </div>
              <div class="detail-actions">
                <NeumorphismSwitch
                  :model-value="selectedTool.enabled"
                  size="small"
                  active-text="启用"
                  inactive-text="禁用"
                  @change="toggleTool(selectedTool!, $event)"
                />
              </div>
            </div>

            <div v-if="toolPackageDisabled(selectedTool)" class="skill-banner skill-banner--warn">
              「{{ skillPackageLabel(selectedTool.package, '独立工具') }}」插件当前已禁用，包内工具对所有智能体不可见；
              在「插件」分类重新启用该包后本工具才会生效。
            </div>
            <div v-if="!selectedTool.enabled" class="skill-banner">
              该工具已禁用：模型不可见、调用会失败（列表/详情开关可直接启用）。
            </div>

            <p class="skill-detail__desc">{{ selectedTool.description || '（无描述）' }}</p>

            <div class="detail-section">
              <div class="detail-section__title">能力说明</div>
              <span class="muted">
                启停是全局开关：禁用后所有智能体都看不到该工具；启用时仍受各智能体的
                工具白名单 / 黑名单（「智能体」配置）约束——两层叠加生效。
              </span>
            </div>

            <div class="detail-section">
              <div class="detail-section__title">被谁使用</div>
              <div v-if="toolUsageRows.length" class="skill-usage">
                <div v-for="row in toolUsageRows" :key="row.team" class="skill-usage__row">
                  <span class="skill-usage__team">{{ row.team }}</span>
                  <NeumorphismTag :variant="row.variant" size="small">{{ row.label }}</NeumorphismTag>
                </div>
              </div>
              <span v-else class="muted">（无智能体，或智能体列表尚未加载）</span>
            </div>

            <div class="detail-section">
              <div class="detail-section__title">所属包</div>
              <div v-if="selectedTool.package" class="skill-source">
                <div class="skill-source__row">
                  <span class="muted">包</span>
                  <code>{{ selectedTool.package }}</code>
                </div>
                <div class="skill-source__actions">
                  <NeumorphismButton
                    size="small"
                    variant="glass"
                    @click="jumpToCategory('plugin', selectedTool!.package!)"
                  >
                    在「插件」中查看 →
                  </NeumorphismButton>
                </div>
              </div>
              <span v-else class="muted">独立工具（无包归属）</span>
            </div>

            <div class="detail-section detail-section--grow">
              <div class="detail-section__title detail-section__title--row">
                <span>参数 Schema</span>
                <span class="skill-param-actions">
                  <NeumorphismSegmented
                    v-model="toolParamMode"
                    :options="[{ label: '参数表', value: 'table' }, { label: 'JSON', value: 'json' }]"
                    size="small"
                    aria-label="参数视图"
                  />
                  <NeumorphismButton size="small" variant="glass" @click="copyToolParams">
                    {{ toolParamText ? '已复制' : '复制' }}
                  </NeumorphismButton>
                </span>
              </div>
              <div v-if="toolParamMode === 'table'">
                <NeumorphismTable
                  v-if="toolParamRows.length"
                  :columns="[
                    { key: 'name', label: '参数' },
                    { key: 'type', label: '类型' },
                    { key: 'required', label: '必填' },
                    { key: 'description', label: '说明' },
                  ]"
                  :data="toolParamRows"
                  size="small"
                >
                  <template #cell-name="{ row }">
                    <code>{{ row.name }}</code>
                  </template>
                  <template #cell-required="{ row }">
                    <NeumorphismTag v-if="row.required" variant="warning" size="small">必填</NeumorphismTag>
                    <span v-else class="muted">—</span>
                  </template>
                  <template #cell-description="{ row }">
                    <span class="tool-param-desc">{{ row.description || '—' }}</span>
                  </template>
                </NeumorphismTable>
                <pre v-else class="content-pre">{{ paramText(selectedTool) }}</pre>
              </div>
              <pre v-else class="content-pre skill-content-pre">{{ paramText(selectedTool) }}</pre>
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
        <div v-if="gitInstalling" class="git-modal__progress" role="status">
          <PanelIcon name="refresh" size="sm" tone="accent" />
          <span>
            正在克隆…已等待 {{ gitInstallElapsed }}s
            <template v-if="gitInstallSlow">（已超过 20s，网络慢或不可达；Core 侧最长等 120s）</template>
          </span>
        </div>
        <p v-if="!gitInstalling" class="muted caps-hint">
          私有仓库 / 内网仓库建议用 SSH 地址（<code>git@github.com:org/repo.git</code>）：
          HTTPS 若被网络阻断，只能在 120s 超时后失败。
        </p>
        <label class="git-modal__label">仓库 URL（https / ssh / 本地路径）<span class="git-modal__req">*</span></label>
        <NeumorphismInput v-model="gitUrl" placeholder="git@github.com:user/my-skill.git" size="small" :disabled="gitInstalling" />
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
          <NeumorphismButton
            size="small"
            variant="glass"
            :disabled="gitInstalling"
            @click="gitModalOpen = false"
          >
            取消
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="primary"
            :disabled="!gitUrl.trim() || gitInstalling"
            @click="installGitSkill"
          >
            {{ gitInstalling ? '安装中…' : '安装' }}
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
  background: color-mix(in srgb, var(--nm-text-primary) 4%, transparent);
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

/* Core 连接合并页：上游 Core 与联邦网络两区块之间的分隔线
   （两子页各带 16px 内边距，分隔线贴齐页宽并微收） */
.cores-merged__sep {
  margin: 2px 16px;
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
  background: var(--nm-mask-bg);
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
.git-modal__progress :deep(svg) {
  animation: git-modal-spin 1.2s linear infinite;
}

@keyframes git-modal-spin {
  to {
    transform: rotate(360deg);
  }
}

.git-modal__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--panel-accent-border, rgba(120, 160, 255, 0.35));
  background: var(--panel-accent-soft, rgba(120, 160, 255, 0.08));
  font-size: 12px;
  color: var(--nm-text-secondary);
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
/* 带图标的徽标：图标与文字同排居中对齐（徽标高度由 padding 决定） */
.caps-mark--icon {
  display: inline-flex;
  align-items: center;
  gap: 3px;
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
/* 装配失败徽标（挂载被跳过）：与「用户主动禁用」区分，红色强调 */
.caps-mark--err {
  color: var(--panel-err);
  background: color-mix(in srgb, var(--panel-err) 12%, transparent);
}
/* 行内「重启」按钮：hover 才出现（与开关同排，视觉重量低于开关） */
.plugin-restart-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 6px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--nm-text-secondary);
  cursor: pointer;
  vertical-align: middle;
}
.plugin-restart-btn:hover {
  color: var(--panel-accent);
  background: color-mix(in srgb, var(--panel-accent) 12%, transparent);
}
/* 详情：装配失败提示块 */
.plugin-mount-error {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 8px 0 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--panel-err) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-err) 28%, transparent);
}
/* 定义文件 / 启动命令：长路径允许折行（不撑破详情栏） */
.plugin-def-path {
  word-break: break-all;
}
.plugin-mount-error strong {
  display: block;
  font-size: 12px;
  color: var(--panel-err);
}
.plugin-mount-error p {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.5;
  word-break: break-all;
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
  display: inline-flex;
  align-items: center;
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

/* 分组提示行：中性色（门控语义说明等） */
.caps-list-group__hint--neutral {
  color: var(--nm-text-placeholder, #888);
}

/* 受保护项：行内锁标记占位（与开关同宽，保持行对齐） */
.caps-lock {
  display: inline-flex;
  align-items: center;
  opacity: 0.7;
  cursor: help;
}

/* 参数表 */
.skill-param-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.tool-param-desc {
  font-size: 12px;
  line-height: 1.4;
  white-space: normal;
}

/* 插件详情：成员 chips（点击跳转到工具/技能分类并选中） */
.plugin-members {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex-wrap: wrap;
}
.plugin-members__label {
  font-size: 11.5px;
  min-width: 30px;
  padding-top: 3px;
}
.plugin-member-chip {
  border: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.1));
  background: color-mix(in srgb, var(--nm-surface-raised) 60%, transparent);
  color: var(--nm-text-primary);
  font-size: 11.5px;
  font-family: inherit;
  padding: 2px 8px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.plugin-member-chip:hover {
  background: var(--panel-accent-soft);
  border-color: var(--panel-accent);
}

/* 插件详情：启停影响文案块 */
.plugin-impact {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--nm-text-secondary);
}
.plugin-impact--warn {
  color: var(--panel-warn);
}

/* 技术信息折叠头可点 */
.plugin-info__head {
  cursor: pointer;
  user-select: none;
}

.team-move {
  display: flex;
  gap: 8px;
  align-items: center;
}
.team-move__select {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.12));
  background: var(--nm-surface-raised);
  color: var(--nm-text-primary);
  font-size: 12px;
}

/* ═══════════════════════════════════════════════════════════════════════
   竖屏移动端（2026-10，断点 768px，与库 useTouchDevice.isMobile 同源）
   · 一级菜单：168px 竖排 → 顶部横滑 tab 条
   · 工作台：列表+详情并排 → Master-Detail（类由 mobileWorkspaceClass 切换）
   · 详情头部返回按钮：.caps-mobile-back（仅详情态渲染）
   桌面样式即上方默认；本段只做窄屏收敛。参考 document/panel/panel-mobile.md。
   ═══════════════════════════════════════════════════════════════════════ */
@media (max-width: 767.98px) {
  .caps {
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }

  /* ── 一级菜单：横滑 tab 条 ── */
  .caps-nav {
    width: auto;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    gap: 4px;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .caps-nav::-webkit-scrollbar {
    display: none;
  }
  .caps-nav-item {
    flex: 0 0 auto;
    padding: 8px 12px;
    min-height: 40px;
  }
  .caps-nav-spacer {
    display: none;
  }
  /* 「刷新」按钮不随 tab 滚动出视野？——保持随行（tab 条右端），简化实现 */
  .caps-nav > .nm-button {
    flex: 0 0 auto;
  }

  /* ── 工作区与工具条 ── */
  .caps-toolbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 12px;
  }

  /* 筛选条（2026-10 修复）：桌面是 flex-wrap 的搜索框 + chips + 分组段选，
     窄屏上三者各自换行 —— 技能分类实测吃掉 **359px**（可视区 686px 的 52%），
     列表只剩 230px、几乎看不到行。窄屏改两行固定形态：搜索独占一行、
     chips 单行横向滚动、分组段选靠右；总高压到 ~86px。 */
  .caps-filters {
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 10px;
  }
  .caps-filters__search {
    width: 100%;
    flex: 1 1 100%;
  }
  .caps-filters__chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 1px;
  }
  .caps-filters__chips::-webkit-scrollbar {
    display: none;
  }
  .caps-chip {
    flex: 0 0 auto;
    min-height: 32px;
  }
  .caps-mobile-back {
    order: -1;
  }
  .caps-workspace {
    position: relative;
  }

  /* ── Master-Detail：列表态隐藏详情、详情态隐藏列表 ── */
  .caps-workspace--mobile-list .caps-detail-pane {
    display: none;
  }
  .caps-workspace--mobile-detail .caps-list {
    display: none;
  }
  .caps-workspace--mobile-detail .caps-resizer {
    display: none;
  }
  /* 移动端列表全宽（inline 宽度已不绑定）；去掉右分隔线 */
  .caps-list {
    width: auto;
    flex: 1;
    border-right: none;
    padding: 6px;
  }
  .caps-detail-pane {
    padding: 10px 12px;
  }

  /* 详情内表格/长内容：横向滚动兜底（外层 min-width:0 已保证可滚） */
  .caps-detail-pane :deep(.nm-table__wrapper) {
    overflow-x: auto;
  }
  /* 表单动作行与详情头：允许换行，防按钮溢出 */
  .detail-head,
  .form-actions {
    flex-wrap: wrap;
    row-gap: 6px;
  }

  /* Git 安装弹层：420px 最小宽在窄屏放不下，改自适应 */
  .git-modal {
    min-width: 0;
  }
}
/* 失效转移开关行（P3）：与上游列表同宽的设置行，不占视觉层级。 */
.caps-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: var(--surface-2, #eceef3);
}
.caps-toggle-row__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1, #2f3545);
}
.caps-toggle-row__desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-3, #7b8394);
}

</style>

