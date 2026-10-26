export type StatusDotStatus = 'online' | 'offline' | 'busy' | 'connecting';
/** @deprecated 旧尺寸档位（字符串）——保留仅为兼容映射，新代码请传数字（px 直径） */
export type StatusDotSize = 'small' | 'medium' | 'large';
export interface NeumorphismStatusDotProps {
    /** 状态（默认 online） */
    status?: StatusDotStatus;
    /**
     * 圆点直径（px）。默认 10。几何量就该是数字——档位只能近似表达设计稿上的值。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）已弃用，仅按
     * small=8 / medium=10 / large=12（px）兼容映射；新代码请传数字。
     */
    size?: number | StatusDotSize;
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
    size: number | StatusDotSize;
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
