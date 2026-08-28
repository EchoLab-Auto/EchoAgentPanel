export type CardVariant = 'raised' | 'pressed';
export type CardDepth = 'shallow' | 'medium' | 'deep' | 'very-deep';
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
    /** Enable glass morphism: frosted glass with backdrop blur */
    glass?: boolean;
}
declare function __VLS_template(): {
    header?(_: {}): any;
    default?(_: {}): any;
    footer?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCardProps>, {
    hoverable: undefined;
    noPadding: boolean;
    glass: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCardProps>, {
    hoverable: undefined;
    noPadding: boolean;
    glass: boolean;
}>>> & Readonly<{}>, {
    noPadding: boolean;
    hoverable: boolean | "bulge" | "sink";
    glass: boolean;
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
