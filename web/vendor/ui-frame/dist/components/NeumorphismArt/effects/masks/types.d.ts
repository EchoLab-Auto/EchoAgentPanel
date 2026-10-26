import { ArtMaskName, ArtState } from '../types';

/**
 * 图片蒙版（mask）的公共契约。
 *
 * NeumorphismAsciiArt 的本质是「把一张图按亮度重绘成某种点阵」：
 * 采样（图片 → 每格亮度）对全部蒙版相同，区别只在**每格画什么**。
 * 字符画是一个蒙版（`ascii`），波点是另一个（`dots`）。
 *
 * 因此蒙版只负责两件事：
 * 1. `cell()` —— 单元格尺寸（px），决定采样栅格的粒度；
 * 2. `draw()` —— 拿着已拉伸的亮度栅格，把整幅蒙版画出来。
 *
 * 采样与适配（contain / 直方图拉伸 / 呼吸 / 指针）由 `image-mask.ts` 统一处理，
 * 蒙版实现不重复这些逻辑。
 */
/** 亮度栅格（采样结果）；字段平铺在效果 data 对象上，便于测试手工构造 */
export interface MaskGrid {
    /** 栅格列 / 行数（按原图宽高比 contain 适配后） */
    cols: number;
    rows: number;
    /** 单元格 CSS 尺寸（px） */
    cellW: number;
    cellH: number;
    /** 居中偏移（px） */
    offsetX: number;
    offsetY: number;
    /** 每格亮度 0~1（已做直方图拉伸） */
    lum: Float32Array;
    /** 采样是否就绪 */
    ready: boolean;
}
export interface ImageMask {
    name: ArtMaskName;
    /** 单元格尺寸（CSS px）——决定采样栅格粒度 */
    cell(state: ArtState): {
        w: number;
        h: number;
    };
    /** 分配蒙版私有缓冲（init 时一次） */
    create(): unknown;
    /** 栅格几何确定/变化后重建派生缓冲 */
    build(grid: MaskGrid, scratch: unknown): void;
    /** 绘制整幅蒙版 */
    draw(ctx: CanvasRenderingContext2D, grid: MaskGrid, state: ArtState, scratch: unknown, t: number): void;
}
