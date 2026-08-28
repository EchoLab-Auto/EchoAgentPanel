import { Ref } from 'vue';

export interface SegmentedOption {
    label: string;
    value: string | number;
    disabled?: boolean;
}
export interface UseSegmentedOptions {
    /** 当前选中值（v-model 绑定引用） */
    modelValue: Ref<string | number | undefined>;
    /** 可选项列表 */
    options: Ref<SegmentedOption[]>;
    /** 整体禁用 */
    disabled?: Ref<boolean>;
    /** 选中变化回调 */
    onChange?: (value: string | number) => void;
}
export interface UseSegmentedReturn {
    /** 某项是否选中 */
    isActive: (option: SegmentedOption) => boolean;
    /** 某项是否禁用（整体禁用或自身禁用） */
    isItemDisabled: (option: SegmentedOption) => boolean;
    /** 选中某项（禁用项忽略）；同步 roving 焦点索引 */
    select: (option: SegmentedOption) => void;
    /** roving tabindex：当前可聚焦项索引 */
    focusIndex: Ref<number>;
    /** 某项的 tabindex（0 可聚焦，-1 不可） */
    tabindexFor: (index: number) => 0 | -1;
    /** 方向键 / Home / End 导航并选中（ARIA radiogroup 模式） */
    handleKeydown: (event: KeyboardEvent) => void;
}
/**
 * Headless 分段选择器 —— 单选语义 + roving tabindex 键盘导航。
 * 选中逻辑与视觉分离，可搭配任意分段控件 UI 使用。
 *
 * 键盘导航遵循 ARIA radiogroup 模式：focusIndex 初始落在选中项
 * （否则首个可用项），点击与键盘均同步焦点索引；options 收缩时钳制。
 * 组件层负责在 focusIndex 变化后移动真实 DOM 焦点。
 */
export declare function useSegmented(options: UseSegmentedOptions): UseSegmentedReturn;
