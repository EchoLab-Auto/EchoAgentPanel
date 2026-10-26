export type CheckboxSize = 'small' | 'medium' | 'large';
export interface NeumorphismCheckboxProps {
    modelValue?: boolean;
    disabled?: boolean;
    label?: string;
    /**
     * 尺寸——勾选框边长 px（数字，主几何量），或三档预设名。
     *
     * 数字即「方盒边长」：`--nm-checkbox-sz-*` 由锚点表按三档分段线性插值后
     * 内联下发（见 `utils/controlScale`）——锚点 12 / 14 / 16 依次是
     * `small` / `medium` / `large` 的别名值，`:size="15"` 落在后两档之间。
     * （注意：档位类当前渲染的盒边长是 18 / 24 / 30，与锚点表存在历史差异，
     * 见样式区 `--sized` 注释。）
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | CheckboxSize;
    name?: string;
    id?: string;
    indeterminate?: boolean;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCheckboxProps>, {
    modelValue: boolean;
    disabled: boolean;
    indeterminate: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: boolean) => void;
    change: (value: boolean) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCheckboxProps>, {
    modelValue: boolean;
    disabled: boolean;
    indeterminate: boolean;
}>>> & Readonly<{
    onChange?: ((value: boolean) => any) | undefined;
    "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
}>, {
    disabled: boolean;
    modelValue: boolean;
    indeterminate: boolean;
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
