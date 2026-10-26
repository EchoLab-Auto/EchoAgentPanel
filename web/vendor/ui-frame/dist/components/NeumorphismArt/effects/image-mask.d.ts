import { ArtEffect } from './types';

/**
 * 图片蒙版效果（`effect: 'ascii'`）。
 *
 * 名字沿用 `ascii` 是因为它最先只有字符画；现在它是「图片 → 蒙版」管线，
 * 具体图案由 `state.mask` 决定（`ascii` / `dots`）。
 */
export declare const imageMaskEffect: ArtEffect;
