export interface ChatFoldProps {
    /** 受控展开态（传入则受控，配合 update:open 使用） */
    open?: boolean;
    /** 非受控初始展开态（默认 false） */
    defaultOpen?: boolean;
    /** 凹陷详情井（默认）或凸起卡片 */
    sunk?: boolean;
    /** 是否有可展开内容；false 时头部渲染为静态行（无箭头、不可点击、无折叠体） */
    expandable?: boolean;
}
export type ChatFoldEmits = {
    (e: 'update:open', value: boolean): void;
    (e: 'toggle', value: boolean): void;
};
declare function __VLS_template(): {
    head?(_: {
        open: boolean;
    }): any;
    actions?(_: {}): any;
    subhead?(_: {}): any;
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatFoldProps>, {
    open: undefined;
    defaultOpen: boolean;
    sunk: boolean;
    expandable: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:open": (value: boolean) => void;
    toggle: (value: boolean) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatFoldProps>, {
    open: undefined;
    defaultOpen: boolean;
    sunk: boolean;
    expandable: boolean;
}>>> & Readonly<{
    onToggle?: ((value: boolean) => any) | undefined;
    "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
    open: boolean;
    defaultOpen: boolean;
    sunk: boolean;
    expandable: boolean;
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
