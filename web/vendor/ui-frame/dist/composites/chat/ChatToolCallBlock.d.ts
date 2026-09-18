import { ChatToolStatus } from './types';

export interface ChatToolCallBlockProps {
    /** 工具名 */
    name: string;
    /** 已摘要化的参数文本 */
    input?: string;
    /** 工具输出 */
    output?: string | null;
    status?: ChatToolStatus;
    /** 已格式化的时间文本 */
    time?: string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatToolCallBlockProps>, {
    input: string;
    output: null;
    status: undefined;
    time: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatToolCallBlockProps>, {
    input: string;
    output: null;
    status: undefined;
    time: string;
}>>> & Readonly<{}>, {
    input: string;
    output: string | null;
    time: string;
    status: ChatToolStatus;
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
