import { SelectOption } from '../../composables/useSelect';

export type { SelectOption as NeumorphismSelectOption };
export type SelectSize = 'small' | 'medium' | 'large';
export interface NeumorphismSelectProps {
    modelValue?: string | number | (string | number)[];
    options?: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    /**
     * 尺寸——px 最小高度（数字，主几何量），或三档预设名。
     *
     * 数字即「最小高度」：字号与内距按三锚点（36 / 48 / 60）分段线性插值，
     * 所以 `:size="36"` 与 `size="small"` 逐像素相同，`:size="42"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | SelectSize;
    label?: string;
    required?: boolean;
    error?: string | boolean;
    name?: string;
    id?: string;
    clearable?: boolean;
    emptyText?: string;
    clearLabel?: string;
    listLabel?: string;
    /** 多选模式 — modelValue 为数组 */
    multiple?: boolean;
    /** 可搜索 — 触发器内嵌输入框，输入即过滤选项 */
    filterable?: boolean;
    /** 加载状态（远程数据场景） */
    loading?: boolean;
    /** 加载提示文字 */
    loadingText?: string;
    /** 多选标签折叠 — 超出 maxCollapseTags 的部分以 +N 计数展示 */
    collapseTags?: boolean;
    /** 多选折叠前展示的标签数 */
    maxCollapseTags?: number;
    /** 视觉变体：default 新拟态凹陷 / outlined 描边扁平 + 连体下拉 */
    variant?: 'default' | 'outlined';
}
/** 暴露给父组件的焦点方法 */
declare function focus(): void;
declare function blur(): void;
declare function __VLS_template(): {
    value?(_: {
        option: SelectOption | undefined;
    }): any;
    option?(_: {
        key: string | number;
        option: SelectOption;
        selected: boolean;
        index: number;
        select: (option: SelectOption) => void;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSelectProps>, {
    modelValue: string;
    options: () => never[];
    placeholder: string;
    disabled: boolean;
    clearable: boolean;
    emptyText: string;
    clearLabel: string;
    listLabel: string;
    loading: boolean;
    loadingText: string;
    maxCollapseTags: number;
}>>, {
    focus: typeof focus;
    blur: typeof blur;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string | number | (string | number)[] | undefined) => void;
    change: (value: string | number | (string | number)[] | undefined) => void;
    focus: (event: FocusEvent) => void;
    blur: (event: FocusEvent) => void;
    "visible-change": (open: boolean) => void;
    "remove-tag": (value: string | number) => void;
    search: (query: string) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSelectProps>, {
    modelValue: string;
    options: () => never[];
    placeholder: string;
    disabled: boolean;
    clearable: boolean;
    emptyText: string;
    clearLabel: string;
    listLabel: string;
    loading: boolean;
    loadingText: string;
    maxCollapseTags: number;
}>>> & Readonly<{
    onFocus?: ((event: FocusEvent) => any) | undefined;
    onSearch?: ((query: string) => any) | undefined;
    onChange?: ((value: string | number | (string | number)[] | undefined) => any) | undefined;
    onBlur?: ((event: FocusEvent) => any) | undefined;
    "onUpdate:modelValue"?: ((value: string | number | (string | number)[] | undefined) => any) | undefined;
    "onVisible-change"?: ((open: boolean) => any) | undefined;
    "onRemove-tag"?: ((value: string | number) => any) | undefined;
}>, {
    listLabel: string;
    disabled: boolean;
    placeholder: string;
    modelValue: string | number | (string | number)[];
    options: SelectOption[];
    loading: boolean;
    clearable: boolean;
    emptyText: string;
    clearLabel: string;
    loadingText: string;
    maxCollapseTags: number;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, ReturnType<typeof __VLS_template>>;
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
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
