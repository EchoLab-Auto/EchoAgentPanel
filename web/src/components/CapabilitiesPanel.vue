<script setup lang="ts">
//! 资源中心：技能与工具的多级菜单浏览 + 配置面板。
//!
//! 左侧是多级菜单（技能分类 → 技能；工具分类 → 工具），右侧展示详情：
//! - 技能：启停、编辑（SaveSkill）、新建、删除（DeleteSkill）
//! - 工具：启停（ToggleTool）、参数 Schema 浏览
//! 数据来自后端 SkillsList / ToolsList 事件，打开时主动拉取。

import { computed, onMounted, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismCheckbox,
  NeumorphismEmpty,
  NeumorphismForm,
  NeumorphismFormItem,
  NeumorphismInput,
  NeumorphismMenu,
  NeumorphismSwitch,
  NeumorphismTag,
  NeumorphismTextarea,
  type HeadlessMenuItem,
} from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import type { PluginInfo, SkillInfo, TeamInfo, ToolInfo } from '../protocol';



const UNCATEGORIZED = '未分类';
const TOOL_BUILTIN = '内置工具';
const TOOL_OTHER = '扩展工具';

// ── 选中状态 ──
const selectedSkill = ref<SkillInfo | null>(null);
const selectedTool = ref<ToolInfo | null>(null);
const selectedPlugin = ref<PluginInfo | null>(null);
const selectedTeam = ref<TeamInfo | null>(null);
const editing = ref(false);
const creating = ref(false);

// ── 技能编辑表单 ──
const formName = ref('');
const formDescription = ref('');
const formKeywords = ref('');
const formCategory = ref('');
const formAlways = ref(false);
const formContent = ref('');

// ── 菜单构建：技能(分类→技能) + 工具(分类→工具)，三级结构 ──
function skillMenuItems(): HeadlessMenuItem[] {
  const groups = new Map<string, SkillInfo[]>();
  for (const s of state.skills) {
    const cat = s.category?.trim() ? s.category.trim() : UNCATEGORIZED;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(s);
  }
  const cats = [...groups.keys()].sort();
  return [
    {
      key: 'group-skills',
      label: '技能',
      children: cats.map((cat) => ({
        key: `scat:${cat}`,
        label: `${cat} (${groups.get(cat)!.length})`,
        children: groups
          .get(cat)!
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((s) => ({
            key: `skill:${s.name}`,
            label: s.enabled ? s.name : `${s.name}（已禁用）`,
          })),
      })),
    },
  ];
}

const KIND_LABEL_PLUGIN: Record<string, string> = {
  skill: '技能',
  tool: '工具',
  provider: 'LLM Provider',
  loop: 'Turn Runner',
  adapter: '适配器',
  orchestration: '编排',
  management: '管理面',
};

function teamMenuItems(): HeadlessMenuItem[] {
  const list = state.teams.length
    ? [...state.teams].sort((a, b) => a.id.localeCompare(b.id))
    : [{ id: 'default', name: '默认', description: '', enabled: true, sessions: 0, is_default: true }];
  return [
    {
      key: 'group-teams',
      label: 'Team',
      children: list.map((a) => ({
        key: `team:${a.id}`,
        label: a.enabled ? a.name : `${a.name}（已禁用）`,
      })),
    },
  ];
}

function pluginMenuItems(): HeadlessMenuItem[] {
  const groups = new Map<string, PluginInfo[]>();
  for (const p of state.plugins) {
    const cat = KIND_LABEL_PLUGIN[p.kind] ?? p.kind;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(p);
  }
  const cats = [...groups.keys()].sort();
  return [
    {
      key: 'group-plugins',
      label: '插件',
      children: cats.map((cat) => ({
        key: `pcat:${cat}`,
        label: `${cat} (${groups.get(cat)!.length})`,
        children: groups
          .get(cat)!
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((p) => ({
            key: `plugin:${p.id}`,
            label: p.enabled ? p.name : `${p.name}（已禁用）`,
          })),
      })),
    },
  ];
}

function toolMenuItems(): HeadlessMenuItem[] {
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
  const cats = [...groups.keys()].sort();
  return [
    {
      key: 'group-tools',
      label: '工具',
      children: cats.map((cat) => ({
        key: `tcat:${cat}`,
        label: `${cat} (${groups.get(cat)!.length})`,
        children: groups
          .get(cat)!
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((t) => ({
            key: `tool:${t.name}`,
            label: t.enabled ? t.name : `${t.name}（已禁用）`,
          })),
      })),
    },
  ];
}

