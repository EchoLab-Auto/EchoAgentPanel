import { Ref, ComputedRef } from 'vue';
import { ChartMargin, TooltipState, ChartDataPoint } from './useChart';

export type { ChartDataPoint, ChartMargin, TooltipState };
export interface UsePieChartOptions {
    containerRef: Ref<HTMLElement | null>;
    data: Ref<ChartDataPoint[]> | ComputedRef<ChartDataPoint[]>;
    margin?: ChartMargin;
    innerRadius?: number;
    outerRadius?: number;
    padAngle?: number;
    startAngle?: number;
    labelPosition?: 'inside' | 'outside' | 'none';
    roundedCorners?: boolean;
    colorPalette?: string[];
}
export interface PieArc {
    path: string;
    centroidX: number;
    centroidY: number;
    startAngle: number;
    endAngle: number;
    color: string;
    label: string;
    value: number;
    percentage: number;
    index: number;
    isFocused: boolean;
    labelX?: number;
    labelY?: number;
    labelAnchor?: 'start' | 'end';
}
export declare function usePieChart(options: UsePieChartOptions): {
    arcs: ComputedRef<PieArc[]>;
    total: ComputedRef<number>;
    outerRadius: ComputedRef<number>;
    resolvedInnerRadius: ComputedRef<number>;
    resolvedLabelPosition: ComputedRef<"none" | "inside" | "outside">;
    findArcAtPosition: (svgX: number, svgY: number) => PieArc | null;
    effectivePalette: ComputedRef<string[]>;
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
export type UsePieChartReturn = ReturnType<typeof usePieChart>;
