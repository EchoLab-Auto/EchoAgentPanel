<script setup lang="ts">
//! 会话级 API 选择器（2026-11）。
//!
//! ## 为什么从「会话」面板搬到这里
//!
//! 会话级 API 覆盖是"**这个会话**的请求走哪个 provider"——它是当前会话的属性，
//! 而不是"挑一个会话"的动作。原来它挂在「会话」覆盖面板的每一行上（每个会话
//! 一个下拉），导致三个问题：
//! 1. 切会话时看不到自己现在用的是哪个 API（要打开面板才知道）；
//! 2. 行内下拉把行高撑起来，且点击要 `@click.stop` 才不会触发行选中——两套
//!    交互挤在同一行；
//! 3. 多个会话各配一次，改完不知道有没有生效。
//!
//! 现在挂在输入区状态行的 API 徽标上：**显示的就是当前会话生效的那个**，
//! 点开即可改，改完立刻回显。
//!
//! ## 持久化的真实边界（必须在界面上说清）
//!
//! Core 的 `SetSessionApi` 对任意会话都生效（运行期内存覆盖），但**只有工作区
//! 通道**（`local:workspace:`）会把覆盖写进工作区对话的 JSON——其余会话重启
//! 后回到 persona 配置。组件据此在提示里区分，不承诺做不到的事。

import { computed, ref } from 'vue';
import NeumorphismPopover from '@echolab-auto/ui-frame/components/NeumorphismPopover';
import PanelIcon from './PanelIcon.vue';
import { sendCommand } from '../connection';
import { state } from '../store';

const props = defineProps<{
  /** 目标会话（当前正在看的那个）。 */
  sessionId: string;
  /** 会话归属人格（命令必须显式带 team_id：没有默认人格）。 */
  teamId: string | null;
  /** 会话归属 core（多上游时定向，否则命令可能落到别的节点）。 */
  core: string | null;
  /** 当前生效的 `provider / model`（父组件已按四层顺序解析好）。 */
  effectiveLabel: string;
  /** 生效层级说明（"本会话覆盖" / "agent「X」" / "全局激活" / 顶层默认）。 */
  effectiveScope: string;
  /** 生效的 profile 名（空 = 顶层默认配置，没有 profile 可报）。 */
  profileName?: string;
  /** 回退标签（跨会话切换时避免闪空）。 */
  fallback?: boolean;
}>();

/**
 * 浮层开合状态。
 *
 * `NeumorphismPopover` **没有受控的 `visible` prop**（只有 `visible-change`
 * 事件与 `show/hide/toggle/isOpen` 暴露方法），所以这里不能 `v-model`——只
 * 跟踪它报上来的状态，供触发器画展开态与无障碍属性。
 */
const open = ref(false);

/** `local:workspace:` 通道才有持久化载体（Core 侧同判据）。 */
const persistent = computed(() => props.sessionId.startsWith('local:workspace:'));

/** 当前会话的覆盖值（空 = 跟随 persona）。 */
const current = computed(() => state.sessionApiOverrides[props.sessionId] ?? '');

/** 选项：首项 = 清除覆盖。 */
const options = computed(() => [
  {
    value: '',
    name: '跟随 persona',
    detail: '清除会话级覆盖，回到 agent 自己的 API 配置',
  },
  ...(state.api?.profiles ?? []).map((profile) => ({
    value: profile.name,
    name: profile.name,
    detail: [profile.provider, profile.model].filter(Boolean).join(' / '),
  })),
]);

/** 提交：空值 = 清除覆盖（`ClearSessionApi`），否则 `SetSessionApi`。 */
function choose(value: string) {
  if (!props.teamId) {
    open.value = false;
    return;
  }
  if (value === current.value) {
    open.value = false;
    return;
  }
  // 乐观更新：Core 若拒绝（profile 解析失败）会 emit Error，届时以回推为准。
  if (value) state.sessionApiOverrides[props.sessionId] = value;
  else delete state.sessionApiOverrides[props.sessionId];
  const target = props.core ?? undefined;
  if (value) {
    sendCommand(
      { SetSessionApi: { team_id: props.teamId, session_id: props.sessionId, profile: value } },
      target,
    );
  } else {
    sendCommand(
      { ClearSessionApi: { team_id: props.teamId, session_id: props.sessionId } },
      target,
    );
  }
  open.value = false;
}

