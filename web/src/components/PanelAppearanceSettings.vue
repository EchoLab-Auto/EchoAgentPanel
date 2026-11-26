<script setup lang="ts">
//! 「设置 · 面板 · 外观」（2026-11）：面板自身的视觉偏好。
//!
//! ## 为什么需要这一节
//!
//! 面板的视觉偏好此前**分散在没有入口的地方**：主题切换在顶栏（`ThemeToggleButton`）、
//! 侧边栏收靠在聊天页贴边把手上。想看"面板现在是什么主题 / 两列侧栏都显示吗 /
//! 怎么换张壁纸"得先知道去哪找。把它收进设置页的第二级「外观」，与「概览（我在
//! 用的是哪种 Panel）」「安全（谁能进来）」并列。
//!
//! ## 只放**面板级**偏好
//!
//! 这里没有"字体大小""字号缩放"之类：面板没有那些能力，凭空加一个开关只会变成
//! 空壳。卡片高度 / 列内顺序 / 卡片换列是**拖动式**交互，在聊天页直接操作更自然
//! ——在设置页复刻一套只会有两个真相。

import { computed, ref } from 'vue';
import NeumorphismThemeToggle from '@echolab-auto/ui-frame/components/NeumorphismThemeToggle';
import NeumorphismSwitch from '@echolab-auto/ui-frame/components/NeumorphismSwitch';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismSegmented from '@echolab-auto/ui-frame/components/NeumorphismSegmented';
import NeumorphismSlider from '@echolab-auto/ui-frame/components/NeumorphismSlider';
import { useTheme } from '@echolab-auto/ui-frame/composables/useTheme';
import { railCollapsed, setRailCollapsed } from '../rail-collapse';
import {
  clearBackground,
  loadBackground,
  setBackgroundFromFile,
  updateBackgroundSettings,
  type PanelBgFit,
  type PanelBgSettings,
} from '../panel-background';

// 主题：ThemeProvider 提供的共享三态（浅色 / 跟随系统 / 深色），storageKey
// 由 App.vue 指定为 `echo-panel-theme`，与顶栏那个开关**同一份状态**——
// 改这里，顶栏图标立刻跟着变（反之亦然）。
const { theme } = useTheme();

/** 侧边栏显隐：与聊天页的贴边把手共用 `rail-collapse` 的模块级单例。 */
const leftVisible = computed({
  get: () => !railCollapsed.left,
  set: (visible: boolean) => setRailCollapsed('left', !visible),
});
const rightVisible = computed({
  get: () => !railCollapsed.right,
  set: (visible: boolean) => setRailCollapsed('right', !visible),
});

// ── 背景图（2026-11）────────────────────────────────────────────────
//
// 图与参数存在 localStorage（`panel-background.ts`），与主题/侧栏同族：这是
// **这台浏览器**的视觉偏好，写进 Core 会让"我换张壁纸"变成影响所有设备的全局
// 配置。处理流程（读文件 → 按需缩放 → 存 → 套用）全在那边，这里只管交互。

/** 当前是否有背景图（决定显示"选图"还是"换图/移除"）。 */
const hasImage = ref(loadBackground().image !== null);
const bgSettings = ref<PanelBgSettings>(loadBackground().settings);
/** 图片固有尺寸（选了新图才更新；刷新页面后不知道原图尺寸，不显示）。 */
const imageSize = ref<{ width: number; height: number } | null>(null);
const busy = ref(false);
const error = ref('');

const fileInput = ref<HTMLInputElement | null>(null);

const FIT_OPTIONS = [
  { label: '铺满', value: 'cover' },
  { label: '完整', value: 'contain' },
];

/** 变暗滑块的百分数（0–90），直接绑在 UI 上比绑 0–0.9 的小数稳。 */
const dimPercent = computed({
  get: () => Math.round(bgSettings.value.dim * 100),
  set: (value: number) => patchSettings({ dim: value / 100 }),
});

function patchSettings(partial: Partial<PanelBgSettings>) {
  const next = { ...bgSettings.value, ...partial };
  bgSettings.value = next;
  const saved = updateBackgroundSettings(next);
  error.value = saved.ok ? '' : saved.error;
}

