import { ImageMask } from './types';

/** 字符亮度梯度（从空到密） */
export declare const ASCII_RAMP = " .\u00B7:-=+*#%@";
/** 亮度（0~1）映射到字符 */
export declare function charFor(v: number): string;
/** 等宽字体字符的宽高比修正（字符高约为宽的 1.15 倍） */
export declare const CHAR_RATIO = 1.15;
/**
 * 字符画蒙版：亮度 → 字符梯度（` .·:-=+*#%@`）。
 *
 * 渲染分三段：按亮度分档归位 → 按档批量下笔 → 指针热区逐格放大。
 * pass 1 完全不含 canvas 调用；状态切换从「逐格」降为「每档」。
 */
export declare const asciiMask: ImageMask;
