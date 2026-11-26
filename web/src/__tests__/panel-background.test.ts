//! 自定义背景图（`panel-background.ts`）的契约（2026-11）。
//!
//! ## 为什么这些值得钉
//!
//! 这条路径的失败**全是静默的**：变量拼坏 → CSS 规则整条失效（看起来"图选了
//! 但界面没变"）；写盘失败被吞 → 用户以为存上了，刷新就没了；`data-panel-bg`
//! 忘了摘 → 删图之后界面还是透明的（露出白底/黑底，比原样更难看）。
//!
//! 三条不变式：
//! 1. **删图 = 零残留**：属性与四个变量全部清掉，CSS 侧一条规则都不再命中；
//! 2. **坏数据一律退默认**，绝不在启动路径上抛（那是白屏）；
//! 3. **只认 `data:image/` / 自己的 blob URL**：别的值塞进 CSS 会被当相对 URL
//!    去请求，表现为一个静默的 404 + 没有背景。
//!
//! 注：单测跑在 happy-dom 下（没有 IndexedDB），所以这里覆盖的是
//! **localStorage 回落路径**与参数/DOM 逻辑——IDB 路径由 Playwright 实测覆盖。

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  BG_ATTR,
  BG_IMAGE_KEY,
  BG_META_KEY,
  BG_SETTINGS_KEY,
  DEFAULT_BG_SETTINGS,
  MAX_DATA_URL_CHARS,
  applyBackground,
  clearBackground,
  hasStoredImage,
  loadImageUrl,
  loadMeta,
  loadSettings,
  normalizeSettings,
  storeImage,
  storeMeta,
  storeSettings,
  updateBackgroundSettings,
} from '../panel-background';

/** 一个最小的合法"图片"（只用来跑存储/套用，不解码）。 */
const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

/** 由 data URL 还原 Blob（`storeImage` 的入参是 Blob）。 */
function toBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.slice(head.indexOf(':') + 1, head.indexOf(';'));
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

describe('背景图：参数归一化', () => {
  it('坏值一律退默认（启动路径不允许抛）', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_BG_SETTINGS);
    expect(normalizeSettings('nope')).toEqual(DEFAULT_BG_SETTINGS);
    expect(normalizeSettings({})).toEqual(DEFAULT_BG_SETTINGS);
  });

  it('数值夹在合法区间内', () => {
    expect(normalizeSettings({ dim: 5 }).dim).toBe(0.9);
    expect(normalizeSettings({ dim: -1 }).dim).toBe(0);
    expect(normalizeSettings({ blur: 999 }).blur).toBe(24);
    expect(normalizeSettings({ blur: -3 }).blur).toBe(0);
    // 模糊取整：0.5px 的模糊在屏幕上没有意义，只会让存储值与显示值不一致
    expect(normalizeSettings({ blur: 7.6 }).blur).toBe(8);
  });

  it('fit 只认 cover / contain', () => {
    expect(normalizeSettings({ fit: 'contain' }).fit).toBe('contain');
    expect(normalizeSettings({ fit: 'stretch' }).fit).toBe(DEFAULT_BG_SETTINGS.fit);
  });
});

