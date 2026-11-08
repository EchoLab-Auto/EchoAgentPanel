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
import { effectiveSessionApi, profileMissing, sessionApiPersistent } from '../session-api';

const props = defineProps<{
  /** 目标会话（当前正在看的那个）。 */
  sessionId: string;
  /** 会话归属人格（命令必须显式带 team_id：没有默认人格）。 */
  teamId: string | null;
  /** 会话归属 core（多上游时定向，否则命令可能落到别的节点）。 */
  core: string | null;
}>();

/**
 * 生效 API 由本组件自己解析（`../session-api` 是唯一口径）。
 *
 * 为什么不用 props 传：状态行与侧栏卡片都要显示同一件事，各自持有一份"已解析
 * 好"的值就会分叉（2026-10 就是这么出现"卡片说 deepseek、徽标说 kimi"的）。
 */
const effective = computed(() =>
  effectiveSessionApi(state, props.sessionId, props.teamId),
);

/**
 * 浮层开合状态。
 *
 * `NeumorphismPopover` **没有受控的 `visible` prop**（只有 `visible-change`
 * 事件与 `show/hide/toggle/isOpen` 暴露方法），所以这里不能 `v-model`——只
 * 跟踪它报上来的状态，供触发器画展开态与无障碍属性。
 */
const open = ref(false);

/** `local:workspace:` 通道才有持久化载体（Core 侧同判据）。 */
const persistent = computed(() => sessionApiPersistent(props.sessionId));

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
  const { name, scope, label } = effective.value;
  const profile = name ? ` · profile「${name}」` : '';
  const missing = profileMissing(state, name) ? '（供应商池中无此 profile，实际回落顶层默认）' : '';
  const head = `当前会话 API：${label || '未知'}\n来源：${scope}${profile}${missing}`;
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
    <!-- 触发器：卡片里的一行（左标签 / 中当前值 / 右展开箭头），与
         「会话名称」「上下文容量」同一视觉节奏。 -->
    <button type="button" class="api-picker__trigger" :title="triggerTitle" :aria-expanded="open">
      <span class="api-picker__caption">API 配置</span>
      <span class="api-picker__value">
        <span class="api-picker__label">{{ effective.label || '未知' }}</span>
        <span v-if="effective.name" class="api-picker__source">{{ effective.scope }}</span>
      </span>
      <PanelIcon :name="open ? 'chevron-down' : 'chevron-right'" size="xs" tone="muted" />
    </button>

    <template #content>
      <div class="api-picker__panel" role="listbox" aria-label="会话 API">
        <div class="api-picker__head">
          <span class="api-picker__title">本会话 API</span>
          <span class="api-picker__scope">{{ effective.scope }}</span>
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
/* 触发器：卡片里的一行（与「会话名称」「上下文容量」同节奏）。
   常态不画边框（卡片里已经有分隔线），悬停才浮现可点区域。 */
.api-picker__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 3px 4px;
  margin: 0 -4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--nm-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.api-picker__trigger:hover {
  background: var(--panel-hover);
}
.api-picker__caption {
  flex: none;
  color: var(--nm-text-secondary);
  font-size: 11px;
}
.api-picker__value {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1 1 auto;
  min-width: 0;
}
.api-picker__label {
  overflow: hidden;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 来源层级（会话覆盖 / agent / 全局）：同名 provider/model 出自不同层级时
   唯一的区分线索，常驻但压低对比度。 */
.api-picker__source {
  overflow: hidden;
  color: var(--nm-text-secondary);
  font-size: 10px;
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
