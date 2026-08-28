import { ChatMessage } from './types';

export interface ChatMessageListProps {
    /** 消息列表（按时间升序） */
    messages: ChatMessage[];
    /** Agent 消息正文是否按 Markdown 渲染 */
    markdown?: boolean;
    /** 新内容到达时是否自动吸底（仅当用户本就在底部才跟随） */
    autoScroll?: boolean;
    /** 距底部多少 px 内视为贴底 */
    scrollThreshold?: number;
    /** 空消息时的提示文本（默认取 locale chatEmpty） */
    emptyText?: string;
    /** 自定义时间格式化（入参为秒级 Unix 时间戳） */
    formatTime?: (time: number) => string;
}
declare function __VLS_template(): {
    empty?(_: {}): any;
    message?(_: {
        key: string | number;
        message: ChatMessage;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatMessageListProps>, {
    markdown: undefined;
    autoScroll: undefined;
    scrollThreshold: undefined;
    emptyText: string;
    formatTime: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatMessageListProps>, {
    markdown: undefined;
    autoScroll: undefined;
    scrollThreshold: undefined;
    emptyText: string;
    formatTime: undefined;
}>>> & Readonly<{}>, {
    markdown: boolean;
    formatTime: (time: number) => string;
    autoScroll: boolean;
    scrollThreshold: number;
    emptyText: string;
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
