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
}
/**
 * NeumorphismArt 的 headless 渲染循环：rAF 驱动 + DPR 适配 + ResizeObserver
 * 尺寸跟踪 + 指针追踪 + 主题切换重读配色。reduced-motion 时只渲染一帧
 * 静态画面，不启动循环。
 */
export declare function useArtRenderer(opts: UseArtRendererOptions): {
    start: () => void;
    stop: () => void;
};
