import { GlassVariant } from '../../utils/glass';

export type CardVariant = 'raised' | 'pressed';
export type CardDepth = 'shallow' | 'medium' | 'deep' | 'very-deep';
/**
 * 玻璃拟态档位——与按钮等其它组件共用 `GlassVariant`（见 `@/utils/glass`）。
 *
 * 与 `elevation` 正交：玻璃只替换「表面材质」，台阶高度模型仍由 `elevation` 决定
 * （档位定阴影方向、`|elevation|` 定强度）。
 */
export type CardGlass = GlassVariant;
/**
 * Card elevation — unified step-height model:
 *
 *   "台阶" (step) metaphor:
 *     - 台阶底部 (bottom) = the background surface (0)
 *     - 台阶顶部 (top)    = where the card sits
 *
 *   top > 0  → card sits above the surface (raised / convex shadow)
 *   top < 0  → card sits below the surface (pressed / concave shadow)
 *   top = 0  → flush with the surface (flat)
 *
 *   |top|    → determines shadow intensity (1–4)
 *
 *   Hover temporarily shifts `top`:
 *     bulge  → top += 2  (card pushes further out)
 *     sink   → top -= 2  (card sinks further in)
 */
export interface NeumorphismCardProps {
    /**
     * Elevation (step top) relative to the surface.
     *   positive = raised, negative = pressed, 0 = flush.
     *   Magnitude 1–4 controls shadow intensity.
     */
    elevation?: number;
    /** @deprecated Use `elevation` instead. Positive = raised, negative = pressed. */
    variant?: CardVariant;
    /** @deprecated Use `elevation` magnitude (1–4) instead. */
    depth?: CardDepth;
    /** Border radius level */
    radius?: 'small' | 'medium' | 'large' | 'xl';
    /** Whether the card has no padding */
    noPadding?: boolean;
    /**
     * Hover effect:
     *   - `true` or `'bulge'` — elevation increases (card swells outward)
     *   - `'sink'` — elevation decreases (card sinks inward)
     */
    hoverable?: boolean | 'bulge' | 'sink';
    /**
     * 玻璃拟态：磨砂玻璃 + 背景模糊。
     *   - `true` / `'float'` — 悬浮磨砂玻璃（环境投影 + 亮边；hover 抬升）
     *   - `'raised'`         — 磨砂玻璃上的凸起双阴影，强度跟随 `elevation`
     *   - `'pressed'`        — 磨砂玻璃上的凹陷内阴影，强度跟随 `|elevation|`
     *
     * 需置于有色背景 / 图片之上才能看到半透明与模糊效果。
     */
    glass?: boolean | CardGlass;
}
declare function __VLS_template(): {
    header?(_: {}): any;
    default?(_: {}): any;
    footer?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCardProps>, {
    hoverable: undefined;
    noPadding: boolean;
    glass: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCardProps>, {
    hoverable: undefined;
    noPadding: boolean;
    glass: undefined;
}>>> & Readonly<{}>, {
    glass: boolean | CardGlass;
    noPadding: boolean;
    hoverable: boolean | "bulge" | "sink";
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, ReturnType<typeof __VLS_template>>;
export default _default;
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToRuntimeProps<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? {
        type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>>;
    } : {
        type: import('vue').PropType<T[K]>;
        required: true;
    };
};
type __VLS_WithDefaults<P, D> = {
    [K in keyof Pick<P, keyof P>]: K extends keyof D ? __VLS_Prettify<P[K] & {
        default: D[K];
    }> : P[K];
};
type __VLS_Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
