import { MenuItem } from '../../composables/useMenu';

export type { MenuItem as NeumorphismMenuItemProps };
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
    /** Size variant */
    size?: 'small' | 'medium' | 'large';
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
