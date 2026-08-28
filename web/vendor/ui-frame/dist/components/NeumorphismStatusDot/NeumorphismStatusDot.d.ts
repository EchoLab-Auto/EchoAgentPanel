export type StatusDotStatus = 'online' | 'offline' | 'busy' | 'connecting';
export type StatusDotSize = 'small' | 'medium' | 'large';
export interface NeumorphismStatusDotProps {
    /** 状态（默认 online） */
    status?: StatusDotStatus;
    size?: StatusDotSize;
    /** 连接中/忙碌时是否呼吸脉冲（默认 true） */
    pulse?: boolean;
    /** 无障碍标签（默认按状态取 locale 文案） */
    label?: string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismStatusDotProps>, {
    status: undefined;
    size: undefined;
    pulse: undefined;
    label: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismStatusDotProps>, {
    status: undefined;
    size: undefined;
    pulse: undefined;
    label: string;
}>>> & Readonly<{}>, {
    pulse: boolean;
    size: StatusDotSize;
    label: string;
    status: StatusDotStatus;
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
