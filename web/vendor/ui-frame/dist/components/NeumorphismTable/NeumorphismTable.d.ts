import { TableColumn, SortDirection } from '../../composables/useTable';

export type { TableColumn };
export type TableSize = 'small' | 'medium' | 'large';
export interface NeumorphismTableProps {
    data?: Record<string, unknown>[];
    columns?: TableColumn[];
    rowKey?: string;
    selectable?: boolean | 'single' | 'multiple';
    selectedKeys?: string[];
    loading?: boolean;
    emptyText?: string;
    /**
     * 尺寸——px 单元格上下内距（数字，行密度），或三档预设名。
     *
     * 数字即「行密度」：上下内距是主几何量，左右内距与单元格字号按三锚点
     * （8 / 12 / 16）分段线性插值，所以 `:size="12"` 与 `size="medium"` 逐像素
     * 相同，`:size="10"` 落在 small / medium 之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | TableSize;
    striped?: boolean;
    hoverable?: boolean;
    showHeader?: boolean;
}
declare function __VLS_template(): Partial<Record<`cell-${string}`, (_: {
    row: Record<string, unknown>;
    column: TableColumn;
    value: unknown;
    index: number;
}) => any>> & {
    header?(_: {
        column: TableColumn;
    }): any;
    empty?(_: {}): any;
    loading?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTableProps>, {
    data: () => never[];
    columns: () => never[];
    rowKey: string;
    selectable: boolean;
    selectedKeys: () => never[];
    loading: boolean;
    emptyText: string;
    striped: undefined;
    hoverable: undefined;
    showHeader: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:selectedKeys": (value: string[]) => void;
    select: (rowKey: string, row: Record<string, unknown>) => void;
    selectAll: (selected: boolean) => void;
    sort: (key: string, direction: SortDirection) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTableProps>, {
    data: () => never[];
    columns: () => never[];
    rowKey: string;
    selectable: boolean;
    selectedKeys: () => never[];
    loading: boolean;
    emptyText: string;
    striped: undefined;
    hoverable: undefined;
    showHeader: boolean;
}>>> & Readonly<{
    onSelect?: ((rowKey: string, row: Record<string, unknown>) => any) | undefined;
    onSort?: ((key: string, direction: SortDirection) => any) | undefined;
    "onUpdate:selectedKeys"?: ((value: string[]) => any) | undefined;
    onSelectAll?: ((selected: boolean) => any) | undefined;
}>, {
    data: Record<string, unknown>[];
    loading: boolean;
    hoverable: boolean;
    showHeader: boolean;
    selectable: boolean | "single" | "multiple";
    emptyText: string;
    columns: TableColumn[];
    rowKey: string;
    selectedKeys: string[];
    striped: boolean;
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
