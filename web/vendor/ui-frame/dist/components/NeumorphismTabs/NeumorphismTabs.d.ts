import { TabItem } from '../../composables/useTabs';

export type { TabItem };
export type TabsSize = 'small' | 'medium' | 'large';
export interface NeumorphismTabsProps {
    modelValue?: string;
    tabs?: TabItem[];
    position?: 'top' | 'left' | 'right';
    /**
     * 尺寸——px 标签字号（数字，主几何量），或三档预设名。
     *
     * 数字即「标签字号」：标签内距按三锚点（12 / 14 / 16）分段线性插值，
     * 所以 `:size="14"` 与 `size="medium"` 逐像素相同，`:size="15"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | TabsSize;
    navLabel?: string;
}
declare function __VLS_template(): {
    tab?(_: {
        key: string;
        tab: TabItem;
        active: boolean;
        index: number;
        activate: (key: string) => void;
    }): any;
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTabsProps>, {
    modelValue: string;
    tabs: () => never[];
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string) => void;
    change: (value: string) => void;
    tabClick: (tab: TabItem) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTabsProps>, {
    modelValue: string;
    tabs: () => never[];
}>>> & Readonly<{
    onChange?: ((value: string) => any) | undefined;
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onTabClick?: ((tab: TabItem) => any) | undefined;
}>, {
    tabs: TabItem[];
    modelValue: string;
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
