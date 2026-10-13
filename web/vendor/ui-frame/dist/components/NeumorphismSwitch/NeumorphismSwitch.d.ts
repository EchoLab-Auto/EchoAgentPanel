export type SwitchVariant = 'default' | 'power';
/** @deprecated 旧版尺寸档位（字符串）——保留仅为兼容映射，新代码请用数字（px 高度） */
export type SwitchSize = 'small' | 'medium' | 'large';
export interface NeumorphismSwitchProps {
    /** v-model binding */
    modelValue?: boolean;
    /** Whether the switch is disabled */
    disabled?: boolean;
    /** Active/Checked text label（power 变体为通电侧刻印，可选，不传则不渲染） */
    activeText?: string;
    /** Inactive/Unchecked text label（power 变体为断电侧刻印，可选，不传则不渲染） */
    inactiveText?: string;
    /** Active/Checked color (CSS color value) */
    activeColor?: string;
    /** Inactive/Unchecked color (CSS color value) */
    inactiveColor?: string;
    /**
     * 尺寸——px 高度（连续尺寸）：
     * default 变体驱动轨道高度（默认 30px）；power 变体驱动器件整机等比缩放
     * （设计稿 91u 高，默认 91px）。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）已弃用，仅为兼容
     * 旧版保留：按 small=24 / medium=30 / large=36（px 高度）映射；新代码请传数字。
     */
    size?: number | SwitchSize;
    /** 视觉变体：default（凹陷轨道 + 弹簧滑块）/ power（电力开关，整径扳动圆钮） */
    variant?: SwitchVariant;
}
declare function __VLS_template(): {
    thumb?(_: {
        checked: boolean;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSwitchProps>, {
    modelValue: boolean;
    disabled: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: boolean) => void;
    change: (value: boolean) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSwitchProps>, {
    modelValue: boolean;
    disabled: boolean;
}>>> & Readonly<{
    onChange?: ((value: boolean) => any) | undefined;
    "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
}>, {
    disabled: boolean;
    modelValue: boolean;
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
