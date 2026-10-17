import { Ref } from 'vue';
import { ArtEffectName } from '../components/NeumorphismArt/effects';

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
    /** 图片资源地址（图片类效果使用，如字符画） */
    src: Ref<string | undefined>;
    /**
     * 指针未激活时的帧率上限（如字符画这类「缓慢呼吸」的低动态效果用 30 即可，
     * 主线程常驻成本减半、观感无差别）。指针交互中不节流（跟手）。
     * 缺省 = 跟随显示器刷新率。
     */
    idleFps?: number;
}
/**
 * NeumorphismArt 的 headless 渲染循环：rAF 驱动 + DPR 适配 + ResizeObserver
 * 尺寸跟踪 + 指针追踪 + 主题切换重读配色。reduced-motion 时只渲染一帧
 * 静态画面，不启动循环。
 *
 * 调度门控（2026-10，修滚动卡顿）：
 * - 视口外停摆（IntersectionObserver）：元素滚出视口即停 rAF，
 *   屏幕外不再消耗 CPU/合成资源；
 * - 滚动冻结（window capture 监听）：页面或任意祖先滚动容器滚动期间
 *   跳过重绘（上一帧保持可见），停止后回落；
 * - 空闲降帧（idleFps）：指针未激活时按上限节流。
 */
export declare function useArtRenderer(opts: UseArtRendererOptions): {
    start: () => void;
    stop: () => void;
};