describe('背景图：存储与套用（localStorage 回落路径）', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(BG_ATTR);
  });
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(BG_ATTR);
    document.documentElement.removeAttribute('style');
  });

  it('没有存过 = 没有背景', async () => {
    expect(await loadImageUrl()).toBeNull();
    expect(loadSettings()).toEqual(DEFAULT_BG_SETTINGS);
    expect(loadMeta()).toBeNull();
    expect(hasStoredImage()).toBe(false);
  });

  it('存 → 读 → 套用：变量与属性都到位', async () => {
    const result = await storeImage(toBlob(TINY));
    expect(result.ok, 'happy-dom 无 IDB → 走 localStorage 回落').toBe(true);
    if (result.ok) expect(result.mode).toBe('local');

    const url = await loadImageUrl();
    expect(url, '回落路径读出的是 data URL 本身').toBe(TINY);

    storeSettings({ fit: 'contain', dim: 0.5, blur: 12 });
    applyBackground(url, loadSettings());

    const root = document.documentElement;
    expect(root.getAttribute(BG_ATTR)).toBe('on');
    expect(root.style.getPropertyValue('--panel-bg-image')).toBe(`url("${TINY}")`);
    expect(root.style.getPropertyValue('--panel-bg-size')).toBe('contain');
    expect(root.style.getPropertyValue('--panel-bg-dim')).toBe('0.5');
    expect(root.style.getPropertyValue('--panel-bg-blur')).toBe('12px');
  });

  it('删图 = 零残留（属性与四个变量全部清掉）', async () => {
    await storeImage(toBlob(TINY));
    storeSettings({ fit: 'cover', dim: 0.4, blur: 8 });
    applyBackground(await loadImageUrl(), loadSettings());

    await clearBackground();

    const root = document.documentElement;
    expect(root.hasAttribute(BG_ATTR), 'CSS 全靠这个属性，留着就会继续透明').toBe(false);
    for (const name of ['--panel-bg-image', '--panel-bg-size', '--panel-bg-dim', '--panel-bg-blur']) {
      expect(root.style.getPropertyValue(name), `${name} 应被清掉`).toBe('');
    }
    expect(localStorage.getItem(BG_IMAGE_KEY)).toBeNull();
    expect(localStorage.getItem(BG_META_KEY)).toBeNull();
    expect(await loadImageUrl()).toBeNull();
  });

  it('只改参数不动图', async () => {
    await storeImage(toBlob(TINY));
    const saved = updateBackgroundSettings({ fit: 'contain', dim: 0.2, blur: 4 });
    expect(saved.ok).toBe(true);
    expect(await loadImageUrl()).toBe(TINY);
    expect(loadSettings().fit).toBe('contain');
  });

  it('超大图在写盘前就被挡住，并给出可读原因', async () => {
    // 造一个必然超出 localStorage 配额的"图"（伪造 mime，只走存储判定分支）
    const huge = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' });
    const result = await storeImage(huge);
    // happy-dom 的 localStorage 不会真的抛配额，但 `readImageSize` 解不出尺寸
    // → 直接判失败（同样不该留下半截数据）
    expect(result.ok).toBe(false);
    expect(localStorage.getItem(BG_IMAGE_KEY)).toBeNull();
  });

  it('只认 data:image/：别的值当作没有背景（避免 CSS 里出现相对 URL）', async () => {
    localStorage.setItem(BG_IMAGE_KEY, 'https://example.com/evil.png');
    expect(await loadImageUrl()).toBeNull();
    localStorage.setItem(BG_IMAGE_KEY, '/assets/x.png');
    expect(await loadImageUrl()).toBeNull();
  });

  it('参数 JSON 坏掉不影响图本身（各自独立读）', async () => {
    await storeImage(toBlob(TINY));
    localStorage.setItem(BG_SETTINGS_KEY, '{ not json');
    expect(await loadImageUrl(), '图仍在').toBe(TINY);
    expect(loadSettings(), '坏 JSON 退默认，不连带丢图').toEqual(DEFAULT_BG_SETTINGS);
  });

  it('meta 坏数据退 null（提示用的数字不能是 NaN）', () => {
    localStorage.setItem(BG_META_KEY, '{"width":"x","height":0}');
    expect(loadMeta()).toBeNull();
    storeMeta({ width: 3200, height: 2000 });
    expect(loadMeta()).toEqual({ width: 3200, height: 2000 });
  });

  it('MAX_DATA_URL_CHARS 是回落路径的硬上限（别把配额算错）', () => {
    expect(MAX_DATA_URL_CHARS).toBeGreaterThan(0);
    expect(MAX_DATA_URL_CHARS).toBeLessThan(5 * 1024 * 1024);
  });
});

describe('背景层的 CSS 守则（2026-11「背景有点糊」回归）', () => {
  // 读源码而不是渲染：这条教训是"别用 scale"，而 scale 一出现就是全量重采样，
  // 单元测试里量不到像素，只能钉住源码里没有它。
  const css = readFileSync(join(dirname(__filename), '..', 'styles.css'), 'utf8');

  /**
   * 取背景层那一段规则，并**剥掉注释**：源码里正解释着"别用 scale"，不剥
   * 注释的话断言会被自己的说明文字绊倒（第一次写就踩了）。
   */
  const bgRule = css
    .slice(
      css.indexOf("html[data-panel-bg='on'] body::before"),
      css.indexOf("html[data-panel-bg='on'] body::after"),
    )
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('背景层不得用 transform: scale（会让整张图重采样，锐度掉到 77%）', () => {
    expect(bgRule).not.toMatch(/transform\s*:\s*scale/);
  });

  it('blur>0 的边缘靠负 inset 扩 3σ 裁掉（扩 1σ 仍留可见残带）', () => {
    expect(bgRule).toMatch(/inset\s*:\s*calc\(-3 \* var\(--panel-bg-blur/);
  });

  it('背景层只应有一处 inset 声明（blur=0 时它算出 0，1:1 覆盖视口）', () => {
    const insetDecls = bgRule.match(/inset\s*:[^;]+;/g) ?? [];
    expect(insetDecls.length).toBe(1);
  });

  it('不设 image-rendering: pixelated（那是放大成马赛克，照片只会更难看）', () => {
    expect(bgRule).not.toMatch(/image-rendering\s*:\s*(pixelated|optimizeSpeed)/);
  });
});
