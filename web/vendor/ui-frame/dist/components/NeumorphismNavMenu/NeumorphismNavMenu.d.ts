import { MenuItem } from '../../composables/useMenu';

export type { MenuItem as NeumorphismMenuItemProps };
/** 档位别名（字符串通道）。数字为一等公民，档位仅兼容保留 */
export type NavMenuSize = 'small' | 'medium' | 'large';
export interface NeumorphismNavMenuProps {
    /** Navigation menu items */
    items?: MenuItem[];
    /** Default active item key */
    defaultActive?: string;
    /** Layout direction */
    mode?: 'horizontal' | 'vertical';
    /** Whether to show active indicator (bottom border/glow) */
    showIndicator?: boolean;
    /** Theme override */
    theme?: 'light' | 'dark';
    /**
     * 尺寸——px 导航项字号（数字，主几何量），或三档预设名。
     *
     * 数字即「导航项字号」：内距、图标、项间距与指示条高度按三锚点（11 / 14 / 15）
     * 分段线性插值，所以 `:size="14"` 与 `size="medium"` 逐像素相同。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | NavMenuSize;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismNavMenuProps>, {
    showIndicator: undefined;
    items: () => never[];
    defaultActive: undefined;
    theme: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    select: (item: MenuItem) => void;
    "item-click": (item: MenuItem) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismNavMenuProps>, {
    showIndicator: undefined;
    items: () => never[];
    defaultActive: undefined;
    theme: undefined;
}>>> & Readonly<{
    onSelect?: ((item: MenuItem) => any) | undefined;
    "onItem-click"?: ((item: MenuItem) => any) | undefined;
}>, {
    theme: "light" | "dark";
    items: MenuItem[];
    defaultActive: string;
    showIndicator: boolean;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
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
