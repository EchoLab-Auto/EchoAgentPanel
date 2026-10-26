import { ArtState } from '../types';
import { MaskGrid } from './types';

/**
 * 图片蒙版的共用部件：采样、栅格适配、呼吸相位、指针热区、上色。
 *
 * 这些逻辑对「每格画什么」无感——字符画与波点共用同一份，避免两套实现
 * 在直方图拉伸、呼吸节奏、指针半径上逐渐跑偏。
 */
/**
 * 亮度量化档数（2026-10 滚动卡顿优化）：同档字符与透明度一致，绘制按档
 * 批量下笔——canvas 状态切换从「逐格 ~4 次（含逐格拼接/解析字体串）」降为
 * 「每档 ~2 次 + 基准字体每帧 1 次」。5600 格栅格 @60fps 的逐帧主线程成本
 * 显著下降。32 档对 10 级字符梯度与连续半径/透明度均为不可感知误差
 * （透明度误差 ≤ 0.7/64，字符与逐格求值至多差一档）。
 */
export declare const LEVELS = 32;
/** 低于该档视为空白（暗部保留背景，不画） */
export declare const LEVEL_BLANK = 2;
/** 呼吸基频（弧度/秒）与相位步长（随位置错开形成流光） */
export declare const BREATH_FREQ = 1.6;
export declare const BREATH_PHASE_STEP = 0.12;
/** 指针热区半径（px） */
export declare const POINTER_DIST = 120;
export declare const POINTER_DIST2: number;
/** 加载图片；失败也 resolve（保持空白背景，不打断渲染循环） */
export declare function loadImage(src: string): Promise<HTMLImageElement | null>;
/**
 * contain 适配：按原图宽高比算栅格行列（不超过画布能容纳的上限），不拉伸。
 * 先按宽度铺满，超高则改按高度铺满。
 */
export declare function fitGrid(imgRatio: number, cellW: number, cellH: number, maxCols: number, maxRows: number): {
    cols: number;
    rows: number;
};
/**
 * 采样亮度：把图片缩到栅格尺寸（离屏 canvas，比例相同故无形变），
 * 逐格取 Rec.601 加权亮度，再按自身 [min, max] 直方图拉伸到 0~1
 * （中间调图片也能用满整个梯度）。
 */
export declare function sampleLuminance(img: HTMLImageElement, cols: number, rows: number): Float32Array | null;
/** 呼吸相位的三角预分解 */
export interface PhaseTrigs {
    /** (col+row)·步长 */
    phase: Float32Array;
    cosPhase: Float32Array;
    sinPhase: Float32Array;
}
/**
 * 预计算每格的呼吸相位，并把 sin/cos 一并存下。
 *
 * 呼吸是 `sin(ω·t + phase)`，逐格算 sin 意味着每帧几千次三角调用。用和角公式
 * 展开成 `sin(ωt)·cos(phase) + cos(ωt)·sin(phase)` 后，每帧只需算一次
 * `sin(ωt)`/`cos(ωt)`，逐格退化为两次乘法一次加法——省掉 99.9% 的三角运算，
 * 且数学上完全等价（Float32 存储带来约 1e-7 的相位误差，肉眼不可见）。
 */
export declare function buildPhaseTrigs(cols: number, rows: number): PhaseTrigs;
/**
 * 呼吸系数：`0.85 + 0.15·sin(ωt + phase)`。
 * `sinT`/`cosT` 是当前帧的 `sin(ωt)`/`cos(ωt)`，逐格只做乘加（见 buildPhaseTrigs）。
 */
export declare function breatheAt(sinT: number, cosT: number, cosPhase: Float32Array, sinPhase: Float32Array, i: number): number;
/** 每列 / 每行的中心坐标（px） */
export declare function buildCenters(grid: MaskGrid): {
    colX: Float32Array;
    rowY: Float32Array;
};
/** 上色：高亮用主色不透明，其余用文字色按亮度分层（两种蒙版共用，观感一致） */
export declare function inkFor(v: number, state: ArtState): {
    style: string;
    alpha: number;
};
