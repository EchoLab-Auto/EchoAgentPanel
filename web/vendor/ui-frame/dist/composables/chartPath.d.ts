/**
 * Shared SVG smooth-path helpers for chart composables.
 *
 * Used by useLineChart (series lines / areas) and useCandlestickChart (MA
 * lines) so the Catmull-Rom → cubic Bézier smoothing logic isn't duplicated
 * between them.
 */
export interface Vec2 {
    x: number;
    y: number;
}
/**
 * Convert a Catmull-Rom segment (four control points) into a cubic Bézier
 * control-point triplet string (`cp1 cp2 p2`) suitable for an SVG `C` command.
 */
export declare function catmullRomToBezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, tension?: number): string;
/**
 * Build a smooth (Catmull-Rom splined) SVG path through the given points.
 * Handles 0/1/2-point edge cases so callers don't need to pre-guard.
 */
export declare function buildSmoothPath(pts: Vec2[]): string;
