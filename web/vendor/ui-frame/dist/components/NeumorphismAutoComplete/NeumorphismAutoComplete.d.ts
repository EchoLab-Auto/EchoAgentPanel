import { AutoCompleteOption } from '../../composables/useAutoComplete';

export type { AutoCompleteOption as NeumorphismAutoCompleteOption };
export type AutoCompleteSize = 'small' | 'medium' | 'large';
export interface NeumorphismAutoCompleteProps {
    /** v-model value (the selected option's value) */
    modelValue?: string | number;
    /** Available options for local filtering */
    options?: AutoCompleteOption[];
    /** Placeholder text when input is empty */
    placeholder?: string;
    /** Whether the autocomplete is disabled */
    disabled?: boolean;
    /**
     * 尺寸——px 最小高度（数字，主几何量），或三档预设名。
     *
     * 几何量由内嵌的 `NeumorphismInput` 按三锚点（36 / 48 / 60）分段线性插值，
     * 所以 `:size="36"` 与 `size="small"` 逐像素相同，`:size="42"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | AutoCompleteSize;
    /** Show a clear button when there is a value */
    clearable?: boolean;
    /** External loading state (for async search) */
    loading?: boolean;
    /** Label displayed above the input */
    label?: string;
    /** Debounce delay in ms for async search */
    debounce?: number;
    /** Async search function */
    searchFn?: (query: string) => Promise<AutoCompleteOption[]>;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismAutoCompleteProps>, {
    modelValue: undefined;
    options: () => never[];
    placeholder: string;
    disabled: boolean;
    size: undefined;
    clearable: undefined;
    loading: boolean;
    debounce: number;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string | number | undefined) => void;
    select: (option: AutoCompleteOption) => void;
    search: (query: string) => void;
    focus: (event: FocusEvent) => void;
    blur: (event: FocusEvent) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismAutoCompleteProps>, {
    modelValue: undefined;
    options: () => never[];
    placeholder: string;
    disabled: boolean;
    size: undefined;
    clearable: undefined;
    loading: boolean;
    debounce: number;
}>>> & Readonly<{
    onSelect?: ((option: AutoCompleteOption) => any) | undefined;
    onFocus?: ((event: FocusEvent) => any) | undefined;
    onSearch?: ((query: string) => any) | undefined;
    onBlur?: ((event: FocusEvent) => any) | undefined;
    "onUpdate:modelValue"?: ((value: string | number | undefined) => any) | undefined;
}>, {
    size: number | AutoCompleteSize;
    disabled: boolean;
    placeholder: string;
    modelValue: string | number;
    options: AutoCompleteOption[];
    loading: boolean;
    clearable: boolean;
    debounce: number;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToRuntimeProps<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? {
        type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>>;
    } : {
        type: import('vue').PropType<T[K]>;
        required: true;
    };
};
type __VLS_WithDefaults<P, D> = {
    [K in keyof Pick<P, keyof P>]: K extends keyof D ? __VLS_Prettify<P[K] & {
        default: D[K];
    }> : P[K];
};
type __VLS_Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
