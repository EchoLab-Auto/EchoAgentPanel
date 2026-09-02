/**
 * NeumorphismArt 效果模块的公共类型与工具。
 * 效果实现为「无渲染环境依赖」的纯逻辑：init 初始化实体、render 逐帧绘制，
 * 核心计算保持纯函数，便于脱离 canvas 单测。
 */
export type ArtEffectName = 'pixel-field' | 'particles' | 'waves' | 'goo' | 'ascii';
export interface ArtPointer {
    x: number;
    y: number;
    active: boolean;
}
export interface ArtState {
    /** 画布 CSS 尺寸（px） */
    width: number;
    height: number;
    /** 已解析的配色（来自 palette prop 或主题 token） */
    palette: string[];
    /** 画布背景色（主题 token） */
    bg: string;
    /** 前景/文字色（主题 token，字符画等使用） */
    fg: string;
    /** 图片资源地址（图片类效果使用，如字符画） */
    src?: string;
    /** 密度倍率（像素格数 / 粒子数 / 波浪层数 / 色团数） */
    density: number;
    /** 速度倍率 */
    speed: number;
    /** 是否响应指针 */
    reactive: boolean;
    /** 初始化随机种子（确定性图案） */
    seed: number;
    pointer: ArtPointer;
    /** 效果私有数据（init 写入，render 读取） */
    data: unknown;
}
export interface ArtEffect {
    init(state: ArtState): void;
    /** 异步资源加载（图片等）；渲染循环在 prepare 完成后才启动 */
    prepare?(state: ArtState): Promise<void>;
    render(ctx: CanvasRenderingContext2D, state: ArtState, t: number): void;
}
/** 确定性伪随机数（LCG），固定 seed 可复现同一图案 */
export declare function createRng(seed: number): () => number;
export declare function clamp(v: number, min: number, max: number): number;
