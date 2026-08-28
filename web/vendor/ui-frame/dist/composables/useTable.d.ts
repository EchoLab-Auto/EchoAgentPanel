import { Ref, ComputedRef } from 'vue';

export interface TableColumn {
    key: string;
    label: string;
    width?: string | number;
    minWidth?: string | number;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    /** Custom sort function. Return > 0 if a > b. */
    sorter?: (a: unknown, b: unknown) => number;
    filterable?: boolean;
    filters?: {
        text: string;
        value: unknown;
    }[];
    /** Custom filter function. Return true to keep the row. */
    filter?: (rowValue: unknown, filterValue: unknown) => boolean;
}
export type SortDirection = 'ascend' | 'descend' | null;
export interface SortState {
    key: string;
    direction: SortDirection;
}
export type SelectionMode = 'single' | 'multiple';
export interface UseTableOptions {
    data: Ref<Record<string, unknown>[]> | ComputedRef<Record<string, unknown>[]>;
    columns: Ref<TableColumn[]> | ComputedRef<TableColumn[]>;
    rowKey?: Ref<string> | ComputedRef<string>;
    selectable?: Ref<boolean | SelectionMode>;
    selectedKeys?: Ref<string[]>;
    pagination?: {
        enabled: Ref<boolean>;
        pageSize: Ref<number>;
        currentPage: Ref<number>;
    };
}
export interface UseTableReturn {
    /** Columns resolved with defaults */
    resolvedColumns: ComputedRef<TableColumn[]>;
    /** Display data after sort/filter/page */
    displayData: ComputedRef<Record<string, unknown>[]>;
    /** Total count after filter (before pagination) */
    filteredTotal: ComputedRef<number>;
    /** Current sort state */
    sortState: Ref<SortState>;
    /** Active filter values per column key */
    filterState: Ref<Record<string, unknown[]>>;
    /** Toggle sort for a column */
    toggleSort: (key: string) => void;
    /** Set sort explicitly */
    setSort: (key: string, direction: SortDirection) => void;
    /** Apply filters for a column */
    setFilter: (key: string, values: unknown[]) => void;
    /** Clear all filters */
    clearFilters: () => void;
    /** Whether row is selected */
    isSelected: (rowKeyValue: string) => boolean;
    /** Toggle row selection */
    toggleSelect: (rowKeyValue: string) => void;
    /** Select all visible rows */
    selectAll: () => void;
    /** Clear selection */
    clearSelection: () => void;
    /** Selected row keys */
    selectedKeys: Ref<string[]>;
    /** All row keys */
    allKeys: ComputedRef<string[]>;
    /** Whether all visible rows are selected */
    isAllSelected: ComputedRef<boolean>;
    /** Whether some (but not all) visible rows are selected */
    isIndeterminate: ComputedRef<boolean>;
}
/**
 * Headless table — encapsulates sort, filter, selection, and pagination logic.
 * Use with your own UI rendering.
 */
export declare function useTable(opts: UseTableOptions): UseTableReturn;
