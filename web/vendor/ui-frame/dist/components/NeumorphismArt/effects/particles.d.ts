import { ArtEffect } from './types';

/** 两个粒子是否连线（距离阈值内） */
export declare function shouldLink(ax: number, ay: number, bx: number, by: number, threshold: number): boolean;
export declare const particlesEffect: ArtEffect;
