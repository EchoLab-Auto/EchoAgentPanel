export type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export interface NeumorphismTagProps {
    closable?: boolean;
    variant?: TagVariant;
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    rounded?: boolean;
    /** Accessible label for the close button */
    closeLabel?: string;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTagProps>, {
    rounded: undefined;
    closable: boolean;
    disabled: boolean;
    closeLabel: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    close: (event: MouseEvent) => void;
    click: (event: MouseEvent | KeyboardEvent) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTagProps>, {
    rounded: undefined;
    closable: boolean;
    disabled: boolean;
    closeLabel: string;
}>>> & Readonly<{
    onClick?: ((event: MouseEvent | KeyboardEvent) => any) | undefined;
    onClose?: ((event: MouseEvent) => any) | undefined;
}>, {
    rounded: boolean;
    closable: boolean;
    closeLabel: string;
    disabled: boolean;
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
