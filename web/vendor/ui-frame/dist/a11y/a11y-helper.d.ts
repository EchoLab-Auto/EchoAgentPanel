import { MountingOptions } from '@vue/test-utils';
import { Component } from 'vue';

/** axe 结果中的单条违规 */
export interface A11yViolation {
    id: string;
    impact: string | null;
    description: string;
    nodes: {
        html: string;
    }[];
}
/**
 * 挂载组件并运行 axe 无障碍扫描，返回违规列表。
 * 组件级测试默认关闭两条需要真实布局/整页上下文的规则：
 * - color-contrast（jsdom 无真实渲染，对比度计算不可信）
 * - region（孤立组件不位于 landmark 内属预期）
 */
export declare function mountAndCheckA11y(component: Component, options?: MountingOptions<Record<string, unknown>>): Promise<A11yViolation[]>;
/** 断言无违规，违规时输出可读详情 */
export declare function expectNoViolations(violations: A11yViolation[]): void;
