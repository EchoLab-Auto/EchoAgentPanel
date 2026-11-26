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
//! 2. 把原本涂这个平面的容器改成透明（`body` / `.nm-theme-provider` /
//!    `.nm-layout` / `.panel-layout` / `.chat-view__list`）。
//!
//! ## 图存 IndexedDB，参数存 localStorage（2026-11 第二轮）
//!
//! 第一版把图存 localStorage（上限约 5MB，base64 还要膨胀 4/3），于是任何
//! 稍大的壁纸都得**缩到长边 2560 + JPEG 0.82**。用户看到的就是「模糊 / 颗粒
//! 很大」——那不是分辨率不够，是我们的存储策略把原图毁了。
//!
//! 现在：**原图按字节存进 IndexedDB（Blob，配额通常几百 MB）**，一张 20MB 的
//! 4K 壁纸也不掉一个像素；localStorage 只留三个数字（fit / dim / blur）与图的
//! 原始尺寸（给"你的图比屏幕小"这类提示用）。
//!
//! 浏览器不支持 IDB（隐私模式的部分实现 / 极老内核）时回落到第一版的行为
//! （data URL 进 localStorage），保持功能可用，只是受配额限制。
//!
//! ## 一个真实教训：不要用 scale 裁边缘
//!
//! 宁可让 `::before` 用负 inset 扩出去，也**绝不能** `transform: scale()`——
//! 任何 scale 都会让浏览器重采样整张图（实测把细节锐度打到基线的 77%），
//! 与"模糊"滑块是 0 还是 24 无关。

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

/** 旧版（data URL）图片的存储键；现在只用于**回落到 localStorage** 的分支。 */
export const BG_IMAGE_KEY = 'echo-panel-bg-image';
/** 参数的存储键（JSON）。 */
export const BG_SETTINGS_KEY = 'echo-panel-bg-settings';
/** 原始尺寸的存储键（JSON：`{width, height}`，给"图太小"的提示用）。 */
export const BG_META_KEY = 'echo-panel-bg-meta';
/** 生效标记属性（挂在 `<html>` 上；CSS 全靠它判断要不要透明化）。 */
export const BG_ATTR = 'data-panel-bg';

/** IndexedDB：库名 / 仓名 / 键名。 */
export const IDB_NAME = 'echo-panel';
export const IDB_STORE = 'assets';
export const IDB_KEY = 'background';

/**
 * 回落到 localStorage 时允许的最大 data URL 长度（字符）。
 *
 * localStorage 常见上限 5MB/源；留足余量（JS 字符串按 UTF-16 计，1 字符 ≈ 2B）。
 */
export const MAX_DATA_URL_CHARS = 3_500_000;

/** 缩图的最后手段门槛（仅当 IDB 不可用、且图大到 localStorage 放不下时才用）。 */
export const FALLBACK_SHRINK_EDGE = 2560;
/** 回落路径的重编码质量。 */
export const FALLBACK_QUALITY = 0.85;

// ── 参数：纯函数 ────────────────────────────────────────────────────

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

/** 读参数（同步；坏 JSON 退默认，绝不抛在启动路径上）。 */
export function loadSettings(): PanelBgSettings {
  try {
    const raw = localStorage.getItem(BG_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_BG_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_BG_SETTINGS };
  }
}

/** 写参数（同步；配额满等异常由调用方决定怎么报）。 */
export function storeSettings(settings: PanelBgSettings): void {
  localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
}

/** 图已存的原始尺寸（没存过 / 旧版没写过 → null）。 */
export interface PanelBgMeta {
  width: number;
  height: number;
}

export function loadMeta(): PanelBgMeta | null {
  try {
    const raw = localStorage.getItem(BG_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PanelBgMeta>;
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }
    return { width, height };
  } catch {
    return null;
  }
}

