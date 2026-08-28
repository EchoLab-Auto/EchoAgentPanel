import { Ref, ComputedRef } from 'vue';

export interface ChartInteractionSeries {
    name: string;
    color?: string;
    data: {
        value: number;
    }[];
}
export interface ChartTooltipRow {
    name: string;
    value: number;
    color: string;
}
export interface ChartTooltipState {
    visible: boolean;
    x: number;
    y: number;
    content: string;
    dataIndex: number;
    seriesIndex: number;
}
export interface UseChartInteractionOptions {
    /** 图表容器（读取 rect 定位 tooltip） */
    containerRef: Ref<HTMLElement | null>;
    /** 是否启用交互（通常为 resolvedShowTooltip） */
    enabled: Ref<boolean>;
    /** 绘图区左边距（坐标换算） */
    marginLeft: ComputedRef<number>;
    /** 绘图区宽度（越界判定） */
    plotWidth: ComputedRef<number>;
    /** 数据点 x 坐标序列（首个系列） */
    dataPointXs: ComputedRef<number[]>;
    /** x 轴标签（tooltip 标题） */
    xAxisLabels: ComputedRef<string[]>;
    /** 系列数据 */
    series: ComputedRef<ChartInteractionSeries[]>;
    /** 调色板（系列色兜底） */
    palette: ComputedRef<string[]>;
    /** 共享 tooltip 状态（来自 useChart） */
    tooltip: Ref<ChartTooltipState>;
    /** 隐藏 tooltip（来自 useChart） */
    hideTooltip: () => void;
}
export interface UseChartInteractionReturn {
    /** 十字线 x 坐标（null = 未悬停） */
    crosshairX: Ref<number | null>;
    /** 最近数据点索引（-1 = 无） */
    nearestIndex: Ref<number>;
    /** 是否悬停于绘图区 */
    isHovering: Ref<boolean>;
    /** 结构化 tooltip 内容（模板插值渲染，杜绝 XSS） */
    tooltipData: Ref<{
        header: string;
        rows: ChartTooltipRow[];
    } | null>;
    /** tooltip 定位样式（相对容器） */
    tooltipStyle: ComputedRef<Record<string, string>>;
    /** 容器 rect 快照（mousemove 时刷新，避免每次 tooltip 更新强制 reflow） */
    containerRect: Ref<{
        left: number;
        top: number;
    }>;
    /** mousemove 处理（rAF 合帧） */
    onBodyMouseMove: (event: MouseEvent) => void;
    /** mouseleave 处理 */
    onBodyMouseLeave: () => void;
}
/**
 * 图表悬停交互（十字线/最近点/tooltip 载荷）—— rAF 合帧的 mousemove
 * 处理、最近索引扫描与结构化 tooltip 构建。组件层只绑定事件与渲染。
 */
export declare function useChartInteraction(opts: UseChartInteractionOptions): UseChartInteractionReturn;
export default useChartInteraction;
