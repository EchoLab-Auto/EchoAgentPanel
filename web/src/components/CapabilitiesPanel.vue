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
import type { AgentInfo, PluginInfo, SkillInfo, ToolInfo } from '../protocol';

const UNCATEGORIZED = '未分类';
const TOOL_BUILTIN = '内置工具';
const TOOL_OTHER = '扩展工具';

// ── 选中状态 ──
const selectedSkill = ref<SkillInfo | null>(null);
const selectedTool = ref<ToolInfo | null>(null);
const selectedPlugin = ref<PluginInfo | null>(null);
const selectedAgent = ref<AgentInfo | null>(null);
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

function agentMenuItems(): HeadlessMenuItem[] {
  const list = state.agents.length
    ? [...state.agents].sort((a, b) => a.id.localeCompare(b.id))
    : [{ id: 'default', name: '默认', description: '', enabled: true, sessions: 0 }];
  return [
    {
      key: 'group-agents',
      label: '人格',
      children: list.map((a) => ({
        key: `agent:${a.id}`,
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

const menuItems = computed<HeadlessMenuItem[]>(() => [...skillMenuItems(), ...toolMenuItems(), ...pluginMenuItems(), ...agentMenuItems()]);
const defaultExpanded = ['group-skills', 'group-tools'];

function onMenuSelect(item: HeadlessMenuItem) {
  if (item.key.startsWith('skill:')) {
    const name = item.key.slice('skill:'.length);
    const found = state.skills.find((s) => s.name === name);
    if (found) {
      selectedSkill.value = found;
      selectedAgent.value = null;
      selectedPlugin.value = null;
      selectedTool.value = null;
      editing.value = false;
      creating.value = false;
    }
  } else if (item.key.startsWith('agent:')) {
    const id = item.key.slice('agent:'.length);
    const found = state.agents.find((a) => a.id === id);
    if (found) {
      selectedAgent.value = found;
      selectedSkill.value = null;
      selectedPlugin.value = null;
      selectedTool.value = null;
      editing.value = false;
      creating.value = false;
    }
  } else if (item.key.startsWith('plugin:')) {
    const id = item.key.slice('plugin:'.length);
    const found = state.plugins.find((p) => p.id === id);
    if (found) {
      selectedPlugin.value = found;
      selectedSkill.value = null;
      selectedAgent.value = null;
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
      selectedAgent.value = null;
      selectedPlugin.value = null;
      editing.value = false;
      creating.value = false;
    }
  }
}

// ── 人格编辑（ui-frame 表单模型，NeumorphismForm 受控）──
const agentFormId = ref('');
const agentFormName = ref('');
const agentFormDescription = ref('');
const agentFormPrompt = ref('');
const agentFormEnabled = ref(true);
const agentEditing = ref(false);

const agentFormModel = computed(() => ({
  id: agentFormId.value,
  name: agentFormName.value,
  description: agentFormDescription.value,
  system_prompt: agentFormPrompt.value,
  enabled: agentFormEnabled.value,
}));

const agentFormRules = {
  id: [
    { required: true, message: '请输入 ID' },
    {
      pattern: /^[A-Za-z0-9_-]+$/,
      message: '仅允许字母、数字、- 和 _',
    },
  ],
  name: [{ required: true, message: '请输入名称' }],
};

function startAgentCreate() {
  agentEditing.value = true;
  agentFormId.value = '';
  agentFormName.value = '';
  agentFormDescription.value = '';
  agentFormPrompt.value = '';
  agentFormEnabled.value = true;
  selectedAgent.value = null;
}

function startAgentEdit(agent: AgentInfo) {
  agentEditing.value = true;
  agentFormId.value = agent.id;
  agentFormName.value = agent.name;
  agentFormDescription.value = agent.description;
  agentFormPrompt.value = agent.system_prompt ?? '';
  agentFormEnabled.value = agent.enabled;
}

function cancelAgentEdit() {
  agentEditing.value = false;
}

function saveAgent() {
  const id = agentFormId.value.trim() || agentFormName.value.trim();
  if (!id || !agentFormName.value.trim()) return;
  sendCommand({
    SaveAgent: {
      id,
      name: agentFormName.value.trim() || id,
      description: agentFormDescription.value.trim(),
      system_prompt: agentFormPrompt.value,
      enabled: agentFormEnabled.value,
    },
  });
  agentEditing.value = false;
}

function deleteAgent(agent: AgentInfo) {
  if (!window.confirm(`确定删除人格「${agent.name}」？该人格的记忆与系统提示词将被移除。`)) return;
  sendCommand({ DeleteAgent: { id: agent.id } });
  selectedAgent.value = null;
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
  sendCommand('RequestAgentsList');
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
        <NeumorphismButton size="small" variant="flat" @click="startCreate">新建技能</NeumorphismButton>
        <NeumorphismButton size="small" variant="flat" @click="startAgentCreate">新建人格</NeumorphismButton>
        <NeumorphismButton size="small" variant="flat" @click="refresh">刷新</NeumorphismButton>
      </div>
    </div>

    <div class="caps-main">
      <!-- 空态 -->
      <NeumorphismEmpty
        v-if="!selectedSkill && !selectedTool && !selectedPlugin && !selectedAgent && !creating && !agentEditing"
        description="在左侧菜单中选择技能、工具、插件或人格；也可点击“新建”"
      />

      <!-- 技能详情 -->
      <div v-else-if="selectedSkill && !editing && !creating" class="caps-detail">
        <div class="detail-head">
          <h3>{{ selectedSkill.name }}</h3>
          <div class="detail-actions">
            <NeumorphismButton size="small" variant="flat" @click="startEdit">编辑</NeumorphismButton>
            <NeumorphismButton size="small" variant="flat" @click="deleteSkill(selectedSkill)">
              删除
            </NeumorphismButton>
          </div>
        </div>
        <div class="detail-meta">
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
            <NeumorphismButton variant="flat" @click="cancelEdit">取消</NeumorphismButton>
          </div>
        </div>
      </div>

      <!-- 人格详情 / 编辑 -->
      <div v-else-if="selectedAgent && !agentEditing" class="caps-detail">
        <div class="detail-head">
          <h3>{{ selectedAgent.name }}</h3>
          <div class="detail-actions">
            <NeumorphismButton size="small" variant="flat" @click="startAgentEdit(selectedAgent!)">
              编辑
            </NeumorphismButton>
            <NeumorphismButton
              size="small"
              variant="flat"
              v-if="state.agents.length > 1 && selectedAgent.id !== 'default' && selectedAgent.id !== 'alix'"
              @click="deleteAgent(selectedAgent!)"
            >
              删除
            </NeumorphismButton>
          </div>
        </div>
        <div class="detail-meta">
          <NeumorphismTag v-if="selectedAgent.id === 'default' || selectedAgent.id === 'alix'" variant="warning" size="small">
            主 Agent
          </NeumorphismTag>
          <NeumorphismTag variant="info" size="small">{{ selectedAgent.sessions }} 会话</NeumorphismTag>
        </div>
        <div class="detail-field">
          <span>启用（禁用即卸载记忆，再次启用重新挂载）</span>
          <NeumorphismSwitch
            :model-value="selectedAgent.enabled"
            size="small"
            @change="sendCommand({ ToggleAgent: { id: selectedAgent!.id, enabled: $event } })"
          />
        </div>
        <p class="muted">{{ selectedAgent.description || '（无描述）' }}</p>
        <div class="detail-content">
          <div class="muted content-title">系统提示词（留空 = 继承全局）</div>
          <pre class="content-pre">{{ selectedAgent.system_prompt || '（继承全局）' }}</pre>
        </div>
      </div>

      <div v-else-if="agentEditing" class="caps-detail">
        <div class="detail-head"><h3>{{ agentFormId ? '编辑人格' : '新建人格' }}</h3></div>
        <NeumorphismForm
          :model="agentFormModel"
          :rules="agentFormRules"
          direction="vertical"
          label-width="96px"
          @submit="saveAgent"
        >
          <NeumorphismFormItem label="ID" required name="id" :rules="agentFormRules.id">
            <NeumorphismInput
              v-model="agentFormId"
              placeholder="my-agent"
              :disabled="!!agentFormId"
            />
          </NeumorphismFormItem>
          <NeumorphismFormItem label="名称" required name="name" :rules="agentFormRules.name">
            <NeumorphismInput v-model="agentFormName" placeholder="写作助理" />
          </NeumorphismFormItem>
          <NeumorphismFormItem label="描述" name="description">
            <NeumorphismInput v-model="agentFormDescription" placeholder="专注文档写作" />
          </NeumorphismFormItem>
          <NeumorphismFormItem label="系统提示词" name="system_prompt">
            <template #default="{ }">
              <NeumorphismTextarea
                v-model="agentFormPrompt"
                rows="8"
                auto-resize
                placeholder="你是…（留空 = 继承全局提示词与技能）"
              />
            </template>
          </NeumorphismFormItem>
          <NeumorphismFormItem label="启用" name="enabled">
            <NeumorphismSwitch v-model="agentFormEnabled" size="small" />
          </NeumorphismFormItem>
          <div class="form-actions">
            <NeumorphismButton variant="primary" @click="saveAgent">保存</NeumorphismButton>
            <NeumorphismButton variant="flat" @click="cancelAgentEdit">取消</NeumorphismButton>
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
</style>
