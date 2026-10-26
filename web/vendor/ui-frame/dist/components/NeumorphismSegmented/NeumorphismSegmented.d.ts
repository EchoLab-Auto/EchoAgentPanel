import { SegmentedOption } from '../../composables/useSegmented';

export type { SegmentedOption };
export type SegmentedSize = 'small' | 'medium' | 'large';
export interface NeumorphismSegmentedProps {
    /** 选中值（v-model） */
    modelValue?: string | number;
    /** 可选项 */
    options: SegmentedOption[];
    /**
     * 尺寸——单段最小高度 px（数字，主几何量），或三档预设名。
     *
     * 数字即「单段最小高度」：字号与内距按锚点表（26 / 32 / 38）分段线性插值，
     * 尺寸施加在内部 `.nm-segmented__item` 上（变量挂根节点）。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | SegmentedSize;
    disabled?: boolean;
    /** 无障碍组标签（默认取 locale segmentedLabel） */
    ariaLabel?: string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSegmentedProps>, {
    modelValue: undefined;
    size: undefined;
    disabled: undefined;
    ariaLabel: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string | number) => void;
    change: (value: string | number) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSegmentedProps>, {
    modelValue: undefined;
    size: undefined;
    disabled: undefined;
    ariaLabel: string;
}>>> & Readonly<{
    onChange?: ((value: string | number) => any) | undefined;
    "onUpdate:modelValue"?: ((value: string | number) => any) | undefined;
}>, {
    size: number | SegmentedSize;
    disabled: boolean;
    ariaLabel: string;
    modelValue: string | number;
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
