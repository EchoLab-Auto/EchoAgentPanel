export type AsciiArtRadius = 'none' | 'small' | 'medium' | 'large' | 'xl';
export interface NeumorphismAsciiArtProps {
    /** Image source rendered as ASCII art (required) */
    src: string;
    /** Density multiplier of the character grid */
    density?: number;
    /** Container width (CSS value or px number); default 100% */
    width?: string | number;
    /** Container height (CSS value or px number); omit to auto-fit the image aspect ratio */
    height?: string | number;
    /** Pointer interaction: characters near the pointer brighten and enlarge */
    reactive?: boolean;
    /** Playback speed multiplier of the shimmer */
    speed?: number;
    /** Custom palette; defaults to theme tokens */
    palette?: string[];
    /** Container corner radius */
    radius?: AsciiArtRadius;
    /** Accessible label */
    ariaLabel?: string;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismAsciiArtProps>, {
    density: number;
    reactive: boolean;
    speed: number;
    radius: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismAsciiArtProps>, {
    density: number;
    reactive: boolean;
    speed: number;
    radius: string;
}>>> & Readonly<{}>, {
    reactive: boolean;
    speed: number;
    density: number;
    radius: AsciiArtRadius;
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