/**
 * 徽标悬停说明：生效层级 + profile 名 + 持久化边界。
 *
 * 为什么会带 profile 名：provider/model 是**解析结果**，而排障时要知道它
 * 出自哪个 profile（同一 provider 常有多个 profile 指向不同端点/key）。
 */
const triggerTitle = computed(() => {
  const profile = props.profileName ? ` · profile「${props.profileName}」` : '';
  const head = `当前会话 API：${props.effectiveLabel || '未知'}\n来源：${props.effectiveScope}${profile}`;
  return persistent.value
    ? `${head}\n点开可改为其它供应商（会写入该工作区对话）`
    : `${head}\n点开可改为其它供应商（本会话不是工作区通道，改动仅在本次运行有效）`;
});
</script>

<template>
  <NeumorphismPopover
    position="top"
    trigger="click"
    :width="280"
    class="api-picker"
    @visible-change="(visible: boolean) => (open = visible)"
  >
    <!-- 触发器：沿用状态行的纯文字徽标（不加外框），补一个可点的语义。 -->
    <button type="button" class="api-picker__trigger" :title="triggerTitle" :aria-expanded="open">
      <span class="api-picker__label">{{ effectiveLabel || '未知 API' }}</span>
      <PanelIcon name="chevron-up" size="xs" tone="muted" />
    </button>

    <template #content>
      <div class="api-picker__panel" role="listbox" aria-label="会话 API">
        <div class="api-picker__head">
          <span class="api-picker__title">本会话 API</span>
          <span class="api-picker__scope">{{ effectiveScope }}</span>
        </div>
        <button
          v-for="option in options"
          :key="option.value || '__persona__'"
          type="button"
          role="option"
          class="api-picker__option"
          :class="{ 'api-picker__option--active': option.value === current }"
          :aria-selected="option.value === current"
          @click="choose(option.value)"
        >
          <span class="api-picker__check" aria-hidden="true">
            <PanelIcon v-if="option.value === current" name="check" size="xs" tone="accent" />
          </span>
          <span class="api-picker__text">
            <span class="api-picker__name">{{ option.name }}</span>
            <span v-if="option.detail" class="api-picker__detail">{{ option.detail }}</span>
          </span>
        </button>
        <div class="api-picker__hint">
          {{
            persistent
              ? '写入该工作区对话，重启后仍生效。'
              : '非工作区会话：仅在本次运行有效（重启回到 persona 配置）。'
          }}
        </div>
      </div>
    </template>
  </NeumorphismPopover>
</template>

<style scoped>
/* 触发器：只抵一档视觉层次——它就是状态行里那行小字，多一个「可点」的暗示。 */
.api-picker__trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--nm-text-primary);
  font: inherit;
  font-size: 11px;
  line-height: var(--chat-status-h, 17px);
  opacity: 0.75;
  cursor: pointer;
}
.api-picker__trigger:hover {
  opacity: 1;
  color: var(--panel-accent);
}
.api-picker__label {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-picker__panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.api-picker__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 6px 6px;
  border-bottom: 1px solid var(--nm-border-subtle, rgba(128, 128, 128, 0.2));
  margin-bottom: 4px;
}
.api-picker__title {
  font-size: 12px;
  font-weight: 700;
  color: var(--nm-text-primary);
}
.api-picker__scope {
  overflow: hidden;
  font-size: 11px;
  color: var(--nm-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-picker__option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--nm-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.api-picker__option:hover {
  background: var(--panel-hover);
}
.api-picker__option--active {
  background: color-mix(in srgb, var(--panel-accent) 14%, transparent);
}
.api-picker__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  flex: none;
}
.api-picker__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.api-picker__name {
  font-size: 12px;
}
.api-picker__detail {
  overflow: hidden;
  font-size: 11px;
  color: var(--nm-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-picker__hint {
  padding: 6px 6px 2px;
  border-top: 1px solid var(--nm-border-subtle, rgba(128, 128, 128, 0.2));
  margin-top: 4px;
  color: var(--nm-text-secondary);
  font-size: 10px;
  line-height: 1.5;
}
</style>
