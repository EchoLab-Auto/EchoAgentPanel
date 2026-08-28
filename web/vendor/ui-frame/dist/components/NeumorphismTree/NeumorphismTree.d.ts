import { TreeNodeData } from '../../composables/useTree';

export type { TreeNodeData };
export interface NeumorphismTreeProps {
    data: TreeNodeData[];
    selectedKeys?: string[];
    expandedKeys?: string[];
    searchPlaceholder?: string;
    showSearch?: boolean;
    multiple?: boolean;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTreeProps>, {
    multiple: undefined;
    showSearch: undefined;
    selectedKeys: () => never[];
    expandedKeys: () => never[];
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:selectedKeys": (value: string[]) => void;
    "update:expandedKeys": (value: string[]) => void;
    "node-click": (node: TreeNodeData) => void;
    "node-select": (key: string) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTreeProps>, {
    multiple: undefined;
    showSearch: undefined;
    selectedKeys: () => never[];
    expandedKeys: () => never[];
}>>> & Readonly<{
    "onUpdate:selectedKeys"?: ((value: string[]) => any) | undefined;
    "onUpdate:expandedKeys"?: ((value: string[]) => any) | undefined;
    "onNode-click"?: ((node: TreeNodeData) => any) | undefined;
    "onNode-select"?: ((key: string) => any) | undefined;
}>, {
    multiple: boolean;
    selectedKeys: string[];
    expandedKeys: string[];
    showSearch: boolean;
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
