import { ChatMessage } from './types';

export interface ChatMessageItemProps {
    /** 消息数据 */
    message: ChatMessage;
    /** Agent 消息正文是否按 Markdown 渲染（用户/系统消息始终纯文本） */
    markdown?: boolean;
    /** 自定义时间格式化（入参为秒级 Unix 时间戳） */
    formatTime?: (time: number) => string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatMessageItemProps>, {
    markdown: undefined;
    formatTime: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatMessageItemProps>, {
    markdown: undefined;
    formatTime: undefined;
}>>> & Readonly<{}>, {
    markdown: boolean;
    formatTime: (time: number) => string;
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
