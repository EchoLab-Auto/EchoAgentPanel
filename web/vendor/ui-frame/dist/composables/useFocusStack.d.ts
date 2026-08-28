/**
 * Shared focus stack for nested modals and drawers.
 *
 * When multiple dialogs are opened (e.g., a modal inside a drawer), each
 * saves the previously focused element. Closing any layer restores focus
 * to the correct element and decrements the scroll-lock counter exactly once.
 *
 * Usage:
 *   const stack = useFocusStack()
 *   stack.push(previousElement)   // on open
 *   stack.pop()                   // on close
 *   stack.destroy()               // on unmount (safety cleanup)
 */
export interface FocusStack {
    push: (el: HTMLElement | null) => void;
    pop: () => HTMLElement | null;
    depth: () => number;
    destroy: () => void;
}
export declare function useFocusStack(): FocusStack;
