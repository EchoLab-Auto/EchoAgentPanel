import { Ref, ComputedRef } from 'vue';

export interface SelectOption {
    label: string;
    value: string | number;
    disabled?: boolean;
    /** 分组名 — 相同 group 的选项在下拉中归为一组展示 */
    group?: string;
}
export type SelectModelValue = string | number | (string | number)[] | undefined;
export interface SelectGroup {
    /** 分组名；未分组的选项归入空串组 */
    name: string;
    options: SelectOption[];
}
export interface UseSelectOptions {
    /** v-model value（单选为标量，多选为数组） */
    modelValue: Ref<SelectModelValue>;
    /** Available options */
    options: Ref<SelectOption[]> | ComputedRef<SelectOption[]>;
    /** Whether the select is disabled */
    disabled?: Ref<boolean>;
    /** 多选模式 */
    multiple?: Ref<boolean>;
    /** 过滤文本（filterable 模式由组件层写入，composable 据此收窄导航与渲染列表） */
    filterText?: Ref<string>;
}
export interface UseSelectReturn {
    isOpen: Ref<boolean>;
    /** 单选：当前选中项 */
    selectedOption: ComputedRef<SelectOption | undefined>;
    /** 多选：当前选中项数组（单选时为 0/1 个元素的数组） */
    selectedOptions: ComputedRef<SelectOption[]>;
    /** 按 filterText 过滤后的选项（无过滤文本时等于 options） */
    filteredOptions: ComputedRef<SelectOption[]>;
    /** 按 group 字段分组后的视图，保持选项原始顺序 */
    groupedOptions: ComputedRef<SelectGroup[]>;
    /** 多选键盘导航的高亮项 value（单选模式不使用 —— 单选箭头键即时改选中值） */
    activeValue: Ref<string | number | undefined>;
    isSelected: (option: SelectOption) => boolean;
    toggleOpen: () => void;
    close: () => void;
    selectOption: (option: SelectOption) => void;
    /** 多选：从选中集中移除单个值 */
    removeValue: (value: string | number) => void;
    clearValue: (value?: string | number | (string | number)[]) => void;
    handleKeydown: (event: KeyboardEvent) => void;
    handleBlur: (relatedTarget: EventTarget | null, currentTarget: HTMLElement) => void;
}
/**
 * Headless select — encapsulates open/close, keyboard navigation, and
 * option selection logic without any rendering. Use with your own UI.
 *
 * 单选与原生 `<select>` 一致：箭头键即时切换选中值；
 * 多选引入 activeValue 高亮项，Enter/Space 切换选中（即时选中在多选下无语义）。
 */
export declare function useSelect(opts: UseSelectOptions): UseSelectReturn;