const menuItems = computed<HeadlessMenuItem[]>(() => [...skillMenuItems(), ...toolMenuItems(), ...pluginMenuItems(), ...teamMenuItems()]);
const defaultExpanded = ['group-skills', 'group-tools'];

function onMenuSelect(item: HeadlessMenuItem) {
  if (item.key.startsWith('skill:')) {
    const name = item.key.slice('skill:'.length);
    const found = state.skills.find((s) => s.name === name);
    if (found) {
      selectedSkill.value = found;
      selectedTeam.value = null;
      selectedPlugin.value = null;
      selectedTool.value = null;
      editing.value = false;
      creating.value = false;
    }
  } else if (item.key.startsWith('team:')) {
    const id = item.key.slice('team:'.length);
    const found = state.teams.find((a) => a.id === id);
    if (found) {
      selectedTeam.value = found;
      selectedSkill.value = null;
      selectedPlugin.value = null;
      selectedTool.value = null;
      editing.value = false;
      creating.value = false;
      // 直接进入编辑态（无需再点"编辑"按钮）
      startTeamEdit(found);
    }
  } else if (item.key.startsWith('plugin:')) {
    const id = item.key.slice('plugin:'.length);
    const found = state.plugins.find((p) => p.id === id);
    if (found) {
      selectedPlugin.value = found;
      selectedSkill.value = null;
      selectedTeam.value = null;
      selectedTool.value = null;
      editing.value = false;
      creating.value = false;
    }
  } else if (item.key.startsWith('tool:')) {
    const name = item.key.slice('tool:'.length);
    const found = state.tools.find((t) => t.name === name);
    if (found) {
      selectedTool.value = found;
      selectedSkill.value = null;
      selectedTeam.value = null;
      selectedPlugin.value = null;
      editing.value = false;
      creating.value = false;
    }
  }
}

// ── Team 成员编辑（ui-frame 表单模型，NeumorphismForm 受控）──
const teamFormId = ref('');
const teamFormName = ref('');
const teamFormDescription = ref('');
const teamFormPrompt = ref('');
const teamFormEnabled = ref(true);
const teamEditing = ref(false);
const teamFormDisabledPlugins = ref<string[]>([]);
const teamFormDisabledTools = ref<string[]>([]);
const teamFormDisabledSkills = ref<string[]>([]);
const teamFormEnabledPlugins = ref<string[]>([]);
const teamFormEnabledTools = ref<string[]>([]);
const teamFormEnabledSkills = ref<string[]>([]);
/** 编辑已有成员时 ID 锁定；新建时 ID 可自由输入 */
const teamFormIsEdit = ref(false);

const teamFormModel = computed(() => ({
  id: teamFormId.value,
  name: teamFormName.value,
  description: teamFormDescription.value,
  system_prompt: teamFormPrompt.value,
  enabled: teamFormEnabled.value,
  disabled_plugins: teamFormDisabledPlugins.value,
  disabled_tools: teamFormDisabledTools.value,
  disabled_skills: teamFormDisabledSkills.value,
  enabled_plugins: teamFormEnabledPlugins.value,
  enabled_tools: teamFormEnabledTools.value,
  enabled_skills: teamFormEnabledSkills.value,
}));

// 能力列表（复选框）：插件 / 工具 / 技能
// 插件级勾选只保留"整类能力"（适配器/管理面）；内置工具集(kind=tool)
// 和编排(kind=orchestration) 不作为插件出现——它们由工具/包层面勾选。
const capabilityPluginOptions = computed(() =>
  state.plugins
    .filter((p) => ['adapter', 'management'].includes(p.kind))
    .map((p) => ({ key: p.id, label: `${p.name}（${p.kind}）` })),
);
// ── 包（package）机制：同 package 的工具+技能可视作一个整体勾选/取消 ──
const PACKAGE_NAMES: Record<string, string> = {
  'echo-agent.adapter.qq': 'QQ 适配器包',
  'echo-agent.orchestration': '编排工具包',
};

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
    name: PACKAGE_NAMES[id] ?? id,
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

