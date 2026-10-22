import { ForceSettings } from './forceLayout';
import { GraphLabelMode, GraphLink, GraphNode } from './types';

export interface NeumorphismGraphViewProps {
    /** 节点数据 */
    nodes?: GraphNode[];
    /** 连线数据（引用节点 id） */
    links?: GraphLink[];
    /** 容器高度（CSS 值或像素数） */
    height?: string | number;
    /** 基础节点半径（画布坐标）；度数越高画得越大 */
    nodeRadius?: number;
    /** 弹簧静止边长——越大图越松散 */
    linkDistance?: number;
    /** 排斥强度——越大节点越分散 */
    repulsion?: number;
    /**
     * 力学参数覆盖（高级）。可调 `spring` / `gravity` / `velocityDecay` /
     * `alphaDecay` / `alphaMin` / `alphaTarget` / `maxSpeed` / `maxRepulsionForce`；
     * `linkDistance` 与 `repulsion` 请优先用同名 prop（显式 prop > 本项 > 内置默认）。
     */
    forceSettings?: Partial<ForceSettings>;
    /** 标签显示策略 */
    showLabels?: GraphLabelMode;
    /** 显示右下角缩放控件 */
    showControls?: boolean;
    /** 显示左下角分组图例 */
    showLegend?: boolean;
    /** 悬停/选中时高亮邻居并淡化其余部分 */
    highlightNeighbors?: boolean;
    /** 允许拖拽节点 */
    draggable?: boolean;
    /** 允许拖拽背景平移 */
    pannable?: boolean;
    /** 允许滚轮/双指缩放 */
    zoomable?: boolean;
    /** 数据变化与首次挂载后自动适应视图 */
    autoFit?: boolean;
    /** 数据刷新时保留既有节点位置（关闭则整图重新播种） */
    preservePositions?: boolean;
    /** 无障碍名称 */
    ariaLabel?: string;
}
declare function fit(): void;
declare function zoomIn(): void;
declare function zoomOut(): void;
declare function focusNode(id: string): void;
/** 重新播种并跑热力学（丢弃既有坐标） */
declare function resetLayout(): void;
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismGraphViewProps>, {
    nodes: () => never[];
    links: () => never[];
    height: string;
    nodeRadius: undefined;
    linkDistance: undefined;
    repulsion: undefined;
    forceSettings: undefined;
    showLabels: undefined;
    showControls: undefined;
    showLegend: boolean;
    highlightNeighbors: undefined;
    draggable: undefined;
    pannable: boolean;
    zoomable: boolean;
    autoFit: boolean;
    preservePositions: boolean;
    ariaLabel: string;
}>>, {
    /** 适应视图：把全部节点装进容器 */
    fit: typeof fit;
    zoomIn: typeof zoomIn;
    zoomOut: typeof zoomOut;
    /** 重新播种 + 重新布局 */
    resetLayout: typeof resetLayout;
    /** 让已静止的布局重新舒展 */
    reheat: (strength?: number) => void;
    /** 把某个节点移到视图中心 */
    focusNode: typeof focusNode;
    getZoom: () => number;
    /** 当前退火系数（1 = 满能量，0 = 已静止）——用于展示动力学进度 */
    getAlpha: () => number;
    /** 当前生效的力学参数（内置默认 + forceSettings + 专用 prop 合并后的结果） */
    getForceSettings: () => ForceSettings | null;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "node-click": (node: GraphNode) => void;
    "node-hover": (node: GraphNode | null) => void;
    "node-dblclick": (node: GraphNode) => void;
    "background-click": () => void;
    "zoom-change": (scale: number) => void;
    "layout-start": () => void;
    "layout-settled": () => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismGraphViewProps>, {
    nodes: () => never[];
    links: () => never[];
    height: string;
    nodeRadius: undefined;
    linkDistance: undefined;
    repulsion: undefined;
    forceSettings: undefined;
    showLabels: undefined;
    showControls: undefined;
    showLegend: boolean;
    highlightNeighbors: undefined;
    draggable: undefined;
    pannable: boolean;
    zoomable: boolean;
    autoFit: boolean;
    preservePositions: boolean;
    ariaLabel: string;
}>>> & Readonly<{
    "onZoom-change"?: ((scale: number) => any) | undefined;
    "onNode-click"?: ((node: GraphNode) => any) | undefined;
    "onNode-hover"?: ((node: GraphNode | null) => any) | undefined;
    "onNode-dblclick"?: ((node: GraphNode) => any) | undefined;
    "onBackground-click"?: (() => any) | undefined;
    "onLayout-start"?: (() => any) | undefined;
    "onLayout-settled"?: (() => any) | undefined;
}>, {
    height: string | number;
    ariaLabel: string;
    showControls: boolean;
    showLegend: boolean;
    linkDistance: number;
    repulsion: number;
    nodes: GraphNode[];
    links: GraphLink[];
    nodeRadius: number;
    forceSettings: Partial<ForceSettings>;
    showLabels: GraphLabelMode;
    highlightNeighbors: boolean;
    draggable: boolean;
    pannable: boolean;
    zoomable: boolean;
    autoFit: boolean;
    preservePositions: boolean;
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
