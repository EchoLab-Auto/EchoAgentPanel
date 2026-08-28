export interface UseCheckableOptions {
    prefix: 'checkbox' | 'radio' | 'switch';
    isChecked: boolean;
    isDisabled: boolean;
    size: 'small' | 'medium' | 'large';
    /** 额外类名（如 indeterminate） */
    extraClasses?: Record<string, boolean>;
}
/**
 * Checkbox/Radio/Switch 共享切换逻辑
 */
export declare function useCheckable(options: () => UseCheckableOptions): {
    inputId: string;
    classList: import('vue').ComputedRef<(string | {
        [x: string]: boolean;
    })[]>;
};
