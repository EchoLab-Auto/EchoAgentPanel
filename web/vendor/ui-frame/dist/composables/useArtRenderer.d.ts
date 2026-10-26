import { Ref } from 'vue';
import { ArtEffectName, ArtMaskName } from '../components/NeumorphismArt/effects';

export interface UseArtRendererOptions {
    /** 目标 canvas 元素 */
    canvas: Ref<HTMLCanvasElement | null>;
    effect: Ref<ArtEffectName>;
    reactive: Ref<boolean>;
    speed: Ref<number>;
    density: Ref<number>;
    /** 自定义配色；undefined 时从主题 token 读取 */
    palette: Ref<string[] | undefined>;
    seed: Ref<number | undefined>;
    /** 图片资源地址（图片类效果使用，如字符画 / 波点） */
    src: Ref<string | undefined>;
    /** 图片蒙版（图片类效果使用）；缺省由效果决定 */
    mask?: Ref<ArtMaskName | undefined>;
    /** 波点蒙版：暗部 / 亮部波点直径（px） */
    dotMin?: Ref<number | undefined>;
    dotMax?: Ref<number | undefined>;
    /** 波点蒙版：网格占用（最大波点直径 / 单元格边长） */
    occupancy?: Ref<number | undefined>;
    /**
     * 指针未激活时的帧率上限（如字符画这类「缓慢呼吸」的低动态效果用 30 即可，
     * 主线程常驻成本减半、观感无差别）。指针交互中不节流（跟手）。
     * 缺省 = 跟随显示器刷新率。
     */
    idleFps?: number;
    /**
     * 滚动期间的帧率上限。**默认不设**——滚动时动画与静止同速，不做任何节流。
     *
     * 实测（独立长列表页 + 400×500@DPR2 的字符画满帧绘制）滚动全程 60fps、零掉帧，
     * 说明画布绘制本身不会拖累滚动；早先「滚动期间停绘 / 降帧」是错的解法，
     * 它把不存在的瓶颈当成理由，代价是动画在滚动中被截断。
     *
     * 只有特别重的自绘效果才需要显式给一个上限；传 `0` 表示滚动期间完全停绘。
     */
    scrollFps?: number;
}
/**
 * NeumorphismArt 的 headless 渲染循环：rAF 驱动 + DPR 适配 + ResizeObserver
 * 尺寸跟踪 + 指针追踪 + 主题切换重读配色。reduced-motion 时只渲染一帧
 * 静态画面，不启动循环。
 *
 * 调度门控（2026-10，修滚动卡顿）：
 * - 视口外停摆（IntersectionObserver）：元素滚出视口即停 rAF，
 *   屏幕外不再消耗 CPU/合成资源；
 * - 滚动：**默认不干预**。画布绘制不是滚动的瓶颈（400×500@DPR2 满帧绘制时
 *   滚动实测 60fps / 零掉帧），所以不再为了「省」而停绘或降帧——那只会让动画
 *   在滚动中卡住。确实需要时可用 `scrollFps` 显式节流。
 * - 空闲降帧（idleFps）：指针未激活时按上限节流。
 */
export declare function useArtRenderer(opts: UseArtRendererOptions): {
    start: () => void;
    stop: () => void;
};
