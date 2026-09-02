import { ArtEffect } from './types';

/** 单个像素点的亮度（0~1）：径向波 + 随机相位；指针激活时改为相对指针的距离场 */
export declare function pixelBrightness(x: number, y: number, cx: number, cy: number, phase: number, t: number): number;
export declare const pixelFieldEffect: ArtEffect;
