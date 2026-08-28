/** Wait for async DOM updates to settle. */
export declare function flush(): Promise<void>;
/** Simulate a keyboard event on an element. */
export declare function fireKey(el: Element, key: string, opts?: Partial<KeyboardEventInit>): void;
/** Simulate a focus event. */
export declare function fireFocus(el: Element): void;
/** Simulate a blur event. */
export declare function fireBlur(el: Element): void;
/** Simulate a click event. */
export declare function fireClick(el: Element): Promise<void>;
/** Query an element by a CSS selector within a wrapper. */
export declare function query(wrapper: {
    element: Element;
}, selector: string): Element | null;
