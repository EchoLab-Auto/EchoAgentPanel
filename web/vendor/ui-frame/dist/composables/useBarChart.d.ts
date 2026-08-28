import { Ref, ComputedRef } from 'vue';
import { ChartMargin, TooltipState, ChartSeries, ChartDataPoint } from './useChart';

export type { ChartSeries, ChartDataPoint, ChartMargin, TooltipState };
export interface UseBarChartOptions {
    containerRef: Ref<HTMLElement | null>;
    series: Ref<ChartSeries[]> | ComputedRef<ChartSeries[]>;
    margin?: ChartMargin;
    orientation?: 'vertical' | 'horizontal';
    barGap?: number;
    stacked?: boolean;
    yMin?: number;
    yMax?: number;
}
export interface BarRect {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    label: string;
    value: number;
    dataIndex: number;
    seriesIndex: number;
    isFocused: boolean;
}
export declare function useBarChart(options: UseBarChartOptions): {
    bars: ComputedRef<BarRect[]>;
    xAxisLabels: ComputedRef<string[]>;
    yAxisLabels: ComputedRef<string[]>;
    yAxisTicks: ComputedRef<number[]>;
    gridLines: ComputedRef<number[]>;
    findDataAtPosition: (svgX: number, svgY: number) => TooltipState | null;
    resolvedOrientation: ComputedRef<"horizontal" | "vertical">;
    resolvedStacked: ComputedRef<boolean>;
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
export type UseBarChartReturn = ReturnType<typeof useBarChart>;
