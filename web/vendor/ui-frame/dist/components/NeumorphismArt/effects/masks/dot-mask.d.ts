import { ArtState } from '../types';
import { ImageMask } from './types';

/** 波点直径默认值（px，density=1 时）：暗部 / 亮部 */
export declare const DEFAULT_DOT_MIN = 1;
export declare const DEFAULT_DOT_MAX = 8;
/** 网格占用默认值：0.92 ≈ 最亮处波点几乎相切而不重叠 */
export declare const DEFAULT_OCCUPANCY = 0.92;
export interface DotGeometry {
    /** 单元格边长（px） */
    pitch: number;
    /** 暗部 / 亮部波点半径（px） */
    rMin: number;
    rMax: number;
}
/**
 * 波点蒙版的几何：波点大小与「网格占用」。
 *
 * - `dotMin` / `dotMax` 是波点直径（px）：暗部用 dotMin、亮部用 dotMax，
 *   中间按亮度线性过渡——所以一幅图里波点是**连续变化的大小**；
 * - `occupancy` 是网格占用：最大波点直径占单元格边长的比例，
 *   于是栅格步长 `pitch = dotMax / occupancy`；占用 1 → 最亮处波点相切，
 *   0.5 → 波点只占半格（稀疏网格），越小点越稀；
 * - `density` 是整体精细度倍率，把网格与点径**同比缩放**（占用比不变）。
 */
export declare function dotGeometry(state: ArtState): DotGeometry;
/** 亮度（0~1）→ 波点半径（px） */
export declare function dotRadiusFor(v: number, geom: DotGeometry): number;
/**
 * 波点蒙版：亮度 → 圆点直径（半调网点的数码版）。
 *
 * 与字符画共用采样与呼吸，差异只在「每格画什么」：圆点没有字形，
 * 因此指针热区也能留在同一套分档批处理里（提亮 = 升档 = 变大），
 * 不需要字符画那趟逐格改字号的第三遍。
 */
export declare const dotMask: ImageMask;
