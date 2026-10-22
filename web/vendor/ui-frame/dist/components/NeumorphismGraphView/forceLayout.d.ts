import { GraphLink, GraphNode } from './types';

/**
 * 轻量力导向布局（无第三方依赖）。
 *
 * 每次 `tick()` 叠加三类力：
 *   1. 节点两两排斥——`repulsion / d²`，让节点散开且不互相压叠；
 *   2. 连线弹簧——`(d - linkDistance) × spring × weight`，把关联节点拉回理想边长；
 *   3. 向心引力——`-position × gravity`，防止孤立子图无限漂移。
 *
 * 三类力统一乘「退火系数 alpha」：alpha 从 1 起按 `alphaDecay` 指数衰减到
 * `alphaMin` 以下判定静止（同 d3-force 的做法）。相比固定阻尼，"先猛后缓"
 * 的能量曲线能让图在几秒内铺开并稳稳停住，而不是长久微微抖动；速度另按
 * `velocityDecay` 逐帧衰减并钳制上限。静止后调用方可停掉 requestAnimationFrame
 * ——不动的图不再耗电。
 */
export interface SimNode {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** 被钉住的节点不参与位移（拖拽中 / 数据里 fixed: true） */
    fixed: boolean;
    /** 渲染半径（随度数增大） */
    radius: number;
    /** 连线条数——用于按连接度放大节点 */
    degree: number;
}
export interface SimLink {
    /** 起点在 `nodes` 数组中的下标 */
    source: number;
    /** 终点在 `nodes` 数组中的下标 */
    target: number;
    weight: number;
}
export interface ForceSettings {
    /** 弹簧静止长度（画布坐标） */
    linkDistance: number;
    /** 排斥强度常数（加速度 × d²） */
    repulsion: number;
    /** 弹簧刚度 */
    spring: number;
    /** 向心引力系数（相对坐标） */
    gravity: number;
    /** 速度逐帧损耗比例（0~1，越大越"黏"） */
    velocityDecay: number;
    /** 单帧速度上限，避免数值爆炸 */
    maxSpeed: number;
    /** 单对节点排斥力上限 */
    maxRepulsionForce: number;
    /** 退火系数逐帧衰减率——alpha 每帧乘 (1 - alphaDecay) 量级地趋向 alphaTarget */
    alphaDecay: number;
    /** 判定静止的 alpha 下限 */
    alphaMin: number;
    /** 退火目标值（通常为 0；拖拽时可临时抬高保持活性） */
    alphaTarget: number;
}
export declare const DEFAULT_FORCE_SETTINGS: ForceSettings;
export interface SetDataOptions {
    /** 基础节点半径 */
    nodeRadius: number;
    /** 是否保留旧节点位置（默认 true；false 时全部按螺旋重新播种） */
    preservePositions?: boolean;
}
export declare class ForceLayout {
    nodes: SimNode[];
    links: SimLink[];
    settings: ForceSettings;
    /** 动能已降到阈值以下——调用方可停止渲染循环 */
    settled: boolean;
    /**
     * 退火系数：1 = 满能量，衰减到 alphaMin 以下即静止。
     * 对外只读——外部只能通过 `wake()` / `reheat()` / `setData()` 影响它，
     * 免得调用方手动改温度破坏"确定性收敛"的前提。
     */
    get alpha(): number;
    private _alpha;
    private indexById;
    constructor(settings?: Partial<ForceSettings>);
    /** 更新力学参数；参数变化会唤醒模拟 */
    setSettings(settings: Partial<ForceSettings>): void;
    /**
     * 用新数据重建模拟世界。
     *
     * 按 `id` 复用旧坐标：数据增删（例如过滤分组）时既有节点留在原位，
     * 只有新节点按黄金角螺旋补位，避免整图重排造成的视觉跳变。
     */
    setData(nodes: readonly GraphNode[], links: readonly GraphLink[], options: SetDataOptions): void;
    /** 相邻节点 id 集合（含自身，便于"高亮自身 + 邻居"直接查表） */
    neighborsOf(id: string): Set<string>;
    getNode(id: string): SimNode | undefined;
    /**
     * 钉住某个节点（拖拽期间临时固定）。
     *
     * 只改坐标与固定标记、不做速度扰动——拖拽每帧都会调用它，
     * 若顺手 reheat 会让其余节点跟着抖动。
     */
    pin(id: string, x: number, y: number): void;
    /** 解除钉住并交还给模拟 */
    release(id: string): void;
    /**
     * 重新唤醒已静止的模拟（不改变既有速度）。
     *
     * `alpha` 抬到给定值而不重置为 1——交互（拖拽、改参数）只需局部舒展，
     * 满能量会让整图重新洗牌。
     */
    wake(alpha?: number): void;
    /** 给所有可动节点一点确定性的扰动，让已静止的图重新舒展 */
    reheat(strength?: number): void;
    /** 预先跑若干帧，挂载时直接呈现基本成形的布局 */
    warmup(ticks: number): void;
    /** 推进一帧；返回是否仍在运动（已静止时直接返回，不再积分产生漂移） */
    tick(): boolean;
}
