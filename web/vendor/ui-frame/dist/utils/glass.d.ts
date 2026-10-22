/**
 * 玻璃拟态（glass morphism）的共享档位定义与归一化。
 *
 * 一致性约定：**所有组件用同一套档位名**，避免出现 `glass` / `glass-raised`
 * 这类各组件自造的别名。
 *
 * | 档位      | 阴影                                       | 语义                     |
 * | --------- | ------------------------------------------ | ------------------------ |
 * | `float`   | 环境投影（浮层感），不参与台阶高度          | 悬浮磨砂玻璃             |
 * | `raised`  | 新拟态凸起双阴影                            | 磨砂玻璃上的凸起         |
 * | `pressed` | 新拟态凹陷内阴影                            | 磨砂玻璃上的凹槽         |
 *
 * `true` 是 `'float'` 的简写（历史布尔写法的等价形），`false` / `undefined`
 * 表示不启用玻璃。
 */
/** 玻璃档位 */
export type GlassVariant = 'float' | 'raised' | 'pressed';
/** 组件 prop 接受的玻璃取值：布尔开关或显式档位 */
export type GlassValue = boolean | GlassVariant;
/** 全部档位（顺序即由轻到重，供示例与控制台遍历） */
export declare const GLASS_VARIANTS: readonly ["float", "raised", "pressed"];
/**
 * 归一化玻璃取值。
 *
 * @param value 组件 prop 或全局配置里的原始值
 * @returns 生效档位；未启用时返回 `false`
 *
 * @example
 * normalizeGlass(true)        // 'float'
 * normalizeGlass('pressed')   // 'pressed'
 * normalizeGlass(false)       // false
 * normalizeGlass(undefined)   // false
 */
export declare function normalizeGlass(value: GlassValue | undefined | null): GlassVariant | false;
/**
 * 生成玻璃类名：表面类 + 档位类。
 *
 * 表面类承载「材质」（半透明底 / 模糊 / 高光边），档位类承载「阴影方向」——
 * 拆开是为了让档位规则能以双类选择器（`.x--glass.x--glass-raised`）压过
 * 基础变体规则，不依赖样式表里的书写顺序。
 *
 * @param classPrefix 组件的 BEM 前缀，例如 `nm-button` / `nm-card`
 * @param variant     `normalizeGlass()` 的结果
 *
 * @example
 * glassClassNames('nm-button', 'raised') // ['nm-button--glass', 'nm-button--glass-raised']
 * glassClassNames('nm-button', false)    // []
 */
export declare function glassClassNames(classPrefix: string, variant: GlassVariant | false): string[];
