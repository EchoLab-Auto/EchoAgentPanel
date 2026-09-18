export type SliderSize = 'small' | 'medium' | 'large';
export interface NeumorphismSliderProps {
    /** v-model binding — current slider value */
    modelValue?: number;
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Step increment */
    step?: number;
    /** Whether the slider is disabled */
    disabled?: boolean;
    /** Show a tooltip with current value while dragging */
    showTooltip?: boolean;
    /** Show stop marks on the track */
    showStops?: boolean;
    /** Vertical orientation */
    vertical?: boolean;
    /** Slider size */
    size?: SliderSize;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSliderProps>, {
    showStops: undefined;
    showTooltip: undefined;
    modelValue: number;
    min: number;
    max: number;
    step: number;
    disabled: boolean;
    vertical: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: number) => void;
    change: (value: number) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSliderProps>, {
    showStops: undefined;
    showTooltip: undefined;
    modelValue: number;
    min: number;
    max: number;
    step: number;
    disabled: boolean;
    vertical: boolean;
}>>> & Readonly<{
    onChange?: ((value: number) => any) | undefined;
    "onUpdate:modelValue"?: ((value: number) => any) | undefined;
}>, {
    vertical: boolean;
    step: number;
    disabled: boolean;
    max: number;
    modelValue: number;
    showTooltip: boolean;
    min: number;
    showStops: boolean;
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