export function storeMeta(meta: PanelBgMeta | null): void {
  try {
    if (meta) localStorage.setItem(BG_META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(BG_META_KEY);
  } catch {
    // meta 只是提示用，写不进去不影响功能
  }
}

// ── 图片：IndexedDB 优先，localStorage 回落 ─────────────────────────

/** IDB 是否可用（jsdom / 老内核 / 隐私模式下可能没有）。 */
function idbAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

/** 打开库（每次调用都 `open`，浏览器内部会复用连接；本模块调用频率极低）。 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 打开失败'));
  });
}

function idbPut(value: unknown, key = IDB_KEY): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('写入 IndexedDB 失败'));
        };
      }),
  );
}

function idbGet<T>(key = IDB_KEY): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const request = tx.objectStore(IDB_STORE).get(key);
        request.onsuccess = () => {
          const result = request.result as T | undefined;
          db.close();
          resolve(result);
        };
        request.onerror = () => {
          db.close();
          reject(request.error ?? new Error('读取 IndexedDB 失败'));
        };
      }),
  );
}

function idbDelete(key = IDB_KEY): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('删除 IndexedDB 条目失败'));
        };
      }),
  );
}

/**
 * 当前生效的图片地址。
 *
 * 两件事必须一起管：
 * - **对象 URL 的生命周期**：`URL.createObjectURL` 建立的引用不会自动回收，
 *   换图/删图时必须 `revokeObjectURL`，否则一次会话里换十张图就泄漏十份 Blob。
 * - **data URL 回落的兼容**：旧版本把图存在 `BG_IMAGE_KEY`，升级后第一次启动
 *   要能读出来（否则用户会看到"我的背景没了"）。
 */
let currentObjectUrl: string | null = null;

function revokeCurrent(): void {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

/** 旧版残留的 data URL（迁移源；也可能是当前回落路径的存储）。 */
function legacyDataUrl(): string | null {
  try {
    const raw = localStorage.getItem(BG_IMAGE_KEY);
    // 只认 data: 开头的图：别的值（相对路径/网址）塞进 CSS 会被当相对 URL 去
    // 请求一个不存在的文件，表现为静默 404 + 没有背景。
    if (raw && raw.startsWith('data:image/')) return raw;
  } catch {
    // 隐私模式等
  }
  return null;
}

/** 读出可用的图片地址（没有图 → null）。 */
export async function loadImageUrl(): Promise<string | null> {
  revokeCurrent();
  if (idbAvailable()) {
    try {
      const blob = await idbGet<Blob>();
      if (blob instanceof Blob && blob.size > 0) {
        currentObjectUrl = URL.createObjectURL(blob);
        return currentObjectUrl;
      }
    } catch {
      // IDB 不可用/被清空：落到下面的旧版 data URL
    }
  }
  const legacy = legacyDataUrl();
  return legacy;
}

/** 保存结果：成功时带回**实际存储方式**与尺寸（给界面如实汇报）。 */
export type StoreImageResult =
  | { ok: true; width: number; height: number; mode: 'indexeddb' | 'local' | 'shrunk' }
  | { ok: false; error: string };

/**
 * 存图：IndexedDB 优先（**原图字节，不重编码**），放不下才缩。
 *
 * 为什么不无脑缩到某个长边：背景图是**全屏铺开**的，任何分辨率损失都会被
 * 放大成"模糊 + 颗粒"。IDB 的配额通常是几百 MB，一张 4K 壁纸完全放得下。
 */
export async function storeImage(file: Blob): Promise<StoreImageResult> {
  // 尺寸只用于"你的图比屏幕小"这类提示，解不出来不该拦住保存——某些环境下
  // 解码能力缺失（老 WebView），但浏览器自己画背景图没问题。
  const size = await readImageSize(file);
  storeMeta(size);

  if (idbAvailable()) {
    try {
      await idbPut(file);
      try {
        localStorage.removeItem(BG_IMAGE_KEY); // 清掉旧版残留，避免双份占配额
      } catch {
        /* ignore */
      }
      return {
        ok: true,
        width: size?.width ?? 0,
        height: size?.height ?? 0,
        mode: 'indexeddb',
      };
    } catch {
      // 配额/隐私模式 → 走下面的回落
    }
  }

  // 回落：localStorage + data URL（受 ~5MB 配额限制，必要时缩图）
  const dataUrl = await blobToDataUrl(file);
  if (dataUrl && dataUrl.length <= MAX_DATA_URL_CHARS) {
    try {
      localStorage.setItem(BG_IMAGE_KEY, dataUrl);
      return { ok: true, width: size?.width ?? 0, height: size?.height ?? 0, mode: 'local' };
    } catch {
      /* 落到缩图 */
    }
  }
  const shrunk = await shrinkToDataUrl(file, FALLBACK_SHRINK_EDGE, FALLBACK_QUALITY);
  if (!shrunk) return { ok: false, error: '图片无法处理（解码或编码失败）' };
  if (shrunk.dataUrl.length > MAX_DATA_URL_CHARS) {
    return {
      ok: false,
      error: `这幅图太大，浏览器本地存储放不下（压缩后仍 ${Math.round(shrunk.dataUrl.length / 1000)}K 字符）。换一张小一点的，或换用支持 IndexedDB 的浏览器。`,
    };
  }
  try {
    localStorage.setItem(BG_IMAGE_KEY, shrunk.dataUrl);
    storeMeta({ width: shrunk.width, height: shrunk.height });
    return { ok: true, width: shrunk.width, height: shrunk.height, mode: 'shrunk' };
  } catch (error) {
    const name = (error as { name?: string } | null)?.name ?? '';
    return {
      ok: false,
      error:
        name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
          ? '浏览器本地存储已满——换一张小一点的图，或先移除现有背景'
          : `保存失败：${(error as { message?: string } | null)?.message ?? String(error)}`,
    };
  }
}

/** 移除图片（IDB + localStorage 两处都清，并回收对象 URL）。 */
export async function removeImage(): Promise<void> {
  revokeCurrent();
  if (idbAvailable()) {
    try {
      await idbDelete();
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(BG_IMAGE_KEY);
  } catch {
    /* ignore */
  }
  storeMeta(null);
}

/** 是否已存过图（同步判定：看 meta，IDB/localStorage 的真实性由加载时确认）。 */
export function hasStoredImage(): boolean {
  if (loadMeta()) return true;
  return legacyDataUrl() !== null;
}

// ── DOM：把状态套上 ─────────────────────────────────────────────────

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
  // URL 可能来自 data:（含 base64）或 blob:；双引号一律转义——拼坏 CSS 会让
  // 整条规则失效，表现为"图选了、界面没反应"，比报错更难查。
  root.style.setProperty('--panel-bg-image', `url("${image.replace(/"/g, '%22')}")`);
  root.style.setProperty('--panel-bg-size', settings.fit);
  root.style.setProperty('--panel-bg-dim', String(settings.dim));
  root.style.setProperty('--panel-bg-blur', `${settings.blur}px`);
  root.setAttribute(BG_ATTR, 'on');
}

/** 只改参数（适配 / 变暗 / 模糊），不动图。 */
export function updateBackgroundSettings(next: PanelBgSettings): { ok: true } | { ok: false; error: string } {
  try {
    storeSettings(next);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `保存设置失败：${(error as { message?: string } | null)?.message ?? String(error)}`,
    };
  }
}

/** 删图 + 复位参数 + 摘掉 DOM 上的属性（三者缺一都会留残余）。 */
export async function clearBackground(): Promise<void> {
  await removeImage();
  try {
    localStorage.removeItem(BG_SETTINGS_KEY);
  } catch {
    /* ignore */
  }
  applyBackground(null, DEFAULT_BG_SETTINGS);
}

/**
 * 启动时套用一次（`App.vue` 的 setup 里 `void initPanelBackground()`）。
 *
 * 设置是同步的（先让蒙版/模糊就位），图片是异步的（IDB 读 + 对象 URL），
 * 所以**属性要等图真正就绪才设**——否则会先出现"透明但没图"的怪帧（露出
 * 浏览器默认白底，比纯色界面更难看）。
 */
export async function initPanelBackground(): Promise<void> {
  const settings = loadSettings();
  let url: string | null = null;
  try {
    url = await loadImageUrl();
  } catch {
    url = null;
  }
  applyBackground(url, settings);
}

// ── 图像工具 ────────────────────────────────────────────────────────

/**
 * 给"可能永远不结算"的解码加个上限。
 *
 * 为什么必须有：不是所有环境都真的会触发 `onload` / `reject`——测试用的
 * happy-dom 里 `createImageBitmap` 是个**永不 resolve 的函数**，某些老 WebView
 * 对损坏的 JPEG 也会静默卡住。没有这个上限时表现是"选了图，界面一直转圈"。
 */
export const DECODE_TIMEOUT_MS = 1200;

function withTimeout<T>(task: Promise<T>, ms = DECODE_TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    task,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

/** 读出图片的天然尺寸（解码失败 / 超时 → null）。 */
export async function readImageSize(blob: Blob): Promise<PanelBgMeta | null> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await withTimeout(
      createImageBitmap(blob).catch(() => null),
    );
    if (bitmap) {
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
      return size;
    }
  }
  if (typeof Image !== 'function') return null;
  const url = URL.createObjectURL(blob);
  try {
    return await withTimeout(
      new Promise<PanelBgMeta | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = url;
      }),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.startsWith('data:image/') ? result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/** 缩图 + 重编码（**只有回落路径才会用到**：IDB 存不下时）。 */
async function shrinkToDataUrl(
  blob: Blob,
  maxEdge: number,
  quality: number,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const size = await readImageSize(blob);
  if (!size) return null;
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(blob);
    } else {
      const url = URL.createObjectURL(blob);
      bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('图片加载失败'));
        };
        img.src = url;
      });
    }
  } catch {
    return null;
  }
  const scale = Math.min(1, maxEdge / Math.max(size.width, size.height));
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
  (bitmap as ImageBitmap).close?.();
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl.startsWith('data:image/') ? { dataUrl, width, height } : null;
  } catch {
    return null;
  }
}
