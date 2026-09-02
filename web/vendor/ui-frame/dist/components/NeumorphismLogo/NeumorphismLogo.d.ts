import { LogoMode as PixelLogoMode } from '../../composables/usePixelLogoAnimation';

export type LogoMode = PixelLogoMode;
export type LogoSize = 'small' | 'medium' | 'large';
export interface NeumorphismLogoProps {
    /** Animation mode. */
    mode?: LogoMode;
    /** Component size. */
    size?: LogoSize;
    /** SVG width (CSS value or number in px). */
    width?: string | number;
    /** Whether the gooey filter is enabled. */
    goo?: boolean;
    /** Whether to play the intro convergence animation. */
    autoplay?: boolean;
    /** Whether the logo wrapper floats up and down. */
    floating?: boolean;
    /** Accessible label for the animated logo. */
    ariaLabel?: string;
}
declare function onSetMode(value: LogoMode): void;
declare function __VLS_template(): {
    default?(_: {
        mode: PixelLogoMode;
        setMode: typeof onSetMode;
        replay: () => void;
        isReducedMotion: boolean;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismLogoProps>, {
    autoplay: undefined;
    floating: undefined;
    goo: undefined;
    ariaLabel: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:mode": (value: PixelLogoMode) => void;
    "mode-change": (value: PixelLogoMode) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismLogoProps>, {
    autoplay: undefined;
    floating: undefined;
    goo: undefined;
    ariaLabel: string;
}>>> & Readonly<{
    "onUpdate:mode"?: ((value: PixelLogoMode) => any) | undefined;
    "onMode-change"?: ((value: PixelLogoMode) => any) | undefined;
}>, {
    goo: boolean;
    ariaLabel: string;
    floating: boolean;
    autoplay: boolean;
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
