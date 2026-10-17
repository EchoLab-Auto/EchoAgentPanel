import { IconName, IconSize } from '../../icons/registry';

export interface NeumorphismIconProps {
    /** 语义图标名（见 `ICON_NAMES`） */
    name: IconName;
    /** 尺寸：档位（xs/sm/md/lg/xl/2xl/3xl）或数字（须为 12/14/16/18/20/24/32） */
    size?: IconSize | number;
    /** 覆盖线宽（缺省按尺寸档自动；合法值 0.5/1/1.5/2/2.5/3） */
    strokeWidth?: number;
    /** 匀速旋转（加载中） */
    spin?: boolean;
    /** 呼吸脉冲（等待/连接中） */
    pulse?: boolean;
    /** 无障碍标签；留空 = 装饰性图标（`aria-hidden`） */
    label?: string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismIconProps>, {
    size: undefined;
    strokeWidth: undefined;
    spin: boolean;
    pulse: boolean;
    label: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismIconProps>, {
    size: undefined;
    strokeWidth: undefined;
    spin: boolean;
    pulse: boolean;
    label: string;
}>>> & Readonly<{}>, {
    pulse: boolean;
    size: IconSize | number;
    strokeWidth: number;
    spin: boolean;
    label: string;
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
