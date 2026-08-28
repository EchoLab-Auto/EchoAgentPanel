import { ComputedRef } from 'vue';
import { useConfig, NeumorphismGlobalConfig } from '../composables/useConfig';

export { useConfig };
export type { NeumorphismGlobalConfig };
/**
 * Context provided by `useNeumorphismSetup()` for building custom components
 * that follow the library's prop-resolution cascade.
 */
export interface NeumorphismSetupContext {
    /** The global config injected at app level via `app.use(UI, { config })`. */
    config: ComputedRef<NeumorphismGlobalConfig>;
    /**
     * Resolve a prop value using the standard cascade:
     *   explicit prop > global config > hardcoded default.
     *
     * @example
     * ```ts
     * const size = computed(() => resolveProp(props.size, config.value.input?.size, 'medium'))
     * ```
     */
    resolveProp: <T>(explicit: T | undefined, configValue: T | undefined, defaultValue: T) => T;
}
/**
 * Setup helper for building custom components that participate in the
 * neumorphism global config system.
 *
 * Provides the same config resolution as every built-in library component:
 *   explicit prop > global config > hardcoded default.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { computed } from 'vue'
 * import { useNeumorphismSetup } from '@echolab-auto/ui-frame'
 *
 * const props = withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
 * const { config, resolveProp } = useNeumorphismSetup()
 * const size = computed(() => resolveProp(props.size, config.value.myComp?.size, 'md'))
 * </script>
 * ```
 */
export declare function useNeumorphismSetup(): NeumorphismSetupContext;
