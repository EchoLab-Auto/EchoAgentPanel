export type RadioGroupSize = 'small' | 'medium' | 'large';
export interface NeumorphismRadioGroupProps {
    modelValue?: unknown;
    disabled?: boolean;
    /**
     * 整组尺寸——级联给每个子 `NeumorphismRadio`（子项自身的 size 被覆盖）。
     *
     * 数字 = 圆圈直径 px：Group 只负责把值原样透传，插值交给子 Radio 完成
     * （见 `RADIO_SCALE`），这样单个 Radio 与 Group 走的是同一条数字通道。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留。
     */
    size?: number | RadioGroupSize;
    name?: string;
    direction?: 'horizontal' | 'vertical';
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismRadioGroupProps>, {
    disabled: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: unknown) => void;
    change: (value: unknown) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismRadioGroupProps>, {
    disabled: boolean;
}>>> & Readonly<{
    onChange?: ((value: unknown) => any) | undefined;
    "onUpdate:modelValue"?: ((value: unknown) => any) | undefined;
}>, {
    disabled: boolean;
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
