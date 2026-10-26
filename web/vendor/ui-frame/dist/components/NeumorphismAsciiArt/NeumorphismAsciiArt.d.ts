import { ArtMaskName } from '../NeumorphismArt/effects';

/** 图片蒙版：把图片按亮度重绘成什么点阵 */
export type AsciiArtMask = ArtMaskName;
/** @deprecated 旧圆角档位（字符串）——保留仅为兼容映射，新代码请传数字（px） */
export type AsciiArtRadius = 'none' | 'small' | 'medium' | 'large' | 'xl';
export interface NeumorphismAsciiArtProps {
    /** Image source to render as a luminance mask (required) */
    src: string;
    /**
     * 图片蒙版：把图片按亮度重绘成什么点阵。
     * - `ascii`（默认）：字符梯度 ` .·:-=+*#%@`
     * - `dots`：波点（半调网点，直径随亮度连续变化）
     */
    mask?: AsciiArtMask;
    /** 波点蒙版：暗部波点直径（px） */
    dotMin?: number;
    /** 波点蒙版：亮部波点直径（px） */
    dotMax?: number;
    /**
     * 波点蒙版：网格占用——最大波点直径占单元格边长的比例。
     * `1` = 最亮处波点相切；`0.5` = 只占半格（稀疏网格）。栅格步长 = `dotMax / occupancy`。
     */
    occupancy?: number;
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
    /**
     * 容器圆角半径（px，直接就是像素值）。默认 24。
     *
     * @deprecated 字符串档位（`'none' | 'small' | 'medium' | 'large' | 'xl'`）已弃用，
     * 仅按 none=0 / small=8 / medium=16 / large=24 / xl=32（px）兼容映射；新代码请传数字。
     */
    radius?: number | AsciiArtRadius;
    /** Accessible label */
    ariaLabel?: string;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismAsciiArtProps>, {
    mask: string;
    dotMin: number;
    dotMax: number;
    occupancy: number;
    density: number;
    reactive: boolean;
    speed: number;
    radius: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismAsciiArtProps>, {
    mask: string;
    dotMin: number;
    dotMax: number;
    occupancy: number;
    density: number;
    reactive: boolean;
    speed: number;
    radius: undefined;
}>>> & Readonly<{}>, {
    mask: AsciiArtMask;
    reactive: boolean;
    speed: number;
    density: number;
    dotMin: number;
    dotMax: number;
    occupancy: number;
    radius: number | AsciiArtRadius;
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
