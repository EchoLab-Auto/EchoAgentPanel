import { InjectionKey, Ref } from 'vue';
import { FormRule } from './useFormValidation';

export interface RadioGroupContext {
    modelValue: Ref<unknown>;
    name: Ref<string>;
    disabled: Ref<boolean>;
    size: Ref<string>;
    setValue: (val: unknown) => void;
}
export interface FormContext {
    model: Record<string, unknown>;
    rules: Record<string, FormRule[]>;
    errors: Record<string, string>;
    labelWidth?: string;
    size?: string;
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
