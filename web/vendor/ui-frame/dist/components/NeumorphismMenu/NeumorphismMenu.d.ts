import { MenuItem } from '../../composables/useMenu';

export type { MenuItem as NeumorphismMenuItemProps };
export interface NeumorphismMenuProps {
    /** Menu items (with optional children for submenus) */
    items?: MenuItem[];
    /** Layout direction */
    mode?: 'vertical' | 'horizontal';
    /** Default active (selected) item key */
    defaultActive?: string;
    /** Default expanded submenu keys */
    defaultExpanded?: string[];
    /** Collapsed mode — only icons are shown */
    collapsed?: boolean;
    /** Whether items can be selected (tracked via activeKey) */
    selectable?: boolean;
    /** Theme override */
    theme?: 'light' | 'dark';
    /** Size variant */
    size?: 'small' | 'medium' | 'large';
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismMenuProps>, {
    selectable: undefined;
    items: () => never[];
    defaultActive: undefined;
    defaultExpanded: () => never[];
    collapsed: boolean;
    theme: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    select: (item: MenuItem) => void;
    "item-click": (item: MenuItem) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismMenuProps>, {
    selectable: undefined;
    items: () => never[];
    defaultActive: undefined;
    defaultExpanded: () => never[];
    collapsed: boolean;
    theme: undefined;
}>>> & Readonly<{
    onSelect?: ((item: MenuItem) => any) | undefined;
    "onItem-click"?: ((item: MenuItem) => any) | undefined;
}>, {
    theme: "light" | "dark";
    items: MenuItem[];
    defaultActive: string;
    defaultExpanded: string[];
    collapsed: boolean;
    selectable: boolean;
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
