import { CollapseItem } from '../../composables/useCollapse';

export type { CollapseItem };
export type CollapseSize = 'small' | 'medium' | 'large';
export interface NeumorphismCollapseProps {
    modelValue?: string[];
    accordion?: boolean;
    items?: CollapseItem[];
    /**
     * 尺寸——px 标题字号（数字，主几何量），或三档预设名。
     *
     * 数字即「标题字号」：标题内距按三锚点（13 / 15 / 16）分段线性插值，
     * 所以 `:size="15"` 与 `size="medium"` 逐像素相同，`:size="14"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | CollapseSize;
}
declare function __VLS_template(): Partial<Record<`header-${string}`, (_: {
    item: CollapseItem;
    active: boolean;
}) => any>> & Partial<Record<string, (_: {}) => any>>;
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCollapseProps>, {
    accordion: undefined;
    modelValue: () => never[];
    items: () => never[];
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string[]) => void;
    change: (value: string[]) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCollapseProps>, {
    accordion: undefined;
    modelValue: () => never[];
    items: () => never[];
}>>> & Readonly<{
    onChange?: ((value: string[]) => any) | undefined;
    "onUpdate:modelValue"?: ((value: string[]) => any) | undefined;
}>, {
    modelValue: string[];
    items: CollapseItem[];
    accordion: boolean;
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
