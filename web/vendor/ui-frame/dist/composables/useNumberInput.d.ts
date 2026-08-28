import { Ref, ComputedRef } from 'vue';

/**
 * Options for the useNumberInput composable.
 */
export interface UseNumberInputOptions {
    /** v-model value — a writable Ref<number | undefined> */
    modelValue: Ref<number | undefined>;
    /** Minimum allowed value (default: -Infinity) */
    min?: number;
    /** Maximum allowed value (default: Infinity) */
    max?: number;
    /** Step increment for up/down buttons and keyboard (default: 1) */
    step?: number;
    /** Decimal precision (default: inferred from step) */
    precision?: number;
    /** Whether the input is disabled */
    disabled?: Ref<boolean>;
}
/**
 * Return type for the useNumberInput composable.
 */
export interface UseNumberInputReturn {
    /** Display value as a string, bound to the input field */
    displayValue: ComputedRef<string>;
    /** Increment the value by step */
    increment: () => void;
    /** Decrement the value by step */
    decrement: () => void;
    /** Programmatically set the numeric value */
    setValue: (value: number) => void;
    /** Keyboard event handler (ArrowUp/ArrowDown) */
    handleKeydown: (event: KeyboardEvent) => void;
    /** Input handler — update display buffer without committing */
    handleInput: (event: Event) => void;
    /** Blur handler — formats and commits display value */
    handleBlur: () => void;
}
/**
 * Format a numeric value to a string using the given precision.
 */
export declare function formatNumber(value: number | undefined, precision: number): string;
/**
 * Parse a string value to a number, returning undefined on invalid input.
 */
export declare function parseNumber(str: string): number | undefined;
/**
 * Headless number input — encapsulates value clamping, step precision,
 * keyboard navigation, increment/decrement, and parse/format logic
 * without any rendering. Use with your own UI.
 */
export declare function useNumberInput(opts: UseNumberInputOptions): UseNumberInputReturn;
