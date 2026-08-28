import { Ref, ComputedRef } from 'vue';

export interface AutoCompleteOption {
    label: string;
    value: string | number;
    disabled?: boolean;
}
export interface UseAutoCompleteOptions {
    /** v-model value (the selected option's value) */
    modelValue: Ref<string | number | undefined>;
    /** Available options for local filtering */
    options?: Ref<AutoCompleteOption[]>;
    /** Async search function — when provided, filtering is server-side */
    searchFn?: (query: string) => Promise<AutoCompleteOption[]>;
    /** External loading ref (shared between composable and component) */
    loading?: Ref<boolean>;
    /** Debounce delay in ms for async search (default 300) */
    debounceMs?: number;
}
export interface UseAutoCompleteReturn {
    /** Current text in the input field */
    inputValue: Ref<string>;
    /** Whether the dropdown is open */
    isOpen: Ref<boolean>;
    /** Filtered options to display in the dropdown */
    filteredOptions: ComputedRef<AutoCompleteOption[]>;
    /** Index of the keyboard-navigated (active) option, -1 if none */
    activeIndex: Ref<number>;
    /** Generate an HTML string with matching portions wrapped in <mark> tags */
    highlightMatch: (label: string) => string;
    /** Select an option — sets modelValue, updates inputValue, closes dropdown */
    selectOption: (option: AutoCompleteOption) => void;
    /** Handle keyboard events for navigation */
    handleKeydown: (event: KeyboardEvent) => void;
    /** Handle input value changes */
    handleInput: (value: string) => void;
    /** Open the dropdown */
    open: () => void;
    /** Close the dropdown */
    close: () => void;
    /** Clean up internal timers (call in onBeforeUnmount) */
    cleanupTimers: () => void;
}
/**
 * Headless autocomplete — encapsulates filtering, keyboard navigation,
 * async search with debounce, match highlighting, and open/close logic.
 *
 * Use with your own UI rendering (e.g., NeumorphismAutoComplete).
 */
export declare function useAutoComplete(opts: UseAutoCompleteOptions): UseAutoCompleteReturn;
