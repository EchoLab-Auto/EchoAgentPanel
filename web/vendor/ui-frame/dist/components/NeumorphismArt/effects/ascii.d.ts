import { ArtEffect } from './types';

/** 字符亮度梯度（从空到密） */
export declare const ASCII_RAMP = " .\u00B7:-=+*#%@";
/** 亮度（0~1）映射到字符 */
export declare function charFor(v: number): string;
/**
 * 字符画：加载图片采样亮度映射为字符栅格；栅格保持原图宽高比
 * 适配画布（contain）并居中，不做拉伸。字符随时间轻微呼吸，
 * reactive 时指针附近的字符提亮放大。
 */
export declare const asciiEffect: ArtEffect;
