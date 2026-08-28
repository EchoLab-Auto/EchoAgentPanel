import { Ref } from 'vue';

export type LogoMode = 'pulse' | 'liquid' | 'wave' | 'pointer';
export interface UsePixelLogoAnimationOptions {
    /** SVG <g> element that holds the link <line> elements. */
    linksGroupRef: Ref<SVGGElement | null>;
    /** SVG <g> element that holds the pixel <rect> elements. */
    pixelsGroupRef: Ref<SVGGElement | null>;
    /** SVG <g> element that holds the spark <circle> elements. */
    sparksGroupRef: Ref<SVGGElement | null>;
    /** SVG root element used for pointer coordinate mapping. */
    svgRef: Ref<SVGSVGElement | null>;
    /** Initial animation mode. */
    mode?: LogoMode;
    /** Whether to play the intro convergence animation. */
    autoplay?: boolean;
}
export interface UsePixelLogoAnimationReturn {
    /** Current animation mode. */
    mode: Ref<LogoMode>;
    /** Whether the user has requested reduced motion. */
    isReducedMotion: Ref<boolean>;
    /** Switch to a new animation mode. */
    setMode: (value: LogoMode) => void;
    /** Replay the intro convergence animation. */
    replay: () => void;
    /** Handle pointer move events (for pointer mode). */
    handlePointerMove: (event: PointerEvent) => void;
    /** Handle pointer leave events. */
    handlePointerLeave: () => void;
}
export declare function usePixelLogoAnimation(options: UsePixelLogoAnimationOptions): UsePixelLogoAnimationReturn;
export default usePixelLogoAnimation;
