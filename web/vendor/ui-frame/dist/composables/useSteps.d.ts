import { Ref, ComputedRef } from 'vue';

/**
 * Status of an individual step in the workflow.
 * - `wait`: not yet reached
 * - `process`: the current active step
 * - `finish`: completed successfully
 * - `error`: completed with an error
 */
export type StepStatus = 'wait' | 'process' | 'finish' | 'error';
/** Descriptor for a single step in a stepped workflow. */
export interface StepItem {
    /** Unique key for the step (used for identity and status mapping). */
    key: string;
    /** Display title for the step. */
    title: string;
    /** Optional description / subtitle for the step. */
    description?: string;
    /** Override the auto-computed status. When omitted the composable auto-assigns it. */
    status?: StepStatus;
}
export interface UseStepsOptions {
    /** Reactive array of step definitions. */
    steps: Ref<StepItem[]> | ComputedRef<StepItem[]>;
    /** Reactive 0-based index of the currently active step. */
    current: Ref<number>;
}
export interface UseStepsReturn {
    /** The current step item (computed from `current`). */
    currentStep: ComputedRef<StepItem | undefined>;
    /** Jump to a specific step by its 0-based index. */
    setCurrent: (index: number) => void;
    /** Advance to the next step. Optionally pass a `beforeNext` validator. */
    next: (beforeNext?: () => boolean | Promise<boolean>) => Promise<void>;
    /** Go back to the previous step. */
    prev: () => void;
    /** Manually override the status of a specific step. */
    setStepStatus: (key: string, status: StepStatus) => void;
}
/**
 * Headless steps composable — encapsulates step navigation, status auto-
 * computation, and validation hooks.
 *
 * @example
 * ```ts
 * const steps = ref<StepItem[]>([
 *   { key: '1', title: 'Step 1' },
 *   { key: '2', title: 'Step 2' },
 * ])
 * const current = ref(0)
 * const { currentStep, next, prev, setStepStatus } = useSteps({ steps, current })
 * ```
 */
export declare function useSteps(opts: UseStepsOptions): UseStepsReturn;
