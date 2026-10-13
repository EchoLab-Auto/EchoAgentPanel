export type PixelFontAlign = 'left' | 'center' | 'right';
export interface NeumorphismPixelFontProps {
    /** 要渲染的文本（`\n` 换行；按字符栅格原样保留空白） */
    text: string;
    /** 整数缩放倍率（1 = 11px 设计尺寸；非整数会被取整，位图字体须整数倍缩放才保持像素锐利） */
    scale?: number;
    /** 末尾追加闪烁块光标（reduced-motion 下常亮不闪） */
    cursor?: boolean;
    /** 文本对齐方式 */
    align?: PixelFontAlign;
    /** 无障碍名称；传入时根元素标记为 `role="img"`（内部文本读屏时隐藏） */
    ariaLabel?: string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismPixelFontProps>, {
    scale: number;
    cursor: boolean;
    align: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismPixelFontProps>, {
    scale: number;
    cursor: boolean;
    align: string;
}>>> & Readonly<{}>, {
    align: PixelFontAlign;
    scale: number;
    cursor: boolean;
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