function startTeamCreate() {
  teamEditing.value = true;
  teamFormIsEdit.value = false;
  teamFormId.value = '';
  teamFormName.value = '';
  teamFormDescription.value = '';
  teamFormPrompt.value = '';
  teamFormEnabled.value = true;
  teamFormDisabledPlugins.value = [];
  teamFormDisabledTools.value = [];
  teamFormDisabledSkills.value = [];
  teamFormEnabledPlugins.value = [];
  teamFormEnabledTools.value = [];
  teamFormEnabledSkills.value = [];
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
  teamFormDisabledPlugins.value = agent.disabled_plugins ?? [];
  teamFormDisabledTools.value = agent.disabled_tools ?? [];
  teamFormDisabledSkills.value = agent.disabled_skills ?? [];
  teamFormEnabledPlugins.value = agent.enabled_plugins ?? [];
  teamFormEnabledTools.value = agent.enabled_tools ?? [];
  teamFormEnabledSkills.value = agent.enabled_skills ?? [];
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
      disabled_plugins: teamFormDisabledPlugins.value,
      disabled_tools: teamFormDisabledTools.value,
      disabled_skills: teamFormDisabledSkills.value,
      enabled_plugins: teamFormEnabledPlugins.value,
      enabled_tools: teamFormEnabledTools.value,
      enabled_skills: teamFormEnabledSkills.value,
    },
  });
  teamEditing.value = false;
}

function isPrimaryTeam(team: TeamInfo | null): boolean {
  return !!team && (team.is_default === true || team.id === 'default');
}

function deleteTeam(team: TeamInfo) {
  if (isPrimaryTeam(team)) {
    window.alert('主 Agent 受保护，不能删除。');
    return;
  }
  if (!window.confirm(`确定删除 Team 成员「${team.name}」？该成员的记忆与系统提示词将被移除，此操作不可恢复。`)) return;
  sendCommand({ DeleteTeam: { id: team.id } });
  selectedTeam.value = null;
  teamEditing.value = false;
}

// ── 技能启停 ──
function toggleSkill(skill: SkillInfo, enabled: boolean) {
  sendCommand({ ToggleSkill: { name: skill.name, enabled } });
}

// ── 插件启停 ──
function togglePlugin(plugin: PluginInfo, enabled: boolean) {
  sendCommand({ TogglePlugin: { id: plugin.id, enabled } });
}

// ── 工具启停 ──
function toggleTool(tool: ToolInfo, enabled: boolean) {
  sendCommand({ ToggleTool: { name: tool.name, enabled } });
}

// ── 外部 Git 来源 skill 管理 ──
const gitFormOpen = ref(false);
const gitUrl = ref('');
const gitName = ref('');
const gitBranch = ref('');

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
  // 稍后由 SkillsList 事件刷新
}

function updateGitSkill(skill: SkillInfo) {
  sendCommand({ UpdateSkillFromGit: { name: skill.name } });
}

function shortUrl(url: string): string {
  return url.length > 42 ? url.slice(0, 40) + '…' : url;
}

function removeGitSource(skill: SkillInfo) {
  if (!window.confirm(`移除 ${skill.name} 的 Git 来源记录？（目录保留，可手动删除）`)) return;
  sendCommand({ RemoveSkillSource: { name: skill.name } });
}

// ── 新建 / 编辑 / 保存 / 删除 ──
function startCreate() {
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
}

function startEdit() {
  if (!selectedSkill.value) return;
  const s = selectedSkill.value;
  formName.value = s.name;
  formDescription.value = s.description;
  formKeywords.value = s.keywords.join(', ');
  formCategory.value = s.category ?? '';
  formAlways.value = s.always;
  formContent.value = s.content;
  editing.value = true;
  creating.value = false;
}

