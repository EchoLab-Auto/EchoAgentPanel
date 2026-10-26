/**
 * 字符画（兼容入口）。
 *
 * 实现已并入「图片蒙版」管线：`ascii` 只是 `ART_MASKS` 里的一种蒙版，
 * 与波点共用采样、适配、呼吸与指针逻辑。此处保留原导出路径与符号，
 * 既有引用（含单测）无需改动。
 */
export { ASCII_RAMP, CHAR_RATIO, asciiMask, charFor } from './masks/ascii-mask';
export { imageMaskEffect as asciiEffect } from './image-mask';
