import { Ref, ComputedRef } from 'vue';

export interface UsePaginationOptions {
    /** v-model current page */
    modelValue: Ref<number>;
    /** Total number of items */
    total: Ref<number> | ComputedRef<number>;
    /** Items per page */
    pageSize?: Ref<number> | ComputedRef<number>;
    /** Maximum visible page buttons */
    maxVisiblePages?: Ref<number> | ComputedRef<number>;
    /** Whether pagination is disabled */
    disabled?: Ref<boolean>;
}
export interface UsePaginationReturn {
    /** Total number of pages */
    totalPages: ComputedRef<number>;
    /** Current page (clamped) */
    currentPage: ComputedRef<number>;
    /** Array of visible page numbers and ellipsis markers */
    visiblePages: ComputedRef<(number | 'prev-ellipsis' | 'next-ellipsis')[]>;
    /** Change to a specific page */
    changePage: (page: number) => void;
    /** Go to previous page */
    prevPage: () => void;
    /** Go to next page */
    nextPage: () => void;
    /** Whether previous button should be disabled */
    isPrevDisabled: ComputedRef<boolean>;
    /** Whether next button should be disabled */
    isNextDisabled: ComputedRef<boolean>;
}
/**
 * Headless pagination — encapsulates page calculation, ellipsis logic,
 * and page navigation. Use with your own UI rendering.
 */
export declare function usePagination(opts: UsePaginationOptions): UsePaginationReturn;
