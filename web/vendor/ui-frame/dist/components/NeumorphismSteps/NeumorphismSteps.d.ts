import { StepItem, StepStatus } from '../../composables/useSteps';

export type { StepItem, StepStatus };
/** 档位别名（字符串通道）。数字为一等公民，档位仅兼容保留 */
export type StepsSize = 'small' | 'medium' | 'large';
export interface NeumorphismStepsProps {
    /** Step definitions. */
    steps?: StepItem[];
    /** 0-based index of the current step (v-model). */
    current?: number;
    /** Layout direction. */
    direction?: 'horizontal' | 'vertical';
    /**
     * 尺寸——px 序号圆直径（数字，主几何量），或三档预设名。
     *
     * 数字即「序号圆直径」：序号字号按三锚点（28 / 36 / 48）分段线性插值，
     * 所以 `:size="36"` 与 `size="medium"` 逐像素相同。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | StepsSize;
    /** When true, title and description are centered below the step circle. */
    center?: boolean;
}
declare function __VLS_template(): {
    empty?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismStepsProps>, {
    center: undefined;
    steps: () => never[];
    current: number;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:current": (value: number) => void;
    change: (value: number) => void;
    stepClick: (step: StepItem) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismStepsProps>, {
    center: undefined;
    steps: () => never[];
    current: number;
}>>> & Readonly<{
    onChange?: ((value: number) => any) | undefined;
    "onUpdate:current"?: ((value: number) => any) | undefined;
    onStepClick?: ((step: StepItem) => any) | undefined;
}>, {
    steps: StepItem[];
    center: boolean;
    current: number;
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
