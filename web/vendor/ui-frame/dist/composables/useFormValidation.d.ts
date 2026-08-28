import { LocaleMessages } from '../locales/types';

export interface FormRule {
    required?: boolean;
    message?: string;
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    validator?: (value: unknown) => boolean | string;
    /** @internal Reserved for future per-rule trigger support. Not yet implemented. */
    trigger?: 'change' | 'blur' | 'input';
}
/**
 * 验证单个字段值，返回错误消息（空字符串表示通过）
 */
export declare function validateFieldValue(value: unknown, rules: FormRule[], localeMessages?: Partial<LocaleMessages>): string;
