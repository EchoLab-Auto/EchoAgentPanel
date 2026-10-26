import { GlassVariant } from '../../utils/glass';

export type CardVariant = 'raised' | 'pressed';
export type CardDepth = 'shallow' | 'medium' | 'deep' | 'very-deep';
/**
 * 玻璃拟态档位——与按钮等其它组件共用 `GlassVariant`（见 `@/utils/glass`）。
 *
 * 与 `elevation` 正交：玻璃只替换「表面材质」，台阶高度模型仍由 `elevation` 决定
 * （档位定阴影方向、`|elevation|` 定强度）。
 */
export type CardGlass = GlassVariant;
/**
 * Card elevation — unified step-height model:
 *
 *   "台阶" (step) metaphor:
 *     - 台阶底部 (bottom) = the background surface (0)
 *     - 台阶顶部 (top)    = where the card sits
 *
 *   top > 0  → card sits above the surface (raised / convex shadow)
 *   top < 0  → card sits below the surface (pressed / concave shadow)
 *   top = 0  → flush with the surface (flat)
 *
 *   |top|    → determines shadow intensity (1–4)
 *
 *   Hover temporarily shifts `top`:
 *     bulge  → top += 2  (card pushes further out)
 *     sink   → top -= 2  (card sinks further in)
 */
export interface NeumorphismCardProps {
    /**
     * Elevation (step top) relative to the surface.
     *   positive = raised, negative = pressed, 0 = flush.
     *   Magnitude 1–4 controls shadow intensity.
     */
    elevation?: number;
    /** @deprecated Use `elevation` instead. Positive = raised, negative = pressed. */
    variant?: CardVariant;
    /** @deprecated Use `elevation` magnitude (1–4) instead. */
    depth?: CardDepth;
    /**
     * 圆角半径（px，直接就是像素值）。
     *
     * 例：`0` 直角、`8` 紧凑、`24`（默认）、`40` 胶囊感。
     * 支持全局配置 `card.radius` 级联；组件把它写到 `--nm-card-radius`，样式侧
     * 消费该变量，所以消费方也能用 CSS 覆盖（见 `.nm-card` 规则）。
     */
    radius?: number;
    /** Whether the card has no padding */
    noPadding?: boolean;
    /**
     * Hover effect:
     *   - `true` or `'bulge'` — elevation increases (card swells outward)
     *   - `'sink'` — elevation decreases (card sinks inward)
     */
    hoverable?: boolean | 'bulge' | 'sink';
    /**
     * 玻璃拟态：磨砂玻璃 + 背景模糊。
     *   - `true` / `'float'` — 悬浮磨砂玻璃（环境投影 + 亮边；hover 抬升）
     *   - `'raised'`         — 磨砂玻璃上的凸起双阴影，强度跟随 `elevation`
     *   - `'pressed'`        — 磨砂玻璃上的凹陷内阴影，强度跟随 `|elevation|`
     *
     * 需置于有色背景 / 图片之上才能看到半透明与模糊效果。
     */
    glass?: boolean | CardGlass;
    /**
     * 超椭圆圆角（可选）：`true` = 默认指数 2.5；`number` = 自定义指数。
     *
     * 关闭（`false`，默认）时卡片的角是 CSS `border-radius` 的**圆弧**；
     * 开启后改由 `clip-path: path()` 画超椭圆（连续曲率），曲线与设备屏幕角同族 ——
     * 圆弧贴超椭圆会在 45° 附近错位（实测最优半径仍差 2.3px）。
     *
     * 半径取卡片**当前生效的** `border-radius`（即 `radius` prop / 全局配置 /
     * 消费方 CSS 覆盖之后的值），所以「角形状」与「角大小」互不干扰。
     * 注意：开启后 `border-radius` 会被置 0（clip 与圆角是取交集关系，留着会把
     * 超椭圆又裁回圆角矩形）。
     */
    squircle?: boolean | number;
    /**
     * 自定义轮廓（任意 `clip-path` 值，典型如 `path("…")`）。给了就以它为准，
     * `squircle` 与 `border-radius` 都让位（同样会把圆角置 0）。
     *
     * 用于「角形状无法用等半径超椭圆表达」的场景 —— 例如会话输入区要贴合设备
     * 屏幕角：下角是屏幕超椭圆的**偏移曲线**、上角取剩余高度，四角并不对称，
     * 由消费方用 `sampleCornerOffset()` 算好后传进来。
     */
    clipPath?: string;
}
declare function __VLS_template(): {
    header?(_: {}): any;
    default?(_: {}): any;
    footer?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCardProps>, {
    hoverable: undefined;
    noPadding: boolean;
    glass: undefined;
    squircle: boolean;
    clipPath: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCardProps>, {
    hoverable: undefined;
    noPadding: boolean;
    glass: undefined;
    squircle: boolean;
    clipPath: undefined;
}>>> & Readonly<{}>, {
    glass: boolean | CardGlass;
    clipPath: string;
    noPadding: boolean;
    hoverable: boolean | "bulge" | "sink";
    squircle: boolean | number;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, ReturnType<typeof __VLS_template>>;
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
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
