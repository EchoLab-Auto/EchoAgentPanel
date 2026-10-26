/**
 * 字段尺寸：数字 = 主几何量（最小高度）px，字符串 = 兼容档位别名。
 *
 * 数字与档位是两条互斥的渲染路径：数字走 `--sized` 类 + 内联 CSS 变量
 * （见 `utils/controlScale`），档位继续用三档 class，锚点处两者逐像素一致。
 */
export type FieldSize = number | 'small' | 'medium' | 'large';
export interface FormFieldConfig {
    /** 组件 props */
    id?: string;
    size: FieldSize;
    disabled: boolean;
    error?: string | boolean;
    /** generateId 前缀  */
    prefix: 'input' | 'textarea' | 'select' | 'datepicker';
}
/**
 * Input/Textarea/Select 共享表单字段逻辑
 */
export declare function useFormField(config: () => FormFieldConfig): {
    isFocused: import('vue').Ref<boolean, boolean>;
    fieldId: string;
    errorMessage: import('vue').ComputedRef<string>;
    hasError: import('vue').ComputedRef<boolean>;
    baseClassList: (baseClass: string) => import('vue').ComputedRef<(string | {
        [x: string]: boolean;
    })[]>;
    handleFocus: (event: FocusEvent, emit: (e: "focus", ev: FocusEvent) => void) => void;
    handleBlur: (event: FocusEvent, emit: (e: "blur", ev: FocusEvent) => void) => void;
};
