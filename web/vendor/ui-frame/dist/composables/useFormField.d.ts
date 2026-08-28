export type FieldSize = 'small' | 'medium' | 'large';
export interface FormFieldConfig {
    /** 组件 props */
    id?: string;
    size: 'small' | 'medium' | 'large';
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
