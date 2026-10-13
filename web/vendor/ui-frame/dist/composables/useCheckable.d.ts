export interface UseCheckableOptions {
    prefix: 'checkbox' | 'radio' | 'switch';
    isChecked: boolean;
    isDisabled: boolean;
    /** 尺寸档位修饰类；省略时不生成尺寸类（几何由组件自身 CSS 变量驱动） */
    size?: 'small' | 'medium' | 'large';
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
