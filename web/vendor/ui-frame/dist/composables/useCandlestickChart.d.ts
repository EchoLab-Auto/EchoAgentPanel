import { Ref, ComputedRef } from 'vue';
import { ChartMargin, TooltipState, OhlcDataPoint } from './useChart';

export type { OhlcDataPoint, ChartMargin, TooltipState };
export interface UseCandlestickChartOptions {
    containerRef: Ref<HTMLElement | null>;
    data: Ref<OhlcDataPoint[]> | ComputedRef<OhlcDataPoint[]>;
    margin?: ChartMargin;
    showVolume?: boolean;
    showMA?: boolean;
    maPeriods?: number[];
    upColor?: string;
    downColor?: string;
    showGrid?: boolean;
    showAxis?: boolean;
}
export interface CandleRect {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    wickX: number;
    wickY1: number;
    wickY2: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    date: string;
    isUp: boolean;
    index: number;
    isFocused: boolean;
}
export interface VolumeBar {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    volume: number;
    index: number;
}
export interface MALine {
    path: string;
    color: string;
    period: number;
    name: string;
}
export declare function useCandlestickChart(options: UseCandlestickChartOptions): {
    candles: ComputedRef<CandleRect[]>;
    volumeBars: ComputedRef<VolumeBar[]>;
    maLines: ComputedRef<MALine[]>;
    xAxisLabels: ComputedRef<{
        label: string;
        x: number;
    }[]>;
    yAxisLabels: ComputedRef<string[]>;
    yAxisTicks: ComputedRef<number[]>;
    volumeYAxisLabels: ComputedRef<string[]>;
    volumeYAxisTicks: ComputedRef<number[]>;
    gridLines: ComputedRef<number[]>;
    priceAreaHeight: ComputedRef<number>;
    volumeAreaHeight: ComputedRef<number>;
    volumeAreaTop: ComputedRef<number>;
    priceMin: ComputedRef<number>;
    priceMax: ComputedRef<number>;
    volumeMax: ComputedRef<number>;
    resolvedUpColor: ComputedRef<string>;
    resolvedDownColor: ComputedRef<string>;
    resolvedShowVolume: ComputedRef<boolean>;
    resolvedShowMA: ComputedRef<boolean>;
    resolvedMaPeriods: ComputedRef<number[]>;
    findDataAtPosition: (svgX: number, svgY: number) => (CandleRect & {
        type: "candle";
    }) | (VolumeBar & {
        type: "volume";
    }) | null;
    priceToY: (price: number) => number;
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
export type UseCandlestickChartReturn = ReturnType<typeof useCandlestickChart>;
