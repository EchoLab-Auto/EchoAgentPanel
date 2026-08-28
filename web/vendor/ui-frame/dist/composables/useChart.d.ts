import { Ref, ComputedRef } from 'vue';

export interface ChartDataPoint {
    label?: string;
    value: number;
    color?: string;
    [key: string]: unknown;
}
/** OHLC (Open/High/Low/Close) data point for candlestick charts */
export interface OhlcDataPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    [key: string]: unknown;
}
export interface ChartSeries {
    name: string;
    data: ChartDataPoint[];
    color?: string;
}
export interface ChartMargin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface TooltipState {
    visible: boolean;
    x: number;
    y: number;
    content: string;
    dataIndex: number;
    seriesIndex: number;
}
export interface UseChartOptions {
    /** Ref to the chart container element */
    containerRef: Ref<HTMLElement | null>;
    /** Data series */
    series: Ref<ChartSeries[]> | ComputedRef<ChartSeries[]>;
    /** Margin around the plot area (default: { top: 24, right: 24, bottom: 40, left: 48 }) */
    margin?: ChartMargin;
}
export declare function useChart(options: UseChartOptions): {
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
    config: ComputedRef<import('../extensions/createComponent').NeumorphismGlobalConfig>;
    resolveProp: <T>(explicit: T | undefined, configValue: T | undefined, defaultValue: T) => T;
    showTooltip: (dataIndex: number, seriesIndex: number, clientX: number, clientY: number) => void;
    hideTooltip: () => void;
    niceTicks: (min: number, max: number, maxTicks?: number) => number[];
    formatValue: (value: number) => string;
};
export type UseChartReturn = ReturnType<typeof useChart>;
