//! 面板背景图（2026-11，设置 · 面板 · 外观）。
//!
//! ## 为什么是"往 CSS 变量里塞图"而不是给某个组件加背景
//!
//! 面板的视觉是一套 neumorphism 表面：整个界面共享一个 `--nm-bg-color` 平面，
//! 卡片靠 `--nm-surface-raised` + 双阴影从它上面"凸起"。背景图要做的不是换掉
//! 某个组件的底图，而是**换掉那个平面**——所以实现只有两步：
//!
//! 1. 在 `body::before` 上画图（fixed + cover/contain + 可选模糊），
//!    `body::after` 盖一层 `--nm-bg-color` 蒙版当"变暗"（随主题自动换色）；
//! 2. 把原本涂这个平面的三个大容器改成透明（`body` / `.nm-layout` /
//!    `.panel-layout`，以及聊天区的凹陷井 `.chat-view__list`）。
//!
//! 小控件（输入框、代码块、日志窗）继续用 `--nm-bg-color` 画"凹陷面"——它们
//! 本来就该是一块实底，透出照片会直接毁掉可读性。
//!
//! ## 为什么存在 localStorage 而不是 Core 配置
//!
//! 这是**这台浏览器**的视觉偏好，与主题（`echo-panel-theme`）、侧栏显隐
//! （`echo-panel-rail-collapsed`）同族。写进 Core 会让"我换张壁纸"变成
//! 影响所有设备的全局配置，还得为它设计上传通道与权限。
//!
//! 代价与对冲：
//! - 配额（localStorage 约 5MB）：≤2MB 的图**原样存**（零损失、不糊），更大
//!   的缩到长边 3200 再编码；写盘失败**如实报错**（不静默丢图）；
//! - 启动时序：读取与套用在 `initPanelBackground()` 里同步完成（模块加载期
//!   就设好 CSS 变量），不会先闪一帧无背景。

/** 背景图的适配方式（CSS `background-size` 的两个值）。 */
export type PanelBgFit = 'cover' | 'contain';

export interface PanelBgSettings {
  /** 适配：铺满（可能裁切）或完整显示（可能留边）。 */
  fit: PanelBgFit;
  /** 变暗强度 0–0.9：盖在图上的一层主题色蒙版不透明度。 */
  dim: number;
  /** 模糊半径 0–24px。 */
  blur: number;
}

/** 缺省值：铺满 + 轻微变暗（纯照片下白字/黑字都可能糊，35% 是观感与可读的折中）。 */
export const DEFAULT_BG_SETTINGS: PanelBgSettings = {
  fit: 'cover',
  dim: 0.35,
  blur: 0,
};

/** 图片本身的存储键（data URL）。 */
export const BG_IMAGE_KEY = 'echo-panel-bg-image';
/** 参数的存储键（JSON）。 */
export const BG_SETTINGS_KEY = 'echo-panel-bg-settings';
/** 生效标记属性（挂在 `<html>` 上；CSS 全靠它判断要不要透明化）。 */
export const BG_ATTR = 'data-panel-bg';

/**
 * 缩放上限（长边）。
 *
 * 3200 而不是更小：**高分屏上背景会被放大**。2× 屏的 1600×1000 视口 = 3200×2000
 * 物理像素，图只有 2560 长边时必然被拉伸重采样（实测梯度能量从 61.4 掉到
 * 25.1，比 dpr=1 的同图低 ~18%），用户看到的就是"糊"。3200 覆盖绝大多数
 * 2× 笔记本屏；更高（4K / 3×）会让单张图撑爆 localStorage 配额，只能靠
 * 用户自己选更大的原图（见 [`KEEP_ORIGINAL_MAX_BYTES`] 的原样保留路径）。
 */
export const MAX_IMAGE_EDGE = 3200;
/**
 * 原图不超过这个体积时**原样存**（不缩放、不重编码）。
 *
 * 这是"不糊"的主路径：常见壁纸 200KB–1.5MB，落在这条分支里就是逐字节原样，
 * 多大分辨率都保留。代价是 localStorage 占用随图走，所以上限压在 2MB
 * （base64 膨胀 4/3 后 ≈ 2.7M 字符，仍在 5MB 配额内）。
 */
export const KEEP_ORIGINAL_MAX_BYTES = 2 * 1024 * 1024;
/**
 * 重新编码的质量。
 *
 * 只有"超过 2MB 需要缩"的图才走到这里。实测 q=0.85 与 q=0.82 的锐度差在
 * 噪声范围内（都 ≈100% 基线），但 0.85 对渐变更干净；体积仍在配额内。
 */
