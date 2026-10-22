import { GlassValue } from '../../utils/glass';

export type ButtonVariant = 'raised' | 'pressed' | 'primary' | 'glow' | 'glass' | 'glass-raised';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonShape = 'rounded' | 'pill' | 'circle';
export interface NeumorphismButtonProps {
    /** Button display variant */
    variant?: ButtonVariant;
    /** Button size */
    size?: ButtonSize;
    /** Button corner shape */
    shape?: ButtonShape;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Whether the button is in loading state */
    loading?: boolean;
    /** Whether the button is in a pressed/toggled state (sets aria-pressed) */
    pressed?: boolean;
    /** HTML button type attribute */
    type?: 'button' | 'submit' | 'reset';
    /** Native button form attribute */
    form?: string;
    /** Accessible label for the button */
    ariaLabel?: string;
    /**
     * 玻璃拟态档位（与 `NeumorphismCard` 同一套命名）：
     *   - `true` / `'float'` — 悬浮磨砂玻璃，hover 抬升（等价旧 `variant="glass"`）
     *   - `'raised'`         — 磨砂玻璃 + 新拟态凸起双阴影（等价旧 `variant="glass-raised"`）
     *   - `'pressed'`        — 磨砂玻璃 + 凹陷内阴影
     *
     * 与 `variant` 正交：玻璃只换「表面材质」，与 `variant` 同时给时玻璃优先。
     * 显式传入时覆盖旧 `variant` 里的玻璃语义。
     */
    glass?: GlassValue;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismButtonProps>, {
    disabled: boolean;
    loading: boolean;
    type: string;
    glass: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    click: (event: MouseEvent) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismButtonProps>, {
    disabled: boolean;
    loading: boolean;
    type: string;
    glass: undefined;
}>>> & Readonly<{
    onClick?: ((event: MouseEvent) => any) | undefined;
}>, {
    type: "button" | "submit" | "reset";
    disabled: boolean;
    loading: boolean;
    glass: GlassValue;
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
