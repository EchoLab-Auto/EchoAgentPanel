import { ProDocFlowGraph } from './types.js';

export interface DocFlowCanvasProps {
    /** 已解析的流程图（解析职责在调用方：flow-parser / flow-graph） */
    graph: ProDocFlowGraph;
    /** 画布高度（CSS 值） */
    height?: string;
    /** 是否显示点阵网格 */
    showGrid?: boolean;
    /** 是否可拖拽编辑节点位置（松手时触发 nodeMove，由宿主持久化） */
    editable?: boolean;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<DocFlowCanvasProps>, {
    height: string;
    showGrid: boolean;
    editable: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    navigate: (path: string) => void;
    nodeMove: (payload: {
        id: string;
        x: number;
        y: number;
    }) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<DocFlowCanvasProps>, {
    height: string;
    showGrid: boolean;
    editable: boolean;
}>>> & Readonly<{
    onNavigate?: ((path: string) => any) | undefined;
    onNodeMove?: ((payload: {
        id: string;
        x: number;
        y: number;
    }) => any) | undefined;
}>, {
    height: string;
    showGrid: boolean;
    editable: boolean;
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