export const REENCODE_QUALITY = 0.85;
/** 写盘前允许的最大 data URL 长度（字符）：localStorage 常见 5MB/源，留足余量。 */
export const MAX_DATA_URL_CHARS = 3_500_000;

/** 参数归一化（导出以便直接测）：任何坏值都退回缺省，不抛。 */
export function normalizeSettings(raw: unknown): PanelBgSettings {
  const out: PanelBgSettings = { ...DEFAULT_BG_SETTINGS };
  if (!raw || typeof raw !== 'object') return out;
  const record = raw as Record<string, unknown>;
  if (record.fit === 'contain' || record.fit === 'cover') out.fit = record.fit;
  const dim = Number(record.dim);
  if (Number.isFinite(dim)) out.dim = Math.min(0.9, Math.max(0, dim));
  const blur = Number(record.blur);
  if (Number.isFinite(blur)) out.blur = Math.min(24, Math.max(0, Math.round(blur)));
  return out;
}

/** 读当前背景（图 + 参数）。读不到就是没有背景。 */
export function loadBackground(): { image: string | null; settings: PanelBgSettings } {
  let image: string | null = null;
  let settings = { ...DEFAULT_BG_SETTINGS };
  try {
    const raw = localStorage.getItem(BG_IMAGE_KEY);
    // 只认 data: 开头的图：这条路径写进去的一定是 data URL，别的值出现在这里
    // 只可能是手改/污染，塞进 CSS 会被当成相对 URL 去请求一个不存在的文件。
    if (raw && raw.startsWith('data:image/')) image = raw;
    const rawSettings = localStorage.getItem(BG_SETTINGS_KEY);
    if (rawSettings) settings = normalizeSettings(JSON.parse(rawSettings));
  } catch {
    // 隐私模式 / 坏 JSON：当作没有背景（宁可不生效，也不要抛在启动路径上）
  }
  return { image, settings };
}

/**
 * 把当前设置套到 DOM 上（唯一的写样式出口）。
 *
 * `image` 为空 = 拆掉背景：删属性 + 清变量，CSS 侧回到原样（一条规则都不生效）。
 */
export function applyBackground(image: string | null, settings: PanelBgSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!image) {
    root.removeAttribute(BG_ATTR);
    root.style.removeProperty('--panel-bg-image');
    root.style.removeProperty('--panel-bg-size');
    root.style.removeProperty('--panel-bg-dim');
    root.style.removeProperty('--panel-bg-blur');
    return;
  }
  // data URL 里不会有双引号，但手改过就把引号转义掉——拼坏 CSS 会让整条规则失效，
  // 表现为"图选了、界面没反应"，比报错更难查。
  root.style.setProperty('--panel-bg-image', `url("${image.replace(/"/g, '%22')}")`);
  root.style.setProperty('--panel-bg-size', settings.fit);
  root.style.setProperty('--panel-bg-dim', String(settings.dim));
  root.style.setProperty('--panel-bg-blur', `${settings.blur}px`);
  root.setAttribute(BG_ATTR, 'on');
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * 存图 + 参数。**先写图再写参数**：图失败时参数不该单独生效（否则界面会出现
 * "变暗了但没有图"的怪状态）。
 */
export function saveBackground(image: string | null, settings: PanelBgSettings): SaveResult {
  try {
    if (image) {
      if (image.length > MAX_DATA_URL_CHARS) {
        return { ok: false, error: '图片太大，浏览器存储放不下——换一张小一点的（建议 2MB 以内的 JPEG）' };
      }
      localStorage.setItem(BG_IMAGE_KEY, image);
    } else {
      localStorage.removeItem(BG_IMAGE_KEY);
    }
    localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(settings));
    return { ok: true };
  } catch (error) {
    // 配额超限（QuotaExceededError）最常见：如实说清楚，别让用户以为功能坏了。
    const name = (error as { name?: string } | null)?.name ?? '';
    return {
      ok: false,
      error:
        name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
          ? '浏览器存储已满（背景图约占几 MB）——换一张小一点的图，或先清掉旧背景'
          : `保存失败：${(error as { message?: string } | null)?.message ?? String(error)}`,
    };
  }
}

/**
 * 选图 + 落地：读文件 → 按需缩放 → 存 → 应用。
 *
 * 成功时回传**实际落盘**的尺寸与是否重编码过：界面要如实告诉用户"你选的
 * 4000px 图被缩到了 3200"——不说的话，看界面没有变糊只是运气好，下次换一张
 * 可能会觉得"功能坏了"。
 */