function pickFile() {
  error.value = '';
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // 选同一个文件两次也要能触发 change（否则第二次点没反应）。
  input.value = '';
  if (!file) return;
  busy.value = true;
  error.value = '';
  try {
    const result = await setBackgroundFromFile(file);
    if (!result.ok) {
      error.value = result.error;
      return;
    }
    const loaded = loadBackground();
    hasImage.value = loaded.image !== null;
    bgSettings.value = loaded.settings;
    // 只显示缩放后落盘的实际尺寸：用户看到"我选了 4000px 的图"却发现界面上
    // 被缩到了 3200，会以为被压坏了；这里直接给出真实值（缺字段时不显示，不编造）。
    imageSize.value =
      result.width != null && result.height != null
        ? { width: result.width, height: result.height }
        : null;
  } finally {
    busy.value = false;
  }
}

function removeImage() {
  clearBackground();
  hasImage.value = false;
  imageSize.value = null;
  error.value = '';
}
</script>

<template>
  <section class="panel-appearance">
    <div class="panel-appearance__row panel-appearance__row--theme">
      <div class="panel-appearance__text">
        <div class="panel-appearance__label">主题</div>
        <div class="panel-appearance__hint">
          浅色 / 跟随系统 / 深色。与顶栏的主题开关是同一份设置，改哪边都会立即生效并记住。
        </div>
      </div>
      <NeumorphismThemeToggle v-model="theme" :size="5" />
    </div>

    <div class="panel-appearance__row">
      <div class="panel-appearance__text">
        <div class="panel-appearance__label">左侧栏</div>
        <div class="panel-appearance__hint">
          关掉后正文用满宽度，贴边留一个把手可以随时叫回来；开关状态会记住。
        </div>
      </div>
      <NeumorphismSwitch v-model="leftVisible" active-text="显示" inactive-text="收起" />
    </div>

    <div class="panel-appearance__row">
      <div class="panel-appearance__text">
        <div class="panel-appearance__label">右侧栏</div>
        <div class="panel-appearance__hint">
          连接状态、文件浏览器、Git、Shell 等卡片所在的列。同样可以收起并在需要时叫回。
        </div>
      </div>
      <NeumorphismSwitch v-model="rightVisible" active-text="显示" inactive-text="收起" />
    </div>

    <!-- 背景图：整块单独一节，因为它自己带一组参数（适配 / 变暗 / 模糊），
         和上面三行"一个开关"的节奏不同。 -->
    <div class="panel-appearance__block">
      <div class="panel-appearance__block-head">
        <div class="panel-appearance__text">
          <div class="panel-appearance__label">背景图片</div>
          <div class="panel-appearance__hint">
            用一张图替换界面的纯色底；卡片与输入框保持实底，所以文字仍然清楚。
            图片只存在这台浏览器（不写进 Core 配置，也不影响别的设备）。
          </div>
        </div>
        <div class="panel-appearance__block-actions">
          <NeumorphismButton
            :size="32"
            variant="glass"
            :loading="busy"
            @click="pickFile"
          >
            {{ hasImage ? '更换图片…' : '选择图片…' }}
          </NeumorphismButton>
          <NeumorphismButton
            v-if="hasImage"
            :size="32"
            variant="glass"
            @click="removeImage"
          >
            移除
          </NeumorphismButton>
        </div>
      </div>

      <!-- 原生 file input 隐藏：样式不可控（各平台差异巨大），按钮由上面那个
           承担。`accept` 只是过滤对话框，真正的类型校验在 `prepareImageFile`。 -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="panel-appearance__file"
        @change="onFileChange"
      />

      <p v-if="error" class="panel-appearance__error">{{ error }}</p>

      <template v-if="hasImage">
        <div class="panel-appearance__control">
          <span class="panel-appearance__control-label">适配</span>
          <NeumorphismSegmented
            :model-value="bgSettings.fit"
            :options="FIT_OPTIONS"
            :size="26"
            aria-label="背景图适配方式"
            @update:model-value="(v) => patchSettings({ fit: String(v) as PanelBgFit })"
          />
          <span class="panel-appearance__control-hint">
            铺满会裁掉边缘，完整则可能留出页面底色
          </span>
        </div>

        <div class="panel-appearance__control">
          <span class="panel-appearance__control-label">变暗</span>
          <NeumorphismSlider
            v-model="dimPercent"
            :min="0"
            :max="90"
            :step="5"
            :size="8"
            class="panel-appearance__slider"
          />
          <span class="panel-appearance__control-value">{{ dimPercent }}%</span>
        </div>

        <div class="panel-appearance__control">
          <span class="panel-appearance__control-label">模糊</span>
          <NeumorphismSlider
            v-model="bgSettings.blur"
            :min="0"
            :max="24"
            :step="2"
            :size="8"
            class="panel-appearance__slider"
            @update:model-value="(v) => patchSettings({ blur: Number(v) })"
          />
          <span class="panel-appearance__control-value">{{ bgSettings.blur }}px</span>
        </div>

        <p v-if="imageSize" class="panel-appearance__note muted">
          已保存 {{ imageSize.width }}×{{ imageSize.height }}。超过长边 3200 会等比缩小
          （浏览器存储有限）；高分屏上若看着发虚，换一张分辨率更高的原图即可。
        </p>
      </template>
    </div>

    <p class="panel-appearance__note muted">
      卡片的高度分配、列内顺序、卡片换列都在聊天页直接拖动调整（拖卡片之间的分隔条
      或卡头），这里不再重复一套入口。
    </p>
  </section>
