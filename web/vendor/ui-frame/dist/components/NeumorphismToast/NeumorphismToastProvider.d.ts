import { ToastType, ToastPosition, ToastItem, ToastOptions } from '../../composables/useToast';

export type { ToastType, ToastPosition, ToastItem, ToastOptions };
export interface NeumorphismToastProviderProps {
    position?: ToastPosition;
    maxCount?: number;
    closeLabel?: string;
}
declare function __VLS_template(): {
    "toast-item"?(_: {
        key: string;
        toast: ToastItem;
        remove: () => void;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismToastProviderProps>, {
    closeLabel: string;
}>>, {
    addToast: (options: ToastOptions) => string;
    removeToast: (id: string) => void;
    clearAll: () => void;
    toasts: import('vue').Ref<ToastItem[], ToastItem[]>;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismToastProviderProps>, {
    closeLabel: string;
}>>> & Readonly<{}>, {
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
