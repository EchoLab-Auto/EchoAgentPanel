import { Ref, ComputedRef } from 'vue';

/** A single day cell in the calendar grid */
export interface DayCell {
    /** Full Date object for this cell */
    date: Date;
    /** Day of month (1-31) */
    day: number;
    /** Whether this cell belongs to the currently displayed month */
    isCurrentMonth: boolean;
    /** Whether this cell represents today */
    isToday: boolean;
    /** Whether this cell is currently selected */
    isSelected: boolean;
    /** Whether this cell is disabled (outside min/max bounds) */
    isDisabled: boolean;
    /** Whether this cell falls within a selected range (for future range support) */
    isInRange: boolean;
}
export interface UseDatePickerOptions {
    /** v-model value — the selected date */
    modelValue: Ref<Date | null>;
    /** Minimum selectable date */
    minDate?: Ref<Date | undefined> | Date;
    /** Maximum selectable date */
    maxDate?: Ref<Date | undefined> | Date;
    /** Display format string (e.g. 'yyyy-MM-dd') */
    format?: Ref<string | undefined> | string;
    /** First day of week (0 = Sunday, 1 = Monday) */
    firstDayOfWeek?: Ref<number | undefined> | number;
}
export interface UseDatePickerReturn {
    /** Currently displayed year */
    currentYear: Ref<number>;
    /** Currently displayed month (1-based) */
    currentMonth: Ref<number>;
    /** Flat array of 42 day cells for the calendar grid (6 rows x 7 cols) */
    calendarDays: ComputedRef<DayCell[]>;
    /** Array of weekday header labels */
    weekdays: ComputedRef<string[]>;
    /** The currently selected date (from modelValue) */
    selectedDate: ComputedRef<Date | null>;
    /** Select a date */
    selectDate: (date: Date) => void;
    /** Navigate to previous month */
    prevMonth: () => void;
    /** Navigate to next month */
    nextMonth: () => void;
    /** Navigate to previous year */
    prevYear: () => void;
    /** Navigate to next year */
    nextYear: () => void;
    /** Check if a date is the selected date */
    isSelected: (date: Date) => boolean;
    /** Check if a date is today */
    isToday: (date: Date) => boolean;
    /** Check if a date falls within a potential range (for future range support) */
    isInRange: (date: Date) => boolean;
    /** Check if a date is disabled (outside min/max bounds) */
    isDisabled: (date: Date) => boolean;
    /** Format a date to display string using the configured format */
    formatDate: (date: Date | null) => string;
    /** Navigate to today's month/year */
    goToToday: () => void;
}
/**
 * Headless date picker — encapsulates calendar state, navigation, day cell
 * computation, date validation, and formatting without any rendering.
 *
 * Use with your own UI. The `NeumorphismDatePicker` component provides
 * a ready-to-use neumorphism-styled implementation.
 */
export declare function useDatePicker(opts: UseDatePickerOptions): UseDatePickerReturn;
