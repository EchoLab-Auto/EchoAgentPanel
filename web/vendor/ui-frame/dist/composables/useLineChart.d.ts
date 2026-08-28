import { Ref, ComputedRef } from 'vue';
import { ChartMargin, TooltipState, ChartSeries, ChartDataPoint } from './useChart';

export type { ChartSeries, ChartDataPoint, ChartMargin, TooltipState };
export interface UseLineChartOptions {
    containerRef: Ref<HTMLElement | null>;
    series: Ref<ChartSeries[]> | ComputedRef<ChartSeries[]>;
    margin?: ChartMargin;
    curve?: 'linear' | 'smooth' | 'step';
    area?: boolean;
    areaOpacity?: number;
    showPoints?: boolean;
    pointSize?: number;
    lineWidth?: number;
    yMin?: number;
    yMax?: number;
}
export interface LineSeries {
    path: string;
    areaPath?: string;
    color: string;
    name: string;
    seriesIndex: number;
}
export interface ChartPoint {
    cx: number;
    cy: number;
    color: string;
    value: number;
    dataIndex: number;
    seriesIndex: number;
    isFocused: boolean;
}
export declare function useLineChart(options: UseLineChartOptions): {
    lines: ComputedRef<LineSeries[]>;
    points: ComputedRef<ChartPoint[]>;
    xAxisLabels: ComputedRef<string[]>;
    yAxisLabels: ComputedRef<string[]>;
    yAxisTicks: ComputedRef<number[]>;
    gridLines: ComputedRef<number[]>;
    findDataAtPosition: (svgX: number, svgY: number) => TooltipState | null;
    resolvedCurve: ComputedRef<"linear" | "smooth" | "step">;
    resolvedShowPoints: ComputedRef<boolean>;
    resolvedLineWidth: ComputedRef<number>;
    resolvedArea: ComputedRef<boolean>;
    resolvedAreaOpacity: number;
    resolvedPointSize: number;
    containerSize: Ref<{
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    } | {
        width: number;
        height: number;
    }>;
    plotSize: ComputedRef<{
        width: number;
        height: number;
    }>;
    palette: ComputedRef<string[]>;
    tooltip: Ref<{
        visible: boolean;
        x: number;
        y: number;
        content: string;
        dataIndex: number;
        seriesIndex: number;
    }, TooltipState | {
        visible: boolean;
        x: number;
        y: number;
        content: string;
        dataIndex: number;
        seriesIndex: number;
    }>;
    focusedIndex: Ref<number, number>;
    totalDataPoints: ComputedRef<number>;
    setFocusedIndex: (index: number) => void;
    handleChartKeydown: (event: KeyboardEvent) => void;
    reducedMotion: Ref<boolean, boolean>;
    resolvedMargin: ComputedRef<ChartMargin>;
    config: ComputedRef<import('./useConfig').NeumorphismGlobalConfig>;
    resolveProp: <T>(explicit: T | undefined, configValue: T | undefined, defaultValue: T) => T;
    showTooltip: (dataIndex: number, seriesIndex: number, clientX: number, clientY: number) => void;
    hideTooltip: () => void;
    niceTicks: (min: number, max: number, maxTicks?: number) => number[];
    formatValue: (value: number) => string;
};
export type UseLineChartReturn = ReturnType<typeof useLineChart>;
