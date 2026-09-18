export interface ChatTrayProps {
    /** 新内容到达时是否自动吸底（仅当用户本就在底部才跟随） */
    autoScroll?: boolean;
    /** 距底部多少 px 内视为贴底 */
    scrollThreshold?: number;
    /** 内容变化侦听源（如 `() => messages.length`），变化时下一帧重新评估吸底 */
    watchSource?: () => unknown;
    /** "回到底部"按钮的无障碍文本（默认取 locale chatJumpToBottom） */
    jumpLabel?: string;
}
declare function __VLS_template(): {
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatTrayProps>, {
    autoScroll: undefined;
    scrollThreshold: undefined;
    watchSource: undefined;
    jumpLabel: string;
}>>, {
    isNearBottom: import('vue').Ref<boolean, boolean>;
    showJumpButton: import('vue').ComputedRef<boolean>;
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    recheck: () => void;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatTrayProps>, {
    autoScroll: undefined;
    scrollThreshold: undefined;
    watchSource: undefined;
    jumpLabel: string;
}>>> & Readonly<{}>, {
    autoScroll: boolean;
    scrollThreshold: number;
    watchSource: () => unknown;
    jumpLabel: string;
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