</template>

<style scoped>
.panel-appearance {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 行式布局：文字块占满剩余宽度，控件靠右对齐（设置页的通用节奏）。 */
.panel-appearance__row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-radius: var(--nm-border-radius-md, 12px);
  background: var(--nm-surface-color, rgba(255, 255, 255, 0.04));
}
.panel-appearance__row--theme {
  /* 主题开关是 5 档齿轮，比普通 Switch 高得多——顶部对齐，别让文字悬在中间。 */
  align-items: flex-start;
}
.panel-appearance__text {
  flex: 1;
  min-width: 0;
}
.panel-appearance__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--nm-text-primary);
}
.panel-appearance__hint {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--nm-text-secondary);
}
.panel-appearance__note {
  margin: 6px 2px 0;
  font-size: 12px;
  line-height: 1.6;
}

/* ── 背景图块（比上面几行高一档：它自己带一组参数） ── */
.panel-appearance__block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--nm-border-radius-md, 12px);
  background: var(--nm-surface-color, rgba(255, 255, 255, 0.04));
}
.panel-appearance__block-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.panel-appearance__block-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
/* 原生 file input 只做对话框触发器：视觉隐藏但**不** display:none——
   部分浏览器对 display:none 的 input 调 .click() 不弹框。 */
.panel-appearance__file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.panel-appearance__control {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.panel-appearance__control-label {
  flex: 0 0 auto;
  width: 42px;
  font-size: 12px;
  color: var(--nm-text-secondary);
}
.panel-appearance__control-hint {
  font-size: 11px;
  color: var(--nm-text-secondary);
  opacity: 0.8;
}
.panel-appearance__control-value {
  flex: 0 0 auto;
  min-width: 44px;
  text-align: right;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--nm-text-secondary);
}
.panel-appearance__slider {
  flex: 1 1 auto;
  min-width: 0;
}
.panel-appearance__error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--panel-err);
  overflow-wrap: anywhere;
}

/* 窄屏：块头两行化（说明在上、按钮在下），控件行允许换行。 */
@media (max-width: 768px) {
  .panel-appearance__row,
  .panel-appearance__block {
    flex-wrap: wrap;
  }
  .panel-appearance__block-head {
    flex-direction: column;
    gap: 10px;
  }
  .panel-appearance__control {
    flex-wrap: wrap;
  }
  .panel-appearance__control-hint {
    flex-basis: 100%;
    padding-left: 54px;
  }
}
</style>
