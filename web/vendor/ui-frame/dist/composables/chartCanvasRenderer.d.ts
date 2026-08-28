/**
 * OffscreenCanvas chart rendering engine.
 *
 * Provides a fallback rendering path for charts that renders to an
 * OffscreenCanvas in a Web Worker, transferring the result bitmap to
 * the main thread. Falls back to in-thread Canvas2D when OffscreenCanvas
 * or Workers are unavailable.
 *
 * Usage:
 *   const renderer = createChartRenderer(canvas, { width: 800, height: 400 })
 *   renderer.renderBarChart(series, options)
 */
export interface ChartRendererOptions {
    width: number;
    height: number;
    /** Use OffscreenCanvas + Worker when available (default: true) */
    useWorker?: boolean;
    /** DPR scaling factor (default: devicePixelRatio) */
    devicePixelRatio?: number;
}
export interface BarSeries {
    data: number[];
    color: string;
    label?: string;
}
export interface CanvasLineSeries {
    data: {
        x: number;
        y: number;
    }[];
    color: string;
    lineWidth?: number;
}
export interface ChartRenderer {
    renderBarChart: (series: BarSeries[], labels?: string[]) => Promise<ImageBitmap | null>;
    renderLineChart: (series: CanvasLineSeries[]) => Promise<ImageBitmap | null>;
    destroy: () => void;
}
/**
 * Create a chart renderer. Automatically selects the best available
 * rendering backend (OffscreenCanvas Worker > Canvas2D in-thread).
 *
 * @param canvas — a <canvas> element (used as fallback; Worker mode ignores it)
 */
export declare function createChartRenderer(canvas: HTMLCanvasElement, options: ChartRendererOptions): ChartRenderer;
