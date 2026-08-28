import { VueWrapper } from '@vue/test-utils';
import { Component, ComponentPublicInstance } from 'vue';

/**
 * 挂载使用了 `<teleport>` 或 `<transition>` 的组件，确保内容渲染在测试 DOM 中。
 *
 * 本项目中所有 overlay/popup 类组件（Modal, Drawer, Select, Dropdown,
 * Popover, Tooltip, ToastProvider, AutoComplete 等）均依赖 teleport/transition，
 * 使用普通 mount() 会导致内容无法在 test DOM 中找到。
 *
 * 模板（在测试文件中）：
 *   function mountX(props = {}) {
 *     return mountWithoutTeleport(NeumorphismX, { props })
 *   }
 *   afterEach(cleanupDOM)
 */
export declare function mountWithoutTeleport<P = Record<string, unknown>>(component: Component, options?: {
    props?: P;
    slots?: Record<string, string>;
    attrs?: Record<string, string>;
    attachTo?: Element | string;
}): VueWrapper<ComponentPublicInstance>;
/**
 * 清空 document.body，用于使用 attachTo: document.body 的测试的 afterEach。
 *
 * @example
 *   afterEach(cleanupDOM)
 */
export declare function cleanupDOM(): void;
/**
 * 创建 KeyboardEvent 的工厂函数。
 *
 * @example
 *   const ev = createKeyboardEvent('Escape')
 *   const ev = createKeyboardEvent('Tab', { shiftKey: true })
 */
export declare function createKeyboardEvent(key: string, options?: Partial<KeyboardEventInit>): KeyboardEvent;
/**
 * 在 VueWrapper 根元素上派发 keydown 事件。
 *
 * @example
 *   triggerKeydown(wrapper, 'Escape')
 *   triggerKeydown(wrapper, 'Home')
 */
export declare function triggerKeydown(wrapper: VueWrapper<ComponentPublicInstance>, key: string, options?: Partial<KeyboardEventInit>): void;
/**
 * 在指定 DOM 元素上派发 keydown 事件。
 *
 * @example
 *   triggerKeydownOn(document.querySelector('.nm-modal')!, 'Escape')
 */
export declare function triggerKeydownOn(element: Element, key: string, options?: Partial<KeyboardEventInit>): void;
export declare function escapeKey(): KeyboardEvent;
export declare function enterKey(): KeyboardEvent;
export declare function spaceKey(): KeyboardEvent;
export declare function tabKey(shift?: boolean): KeyboardEvent;
export declare function arrowDownKey(): KeyboardEvent;
export declare function arrowUpKey(): KeyboardEvent;
export declare function homeKey(): KeyboardEvent;
export declare function endKey(): KeyboardEvent;
/**
 * 创建 ResizeObserver mock（用于 useVirtualList 等依赖元素尺寸的测试）。
 */
export declare function createResizeObserverMock(): {
    ResizeObserver: {
        new (): {
            observe: import('vitest').Mock<import('@vitest/spy').Procedure>;
            unobserve: import('vitest').Mock<import('@vitest/spy').Procedure>;
            disconnect: import('vitest').Mock<import('@vitest/spy').Procedure>;
        };
    };
    observe: import('vitest').Mock<import('@vitest/spy').Procedure>;
    unobserve: import('vitest').Mock<import('@vitest/spy').Procedure>;
    disconnect: import('vitest').Mock<import('@vitest/spy').Procedure>;
};
/**
 * 创建 IntersectionObserver mock（用于 scroll-spy、懒加载等测试）。
 */
export declare function createIntersectionObserverMock(): {
    IntersectionObserver: {
        new (cb: IntersectionObserverCallback): {
            observe: import('vitest').Mock<import('@vitest/spy').Procedure>;
            unobserve: import('vitest').Mock<import('@vitest/spy').Procedure>;
            disconnect: import('vitest').Mock<import('@vitest/spy').Procedure>;
        };
        /** 手动触发回调，模拟元素进出视口 */
        trigger(entries: Partial<IntersectionObserverEntry>[]): void;
    };
    callback: () => IntersectionObserverCallback | null;
    observe: import('vitest').Mock<import('@vitest/spy').Procedure>;
    unobserve: import('vitest').Mock<import('@vitest/spy').Procedure>;
    disconnect: import('vitest').Mock<import('@vitest/spy').Procedure>;
};
/**
 * 创建 localStorage mock（用于 useTheme 等持久化相关测试）。
 */
export declare function createLocalStorageMock(): {
    getItem: (k: string) => string;
    setItem: (k: string, v: string) => void;
    removeItem: (k: string) => void;
    clear: () => void;
    readonly length: number;
    key: (index: number) => string;
};
/**
 * 创建 matchMedia mock（用于响应主题、设备检测等测试）。
 */
export declare function createMatchMediaMock(matches: boolean): () => {
    matches: boolean;
    media: string;
    onchange: null;
    addListener: import('vitest').Mock<import('@vitest/spy').Procedure>;
    removeListener: import('vitest').Mock<import('@vitest/spy').Procedure>;
    addEventListener: import('vitest').Mock<import('@vitest/spy').Procedure>;
    removeEventListener: import('vitest').Mock<import('@vitest/spy').Procedure>;
    dispatchEvent: import('vitest').Mock<import('@vitest/spy').Procedure>;
};
/**
 * 创建 File 对象的辅助函数（用于 upload 相关测试）。
 */
export declare function createTestFile(name: string, size: number, type: string): File;
