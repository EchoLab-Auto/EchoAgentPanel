import { Component, App } from 'vue';
import { NeumorphismGlobalConfig } from '../composables/useConfig';

/**
 * A named collection of component overrides + config defaults that can be
 * applied as a group (e.g. "compact", "material", "dashboard").
 */
export interface ComponentPreset {
    /** Components to register or replace. */
    components?: Record<string, Component>;
    /** Global config defaults for this preset. */
    config?: Partial<NeumorphismGlobalConfig>;
}
/**
 * Runtime component registry that maps component names to implementations.
 *
 * Supports:
 * - Registering or replacing components via `register()`
 * - Looking up components via `get()` / `has()`
 * - Named presets that bundle component overrides + config
 * - Bulk-installing onto a Vue App via `install(app, prefix?)`
 *
 * @example
 * ```ts
 * const registry = new ComponentRegistry()
 * registry
 *   .registerPreset('compact', {
 *     config: { button: { size: 'small' }, input: { size: 'small' } },
 *   })
 *   .registerPreset('material', {
 *     components: { NeumorphismButton: MaterialButton },
 *   })
 * registry.applyPreset('compact').applyPreset('material')
 * registry.install(app, 'App')
 * ```
 */
export declare class ComponentRegistry {
    private _map;
    private _presets;
    constructor(entries?: Iterable<readonly [string, Component]>);
    /** Register or replace a component. Returns `this` for chaining. */
    register(name: string, component: Component): this;
    /** Retrieve a registered component by name. */
    get(name: string): Component | undefined;
    /** Check if a component name is registered. */
    has(name: string): boolean;
    /** Delete a registered component. Returns true if it existed. */
    remove(name: string): boolean;
    /** Number of registered components. */
    get size(): number;
    /** Iterate all [name, component] entries. */
    entries(): IterableIterator<[string, Component]>;
    /** Iterate all component names. */
    names(): IterableIterator<string>;
    /**
     * Register a named preset. Does NOT apply it — call `applyPreset(name)`
     * to activate, or pass the name to `install(app, prefix, presets)`.
     */
    registerPreset(name: string, preset: ComponentPreset): this;
    /** Check if a preset is registered. */
    hasPreset(name: string): boolean;
    /**
     * Apply a registered preset: merge its component overrides and config
     * into the current registry state. Later presets override earlier ones.
     * Returns `this` for chaining.
     */
    applyPreset(name: string): this;
    /**
     * Collect config defaults from one or more named presets.
     * Returns a shallow-merged config object (later presets win).
     */
    getPresetConfig(...names: string[]): Partial<NeumorphismGlobalConfig>;
    /** Register all components onto a Vue App instance. */
    install(app: App, prefix?: string, presetNames?: string[]): this;
}
