import { TreeNodeData } from '../../composables/useTree';

export interface NeumorphismTreeNodeProps {
    node: TreeNodeData;
    selectedKeys: string[];
    expandedKeys: string[];
    searchText: string;
    focusedKey?: string | null;
    level?: number;
}
declare function handleSlotToggle(event?: Event): void;
declare function handleSelect(): void;
declare function __VLS_template(): {
    "node-label"?(_: {
        node: TreeNodeData;
        selected: boolean;
        expanded: boolean;
        level: number;
        select: typeof handleSelect;
        toggle: typeof handleSlotToggle;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTreeNodeProps>, {
    level: number;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "toggle-expand": (key: string) => void;
    select: (key: string) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTreeNodeProps>, {
    level: number;
}>>> & Readonly<{
    onSelect?: ((key: string) => any) | undefined;
    "onToggle-expand"?: ((key: string) => any) | undefined;
}>, {
    level: number;
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
