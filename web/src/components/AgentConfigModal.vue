<script setup lang="ts">
//! Agent 配置悬浮弹层：在会话区上方打开的轻量配置卡片，
//! 对应资源页的 Team 编辑（系统提示词 / 启用 / 能力白名单）。

import { computed, ref, watch } from 'vue';
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

// ── 能力选项（与资源页同源） ──
const pluginOptions = computed(() =>
  state.plugins
    .filter((p) => ['adapter', 'management'].includes(p.kind))
    .map((p) => ({ key: p.id, label: p.name })),
);
const toolOptions = computed(() => state.tools.map((t) => ({ key: t.name, label: t.name })));
const skillOptions = computed(() => state.skills.map((s) => ({ key: s.name, label: s.name })));

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}
function isOn(list: string[], key: string): boolean {
  return list.length === 0 || list.includes(key);
}
function toggleAllow(list: string[], all: string[], key: string): string[] {
  const base = list.length ? list : [...all];
  return toggle(base, key);
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
          <div class="agent-config__chips">
            <button
              v-for="opt in pluginOptions"
              :key="opt.key"
              type="button"
              class="agent-config__chip"
              :class="{ 'is-on': isOn(enabledPlugins, opt.key) }"
              @click="enabledPlugins = toggleAllow(enabledPlugins, pluginOptions.map((o) => o.key), opt.key)"
            >
              {{ isOn(enabledPlugins, opt.key) ? '✓ ' : '' }}{{ opt.label }}
            </button>
            <span v-if="!pluginOptions.length" class="muted">（无）</span>
          </div>
        </div>

        <div class="agent-config__group">
          <div class="agent-config__group-title">启用工具</div>
          <div class="agent-config__chips">
            <button
              v-for="opt in toolOptions"
              :key="opt.key"
              type="button"
              class="agent-config__chip"
              :class="{ 'is-on': isOn(enabledTools, opt.key) }"
              @click="enabledTools = toggleAllow(enabledTools, toolOptions.map((o) => o.key), opt.key)"
            >
              {{ isOn(enabledTools, opt.key) ? '✓ ' : '' }}{{ opt.label }}
            </button>
            <span v-if="!toolOptions.length" class="muted">（无）</span>
          </div>
        </div>

        <div class="agent-config__group">
          <div class="agent-config__group-title">启用技能</div>
          <div class="agent-config__chips">
            <button
              v-for="opt in skillOptions"
              :key="opt.key"
              type="button"
              class="agent-config__chip"
              :class="{ 'is-on': isOn(enabledSkills, opt.key) }"
              @click="enabledSkills = toggleAllow(enabledSkills, skillOptions.map((o) => o.key), opt.key)"
            >
              {{ isOn(enabledSkills, opt.key) ? '✓ ' : '' }}{{ opt.label }}
            </button>
            <span v-if="!skillOptions.length" class="muted">（无）</span>
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
.agent-config__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.agent-config__chip {
  border: 1px solid var(--nm-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--nm-text-secondary);
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
  font-family: inherit;
}
.agent-config__chip.is-on {
  border-color: var(--panel-accent);
  background: var(--panel-accent-soft);
  color: var(--panel-accent);
  font-weight: 600;
}
.agent-config__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 18px 14px;
  border-top: 1px solid var(--nm-border-subtle);
}
</style>
