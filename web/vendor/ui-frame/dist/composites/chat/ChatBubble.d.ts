export type ChatBubbleAlign = 'start' | 'end' | 'center';
export type ChatBubbleTone = 'default' | 'primary' | 'plain';
export interface ChatBubbleProps {
    /** 水平对齐：start 居左 / end 居右 / center 居中（默认 start） */
    align?: ChatBubbleAlign;
    /**
     * 色调：default 中性凸起气泡 / primary 主色气泡（用户侧） /
     * plain 无气泡平铺文本（配合 center 出"细线夹文本"系统消息样式）
     */
    tone?: ChatBubbleTone;
    /** 传入则在头部显示悬停浮现的复制按钮 */
    copyText?: string;
}
declare function __VLS_template(): {
    head?(_: {}): any;
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatBubbleProps>, {
    align: string;
    tone: string;
    copyText: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatBubbleProps>, {
    align: string;
    tone: string;
    copyText: string;
}>>> & Readonly<{}>, {
    align: ChatBubbleAlign;
    tone: ChatBubbleTone;
    copyText: string;
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
