import { AlertType } from '../../composables/useAlert';

export type { AlertType };
export type AlertSize = 'small' | 'medium' | 'large';
export interface NeumorphismAlertProps {
    type?: AlertType;
    title?: string;
    message?: string;
    closable?: boolean;
    duration?: number;
    icon?: boolean;
    bordered?: boolean;
    /**
     * 尺寸——px 正文字号（数字，主几何量），或三档预设名。
     *
     * 数字即「正文字号」：标题字号与四周内距按三锚点（12 / 13 / 14）分段线性插值，
     * 所以 `:size="13"` 与 `size="medium"` 逐像素相同，`:size="12.5"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | AlertSize;
    /** Accessible label for the close button */
    closeLabel?: string;
}
declare function __VLS_template(): {
    icon?(_: {}): any;
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismAlertProps>, {
    bordered: undefined;
    closable: undefined;
    icon: undefined;
    title: string;
    message: string;
    closeLabel: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    close: () => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismAlertProps>, {
    bordered: undefined;
    closable: undefined;
    icon: undefined;
    title: string;
    message: string;
    closeLabel: string;
}>>> & Readonly<{
    onClose?: (() => any) | undefined;
}>, {
    message: string;
    title: string;
    closable: boolean;
    icon: boolean;
    bordered: boolean;
    closeLabel: string;
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
