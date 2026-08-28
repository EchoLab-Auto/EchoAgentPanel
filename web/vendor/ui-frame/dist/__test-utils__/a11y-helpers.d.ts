import { VueWrapper } from '@vue/test-utils';
import { ComponentPublicInstance } from 'vue';

/** 断言元素存在指定的 role 属性 */
export declare function assertRole(element: Element | null, expectedRole: string): void;
/** 断言元素具有 aria-label */
export declare function assertAriaLabel(element: Element | null, expectedLabel: string): void;
/** 断言触发元素通过 aria-controls 指向面板元素 */
export declare function assertAriaControls(trigger: Element | null, panelId: string): void;
/** 断言元素通过 aria-labelledby 引用另一个元素 */
export declare function assertAriaLabelledBy(element: Element | null, labelId: string): void;
/** 断言元素通过 aria-describedby 引用描述元素 */
export declare function assertAriaDescribedBy(element: Element | null, descriptionId: string): void;
/** 断言元素存在 aria-expanded 属性并值为 expected */
export declare function assertAriaExpanded(element: Element | null, expected: 'true' | 'false'): void;
/** 断言元素存在 aria-selected 属性并值为 expected */
export declare function assertAriaSelected(element: Element | null, expected: 'true' | 'false'): void;
/** 断言元素存在 aria-disabled 属性并值为 expected */
export declare function assertAriaDisabled(element: Element | null, expected: 'true' | 'false'): void;
/** 断言元素存在 aria-invalid 属性并值为 expected */
export declare function assertAriaInvalid(element: Element | null, expected: 'true' | 'false'): void;
/** 断言元素存在 aria-hidden 属性并值为 expected */
export declare function assertAriaHidden(element: Element | null, expected: 'true' | 'false'): void;
/** 断言元素具有 aria-atomic 属性 */
export declare function assertAriaAtomic(element: Element | null, expected: 'true' | 'false'): void;
/**
 * 断言组件支持 Enter/Space 键激活的交互模式。
 *
 * @example
 *   await assertKeyboardActivates(wrapper, 'button', () => {
 *     expect(wrapper.emitted('click')).toHaveLength(1)
 *   })
 */
export declare function assertKeyboardActivates(element: Element, key: 'Enter' | ' ', afterAssert: () => void): Promise<void>;
/**
 * 断言焦点在 firstEl 和 lastEl 之间循环（焦点陷阱）。
 *
 * 模拟 Tab/Shift+Tab 按下，验证焦点在指定边界之间循环。
 */
export declare function assertFocusTrap(container: HTMLElement, firstFocusable: HTMLElement, lastFocusable: HTMLElement): Promise<void>;
/**
 * 断言 wrapper 中存在指定 role 的元素（返回该元素用于进一步断言）。
 */
export declare function findElementByRole(wrapper: VueWrapper<ComponentPublicInstance>, role: string): Element | null;
/**
 * 断言标签与输入元素的关联。
 * - input 有 id
 * - label 有 for 指向该 id
 * - 或者 input 有 aria-label / aria-labelledby
 */
export declare function assertLabelAssociation(wrapper: VueWrapper<ComponentPublicInstance>, inputSelector: string, labelSelector?: string): void;
