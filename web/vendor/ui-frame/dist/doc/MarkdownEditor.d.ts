export interface MarkdownEditorProps {
    /** Markdown 内容 */
    value: string;
    /** 自定义样式类名 */
    className?: string;
    /** 启用自动保存 */
    autoSave?: boolean;
    /** 自动保存间隔（毫秒），默认 30000 */
    autoSaveInterval?: number;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<MarkdownEditorProps>, {
    className: string;
    autoSave: boolean;
    autoSaveInterval: number;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    change: (value: string) => void;
    docLink: (path: string) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<MarkdownEditorProps>, {
    className: string;
    autoSave: boolean;
    autoSaveInterval: number;
}>>> & Readonly<{
    onChange?: ((value: string) => any) | undefined;
    onDocLink?: ((path: string) => any) | undefined;
}>, {
    className: string;
    autoSave: boolean;
    autoSaveInterval: number;
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
