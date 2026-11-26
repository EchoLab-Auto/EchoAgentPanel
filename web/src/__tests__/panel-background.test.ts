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
//! 3. **只认 `data:image/`**：别的值塞进 CSS 会被当相对 URL 去请求，表现为
//!    一个静默的 404 + 没有背景。

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  BG_ATTR,
  BG_IMAGE_KEY,
  BG_SETTINGS_KEY,
  DEFAULT_BG_SETTINGS,
  MAX_DATA_URL_CHARS,
  applyBackground,
  clearBackground,
  loadBackground,
  normalizeSettings,
  saveBackground,
  updateBackgroundSettings,
} from '../panel-background';

/** 一个最小的合法"图片"（只用来跑存储/套用，不解码）。 */
const TINY = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

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

describe('背景图：存储与套用', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(BG_ATTR);
  });
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(BG_ATTR);
    document.documentElement.removeAttribute('style');
  });

  it('没有存过 = 没有背景', () => {
    const { image, settings } = loadBackground();
    expect(image).toBeNull();
    expect(settings).toEqual(DEFAULT_BG_SETTINGS);
  });

  it('存 → 读 → 套用：变量与属性都到位', () => {
    const saved = saveBackground(TINY, { fit: 'contain', dim: 0.5, blur: 12 });
    expect(saved.ok).toBe(true);

    const loaded = loadBackground();
    expect(loaded.image).toBe(TINY);
    expect(loaded.settings).toEqual({ fit: 'contain', dim: 0.5, blur: 12 });

    applyBackground(loaded.image, loaded.settings);
    const root = document.documentElement;
    expect(root.getAttribute(BG_ATTR)).toBe('on');
    expect(root.style.getPropertyValue('--panel-bg-image')).toBe(`url("${TINY}")`);
    expect(root.style.getPropertyValue('--panel-bg-size')).toBe('contain');
    expect(root.style.getPropertyValue('--panel-bg-dim')).toBe('0.5');
    expect(root.style.getPropertyValue('--panel-bg-blur')).toBe('12px');
  });

  it('删图 = 零残留（属性与四个变量全部清掉）', () => {
    saveBackground(TINY, { fit: 'cover', dim: 0.4, blur: 8 });
    applyBackground(TINY, { fit: 'cover', dim: 0.4, blur: 8 });

    clearBackground();

    const root = document.documentElement;
    expect(root.hasAttribute(BG_ATTR), 'CSS 全靠这个属性，留着就会继续透明').toBe(false);
    for (const name of [
      '--panel-bg-image',
      '--panel-bg-size',
      '--panel-bg-dim',
      '--panel-bg-blur',
    ]) {
      expect(root.style.getPropertyValue(name), `${name} 应被清掉`).toBe('');
    }
    expect(localStorage.getItem(BG_IMAGE_KEY)).toBeNull();
    expect(loadBackground().image).toBeNull();
  });

  it('只改参数不动图', () => {
    saveBackground(TINY, DEFAULT_BG_SETTINGS);
    const saved = updateBackgroundSettings({ fit: 'contain', dim: 0.2, blur: 4 });
    expect(saved.ok).toBe(true);
    const loaded = loadBackground();
    expect(loaded.image).toBe(TINY);
    expect(loaded.settings.fit).toBe('contain');
  });

  it('超大图在写盘前就被挡住，并给出可读原因', () => {
    const huge = `data:image/png;base64,${'A'.repeat(MAX_DATA_URL_CHARS + 10)}`;
    const saved = saveBackground(huge, DEFAULT_BG_SETTINGS);
    expect(saved.ok).toBe(false);
    if (!saved.ok) expect(saved.error).toMatch(/太大|换一张/);
    expect(localStorage.getItem(BG_IMAGE_KEY), '失败不该留下半截数据').toBeNull();
  });

  it('只认 data:image/：其它值当作没有背景（避免 CSS 里出现相对 URL）', () => {
    localStorage.setItem(BG_IMAGE_KEY, 'https://example.com/evil.png');
    expect(loadBackground().image).toBeNull();
    // 相对路径同理
    localStorage.setItem(BG_IMAGE_KEY, '/assets/x.png');
    expect(loadBackground().image).toBeNull();
  });

  it('参数 JSON 坏掉不影响图本身（各自独立读）', () => {
    localStorage.setItem(BG_IMAGE_KEY, TINY);
    localStorage.setItem(BG_SETTINGS_KEY, '{ not json');
    const loaded = loadBackground();
    expect(loaded.image).toBe(TINY);
    expect(loaded.settings, '坏 JSON 退默认，不连带丢图').toEqual(DEFAULT_BG_SETTINGS);
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

  it('blur=0 时 inset 必须归零（1:1 覆盖视口，一个像素都不重采样）', () => {
    // -3 * 0px = 0px：公式本身就保证这点，这里钉住"没有第二个 inset 覆盖它"
    const insetDecls = bgRule.match(/inset\s*:[^;]+;/g) ?? [];
    expect(insetDecls.length, '背景层只应有一处 inset 声明').toBe(1);
  });
});
