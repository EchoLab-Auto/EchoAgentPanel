/**
 * 按钮的视觉预设 —— **玻璃是其中一档，不是独立开关**。
 *
 * 阴影方向只有一条轴：`raised` / `pressed` 定凸凹，玻璃三档定「材质 + 凸凹」。
 * 曾把玻璃做成与 `variant` 正交的 prop，结果是：
 *
 * 1. 能配出自相矛盾的组合（`variant="pressed" glass="raised"` = 凹陷外形 + 凸起阴影）；
 * 2. 那个「正交」本身是假的 —— 玻璃表面会覆盖 `primary` 的底色，所以
 *    `variant="primary" glass="raised"` 实际渲染的是玻璃色而非主色；
 *    「主色玻璃」只能靠改 `--nm-glass-bg` 得到。
 *
 * 因此玻璃只作为 `variant` 的一个取值存在，不再有 `glass` prop。
 */
export type ButtonVariant = 'raised' | 'pressed' | 'primary' | 'glow' | 'glass' | 'glass-raised' | 'glass-pressed';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonShape = 'rounded' | 'pill' | 'circle';
export interface NeumorphismButtonProps {
    /** 视觉预设：`raised` / `pressed` / `primary` / `glow` / 玻璃三档 */
    variant?: ButtonVariant;
    /**
     * 尺寸——px 最小高度（数字，主几何量），或三档预设名。
     *
     * 数字即「最小高度」：字号与内距按三锚点（32 / 44 / 56）分段线性插值，
     * 所以 `:size="32"` 与 `size="small"` 逐像素相同，`:size="40"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | ButtonSize;
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
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismButtonProps>, {
    disabled: boolean;
    loading: boolean;
    type: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    click: (event: MouseEvent) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismButtonProps>, {
    disabled: boolean;
    loading: boolean;
    type: string;
}>>> & Readonly<{
    onClick?: ((event: MouseEvent) => any) | undefined;
}>, {
    type: "button" | "submit" | "reset";
    disabled: boolean;
    loading: boolean;
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
