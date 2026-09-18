import { Theme } from '../../composables/useTheme';

export interface NeumorphismThemeToggleProps {
    /** v-model binding: 'light' | 'dark' | 'auto' */
    modelValue?: Theme;
    /** Size variant */
    size?: 'small' | 'medium' | 'large';
    /** Whether to disable auto mode option */
    disableAuto?: boolean;
    /** Whether the toggle is disabled */
    disabled?: boolean;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismThemeToggleProps>, {
    disableAuto: undefined;
    modelValue: string;
    disabled: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: Theme) => void;
    change: (value: Theme) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismThemeToggleProps>, {
    disableAuto: undefined;
    modelValue: string;
    disabled: boolean;
}>>> & Readonly<{
    onChange?: ((value: Theme) => any) | undefined;
    "onUpdate:modelValue"?: ((value: Theme) => any) | undefined;
}>, {
    disabled: boolean;
    modelValue: Theme;
    disableAuto: boolean;
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
