import { ArtEffectName } from './effects';

export type { ArtEffectName };
export interface NeumorphismArtProps {
    /** Experimental effect to render */
    effect?: ArtEffectName;
    /** Pointer interaction (hover disturbance / attraction); auto-disabled on touch & reduced-motion */
    reactive?: boolean;
    /** Playback speed multiplier */
    speed?: number;
    /** Density multiplier (pixel grid / particle count / wave layers / blobs) */
    density?: number;
    /** Custom palette; defaults to theme tokens */
    palette?: string[];
    /** Fixed seed for reproducible patterns */
    seed?: number;
    /** Image source for image-based effects (ascii) */
    src?: string;
    /** Container height (CSS value or px number) */
    height?: string | number;
    /** Accessible label */
    ariaLabel?: string;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismArtProps>, {
    speed: number;
    density: number;
    height: number;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "effect-change": (value: ArtEffectName) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismArtProps>, {
    speed: number;
    density: number;
    height: number;
}>>> & Readonly<{
    "onEffect-change"?: ((value: ArtEffectName) => any) | undefined;
}>, {
    height: string | number;
    speed: number;
    density: number;
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
