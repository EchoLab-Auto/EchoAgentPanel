import { ArtEffect } from './types';

/**
 * 融合色团：半透明色团缓慢漂移，组件层在 canvas 上叠加
 * `filter: blur + contrast` 产生 gooey 融合效果（无需 SVG filter）。
 */
export declare const gooEffect: ArtEffect;
