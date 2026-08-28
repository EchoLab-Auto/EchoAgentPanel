export type ColSpan = number | string;
export type ColOffset = number | string;
export interface NeumorphismColProps {
    /** 栅格占位格数（1-24） */
    span?: ColSpan;
    /** 栅格左侧偏移格数 */
    offset?: ColOffset;
    /** 响应式占位：<576px */
    xs?: ColSpan;
    /** 响应式占位：≥576px */
    sm?: ColSpan;
    /** 响应式占位：≥768px */
    md?: ColSpan;
    /** 响应式占位：≥992px */
    lg?: ColSpan;
    /** 响应式占位：≥1200px */
    xl?: ColSpan;
    /** 响应式占位：≥1400px */
    xxl?: ColSpan;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismColProps>, {
    span: number;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismColProps>, {
    span: number;
}>>> & Readonly<{}>, {
    span: ColSpan;
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
