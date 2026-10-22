import { GraphView } from './types';

/**
 * 节点图的纯几何与视图变换工具。
 *
 * 全部为无副作用纯函数（无 DOM / 无随机数），因此同一份数据在任何环境下
 * 都得到同一份布局起点——便于快照式单测，也避免每次刷新图形态乱跳。
 */
export interface Point {
    x: number;
    y: number;
}
export interface Size {
    width: number;
    height: number;
}
export interface Bounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
/** 黄金角（≈137.5°）——向日葵种子式螺旋，落位均匀且不重叠 */
export declare const GOLDEN_ANGLE: number;
/**
 * 按索引计算螺旋播种坐标。
 *
 * 省略初始坐标的节点用节点序号落位：同一份数据每次得到完全一样的位置，
 * 且新节点天然排在已有点外围（`r ∝ √i`），不会与既有节点重叠。
 */
export declare function seedPosition(index: number, spacing: number): Point;
/** 计算点集包围盒；空集返回以原点为中心的零尺寸盒 */
export declare function boundsOf(points: readonly Point[], padding?: number): Bounds;
/** 缩放倍率钳制（同时规避 NaN / 0） */
export declare function clampScale(scale: number, min: number, max: number): number;
/**
 * 计算「把包围盒完整装进视口」的变换。
 *
 * `padding` 为屏幕 CSS 像素留白；包围盒退化成点或线时按 1 处理，避免除零。
 */
export declare function fitTransform(bounds: Bounds, viewport: Size, padding?: number, minScale?: number, maxScale?: number): GraphView;
/** 世界坐标 → 屏幕坐标 */
export declare function worldToScreen(point: Point, view: GraphView): Point;
/** 屏幕坐标 → 世界坐标 */
export declare function screenToWorld(point: Point, view: GraphView): Point;
/**
 * 以屏幕上的 `anchor` 为不动点缩放。
 *
 * 滚轮缩放的「朝着鼠标那一点放大」——锚点下的世界坐标缩放前后保持贴住光标。
 */
export declare function zoomAt(view: GraphView, factor: number, anchor: Point, minScale?: number, maxScale?: number): GraphView;
/** 两点距离 */
export declare function distance(a: Point, b: Point): number;