function cancelEdit() {
  editing.value = false;
  creating.value = false;
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
    },
  });
  editing.value = false;
  creating.value = false;
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
    <div class="caps-side">
      <NeumorphismMenu
        :items="menuItems"
        mode="vertical"
        size="small"
        :default-expanded="defaultExpanded"
        @select="onMenuSelect"
      />
      <div class="caps-side-actions">
        <NeumorphismButton size="small" variant="glass" @click="startCreate">新建技能</NeumorphismButton>
        <NeumorphismButton size="small" variant="glass" @click="startTeamCreate">新建 Team</NeumorphismButton>
        <NeumorphismButton size="small" variant="glass" @click="refresh">刷新</NeumorphismButton>
        <NeumorphismButton size="small" variant="glass" @click="gitFormOpen = !gitFormOpen">
          {{ gitFormOpen ? '收起安装' : 'Git 安装' }}
        </NeumorphismButton>
      </div>
      <div v-if="gitFormOpen" class="git-install-form">
        <div class="git-install-form__title">从 Git 仓库安装技能</div>
        <NeumorphismInput v-model="gitUrl" placeholder="仓库 URL（https/ssh/本地路径）" size="small" />
        <div class="git-install-form__row">
          <NeumorphismInput v-model="gitName" placeholder="安装目录名（默认仓库名）" size="small" />
          <NeumorphismInput v-model="gitBranch" placeholder="分支（默认仓库默认）" size="small" />
        </div>
        <NeumorphismButton size="small" variant="primary" @click="installGitSkill">安装</NeumorphismButton>
      </div>
    </div>

    <div class="caps-main">
      <!-- 空态 -->
      <NeumorphismEmpty
        v-if="!selectedSkill && !selectedTool && !selectedPlugin && !selectedTeam && !creating && !teamEditing"
        description="在左侧菜单中选择技能、工具、插件或 Team；也可点击“新建”"
      />

      <!-- 技能详情 -->
      <div v-else-if="selectedSkill && !editing && !creating" class="caps-detail">
        <div class="detail-head">
          <h3>{{ selectedSkill.name }}</h3>
          <div class="detail-actions">
            <template v-if="selectedSkill.source">
              <NeumorphismButton size="small" variant="glass" @click="updateGitSkill(selectedSkill)">
                更新
              </NeumorphismButton>
              <NeumorphismButton size="small" variant="glass" @click="removeGitSource(selectedSkill)">
                移除来源
              </NeumorphismButton>
            </template>
            <NeumorphismButton size="small" variant="glass" @click="startEdit">编辑</NeumorphismButton>
            <NeumorphismButton size="small" variant="glass" @click="deleteSkill(selectedSkill)">
              删除
            </NeumorphismButton>
          </div>
        </div>
        <div class="detail-meta">
          <NeumorphismTag
            v-if="selectedSkill.source"
            size="small"
            variant="info"
            :title="`${selectedSkill.source.url} @ ${selectedSkill.source.rev}`"
          >
            Git · {{ shortUrl(selectedSkill.source.url) }}
          </NeumorphismTag>
          <NeumorphismTag v-if="selectedSkill.category" size="small">{{ selectedSkill.category }}</NeumorphismTag>
          <NeumorphismTag v-if="selectedSkill.always" variant="warning" size="small">常驻</NeumorphismTag>
          <span class="muted">{{ selectedSkill.description || '（无描述）' }}</span>
        </div>
        <div class="detail-field">
          <span>启用</span>
          <NeumorphismSwitch
            :model-value="selectedSkill.enabled"
            size="small"
            @change="toggleSkill(selectedSkill!, $event)"
          />
        </div>
        <div v-if="selectedSkill.keywords.length" class="detail-keywords">
          <span class="muted">触发词：</span>
          <NeumorphismTag v-for="k in selectedSkill.keywords" :key="k" size="small" variant="info">
            {{ k }}
          </NeumorphismTag>
        </div>
        <div class="detail-content">
          <div class="muted content-title">SKILL.md 内容</div>
          <pre class="content-pre">{{ selectedSkill.content || '（空）' }}</pre>
        </div>
      </div>

      <!-- 技能编辑 / 新建表单 -->
      <div v-else-if="editing || creating" class="caps-detail">
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
          <label>内容（Markdown 正文）</label>
          <NeumorphismTextarea
            v-model="formContent"
            rows="12"
            auto-resize
            placeholder="# 技能说明…"
          />
          <div class="form-actions">
            <NeumorphismButton variant="primary" @click="saveSkill">保存</NeumorphismButton>
            <NeumorphismButton variant="glass" @click="cancelEdit">取消</NeumorphismButton>
          </div>
        </div>
      </div>

      <!-- Team 成员详情 / 编辑 -->
      <div v-else-if="selectedTeam && !teamEditing" class="caps-detail">
        <div class="detail-head">
          <h3>{{ selectedTeam.name }}</h3>
          <div class="detail-actions">
            <NeumorphismButton
              size="small"
              variant="glass"
              v-if="!isPrimaryTeam(selectedTeam)"
              @click="deleteTeam(selectedTeam!)"
            >
              删除
            </NeumorphismButton>
          </div>
        </div>
        <div class="detail-meta">
          <NeumorphismTag v-if="isPrimaryTeam(selectedTeam)" variant="warning" size="small">
            主 Agent
          </NeumorphismTag>
          <NeumorphismTag variant="info" size="small">{{ selectedTeam.sessions }} 会话</NeumorphismTag>
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
          <template v-if="(selectedTeam.disabled_plugins?.length ?? 0) || (selectedTeam.disabled_tools?.length ?? 0) || (selectedTeam.disabled_skills?.length ?? 0)">
            <NeumorphismTag v-for="d in selectedTeam.disabled_plugins ?? []" :key="d" size="small" variant="error">
              {{ d }}
            </NeumorphismTag>
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

      <div v-else-if="teamEditing" class="caps-detail">
        <div class="detail-head">
          <h3>{{ teamFormIsEdit ? `配置：${teamFormName || '—'}` : '新建 Team' }}</h3>
        </div>
        <NeumorphismForm
          :model="teamFormModel"
          :rules="teamFormRules"
          direction="vertical"
          label-width="96px"
          @submit="saveTeam"
        >
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
          <NeumorphismFormItem label="系统提示词" name="system_prompt">
            <template #default="{ }">
              <NeumorphismTextarea
                v-model="teamFormPrompt"
                rows="8"
                auto-resize
                placeholder="你是…（留空 = 继承全局提示词与技能）"
              />
            </template>
          </NeumorphismFormItem>
          <NeumorphismFormItem label="启用" name="enabled">
            <NeumorphismSwitch v-model="teamFormEnabled" size="small" />
          </NeumorphismFormItem>
          <NeumorphismFormItem label="启用插件">
            <p class="muted caps-hint">勾选该 Team 成员可用的能力块（适配器/编排/管理面）；全选 = 不限制（默认）。内置工具集不在此列，请在下方按工具勾选。</p>
            <div class="caps-checkbox-grid">
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
          </NeumorphismFormItem>
          <NeumorphismFormItem label="启用包（Package）">
            <p class="muted caps-hint">同一个包（如 QQ 适配器）的工具+技能作为一个整体，勾选/取消即同时开关包内所有成员。</p>
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
          </NeumorphismFormItem>
          <NeumorphismFormItem label="启用工具">
            <p class="muted caps-hint">勾选该 Team 成员可用的工具（按分类分组，含编排/自更新/运维）；全选 = 不限制（默认）。</p>
            <div v-for="group in capabilityToolGroups" :key="group.cat" class="caps-tool-group">
              <div class="caps-tool-group__head">
                {{ group.title }}
                <NeumorphismTag size="small" variant="info">{{ group.items.length }}</NeumorphismTag>
              </div>
              <div class="caps-checkbox-grid">
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
          </NeumorphismFormItem>
          <NeumorphismFormItem label="启用技能">
            <p class="muted caps-hint">勾选该 Team 成员激活的技能；全选 = 不限制（默认）。</p>
            <div class="caps-checkbox-grid">
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
          </NeumorphismFormItem>
          <div class="form-actions form-actions--corner">
            <NeumorphismButton
              v-if="teamFormIsEdit && selectedTeam && !isPrimaryTeam(selectedTeam)"
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
      <div v-else-if="selectedPlugin" class="caps-detail">
        <div class="detail-head">
          <h3>{{ selectedPlugin.name }}</h3>
          <NeumorphismTag v-if="!selectedPlugin.builtin" variant="info" size="small">
            外部插件
          </NeumorphismTag>
        </div>
        <div class="detail-meta">
          <NeumorphismTag size="small">{{ KIND_LABEL_PLUGIN[selectedPlugin.kind] ?? selectedPlugin.kind }}</NeumorphismTag>
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
          <span class="muted">Entry:</span>
          <code>{{ selectedPlugin.entry || '—' }}</code>
          <span class="muted">Author:</span>
          <code>{{ selectedPlugin.author || '—' }}</code>
        </div>
      </div>

      <!-- 工具详情 -->
      <div v-else-if="selectedTool" class="caps-detail">
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
</template>

<style scoped>
.caps {
  display: flex;
  height: 100%;
  min-height: 0;
  gap: 16px;
  padding: 12px;
}
.caps-side {
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.caps-side-actions {
  display: flex;
  gap: 8px;
}
.caps-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 12px;
  border-radius: 12px;
  background: var(--nm-surface, rgba(255, 255, 255, 0.04));
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
.caps-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
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
  bottom: -12px;
  margin-top: 8px;
  padding: 10px 0 4px;
  justify-content: flex-end;
  background: linear-gradient(
    to top,
    var(--nm-surface-raised, #1c1c1c) 60%,
    transparent
  );
}

/* Git 安装表单 */
.git-install-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px dashed var(--nm-border-color);
  border-radius: 10px;
  margin-top: 8px;
  background: color-mix(in srgb, var(--nm-surface-raised) 60%, transparent);
}
.git-install-form__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-text-secondary);
}
.git-install-form__row {
  display: flex;
  gap: 8px;
}
.git-install-form__row > * {
  flex: 1;
}

</style>

.caps-tool-group {
  margin-bottom: 8px;
}
.caps-pkg-members {
  font-size: 11px;
  padding-left: 26px;
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