export async function setBackgroundFromFile(
  file: File,
): Promise<SaveResult & { width?: number; height?: number; reencoded?: boolean }> {
  const prepared = await prepareImageFile(file);
  if (!prepared.ok) return prepared;
  const current = loadBackground().settings;
  const saved = saveBackground(prepared.dataUrl, current);
  if (!saved.ok) return saved;
  applyBackground(prepared.dataUrl, current);
  return {
    ok: true,
    width: prepared.width,
    height: prepared.height,
    reencoded: prepared.reencoded,
  };
}

/** 只改参数（适配 / 变暗 / 模糊），不动图。 */
export function updateBackgroundSettings(next: PanelBgSettings): SaveResult {
  const settings = normalizeSettings(next);
  const { image } = loadBackground();
  const saved = saveBackground(image, settings);
  if (!saved.ok) return saved;
  applyBackground(image, settings);
  return { ok: true };
}

/** 移除背景（回到纯色平面）。 */
export function clearBackground(): void {
  saveBackground(null, loadBackground().settings);
  applyBackground(null, DEFAULT_BG_SETTINGS);
}

export type PrepareResult =
  | { ok: true; dataUrl: string; width: number; height: number; bytes: number; reencoded: boolean }
  | { ok: false; error: string };

/**
 * 读一个图片文件并压到可存的体积。
 *
 * 策略（两个阈值，都不是随便取的）：
 * - 原图 ≤ `KEEP_ORIGINAL_MAX_BYTES` 且是位图 → **原样存**：不重编码就没有
 *   质量损失（也就不会糊），也能保住 PNG 的透明（"完整显示"模式下透明区会是
 *   页面底色）。常见壁纸都在这一档，所以默认路径是"零损失"；
 * - 更大的 → 长边缩到 `MAX_IMAGE_EDGE`、JPEG 重编码。用 canvas 而不是让
 *   CSS 去缩：CSS 缩放不省存储配额，而配额才是这条路径的真限制。
 *
 * 失败一律给人能读懂的原因（不是图片 / 太大 / 解码失败）。
 */
export async function prepareImageFile(file: File): Promise<PrepareResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: '这不是图片文件（支持 PNG / JPEG / WebP 等）' };
  }
  const readAsDataUrl = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });

  let original: string;
  try {
    original = await readAsDataUrl();
  } catch (error) {
    return { ok: false, error: (error as Error).message || '读取文件失败' };
  }
  if (!original.startsWith('data:image/')) {
    return { ok: false, error: '这个文件的类型不是图片' };
  }

  const bitmap = await decodeImage(original);
  if (!bitmap) {
    return { ok: false, error: '图片解码失败（文件可能已损坏）' };
  }
  const { width, height } = bitmap;

  // 小图原样存（无损 + 保透明）。
  if (file.size <= KEEP_ORIGINAL_MAX_BYTES) {
    if (original.length <= MAX_DATA_URL_CHARS) {
      return {
        ok: true,
        dataUrl: original,
        width,
        height,
        bytes: file.size,
        reencoded: false,
      };
    }
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { ok: false, error: '浏览器不支持画布缩放，无法处理这张图片' };
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  let dataUrl = '';
  try {
    dataUrl = canvas.toDataURL('image/jpeg', REENCODE_QUALITY);
  } catch {
    return { ok: false, error: '图片编码失败（可能是跨域或格式不受支持）' };
  }
  if (!dataUrl.startsWith('data:image/')) {
    return { ok: false, error: '图片编码失败（浏览器没有给出可用结果）' };
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    return {
      ok: false,
      error: `图片压缩后仍然太大（${Math.round(dataUrl.length / 1000)}K 字符）——换一张分辨率小一点的（长边 3200 以内通常够用）`,
    };
  }
  return {
    ok: true,
    dataUrl,
    width: targetW,
    height: targetH,
    // base64 的 UTF-16 字符数 → 近似字节（只用于展示，不参与判断）
    bytes: Math.round(dataUrl.length * 0.75),
    reencoded: true,
  };
}

/** 解码成可绘制的位图（优先 `createImageBitmap`，回落 `Image`）。 */
async function decodeImage(
  dataUrl: string,
): Promise<{ width: number; height: number } & CanvasImageSource | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const blob = await (await fetch(dataUrl)).blob();
      const bitmap = await createImageBitmap(blob);
      return bitmap as unknown as { width: number; height: number } & CanvasImageSource;
    }
  } catch {
    // 回落下面的 Image 路径
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve(img as unknown as { width: number; height: number } & CanvasImageSource);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * 启动时套用一次（`App.vue` 的 setup 里调用；同步完成，不留闪帧）。
 *
 * 幂等：重复调用只是把同样的变量再写一遍。
 */
export function initPanelBackground(): void {
  const { image, settings } = loadBackground();
  applyBackground(image, settings);
}
