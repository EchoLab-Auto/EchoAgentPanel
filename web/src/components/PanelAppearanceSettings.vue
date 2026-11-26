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

import { computed, onMounted, onUnmounted, ref } from 'vue';
import NeumorphismThemeToggle from '@echolab-auto/ui-frame/components/NeumorphismThemeToggle';
import NeumorphismSwitch from '@echolab-auto/ui-frame/components/NeumorphismSwitch';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismSegmented from '@echolab-auto/ui-frame/components/NeumorphismSegmented';
import NeumorphismSlider from '@echolab-auto/ui-frame/components/NeumorphismSlider';
import { useTheme } from '@echolab-auto/ui-frame/composables/useTheme';
import { railCollapsed, setRailCollapsed } from '../rail-collapse';
import {
  applyBackground,
  clearBackground,
  hasStoredImage,
  initPanelBackground,
  loadImageUrl,
  loadMeta,
  loadSettings,
  storeImage,
  updateBackgroundSettings,
  type PanelBgFit,
  type PanelBgMeta,
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
// 图存 IndexedDB（原图字节，不重编码），参数存 localStorage。这里只管交互；
// 存储与套用在 `panel-background.ts`。

const settings = ref<PanelBgSettings>(loadSettings());
/** 已存过的图的原始尺寸（用于"你的图比屏幕小"这类提示）。 */
const meta = ref<PanelBgMeta | null>(loadMeta());
const hasImage = ref(hasStoredImage());
const busy = ref(false);
const error = ref('');
/** 界面上的"需要多大"的实时值（随窗口变化重算）。 */
const viewport = ref({ w: 0, h: 0, dpr: 1 });

const fileInput = ref<HTMLInputElement | null>(null);

const FIT_OPTIONS = [
  { label: '铺满', value: 'cover' },
  { label: '完整', value: 'contain' },
];

/** 变暗滑块的百分数（0–90），直接绑在 UI 上比绑 0–0.9 的小数稳。 */
const dimPercent = computed({
  get: () => Math.round(settings.value.dim * 100),
  set: (value: number) => patchSettings({ dim: value / 100 }),
});

/** 屏幕实际需要的图片像素（CSS 尺寸 × 设备像素比）。 */
const neededPixels = computed(() => ({
  w: Math.round(viewport.value.w * viewport.value.dpr),
  h: Math.round(viewport.value.h * viewport.value.dpr),
}));

/**
 * 放大倍率：图要在 `cover` 下盖满屏幕，实际被拉伸多少倍。
 *
 * >1 就是"每个源像素被摊到多个设备像素上"——用户看到的颗粒感正是这个。
 * 用 `max(需要宽/图宽, 需要高/图高)`（cover 取较大的那个方向）。
 */
const magnification = computed(() => {
  const m = meta.value;
  const need = neededPixels.value;
  if (!m || !need.w || !need.h) return 1;
  return Math.max(need.w / m.width, need.h / m.height);
});

/** 明显偏小才提示（1.15 以内肉眼几乎看不出）。 */
const tooSmall = computed(() => hasImage.value && magnification.value > 1.15);

function refreshViewport() {
  viewport.value = {
    w: window.innerWidth,
    h: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  };
}

function onResize() {
  refreshViewport();
}

onMounted(() => {
  refreshViewport();
  window.addEventListener('resize', onResize);
  // 主题/侧栏之外的第三种情形：别的窗口改了背景（多标签页），这里不追——
  // 背景是"本窗口的视觉偏好"，跨窗口同步留待有人真的需要时再做。
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});

function patchSettings(partial: Partial<PanelBgSettings>) {
  const next = { ...settings.value, ...partial };
  settings.value = next;
  const saved = updateBackgroundSettings(next);
  error.value = saved.ok ? '' : saved.error;
  if (saved.ok) {
    // 参数变了要重新套一次（`--panel-bg-dim` 等变量在 html 上）
    void applyNow();
  }
}

/** 把"当前存储状态"重新套到 DOM（换图 / 改参数后调用）。 */
async function applyNow() {
  const url = await loadImageUrl();
  applyBackground(url, settings.value);
}

function pickFile() {
  error.value = '';
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // 同一个文件选两次也要能触发 change
  if (!file) return;
  busy.value = true;
  error.value = '';
  try {
    const result = await storeImage(file);
    if (!result.ok) {
      error.value = result.error;
      return;
    }
    hasImage.value = true;
    meta.value = { width: result.width, height: result.height };
    settings.value = loadSettings();
    await applyNow();
    if (result.mode === 'shrunk') {
      // 回落路径（无 IndexedDB）缩了图：如实说明，否则用户会以为功能把图毁了
      error.value = `浏览器不支持 IndexedDB，这张图被压到 ${result.width}×${result.height} 存储（会略钝）。`;
    }
  } finally {
    busy.value = false;
  }
}

async function removeImage() {
  busy.value = true;
  try {
    await clearBackground();
    hasImage.value = false;
    meta.value = null;
    settings.value = loadSettings();
    error.value = '';
    await initPanelBackground();
  } finally {
    busy.value = false;
  }
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
            :model-value="settings.fit"
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
            v-model="settings.blur"
            :min="0"
            :max="24"
            :step="2"
            :size="8"
            class="panel-appearance__slider"
            @update:model-value="(v) => patchSettings({ blur: Number(v) })"
          />
          <span class="panel-appearance__control-value">{{ settings.blur }}px</span>
        </div>

        <p v-if="meta" class="panel-appearance__note muted">
          已保存原图 {{ meta.width }}×{{ meta.height }}（未压缩、未缩放，按原始字节存储）。
          这块屏幕需要约 {{ neededPixels.w }}×{{ neededPixels.h }} 像素
          （窗口 {{ viewport.w }}×{{ viewport.h }} × {{ viewport.dpr }} 倍屏）。
        </p>
        <!-- 图比屏幕小时必须说清楚：这是"模糊 / 颗粒大"的唯一真实原因，
             而且只靠 CSS 无法补救（放大只能摊像素，不能造细节）。 -->
        <p v-if="tooSmall" class="panel-appearance__warn">
          这张图会被放大 {{ magnification.toFixed(1) }} 倍，所以看着会发虚、颗粒明显。
          换一张长边不小于 {{ neededPixels.w }} 像素的图片即可清晰；
          「模糊」调到 0 也不会改善（那是重采样，不是模糊效果）。
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
/* 「图比屏幕小」提示：警告色但不报错——它说的是"这张图不够大"，
   不是"保存失败"，用 error 的红会让人以为出故障了。 */
.panel-appearance__warn {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--nm-border-radius-sm, 8px);
  background: color-mix(in srgb, var(--panel-warn) 10%, transparent);
  border-left: 3px solid var(--panel-warn);
  font-size: 12px;
  line-height: 1.6;
  color: var(--nm-text-primary);
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
