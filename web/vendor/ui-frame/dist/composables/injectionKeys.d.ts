import { InjectionKey, Ref } from 'vue';
import { FormRule } from './useFormValidation';

export interface RadioGroupContext {
    modelValue: Ref<unknown>;
    name: Ref<string>;
    disabled: Ref<boolean>;
    /**
     * 整组尺寸：`number` = 圆点直径 px（连续尺寸），字符串三档为兼容别名。
     *
     * 必须带上 `number`——Group 的尺寸是级联给子 Radio 的，这里若只声明字符串，
     * 数字尺寸会在级联这一跳被类型抹平，子项永远收不到数字。
     */
    size: Ref<number | 'small' | 'medium' | 'large'>;
    setValue: (val: unknown) => void;
}
export interface FormContext {
    model: Record<string, unknown>;
    rules: Record<string, FormRule[]>;
    errors: Record<string, string>;
    labelWidth?: string;
    /** 级联给子字段的尺寸：数字 = 主几何量 px，字符串 = 兼容档位别名 */
    size?: string | number;
    validateField: (name: string) => boolean;
    /** Validate a field only after its first blur (incremental validation mode). */
    validateFieldOnBlur: (name: string) => void;
    registerField: (name: string, validateFn: (value: unknown) => boolean) => void;
    unregisterField: (name: string) => void;
}
export interface RowGutterContext {
    x: Ref<number>;
    y: Ref<number>;
}
export declare const RadioGroupKey: InjectionKey<RadioGroupContext>;
export declare const FormKey: InjectionKey<FormContext>;
export declare const RowGutterKey: InjectionKey<RowGutterContext>;
