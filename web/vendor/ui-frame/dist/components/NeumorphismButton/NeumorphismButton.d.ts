export type ButtonVariant = 'raised' | 'pressed' | 'primary' | 'glow' | 'glass' | 'glass-raised';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonShape = 'rounded' | 'pill' | 'circle';
export interface NeumorphismButtonProps {
    /** Button display variant */
    variant?: ButtonVariant;
    /** Button size */
    size?: ButtonSize;
    /** Button corner shape */
    shape?: ButtonShape;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Whether the button is in loading state */
    loading?: boolean;
    /** Whether the button is in a pressed/toggled state (sets aria-pressed) */
    pressed?: boolean;
    /** HTML button type attribute */
    type?: 'button' | 'submit' | 'reset';
    /** Native button form attribute */
    form?: string;
    /** Accessible label for the button */
    ariaLabel?: string;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismButtonProps>, {
    disabled: boolean;
    loading: boolean;
    type: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    click: (event: MouseEvent) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismButtonProps>, {
    disabled: boolean;
    loading: boolean;
    type: string;
}>>> & Readonly<{
    onClick?: ((event: MouseEvent) => any) | undefined;
}>, {
    disabled: boolean;
    type: "button" | "submit" | "reset";
    loading: boolean;
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
