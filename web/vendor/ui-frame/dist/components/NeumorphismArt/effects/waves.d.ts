import { ArtEffect } from './types';

interface WaveLayer {
    amplitude: number;
    frequency: number;
    speed: number;
    phase: number;
    yRatio: number;
    alpha: number;
}
/** 波浪在某一点的位移：主谐波 + 次级谐波；指针激活时在指针附近隆起 */
export declare function waveY(x: number, base: number, layer: WaveLayer, t: number, pointer?: {
    x: number;
    active: boolean;
}): number;
export declare const wavesEffect: ArtEffect;
export {};
